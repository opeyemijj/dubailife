import { NextResponse } from "next/server";
import { EMAIL_TEMPLATES } from "@/lib/email/templates";
import { getEmailConfig, normalizeSenderEmail } from "@/lib/email/send";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// In-memory rate limiter: max 10 emails per minute per user/IP
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function isRateLimited(key: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate caller (via supabase cookie session or Authorization Bearer token)
    const adminClient = getAdminClient();
    let callerUser: { id: string; email?: string } | null = null;

    const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (authHeader) {
      const { data } = await adminClient.auth.getUser(authHeader);
      if (data?.user) {
        callerUser = { id: data.user.id, email: data.user.email };
      }
    }

    if (!callerUser) {
      const supabase = await supabaseServer();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        callerUser = { id: data.user.id, email: data.user.email };
      }
    }

    if (!callerUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Sign in required to send emails" }, { status: 401 });
    }

    // Rate limit per user
    if (isRateLimited(`email:${callerUser.id}`)) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please wait a minute before sending again." }, { status: 429 });
    }

    const body = await req.json();
    const { toEmail, userId, campaignId, templateData = {}, overrideSubject, forceSend } = body;

    if (!toEmail || typeof toEmail !== "string") {
      return NextResponse.json({ ok: false, error: "Recipient email is required" }, { status: 400 });
    }

    const cleanToEmail = toEmail.trim().toLowerCase();

    // 2. Authorization check: Non-admins can only send emails to their own verified email address
    let isAdmin = false;
    try {
      const { data } = await adminClient.rpc("is_admin");
      isAdmin = Boolean(data);
    } catch {
      isAdmin = false;
    }

    if (!isAdmin && callerUser.email?.toLowerCase() !== cleanToEmail) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: You may only send notifications to your own verified email." },
        { status: 403 }
      );
    }

    const config = await getEmailConfig();
    const campaignMeta = config.campaigns[campaignId];

    if (!forceSend && campaignMeta && !campaignMeta.enabled) {
      return NextResponse.json(
        { ok: false, error: `Campaign '${campaignId}' is disabled in Backoffice settings.` },
        { status: 400 }
      );
    }

    const template = EMAIL_TEMPLATES[campaignId];
    if (!template) {
      return NextResponse.json(
        { ok: false, error: `Unknown email template: '${campaignId}'` },
        { status: 400 }
      );
    }

    const rendered = template.render(templateData);
    const subject = overrideSubject || campaignMeta?.customSubject || rendered.subject;
    const fromEmail = normalizeSenderEmail(config.fromEmail);
    const fromHeader = `${config.fromName} <${fromEmail}>`;

    let providerStatus = "sent";
    let messageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    let providerError: string | undefined;

    const apiKey = config.apiKey || process.env.POSTMARK_SERVER_TOKEN || "";

    if (config.provider === "postmark" && apiKey) {
      const pmRes = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          From: fromHeader,
          To: cleanToEmail,
          ReplyTo: config.replyTo || "support@mydubailife.app",
          Subject: subject,
          HtmlBody: rendered.html,
          TextBody: rendered.text,
          MessageStream: "outbound",
          Tag: campaignId,
          TrackLinks: "None",
        }),
      });

      const pmData = await pmRes.json();

      if (!pmRes.ok || pmData.ErrorCode) {
        providerStatus = "failed";
        providerError = pmData?.Message || `Postmark error code ${pmData?.ErrorCode}`;
      } else {
        messageId = pmData?.MessageID || messageId;
      }
    } else if (config.provider === "resend" && apiKey) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromHeader,
          to: cleanToEmail,
          reply_to: config.replyTo,
          subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        providerStatus = "failed";
        providerError = resendData?.message || "Resend API returned error";
      } else {
        messageId = resendData?.id || messageId;
      }
    } else {
      providerStatus = "simulated";
    }

    // Record delivery into email_campaign_logs
    try {
      await adminClient.from("email_campaign_logs").insert({
        id: crypto.randomUUID(),
        user_id: userId || callerUser.id || null,
        email: cleanToEmail,
        campaign_id: campaignId,
        subject,
        status: providerStatus,
        provider: config.provider,
        provider_message_id: messageId,
        sent_at: new Date().toISOString(),
        metadata: providerError ? { error: providerError } : {},
      });
    } catch (logErr) {
      console.error("[EmailLog] Database log error:", logErr);
    }

    if (providerStatus === "failed") {
      return NextResponse.json({ ok: false, error: providerError }, { status: 400 });
    }

    return NextResponse.json({ ok: true, messageId });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error dispatching email" },
      { status: 500 }
    );
  }
}
