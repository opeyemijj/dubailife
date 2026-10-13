"use client";

// Music inside venues. Clubs play club-banger playlists in YouTube's embedded player (kept visible
// at YouTube's minimum player size, as its terms require). Restaurants and cafés play chilled DJ
// sets from Mixcloud's embed player. Both stay mounted while panels are open, so the music keeps
// going as the citizen moves around.

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Music2, SkipForward, VolumeX } from "lucide-react";
import type { Venue } from "@/lib/city/types";

type Mood = "club" | "pool" | "lounge";

/** Mixcloud channels whose weekly shows make each mood's playlist. */
type MixMood = "lounge" | "club";
const CHANNELS: Record<MixMood, string[]> = {
  club: ["Defectedrecords", "ClubKillers", "Anjunadeep", "hedkandi"],
  lounge: ["Jazzmo", "cafedelmarmusic", "maxvibes"],
};
const TITLE: Record<MixMood, string> = { club: "Club radio · this week's DJ mixes", lounge: "Lounge radio · chilled sets" };
const STORAGE_KEY = "venue_radio_on";

export interface Mix {
  key: string;
  name: string;
  user: string;
  minutes: number;
  uploaded: string;
  url: string;
}

/** Club playlists on YouTube (checked embeddable). The first is the default. */
export const CLUB_PLAYLISTS = [
  { id: "PLO7-VO1D0_6MRJ9Js0_HzHymB8jL2JSyd", label: "Club hits 2026" },
  { id: "PLRZlMhcYkA2GJCuab9iNizKn6tf7uPv6q", label: "House & EDM" },
  { id: "PL3-sRm8xAzY-556lOpSGH6wVzyofoGpzU", label: "Hip-hop" },
  { id: "PLGXS-mZTPY4SLjIToqPiHEJFnM7qC44hC", label: "Afro house" },
  { id: "PL9KH0fJrAwWIqmU1iF-7D9Wz3I1_XlDAs", label: "Afrobeats & Amapiano" },
  { id: "PLqotH_u6C1LLujWLfOskrOIfWucEXkl0O", label: "New club music" },
];

/** Poolside playlists on YouTube (checked embeddable). */
export const POOL_PLAYLISTS = [
  { id: "PLGXbBW1RbSb4tQGY6R72kLYINcBfYg_vy", label: "Pool party" },
  { id: "PLNffmVxCj2bMjaTh5xFUmfa39cTTuPRVe", label: "Ibiza deep house" },
  { id: "PLg0cM5zrKwwIQ-sRz0Jq47yUBih_rEG9t", label: "Sunset sessions" },
  { id: "PLKsiRyayPqRL1EzG7OYVusPH7GQAWUG2S", label: "Tropical house" },
  { id: "PLy_wKxVmWb4ZibQ-hzYfTaGwRWPA_W3Z5", label: "Pool party EDM" },
];

/** The playlist that suits a club's nights. */
function defaultPlaylist(venue: Venue) {
  const about = `${venue.category} ${venue.blurb}`;
  if (/hip-hop|r&b|rap/i.test(about)) return 2;
  if (/afro|reggae|dancehall|jamaican/i.test(about)) return 4;
  return 0;
}

export function moodFor(venue: Venue): Mood | null {
  if (venue.layout === "club") return "club";
  if (venue.feature === "pool") return "pool";
  if (venue.layout === "dining") return "lounge";
  return null;
}

// One fetch per mood per session, shared by every venue.
const playlists = new Map<MixMood, Promise<Mix[]>>();

