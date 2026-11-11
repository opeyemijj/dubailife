"use client";

// Family (once called Hayati): partners, kids and relatives on the phone.
//   Partners: ask a friend out; dating → daily love, dates and the proposal; engaged → plan the wedding. A man may
//   have up to 4 partners (each relationship separate), a woman one. Other partners are hidden, but can be found out.
//   Kids: decide together to have a baby (7 days of pregnancy), then a new stage every week; care daily or hire a nanny.
//   Relatives: brothers, sisters, parents, children and cousins, when both agree.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { adjustBalance, updateCitizen, useCitizen } from "@/lib/citizenStore";
import {
  addRelative, askForBaby, askMoveIn, respondMoveIn, myMoveInRequests, moveOut, myHousehold, type SharedHome, type MoveInRequest, askOut, cancelRequest, careForChild, datePlaceOf, endRelationship, FAMILY, happinessOf, hireNanny, logDate, LOVE,
  nameChild, planWedding, propose, relationLabel, removeRelative, resolveDiscovery, respond, respondRelative, ringOf, showLove, stageOf,
  useFamily, useLove, venueOf, weddingCost, weddingLink, calculatePregnancyStage, type Child, type Person, type Relation, type Relationship, type Relative,
} from "@/lib/love";
import { contacts, type Contact } from "@/lib/messages";
import { supabase } from "@/lib/supabase/client";
import { gameAudio } from "@/utils/gameAudio";
import { useNow } from "@/lib/dubaiClock";
import { onUserEvent } from "@/lib/userChannel";
import { partyDoor } from "@/lib/invites";
import { openArcade } from "@/components/arcade/launcher";
import HALLS from "@/data/venues/halls.json";
import { AppScreen, aed, Big, Card, Note } from "./AppScreen";

const Face = ({ p, size = 56 }: { p: Pick<Person, "look">; size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={rosterThumb(presetFor(p.look ?? { gender: "woman" }))} alt="" style={{ width: size, height: size }} className="rounded-full object-cover object-top bg-rose-100 shrink-0" />
);

type Run = (fn: () => Promise<{ error?: string }>, ok: string) => Promise<void>;
type Tab = "partners" | "kids" | "relatives";

export function HayatiApp({ onBack }: { onBack: () => void }) {
  const { citizen } = useCitizen();
  const love = useLove(citizen?.id);
  const family = useFamily(citizen?.id);
  const [tab, setTab] = useState<Tab>("partners");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run: Run = async (fn, ok) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: ok });
    if (!r.error) gameAudio.playCoinSound();
  };
  const pendingRelatives = family?.relatives.filter((r) => r.status === "pending" && !r.mine).length ?? 0;

  return (
    <AppScreen title="Family" onBack={onBack} accent="text-rose-500">
      {note && <Note ok={note.ok}>{note.text}</Note>}
      <div className="grid grid-cols-3 gap-1 rounded-full bg-slate-100 p-1">
        {([["partners", "❤️ Partners"], ["kids", "👶 Kids"], ["relatives", `👨‍👩‍👧 Relatives${pendingRelatives ? ` (${pendingRelatives})` : ""}`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`h-10 rounded-full text-sm font-semibold ${tab === id ? "bg-white shadow" : "text-slate-500"}`}>{label}</button>
        ))}
      </div>
      {!love ? <p className="text-center text-slate-500 py-8">Loading…</p> : (
        <>
          {love.incoming.map((q) => (
            <Card key={q.id} className="bg-rose-50">
              <div className="flex items-center gap-3">
                <Face p={q.from} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg leading-tight">{q.kind === "propose" ? `💍 @${q.from.username} proposed!` : q.kind === "baby" ? `👶 @${q.from.username} wants to have a baby with you` : `@${q.from.username} asked you out`}</p>
                  {q.kind === "propose" && <p className="text-slate-600">{ringOf(q.ring)?.name} · at {datePlaceOf(q.place)?.label}</p>}
                  {q.kind === "baby" && <p className="text-slate-600">Say yes and you&apos;re expecting: the baby arrives in {FAMILY.pregnancyDays} days.</p>}
                  {q.message && <p className="text-slate-600 italic">“{q.message}”</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Big tone="light" disabled={busy} onClick={() => run(() => respond(q.id, false), q.kind === "propose" ? "You said not yet. The ring goes back to the shop." : "You said no, kindly.")}>{q.kind === "propose" || q.kind === "baby" ? "Not yet" : "No, thanks"}</Big>
                <Big tone="red" disabled={busy} onClick={() => run(() => respond(q.id, true), q.kind === "propose" ? "💍 You're engaged! Plan the wedding below." : q.kind === "baby" ? `🤰 You're expecting! See Kids.` : `💕 You're dating @${q.from.username}.`)}>{q.kind === "propose" ? "Yes! 💍" : q.kind === "baby" ? "Yes 👶" : "Yes 💕"}</Big>
              </div>
            </Card>
          ))}

          {tab === "partners" && <Partners love={love} busy={busy} run={run} me={citizen?.username ?? ""} />}
          {tab === "kids" && <Kids rels={love.relationships} kids={family?.children ?? null} busy={busy} run={run} me={citizen?.id ?? ""} />}
          {tab === "relatives" && <Relatives me={citizen?.id ?? ""} relatives={family?.relatives ?? null} busy={busy} run={run} />}
        </>
      )}
    </AppScreen>
  );
}

