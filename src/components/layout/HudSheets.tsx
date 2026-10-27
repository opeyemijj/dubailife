"use client";

// Sheets that open over any page: What's new (shown once when there's something new, on the map) and
// the Suggestion box (offered once a week). Open one with openSheet("whats-new" | "suggest").

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetChip } from "@/components/ui/sheet";
import { dialogOpen, useCitizen } from "@/lib/citizenStore";
import { supabase } from "@/lib/supabase/client";
import NEWS from "@/data/guide/whats-new.json";

type SheetId = "whats-new" | "suggest";
export const openSheet = (id: SheetId) => window.dispatchEvent(new CustomEvent("dubai:open-sheet", { detail: id }));

const SEEN_KEY = "dubai_news_seen";
const ASKED_KEY = "dubai_suggest_asked";
const WEEK = 7 * 86_400_000;

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage off */ } };

export function HudSheets() {
  const { citizen } = useCitizen();
  const pathname = usePathname();
  const [open, setOpen] = useState<SheetId | null>(null);
  const signedIn = !!citizen?.id;
  const createdAt = citizen?.createdAt;

  useEffect(() => {
    const show = (e: Event) => setOpen((e as CustomEvent<SheetId>).detail);
    window.addEventListener("dubai:open-sheet", show);
    return () => window.removeEventListener("dubai:open-sheet", show);
  }, []);

  // On the map: What's new once per new item, then (another day) the weekly suggestion box.
  useEffect(() => {
    if (!signedIn || pathname !== "/explore") return;
    const latest = NEWS.items[0]?.id;
    const settled = createdAt && Date.now() - Date.parse(createdAt) > 2 * 86_400_000;
    const asked = Number(read(ASKED_KEY) ?? 0);
    const want: SheetId | null = latest && read(SEEN_KEY) !== latest && settled ? "whats-new"
      : settled && Date.now() - asked > WEEK ? "suggest" : null;
    if (!want) return;
    const id = setTimeout(() => {
      if (dialogOpen()) return;
      if (want === "suggest") write(ASKED_KEY, String(Date.now()));
      setOpen(want);
    }, want === "whats-new" ? 2500 : 90_000);
    return () => clearTimeout(id);
  }, [signedIn, pathname, createdAt]);

  if (open === "whats-new") return <WhatsNew onClose={() => { write(SEEN_KEY, NEWS.items[0]?.id ?? ""); setOpen(null); }} />;
  if (open === "suggest" && signedIn) return <SuggestionBox onClose={() => setOpen(null)} />;
  return null;
}

function WhatsNew({ onClose }: { onClose: () => void }) {
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <Sheet icon="✨" title="What's new" subtitle="Fresh in Dubai Life" onClose={onClose}>
      {NEWS.items.map((n) => (
        <article key={n.id} className="rounded-3xl border border-slate-200 p-4 flex gap-3">
          <span className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl shrink-0">{n.icon}</span>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-2">
              <h3 className="flex-1 font-black text-lg leading-snug">{n.title}</h3>
              <span className="text-sm text-slate-500 shrink-0 pt-0.5">{fmt(n.date)}</span>
            </div>
            <p className="text-slate-500 leading-relaxed">{n.text}</p>
            <p className="rounded-2xl bg-slate-100 px-4 py-3 text-slate-700 leading-relaxed">{n.how}</p>
          </div>
        </article>
      ))}
    </Sheet>
  );
}

const KINDS = [
  { id: "idea", label: "New idea", icon: "💡", category: "general", prompt: "Your idea…" },
  { id: "broken", label: "Something's broken", icon: "🐞", category: "bugs", prompt: "What happened, and where?" },
  { id: "easier", label: "Make it easier", icon: "🙌", category: "general", prompt: "What was hard to do?" },
  { id: "else", label: "Something else", icon: "💬", category: "general", prompt: "Tell us anything…" },
] as const;

function SuggestionBox({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]>(KINDS[0]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const body = text.trim();
    // The ideas board shows a one-line title: the first sentence (or the start) of what was written.
    const sentence = body.split(/[.!?]\s|\n/)[0];
    const first = (sentence.length >= 4 ? sentence : body).slice(0, 100);
    const title = kind.id === "easier" ? `Make it easier: ${first}`.slice(0, 100) : first;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().rpc("post_idea", { p_title: title, p_body: body.length > title.length ? body : "", p_category: kind.category });
    setBusy(false);
    if (err) setError(/too_many/.test(err.message) ? "You've sent 5 today. Thank you! Come back tomorrow." : "Couldn't send that. Write a little more and try again.");
    else setDone(true);
  };

  return (
    <Sheet icon="💡" title="Suggestion box" subtitle="Help us make Dubai Life better" onClose={onClose}>
      {done ? (
        <div className="text-center py-6 space-y-3">
          <div className="text-5xl">🙏</div>
          <p className="font-black text-xl">Thank you!</p>
          <p className="text-slate-500">We read every suggestion. Others can vote for it on the Ideas board in your phone.</p>
          <button onClick={onClose} className="w-full h-14 rounded-full bg-slate-900 text-white font-black text-lg">Done</button>
        </div>
      ) : (
        <>
          <p className="text-lg text-slate-500 leading-snug">What should we add, fix or change? Tell us straight. We read every suggestion.</p>
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <SheetChip key={k.id} active={kind.id === k.id} onClick={() => setKind(k)}><span>{k.icon}</span>{k.label}</SheetChip>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} rows={4} placeholder={kind.prompt}
            className="w-full rounded-3xl bg-slate-100 p-4 text-lg outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose} className="h-14 rounded-full bg-slate-100 font-bold text-lg">Not now</button>
            <button onClick={send} disabled={busy || text.trim().length < 4} className="h-14 rounded-full bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-lg">{busy ? "Sending…" : "Send"}</button>
          </div>
          <p className="text-center text-sm text-slate-500">We&apos;ll ask again next week. You can also post and vote on ideas in Phone → Ideas.</p>
        </>
      )}
    </Sheet>
  );
}
