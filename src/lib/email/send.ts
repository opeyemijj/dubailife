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

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  provider: "test",
  apiKey: "",
  fromName: "Dubai Life",
  fromEmail: "welcome@mydubailife.app",
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
      return {
        ...DEFAULT_EMAIL_CONFIG,
        ...(data.value as Partial<EmailConfig>),
        campaigns: {
          ...DEFAULT_EMAIL_CONFIG.campaigns,
          ...((data.value as EmailConfig).campaigns ?? {}),
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
    const { error } = await supabase().rpc("admin_set_setting", {
      p_key: "email_config",
      p_value: config,
    });
    if (error) {
      // Direct upsert fallback for admin
      const { error: upsertErr } = await supabase().from("app_settings").upsert({
        key: "email_config",
        value: config,
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
  forceSend?: boolean; // bypass campaign enabled check for admin test
}

/**
 * Deliver a lifecycle or drip email through the configured provider and log the delivery.
 */
export async function sendLifecycleEmail(
  options: SendEmailOptions
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
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
  const fromHeader = `${config.fromName} <${config.fromEmail}>`;

  let providerStatus = "sent";
  let messageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let providerError: string | undefined;

  // Real delivery if provider is Resend
  if (config.provider === "resend" && config.apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
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
  } else if (config.provider === "postmark" && config.apiKey) {
    try {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          From: fromHeader,
          To: toEmail,
          ReplyTo: config.replyTo,
          Subject: subject,
          HtmlBody: rendered.html,
          TextBody: rendered.text,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ErrorCode) {
        providerStatus = "failed";
        providerError = data?.Message || "Postmark API returned error";
      } else {
        messageId = data?.MessageID || messageId;
      }
    } catch (err: any) {
      providerStatus = "failed";
      providerError = err?.message || "Network error connecting to Postmark";
    }
  } else {
    // Test mode / Simulated provider
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
