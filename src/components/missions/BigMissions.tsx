"use client";

// Big Missions on screen: the sheet with the three missions (invite 5 friends on WhatsApp, a house party with 10 of
// them, 3 of them each bringing a friend), each with its reward, progress and one big button to do it. It opens by
// itself once a day on the map and at home until all three are paid, and from the 💰 button on the map's rail.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { openPartySheet } from "@/components/invite/PartySheetHost";
import { useCitizen } from "@/lib/citizenStore";
import {
  BIG_MISSIONS, BIG_MISSIONS_EVENT, BIG_TOTAL, DEFAULT_MESSAGE, inviteLink, leftToEarn, millions, openWhatsApp, saveMessage, savedMessage,
  useBigMissions, type BigMissionId, type MyBigMissions,
} from "@/lib/bigMissions";
import { gameAudio } from "@/utils/gameAudio";

const SHOWN_KEY = "dl_big_missions_shown";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
/** Pages it opens by itself on: the city maps and home. */
const AUTO = /^\/(explore|abu-dhabi|doha|home)\/?$/;

/** Mounted once (app layout): opens on the rail's button, and by itself once a day. */
export function BigMissionsHost() {
  const { citizen } = useCitizen();
  const me = citizen?.id;
  const data = useBigMissions(me);
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => setOpen(true);
    window.addEventListener(BIG_MISSIONS_EVENT, f);
    return () => window.removeEventListener(BIG_MISSIONS_EVENT, f);
  }, []);
  // Once a day, a few seconds after you're on the map or at home, while there's something left to earn.
  const left = leftToEarn(data);
  useEffect(() => {
    if (!me || !data || left <= 0 || !AUTO.test(path)) return;
    let seen = "";
    try { seen = localStorage.getItem(SHOWN_KEY) ?? ""; } catch { /* storage blocked */ }
    if (seen === today()) return;
    const t = setTimeout(() => {
      setOpen(true);
      try { localStorage.setItem(SHOWN_KEY, today()); } catch { /* storage blocked */ }
    }, 3500);
    return () => clearTimeout(t);
  }, [me, !!data, left, path]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || !citizen) return null;
  return <BigMissionsSheet data={data} username={citizen.username} onClose={() => setOpen(false)} />;
}

