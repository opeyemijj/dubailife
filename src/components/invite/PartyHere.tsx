"use client";

// A party on where you are: its decorations (for the 3D room), music, a banner with who's here, a mute switch and an
// invite button, and checking you in when you arrive as a guest.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { arriveAt, partyHere, shareInvite, kindOf, type PartyHere } from "@/lib/invites";
import { RaceMusic } from "@/components/marathon/raceMusic";
import { gameAudio } from "@/utils/gameAudio";

export function usePartyHere(route: string | null, arrive: boolean): PartyHere | null {
  const [party, setParty] = useState<PartyHere | null>(null);
  useEffect(() => {
    if (!route) return;
    let live = true;
    let checkedIn = false;
    const load = async () => {
      const p = await partyHere(route);
      if (!live) return;
      setParty(p);
      if (p && arrive && !p.isHost && !checkedIn) {
        checkedIn = true;
        const r = await arriveAt(route);
        if (r && live) {
          gameAudio.playCoinSound();
          window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `🎉 You're at @${r.host}'s ${r.title}!${r.points ? ` +${r.points} points` : ""}` }));
          setParty(await partyHere(route));
        }
      }
    };
    const first = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 60_000);
    return () => { live = false; clearTimeout(first); clearInterval(every); };
  }, [route, arrive]);
  usePartyMusic(!!party);
  return party;
}

const MUTE = "dl_party_music";
const musicListeners = new Set<(on: boolean) => void>();
/** Party music on or off (remembered); the banner's switch. */
export function setPartyMusic(on: boolean) {
  try { localStorage.setItem(MUTE, on ? "on" : "off"); } catch { /* storage blocked */ }
  musicListeners.forEach((f) => f(on));
}
const partyMusicOn = () => { try { return localStorage.getItem(MUTE) !== "off" && !gameAudio.getIsMuted(); } catch { return true; } };

/** While a party's on here: the Afrobeats groove from the marathon, with the city music held back. */
function usePartyMusic(active: boolean) {
  const music = useRef<RaceMusic | null>(null);
  useEffect(() => {
    if (!active) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const m = new RaceMusic(ctx);
    music.current = m;
    m.setMood("race");
    m.setMuted(!partyMusicOn());
    m.start();
    gameAudio.holdMusic(true);
    // Browsers hold sound back until a touch.
    const wake = () => { if (ctx.state === "suspended") void ctx.resume(); };
    wake();
    window.addEventListener("pointerdown", wake);
    const onToggle = (on: boolean) => m.setMuted(!on);
    musicListeners.add(onToggle);
    return () => {
      window.removeEventListener("pointerdown", wake);
      musicListeners.delete(onToggle);
      m.stop();
      music.current = null;
      void ctx.close();
      gameAudio.holdMusic(false);
    };
  }, [active]);
}

export function PartyBanner({ party, hostAway, className = "" }: { party: PartyHere; hostAway?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [musicOn, setMusicOn] = useState(partyMusicOn);
  const k = kindOf(party.kind);
  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-fuchsia-600 text-white shadow-xl pl-3 pr-1 py-1 max-w-[94vw] ${className}`}>
      <Link href={`/i/${party.code}`} className="min-w-0 flex-1 text-xs font-black truncate">
        {k.icon} {party.isHost ? "Your" : `@${party.host}'s`} {party.title} · {party.arrived} here{hostAway ? ` · @${party.host} is out` : ""}
      </Link>
      <button onClick={() => { setPartyMusic(!musicOn); setMusicOn(!musicOn); }} aria-label={musicOn ? "Mute party music" : "Play party music"} className="shrink-0 w-7 h-7 rounded-full bg-white/20 text-xs">
        {musicOn ? "🔊" : "🔇"}
      </button>
      <button
        onClick={async () => { const r = await shareInvite(party.code, `Come to ${party.title} on Dubai Life!`); setCopied(r === "copied"); }}
        className="shrink-0 h-7 px-3 rounded-full bg-white text-fuchsia-700 text-[11px] font-black"
      >
        {copied ? "Copied!" : "Invite"}
      </button>
    </div>
  );
}
