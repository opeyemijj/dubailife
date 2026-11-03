"use client";

// A party on where you are: its decorations (for the 3D room), music, a banner with who's here, a mute switch and an
// invite button, and checking you in when you arrive as a guest.

import { useEffect, useState } from "react";
import Link from "next/link";
import { arriveAt, partyHere, PARTIES, kindOf, type PartyHere } from "@/lib/invites";
import { InviteSheet } from "./InviteSheet";
import { RaceMusic } from "@/components/marathon/raceMusic";
import { activeSpaceId, hostNewSpace, joinSpace, lockSpace, spaceExists } from "@/lib/spaces";
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
  usePartySpace(party, route);
  return party;
}

/** Every party has its own voice Space, and everyone at the party is in it: the host hosts it, guests listen (and raise
    a hand to speak). Checked every few seconds while you're there, so anyone arriving or coming back is put in, and if
    the host comes back and opens it again, everyone rejoins. */
export const partySpaceId = (code: string) => `space-party-${code}`;
function usePartySpace(party: PartyHere | null, route: string | null) {
  const code = party?.code ?? null;
  const isHost = !!party?.isHost;
  const title = party?.title ?? "";
  const host = party?.host ?? "";
  useEffect(() => {
    if (!code) return;
    const id = partySpaceId(code);
    const open = () => hostNewSpace({ id, title: `🎉 ${title}`, activityKind: "talent", partyRoute: route ?? undefined, partyHost: host });
    let waitingSince = 0;
    const keepIn = () => {
      if (activeSpaceId() === id) { waitingSince = 0; return; }
      if (isHost) { open(); return; }
      // Join it; joins the moment it's announced if it isn't yet.
      joinSpace(id);
      // Nobody's hosting (the host is away): a guest opens it so the party still has its Space. The host takes it
      // back when they return.
      waitingSince ||= Date.now();
      if (Date.now() - waitingSince > 12_000 && !spaceExists(id)) { waitingSince = 0; open(); }
    };
    keepIn();
    lockSpace(id);
    const t = setInterval(keepIn, 3000);
    const back = () => { if (document.visibilityState === "visible") keepIn(); };
    document.addEventListener("visibilitychange", back);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", back); lockSpace(null); };
  }, [code, isHost, title, host, route]);
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

// One audio player for the radio, kept for the whole visit. Phones only let audio start from a tap, so if the
// station can't start by itself it waits, with its station already loaded, and the next tap anywhere plays it
// (straight from the tap, which is what phones need).
let radioEl: HTMLAudioElement | null = null;
const radioPlayer = () => {
  if (!radioEl) {
    radioEl = new Audio();
    radioEl.setAttribute("playsinline", "true");
    radioEl.preload = "none";
    radioEl.volume = 0.7;
  }
  return radioEl;
};

const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
let primed = false;
/** Phones only let sound start from a tap. On your first tap anywhere in the game the party radio is unlocked
    (playing a moment of silence), so later it can start on its own when you reach a party. */
export function primePartyAudio() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  const unlock = () => {
    const el = radioPlayer();
    if (!el.src || el.paused) {
      el.src = SILENCE;
      el.play().then(() => { if (el.src === SILENCE) el.pause(); }).catch(() => {});
    }
    ["pointerdown", "touchend", "click"].forEach((t) => window.removeEventListener(t, unlock, true));
  };
  ["pointerdown", "touchend", "click"].forEach((t) => window.addEventListener(t, unlock, true));
}

function usePartyMusic(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    let ctx: AudioContext | null = null;
    let groove: RaceMusic | null = null;
    let gone = false;
    let waitingForTap = false;
    let tries = 0;
    let list: Station[] = [];
    const el = radioPlayer();
    gameAudio.holdMusic(true);

    const stopRadio = () => { el.pause(); waitingForTap = false; };
    const stop = () => { groove?.stop(); groove = null; stopRadio(); setStation(null); };
    const playGroove = () => {
      if (!AC) return;
      ctx ??= new AC();
      if (ctx.state === "suspended") void ctx.resume();
      groove = new RaceMusic(ctx);
      groove.setMood("race");
      groove.start();
    };
    // Try the current station; on a refusal that needs a tap, wait for one; on a dead stream, the next station.
    const tryStation = async () => {
      if (gone || currentMode() !== "radio") return;
      const st = list[tries];
      if (!st) { playGroove(); return; }
      if (el.src !== st.url_resolved) el.src = st.url_resolved;
      try {
        await el.play();
        waitingForTap = false;
        if (gone || currentMode() !== "radio") { el.pause(); return; }
        setStation(st.name.trim());
      } catch (e) {
        if ((e as DOMException)?.name === "NotAllowedError") { waitingForTap = true; setStation("Tap to play"); return; }
        tries++;
        void tryStation();
      }
    };
    const playRadio = async () => {
      list = (await afrobeatsStations()).slice(0, 6);
      tries = 0;
      void tryStation();
    };
    const play = (m: MusicMode) => {
      stop();
      if (m === "radio") void playRadio();
      else if (m === "groove") playGroove();
    };
    play(currentMode());

    // A tap anywhere: start whatever is waiting, right inside the tap.
    const wake = () => {
      if (ctx?.state === "suspended") void ctx.resume();
      if (currentMode() === "radio" && (waitingForTap || (el.paused && el.src))) {
        el.play().then(() => {
          waitingForTap = false;
          const st = list[tries];
          if (st && !gone) setStation(st.name.trim());
        }).catch(() => { tries++; void tryStation(); });
      }
    };
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointerdown", wake, opts);
    window.addEventListener("touchend", wake, opts);
    window.addEventListener("click", wake, opts);
    modeListeners.add(play);
    return () => {
      gone = true;
      window.removeEventListener("pointerdown", wake, opts);
      window.removeEventListener("touchend", wake, opts);
      window.removeEventListener("click", wake, opts);
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
