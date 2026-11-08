"use client";

// A party on where you are: its decorations (for the 3D room), music, a banner with who's here, a mute switch and an
// invite button, and checking you in when you arrive as a guest.

import { useEffect, useState } from "react";
import Link from "next/link";
import { arriveAt, endParty, isPartyEnded, markPartyEnded, partyHere, pingParty, PARTIES, kindOf, type PartyHere } from "@/lib/invites";
import { InviteSheet } from "./InviteSheet";
import { activeSpaceId, hostNewSpace, joinSpace, leaveSpace, lockSpace, spaceExists } from "@/lib/spaces";
import { supabase } from "@/lib/supabase/client";
import { gameAudio } from "@/utils/gameAudio";

// Ending a party: each party on screen registers how to drop it here, and listens on its own channel so the host
// ending it reaches everyone there at once (not at the next check).
const enders = new Map<string, () => void>();
const endChannels = new Map<string, ReturnType<ReturnType<typeof supabase>["channel"]>>();
/** Out of the party's Space when the party is over. */
const leavePartySpace = (code: string) => { lockSpace(null); if (activeSpaceId() === partySpaceId(code)) leaveSpace(); };

/** The host ends the party: it ends in the database, everyone there is told, and the host's Space closes. */
export async function endPartyNow(code: string, hostId?: string): Promise<boolean> {
  const cleanCode = code.trim().toUpperCase();
  markPartyEnded(cleanCode);
  const ok = await endParty(cleanCode, hostId);
  void endChannels.get(code)?.send({ type: "broadcast", event: "ended", payload: {} });
  void endChannels.get(cleanCode)?.send({ type: "broadcast", event: "ended", payload: {} });
  enders.get(code)?.();
  enders.get(cleanCode)?.();
  return ok;
}

export function usePartyHere(route: string | null, arrive: boolean): PartyHere | null {
  const [party, setParty] = useState<PartyHere | null>(null);
  const code = party?.code ?? null;
  const host = party?.host ?? "";
  const isHost = !!party?.isHost;
  useEffect(() => {
    if (!code) return;
    const end = () => {
      markPartyEnded(code);
      setParty(null);
      leavePartySpace(code);
      window.dispatchEvent(new CustomEvent("dubai:toast", { detail: isHost ? "🎉 Party ended. Thanks for hosting!" : `🎉 @${host} ended the party. Thanks for coming!` }));
    };
    enders.set(code, end);
    const ch = supabase().channel(`party-end:${code}`);
    ch.on("broadcast", { event: "ended" }, end).subscribe();
    endChannels.set(code, ch);
    return () => { enders.delete(code); endChannels.delete(code); void supabase().removeChannel(ch); };
  }, [code, host, isHost]);
  // While I'm here, the party isn't empty: a check-in now and every minute (an empty party ends after 5 minutes).
  useEffect(() => {
    if (!code || isPartyEnded(code)) return;
    void pingParty(code);
    const t = setInterval(() => { if (document.visibilityState === "visible" && !isPartyEnded(code)) void pingParty(code); }, 60_000);
    return () => clearInterval(t);
  }, [code]);
  useEffect(() => {
    if (!route) return;
    let live = true;
    let checkedIn = false;
    let had: string | null = null;
    const load = async () => {
      const p = await partyHere(route);
      // Couldn't check (offline): keep things as they are. A party only ends when the host ends it or its time is up;
      // the host leaving doesn't end it (a guest keeps its Space going until they're back).
      if (!live || p === undefined) return;
      // Check if this party was marked ended by host: never resurrect it
      if (p && isPartyEnded(p.code)) {
        if (had) leavePartySpace(had);
        had = null;
        setParty(null);
        return;
      }
      // It was on and now isn't (ended, or its time ran out): out of its Space too.
      if (had && !p) leavePartySpace(had);
      had = p?.code ?? null;
      setParty(p);
      if (p && arrive && !p.isHost && !checkedIn) {
        checkedIn = true;
        const r = await arriveAt(route);
        if (r?.needsTicket && live) {
          // Paid event, no ticket yet: say so once (the banner links to the invite, where they can buy one; coming
          // back after buying checks them in).
          window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `🎟️ @${r.host}'s ${r.title} is ticketed (AED ${r.price?.toLocaleString()}). Tap the banner to get your ticket.` }));
        } else if (r && live) {
          gameAudio.playCoinSound();
          window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `🎉 You're at @${r.host}'s ${r.title}!${r.points ? ` +${r.points} points` : ""}` }));
          const again = await partyHere(route);
          if (again !== undefined && live) {
            if (again && isPartyEnded(again.code)) {
              setParty(null);
            } else {
              setParty(again);
            }
          }
        }
      }
    };
    const first = setTimeout(() => void load(), 0);
    // Often enough that the host turning the lights out reaches everyone quickly.
    const every = setInterval(() => void load(), 15_000);
    return () => { live = false; clearTimeout(first); clearInterval(every); };
  }, [route, arrive]);
  // A seminar is a talk: no party music.
  const activeParty = party && !isPartyEnded(party.code) ? party : null;
  usePartyMusic(!!activeParty && activeParty.kind !== "seminar");
  usePartySpace(activeParty, route);
  return activeParty;
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
  const endsAt = party?.endsAt ? Date.parse(party.endsAt) : 0;
  useEffect(() => {
    if (!code) return;
    const id = partySpaceId(code);
    // The Space lasts as long as the party (not the usual hour).
    const open = () => hostNewSpace({ id, title: `🎉 ${title}`, activityKind: "talent", partyRoute: route ?? undefined, partyHost: host, endsAt: endsAt || undefined });
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
  }, [code, isHost, title, host, route, endsAt]);
}

