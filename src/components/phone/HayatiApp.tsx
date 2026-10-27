"use client";

// Hayati: relationships and weddings on the phone. Single → ask a friend out; dating → daily love, dates
// and the proposal; engaged → plan the wedding; married → your wedding page. UAE law applies: a man and a
// woman, one partner at a time, both agreeing at every step.

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { askOut, cancelRequest, datePlaceOf, endRelationship, logDate, LOVE, planWedding, propose, respond, ringOf, showLove, useLove, venueOf, weddingCost, weddingLink, type Person } from "@/lib/love";
import { gameAudio } from "@/utils/gameAudio";
import { useNow } from "@/lib/dubaiClock";
import { AppScreen, aed, Big, Card, Note } from "./AppScreen";

const Face = ({ p, size = 56 }: { p: Pick<Person, "look">; size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={rosterThumb(presetFor(p.look ?? { gender: "woman" }))} alt="" style={{ width: size, height: size }} className="rounded-full object-cover object-top bg-rose-100 shrink-0" />
);

export function HayatiApp({ onBack }: { onBack: () => void }) {
  const { citizen } = useCitizen();
  const love = useLove(citizen?.id);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<{ error?: string }>, ok: string) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: ok });
    if (!r.error) gameAudio.playCoinSound();
  };
  const rel = love?.relationship;

  return (
    <AppScreen title="Hayati" onBack={onBack} accent="text-rose-500">
      {note && <Note ok={note.ok}>{note.text}</Note>}
      {!love ? <p className="text-center text-slate-500 py-8">Loading…</p> : (
        <>
          {love.incoming.map((q) => (
            <Card key={q.id} className="bg-rose-50">
              <div className="flex items-center gap-3">
                <Face p={q.from} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg leading-tight">{q.kind === "propose" ? `💍 @${q.from.username} proposed!` : `@${q.from.username} asked you out`}</p>
                  {q.kind === "propose" && <p className="text-slate-600">{ringOf(q.ring)?.name} · at {datePlaceOf(q.place)?.label}</p>}
                  {q.message && <p className="text-slate-600 italic">“{q.message}”</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Big tone="light" disabled={busy} onClick={() => run(() => respond(q.id, false), q.kind === "propose" ? "You said not yet. The ring goes back to the shop." : "You said no, kindly.")}>{q.kind === "propose" ? "Not yet" : "No, thanks"}</Big>
                <Big tone="red" disabled={busy} onClick={() => run(() => respond(q.id, true), q.kind === "propose" ? "💍 You're engaged! Plan the wedding below." : `💕 You're dating @${q.from.username}.`)}>{q.kind === "propose" ? "Yes! 💍" : "Yes 💕"}</Big>
              </div>
            </Card>
          ))}

          {rel ? <Together rel={rel} busy={busy} run={run} me={citizen?.username ?? ""} /> : <Single candidates={love.candidates} gender={love.gender} busy={busy} run={run} />}

          {love.outgoing.map((o) => (
            <div key={o.id} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 text-sm">
              <span className="flex-1">{o.kind === "propose" ? "💍 Proposal" : "💌 Asked"} @{o.to} · waiting for an answer</span>
              <button disabled={busy} onClick={() => run(() => cancelRequest(o.id), "Withdrawn.")} className="font-semibold text-slate-500">Withdraw</button>
            </div>
          ))}

          {love.invitations.length > 0 && (
            <Card>
              <p className="font-black">💒 Weddings you&apos;re going to</p>
              {love.invitations.map((w) => (
                <Link key={w.code} href={`/wedding/${w.code}`} className="flex items-center gap-2 py-1">
                  <span className="text-xl">{venueOf(w.venue)?.icon}</span>
                  <span className="flex-1">{venueOf(w.venue)?.name}</span>
                  <span className="text-sm text-slate-500">{new Date(w.startsAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                </Link>
              ))}
            </Card>
          )}
          <p className="text-center text-xs text-slate-400 px-4">Hayati follows UAE law: relationships and marriage between a man and a woman, one partner at a time, and both must agree at every step.</p>
        </>
      )}
    </AppScreen>
  );
}

type Run = (fn: () => Promise<{ error?: string }>, ok: string) => Promise<void>;

function Single({ candidates, gender, busy, run }: { candidates: Person[]; gender: string | null; busy: boolean; run: Run }) {
  const [msg, setMsg] = useState("");
  return (
    <>
      <Card className="bg-rose-50">
        <p className="font-black text-lg">💌 You&apos;re single</p>
        <p className="text-slate-600">Ask a friend out. If they say yes you&apos;re dating: show love every day and go on dates together to grow closer. With {LOVE.levels.propose} hearts you can propose.</p>
      </Card>
      {!gender ? <p className="text-slate-500 px-1">Finish your avatar first so we know who you can date.</p>
        : candidates.length === 0 ? <p className="text-slate-500 px-1">No single friends to ask yet. Meet people around the city and add them in Phone → People.</p> : (
          <>
            <input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={280} placeholder="Add a message (optional): Karak at the fountain?" className="w-full h-12 px-4 rounded-full bg-slate-100 outline-none" />
            {candidates.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-[22px] bg-slate-100/80">
                <Face p={p} size={48} />
                <span className="flex-1 font-semibold truncate">@{p.username}</span>
                <button disabled={busy} onClick={() => run(() => askOut(p.id, msg), `💌 Asked @${p.username} out. Fingers crossed!`)} className="h-10 px-4 rounded-full bg-rose-500 text-white font-semibold disabled:opacity-50">Ask out</button>
              </div>
            ))}
          </>
        )}
    </>
  );
}

