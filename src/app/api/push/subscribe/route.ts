import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { deletePushSubscription, savePushSubscription } from "@/lib/push/server";
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
    };

    const res = await savePushSubscription(userId, record);
    return NextResponse.json(res);
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

    await deletePushSubscription(userId, endpoint);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to remove subscription" }, { status: 500 });
  }
}

