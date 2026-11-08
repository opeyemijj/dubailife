import { supabase } from "@/lib/supabase/client";
import { EMAIL_TEMPLATES, EmailTemplateData } from "./templates";

export interface EmailConfig {
  provider: "resend" | "postmark" | "smtp" | "test";
  apiKey?: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  campaigns: Record<
    string,
    {
      enabled: boolean;
      customSubject?: string;
    }
  >;
}

// Exactly matches the system's verified Postmark config in app_settings (key: 'email')
export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  provider: "postmark",
  apiKey: "d817ed82-d6b8-4521-9ef1-4e5d6ee81a04",
  fromName: "Dubai Life",
  fromEmail: "noreply@mydubailife.app",
  replyTo: "support@mydubailife.app",
  campaigns: {
    incomplete_signup: { enabled: true },
    inactive_3d: { enabled: true },
    inactive_7d: { enabled: true },
    drip_day1: { enabled: true },
    drip_day3: { enabled: true },
    drip_day6: { enabled: true },
    drip_day10: { enabled: true },
    drip_day14: { enabled: true },
    admin_test: { enabled: true },
  },
};

/**
 * Normalizes email address to ensure it matches Postmark verified sender signature.
 * e.g. converts "noreply@dubailife.app" -> "noreply@mydubailife.app"
 */
export function normalizeSenderEmail(email?: string): string {
  if (!email || email.trim() === "") return "noreply@mydubailife.app";
  const trimmed = email.trim();
  if (trimmed.endsWith("@dubailife.app")) {
    return trimmed.replace("@dubailife.app", "@mydubailife.app");
  }
  return trimmed;
}

/**
 * Fetch the active email configuration from Supabase app_settings.
 */
export async function getEmailConfig(): Promise<EmailConfig> {
  try {
    const { data } = await supabase()
      .from("app_settings")
      .select("value")
      .eq("key", "email_config")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      const val = data.value as Partial<EmailConfig>;
      return {
        ...DEFAULT_EMAIL_CONFIG,
        ...val,
        fromEmail: normalizeSenderEmail(val.fromEmail),
        apiKey: val.apiKey || process.env.POSTMARK_SERVER_TOKEN || DEFAULT_EMAIL_CONFIG.apiKey,
        campaigns: {
          ...DEFAULT_EMAIL_CONFIG.campaigns,
          ...(val.campaigns ?? {}),
        },
      };
    }
  } catch (err) {
    console.error("[EmailConfig] Failed to fetch settings:", err);
  }
  return DEFAULT_EMAIL_CONFIG;
}

/**
 * Update the active email configuration in app_settings.
 */
export async function saveEmailConfig(config: EmailConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanConfig: EmailConfig = {
      ...config,
      fromEmail: normalizeSenderEmail(config.fromEmail),
    };
    const { error } = await supabase().rpc("admin_set_setting", {
      p_key: "email_config",
      p_value: cleanConfig,
    });
    if (error) {
      const { error: upsertErr } = await supabase().from("app_settings").upsert({
        key: "email_config",
        value: cleanConfig,
        updated_at: new Date().toISOString(),
      });
      if (upsertErr) return { ok: false, error: upsertErr.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to save email settings" };
  }
}

export interface SendEmailOptions {
  toEmail: string;
  userId?: string;
  campaignId: string;
  templateData?: EmailTemplateData;
  overrideSubject?: string;
  forceSend?: boolean;
}

/**
 * Deliver an email.
 * - If running in browser: routes through /api/email/send to prevent browser CORS blocks.
 * - If running on server: connects to Postmark using the verified system configuration.
 */
export async function sendLifecycleEmail(
  options: SendEmailOptions
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  // Client-side execution: delegate to our Next.js API route to prevent CORS errors
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data?.error || `Server error ${res.status}` };
      }
      return { ok: true, messageId: data.messageId };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Network error contacting email server" };
    }
  }

  // Server-side execution (Cron or API Route)
  const { toEmail, userId, campaignId, templateData = {}, overrideSubject, forceSend } = options;
  const config = await getEmailConfig();
  const campaignMeta = config.campaigns[campaignId];

  if (!forceSend && campaignMeta && !campaignMeta.enabled) {
    return { ok: false, error: `Campaign '${campaignId}' is currently disabled in Backoffice settings.` };
  }

  const template = EMAIL_TEMPLATES[campaignId];
  if (!template) {
    return { ok: false, error: `Unknown email template: '${campaignId}'` };
  }

  const rendered = template.render(templateData);
  const subject = overrideSubject || campaignMeta?.customSubject || rendered.subject;
  const fromEmail = normalizeSenderEmail(config.fromEmail);
  const fromHeader = `${config.fromName} <${fromEmail}>`;

  let providerStatus = "sent";
  let messageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let providerError: string | undefined;

  const apiKey = config.apiKey || process.env.POSTMARK_SERVER_TOKEN || DEFAULT_EMAIL_CONFIG.apiKey;

  if (config.provider === "postmark" && apiKey) {
    try {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          From: fromHeader,
          To: toEmail,
          ReplyTo: config.replyTo || "support@mydubailife.app",
          Subject: subject,
          HtmlBody: rendered.html,
          TextBody: rendered.text,
          MessageStream: "outbound",
          Tag: campaignId,
          TrackLinks: "None",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ErrorCode) {
        providerStatus = "failed";
        providerError = data?.Message || `Postmark error code ${data?.ErrorCode}`;
      } else {
        messageId = data?.MessageID || messageId;
      }
    } catch (err: any) {
      providerStatus = "failed";
      providerError = err?.message || "Network error connecting to Postmark";
    }
  } else if (config.provider === "resend" && apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromHeader,
          to: toEmail,
          reply_to: config.replyTo,
          subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        providerStatus = "failed";
        providerError = data?.message || "Resend API returned error";
      } else {
        messageId = data?.id || messageId;
      }
    } catch (err: any) {
      providerStatus = "failed";
      providerError = err?.message || "Network error connecting to Resend";
    }
  } else {
    // Test mode
    providerStatus = "simulated";
    console.log(`[Email Simulation] To: ${toEmail} | Subject: "${subject}" | Provider: ${config.provider}`);
  }

  // Record delivery into email_campaign_logs table
  try {
    await supabase().from("email_campaign_logs").insert({
      id: crypto.randomUUID(),
      user_id: userId || null,
      email: toEmail,
      campaign_id: campaignId,
      subject,
      status: providerStatus,
      provider: config.provider,
      provider_message_id: messageId,
      sent_at: new Date().toISOString(),
      metadata: providerError ? { error: providerError } : {},
    });
  } catch (logErr) {
    console.error("[EmailLog] Failed to log email delivery:", logErr);
  }

  if (providerStatus === "failed") {
    return { ok: false, error: providerError };
  }

  return { ok: true, messageId };
}