// Party music: a live radio station (Lagos Afrobeats by default, or Kenya, France, the US, London or Arabic; see
// parties.json), or off. (The built-in groove was removed: user, 2026-11-04.)
// The choice is remembered; the game's own mute silences it too.
export type MusicMode = "radio" | "off";
const MODE = "dl_party_music";
const modeListeners = new Set<(m: MusicMode) => void>();
const currentMode = (): MusicMode => {
  try {
    if (gameAudio.getIsMuted()) return "off";
    const m = localStorage.getItem(MODE);
    return m === "off" ? "off" : "radio";
  } catch { return "radio"; }
};
export function setMusicMode(m: MusicMode) {
  try { localStorage.setItem(MODE, m); } catch { /* storage blocked */ }
  modeListeners.forEach((f) => f(m));
}
const stationListeners = new Set<(name: string | null) => void>();
const skipListeners = new Set<() => void>();
/** The next station (tap ⏭). */
export function nextStation() { skipListeners.forEach((f) => f()); }
let stationName: string | null = null;
const setStation = (n: string | null) => { stationName = n; stationListeners.forEach((f) => f(n)); };

interface Station { name: string; url_resolved: string }
/** Music-only stations (Afrobeats, non-stop: no talk shows), LagosJump Radio first. Fixed in parties.json and each
    checked to stream; if one is down the next plays. */
// The region: Lagos by default; the arrow on the radio picks Kenya, France, the US, London or Arabic. Remembered.
export type RadioRegion = (typeof PARTIES.radio.regions)[number];
export const RADIO_REGIONS: RadioRegion[] = PARTIES.radio.regions;
const REGION_KEY = "dl_radio_region";
const regionListeners = new Set<(id: string) => void>();
export const currentRegion = (): string => {
  try { const r = localStorage.getItem(REGION_KEY); if (r && RADIO_REGIONS.some((x) => x.id === r)) return r; } catch { /* storage blocked */ }
  return PARTIES.radio.default;
};
export function setRadioRegion(id: string) {
  try { localStorage.setItem(REGION_KEY, id); } catch { /* storage blocked */ }
  regionListeners.forEach((f) => f(id));
}
const musicStations = (): Station[] =>
  (RADIO_REGIONS.find((r) => r.id === currentRegion()) ?? RADIO_REGIONS[0]).stations.map((x) => ({ name: x.name, url_resolved: x.url }));

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

