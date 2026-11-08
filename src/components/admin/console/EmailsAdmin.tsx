"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Mail,
  Send,
  Settings,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  Monitor,
  RefreshCw,
  Sparkles,
  Search,
  ExternalLink,
  X,
  Play,
} from "lucide-react";
import { Page, Table, Button, when, db, useRows } from "./ui";
import {
  EmailConfig,
  DEFAULT_EMAIL_CONFIG,
  getEmailConfig,
  saveEmailConfig,
  sendLifecycleEmail,
} from "@/lib/email/send";
import { EMAIL_TEMPLATES, EmailTemplateDefinition } from "@/lib/email/templates";
import { Pagination } from "./Pagination";

interface CampaignLog {
  id: string;
  email: string;
  user_id: string | null;
  campaign_id: string;
  subject: string;
  status: string;
  provider: string;
  provider_message_id: string | null;
  sent_at: string;
}

export function EmailsAdmin() {
  const [config, setConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  // Modals
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplateDefinition | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [triggeringCron, setTriggeringCron] = useState(false);

  // Delivery Logs
  const [logFilter, setLogFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const { rows: logs, reload: reloadLogs } = useRows<CampaignLog>(() => {
    let q = db()
      .from("email_campaign_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(300);
    if (logFilter !== "all") q = q.eq("campaign_id", logFilter);
    return q;
  }, [logFilter]);

  // Load active config on mount
  useEffect(() => {
    getEmailConfig()
      .then(setConfig)
      .finally(() => setLoadingConfig(false));
  }, []);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setMessage(null);
    const res = await saveEmailConfig(config);
    setSavingConfig(false);
    if (res.ok) {
      setMessage({ text: "Email & Retention configuration saved successfully.", tone: "success" });
    } else {
      setMessage({ text: res.error || "Failed to save configuration", tone: "error" });
    }
  };

  const handleToggleCampaign = (id: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      campaigns: {
        ...prev.campaigns,
        [id]: {
          ...prev.campaigns[id],
          enabled,
        },
      },
    }));
  };

  const handleSubjectChange = (id: string, customSubject: string) => {
    setConfig((prev) => ({
      ...prev,
      campaigns: {
        ...prev.campaigns,
        [id]: {
          ...prev.campaigns[id],
          customSubject,
        },
      },
    }));
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress.trim()) return;
    setSendingTest(true);
    const res = await sendLifecycleEmail({
      toEmail: testEmailAddress.trim(),
      campaignId: "admin_test",
      forceSend: true,
    });
    setSendingTest(false);
    if (res.ok) {
      setMessage({
        text: `Test email dispatched to ${testEmailAddress.trim()} (Message ID: ${res.messageId})`,
        tone: "success",
      });
      setTestModalOpen(false);
      reloadLogs();
    } else {
      setMessage({ text: res.error || "Failed to deliver test email.", tone: "error" });
    }
  };

  const handleTriggerCronManual = async () => {
    setTriggeringCron(true);
    try {
      const res = await fetch("/api/cron/lifecycle-emails", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          text: `Retention cron evaluated successfully: ${data.processed.incomplete_signup} drop-offs, ${data.processed.inactive_3d} 3-day inactive, ${data.processed.inactive_7d} 7-day bonuses sent.`,
          tone: "success",
        });
        reloadLogs();
      } else {
        setMessage({ text: data.error || "Cron execution failed", tone: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to run cron job", tone: "error" });
    } finally {
      setTriggeringCron(false);
    }
  };

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!logSearch.trim()) return logs;
    const q = logSearch.toLowerCase().trim();
    return logs.filter(
      (l) =>
        l.email.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        l.campaign_id.toLowerCase().includes(q)
    );
  }, [logs, logSearch]);

  const pagedLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, page]);

  return (
    <Page
      title="Emails & Retention Pipeline"
      subtitle="Configure lifecycle triggers, automated drip series, email provider settings, and view delivery logs."
      actions={
        <div className="flex items-center gap-2">
          <Button
            tone="secondary"
            onClick={handleTriggerCronManual}
            disabled={triggeringCron}
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            {triggeringCron ? "Running Cron…" : "Run Lifecycle Check"}
          </Button>
          <Button tone="primary" onClick={() => setTestModalOpen(true)}>
            <Send className="w-3.5 h-3.5 mr-1" /> Send Test Email
          </Button>
        </div>
      }
    >
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between ${
            message.tone === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.tone === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Provider & Sender Settings */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white">Email Provider &amp; Sender Settings</h2>
          </div>
          <Button tone="primary" onClick={handleSaveConfig} disabled={savingConfig || loadingConfig}>
            {savingConfig ? "Saving…" : "Save Configuration"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">
              Delivery Provider
            </label>
            <select
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
              className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm text-white"
            >
              <option value="test">Test Mode (Simulated / Logs Only)</option>
              <option value="resend">Resend (Recommended - resend.com)</option>
              <option value="postmark">Postmark (postmarkapp.com)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">
              Provider API Key
            </label>
            <input
              type="password"
              value={config.apiKey || ""}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder={config.provider === "test" ? "Not required in test mode" : "re_... or server-token"}
              className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm text-white placeholder-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">
              From Name
            </label>
            <input
              type="text"
              value={config.fromName}
              onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
              className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">
              From Email Address
            </label>
            <input
              type="email"
              value={config.fromEmail}
              onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
              className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm text-white"
            />
            <p className="text-[10px] text-slate-500">Must be verified in Postmark (e.g. noreply@mydubailife.app)</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">
              Reply-To Email
            </label>
            <input
              type="email"
              value={config.replyTo}
              onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
              className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm text-white"
            />
            <p className="text-[10px] text-slate-500">e.g. support@mydubailife.app</p>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <p className="text-xs text-slate-400">
              Current Mode: <strong className="text-amber-400">{config.provider.toUpperCase()}</strong>.
              All messages use domain <code className="text-white">mydubailife.app</code>.
            </p>
          </div>
        </div>
      </section>

      {/* Campaigns Matrix */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Automated Retention &amp; Drip Sequences</h2>
            <p className="text-xs text-slate-400">
              8 targeted email journeys designed to maximize 30-day citizen retention without spamming.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(EMAIL_TEMPLATES)
            .filter(([id]) => id !== "admin_test")
            .map(([id, tpl]) => {
              const meta = config.campaigns[id] ?? { enabled: true };
              const currentSubject = meta.customSubject || tpl.defaultSubject;

              return (
                <div
                  key={id}
                  className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                    meta.enabled
                      ? "bg-slate-900/60 border-white/10"
                      : "bg-slate-950/40 border-white/5 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            tpl.category === "lifecycle"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          }`}
                        >
                          {tpl.category}
                        </span>
                        <h3 className="font-bold text-sm text-white truncate">{tpl.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{tpl.timingDescription}</p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={meta.enabled}
                        onChange={(e) => handleToggleCampaign(id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={currentSubject}
                      onChange={(e) => handleSubjectChange(id, e.target.value)}
                      className="w-full h-9 rounded-xl bg-slate-950 border border-slate-800 px-2.5 text-xs text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      ID: <code className="text-slate-400">{id}</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(tpl)}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview HTML</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Delivery Logs */}
      <section className="space-y-3 pt-4 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-white">Sent Delivery Logs</h2>
            <p className="text-xs text-slate-400">
              Live audit trail of all automated retention emails sent to citizens.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search recipient or subject..."
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 pl-8 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 w-52"
              />
            </div>

            <select
              value={logFilter}
              onChange={(e) => {
                setLogFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-xl bg-slate-950 border border-slate-800 px-2 text-xs text-white"
            >
              <option value="all">All Campaigns</option>
              {Object.keys(EMAIL_TEMPLATES).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>

            <Button tone="secondary" onClick={() => reloadLogs()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <Table head={["Recipient", "Campaign", "Subject", "Status", "Provider ID", "Sent"]}>
          {pagedLogs.map((log) => (
            <tr key={log.id} className="text-xs">
              <td className="px-3 py-2.5 font-bold text-white max-w-[160px] truncate">
                {log.email}
              </td>
              <td className="px-3 py-2.5">
                <span className="font-mono text-[11px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md">
                  {log.campaign_id}
                </span>
              </td>
              <td className="px-3 py-2.5 text-slate-300 max-w-xs truncate">{log.subject}</td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                    log.status === "sent"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : log.status === "simulated"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {log.status === "sent" ? "✓ Sent" : log.status === "simulated" ? "⚡ Test" : "✕ Failed"}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
                {log.provider_message_id || "—"}
              </td>
              <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{when(log.sent_at)}</td>
            </tr>
          ))}
        </Table>

        <Pagination
          currentPage={page}
          totalItems={filteredLogs.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </section>

      {/* Email Preview Modal */}
      {previewTemplate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        >
          <div className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl p-5 text-white flex flex-col max-h-[92dvh] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base">{previewTemplate.name}</h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${
                      previewDevice === "desktop" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-400"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${
                      previewDevice === "mobile" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-400"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>

                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="py-2 text-xs text-slate-400">
              <strong>Subject:</strong> {previewTemplate.defaultSubject}
            </div>

            <div className="flex-1 min-h-0 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex justify-center p-2">
              <div
                className={`h-full overflow-y-auto transition-all ${
                  previewDevice === "mobile" ? "w-[375px] border border-slate-700 rounded-3xl" : "w-full"
                }`}
              >
                <iframe
                  title="Email Preview"
                  srcDoc={
                    previewTemplate.render({
                      username: "habibi_alex",
                      bonusAmount: 2500,
                      loginUrl: "https://mydubailife.app/home",
                    }).html
                  }
                  className="w-full h-full min-h-[500px] border-none bg-[#090d16]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {testModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base">Send Test Delivery</h3>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Sends a diagnostic test email through the active provider (
                <strong className="text-white">{config.provider.toUpperCase()}</strong>) to verify API
                keys and HTML formatting.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="admin@mydubailife.app"
                  className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button tone="secondary" onClick={() => setTestModalOpen(false)}>
                  Cancel
                </Button>
                <Button tone="primary" disabled={sendingTest || !testEmailAddress.trim()}>
                  {sendingTest ? "Sending…" : "Send Test Now"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}
