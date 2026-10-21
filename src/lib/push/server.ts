import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import type { PushPayload, PushSubscriptionRecord } from "./types";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BCXeb8s6jaMrCw--SxVn5zpJodf79vyXQFYF35USsQ5nuVy5rWRVyLXhTagx5ZFRJxquq-u5DAtloZkLQHRaCkc";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "gljytM3fbaBcPSEeaHCxtB1J5wVeJr9Q9N-LjdptPNM";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@cometodubai.com";

let vapidConfigured = false;
function ensureVapid() {
  if (!vapidConfigured && PUBLIC_KEY && PRIVATE_KEY) {
    try {
      webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
      vapidConfigured = true;
    } catch (e) {
      console.error("[WebPush VAPID error]", e);
    }
  }
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Fetches all active subscriptions for a citizen (public read on profiles is allowed). */
export async function getSubscriptionsForUser(userId: string): Promise<PushSubscriptionRecord[]> {
  const db = getSupabaseClient();
  if (!db || !userId) return [];

  const list: PushSubscriptionRecord[] = [];

  // Try push_subscriptions table if present
  try {
    const { data } = await db.from("push_subscriptions").select("endpoint, p256dh, auth, user_agent").eq("user_id", userId);
    if (data && data.length > 0) {
      for (const row of data) {
        list.push({
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
          userAgent: row.user_agent,
        });
      }
    }
  } catch {}

  // Fallback: check profiles.citizen.push_subscriptions (profiles is publicly readable)
  if (list.length === 0) {
    try {
      const { data } = await db.from("profiles").select("citizen").eq("id", userId).maybeSingle();
      const citizen = data?.citizen as { push_subscriptions?: PushSubscriptionRecord[] } | null;
      if (citizen?.push_subscriptions && Array.isArray(citizen.push_subscriptions)) {
        list.push(...citizen.push_subscriptions);
      }
    } catch {}
  }

  return list;
}

/** Sends a Web Push Notification to all devices registered to a citizen. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureVapid();
  const subs = await getSubscriptionsForUser(userId);
  if (!subs.length) {
    return { sent: 0, failed: 0, reason: "no_subscriptions_found" };
  }

  const content = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/brand/icon-192.png",
    badge: payload.badge || "/brand/icon-192.png",
    url: payload.url || "/phone",
    tag: payload.tag || `dl-${Date.now()}`,
    data: payload.data || {},
  });

  // Apple APNs requires high urgency & TTL for reliable lock-screen display
  const options = {
    TTL: 86400, // 24 hours
    urgency: "high" as const,
  };

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          content,
          options
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        const statusCode = (err as { statusCode?: number })?.statusCode;
        errors.push(`${statusCode ?? "unknown"}: ${msg}`);
        console.error(`[WebPush error] endpoint=${sub.endpoint.slice(0, 40)}... status=${statusCode}:`, msg);
      }
    })
  );

  return { sent, failed, errors };
}
