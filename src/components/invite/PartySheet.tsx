"use client";

// Throw a party: a house party at your home, a dinner at your home or a restaurant, or a club night at a club. Pick a
// time and decorations, then send the link (WhatsApp, the share sheet or copied) or invite players by username.
// Everyone online can be told too. Parties you have coming up are listed with their links.

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useServices } from "@/lib/cityServices";
import { useCitizen } from "@/lib/citizenStore";
import { broadcastCityPulse } from "@/lib/presence";
import { PLACES } from "@/lib/city/places";
import {
  cancelInvite, createEvent, inviteUrl, invitePlayer, kindOf, myParties, PARTIES, shareInvite, whatsappLink,
  type EventKind, type MyParty,
} from "@/lib/invites";
import { gameAudio } from "@/utils/gameAudio";

const WHEN = [
  { label: "Now", mins: 0 },
  { label: "In 30 min", mins: 30 },
  { label: "In 1 hour", mins: 60 },
  { label: "In 3 hours", mins: 180 },
] as const;
const at = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "short", hour: "numeric", minute: "2-digit" });
const aed = (n: number) => `AED ${n.toLocaleString()}`;
const minutesFromNow = (mins: number) => new Date(Date.now() + mins * 60_000);
/** A date as the datetime-local input wants it (local time, to the minute). */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
/** From now to 7 days ahead (what the server accepts). */
const scheduleRange = () => ({ min: localInput(new Date()), max: localInput(new Date(Date.now() + 7 * 86_400_000 - 60_000)) });
const inNextWeek = (d: Date) => !Number.isNaN(d.getTime()) && d.getTime() >= Date.now() - 600_000 && d.getTime() <= Date.now() + 7 * 86_400_000;

// Venues a party can be at: clubs for club nights, pools and beach clubs for pool parties, restaurants for dinners.
const VENUES = PLACES.flatMap((p) => p.venues.filter((v) => !v.comingSoon).map((v) => ({ place: p, venue: v })));
// Yachts at Dubai Harbour take club nights and pool parties too (a yacht party).
const YACHTS = VENUES.filter((x) => x.venue.layout === "yacht");
const CLUBS = [...YACHTS, ...VENUES.filter((x) => x.place.kind === "club" || (x.venue.layout === "club" && !/entertainment/i.test(x.venue.category)))];
const POOLS = [...YACHTS, ...VENUES.filter((x) => x.venue.feature === "pool" && x.venue.layout !== "waterpark")];
const RESTAURANTS = VENUES.filter((x) => x.venue.layout === "dining" && /restaurant|dining|grill|steak|lounge|bistro|brasserie|kitchen/i.test(`${x.venue.category} ${x.venue.name}`));

/** Where to start: a kind of party, and a venue already picked (opened from the venue itself). */
export interface PartyStart { kind?: EventKind; placeId?: string; venueId?: string }

// Seminars can be anywhere (a hotel hall, a café, a co-working space…).
const listFor = (k: EventKind, promoter: boolean) => (promoter || k === "seminar" ? VENUES : k === "club_night" ? CLUBS : k === "pool_party" ? POOLS : RESTAURANTS);
const atVenue = (k: EventKind) => k === "club_night" || k === "pool_party" || k === "seminar";
const SIZES = [20, 50, 100, 200];

/** Where a house party goes: a home on the map, or (with `prepare`) a home off the map that gets its address on the
    first party (see lib/city/partyHome.ts). `noRoom` explains why there's no home to party at. */
export interface PartyFlat {
  id: string; route: string; title: string; area: string;
  prepare?: () => Promise<{ id: string; route: string } | { error: string }>;
}

