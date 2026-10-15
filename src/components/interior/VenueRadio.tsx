"use client";

// Music inside venues, streamed from Mixcloud (licensed DJ shows played in Mixcloud's own player):
// clubs get this week's club and house shows, pools get sunny house, restaurants get lounge sets.
// The player is a small bar that can be folded away while the music keeps playing. It tries to
// start on its own; where the browser blocks that (iPhones), the first tap in the venue starts it.
// Clubs also offer a YouTube video mode on larger screens (YouTube needs its player visible).

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Music2, Pause, Play, SkipForward, Tv, VolumeX } from "lucide-react";
import type { Venue } from "@/lib/city/types";

type Mood = "club" | "pool" | "lounge";

/** Mixcloud channels whose newest shows make each playlist. */
const CHANNELS: Record<Mood, string[]> = {
  club: ["ClubKillers", "Defectedrecords", "hedkandi", "Anjunadeep"],
  pool: ["hedkandi", "cafedelmarmusic", "Defectedrecords"],
  lounge: ["Jazzmo", "cafedelmarmusic", "maxvibes"],
};
const TITLE: Record<Mood, string> = { club: "DJ Booth", pool: "Poolside DJ", lounge: "Lounge radio" };
const STORAGE_KEY = "venue_radio_on";

/** Club playlist on YouTube for the optional video mode (checked embeddable). */
const VIDEO_PLAYLIST = "PLO7-VO1D0_6MRJ9Js0_HzHymB8jL2JSyd";

export interface Mix { key: string; name: string; user: string; minutes: number; uploaded: string; url: string }

export function moodFor(venue: Venue): Mood | null {
  if (venue.layout === "club") return "club";
  if (venue.feature === "pool") return "pool";
  if (venue.layout === "dining" || venue.layout === "bar" || venue.layout === "spa") return "lounge";
  return null;
}

/** Hip-hop and Afro nights start on the club-bangers show. */
function preferredChannel(venue: Venue) {
  return /hip-hop|r&b|rap|afro|reggae|dancehall/i.test(`${venue.category} ${venue.blurb}`) ? "clubkillers" : null;
}

const playlists = new Map<Mood, Promise<Mix[]>>();
function loadPlaylist(mood: Mood): Promise<Mix[]> {
  let p = playlists.get(mood);
  if (!p) {
    p = Promise.all(
      CHANNELS[mood].map((u) =>
        fetch(`https://api.mixcloud.com/${u}/cloudcasts/?limit=3`)
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((j: { data?: Array<{ key: string; name: string; url: string; audio_length: number; created_time: string; user: { username: string } }> }) =>
            (j.data ?? []).map((c) => ({ key: c.key, name: c.name, url: c.url, user: c.user.username, minutes: Math.round(c.audio_length / 60), uploaded: c.created_time })),
          )
          .catch(() => [] as Mix[]),
      ),
    ).then((lists) => {
      const latest = lists.map((l) => l[0]).filter(Boolean);
      const rest = lists.flatMap((l) => l.slice(1));
      const byDate = (a: Mix, b: Mix) => b.uploaded.localeCompare(a.uploaded);
      return [...latest.sort(byDate), ...rest.sort(byDate)];
    });
    p.then((m) => { if (!m.length) playlists.delete(mood); });
    playlists.set(mood, p);
  }
  return p;
}

// ---------------------------------------------------------------- Mixcloud widget API

interface MixcloudWidget {
  ready: Promise<void>;
  play: () => void;
  pause: () => void;
  events: { play: { on: (f: () => void) => void }; pause: { on: (f: () => void) => void } };
}
declare global { interface Window { Mixcloud?: { PlayerWidget: (iframe: HTMLIFrameElement) => MixcloudWidget } } }

let apiLoading: Promise<void> | null = null;
function loadWidgetApi(): Promise<void> {
  if (typeof window === "undefined" || window.Mixcloud) return Promise.resolve();
  apiLoading ??= new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://widget.mixcloud.com/media/js/widgetApi.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
  return apiLoading;
}

function readOn() {
  try { return localStorage.getItem(STORAGE_KEY) !== "false"; } catch { return true; }
}

export function VenueRadio({ venue }: { venue: Venue; compact?: boolean }) {
  const mood = moodFor(venue);
  if (!mood) return null;
  return <MixPlayer key={mood} venue={venue} mood={mood} />;
}

