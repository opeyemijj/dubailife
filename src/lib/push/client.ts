"use client";

import type { PushPayload } from "./types";
import { supabase } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BCXeb8s6jaMrCw--SxVn5zpJodf79vyXQFYF35USsQ5nuVy5rWRVyLXhTagx5ZFRJxquq-u5DAtloZkLQHRaCkc";

/** Converts standard URL-safe Base64 string to Uint8Array for PushManager subscription. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Checks whether Push Notifications and Service Workers are supported by the browser. */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Checks whether the app is running as an installed PWA added to the home screen. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone flag
    Boolean((navigator as unknown as { standalone?: boolean }).standalone)
  );
}

/** Returns the current Notification permission state. */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Subscribes this device to push notifications and saves the subscription on the server. */
export async function subscribeToPush(userId?: string): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) {
    return {
      ok: false,
      error: "Push notifications are not supported in this browser view. On iOS, add the game to your Home Screen first.",
    };
  }

  try {
    // 1. Request permission if not already granted (must be in response to user gesture on iOS)
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return { ok: false, error: "Notification permission was denied. Check iPhone Settings → Notifications → mydubailife.app." };
    }

    // 2. Wait for service worker to be ready
    let reg: ServiceWorkerRegistration;
    try {
      reg = await navigator.serviceWorker.ready;
    } catch {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    // 3. Get or create push subscription
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });
    }

    const subJson = sub.toJSON();

    // 4. Save directly via authenticated browser client so it's guaranteed in DB
    if (userId && sub.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
      try {
        const record = {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          userAgent: navigator.userAgent,
          updatedAt: new Date().toISOString(),
        };

        const { data: prof } = await supabase().from("profiles").select("citizen").eq("id", userId).maybeSingle();
        const citizenData = (prof?.citizen as Record<string, unknown>) || {};
        const existing = Array.isArray(citizenData.push_subscriptions) ? citizenData.push_subscriptions : [];
        const filtered = existing.filter((s: { endpoint?: string }) => s.endpoint !== record.endpoint);
        filtered.push(record);

        await supabase()
          .from("profiles")
          .update({ citizen: { ...citizenData, push_subscriptions: filtered.slice(-5) } })
          .eq("id", userId);
      } catch (err) {
        console.error("[Direct push save failed]", err);
      }
    }

    // 5. Also register with server API
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subJson,
        userId,
      }),
    }).catch(() => {});

    try {
      localStorage.setItem("dl_push_enabled", "true");
    } catch {}

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Unsubscribes this device from push notifications. */
export async function unsubscribeFromPush(userId?: string): Promise<{ ok: boolean }> {
  if (!isPushSupported()) return { ok: true };

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      if (userId) {
        try {
          const { data: prof } = await supabase().from("profiles").select("citizen").eq("id", userId).maybeSingle();
          const citizenData = (prof?.citizen as Record<string, unknown>) || {};
          const existing = Array.isArray(citizenData.push_subscriptions) ? citizenData.push_subscriptions : [];
          const filtered = existing.filter((s: { endpoint?: string }) => s.endpoint !== endpoint);
          await supabase().from("profiles").update({ citizen: { ...citizenData, push_subscriptions: filtered } }).eq("id", userId);
        } catch {}
      }

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, userId }),
      }).catch(() => {});
    }

    try {
      localStorage.removeItem("dl_push_enabled");
    } catch {}

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Sends a push notification to another citizen (e.g. friend request, message, money). */
export async function sendPushNotification(toUserId: string, payload: PushPayload, fromUserId?: string) {
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId,
        notification: payload,
        fromUserId,
      }),
    });
  } catch {}
}

/** Sends a test notification to the signed-in user. */
export async function testPushNotification(userId?: string) {
  try {
    const res = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to trigger test" };
  }
}
