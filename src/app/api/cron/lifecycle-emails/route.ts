import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { EMAIL_TEMPLATES } from "@/lib/email/templates";
import { DEFAULT_EMAIL_CONFIG, type EmailConfig } from "@/lib/email/send";

// The lifecycle and retention emails (incomplete sign-up, 3 and 7 days away, the welcome series).
// The database decides who's due what and sends them (lifecycle_due / lifecycle_send, migration
// 20270107000000); this only renders the templates. Called every hour by pg_cron (lifecycle_tick) while
// app_settings 'lifecycle_emails' is enabled, or by Vercel cron, or by an admin.
//   ?dry=1  who would get what right now, without sending or claiming anything.

export const dynamic = "force-dynamic";

const SITE = "https://www.mydubailife.app";
const BATCH = 50;

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}

/** The cron key from the request (pg_cron sends x-cron-secret, Vercel cron sends Bearer CRON_SECRET). */
function keyFrom(req: Request): string | null {
  const h = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (h) return h;
  if (process.env.NODE_ENV === "development" && process.env.CRON_SECRET) return process.env.CRON_SECRET;
  return null;
}

function anonClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface Due {
  log_id: string | null;
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  campaign_id: string;
  unsub_token: string | null;
}

const mask = (e: string) => e.replace(/^(.).*?(.?)@/, (_, a: string, b: string) => `${a}…${b}@`);

async function run(req: Request) {
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const key = keyFrom(req);
  // With a key: the database checks it. Without: a signed-in admin (the back office).
  const db = key ? anonClient() : await supabaseServer();

  const { data: cfgRow } = await db.from("app_settings").select("value").eq("key", "email_config").maybeSingle();
  const cfg = { ...DEFAULT_EMAIL_CONFIG, ...((cfgRow?.value as Partial<EmailConfig>) ?? {}) };
  const campaigns = Object.keys(EMAIL_TEMPLATES).filter((id) => id !== "admin_test" && (cfg.campaigns?.[id]?.enabled ?? DEFAULT_EMAIL_CONFIG.campaigns[id]?.enabled ?? false));

  const { data, error } = await db.rpc("lifecycle_due", { p_key: key, p_campaigns: campaigns, p_limit: BATCH, p_dry: dry });
  if (error) {
    const denied = /not_allowed/.test(error.message);
    return NextResponse.json({ ok: false, error: denied ? "Unauthorized: admin sign-in or the cron key required." : error.message }, { status: denied ? 401 : 500 });
  }
  const due = (data ?? []) as Due[];
  const counts: Record<string, number> = {};
  for (const d of due) counts[d.campaign_id] = (counts[d.campaign_id] ?? 0) + 1;

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      campaigns,
      due: counts,
      recipients: due.map((d) => ({ username: d.username, email: mask(d.email), campaign: d.campaign_id })),
    });
  }
  if (!due.length) return NextResponse.json({ ok: true, sent: 0, due: counts });

  const items = due.filter((d) => d.log_id).map((d) => {
    const template = EMAIL_TEMPLATES[d.campaign_id];
    const unsubscribeUrl = d.unsub_token ? `${SITE}/unsubscribe?t=${d.unsub_token}` : undefined;
    const rendered = template?.render({
      username: d.username ?? undefined,
      loginUrl: `${SITE}/home?utm_source=email&utm_medium=lifecycle&utm_campaign=${d.campaign_id}`,
      unsubscribeUrl,
    });
    return {
      logId: d.log_id,
      subject: cfg.campaigns?.[d.campaign_id]?.customSubject || rendered?.subject || "",
      html: rendered?.html ?? "",
      text: rendered ? `${rendered.text}${unsubscribeUrl ? `\n\nStop these emails: ${unsubscribeUrl}` : ""}` : "",
      unsubscribeUrl,
    };
  });

  const { data: sent, error: sendErr } = await db.rpc("lifecycle_send", { p_key: key, p_items: items });
  if (sendErr) return NextResponse.json({ ok: false, error: sendErr.message, due: counts }, { status: 500 });
  return NextResponse.json({ ok: true, sent, due: counts, timestamp: new Date().toISOString() });
}