function Together({ rel, busy, run, me }: { rel: NonNullable<ReturnType<typeof useLove>>["relationship"] & object; busy: boolean; run: Run; me: string }) {
  const [screen, setScreen] = useState<"main" | "propose" | "plan">("main");
  const p = rel.partner;
  const hearts = Math.min(rel.level, LOVE.levels.propose);
  const label = rel.status === "married" ? "Married" : rel.status === "engaged" ? "Engaged" : "Dating";
  const since = new Date(rel.marriedAt ?? rel.engagedAt ?? rel.since).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (screen === "propose") return <Proposal onDone={() => setScreen("main")} run={run} busy={busy} partner={p.username} />;
  if (screen === "plan") return <Planner onDone={() => setScreen("main")} run={run} busy={busy} />;

  return (
    <>
      <Card className="bg-gradient-to-br from-rose-100 to-pink-50">
        <div className="flex items-center gap-3">
          <Face p={p} size={64} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-600">{label} {rel.status === "engaged" && ringOf(rel.ring)?.icon}</p>
            <p className="text-xl font-black truncate">@{p.username}</p>
            <p className="text-slate-500">since {since}</p>
          </div>
        </div>
        {rel.status === "dating" && (
          <div>
            <div className="flex gap-1">{Array.from({ length: LOVE.levels.propose }, (_, i) => <Heart key={i} className={`w-5 h-5 ${i < hearts ? "fill-rose-500 text-rose-500" : "text-rose-200"}`} />)}</div>
            <p className="text-sm text-slate-500 mt-1">{rel.level >= LOVE.levels.propose ? "Close enough to propose 💍" : `${LOVE.levels.propose - rel.level} more hearts until you can propose`}</p>
          </div>
        )}
        <Big tone="red" disabled={busy || rel.lovedToday} onClick={() => run(showLove, `💗 @${p.username} felt that.`)}>{rel.lovedToday ? "💗 Love shown today" : "💗 Show love (+1 a day)"}</Big>
      </Card>

      <Card>
        <p className="font-black">🌅 Date today (+{LOVE.levels.date} together)</p>
        <p className="text-sm text-slate-500">Both check in at the same place today. {rel.partnerDateToday ? `@${p.username} picked ${datePlaceOf(rel.partnerDateToday)?.label}.` : `@${p.username} hasn't picked yet.`}</p>
        <div className="grid grid-cols-2 gap-2">
          {LOVE.datePlaces.map((d) => (
            <button key={d.id} disabled={busy} onClick={() => run(() => logDate(d.id), rel.partnerDateToday === d.id ? `💞 Date night at ${d.label}! +${LOVE.levels.date}` : `Checked in at ${d.label}. Waiting for @${p.username}.`)}
              className={`text-left px-3 py-2.5 rounded-2xl text-sm ${rel.dateToday === d.id ? "bg-rose-500 text-white" : rel.partnerDateToday === d.id ? "bg-rose-100 ring-2 ring-rose-400" : "bg-slate-100"}`}>
              {d.icon} {d.label}
            </button>
          ))}
        </div>
      </Card>

      {rel.status === "dating" && <Big tone="dark" disabled={busy || rel.level < LOVE.levels.propose} onClick={() => setScreen("propose")}>💍 Propose</Big>}
      {rel.status === "engaged" && !rel.wedding && <Big tone="red" onClick={() => setScreen("plan")}>💒 Plan the wedding</Big>}
      {rel.wedding && <WeddingCard code={rel.wedding} me={me} />}

      <button disabled={busy} onClick={() => { if (confirm(rel.status === "married" ? "Divorce? This ends your marriage." : "Break up? This ends the relationship.")) void run(endRelationship, "It's over. Take care of yourself."); }}
        className="w-full text-sm font-semibold text-slate-400 py-2">{rel.status === "married" ? "Divorce" : "Break up"}</button>
    </>
  );
}