// ---------------------------------------------------------------- partners

function Partners({ love, busy, run, me }: { love: NonNullable<ReturnType<typeof useLove>>; busy: boolean; run: Run; me: string }) {
  const [pick, setPick] = useState(0);
  const rels = love.relationships;
  const rel = rels[Math.min(pick, rels.length - 1)];
  return (
    <>
      {love.discoveries.map((x) => (
        <Card key={x.relationship} className="bg-amber-50 border border-amber-300">
          <div className="flex items-center gap-3">
            <Face p={x.other} />
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg leading-tight">😱 You found out about @{x.other.username}</p>
              <p className="text-slate-600">@{x.partner.username} has been {x.status === "married" ? "married to" : x.status === "engaged" ? "engaged to" : "seeing"} @{x.other.username} too. It cost you {FAMILY.discovery.heartsLost} hearts.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Big tone="light" disabled={busy} onClick={() => run(() => resolveDiscovery(x.relationship, true), `You forgave @${x.partner.username}.`)}>Forgive</Big>
            <Big tone="red" disabled={busy} onClick={() => { if (confirm(`Leave @${x.partner.username}? This ends your relationship.`)) void run(() => resolveDiscovery(x.relationship, false), "You walked away. You deserve better."); }}>Leave them</Big>
          </div>
        </Card>
      ))}
      {love.caught.map((c) => (
        <Note key={`${c.by}:${c.about}`} ok={false}>😬 @{c.by} found out about you and @{c.about}. Talk to them before they decide.</Note>
      ))}

      {rels.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rels.map((r, i) => (
            <button key={r.id} onClick={() => setPick(i)} className={`shrink-0 flex items-center gap-2 pl-1 pr-3 h-12 rounded-full ${i === pick ? "bg-rose-500 text-white" : "bg-slate-100"}`}>
              <Face p={r.partner} size={40} /><span className="font-semibold">@{r.partner.username}</span>
            </button>
          ))}
        </div>
      )}
      {rel && <Together key={rel.id} rel={rel} busy={busy} run={run} me={me} many={rels.length > 1} />}
      {love.canDate && <Single candidates={love.candidates} gender={love.gender} busy={busy} run={run} taken={rels.length > 0} />}
      {/* What came before: divorced (they'd married) or broke up. */}
      {!!love.past?.length && (
        <Card>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-1.5">Past</p>
          <div className="space-y-1.5">
            {love.past.map((x) => (
              <div key={`${x.partner.id}-${x.endedAt}`} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{x.divorced ? "💔" : "🥀"}</span>
                <span className="flex-1 min-w-0 truncate"><span className="font-bold">{x.divorced ? "Divorced" : "Broke up"}</span> · @{x.partner.username}</span>
                <span className="text-xs text-slate-400 shrink-0">{new Date(x.endedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {love.outgoing.map((o) => (
        <div key={o.id} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 text-sm">
          <span className="flex-1">{o.kind === "propose" ? "💍 Proposal" : o.kind === "baby" ? "👶 Baby" : "💌 Asked"} @{o.to} · waiting for an answer</span>
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
      <p className="text-center text-xs text-slate-400 px-4">Relationships on Dubai Life are between a man and a woman, both agreeing at every step. A man may have up to {FAMILY.maxWives} partners; a woman has one.</p>
    </>
  );
}

function Single({ candidates, gender, busy, run, taken }: { candidates: Person[]; gender: string | null; busy: boolean; run: Run; taken: boolean }) {
  const [msg, setMsg] = useState("");
  return (
    <>
      <Card className="bg-rose-50">
        <p className="font-black text-lg">{taken ? "💌 Ask someone else out" : "💌 You're single"}</p>
        <p className="text-slate-600">{taken
          ? `You can have up to ${FAMILY.maxWives} partners. Each relationship is separate, and your partners don't see each other… unless they find out.`
          : `Ask a friend out. If they say yes you're dating: show love every day and go on dates together to grow closer. With ${LOVE.levels.propose} hearts you can propose.`}</p>
      </Card>
      {!gender ? <p className="text-slate-500 px-1">Finish your avatar first so we know who you can date.</p>
        : candidates.length === 0 ? <p className="text-slate-500 px-1">No single friends to ask yet. Meet people around the city and chat; add them as friends in Phone → People.</p> : (
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

function Together({ rel, busy, run, me, many }: { rel: Relationship; busy: boolean; run: Run; me: string; many: boolean }) {
  const [screen, setScreen] = useState<"main" | "propose" | "plan">("main");
  const p = rel.partner;
  // With more than one partner, every action says which one.
  const who = many ? p.id : undefined;
  const hearts = Math.min(rel.level, LOVE.levels.propose);
  const label = rel.status === "married" ? "Married" : rel.status === "engaged" ? "Engaged" : "Dating";
  const since = new Date(rel.marriedAt ?? rel.engagedAt ?? rel.since).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (screen === "propose") return <Proposal onDone={() => setScreen("main")} run={run} busy={busy} partner={p.username} who={who} />;
  if (screen === "plan") return <Planner onDone={() => setScreen("main")} run={run} busy={busy} who={who} />;

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
        <Big tone="red" disabled={busy || rel.lovedToday} onClick={() => run(() => showLove(who), `💗 @${p.username} felt that.`)}>{rel.lovedToday ? "💗 Love shown today" : "💗 Show love (+1 a day)"}</Big>
      </Card>
      <LivingTogether partnerId={p.id} partner={p.username} busy={busy} run={run} />

      <Card>
        <p className="font-black">🌅 Date today (+{LOVE.levels.date} together)</p>
        <p className="text-sm text-slate-500">Both check in at the same place today. {rel.partnerDateToday ? `@${p.username} picked ${datePlaceOf(rel.partnerDateToday)?.label}.` : `@${p.username} hasn't picked yet.`}</p>
        <div className="grid grid-cols-2 gap-2">
          {LOVE.datePlaces.map((d) => (
            <button key={d.id} disabled={busy} onClick={() => run(() => logDate(d.id, who), rel.partnerDateToday === d.id ? `💞 Date night at ${d.label}! +${LOVE.levels.date}` : `Checked in at ${d.label}. Waiting for @${p.username}.`)}
              className={`text-left px-3 py-2.5 rounded-2xl text-sm ${rel.dateToday === d.id ? "bg-rose-500 text-white" : rel.partnerDateToday === d.id ? "bg-rose-100 ring-2 ring-rose-400" : "bg-slate-100"}`}>
              {d.icon} {d.label}
            </button>
          ))}
        </div>
      </Card>

      {rel.status === "dating" && <Big tone="dark" disabled={busy || rel.level < LOVE.levels.propose} onClick={() => setScreen("propose")}>💍 Propose</Big>}
      {rel.status === "engaged" && !rel.wedding && <Big tone="red" onClick={() => setScreen("plan")}>💒 Plan the wedding</Big>}
      {rel.wedding && <WeddingCard code={rel.wedding} me={me} />}

      <button disabled={busy} onClick={() => { if (confirm(rel.status === "married" ? `Divorce @${p.username}? This ends your marriage.` : `Break up with @${p.username}? This ends the relationship.`)) void run(() => endRelationship(who), "It's over. Take care of yourself."); }}
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

function Proposal({ onDone, run, busy, partner, who }: { onDone: () => void; run: Run; busy: boolean; partner: string; who?: string }) {
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
      <Big tone="red" disabled={busy} onClick={async () => { await run(() => propose(ring, place, message, who), `💍 Proposal sent. @${partner} will see it now.`); onDone(); }}>Propose · {aed(ringOf(ring)!.price)}</Big>
      <button onClick={onDone} className="w-full text-sm font-semibold text-slate-500">Not now</button>
    </Card>
  );
}

function Planner({ onDone, run, busy, who }: { onDone: () => void; run: Run; busy: boolean; who?: string }) {
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
      <p className="text-xs text-slate-500">You pay now. Cancelling later refunds half. On the day, you both say &ldquo;I do&rdquo; on the wedding page during the ceremony; once the wedding&apos;s over you&apos;re married.</p>
      <Big tone="green" disabled={busy} onClick={async () => { await run(() => planWedding(venue, startsAt, guests, ceremony, who), "💒 Booked! Share the invitation with your guests."); onDone(); }}>Book the wedding · {aed(cost)}</Big>
      {/* The full event: a hotel hall you pick and pay for, decorated your way or by a decorator you hire, music,
          and guests walking in live from your invite. Held after your engagement, it marries you when it ends. */}
      <div className="rounded-2xl bg-white/70 p-3 space-y-2">
        <p className="font-black">🏛️ Or hold it in an event hall</p>
        <p className="text-xs text-slate-500">Pick the hall and pay for it, choose catering, a DJ and photos, decorate it yourself or hire a decorator, and invite your guests. They come in live, with the radio on, for the zaffa, the first dance, the cake and the bouquet.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {HALLS.halls.map((h) => (
            <button key={h.id} data-hall={h.id} onClick={(e) => { gameAudio.playClickSound(); openArcade({ game: "hall", params: { hall: e.currentTarget.dataset.hall, type: "wedding" } }); }}
              className="rounded-xl bg-white px-2.5 py-2 text-left text-xs font-bold shadow-sm active:scale-95">
              {h.name}<span className="block text-[10px] font-semibold text-slate-400">up to {h.capacity.toLocaleString()} guests</span>
            </button>
          ))}
        </div>
      </div>
      <button onClick={onDone} className="w-full text-sm font-semibold text-slate-500">Back</button>
    </Card>
  );
}

// ---------------------------------------------------------------- kids

const DUBAI_KIDS_SCHOOLS = [
  { id: "little_gems", name: "🧸 Little Gems Nursery", fee: 0, perk: "Early speech & social play" },
  { id: "gems_royal", name: "🏫 GEMS Royal Dubai Academy", fee: 500, perk: "+15% Honor Roll Bonus" },
  { id: "swiss_intl", name: "🏔️ Swiss International Scientific School", fee: 1200, perk: "Bilingual IB & STEM Lab" },
  { id: "future_coding", name: "🤖 Dubai Future Coding & Robotics", fee: 2000, perk: "AI & Robotics prodigy track" },
] as const;

const HOMEWORK_QUIZZES = [
  {
    q: "1/3 Geography: Which is the tallest tower in Dubai and the world?",
    options: ["Burj Khalifa (828m)", "Dubai Frame", "Cayan Tower"],
    answer: 0,
  },
  {
    q: "2/3 Math: If a school bus has 12 seats with 2 kids per seat, how many kids ride?",
    options: ["18 kids", "24 kids", "30 kids"],
    answer: 1,
  },
  {
    q: "3/3 STEM: What powers the clean solar park in Mohammed bin Rashid Al Maktoum Solar Park?",
    options: ["Coal turbines", "Sunlight & photovoltaic panels", "Diesel generators"],
    answer: 1,
  },
] as const;

function Kids({ rels, kids, busy, run, me }: { rels: Relationship[]; kids: Child[] | null; busy: boolean; run: Run; me: string }) {
  const now = useNow();
  const { citizen } = useCitizen();
  const expecting = (p: Person) => kids?.some((k) => !k.born && Date.parse(k.dueAt) > now && (k.mother.id === p.id || k.father.id === p.id));
  const expectingChild = kids?.find((k) => !k.born && Date.parse(k.dueAt) > now);
  const pregnancyInfo = expectingChild ? calculatePregnancyStage(expectingChild, now) : null;

  const [bumpPreview, setBumpPreview] = useState<number>(0);
  const [deliveryRole, setDeliveryRole] = useState<"mother" | "father" | "doctor">("mother");
  const [deliveryProgress, setDeliveryProgress] = useState<number>(0);
  const [schoolId, setSchoolId] = useState<string>("gems_royal");
  const [quizStep, setQuizStep] = useState<number | null>(null);
  const [quizCorrect, setQuizCorrect] = useState<number>(0);

  // Automatically define and sync trimester into avatar's 3D look
  useEffect(() => {
    if (pregnancyInfo && expectingChild) {
      const isMother = expectingChild.mother.id === me || expectingChild.mother.username === me;
      if (isMother || citizen?.look?.gender === "woman") {
        // The avatar's bump itself is kept in step app-wide (LabourAlert), and taken off after the birth.
        setBumpPreview(pregnancyInfo.trimester);
      }
    }
  }, [pregnancyInfo?.trimester, expectingChild?.id, me, citizen?.look?.gender, citizen?.look?.pregnantWeeks]);

  return (
    <>
      {rels.length === 0 && !kids?.length && (
        <Card className="bg-sky-50">
          <p className="font-black text-lg">👶 Starting a family</p>
          <p className="text-slate-600">When you&apos;re with someone, you can decide together to have a baby. The pregnancy lasts {FAMILY.pregnancyDays} days, then your baby grows a new stage every week: crawling, first steps, running around, first words, nursery and school.</p>
        </Card>
      )}
      {rels.map((r) => (
        <Big key={r.id} tone="blue" disabled={busy || expecting(r.partner)}
          onClick={() => run(() => askForBaby(rels.length > 1 ? r.partner.id : undefined), `👶 Asked @${r.partner.username}. You both have to say yes.`)}>
          {expecting(r.partner) ? `🤰 Expecting with @${r.partner.username}` : `👶 Have a baby with @${r.partner.username}`}
        </Big>
      ))}

      {/* #6: 3D Pregnancy Bump Customizer & 3-Role Hospital Delivery Room Mini-Game */}
      <Card className="bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 border border-pink-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-base text-rose-950">🤰 3D Pregnancy Bump &amp; Delivery Suite</p>
            <p className="text-xs text-slate-600">Trimester bump auto-syncs with pregnancy duration &amp; days left!</p>
          </div>
          <span className="text-2xl">🏥</span>
        </div>

        {/* Dynamic Timeline Notification */}
        {pregnancyInfo ? (
          <div className="p-2.5 rounded-xl bg-white/90 border border-rose-300 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto-Synced: {pregnancyInfo.trimesterLabel}</span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium">
                {pregnancyInfo.daysLeft} day{pregnancyInfo.daysLeft === 1 ? "" : "s"} left until birth (Day {pregnancyInfo.elapsedDays} of {pregnancyInfo.totalDays})
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] tracking-wide uppercase shadow-sm">
              Trimester {pregnancyInfo.trimester}
            </span>
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-white/60 border border-slate-200 text-[11px] text-slate-600">
            💡 When expecting, your avatar bump automatically advances through Trimesters 1, 2, and 3 based on duration and days left.
          </div>
        )}

        {/* 3D Baby Bump Trimester Switcher */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-700">🤰 3D Avatar Baby Bump Stage:</p>
            {pregnancyInfo && (
              <span className="text-[10px] font-bold text-rose-600">
                Matches current clothing tint
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { w: 0, label: "None" },
              { w: 1, label: "Tri 1" },
              { w: 2, label: "Tri 2" },
              { w: 3, label: "Tri 3 (Full)" },
            ].map((b) => {
              const isAuto = pregnancyInfo?.trimester === b.w;
              const isSelected = bumpPreview === b.w;
              return (
                <button
                  key={b.w}
                  type="button"
                  onClick={() => {
                    gameAudio.playClickSound();
                    setBumpPreview(b.w);
                    updateCitizen((c) => ({
                      ...c,
                      look: { ...(c.look ?? { gender: "woman" }), pregnantWeeks: b.w || undefined },
                    }));
                  }}
                  className={`py-2 rounded-xl text-xs font-black border transition-all relative ${
                    isSelected
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white text-slate-700 border-rose-200 hover:bg-rose-50"
                  }`}
                >
                  {b.label}
                  {isAuto && (
                    <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-emerald-500 text-white text-[8px] font-black shadow">
                      AUTO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3-Role Hospital Childbirth Mini-Game */}
        <div className="p-3 rounded-2xl bg-white border border-rose-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900">🏥 3-Role Hospital Delivery Room</span>
            <span className="text-[11px] font-bold text-rose-600">{deliveryProgress}/3 Steps</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "mother" as const, label: "🤰 Mother" },
              { id: "father" as const, label: "🤝 Partner" },
              { id: "doctor" as const, label: "🩺 Doctor" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  gameAudio.playClickSound();
                  setDeliveryRole(r.id);
                }}
                className={`py-1.5 rounded-xl text-xs font-black ${
                  deliveryRole === r.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            {deliveryRole === "mother"
              ? "🤰 Mother Role: Tap on the contraction breathing ring to keep calm & push safely!"
              : deliveryRole === "father"
                ? "🤝 Partner Role: Hold hand, wipe brow & coach breathing to boost comfort to 100%!"
                : "🩺 Doctor Role: Monitor fetal heartbeat, guide delivery & stamp the Dubai Birth Certificate!"}
          </p>
          {deliveryProgress < 3 ? (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClickSound();
                const next = deliveryProgress + 1;
                setDeliveryProgress(next);
                if (next >= 3) {
                  gameAudio.playCoinSound();
                  adjustBalance(300);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs active:scale-95"
            >
              {deliveryRole === "mother"
                ? `🌬️ Breathe & Push (${deliveryProgress}/3)`
                : deliveryRole === "father"
                  ? `🤝 Hold Hand & Wipe Brow (${deliveryProgress}/3)`
                  : `🩺 Guide Safe Delivery (${deliveryProgress}/3)`}
            </button>
          ) : (
            <div className="space-y-1.5 text-center">
              <div className="text-xs font-black text-emerald-700">
                👶🎉 Healthy Delivery Complete! Official Dubai Birth Certificate Issued (+AED 300 Bonus)!
              </div>
              <button
                type="button"
                onClick={() => setDeliveryProgress(0)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-black text-xs"
              >
                Replay Delivery Suite
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* #7: Dubai Kids' Schools & Playable Homework Speed-Quiz */}
      <Card className="bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50 border border-indigo-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-base text-indigo-950">🎓 Dubai Kids&apos; Academy &amp; Homework Quiz</p>
            <p className="text-xs text-slate-600">Enroll your kids in top Dubai schools &amp; help them ace their 3-question speed homework!</p>
          </div>
          <span className="text-2xl">🏫</span>
        </div>

        <div className="space-y-1.5">
          {DUBAI_KIDS_SCHOOLS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                gameAudio.playClickSound();
                setSchoolId(sc.id);
              }}
              className={`w-full p-2.5 rounded-2xl text-left border flex items-center justify-between transition-all ${
                schoolId === sc.id ? "bg-white border-indigo-500 ring-2 ring-indigo-200" : "bg-white/60 border-slate-200"
              }`}
            >
              <div>
                <div className="text-xs font-black text-slate-900">{sc.name}</div>
                <div className="text-[11px] text-slate-500">{sc.perk}</div>
              </div>
              <span className="text-xs font-black text-indigo-700">{sc.fee ? aed(sc.fee) : "Free"}</span>
            </button>
          ))}
        </div>

        {quizStep === null ? (
          <button
            type="button"
            onClick={() => {
              gameAudio.playClickSound();
              setQuizStep(0);
              setQuizCorrect(0);
            }}
            className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs active:scale-95"
          >
            📝 Play 30s Homework Speed-Quiz (+AED 250 Honor Roll Scholarship)
          </button>
        ) : quizStep < HOMEWORK_QUIZZES.length ? (
          <div className="p-3 rounded-2xl bg-white border border-indigo-200 space-y-2">
            <div className="text-xs font-black text-slate-900">{HOMEWORK_QUIZZES[quizStep].q}</div>
            <div className="space-y-1.5">
              {HOMEWORK_QUIZZES[quizStep].options.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const isRight = idx === HOMEWORK_QUIZZES[quizStep].answer;
                    const nextRight = quizCorrect + (isRight ? 1 : 0);
                    setQuizCorrect(nextRight);
                    if (quizStep + 1 >= HOMEWORK_QUIZZES.length) {
                      gameAudio.playCoinSound();
                      if (nextRight >= 2) adjustBalance(250);
                    } else {
                      gameAudio.playClickSound();
                    }
                    setQuizStep(quizStep + 1);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left text-xs font-bold text-slate-800"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-white border border-emerald-200 text-center space-y-2">
            <div className="text-sm font-black text-emerald-700">
              🎓 Scored {quizCorrect}/{HOMEWORK_QUIZZES.length}! {quizCorrect >= 2 ? "Honor Roll Scholarship +AED 250 Awarded!" : "Good practice!"}
            </div>
            <button
              type="button"
              onClick={() => setQuizStep(null)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-xs"
            >
              Done
            </button>
          </div>
        )}
      </Card>

      {kids === null ? <p className="text-center text-slate-500 py-4">Loading…</p> : kids.map((k) => <ChildCard key={k.id} child={k} busy={busy} run={run} me={me} now={now} />)}
    </>
  );
}

function ChildCard({ child: k, busy, run, me, now }: { child: Child; busy: boolean; run: Run; me: string; now: number }) {
  const [name, setName] = useState("");
  const other = k.mother.id === me ? k.father : k.mother;
  const born = Date.parse(k.dueAt) <= now;
  const display = k.name ?? (k.gender === "boy" ? "Baby boy" : "Baby girl");
  const suggestions = FAMILY.babyNames[k.gender];

  if (!born) {
    const stage = calculatePregnancyStage(k, now);
    return (
      <Card className="bg-gradient-to-br from-sky-50 to-pink-50 border border-pink-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="font-black text-lg">🤰 Expecting {k.name ? k.name : `a ${k.gender}`} with @{other.username}</p>
          <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-xs shadow-sm">
            {stage.trimesterLabel}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Stage: {stage.trimesterLabel} (Day {stage.elapsedDays} of {stage.totalDays})</span>
            <span className="text-rose-600 font-black">{stage.daysLeft} day{stage.daysLeft === 1 ? "" : "s"} left ({stage.progressPct}%)</span>
          </div>
          <div className="h-3 rounded-full bg-white overflow-hidden border border-pink-200">
            <div className="h-full bg-gradient-to-r from-pink-400 to-rose-600 transition-all duration-500" style={{ width: `${stage.progressPct}%` }} />
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Due on {stage.dueAtFormatted}. Your 3D avatar baby bump is automatically set to {stage.trimesterLabel} and styled to match your clothing. Choose a baby name together:
        </p>
        <NameRow name={name} setName={setName} suggestions={suggestions} busy={busy} onSave={(n) => run(() => nameChild(k.id, n), `💕 ${n} it is.`)} />
      </Card>
    );
  }

  const { days, weeks, stage, next } = stageOf(k, now);
  const happy = happinessOf(k, now);
  const nanny = k.nannyUntil && Date.parse(k.nannyUntil) > now;
  const nextIn = next ? Math.max(1, Math.ceil((Date.parse(k.dueAt) + next.day * 86_400_000 - now) / 86_400_000)) : null;
  return (
    <Card className="bg-gradient-to-br from-amber-50 to-pink-50">
      <div className="flex items-center gap-3">
        <span className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-4xl shrink-0">{stage.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-black truncate">{display} {k.gender === "boy" ? "👦" : "👧"}</p>
          <p className="text-sm font-semibold text-rose-600">{stage.label} · {days === 0 ? "born today" : days < 14 ? `${days} day${days === 1 ? "" : "s"} old` : `${weeks} weeks old`}</p>
          <p className="text-sm text-slate-500">with @{other.username}</p>
        </div>
      </div>
      <p className="text-slate-600">{stage.text}</p>
      {next && <p className="text-xs text-slate-500">Next milestone in {nextIn} day{nextIn === 1 ? "" : "s"}: {next.icon} {next.label}</p>}
      {!k.name && <NameRow name={name} setName={setName} suggestions={suggestions} busy={busy} onSave={(n) => run(() => nameChild(k.id, n), `💕 Welcome, ${n}!`)} />}

      <div>
        <div className="flex justify-between text-xs font-semibold text-slate-500"><span>Happiness</span><span>{happy}%</span></div>
        <div className="h-2.5 rounded-full bg-white overflow-hidden"><div className={`h-full ${happy >= 60 ? "bg-emerald-500" : happy >= 30 ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${happy}%` }} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {FAMILY.care.map((c) => {
          const done = k.careToday.includes(c.id as "feed");
          return (
            <button key={c.id} disabled={busy || done} onClick={() => run(() => careForChild(k.id, c.id), `${c.icon} ${display} loved that.`)}
              className={`h-14 rounded-2xl text-sm font-semibold flex flex-col items-center justify-center ${done ? "bg-emerald-100 text-emerald-700" : "bg-white"}`}>
              <span className="text-xl leading-none">{done ? "✓" : c.icon}</span>{c.label}
            </button>
          );
        })}
      </div>
      {nanny ? (
        <p className="text-sm font-semibold text-emerald-700">🧑‍🍼 A nanny is looking after {display} until {new Date(k.nannyUntil!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {FAMILY.nanny.map((n) => (
            <button key={n.id} disabled={busy} onClick={() => run(() => hireNanny(k.id, n.id), `🧑‍🍼 Nanny hired for ${n.label.toLowerCase()}.`)} className="h-12 rounded-2xl bg-slate-900 text-white text-sm font-semibold">
              🧑‍🍼 Nanny · {n.label} · {aed(n.price)}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function NameRow({ name, setName, suggestions, busy, onSave }: { name: string; setName: (s: string) => void; suggestions: string[]; busy: boolean; onSave: (n: string) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder="A name" className="flex-1 min-w-0 h-11 px-4 rounded-full bg-white outline-none" />
        <button disabled={busy || !name.trim()} onClick={() => onSave(name.trim())} className="h-11 px-4 rounded-full bg-rose-500 text-white font-semibold disabled:opacity-50">Save</button>
      </div>
      <div className="flex gap-1.5 flex-wrap">{suggestions.slice(0, 6).map((n) => <button key={n} onClick={() => setName(n)} className="px-3 h-8 rounded-full bg-white/80 text-sm">{n}</button>)}</div>
    </>
  );
}

// ---------------------------------------------------------------- relatives

async function friendsOf(me: string): Promise<Contact[]> {
  const { data } = await supabase().from("friendships").select("user_id, friend_id").or(`user_id.eq.${me},friend_id.eq.${me}`).eq("status", "accepted");
  const ids = (data ?? []).map((f) => (f.user_id === me ? f.friend_id : f.user_id) as string);
  return [...(await contacts(ids)).values()].sort((a, b) => a.username.localeCompare(b.username));
}

function Relatives({ me, relatives, busy, run }: { me: string; relatives: Relative[] | null; busy: boolean; run: Run }) {
  const [friends, setFriends] = useState<Contact[] | null>(null);
  const [relation, setRelation] = useState<Relation>("sibling");
  useEffect(() => { if (me) void friendsOf(me).then(setFriends); }, [me]);
  const linked = new Set((relatives ?? []).map((r) => r.person.id));
  const accepted = (relatives ?? []).filter((r) => r.status === "accepted");
  const incoming = (relatives ?? []).filter((r) => r.status === "pending" && !r.mine);
  const outgoing = (relatives ?? []).filter((r) => r.status === "pending" && r.mine);

  return (
    <>
      {incoming.map((r) => (
        <Card key={r.id} className="bg-violet-50">
          <div className="flex items-center gap-3">
            <Face p={r.person} />
            <p className="flex-1 font-black">@{r.person.username} says they&apos;re your {relationLabel(r.relation, r.person.look?.gender).toLowerCase()}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Big tone="light" disabled={busy} onClick={() => run(() => respondRelative(r.id, false), "Declined.")}>Not family</Big>
            <Big tone="dark" disabled={busy} onClick={() => run(() => respondRelative(r.id, true), `👨‍👩‍👧 @${r.person.username} is family.`)}>Yes, family</Big>
          </div>
        </Card>
      ))}

      <Card>
        <p className="font-black text-lg">👨‍👩‍👧 Your family</p>
        {relatives === null ? <p className="text-slate-500">Loading…</p> : accepted.length === 0 ? <p className="text-slate-500">Add your brother, sister, parents, children or cousins who play. They have to say yes.</p> : accepted.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <Face p={r.person} size={44} />
            <div className="flex-1 min-w-0"><p className="font-semibold truncate">@{r.person.username}</p><p className="text-sm text-slate-500">{relationLabel(r.relation, r.person.look?.gender)}</p></div>
            <button disabled={busy} onClick={() => { if (confirm(`Remove @${r.person.username} from your family?`)) void run(() => removeRelative(r.id), "Removed."); }} className="text-sm font-semibold text-slate-400">Remove</button>
          </div>
        ))}
        {outgoing.map((r) => <p key={r.id} className="text-sm text-slate-500">Waiting for @{r.person.username} to confirm ({relationLabel(r.relation, r.person.look?.gender).toLowerCase()})</p>)}
      </Card>

      <Card>
        <p className="font-black">➕ Add a relative</p>
        <p className="text-sm text-slate-500">They are my…</p>
        <div className="grid grid-cols-4 gap-1.5">
          {FAMILY.relations.map((r) => (
            <button key={r.id} onClick={() => setRelation(r.id as Relation)} className={`h-11 rounded-full text-xs font-semibold ${relation === r.id ? "bg-violet-600 text-white" : "bg-slate-100"}`}>{r.icon} {r.id === "sibling" ? "Sibling" : r.id === "parent" ? "Parent" : r.id === "child" ? "Child" : "Cousin"}</button>
          ))}
        </div>
        {friends === null ? <p className="text-slate-500">Loading friends…</p> : friends.filter((f) => !linked.has(f.id)).length === 0 ? <p className="text-slate-500">Add them as a friend first (Phone → People), then come back.</p>
          : friends.filter((f) => !linked.has(f.id)).map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <Face p={{ look: (f.look ?? null) as Person["look"] }} size={40} />
              <span className="flex-1 font-semibold truncate">@{f.username}</span>
              <button disabled={busy} onClick={() => run(() => addRelative(f.id, relation), `Asked @${f.username} to confirm.`)} className="h-9 px-3 rounded-full bg-violet-600 text-white text-sm font-semibold disabled:opacity-50">Add</button>
            </div>
          ))}
      </Card>
    </>
  );
}

/** Moving in together: ask your partner to move into your home; they move in when they say yes (they get the keys:
    come and go, decorate). Once you live together, both of you are in the home live and can chat. Either can move out. */
function LivingTogether({ partnerId, partner, busy, run }: { partnerId: string; partner: string; busy: boolean; run: Run }) {
  const { citizen } = useCitizen();
  const [homes, setHomes] = useState<SharedHome[] | null>(null);
  const [asks, setAsks] = useState<MoveInRequest[]>([]);
  const load = () => { void myHousehold().then(setHomes); void myMoveInRequests().then(setAsks); };
  useEffect(() => {
    load();
    // Live: an answer (or a new ask) reloads at once; a slow poll as a fallback.
    const off = citizen?.id ? onUserEvent(citizen.id, "love", load) : undefined;
    const t = setInterval(load, 20_000);
    return () => { off?.(); clearInterval(t); };
  }, [partnerId, citizen?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const shared = homes?.find((h) => h.partner === partnerId);
  const ask = asks.find((q) => q.partner === partnerId);
  if (!homes) return null;
  if (!shared) {
    if (ask?.incoming) {
      return (
        <Card className="bg-amber-50">
          <p className="font-black">🏠 @{partner} asked you to move in</p>
          <p className="text-sm text-slate-600">Say yes and you get the keys to their home: come and go as you like, decorate together, and be there with them live.</p>
          <Big tone="green" disabled={busy} onClick={async () => { await run(() => respondMoveIn(ask.id, true), `🏠 You moved in with @${partner}!`); load(); }}>Yes, move in</Big>
          <button disabled={busy} onClick={async () => { await run(() => respondMoveIn(ask.id, false), "You said not yet."); load(); }} className="w-full text-sm font-semibold text-slate-500 py-1">Not now</button>
        </Card>
      );
    }
    if (ask) {
      return (
        <Card>
          <p className="font-black">🏠 Waiting for @{partner}</p>
          <p className="text-sm text-slate-500">You asked @{partner} to move in. They&apos;ll move in when they say yes.</p>
          <button disabled={busy} onClick={async () => { await run(() => respondMoveIn(ask.id, false), "Request taken back."); load(); }} className="w-full text-sm font-semibold text-slate-500 py-1">Take it back</button>
        </Card>
      );
    }
    return (
      <Card>
        <p className="font-black">🏠 Live together</p>
        <p className="text-sm text-slate-500">Ask @{partner} to move into your home. If they say yes, you&apos;ll both be there live: see each other, chat and spend time together.</p>
        <Big tone="green" disabled={busy} onClick={async () => { await run(() => askMoveIn(partnerId), `💌 Asked @${partner} to move in.`); load(); }}>Ask @{partner} to move in</Big>
      </Card>
    );
  }
  const where = /^\d/.test(shared.unit) ? `${shared.type} ${shared.unit}` : `${shared.type} · ${shared.unit}`;
  const href = shared.host ? "/home" : `/property/${shared.building}/${encodeURIComponent(shared.unit)}`;
  return (
    <Card className="bg-emerald-50">
      <p className="font-black">🏠 Living together</p>
      <p className="text-sm text-slate-600">{shared.host ? `@${partner} lives with you at your ${where}.` : `You live with @${partner} at their ${where}.`} When you&apos;re both home you see each other live.</p>
      <Link href={href} onClick={() => { if (!shared.host) partyDoor(href); }} className="block w-full h-12 leading-[3rem] text-center rounded-2xl bg-emerald-600 text-white font-black">Go home</Link>
      <button disabled={busy} onClick={async () => { if (confirm("Stop living together?")) { await run(() => moveOut(partnerId), "You don't live together any more."); load(); } }}
        className="w-full text-sm font-semibold text-slate-400 py-1">Move out</button>
    </Card>
  );
}