function MixPlayer({ venue, mood }: { venue: Venue; mood: Mood }) {
  const [mixes, setMixes] = useState<Mix[] | null>(null);
  const [index, setIndex] = useState(0);
  const [on, setOn] = useState(readOn);
  // Folded away (music keeps going). Phones start folded so the player never gets in the way.
  const [folded, setFolded] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  const [showList, setShowList] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [video, setVideo] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const widget = useRef<MixcloudWidget | null>(null);

  useEffect(() => {
    let alive = true;
    loadPlaylist(mood).then((m) => {
      if (!alive) return;
      const first = preferredChannel(venue);
      const i = first ? Math.max(0, m.findIndex((x) => x.user.toLowerCase() === first)) : 0;
      setMixes(m);
      setIndex(i);
    });
    return () => { alive = false; };
  }, [mood, venue]);

  const mix = mixes?.[index % Math.max(1, mixes.length)];

  // Hook the player's play/pause so we know whether the browser let it start.
  const onFrameLoad = useCallback(async () => {
    await loadWidgetApi();
    if (!frame.current || !window.Mixcloud) return;
    const w = window.Mixcloud.PlayerWidget(frame.current);
    widget.current = w;
    await w.ready;
    w.events.play.on(() => setPlaying(true));
    w.events.pause.on(() => setPlaying(false));
    w.play();
  }, []);

  // If autoplay was blocked, the first tap anywhere in the venue starts the music.
  useEffect(() => {
    if (!on || playing || video) return;
    const start = () => widget.current?.play();
    window.addEventListener("pointerdown", start);
    return () => window.removeEventListener("pointerdown", start);
  }, [on, playing, video]);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setPlaying(false);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* storage blocked */ }
  };

  const src = mix ? `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&light=0&hide_artwork=1&autoplay=1&feed=${encodeURIComponent(mix.key)}` : null;
  const dock = "absolute z-30 pointer-events-auto right-3 top-[68px] sm:right-auto sm:top-auto sm:left-3 sm:bottom-20";

  if (!on) {
    return (
      <button onClick={toggle} className={`${dock} h-9 pl-1.5 pr-3 rounded-full bg-slate-950/90 text-white shadow-xl border border-white/10 flex items-center gap-1.5 text-[11px] font-black`}>
        <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center"><VolumeX className="w-3 h-3" /></span>
        {TITLE[mood]} · off
      </button>
    );
  }

  return (
    <div className={`${dock} ${folded ? "w-auto" : "w-[min(300px,calc(100vw-24px))]"}`}>
      <div className="rounded-2xl bg-slate-950/90 text-white shadow-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center gap-1.5 p-1.5">
          <button onClick={() => (playing ? widget.current?.pause() : widget.current?.play())} aria-label={playing ? "Pause" : "Play"}
            className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${playing ? "bg-fuchsia-500" : "bg-white/15 animate-pulse"}`}>
            {playing ? <Music2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <div className={`${folded ? "max-w-[120px]" : "flex-1"} min-w-0`}>
            <div className="text-[10px] font-black uppercase tracking-wider text-white/50 truncate">{TITLE[mood]}</div>
            <div className="text-[11px] font-bold truncate">{!mix ? "Finding this week's mixes…" : playing ? mix.name : "Tap to start the music"}</div>
          </div>
          {!folded && mixes && mixes.length > 1 && (
            <button onClick={() => { setIndex((i) => (i + 1) % mixes.length); setPlaying(false); }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" aria-label="Next mix"><SkipForward className="w-3.5 h-3.5" /></button>
          )}
          {!folded && mood === "club" && (
            <button onClick={() => setVideo(!video)} className={`hidden sm:flex w-8 h-8 rounded-full items-center justify-center ${video ? "bg-fuchsia-500" : "bg-white/10"}`} aria-label="Video mode"><Tv className="w-3.5 h-3.5" /></button>
          )}
          {!folded && <button onClick={toggle} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" aria-label="Turn music off"><Pause className="w-3.5 h-3.5" /></button>}
          <button onClick={() => { setFolded(!folded); setShowList(false); }} className="h-8 px-2 rounded-full bg-white/10 text-[10px] font-black flex items-center gap-0.5" aria-label={folded ? "Show player" : "Hide player (music keeps playing)"}>
            {folded ? <ChevronDown className="w-3.5 h-3.5" /> : <><ChevronUp className="w-3.5 h-3.5" /> Hide</>}
          </button>
        </div>

        {/* The audio player stays mounted while folded, so the music never stops. */}
        {src && !video && (
          <div className={folded ? "h-0 overflow-hidden" : "px-1.5 pb-1.5"}>
            <iframe ref={frame} key={mix!.key} onLoad={onFrameLoad} title={`${TITLE[mood]}: ${mix!.name}`} src={src} width="100%" height="60" allow="autoplay; encrypted-media" className="rounded-xl block" style={{ border: 0 }} />
          </div>
        )}
        {video && !folded && (
          <div className="px-1.5 pb-1.5">
            <iframe title="DJ Booth video (YouTube)" src={`https://www.youtube.com/embed/videoseries?list=${VIDEO_PLAYLIST}&autoplay=1&rel=0&playsinline=1&modestbranding=1`} width="100%" height="200" allow="autoplay; encrypted-media; picture-in-picture" className="rounded-xl block min-w-[200px]" style={{ border: 0 }} />
          </div>
        )}

        {!folded && mixes && mixes.length > 1 && (
          <button onClick={() => setShowList(!showList)} className="w-full text-[10px] font-bold text-white/50 py-1 border-t border-white/10">{showList ? "Hide shows" : `${mixes.length} shows this week`}</button>
        )}
        {showList && !folded && (
          <ul className="max-h-48 overflow-y-auto border-t border-white/10">
            {(mixes ?? []).map((m, i) => (
              <li key={m.key}>
                <button onClick={() => { setIndex(i); setShowList(false); setPlaying(false); }} className={`w-full text-left px-3 py-2 hover:bg-white/5 ${i === index ? "bg-fuchsia-500/20" : ""}`}>
                  <span className="block text-xs font-bold truncate">{m.name}</span>
                  <span className="block text-[10px] text-white/50">{m.user} · {m.minutes} min</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!folded && <a href={mix?.url ?? "https://www.mixcloud.com"} target="_blank" rel="noreferrer" className="block px-3 pb-1.5 text-[9px] text-white/40">Streaming via Mixcloud · support the artists</a>}
      </div>
    </div>
  );
}
