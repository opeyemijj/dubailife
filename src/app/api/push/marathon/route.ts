import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToSubscription } from "@/lib/push/server";
import MARATHON from "@/data/life/marathon.json";

// Called by the database 15 minutes before each marathon (*_marathon_push.sql), with a secret from Vault:
// sends the reminder to the devices of everyone signed up. The database hands the list over once per race.
export async function POST(req: Request) {
  const secret = req.headers.get("x-push-secret");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret || !url || !key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("marathon_push_targets", { p_secret: secret });
  if (error || !data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { race, targets } = data as { race: string; targets: Array<{ endpoint: string; p256dh: string; auth: string; bib: number }> };

  let sent = 0, failed = 0;
  const gone: string[] = [];
  await Promise.all(targets.map(async (t) => {
    const r = await sendPushToSubscription({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, {
      title: "🏅 The Marathon starts soon",
      body: `The ${MARATHON.name} starts in ${MARATHON.pushMinutes} minutes. Bib #${t.bib}: get to the start line!`,
      url: "/marathon",
      tag: "marathon-start",
    });
    if (r.ok) sent++; else { failed++; if (r.gone) gone.push(t.endpoint); }
  }));
  await db.rpc("marathon_push_done", { p_secret: secret, p_race: race, p_sent: sent, p_failed: failed, p_gone: gone });
  return NextResponse.json({ ok: true, sent, failed });
}
