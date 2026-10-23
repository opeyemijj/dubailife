"use client";

// The weekly league and friend quests (design spec 19.4, US-7.3). Points come only from actions the server
// records: lessons and exams, scams reported or avoided, multiplayer wins, days at Peak Performer.

import { cosmeticName } from "@/lib/seasons";
import { ShareButton } from "@/components/share/ShareButton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import { gameAudio } from "@/utils/gameAudio";

const TIERS = ["", "Bronze", "Silver", "Gold", "Platinum", "Diamond"];
const TIER_ICON = ["", "🥉", "🥈", "🥇", "💠", "💎"];
interface League { week: number; endsAt: string; joined: boolean; tier: number; lastResult: "up" | "down" | "stay" | null; standings: Array<{ username: string; points: number; me: boolean; title?: string | null; plus?: boolean }> }
interface Quests { target: number; reward: number; claimsLeft: number; me: number; friends: Array<{ id: string; username: string; points: number; claimed: boolean }> }

const HOW = [
  ["🎓", "Pass a lesson", "+20"], ["🏅", "Graduate a course", "+200"], ["🚗", "Pass the driving theory", "+50"],
  ["🛡️", "Report a scam", "+50"], ["👍", "Ignore a scam", "+20"], ["🎮", "Win a multiplayer game", "+30"], ["✨", "A day at Peak Performer", "+100"],
];

const endsIn = (iso: string, now: number) => {
  const ms = Date.parse(iso) - now;
  const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
};

export function LeagueTab({ onClose }: { onClose: () => void }) {
  const [league, setLeague] = useState<League | null>(null);
  const [quests, setQuests] = useState<Quests | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    void supabase().rpc("my_league").then(({ data }) => data && setLeague(data as League));
    void supabase().rpc("friend_quests").then(({ data }) => data && setQuests(data as Quests));
  }, []);

  const claim = async (id: string, username: string) => {
    const { data, error } = await supabase().rpc("claim_friend_quest", { p_friend: id });
    if (error) return setNote(/max_claims/.test(error.message) ? "You've claimed the most quests this week." : "Not done yet: you both need the target.");
    gameAudio.playCoinSound(); refreshCitizen();
    setNote(`+AED ${Number(data).toLocaleString()} for your quest with @${username} 🎉`);
    setQuests((q) => q && { ...q, claimsLeft: q.claimsLeft - 1, friends: q.friends.map((f) => (f.id === id ? { ...f, claimed: true } : f)) });
  };

  if (!league) return <p className="text-sm text-slate-500 py-8 text-center">Loading your league…</p>;
  const n = league.standings.length;

  return (
    <div className="space-y-4 pt-1">
      <section className="rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 p-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{TIER_ICON[league.tier]}</span>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-wider text-amber-800/70">This week</p>
            <p className="font-black text-xl">{TIERS[league.tier]} league</p>
          </div>
          <div className="text-right"><p className="text-xs font-bold text-amber-800/70">Ends in</p><p className="font-black">{endsIn(league.endsAt, now)}</p></div>
        </div>
        {league.lastResult && <p className="mt-2 text-sm font-bold text-amber-900">Last week: {league.lastResult === "up" ? "promoted ⬆️" : league.lastResult === "down" ? "moved down ⬇️" : "held your place"}</p>}
        {league.lastResult === "up" && <ShareButton moment="league-up" l={String(league.tier)} text={`Promoted to the ${TIERS[league.tier]} league in Dubai Life 🏆`} className="mt-2 h-9 px-4 rounded-full bg-amber-500 text-white text-xs" />}
        <p className="mt-1 text-[11px] text-amber-900/70">Top 7 move up, bottom 5 move down. Points come from what you do, never from buying.</p>
      </section>

      <Link href="/tournament" onClick={onClose} className="flex items-center gap-3 rounded-2xl bg-slate-900 text-white p-3.5">
        <span className="text-2xl">🏆</span>
        <span className="flex-1"><span className="block font-black text-sm">Monthly tournament</span><span className="block text-[11px] text-white/70">Same points, all month. Cash prize from January 2027.</span></span>
        <span className="text-xs font-black text-amber-300">Open ›</span>
      </Link>

      {!league.joined ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Score your first points this week to join a league of up to 30 players.</p>
      ) : (
        <ol className="space-y-1">
          {league.standings.map((s, i) => {
            const zone = league.tier < 5 && i < 7 && s.points > 0 ? "up" : league.tier > 1 && n >= 10 && i >= n - 5 ? "down" : null;
            return (
              <li key={s.username} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${s.me ? "bg-slate-900 text-white" : zone === "up" ? "bg-emerald-50" : zone === "down" ? "bg-rose-50" : "bg-slate-50"}`}>
                <span className="w-6 text-center font-black text-sm">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm truncate">@{s.username}{s.plus ? " ✨" : ""}{s.me ? " (you)" : ""}</span>
                  {s.title && <span className={`block text-[10px] font-bold truncate ${s.me ? "text-amber-300" : "text-amber-700"}`}>{cosmeticName(s.title).name}</span>}
                </span>
                <span className="font-black text-sm">{s.points}</span>
              </li>
            );
          })}
        </ol>
      )}

      <section>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Friend quests</h3>
        {quests && (
          <>
            <p className="text-sm text-slate-600 mb-2">Both score {quests.target}+ points this week and you each get AED {quests.reward.toLocaleString()}. You have {quests.me} points · {quests.claimsLeft} claims left.</p>
            {quests.friends.length === 0
              ? <Link href="/phone" onClick={onClose} className="block rounded-2xl bg-slate-50 p-3 text-sm font-bold">🤝 Add friends to start quests together ›</Link>
              : (
                <div className="space-y-1.5">
                  {quests.friends.map((f) => {
                    const ready = !f.claimed && quests.me >= quests.target && f.points >= quests.target && quests.claimsLeft > 0;
                    return (
                      <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold truncate">@{f.username}</span>
                          <span className="block text-[11px] text-slate-500">You {Math.min(quests.me, quests.target)}/{quests.target} · them {Math.min(f.points, quests.target)}/{quests.target}</span>
                        </span>
                        {f.claimed ? <span className="text-xs font-black text-emerald-600">Claimed ✓</span>
                          : <button disabled={!ready} onClick={() => claim(f.id, f.username)} className="text-xs font-black px-3 py-1.5 rounded-full bg-emerald-600 text-white disabled:opacity-30">Claim</button>}
                      </div>
                    );
                  })}
                </div>
              )}
          </>
        )}
        {note && <p className="text-sm font-bold text-center text-emerald-700 mt-2">{note}</p>}
      </section>

      <section>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">How to score</h3>
        <div className="grid grid-cols-1 gap-1">
          {HOW.map(([icon, what, pts]) => (
            <div key={what} className="flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm"><span>{icon}</span><span className="flex-1">{what}</span><span className="font-black text-emerald-700">{pts}</span></div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Daily limits per type keep it fair for everyone.</p>
      </section>
    </div>
  );
}