function loadPlaylist(mood: MixMood): Promise<Mix[]> {
  let p = playlists.get(mood);
  if (!p) {
    p = Promise.all(
      CHANNELS[mood].map((u) =>
        fetch(`https://api.mixcloud.com/${u}/cloudcasts/?limit=3`)
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((j: { data?: Array<{ key: string; name: string; url: string; audio_length: number; created_time: string; user: { name: string } }> }) =>
            (j.data ?? []).map((c) => ({ key: c.key, name: c.name, url: c.url, user: c.user.name, minutes: Math.round(c.audio_length / 60), uploaded: c.created_time })),
          )
          .catch(() => [] as Mix[]),
      ),
    ).then((lists) => {
      // Newest first, but start with each channel's latest so the top of the list is varied.
      const latest = lists.map((l) => l[0]).filter(Boolean);
      const rest = lists.flatMap((l) => l.slice(1));
      const byDate = (a: Mix, b: Mix) => b.uploaded.localeCompare(a.uploaded);
      return [...latest.sort(byDate), ...rest.sort(byDate)];
    });
    // A failed load shouldn't stick for the whole session.
    p.then((mixes) => { if (mixes.length === 0) playlists.delete(mood); });
    playlists.set(mood, p);
  }
  return p;
}

function readOn() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

