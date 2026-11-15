"use client";

// Cash drops at parties (requirements R6): anyone at a live party makes it rain (an amount split into shares, taken
// from them at once), and everyone else there grabs one share in the next 2 minutes. What's not grabbed goes back.
// The database does the money (make_it_rain, grab_cash, settle_cash_drops); this is the button and the grab bubble.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen, useCitizen } from "@/lib/citizenStore";
import { useScreenBusy } from "@/lib/popups";
import { gameAudio } from "@/utils/gameAudio";
import { shortAed } from "@/lib/cityFeed";
import { ModalPortal } from "@/components/ui/modal-portal";

interface Drop { id: number; giver: string; giverId: string; perShare: number; total: number; left: number; shares: number; expiresAt: string; mine: boolean }

const AMOUNTS = [1_000_000, 5_000_000, 10_000_000, 50_000_000];
const SHARES = [5, 10, 20];
const ERRORS: Record<string, string> = {
  insufficient_funds: "You don't have that much.",
  not_at_party: "You need to be at the party.",
  drop_running: "Someone's cash drop is still going. Wait for it to end.",
  bad_amount: "Pick a bigger amount.",
};

/** Make it rain: the 💸 button and its sheet. */
export function RainButton({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => { gameAudio.playClickSound(); setOpen(true); }} aria-label="Make it rain"
        className="shrink-0 h-7 px-2.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">💸</button>
      {open && <RainSheet code={code} onClose={() => setOpen(false)} />}
    </>
  );
}

function RainSheet({ code, onClose }: { code: string; onClose: () => void }) {
  useScreenBusy(true);
  const { citizen } = useCitizen();
  const [amount, setAmount] = useState(AMOUNTS[0]);
  const [shares, setShares] = useState(SHARES[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balance = citizen?.balance ?? 0;
  const rain = async () => {
    setBusy(true); setError(null);
    const { error: e } = await supabase().rpc("make_it_rain", { p_code: code, p_total: amount, p_shares: shares });
    setBusy(false);
    if (e) { setError(ERRORS[Object.keys(ERRORS).find((k) => e.message.includes(k)) ?? ""] ?? "Couldn't make it rain. Try again."); return; }
    gameAudio.playCoinSound();
    void refreshCitizen();
    window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `💸 You made it rain AED ${shortAed(amount)}! Everyone has 2 minutes to grab.` }));
    window.dispatchEvent(new CustomEvent("dubai:cash-drop"));
    onClose();
  };
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Make it rain">
        <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} aria-hidden />
        <div className="relative w-full sm:max-w-sm bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3 shadow-2xl">
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
          <div className="pr-8">
            <p className="text-3xl">💸</p>
            <h2 className="text-xl font-black">Make it rain</h2>
            <p className="text-sm text-slate-600">Everyone at the party grabs a share in the next 2 minutes. Whatever nobody grabs comes back to you. You&apos;ll show up in the City and on Big Givers.</p>
          </div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">How much</p>
          <div className="grid grid-cols-4 gap-1.5">
            {AMOUNTS.map((a) => (
              <button key={a} onClick={() => setAmount(a)} disabled={a > balance}
                className={`h-11 rounded-xl text-sm font-black disabled:opacity-30 ${amount === a ? "bg-amber-400 text-slate-950" : "bg-slate-100"}`}>{shortAed(a)}</button>
            ))}
          </div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Shares</p>
          <div className="grid grid-cols-3 gap-1.5">
            {SHARES.map((s) => (
              <button key={s} onClick={() => setShares(s)} className={`h-11 rounded-xl text-sm font-black ${shares === s ? "bg-amber-400 text-slate-950" : "bg-slate-100"}`}>{s} people</button>
            ))}
          </div>
          <p className="text-sm text-slate-600 text-center">Each grab: <b>AED {shortAed(Math.floor(amount / shares))}</b></p>
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          <button onClick={() => void rain()} disabled={busy || amount > balance} className="w-full h-12 rounded-2xl bg-slate-950 text-white font-black disabled:opacity-50">
            {busy ? "Making it rain…" : `Make it rain AED ${shortAed(amount)}`}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

/** The grab bubble: while a cash drop is going at this party, for everyone there but the giver. */
export function CashDropBubble({ code }: { code: string }) {
  const { citizen } = useCitizen();
  const [drop, setDrop] = useState<Drop | null>(null);
  const [got, setGot] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let live = true;
    const check = async () => {
      const { data } = await supabase().rpc("party_cash_drop", { p_code: code });
      if (live) setDrop((data as Drop | null) ?? null);
    };
    const first = setTimeout(() => void check(), 500);
    const every = setInterval(() => void check(), 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const soon = () => void check();
    window.addEventListener("dubai:cash-drop", soon);
    return () => { live = false; clearTimeout(first); clearInterval(every); clearInterval(tick); window.removeEventListener("dubai:cash-drop", soon); };
  }, [code]);

  if (!drop || drop.giverId === citizen?.id) return null;
  const secs = Math.max(0, Math.round((Date.parse(drop.expiresAt) - now) / 1000));
  if (secs <= 0 && !got) return null;
  const grab = async () => {
    const { data } = await supabase().rpc("grab_cash", { p_drop: drop.id });
    const amt = Number(data ?? 0);
    setGot(amt);
    if (amt > 0) { gameAudio.playCoinSound(); void refreshCitizen(); }
    setTimeout(() => { setGot(null); setDrop(null); }, 2500);
  };
  // Through the portal: the party banner it sits in is transformed, which would pin this to the banner.
  return (
    <ModalPortal>
    <div className="fixed left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+5.5rem)] z-[61] pointer-events-auto animate-[sheetUp_0.25s_ease-out]">
      {got !== null || drop.mine ? (
        <div className="rounded-full bg-emerald-500 text-white px-5 py-3 font-black shadow-2xl">
          {got ? `💰 +AED ${shortAed(got)} from @${drop.giver}!` : drop.mine ? "💰 You grabbed your share" : "Too late, it's all gone"}
        </div>
      ) : (
        <button onClick={() => void grab()} className="rounded-full bg-amber-400 text-slate-950 px-5 py-3 font-black shadow-2xl flex items-center gap-2 animate-bounce">
          💸 @{drop.giver} made it rain! Grab AED {shortAed(drop.perShare)} <span className="text-xs font-bold opacity-70">{drop.left} left · {secs}s</span>
        </button>
      )}
    </div>
    </ModalPortal>
  );
}
