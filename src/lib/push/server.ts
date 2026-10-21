import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import type { PushPayload, PushSubscriptionRecord } from "./types";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BCXeb8s6jaMrCw--SxVn5zpJodf79vyXQFYF35USsQ5nuVy5rWRVyLXhTagx5ZFRJxquq-u5DAtloZkLQHRaCkc";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "gljytM3fbaBcPSEeaHCxtB1J5wVeJr9Q9N-LjdptPNM";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@cometodubai.com";

let vapidConfigured = false;
function ensureVapid() {
  if (!vapidConfigured && PUBLIC_KEY && PRIVATE_KEY) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    vapidConfigured = true;
  }
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Saves or updates a push subscription for a citizen. */
export async function savePushSubscription(userId: string, sub: PushSubscriptionRecord) {
  const admin = getAdminClient();
  if (!admin || !userId || !sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return { ok: false, error: "invalid_request" };
  }

  // 1. Try push_subscriptions table
  try {
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: sub.userAgent || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
    if (!error) return { ok: true };
  } catch {
    // Continue to fallback
  }

  // 2. Fallback: store in profiles.citizen.push_subscriptions jsonb
  try {
    const { data: profile } = await admin.from("profiles").select("citizen").eq("id", userId).maybeSingle();
    const citizen = (profile?.citizen as Record<string, unknown>) || {};
    const existing = Array.isArray(citizen.push_subscriptions) ? (citizen.push_subscriptions as PushSubscriptionRecord[]) : [];
    const filtered = existing.filter((s) => s.endpoint !== sub.endpoint);
    filtered.push({ ...sub, updatedAt: new Date().toISOString() });

    await admin.from("profiles").update({ citizen: { ...citizen, push_subscriptions: filtered.slice(-5) } }).eq("id", userId);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Removes a push subscription for a citizen. */
export async function deletePushSubscription(userId: string, endpoint: string) {
  const admin = getAdminClient();
  if (!admin || !userId || !endpoint) return { ok: false };

  try {
    await admin.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
  } catch {}

  try {
    const { data: profile } = await admin.from("profiles").select("citizen").eq("id", userId).maybeSingle();
    const citizen = (profile?.citizen as Record<string, unknown>) || {};
    const existing = Array.isArray(citizen.push_subscriptions) ? (citizen.push_subscriptions as PushSubscriptionRecord[]) : [];
    const filtered = existing.filter((s) => s.endpoint !== endpoint);
    await admin.from("profiles").update({ citizen: { ...citizen, push_subscriptions: filtered } }).eq("id", userId);
  } catch {}

  return { ok: true };
}

/** Fetches all active subscriptions for a citizen. */
async function getSubscriptionsForUser(userId: string): Promise<PushSubscriptionRecord[]> {
  const admin = getAdminClient();
  if (!admin) return [];

  const list: PushSubscriptionRecord[] = [];

  // From dedicated table
  try {
    const { data } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth, user_agent").eq("user_id", userId);
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

  // From profiles fallback
  if (list.length === 0) {
    try {
      const { data } = await admin.from("profiles").select("citizen").eq("id", userId).maybeSingle();
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
  if (!subs.length) return { sent: 0, failed: 0 };

  const content = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/brand/icon-192.png",
    badge: payload.badge || "/brand/icon-192.png",
    image: payload.image,
    url: payload.url || "/phone",
    tag: payload.tag || `dl-${Date.now()}`,
    data: payload.data || {},
    requireInteraction: payload.requireInteraction,
    actions: payload.actions,
  });

  let sent = 0;
  let failed = 0;

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
          content
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404 or 410 indicates the subscription is expired or unsubscribed
        if (statusCode === 404 || statusCode === 410) {
          void deletePushSubscription(userId, sub.endpoint);
        }
      }
    })
  );

  return { sent, failed };
}