/** The same radio, for a venue with no party on: the venue's music. (At a party the party plays it instead, so
    there's only ever one.) */
export function useClubRadio(active: boolean) { usePartyMusic(active); }

function usePartyMusic(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let gone = false;
    let waitingForTap = false;
    let tries = 0;
    let list: Station[] = [];
    const el = radioPlayer();
    gameAudio.holdMusic(true);

    const stopRadio = () => { el.pause(); waitingForTap = false; };
    const stop = () => { stopRadio(); setStation(null); };
    // Try the current station; on a refusal that needs a tap, wait for one; on a dead stream, the next station.
    const tryStation = async () => {
      if (gone || currentMode() !== "radio") return;
      const st = list[tries];
      if (!st) { setStation("No station right now"); return; }
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
      list = musicStations();
      tries = 0;
      void tryStation();
    };
    const play = (m: MusicMode) => {
      stop();
      if (m === "radio") void playRadio();
    };
    play(currentMode());

    // A tap anywhere: start whatever is waiting, right inside the tap.
    const wake = () => {
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
    // A new region: its first station, now.
    const onRegion = () => { if (currentMode() === "radio") play("radio"); };
    regionListeners.add(onRegion);
    const skip = () => {
      if (currentMode() !== "radio" || !list.length) return;
      tries = (tries + 1) % list.length;
      setStation("Tuning…");
      void tryStation();
    };
    skipListeners.add(skip);
    return () => {
      gone = true;
      window.removeEventListener("pointerdown", wake, opts);
      window.removeEventListener("touchend", wake, opts);
      window.removeEventListener("click", wake, opts);
      modeListeners.delete(play);
      skipListeners.delete(skip);
      regionListeners.delete(onRegion);
      stop();
      gameAudio.holdMusic(false);
    };
  }, [active]);
}

