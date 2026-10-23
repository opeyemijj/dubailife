"use client";

// The anti-scam phone simulator (design spec section 7): when today's scam arrives, an incoming call or
// text slides in. The player can fall for it, report it to e-Crime for a bounty, or ignore it; then a short
// debrief shows the red flags and what the real-world version looks like. Every screen says SIMULATION.

import { ShareButton } from "@/components/share/ShareButton";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Flag, Phone, PhoneOff, ShieldAlert, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { dialogOpen, useCitizen } from "@/lib/citizenStore";
import { resolveScam, SCAM_POINTS, scamDue, type OpenScam, type ScamOutcome } from "@/lib/scams";
import { gameAudio } from "@/utils/gameAudio";

const CHANNEL = {
  call: { icon: "📞", label: "Incoming call", ignore: "Hang up" },
  sms: { icon: "💬", label: "New text message", ignore: "Delete" },
  chat: { icon: "🟢", label: "ChatApp message", ignore: "Ignore" },
  telegram: { icon: "✈️", label: "Telegram message", ignore: "Block & delete" },
} as const;

const Simulation = () => <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">SIMULATION</span>;

export function ScamPhone() {
  const { citizen } = useCitizen();
  const path = usePathname();
  const [scam, setScam] = useState<OpenScam | null>(null);
  const [stage, setStage] = useState<"ring" | "open" | "debrief">("ring");
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScamOutcome | null>(null);
  const signedIn = !!citizen?.id;

  useEffect(() => {
    if (!signedIn) return;
    const check = async () => {
      if (dialogOpen()) return;
      const s = await scamDue();
      if (s) { setScam((cur) => (cur?.id === s.id ? cur : s)); }
    };
    const first = setTimeout(() => void check(), 8000);
    const t = setInterval(() => void check(), 5 * 60_000);
    const onShow = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearTimeout(first); clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
  }, [signedIn]);

  // Ring once when a scam arrives.
  useEffect(() => { if (scam && stage === "ring") gameAudio.playClickSound(); }, [scam?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!scam || path?.startsWith("/admin") || path === "/") return null;
  const s = scam.scam;
  const ch = CHANNEL[s.channel as keyof typeof CHANNEL] ?? CHANNEL.sms;

  const choose = async (action: "comply" | "report" | "ignore") => {
    setBusy(true);
    const r = await resolveScam(scam.id, action);
    setBusy(false);
    if (!r) { setScam(null); return; }
    if (r.outcome === "fell") gameAudio.playClickSound(); else gameAudio.playCoinSound();
    setResult(r);
    setStage("debrief");
  };
  const done = () => { setScam(null); setResult(null); setStage("ring"); setHidden(false); };

  if (stage === "ring") {
    if (hidden) return null;
    return (
      <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[165] w-[min(92vw,380px)] animate-in slide-in-from-top-4 duration-300">
        <div className="rounded-3xl bg-slate-950/95 text-white shadow-2xl border border-white/10 p-3 flex items-center gap-3">
          <button onClick={() => setStage("open")} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${s.channel === "call" ? "bg-emerald-600 animate-pulse" : "bg-sky-600"}`}>{ch.icon}</span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5"><span className="text-[11px] font-bold text-white/60">{ch.label}</span><Simulation /></span>
              <span className="block text-sm font-black truncate">{s.preview}</span>
            </span>
          </button>
          <button onClick={() => setHidden(true)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0" aria-label="Later"><X className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[176] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Scam simulation">
        <div className="absolute inset-0 bg-black/60" aria-hidden />
        <div className="relative w-full sm:max-w-sm bg-slate-950 text-white rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 max-h-[90dvh] overflow-y-auto">
          {stage === "open" ? (
            <>
              <div className="flex items-center justify-between"><Simulation /><span className="text-[11px] text-white/50">{ch.label}</span></div>
              <div className="text-center space-y-1">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl ${s.channel === "call" ? "bg-emerald-600" : "bg-sky-600"}`}>{ch.icon}</div>
                <p className="font-black text-lg leading-tight">{s.sender}</p>
                <p className="text-xs text-white/50">{s.number}</p>
              </div>
              <div className="space-y-2">
                {s.lines.map((line, i) => (
                  <p key={i} className={`text-sm leading-relaxed px-3.5 py-2.5 ${s.channel === "call" ? "italic text-white/90" : "rounded-2xl rounded-bl-md bg-white/10"}`}>
                    {s.channel === "call" ? `“${line}”` : line}
                  </p>
                ))}
              </div>
              <div className="grid gap-2 pt-1">
                <button disabled={busy} onClick={() => choose("comply")} className="h-12 rounded-2xl bg-white/10 hover:bg-white/15 font-black text-sm flex items-center justify-center gap-2">
                  {s.channel === "call" ? <Phone className="w-4 h-4" /> : null} {s.comply}
                </button>
                <button disabled={busy} onClick={() => choose("report")} className="h-12 rounded-2xl bg-white/10 hover:bg-white/15 font-black text-sm flex items-center justify-center gap-2">
                  <Flag className="w-4 h-4" /> Report to e-Crime
                </button>
                <button disabled={busy} onClick={() => choose("ignore")} className="h-12 rounded-2xl bg-white/10 hover:bg-white/15 font-black text-sm flex items-center justify-center gap-2">
                  {s.channel === "call" ? <PhoneOff className="w-4 h-4" /> : null} {ch.ignore}
                </button>
              </div>
              <p className="text-[10px] text-center text-white/40">A training simulation inside Dubai Life. No real money, codes or personal details are ever involved.</p>
            </>
          ) : result && (
            <>
              <div className="flex items-center justify-between"><Simulation /><ShieldAlert className="w-5 h-5 text-amber-400" /></div>
              <div className="text-center space-y-1">
                <div className="text-4xl">{result.outcome === "fell" ? "😬" : result.outcome === "reported" ? "🛡️" : "👍"}</div>
                <p className="font-black text-xl">
                  {result.outcome === "fell" ? "That was a scam" : result.outcome === "reported" ? "Scam reported!" : "Good call"}
                </p>
                <p className="text-sm text-white/70">
                  {result.outcome === "fell"
                    ? `${result.loss > 0 ? `You lost AED ${result.loss.toLocaleString()}. ` : ""}${s.id === "chat_code" ? "Your phone was hacked: chat is paused for 2 hours." : s.id === "police_otp" ? "Your bank froze transfers for 1 hour." : ""}`
                    : result.outcome === "reported"
                      ? `e-Crime paid you an AED ${result.bounty.toLocaleString()} bounty · +${SCAM_POINTS.reported} Scam Defence points`
                      : `You ignored it · +${SCAM_POINTS.avoided} Scam Defence points. Reporting it pays a bounty next time.`}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5 space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-amber-300">Red flags</p>
                <ul className="space-y-1">
                  {s.redFlags.map((f) => <li key={f} className="text-sm flex gap-2"><span className="text-rose-400">✗</span>{f}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-300 mb-1">In real life</p>
                <p className="text-sm text-white/85">{s.realWorld}</p>
              </div>
              {result.outcome !== "avoided" && (
                <ShareButton moment={result.outcome === "fell" ? "scam-fell" : "scam-caught"} v={result.outcome === "fell" ? result.loss : result.bounty}
                  text={result.outcome === "fell" ? "I just fell for a scam in Dubai Life 😬 Would you have spotted it?" : "I just caught a scammer in Dubai Life 🛡️"}
                  className="w-full h-11 rounded-2xl bg-white/10 text-sm" label="Share this" />
              )}
              <button onClick={done} className="w-full h-12 rounded-2xl bg-emerald-600 font-black">Got it</button>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
