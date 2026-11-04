"use client";

// Can't find it? Ask for a book or course to be added. What others ask for most is listed, to back with one tap.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useCitizen } from "@/lib/citizenStore";
import { ACADEMIC_CAMPUSES } from "@/lib/city/academic";
import { gameAudio } from "@/utils/gameAudio";

interface Top { kind: "book" | "course"; title: string; n: number; mine: boolean }
const ERR: Record<string, string> = {
  too_many_requests: "That's 10 requests today. Thank you! Try again tomorrow.",
  bad_title: "Give it a name (2 to 120 characters).",
  not_signed_in: "Sign in to send a request.",
};

export function RequestLearning() {
  const { citizen } = useCitizen();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"book" | "course">("course");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [where, setWhere] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [top, setTop] = useState<Top[] | null>(null);
  const load = () => { void supabase().rpc("top_learning_requests").then(({ data }) => setTop((data as Top[] | null) ?? [])); };
  useEffect(() => { if (open && citizen?.id) load(); }, [open, citizen?.id]);

  const send = async (k = kind, t = title, n = note, w = where) => {
    setBusy(true);
    const { error } = await supabase().rpc("request_learning", { p_kind: k, p_title: t, p_note: n || null, p_institution: w || null });
    setBusy(false);
    if (error) { setMsg(ERR[Object.keys(ERR).find((e) => error.message.includes(e)) ?? ""] ?? "Couldn't send it. Try again."); return; }
    gameAudio.playCoinSound();
    setMsg(`Thanks! "${t.trim()}" is on the list.`);
    setTitle(""); setNote("");
    load();
  };

  return (
    <>
      <button onClick={() => { gameAudio.playClickSound(); setOpen(true); }} className="w-full flex items-center gap-3 rounded-2xl p-4 bg-white/5 border border-dashed border-white/20 text-left">
        <span className="text-3xl">🙋</span>
        <span className="flex-1">
          <span className="block text-sm font-black text-white">Can&apos;t find it? Request a book or course</span>
          <span className="block text-xs text-slate-300">Tell us what you want to learn. The most requested get added first.</span>
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Request a book or course" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">🙋 Request a book or course</p>
              <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(["course", "book"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)} className={`h-9 rounded-lg text-xs font-black ${kind === k ? "bg-white shadow" : "text-slate-500"}`}>{k === "course" ? "🎓 A course" : "📖 A book"}</button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder={kind === "course" ? "e.g. Nursing, Plumbing, Fashion design" : "e.g. The Lean Startup"} aria-label="Title"
              className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold outline-none" />
            {kind === "course" && (
              <select value={where} onChange={(e) => setWhere(e.target.value)} aria-label="Where" className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm font-bold outline-none">
                <option value="">Any university or school</option>
                {Object.values(ACADEMIC_CAMPUSES).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} placeholder="Why do you want it? (optional)" aria-label="Why"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm outline-none" />
            <button onClick={() => send()} disabled={busy || title.trim().length < 2} className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black disabled:opacity-50">{busy ? "Sending…" : "Send request"}</button>
            {msg && <p className="text-sm font-bold text-emerald-700 text-center">{msg}</p>}
            {!!top?.length && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Most requested</p>
                {top.map((t) => (
                  <div key={`${t.kind}:${t.title}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <span>{t.kind === "book" ? "📖" : "🎓"}</span>
                    <span className="flex-1 min-w-0 text-sm font-bold truncate">{t.title}</span>
                    <span className="text-xs font-black text-slate-500">{t.n}</span>
                    {t.mine ? <span className="text-xs font-black text-emerald-600">Asked ✓</span>
                      : <button onClick={() => send(t.kind, t.title, "", "")} disabled={busy} className="h-7 px-2.5 rounded-full bg-emerald-600 text-white text-[11px] font-black">Me too</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
