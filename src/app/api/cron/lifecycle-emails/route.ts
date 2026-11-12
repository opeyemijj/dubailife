import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
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

async function getUserEmail(
  db: SupabaseClient,
  userId: string,
  cookieSupabase?: SupabaseClient
): Promise<string | null> {
  // 1. Try service role auth admin API
  try {
    const { data: userAuth } = await db.auth.admin.getUserById(userId);
    if (userAuth?.user?.email) return userAuth.user.email;
  } catch {}

  // 2. Try admin_list_citizens RPC via cookie or service client
  try {
    const client = cookieSupabase || db;
    const { data: rows } = await client.rpc("admin_list_citizens", { p_query: userId, p_limit: 5 });
    if (rows && Array.isArray(rows)) {
      const match = rows.find((r: any) => r.id === userId);
      if (match?.email) return match.email;
    }
  } catch {}

  return null;
}

async function handleCron(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  let isAuthorized = false;
  let cookieSupabase: SupabaseClient | undefined;

  // 1. Verify via CRON_SECRET or service role key header
  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}` || authHeader === cronSecret) {
      isAuthorized = true;
    }
  }

  // 2. Verify via Backoffice admin cookie session (e.g. manual trigger from admin console)
  if (!isAuthorized) {
    try {
      cookieSupabase = await supabaseServer();
      const { data: { user } } = await cookieSupabase.auth.getUser();
      if (user) {
        const { data: isAdmin } = await cookieSupabase.rpc("is_admin");
        if (isAdmin) {
          isAuthorized = true;
        }
      }
    } catch {}
  }

  // 3. Verify via Bearer session access token (e.g. fetch with Authorization from client)
  if (!isAuthorized && authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const adminClient = getAdminClient();
      const { data: userData } = await adminClient.auth.getUser(token);
      if (userData?.user) {
        const { data: isAdmin } = await adminClient.rpc("is_admin", { p_user: userData.user.id });
        if (isAdmin) {
          isAuthorized = true;
        }
      }
    } catch {}
  }

  // 4. In development mode, allow triggers for local development
  if (!isAuthorized && process.env.NODE_ENV === "development") {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized: Administrator sign-in or valid CRON_SECRET required.",
      },
      { status: 401 }
    );
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
      const email = await getUserEmail(db, cand.id, cookieSupabase);
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

      const email = await getUserEmail(db, user.id, cookieSupabase);
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

      const email = await getUserEmail(db, user.id, cookieSupabase);
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