function WeddingCard({ code, me }: { code: string; me: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = weddingLink(code, me);
    const text = "You're invited to our wedding on Dubai Life 💍 RSVP here:";
    if (navigator.share) { try { await navigator.share({ title: "Wedding invitation", text, url }); } catch { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); } catch { /* blocked */ }
  };
  return (
    <Card className="bg-amber-50">
      <p className="font-black">💒 Your wedding</p>
      <p className="text-sm text-slate-600">Share your invitation: friends who aren&apos;t on Dubai Life yet can join from the link and RSVP.</p>
      <div className="grid grid-cols-2 gap-2">
        <Big tone="light" onClick={share}>{copied ? "Link copied" : "Invite guests"}</Big>
        <Link href={`/wedding/${code}`} className="min-h-[52px] rounded-full bg-slate-900 text-white font-semibold flex items-center justify-center">Open</Link>
      </div>
    </Card>
  );
}

function Proposal({ onDone, run, busy, partner }: { onDone: () => void; run: Run; busy: boolean; partner: string }) {
  const [ring, setRing] = useState(LOVE.rings[1].id);
  const [place, setPlace] = useState(LOVE.datePlaces[0].id);
  const [message, setMessage] = useState("");
  return (
    <Card className="bg-rose-50">
      <p className="font-black text-lg">💍 Propose to @{partner}</p>
      <p className="text-sm font-semibold text-slate-500">The ring</p>
      {LOVE.rings.map((r) => (
        <button key={r.id} onClick={() => setRing(r.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left ${ring === r.id ? "bg-white ring-2 ring-rose-400" : "bg-white/60"}`}>
          <span className="text-2xl">{r.icon}</span><span className="flex-1 font-semibold">{r.name}</span><span className="font-black">{aed(r.price)}</span>
        </button>
      ))}
      <p className="text-sm font-semibold text-slate-500">Where</p>
      <select value={place} onChange={(e) => setPlace(e.target.value)} className="w-full h-12 rounded-2xl bg-white px-3">
        {LOVE.datePlaces.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.label}</option>)}
      </select>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} rows={3} placeholder="Say it from the heart…" className="w-full rounded-2xl bg-white p-3 outline-none" />
      <p className="text-xs text-slate-500">If the answer is not yet, the ring goes back to the shop and you get your money back.</p>
      <Big tone="red" disabled={busy} onClick={async () => { await run(() => propose(ring, place, message), `💍 Proposal sent. @${partner} will see it now.`); onDone(); }}>Propose · {aed(ringOf(ring)!.price)}</Big>
      <button onClick={onDone} className="w-full text-sm font-semibold text-slate-500">Not now</button>
    </Card>
  );
}

function Planner({ onDone, run, busy }: { onDone: () => void; run: Run; busy: boolean }) {
  const [venue, setVenue] = useState(LOVE.venues[0].id);
  const [guests, setGuests] = useState(LOVE.guestOptions[1]);
  const [ceremony, setCeremony] = useState(LOVE.ceremonies[0].id);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(19);
  const now = useNow();
  // The chosen day and hour in Dubai time (GST, UTC+4).
  const startsAt = (() => {
    const d = new Date(now + day * 86_400_000);
    const ymd = d.toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    return new Date(`${ymd}T${String(hour).padStart(2, "0")}:00:00+04:00`);
  })();
  const cost = weddingCost(venue, guests, ceremony);

  return (
    <Card className="bg-amber-50">
      <p className="font-black text-lg">💒 Plan the wedding</p>
      <p className="text-sm font-semibold text-slate-500">Ceremony</p>
      {LOVE.ceremonies.map((c) => (
        <button key={c.id} onClick={() => setCeremony(c.id)} className={`w-full text-left px-3 py-2.5 rounded-2xl ${ceremony === c.id ? "bg-white ring-2 ring-amber-400" : "bg-white/60"}`}>
          <span className="font-semibold">{c.icon} {c.name}</span> <span className="text-sm text-slate-500">· {aed(c.fee)}</span>
          <span className="block text-xs text-slate-500">{c.text}</span>
        </button>
      ))}
      <p className="text-sm font-semibold text-slate-500">Venue</p>
      {LOVE.venues.map((v) => (
        <button key={v.id} onClick={() => setVenue(v.id)} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl text-left ${venue === v.id ? "bg-white ring-2 ring-amber-400" : "bg-white/60"}`}>
          <span className="text-2xl">{v.icon}</span>
          <span className="flex-1"><span className="block font-semibold leading-tight">{v.name}</span><span className="text-xs text-slate-500">{aed(v.base)} + {aed(v.perGuest)} a guest</span></span>
        </button>
      ))}
      <p className="text-sm font-semibold text-slate-500">Guests</p>
      <div className="grid grid-cols-4 gap-2">{LOVE.guestOptions.map((g) => <button key={g} onClick={() => setGuests(g)} className={`h-11 rounded-full font-semibold ${guests === g ? "bg-amber-500 text-white" : "bg-white"}`}>{g}</button>)}</div>
      <p className="text-sm font-semibold text-slate-500">When (Dubai time)</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={day} onChange={(e) => setDay(+e.target.value)} className="h-12 rounded-2xl bg-white px-3">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{new Date(now + d * 86_400_000).toLocaleDateString("en-GB", { timeZone: "Asia/Dubai", weekday: "short", day: "numeric", month: "short" })}</option>)}
        </select>
        <select value={hour} onChange={(e) => setHour(+e.target.value)} className="h-12 rounded-2xl bg-white px-3">
          {Array.from({ length: 24 }, (_, h) => h).map((h) => <option key={h} value={h}>{`${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`}</option>)}
        </select>
      </div>
      <div className="flex justify-between font-black text-lg pt-1"><span>Total</span><span>{aed(cost)}</span></div>
      <p className="text-xs text-slate-500">You pay now. Cancelling later refunds half. On the day, you both say &ldquo;I do&rdquo; on the wedding page during the 30-minute ceremony.</p>
      <Big tone="green" disabled={busy} onClick={async () => { await run(() => planWedding(venue, startsAt, guests, ceremony), "💒 Booked! Share the invitation with your guests."); onDone(); }}>Book the wedding · {aed(cost)}</Big>
      <button onClick={onDone} className="w-full text-sm font-semibold text-slate-500">Back</button>
    </Card>
  );
}