const ago = (iso: string) => {
  const days = Math.floor((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(iso.slice(0, 10))) / 86400000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : days < 14 ? `${days} days ago` : new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export function VenueRadio({ venue, compact = false }: { venue: Venue; compact?: boolean }) {
  const mood = moodFor(venue);
  if (mood === "club") return <ClubPlayer venue={venue} playlists={CLUB_PLAYLISTS} first={defaultPlaylist(venue)} title="DJ Booth" />;
  if (mood === "pool") return <ClubPlayer venue={venue} playlists={POOL_PLAYLISTS} first={0} title="Poolside DJ" />;
  if (mood === "lounge") return <MixcloudRadio mood={mood} compact={compact} />;
  return null;
}

/**
 * The DJ Booth: club bangers from YouTube, docked out of the way (top-right on phones, bottom-left
 * on larger screens). YouTube's terms need its player visible and at least 200×200, so that's the
 * size, and minimising it to a pill pauses the music.
 */
function ClubPlayer({ playlists, first, title }: { venue: Venue; playlists: typeof CLUB_PLAYLISTS; first: number; title: string }) {
  const [list, setList] = useState(first);
  const [on, setOn] = useState(readOn);
  // Start somewhere different each visit so it doesn't always open on the same track.
  const [start] = useState(() => 1 + Math.floor(Math.random() * 12));
  const setPlaying = (next: boolean) => {
    setOn(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* private mode */ }
  };
  const playlist = playlists[list];
  const src = `https://www.youtube.com/embed/videoseries?list=${playlist.id}&index=${start}&autoplay=1&rel=0&playsinline=1&modestbranding=1`;
  const dock = "absolute z-30 pointer-events-auto right-3 top-[68px] sm:right-auto sm:top-auto sm:left-3 sm:bottom-20";

  if (!on) {
    return (
      <button onClick={() => setPlaying(true)} className={`${dock} h-9 pl-2 pr-3 rounded-full bg-slate-950/90 backdrop-blur-md text-white shadow-xl border border-white/10 flex items-center gap-1.5 text-[11px] font-black`}>
        <span className="w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center"><Music2 className="w-3 h-3" /></span>
        {title} · Play
      </button>
    );
  }

  return (
    <div className={`${dock} w-[216px]`}>
      <div className="rounded-2xl bg-slate-950/90 backdrop-blur-md text-white shadow-2xl overflow-hidden border border-white/10 p-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 shrink-0 rounded-full bg-fuchsia-500 animate-pulse flex items-center justify-center"><Music2 className="w-3 h-3" /></span>
          <span className="flex-1 min-w-0 text-[11px] font-black truncate">{title}</span>
          <button onClick={() => setPlaying(false)} className="h-6 px-2 rounded-full bg-white/10 text-[10px] font-black flex items-center gap-1" aria-label={`Minimise and pause the ${title}`}>
            <ChevronDown className="w-3 h-3" /> Hide
          </button>
        </div>
        <select
          value={list}
          onChange={(e) => setList(Number(e.target.value))}
          aria-label="Choose the music"
          className="w-full h-7 rounded-lg bg-white/10 text-[11px] font-bold px-1.5 text-white [&>option]:text-slate-900"
        >
          {playlists.map((p, i) => <option key={p.id} value={i}>{p.label}</option>)}
        </select>
        <iframe
          key={playlist.id}
          title={`${title} — ${playlist.label} (YouTube)`}
          src={src}
          width={200}
          height={200}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          className="block rounded-lg"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}

/** Chilled DJ sets from Mixcloud for restaurants and cafés. */
function MixcloudRadio({ mood, compact }: { mood: MixMood; compact: boolean }) {
  const [mixes, setMixes] = useState<Mix[] | null>(null);
  const [index, setIndex] = useState(0);
  const [on, setOn] = useState(readOn);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPlaylist(mood).then((m) => { if (alive) setMixes(m); });
    return () => { alive = false; };
  }, [mood]);

  const toggle = () => {
    const next = !on;
    setOn(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* private mode */ }
  };

  const mix = mixes?.[index % Math.max(1, mixes.length)];
  const src = mix ? `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&light=0&autoplay=1&feed=${encodeURIComponent(mix.key)}` : null;
  const hideBody = compact || !on;

  return (
    <div className="absolute z-30 pointer-events-auto right-3 top-[68px] w-[min(300px,calc(100vw-24px))] sm:right-auto sm:top-auto sm:left-3 sm:bottom-20 sm:w-[340px]">
      <div className="rounded-2xl bg-slate-950/90 backdrop-blur-md text-white shadow-2xl overflow-hidden border border-white/10">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center ${on ? "bg-fuchsia-500 animate-pulse" : "bg-white/15"}`}>
            {on ? <Music2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 truncate">{TITLE[mood]}</div>
            <div className="text-xs font-black truncate">{!on ? "Music off" : mix ? mix.name : mixes ? "No mixes available right now" : "Finding this week's mixes…"}</div>
          </div>
          {on && mixes && mixes.length > 1 && (
            <button onClick={() => setIndex((i) => (i + 1) % mixes.length)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" aria-label="Next mix"><SkipForward className="w-3.5 h-3.5" /></button>
          )}
          <button onClick={toggle} className={`h-8 px-2.5 rounded-full text-[11px] font-black ${on ? "bg-white/10" : "bg-fuchsia-500"}`}>{on ? "Off" : "Play"}</button>
          {on && !compact && mixes && mixes.length > 0 && (
            <button onClick={() => setOpen(!open)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" aria-label={open ? "Hide mixes" : "Show mixes"}>
              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Kept mounted while playing (just folded away) so panels don't stop the music. */}
        {on && src && (
          <div className={hideBody ? "h-0 overflow-hidden" : "px-2 pb-2"}>
            <iframe key={mix!.key} title={`Mixcloud: ${mix!.name}`} src={src} width="100%" height="60" allow="autoplay; encrypted-media" className="rounded-xl block" style={{ border: 0 }} />
          </div>
        )}

        {on && open && !compact && mixes && (
          <ul className="max-h-56 overflow-y-auto border-t border-white/10">
            {mixes.map((m, i) => (
              <li key={m.key}>
                <button onClick={() => { setIndex(i); setOpen(false); }} className={`w-full text-left px-3 py-2 flex gap-2 items-center hover:bg-white/5 ${i === index ? "bg-fuchsia-500/20" : ""}`}>
                  <span className="text-[10px] font-mono text-white/40 w-4">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold truncate">{m.name}</span>
                    <span className="block text-[10px] text-white/50 truncate">{m.user} · {m.minutes} min · {ago(m.uploaded)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!hideBody && <a href={mix?.url ?? "https://www.mixcloud.com"} target="_blank" rel="noreferrer" className="block px-3 pb-2 text-[10px] text-white/40 hover:text-white/70">Streaming via Mixcloud · support the artists</a>}
      </div>
    </div>
  );
}
