"use client";

// A party on where you are: its decorations (for the 3D room), music, a banner with who's here, a mute switch and an
// invite button, and checking you in when you arrive as a guest.

import { useEffect, useState } from "react";
import Link from "next/link";
import { arriveAt, partyHere, PARTIES, kindOf, type PartyHere } from "@/lib/invites";
import { InviteSheet } from "./InviteSheet";
import { RaceMusic } from "@/components/marathon/raceMusic";
import { activeSpaceId, hostNewSpace, joinSpace } from "@/lib/spaces";
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
    // Often enough that the host turning the lights out reaches everyone quickly.
    const every = setInterval(() => void load(), 15_000);
    return () => { live = false; clearTimeout(first); clearInterval(every); };
  }, [route, arrive]);
  usePartyMusic(!!party);
  usePartySpace(party);
  return party;
}

/** Every party has its own voice Space: the host hosts it when they're there, and guests join it when they arrive
    (as listeners; they raise a hand to speak). Once per party each visit, so leaving the Space is respected. */
export const partySpaceId = (code: string) => `space-party-${code}`;
function usePartySpace(party: PartyHere | null) {
  const code = party?.code ?? null;
  const isHost = !!party?.isHost;
  const title = party?.title ?? "";
  useEffect(() => {
    if (!code) return;
    const id = partySpaceId(code);
    const key = `party-space:${code}`;
    try { if (sessionStorage.getItem(key) === "1") return; sessionStorage.setItem(key, "1"); } catch { /* storage blocked */ }
    if (activeSpaceId() === id) return;
    if (isHost) hostNewSpace({ id, title: `🎉 ${title}`, activityKind: "talent" });
    else joinSpace(id);
  }, [code, isHost, title]);
}

// Party music: a live Afrobeats radio station (from the Radio Browser directory), the built-in groove, or off.
// The choice is remembered; the game's own mute silences it too.
export type MusicMode = "radio" | "groove" | "off";
const MODE = "dl_party_music";
const modeListeners = new Set<(m: MusicMode) => void>();
const currentMode = (): MusicMode => {
  try {
    if (gameAudio.getIsMuted()) return "off";
    const m = localStorage.getItem(MODE);
    return m === "groove" || m === "off" ? m : "radio";
  } catch { return "radio"; }
};
export function setMusicMode(m: MusicMode) {
  try { localStorage.setItem(MODE, m); } catch { /* storage blocked */ }
  modeListeners.forEach((f) => f(m));
}
const stationListeners = new Set<(name: string | null) => void>();
let stationName: string | null = null;
const setStation = (n: string | null) => { stationName = n; stationListeners.forEach((f) => f(n)); };

interface Station { name: string; url_resolved: string; codec: string }
let stations: Promise<Station[]> | null = null;
/** Afrobeats stations that play in a browser (secure streams, common formats), most listened first. */
const afrobeatsStations = () => (stations ??= (async () => {
  // The directory has mirrors: the first that answers.
  for (const base of PARTIES.radio.directories) {
    try {
      const r = await fetch(`${base}/json/stations/bytag/${PARTIES.radio.tag}?hidebroken=true&order=clickcount&reverse=true&limit=40`);
      if (!r.ok) continue;
      const list = (await r.json()) as Station[];
      // Afrobeats stations by name first (the tag also covers general stations that play some).
      const afro = (x: Station) => (/afro|naija|lagos/i.test(x.name) ? 0 : 1);
      return list.filter((x) => x.url_resolved?.startsWith("https://") && /mp3|aac/i.test(x.codec)).sort((a, b) => afro(a) - afro(b));
    } catch { /* next mirror */ }
  }
  return [] as Station[];
})());

function usePartyMusic(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    let ctx: AudioContext | null = null;
    let groove: RaceMusic | null = null;
    let radio: HTMLAudioElement | null = null;
    let gone = false;
    gameAudio.holdMusic(true);

    const stop = () => {
      groove?.stop(); groove = null;
      if (radio) { radio.pause(); radio.removeAttribute("src"); radio.load(); radio = null; }
      setStation(null);
    };
    const playGroove = () => {
      if (!AC) return;
      ctx ??= new AC();
      groove = new RaceMusic(ctx);
      groove.setMood("race");
      groove.start();
    };
    const playRadio = async () => {
      const list = await afrobeatsStations();
      // Try a few stations in turn; the groove if none will play.
      for (const st of list.slice(0, 5)) {
        if (gone || currentMode() !== "radio") return;
        const el = new Audio(st.url_resolved);
        el.volume = 0.7;
        try {
          await el.play();
          if (gone || currentMode() !== "radio") { el.pause(); return; }
          radio = el;
          setStation(st.name.trim());
          return;
        } catch { el.pause(); }
      }
      if (!gone && currentMode() === "radio") playGroove();
    };
    const play = (m: MusicMode) => {
      stop();
      if (m === "radio") void playRadio();
      else if (m === "groove") playGroove();
    };
    play(currentMode());
    // Browsers hold sound back until a touch: try again then.
    const wake = () => {
      if (ctx?.state === "suspended") void ctx.resume();
      if (currentMode() === "radio" && !radio) play("radio");
    };
    window.addEventListener("pointerdown", wake);
    modeListeners.add(play);
    return () => {
      gone = true;
      window.removeEventListener("pointerdown", wake);
      modeListeners.delete(play);
      stop();
      void ctx?.close();
      gameAudio.holdMusic(false);
    };
  }, [active]);
}

export function PartyBanner({ party, hostAway, className = "" }: { party: PartyHere; hostAway?: boolean; className?: string }) {
  const [inviting, setInviting] = useState(false);
  const [mode, setMode] = useState<MusicMode>(currentMode);
  const [station, setStationName] = useState<string | null>(stationName);
  useEffect(() => { stationListeners.add(setStationName); return () => { stationListeners.delete(setStationName); }; }, []);
  const next: MusicMode = mode === "radio" ? "groove" : mode === "groove" ? "off" : "radio";
  const k = kindOf(party.kind);
  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-fuchsia-600 text-white shadow-xl pl-3 pr-1 py-1 max-w-[94vw] ${className}`}>
      <Link href={`/i/${party.code}`} className="min-w-0 flex-1 text-xs font-black truncate">
        {k.icon} {party.isHost ? "Your" : `@${party.host}'s`} {party.title} · {party.arrived} here{hostAway ? ` · @${party.host} is out` : ""}
      </Link>
      <button onClick={() => { setMusicMode(next); setMode(next); }} title={mode === "radio" ? station ?? "Finding an Afrobeats station…" : mode === "groove" ? "Party groove" : "Music off"}
        aria-label={`Music: ${mode === "radio" ? "Afrobeats radio" : mode === "groove" ? "party groove" : "off"}. Tap for ${next}.`}
        className="shrink-0 h-7 px-2 rounded-full bg-white/20 text-[11px] font-black max-w-[9rem] truncate">
        {mode === "radio" ? `📻 ${station ?? "Radio"}` : mode === "groove" ? "🥁 Groove" : "🔇"}
      </button>
      <button onClick={() => setInviting(true)} className="shrink-0 h-7 px-3 rounded-full bg-white text-fuchsia-700 text-[11px] font-black">Invite</button>
      {inviting && <InviteSheet code={party.code} title={party.title} onClose={() => setInviting(false)} />}
    </div>
  );
}