/** The arrow on the radio: pick where the music comes from. */
function RegionPicker({ dark = true, down = false }: { dark?: boolean; down?: boolean }) {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState(currentRegion);
  useEffect(() => { const f = (id: string) => setRegion(id); regionListeners.add(f); return () => { regionListeners.delete(f); }; }, []);
  const now = RADIO_REGIONS.find((r) => r.id === region) ?? RADIO_REGIONS[0];
  return (
    <span className="relative shrink-0">
      <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-label={`Radio from ${now.label}. Choose another`} aria-expanded={open}
        className={`h-7 pl-1.5 pr-1 rounded-full text-[11px] font-black flex items-center gap-0.5 ${dark ? "bg-white/15" : "bg-white/25"}`}>
        {now.flag}<span className="text-[9px]">▾</span>
      </button>
      {open && (
        <span className={`absolute ${down ? "top-9" : "bottom-9"} left-0 z-50 w-40 rounded-2xl bg-white text-slate-900 shadow-2xl p-1 flex flex-col`}>
          {RADIO_REGIONS.map((r) => (
            <button key={r.id} onClick={(e) => { e.stopPropagation(); setRadioRegion(r.id); setMusicMode("radio"); setOpen(false); }}
              className={`h-9 px-2.5 rounded-xl text-left text-xs font-black flex items-center gap-2 ${r.id === region ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>
              <span className="text-base">{r.flag}</span>{r.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/** Below the Space bar, so a live Space never covers it. */
export const BELOW_SPACE_TOP = "top-[calc(max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))+3.5rem)]";

/** The club's radio, bottom left where the DJ booth player sits: the station playing, and a tap to switch the radio on or off, and ⏭ for the next station. */
export function ClubRadioPill({ className = "bottom-20" }: { className?: string }) {
  const [mode, setMode] = useState<MusicMode>(currentMode);
  const [station, setStationName] = useState<string | null>(stationName);
  useEffect(() => { stationListeners.add(setStationName); return () => { stationListeners.delete(setStationName); }; }, []);
  const next: MusicMode = mode === "radio" ? "off" : "radio";
  return (
    <div className={`fixed left-3 z-40 flex items-center gap-1 rounded-full bg-slate-950/90 text-white border border-white/10 shadow-xl p-1 max-w-[70vw] ${className}`}>
      <button onClick={() => { setMusicMode(next); setMode(next); }} aria-label={`Music: ${mode === "radio" ? "radio" : "off"}. Tap for ${next}.`}
        className="h-7 pl-2 pr-2 rounded-full text-[11px] font-black truncate min-w-0">
        {mode === "radio" ? `📻 ${station ?? "Tuning…"}` : "🔇 Music off"}
      </button>
      <RegionPicker />
      {mode === "radio" && <button onClick={nextStation} aria-label="Next station" className="shrink-0 w-7 h-7 rounded-full bg-white/15 text-[12px] font-black">⏭</button>}
    </div>
  );
}

export function PartyBanner({ party, hostAway, className = "" }: { party: PartyHere; hostAway?: boolean; className?: string }) {
  const [inviting, setInviting] = useState(false);
  const [ending, setEnding] = useState<"ask" | "busy" | null>(null);
  const [mode, setMode] = useState<MusicMode>(currentMode);
  const [station, setStationName] = useState<string | null>(stationName);
  useEffect(() => { stationListeners.add(setStationName); return () => { stationListeners.delete(setStationName); }; }, []);
  const next: MusicMode = mode === "radio" ? "off" : "radio";
  const k = kindOf(party.kind);
  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-fuchsia-600 text-white shadow-xl pl-3 pr-1 py-1 max-w-[94vw] ${className}`}>
      <Link href={`/i/${party.code}`} className="min-w-0 flex-1 text-xs font-black truncate">
        {k.icon} {party.isHost ? "Your" : `@${party.host}'s`} {party.title} · {party.arrived} here{hostAway ? ` · @${party.host} is out` : ""}
      </Link>
      <button onClick={() => { setMusicMode(next); setMode(next); }} title={mode === "radio" ? station ?? "Tuning…" : "Music off"}
        aria-label={`Music: ${mode === "radio" ? "radio" : "off"}. Tap for ${next}.`}
        className="shrink-0 h-7 px-2 rounded-full bg-white/20 text-[11px] font-black max-w-[9rem] truncate">
        {mode === "radio" ? `📻 ${station ?? "Radio"}` : "🔇"}
      </button>
      <RegionPicker dark={false} down />
      {mode === "radio" && <button onClick={nextStation} aria-label="Next station" className="shrink-0 w-7 h-7 rounded-full bg-white/20 text-[11px] font-black">⏭</button>}
      <button onClick={() => setInviting(true)} className="shrink-0 h-7 px-3 rounded-full bg-white text-fuchsia-700 text-[11px] font-black">Invite</button>
      {party.isHost && (ending === "ask" ? (
        <span className="shrink-0 flex items-center gap-1 pl-1">
          <span className="text-[11px] font-black">End it?</span>
          <button onClick={async () => { setEnding("busy"); if (!(await endPartyNow(party.code))) { setEnding(null); window.dispatchEvent(new CustomEvent("dubai:toast", { detail: "Couldn't end the party. Try again." })); } }}
            className="h-7 px-3 rounded-full bg-rose-500 text-white text-[11px] font-black">Yes, end</button>
          <button onClick={() => setEnding(null)} className="h-7 px-2 rounded-full bg-white/20 text-[11px] font-black">No</button>
        </span>
      ) : (
        <button onClick={() => setEnding("ask")} disabled={ending === "busy"} aria-label="End the party"
          className="shrink-0 h-7 px-3 rounded-full bg-slate-950/40 text-white text-[11px] font-black disabled:opacity-50">{ending === "busy" ? "Ending…" : "End"}</button>
      ))}
      {inviting && <InviteSheet code={party.code} title={party.title} onClose={() => setInviting(false)} />}
    </div>
  );
}