function BigMissionsSheet({ data, username, onClose }: { data: MyBigMissions | null; username: string; onClose: () => void }) {
  const [msg, setMsg] = useState(savedMessage);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const left = leftToEarn(data);
  const send = (text = msg) => { gameAudio.playClickSound(); saveMessage(msg); openWhatsApp(text, username); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${msg.trim()}\n${inviteLink(username)}`); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* not allowed */ }
  };
  const status = (id: BigMissionId, target: number) => {
    const n = Math.min(target, data?.progress[id] ?? 0);
    return { n, paid: !!data?.paid.includes(id), reached: n >= target };
  };
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[300] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* The prize. */}
          <div className="relative px-5 pt-6 pb-4 text-center">
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
            <p className="text-5xl">💰</p>
            <p className="mt-1 text-xs font-black tracking-[0.25em] text-amber-300">BIG MISSIONS</p>
            <h2 className="mt-1 text-3xl font-black leading-tight">Earn <span className="text-amber-300">{millions(left > 0 ? left : BIG_TOTAL)}</span></h2>
            <p className="mt-1 text-sm text-slate-300">{left > 0 ? "Bring your friends to Dubai Life. Three missions, paid straight into your account." : "All three done. You're a Dubai Life legend! 🏆"}</p>
            {data && !data.verified && <p className="mt-3 text-xs font-bold rounded-xl bg-amber-400/15 text-amber-200 px-3 py-2">Verify your email so you can be paid.</p>}
            {data && data.verified && !data.eligible && <p className="mt-3 text-xs font-bold rounded-xl bg-amber-400/15 text-amber-200 px-3 py-2">Your rewards are paid once your account is 3 days old. Start inviting now!</p>}
          </div>

          <div className="px-4 space-y-3">
            {BIG_MISSIONS.map((m, i) => {
              const s = status(m.id as BigMissionId, m.target);
              return (
                <div key={m.id} className={`rounded-3xl p-4 ${s.paid ? "bg-emerald-500/15 ring-1 ring-emerald-400/40" : "bg-white/[0.06] ring-1 ring-white/10"}`}>
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 shrink-0 rounded-2xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center">{s.paid ? "✓" : i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black leading-snug">{m.icon} {m.title}</p>
                      <p className="text-xs text-slate-400">{m.blurb}</p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block text-xl font-black text-amber-300 leading-none">{millions(m.aed).replace("AED ", "")}</span>
                      <span className="text-[10px] font-bold text-slate-400">AED</span>
                    </span>
                  </div>
                  {/* Progress. */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full rounded-full ${s.paid ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${(s.n / m.target) * 100}%` }} /></div>
                    <span className="text-xs font-black tabular-nums text-slate-300">{s.n}/{m.target}</span>
                  </div>
                  {s.paid ? <p className="mt-2 text-sm font-black text-emerald-300">Paid · {millions(m.aed)} 🎉</p>
                    : s.reached ? <p className="mt-2 text-sm font-black text-amber-200">Done! Your {millions(m.aed)} is on its way (within 5 minutes).</p>
                    : m.id === "invite5" ? (
                      <div className="mt-3 space-y-2">
                        {editing ? (
                          <div className="space-y-1.5">
                            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} maxLength={600}
                              className="w-full rounded-2xl bg-white text-slate-900 text-sm p-3 outline-none" />
                            <div className="flex justify-between text-xs">
                              <button onClick={() => setMsg(DEFAULT_MESSAGE)} className="font-bold text-slate-400 underline">Use the original</button>
                              <span className="text-slate-500">Your link is added at the end</span>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setEditing(true)} className="w-full text-left rounded-2xl bg-white/[0.07] p-3 text-sm text-slate-200">
                            <span className="line-clamp-3">“{msg}”</span>
                            <span className="block mt-1 text-xs font-bold text-amber-300">✏️ Edit the message</span>
                          </button>
                        )}
                        <WhatsAppButton onClick={() => send()} label="Invite on WhatsApp" />
                        <button onClick={copy} className="w-full h-10 rounded-full bg-white/10 text-sm font-bold">{copied ? "Copied ✓" : "🔗 Copy my invite link"}</button>
                      </div>
                    ) : m.id === "party10" ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button onClick={() => { gameAudio.playClickSound(); onClose(); openPartySheet({ kind: "house_party" }); }} className="h-12 rounded-2xl bg-amber-400 text-slate-950 font-black">🎉 Plan a party</button>
                        <WhatsAppButton small onClick={() => send()} label="Invite more" />
                      </div>
                    ) : (
                      <div className="mt-3">
                        <WhatsAppButton onClick={() => send(`${msg.trim()}\n\nTip: once you're in, invite 5 friends and you earn AED 10M too!`)} label="Invite friends who'll invite theirs" />
                      </div>
                    )}
                </div>
              );
            })}
          </div>
          <p className="px-6 pt-4 text-center text-[11px] text-slate-500">A friend counts once they sign up with your link, verify their email and play for 10 minutes. Each mission pays once.</p>
        </div>
      </div>
    </ModalPortal>
  );
}

function WhatsAppButton({ onClick, label, small = false }: { onClick: () => void; label: string; small?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full ${small ? "h-12 text-sm" : "h-14 text-lg"} rounded-2xl bg-[#25D366] text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 active:scale-[0.98]`}>
      <svg viewBox="0 0 24 24" className={small ? "w-5 h-5" : "w-6 h-6"} fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z" /></svg>
      {label}
    </button>
  );
}
