"use client";

// The season pass and Dubai Plus (design spec 19.5, US-7.4). Season XP is the league points scored this
// season; 20 levels. The free track pays titles and AED; the premium track (season pass, or included with
// Dubai Plus) is cosmetic only: frames, titles and the season badge. Nothing here affects visas,
// wages or tournament points.

import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Checkout } from "@/components/commerce/Checkout";
import { claimPlusFrame, claimReward, cosmeticName, equip, frameColour, mySeason, rewardFor, seasonById, SEASONS, type MySeason } from "@/lib/seasons";
import { gameAudio } from "@/utils/gameAudio";

export function SeasonTab() {
  const [me, setMe] = useState<MySeason | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [buying, setBuying] = useState<"pass" | "plus" | null>(null);
  const [now] = useState(() => Date.now());
  const load = useCallback(async () => setMe(await mySeason()), []);
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  if (!me) return <p className="text-sm text-slate-500 py-8 text-center">Loading the season…</p>;
  const season = seasonById(me.season);
  const level = Math.min(SEASONS.levels, Math.floor(me.xp / SEASONS.xpPerLevel));
  const into = me.xp - level * SEASONS.xpPerLevel;
  const claimed = (l: number, t: "free" | "premium") => me.claimed.some((c) => c.level === l && c.track === t);
  const owned = (kind: string) => me.cosmetics.filter((c) => c.id.startsWith(`${kind}:`));
  const daysLeft = season ? Math.max(0, Math.ceil((Date.parse(season.ends) - now) / 86_400_000)) : 0;

  const claim = async (l: number, t: "free" | "premium") => {
    const e = await claimReward(l, t);
    if (e) return setNote(e);
    gameAudio.playCoinSound();
    const r = rewardFor(me.season!, l, t);
    setNote(r.aed ? `+AED ${r.aed}` : `Unlocked: ${cosmeticName(r.item!).name}`);
    void load();
  };
  const wear = async (kind: "title" | "frame" | "badge", id: string | null) => { await equip(kind, id); gameAudio.playClickSound(); void load(); };
  const label = (r: { item?: string; aed?: number }) => (r.aed ? `AED ${r.aed}` : (() => { const c = cosmeticName(r.item!); return `${c.kind === "title" ? "🏷️" : c.kind === "frame" ? "🖼️" : "🎖️"} ${c.name}`; })());

  return (
    <div className="space-y-4 pt-1">
      {!season ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">The next season starts soon.</p> : (
        <>
          <section className="rounded-3xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${season.accent}, #1e1b4b)` }}>
            <p className="text-xs font-black uppercase tracking-wider text-white/70">{daysLeft} days left</p>
            <p className="font-black text-xl leading-tight">{season.name}</p>
            <p className="text-xs text-white/80">{season.theme}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-3xl font-black">{level}</span>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: `${level >= SEASONS.levels ? 100 : (into / SEASONS.xpPerLevel) * 100}%` }} /></div>
                <p className="text-[11px] text-white/80 mt-1">{level >= SEASONS.levels ? "Max level!" : `${into}/${SEASONS.xpPerLevel} XP to level ${level + 1}`} · XP = league points</p>
              </div>
            </div>
            {!me.premium && <button onClick={() => setBuying("pass")} className="mt-3 w-full h-11 rounded-2xl bg-white text-slate-900 font-black text-sm">Unlock the premium track · AED {me.prices.season_pass_aed}</button>}
          </section>
          {note && <p className="text-sm font-bold text-center text-emerald-700">{note}</p>}

          <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-1.5 text-[11px] font-black text-slate-500 px-1"><span>Lvl</span><span>Free</span><span>Premium</span></div>
          <ol className="space-y-1.5">
            {Array.from({ length: SEASONS.levels }, (_, i) => i + 1).map((l) => (
              <li key={l} className="grid grid-cols-[2.5rem_1fr_1fr] gap-1.5 items-stretch">
                <span className={`rounded-xl flex items-center justify-center font-black text-sm ${l <= level ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"}`}>{l}</span>
                {(["free", "premium"] as const).map((t) => {
                  const r = rewardFor(me.season!, l, t);
                  const done = claimed(l, t), reached = l <= level, locked = t === "premium" && !me.premium;
                  return (
                    <button key={t} disabled={done || !reached || locked} onClick={() => claim(l, t)}
                      className={`rounded-xl px-2 py-2 text-left text-[11px] font-bold leading-tight border ${done ? "bg-emerald-50 border-emerald-200 text-emerald-700" : reached && !locked ? "bg-amber-50 border-amber-300 animate-pulse [animation-iteration-count:2]" : "bg-white border-slate-100 text-slate-400"}`}>
                      {locked && <Lock className="inline w-3 h-3 mr-0.5" />}{label(r)}{done ? " ✓" : reached && !locked ? " · claim" : ""}
                    </button>
                  );
                })}
              </li>
            ))}
          </ol>
        </>
      )}

      {/* Dubai Plus */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✨</span>
          <div className="flex-1">
            <p className="font-black">Dubai Plus</p>
            <p className="text-xs text-slate-600">{me.plus && me.plusUntil ? `Member until ${new Date(me.plusUntil).toLocaleDateString()}` : `AED ${me.prices.plus_monthly_aed} a month`}</p>
          </div>
        </div>
        <ul className="text-sm space-y-1 text-slate-700">
          <li>🎟️ The premium season track, every season</li>
          <li>🧊 2 streak freezes a week (instead of 1)</li>
          <li>🖼️ A new member frame every month, plus the Plus badge</li>
        </ul>
        <p className="text-[11px] text-slate-500">Cosmetic and convenience only: Plus never adds AED, points, visa progress or wages.</p>
        {me.plus
          ? <button onClick={async () => { const e = await claimPlusFrame(); setNote(e ?? "This month's frame is yours 🖼️"); void load(); }} className="w-full h-11 rounded-2xl bg-emerald-600 text-white font-black text-sm">Claim this month&apos;s frame</button>
          : <button onClick={() => setBuying("plus")} className="w-full h-11 rounded-2xl bg-emerald-600 text-white font-black text-sm">Join Dubai Plus</button>}
      </section>

      {/* Wardrobe of cosmetics */}
      {me.cosmetics.length > 0 && (
        <section>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Your titles, frames & badges</h3>
          {(["title", "frame", "badge"] as const).map((kind) => owned(kind).length > 0 && (
            <div key={kind} className="mb-2">
              <p className="text-[11px] font-black text-slate-400 mb-1 capitalize">{kind}s</p>
              <div className="flex flex-wrap gap-1.5">
                {owned(kind).map((c) => (
                  <button key={c.id} onClick={() => wear(kind, c.equipped ? null : c.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border ${c.equipped ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200"}`}
                    style={kind === "frame" ? { boxShadow: `inset 0 0 0 2px ${frameColour(c.id)}` } : undefined}>
                    {cosmeticName(c.id).name}{c.equipped ? " · wearing" : ""}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {buying && (
        <Checkout
          title={buying === "pass" ? "Season pass" : "Dubai Plus"}
          amount={buying === "pass" ? me.prices.season_pass_aed : me.prices.plus_monthly_aed}
          lines={buying === "pass"
            ? [{ label: "Premium track", value: season?.name ?? "This season" }, { label: "Rewards", value: "Frames, titles and the season badge" }]
            : [{ label: "Dubai Plus", value: "1 month" }, { label: "Includes", value: "Premium track, 2 streak freezes a week, monthly frame" }]}
          note={buying === "pass" ? "Cosmetic rewards only, for this season. Doesn't affect visas, wages or points." : "Renews only when you pay again. Cosmetic and convenience only."}
          onConfirm={async () => {
            const { error } = await supabase().rpc(buying === "pass" ? "create_season_pass_payment" : "create_plus_payment");
            return error ? (/already_premium/.test(error.message) ? "You already have the premium track." : "Couldn't start the purchase. Try again.") : null;
          }}
          onClose={() => { setBuying(null); void load(); }}
        />
      )}
    </div>
  );
}