export function PartySheet({ flat, start, onClose, noRoom }: {
  flat: PartyFlat | null;
  noRoom?: string;
  start?: PartyStart;
  onClose: () => void;
}) {
  const { citizen } = useCitizen();
  // Club promoters: any venue, guest lists up to 200, and a commission for every guest who turns up.
  const promoter = useServices(citizen?.id)?.service === "promoter";
  const [size, setSize] = useState(20);
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState(100);
  const [kind, setKind] = useState<EventKind>(start?.kind ?? (flat ? "house_party" : "club_night"));
  const [atHome, setAtHome] = useState(!!flat && !start?.venueId && !atVenue(start?.kind ?? "house_party"));
  const [venueKey, setVenueKey] = useState<string | null>(start?.placeId && start.venueId ? `${start.placeId}/${start.venueId}` : null);
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [mins, setMins] = useState<number>(0);
  // A chosen date and time (datetime-local text), instead of the quick choices.
  const [whenAt, setWhenAt] = useState("");
  const [whenRange] = useState(scheduleRange);
  const [decor, setDecor] = useState<string[]>([]);
  const [everyone, setEveryone] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ code: string; title: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [parties, setParties] = useState<MyParty[] | null>(null);
  useEffect(() => { void myParties().then(setParties); }, [made]);

  const home = kind === "house_party" || (kind === "dinner" && atHome);
  const list = listFor(kind, promoter);
  // The venue it was opened from heads the list (even if it isn't the usual kind of place for this party).
  const picked = VENUES.find((x) => `${x.place.id}/${x.venue.id}` === venueKey) ?? null;
  const shown = useMemo(() => {
    const all = picked && !list.includes(picked) ? [picked, ...list] : list;
    return all.filter((x) => `${x.venue.name} ${x.place.name}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40);
  }, [list, q, picked]);
  const venue = picked;
  const where = home ? (flat ? `${flat.title} · ${flat.area}` : null) : venue ? `${venue.venue.name} · ${venue.place.name}` : null;
  const k = kindOf(kind);
  const name = title.trim() || `@${citizen?.username ?? "my"}'s ${k.label.toLowerCase()}`;
  const cost = decor.reduce((s, id) => s + (PARTIES.decor.find((d) => d.id === id)?.price ?? 0), 0);
  const text = `${k.icon} You're invited to ${name}${where ? ` at ${where}` : ""} in Dubai Life!`;

  const create = async () => {
    if (!where) { setError(home ? (noRoom ?? "You need a room of your own to throw a party at home.") : "Pick a place."); return; }
    if (cost > (citizen?.balance ?? 0)) { setError(`The decorations cost ${aed(cost)}.`); return; }
    setBusy(true);
    setError(null);
    const starts = whenAt ? new Date(whenAt) : minutesFromNow(mins);
    if (whenAt && !inNextWeek(starts)) {
      setBusy(false); setError("Pick a time in the next 7 days."); return;
    }
    // A home off the map gets its address now.
    let homeAt = flat ? { id: flat.id, route: flat.route } : null;
    if (home && flat?.prepare) {
      const p = await flat.prepare();
      if ("error" in p) { setBusy(false); setError(p.error); return; }
      homeAt = p;
    }
    const r = await createEvent(home && homeAt
      ? { kind, title: name, startsAt: starts, label: where, flatId: homeAt.id, route: homeAt.route, decor, price: paid ? price : 0 }
      : { kind, title: name, startsAt: starts, label: where, placeId: venue!.place.id, venueId: venue!.venue.id, decor, price: paid ? price : 0, maxGuests: promoter ? size : 20 });
    setBusy(false);
    if (!r.code) { setError(r.error ?? "Couldn't make the party."); return; }
    gameAudio.playCoinSound();
    if (everyone) {
      broadcastCityPulse({ kind: "party", icon: k.icon, title: `@${citizen?.username ?? "someone"}: ${name}`, subtitle: `${where} · ${whenAt || mins ? `starts ${at(starts.toISOString())}` : "happening now"}`, href: `/i/${r.code}`, cta: "See invite ›", from: citizen?.username ?? "someone" });
    }
    setMade({ code: r.code, title: name });
  };
  const share = async (code: string, t = text) => {
    const r = await shareInvite(code, t);
    if (r === "copied") setNote("Link copied. Paste it to your friends!");
  };
  const invite = async () => {
    if (!made || !who.trim()) return;
    const err = await invitePlayer(made.code, who, citizen?.username ?? "someone", made.title);
    setNote(err ?? `Invited @${who.trim().replace(/^@/, "")}. They'll get a notification.`);
    if (!err) setWho("");
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Throw a party" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto bg-white text-slate-900 rounded-t-[28px] sm:rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-lg font-black">{made ? `${k.icon} Your party is on!` : "Throw a party"}</p>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
        </div>

        {made ? (
          <div className="space-y-2.5">
            <div className="rounded-2xl bg-fuchsia-50 p-3 text-center">
              <p className="font-black">{made.title}</p>
              <p className="text-xs text-slate-500 break-all mt-1">{inviteUrl(made.code)}</p>
            </div>
            <a href={whatsappLink(made.code, text)} target="_blank" rel="noopener noreferrer" className="w-full h-12 rounded-2xl bg-[#25D366] text-white font-black flex items-center justify-center">Send on WhatsApp</a>
            <button onClick={() => share(made.code)} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">Share or copy the link</button>
            <div className="flex gap-2">
              <input value={who} onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} placeholder="@username" aria-label="Invite a player by username"
                className="flex-1 min-w-0 h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold outline-none" />
              <button onClick={invite} className="h-11 px-4 rounded-xl bg-fuchsia-600 text-white font-black">Invite</button>
            </div>
            {note && <p className="text-center text-sm font-bold text-emerald-700">{note}</p>}
            <p className="text-[11px] text-slate-500 text-center">Anyone with the link sees your party. New players sign up and come straight to it. You earn {aed(PARTIES.rewards.hostPerGuest)} for each guest who turns up ({aed(PARTIES.rewards.hostPerGuest + PARTIES.rewards.hostPerNewPlayer)} for a new player).</p>
          </div>
        ) : (
          <>
            {promoter && <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">📣 <b>Club promoter:</b> host at any venue, for up to 200 guests. You earn AED 150 for every guest who turns up.</p>}
            <div className="grid grid-cols-5 gap-1.5">
              {(["house_party", "dinner", "club_night", "pool_party", "seminar"] as const).map((id) => (
                <button key={id} onClick={() => { setKind(id); if (atVenue(id) !== atVenue(kind) || id === "house_party") setVenueKey(null); setAtHome(!atVenue(id) && !!flat); }}
                  className={`h-14 px-1 rounded-2xl text-[11px] leading-tight text-center font-black flex flex-col items-center justify-center gap-0.5 ${kind === id ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                  <span className="text-lg leading-none">{kindOf(id).icon}</span>{kindOf(id).label}
                </button>
              ))}
            </div>

            {kind === "dinner" && (
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setAtHome(true)} className={`h-10 rounded-xl text-xs font-black ${atHome ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>🏠 At my home</button>
                <button onClick={() => setAtHome(false)} className={`h-10 rounded-xl text-xs font-black ${!atHome ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>🍽️ At a restaurant</button>
              </div>
            )}

            {home ? (
              flat ? <p className="rounded-2xl bg-slate-50 p-3 text-sm"><b>At your {flat.title}</b> · {flat.area}. Your door opens to guests.</p>
                : <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{noRoom ?? "A house party needs a room of your own."} Anyone can throw a club night, pool party or dinner at a restaurant, so pick one of those.</p>
            ) : (
              <div className="space-y-1.5">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={promoter || kind === "seminar" ? "Search any venue" : kind === "club_night" ? "Search clubs" : kind === "pool_party" ? "Search pools and beach clubs" : "Search restaurants"} aria-label="Search places"
                  className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm font-bold outline-none" />
                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                  {shown.map((x) => {
                    const key = `${x.place.id}/${x.venue.id}`;
                    return (
                      <button key={key} onClick={() => setVenueKey(key)} className={`w-full text-left rounded-xl px-3 py-2 ${venueKey === key ? "bg-fuchsia-600 text-white" : "bg-slate-50 hover:bg-slate-100"}`}>
                        <span className="block text-sm font-black truncate">{x.venue.name}</span>
                        <span className={`block text-[11px] truncate ${venueKey === key ? "text-white/80" : "text-slate-500"}`}>{x.venue.category} · {x.place.name}</span>
                      </button>
                    );
                  })}
                  {!shown.length && <p className="text-sm text-slate-500 p-2">Nothing matches.</p>}
                </div>
              </div>
            )}

            {/* #11, #12, #13, #14, #15, #17: Special Celebration Themes */}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Celebration Themes (Optional)</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { label: "💍 Proposal Party", title: `💍 @${citizen?.username ?? "my"}'s Proposal Party`, kind: "house_party" as EventKind },
                  { label: "🥂 Engagement Party", title: `🥂 @${citizen?.username ?? "my"}'s Engagement Party`, kind: "house_party" as EventKind },
                  { label: "🇳🇬 Lagos Owambe", title: `🇳🇬 @${citizen?.username ?? "my"}'s Lagos Owambe & Asoebi`, kind: "house_party" as EventKind },
                  { label: "🍼 Baby Shower", title: `🍼 @${citizen?.username ?? "my"}'s Baby Shower & Gender Reveal`, kind: "house_party" as EventKind },
                  { label: "💔 Breakup Glow-Up", title: `💔 @${citizen?.username ?? "my"}'s Breakup & Piñata Party`, kind: "house_party" as EventKind },
                  { label: "🍽️ Luxury 4-Course Dinner", title: `🍽️ @${citizen?.username ?? "my"}'s Luxury Dinner with Friends`, kind: "dinner" as EventKind },
                ].map((th) => (
                  <button
                    key={th.label}
                    type="button"
                    onClick={() => {
                      gameAudio.playClickSound();
                      setTitle(th.title);
                      if (flat || th.kind === "dinner") setKind(th.kind);
                    }}
                    className={`px-2.5 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap border transition-all ${
                      title === th.title ? "bg-slate-900 text-amber-300 border-slate-900" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder={name} aria-label="Party name"
              className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold outline-none" />
            <div className="grid grid-cols-4 gap-1.5">
              {WHEN.map((w) => <button key={w.label} onClick={() => { setMins(w.mins); setWhenAt(""); }} className={`h-10 rounded-xl text-xs font-black ${!whenAt && mins === w.mins ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-700"}`}>{w.label}</button>)}
            </div>
            {/* Scheduled: any date and time in the next 7 days; share the link now, it opens on the day. */}
            <label className={`flex items-center gap-2 h-11 rounded-xl px-3 border ${whenAt ? "border-fuchsia-500 bg-fuchsia-50" : "border-slate-200 bg-slate-50"}`}>
              <span className="text-xs font-black text-slate-600 shrink-0">📅 Pick a date &amp; time</span>
              <input type="datetime-local" value={whenAt} min={whenRange.min} max={whenRange.max}
                onChange={(e) => setWhenAt(e.target.value)} aria-label="Party date and time" className="flex-1 min-w-0 bg-transparent text-sm font-bold outline-none" />
            </label>

            <div className="space-y-1.5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Entry</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setPaid(false)} className={`h-10 rounded-xl text-xs font-black ${!paid ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-700"}`}>🎉 Free</button>
                <button onClick={() => setPaid(true)} className={`h-10 rounded-xl text-xs font-black ${paid ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-700"}`}>🎟️ Paid tickets</button>
              </div>
              {paid && (
                <label className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 h-11">
                  <span className="text-sm font-black text-slate-500">AED</span>
                  <input type="number" inputMode="numeric" min={1} max={PARTIES.tickets.maxPrice} value={price} onChange={(e) => setPrice(Math.max(1, Math.min(PARTIES.tickets.maxPrice, Math.round(+e.target.value || 0))))}
                    aria-label="Ticket price" className="flex-1 min-w-0 bg-transparent font-black outline-none" />
                  <span className="text-[11px] text-slate-500">a ticket, paid to you</span>
                </label>
              )}
              {promoter && !home && (
                <>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400 pt-1">Guest list</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SIZES.map((n) => <button key={n} onClick={() => setSize(n)} className={`h-10 rounded-xl text-xs font-black ${size === n ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-700"}`}>{n}</button>)}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Decorations {cost > 0 && <span className="text-fuchsia-600 normal-case">· {aed(cost)}</span>}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {PARTIES.decor.map((d) => {
                  const on = decor.includes(d.id);
                  return (
                    <button key={d.id} onClick={() => setDecor((x) => (on ? x.filter((y) => y !== d.id) : [...x, d.id]))}
                      className={`rounded-xl p-2 text-left ${on ? "bg-fuchsia-600 text-white" : "bg-slate-50 hover:bg-slate-100"}`}>
                      <span className="block text-lg leading-none">{d.icon}</span>
                      <span className="block text-[11px] font-black leading-tight mt-1">{d.label}</span>
                      <span className={`block text-[10px] font-mono ${on ? "text-white/80" : "text-emerald-600"}`}>{aed(d.price)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">They go up for this party only, for everyone there to see.</p>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} className="w-4 h-4 accent-fuchsia-600" />
              Also tell everyone online
            </label>
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <button onClick={create} disabled={busy || !where} className="w-full h-12 rounded-2xl bg-fuchsia-600 text-white font-black disabled:opacity-50">
              {busy ? "Setting up…" : `${k.icon} Throw it${cost ? ` · ${aed(cost)}` : ""}`}
            </button>
            <p className="text-[11px] text-slate-500 text-center">It runs for {"hours" in k ? k.hours : 3} hours. Up to {PARTIES.maxGuests} guests.</p>
          </>
        )}

        {!!parties?.length && !made && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Coming up</p>
            {parties.map((p) => (
              <div key={p.code} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{p.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{at(p.startsAt)} · {p.going} going · {p.label}</p>
                </div>
                <button onClick={() => share(p.code, `🎉 You're invited to ${p.title} in Dubai Life!`)} className="h-8 px-3 rounded-full bg-slate-900 text-white text-xs font-black">Share</button>
                <button onClick={async () => { await cancelInvite(p.code); setParties(await myParties()); }} className="h-8 px-2 rounded-full text-xs font-bold text-rose-600">Cancel</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
