import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { PushSubscriptionRecord } from "@/lib/push/types";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const userId = user?.id || body.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = body.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    const record: PushSubscriptionRecord = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent: req.headers.get("user-agent") || undefined,
      updatedAt: new Date().toISOString(),
    };

    // 1. Try push_subscriptions table
    try {
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: record.endpoint,
          p256dh: record.keys.p256dh,
          auth: record.keys.auth,
          user_agent: record.userAgent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
    } catch {}

    // 2. Save in profiles.citizen.push_subscriptions (authenticated update via session)
    try {
      const { data: profile } = await supabase.from("profiles").select("citizen").eq("id", userId).maybeSingle();
      const citizen = (profile?.citizen as Record<string, unknown>) || {};
      const existing = Array.isArray(citizen.push_subscriptions) ? (citizen.push_subscriptions as PushSubscriptionRecord[]) : [];
      const filtered = existing.filter((s) => s.endpoint !== record.endpoint);
      filtered.push(record);

      await supabase.from("profiles").update({ citizen: { ...citizen, push_subscriptions: filtered.slice(-5) } }).eq("id", userId);
    } catch (e) {
      console.error("[Subscribe profile update error]", e);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to save subscription" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const userId = user?.id || body.userId;
    const endpoint = body.endpoint;

    if (!userId || !endpoint) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
      await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
    } catch {}

    try {
      const { data: profile } = await supabase.from("profiles").select("citizen").eq("id", userId).maybeSingle();
      const citizen = (profile?.citizen as Record<string, unknown>) || {};
      const existing = Array.isArray(citizen.push_subscriptions) ? (citizen.push_subscriptions as PushSubscriptionRecord[]) : [];
      const filtered = existing.filter((s) => s.endpoint !== endpoint);
      await supabase.from("profiles").update({ citizen: { ...citizen, push_subscriptions: filtered } }).eq("id", userId);
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to remove subscription" }, { status: 500 });
  }
}
