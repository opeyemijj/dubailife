import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToSubscription } from "@/lib/push/server";
import PARTIES from "@/data/life/parties.json";

// Called by the database when parties are about to start (*_events.sql), with a secret from Vault: reminds everyone
// going or invited, and the host. The database hands each party's list over once only.
export async function POST(req: Request) {
  const secret = req.headers.get("x-push-secret");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret || !url || !key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("invite_push_targets", { p_secret: secret });
  if (error || !data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const targets = data as Array<{ endpoint: string; p256dh: string; auth: string; code: string; title: string; host: string; isHost: boolean }>;

  let sent = 0, failed = 0;
  const gone: string[] = [];
  await Promise.all(targets.map(async (t) => {
    const r = await sendPushToSubscription({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, {
      title: t.isHost ? "🎉 Your party is about to start" : `🎉 @${t.host}'s party is about to start`,
      body: `${t.title} starts within ${PARTIES.reminderMinutes} minutes. Tap to head there.`,
      url: `/i/${t.code}`,
      tag: `party-${t.code}`,
    });
    if (r.ok) sent++; else { failed++; if (r.gone) gone.push(t.endpoint); }
  }));
  if (gone.length) await db.rpc("invite_push_done", { p_secret: secret, p_gone: gone });
  return NextResponse.json({ ok: true, sent, failed });
}
