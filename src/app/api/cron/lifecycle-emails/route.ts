import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendLifecycleEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If secret is configured in env, require it (or bypass if called from localhost in dev)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && authHeader !== cronSecret) {
    const host = req.headers.get("host") || "";
    if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getAdminClient();
  const results = {
    incomplete_signup: 0,
    inactive_3d: 0,
    inactive_7d: 0,
    errors: [] as string[],
  };

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();

  // 1. Process Incomplete Signup Cohort
  try {
    // Users signed up > 2 hours ago who haven't rented/bought a home
    const { data: candidates } = await db
      .from("profiles")
      .select("id, username, created_at")
      .lt("created_at", twoHoursAgo)
      .limit(30);

    for (const cand of candidates || []) {
      // Check if user has an active flat
      const { data: flat } = await db.from("flats").select("id").eq("tenant_id", cand.id).maybeSingle();
      if (flat) continue; // completed move-in

      // Check if already sent incomplete_signup in past 7 days
      const { data: alreadySent } = await db
        .from("email_campaign_logs")
        .select("id")
        .eq("user_id", cand.id)
        .eq("campaign_id", "incomplete_signup")
        .gt("sent_at", sevenDaysAgo)
        .maybeSingle();

      if (alreadySent) continue;

      // Fetch user's email via auth RPC or profiles
      const { data: userAuth } = await db.auth.admin.getUserById(cand.id).catch(() => ({ data: null }));
      const email = userAuth?.user?.email;
      if (!email) continue;

      const res = await sendLifecycleEmail({
        toEmail: email,
        userId: cand.id,
        campaignId: "incomplete_signup",
        templateData: {
          username: cand.username,
          loginUrl: `https://mydubailife.app/home?utm_source=email&utm_campaign=incomplete_signup`,
        },
      });

      if (res.ok) results.incomplete_signup += 1;
    }
  } catch (err: any) {
    results.errors.push(`Incomplete signup error: ${err?.message}`);
  }

  // 2. Process Inactive 3-Day Cohort
  try {
    const { data: inactiveUsers } = await db
      .from("profiles")
      .select("id, username, last_seen")
      .lt("last_seen", threeDaysAgo)
      .gt("last_seen", sevenDaysAgo)
      .limit(30);

    for (const user of inactiveUsers || []) {
      const { data: alreadySent } = await db
        .from("email_campaign_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("campaign_id", "inactive_3d")
        .gt("sent_at", sevenDaysAgo)
        .maybeSingle();

      if (alreadySent) continue;

      const { data: userAuth } = await db.auth.admin.getUserById(user.id).catch(() => ({ data: null }));
      const email = userAuth?.user?.email;
      if (!email) continue;

      const res = await sendLifecycleEmail({
        toEmail: email,
        userId: user.id,
        campaignId: "inactive_3d",
        templateData: {
          username: user.username,
          loginUrl: `https://mydubailife.app/home?utm_source=email&utm_campaign=inactive_3d`,
        },
      });

      if (res.ok) results.inactive_3d += 1;
    }
  } catch (err: any) {
    results.errors.push(`Inactive 3d error: ${err?.message}`);
  }

  // 3. Process Inactive 7-Day Cohort
  try {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();
    const { data: longInactiveUsers } = await db
      .from("profiles")
      .select("id, username, last_seen")
      .lt("last_seen", sevenDaysAgo)
      .limit(30);

    for (const user of longInactiveUsers || []) {
      const { data: alreadySent } = await db
        .from("email_campaign_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("campaign_id", "inactive_7d")
        .gt("sent_at", thirtyDaysAgo)
        .maybeSingle();

      if (alreadySent) continue;

      const { data: userAuth } = await db.auth.admin.getUserById(user.id).catch(() => ({ data: null }));
      const email = userAuth?.user?.email;
      if (!email) continue;

      const res = await sendLifecycleEmail({
        toEmail: email,
        userId: user.id,
        campaignId: "inactive_7d",
        templateData: {
          username: user.username,
          bonusAmount: 2500,
          loginUrl: `https://mydubailife.app/home?bonus=welcome_back&utm_source=email&utm_campaign=inactive_7d`,
        },
      });

      if (res.ok) results.inactive_7d += 1;
    }
  } catch (err: any) {
    results.errors.push(`Inactive 7d error: ${err?.message}`);
  }

  return NextResponse.json({
    ok: true,
    processed: results,
    timestamp: new Date().toISOString(),
  });
}
