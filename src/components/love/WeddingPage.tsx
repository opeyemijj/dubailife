"use client";

// A wedding's page, opened from the invitation link. Guests RSVP and send gifts; the couple shares the
// invitation, gives guests roles and, during the ceremony, both say "I do". Someone without an account is
// sent to sign up and brought back here afterwards.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { useCitizen } from "@/lib/citizenStore";
import { useNow } from "@/lib/dubaiClock";
import { ceremonyOf, giveGift, LOVE, ringOf, rsvp, sayIDo, setRole, venueOf, weddingLink, weddingView, type Person, type WeddingView } from "@/lib/love";
import { gameAudio } from "@/utils/gameAudio";

export const PENDING_WEDDING = "dubai_pending_wedding";
const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
const Face = ({ p, size = 72 }: { p: Pick<Person, "look">; size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={rosterThumb(presetFor(p.look ?? { gender: "woman" }))} alt="" style={{ width: size, height: size }} className="rounded-full object-cover object-top bg-white ring-4 ring-white shadow-lg" />
);

export function WeddingPage({ code }: { code: string }) {
  const router = useRouter();
  const { citizen, hydrated, isLoggedIn } = useCitizen();
  const now = useNow();
  const [w, setW] = useState<WeddingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [gift, setGift] = useState(500);
  const [giftMsg, setGiftMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await weddingView(code);
    if (r.data) setW(r.data); else setError(r.error ?? "This wedding couldn't be found.");
  }, [code]);

  // Not signed in: remember the invitation, sign up (keeping the inviter as referrer), and come back.
  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      try { localStorage.setItem(PENDING_WEDDING, code); } catch { /* storage off */ }
      const ref = new URLSearchParams(window.location.search).get("ref");
      router.replace(`/?signup=true${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`);
      return;
    }
    try { if (localStorage.getItem(PENDING_WEDDING) === code) localStorage.removeItem(PENDING_WEDDING); } catch { /* storage off */ }
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => void load(), 10_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [hydrated, isLoggedIn, code, load, router]);

  const run = async (fn: () => Promise<{ error?: string }>, ok: string) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: ok });
    if (!r.error) gameAudio.playCoinSound();
    void load();
  };

  if (error) return <Shell><p className="text-center text-slate-600 py-20">{error}</p></Shell>;
  if (!w || !now) return <Shell><p className="text-center text-slate-500 py-20">Opening the invitation…</p></Shell>;

  const venue = venueOf(w.venue), ceremony = ceremonyOf(w.ceremony);
  const start = Date.parse(w.startsAt);
  const minutes = (now - start) / 60_000;
  const live = w.status === "planned" && minutes >= -LOVE.iDoWindow.beforeMinutes && minutes <= LOVE.iDoWindow.afterMinutes;
  const couple = w.me === "man" || w.me === "woman";
  const iSaid = w.me === "man" ? w.iDoMan : w.me === "woman" ? w.iDoWoman : false;
  const when = new Date(start).toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
  const untilText = (() => {
    const ms = start - now;
    if (ms <= 0) return "now";
    const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
    return d ? `in ${d}d ${h}h` : h ? `in ${h}h ${m}m` : `in ${m}m`;
  })();
  const step = [...LOVE.programme].reverse().find((s) => minutes >= s.at);

  return (
    <Shell>
      {/* The couple */}
      <div className="text-center space-y-3 pt-4">
        <p className="text-sm font-semibold tracking-[0.2em] uppercase text-amber-700">{w.status === "done" ? "Just married" : "You're invited"}</p>
        <div className="flex items-center justify-center gap-3">
          <Face p={w.man} /><span className="text-3xl">{w.status === "done" ? "💞" : ringOf(w.ring)?.icon ?? "💍"}</span><Face p={w.woman} />
        </div>
        <h1 className="text-3xl font-black tracking-tight">@{w.man.username} &amp; @{w.woman.username}</h1>
        <p className="text-slate-600">{venue?.icon} {venue?.name}</p>
        <p className="text-slate-600">{when} · {ceremony?.name}</p>
        {w.status === "planned" && !live && <p className="inline-block px-4 py-1.5 rounded-full bg-white shadow text-sm font-semibold">Starts {untilText}</p>}
        {w.status === "missed" && <p className="text-rose-600 font-semibold">The ceremony window passed without both &ldquo;I do&rdquo;s.</p>}
        {w.status === "cancelled" && <p className="text-rose-600 font-semibold">This wedding was cancelled.</p>}
      </div>

      {note && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${note.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{note.text}</p>}

      {/* The ceremony, live */}
      {(live || w.status === "done") && (
        <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
          <p className="font-black text-lg">{w.status === "done" ? "🎉 They're married!" : "🔴 The ceremony is on"}</p>
          <ol className="space-y-2">
            {LOVE.programme.map((s) => (
              <li key={s.at} className={`flex items-center gap-3 px-3 py-2 rounded-2xl ${step === s && w.status !== "done" ? "bg-amber-100 font-semibold" : "text-slate-500"}`}>
                <span className="text-xl">{s.icon}</span>{s.text}
              </li>
            ))}
          </ol>
          {w.status === "planned" && (
            <p className="text-sm text-slate-600">&ldquo;I do&rdquo;: @{w.man.username} {w.iDoMan ? "✅" : "…"} · @{w.woman.username} {w.iDoWoman ? "✅" : "…"}</p>
          )}
          {couple && w.status === "planned" && (
            <button disabled={busy || iSaid} onClick={() => run(() => sayIDo(code), "💍 You said I do.")} className="w-full h-16 rounded-full bg-rose-500 text-white text-2xl font-semibold shadow-[inset_0_-5px_0_rgba(0,0,0,0.18)] disabled:opacity-60">
              {iSaid ? "You said “I do” 💗" : "I do 💍"}
            </button>
          )}
          <Link href={`/place/${w.venue}`} className="block text-center font-semibold text-sky-600">Go to {venue?.name.split(",")[0]} →</Link>
        </section>
      )}

      {/* Guests: RSVP and gifts */}
      {!couple && w.status === "planned" && (
        <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
          {w.me === "guest" ? (
            <>
              <p className="font-black text-lg">✅ You&apos;re going</p>
              <button disabled={busy} onClick={() => run(() => rsvp(code, false), "You've let them know you can't make it.")} className="text-sm font-semibold text-slate-500">Can&apos;t make it after all</button>
            </>
          ) : (
            <button disabled={busy || w.guests.length >= w.guestsMax} onClick={() => run(() => rsvp(code, true), "🎉 You're on the guest list!")} className="w-full h-16 rounded-full bg-emerald-700 text-white text-xl font-semibold shadow-[inset_0_-5px_0_rgba(0,0,0,0.2)] disabled:opacity-50">
              {w.guests.length >= w.guestsMax ? "The guest list is full" : "RSVP: I'll be there"}
            </button>
          )}
        </section>
      )}
      {!couple && (w.me === "guest" || w.status === "done") && w.status !== "cancelled" && (
        <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
          <p className="font-black text-lg">🎁 Send a gift</p>
          <div className="grid grid-cols-4 gap-2">{[100, 500, 1000, 5000].map((a) => <button key={a} onClick={() => setGift(a)} className={`h-11 rounded-full font-semibold ${gift === a ? "bg-amber-500 text-white" : "bg-slate-100"}`}>{a.toLocaleString()}</button>)}</div>
          <input value={giftMsg} onChange={(e) => setGiftMsg(e.target.value)} maxLength={200} placeholder="Mabrook! A message for the couple" className="w-full h-12 px-4 rounded-full bg-slate-100 outline-none" />
          <button disabled={busy || (citizen?.balance ?? 0) < gift} onClick={() => run(() => giveGift(code, gift, giftMsg), `🎁 ${aed(gift)} sent to the couple.`)} className="w-full h-14 rounded-full bg-slate-900 text-white font-semibold disabled:opacity-50">Give {aed(gift)}</button>
        </section>
      )}

      {/* The couple's tools */}
      {couple && w.status === "planned" && <Invite code={code} me={citizen?.username ?? ""} />}

      {/* Guest list */}
      <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="font-black text-lg">Guest list</p>
          <p className="text-sm text-slate-500">{w.guests.length} / {w.guestsMax}{w.gifts ? ` · ${aed(w.gifts)} in gifts` : ""}</p>
        </div>
        {w.guests.length === 0 ? <p className="text-slate-500">No guests yet{couple ? ": share your invitation." : "."}</p> : w.guests.map((g) => (
          <div key={g.id} className="flex items-center gap-3">
            <Face p={g} size={40} />
            <span className="flex-1 font-semibold truncate">@{g.username}</span>
            {couple && w.status === "planned" ? (
              <select value={g.role} onChange={(e) => void run(() => setRole(code, g.id, e.target.value), "Role updated.")} className="h-9 rounded-full bg-slate-100 px-2 text-sm">
                {Object.entries(LOVE.roles).map(([id, r]) => <option key={id} value={id}>{r.name}</option>)}
              </select>
            ) : g.role !== "guest" && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">{LOVE.roles[g.role].name}</span>}
          </div>
        ))}
      </section>
    </Shell>
  );
}

function Invite({ code, me }: { code: string; me: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = weddingLink(code, me);
    const text = "You're invited to our wedding on Dubai Life 💍 Tap to RSVP:";
    if (navigator.share) { try { await navigator.share({ title: "Wedding invitation", text, url }); } catch { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); } catch { /* blocked */ }
  };
  return (
    <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
      <p className="font-black text-lg">💌 Invite your guests</p>
      <p className="text-slate-600">Send the link on WhatsApp or anywhere. Friends who aren&apos;t on Dubai Life yet can join from it and RSVP. Give your closest friends roles: best man, maid of honour, bridesmaids and groomsmen.</p>
      <button onClick={share} className="w-full h-14 rounded-full bg-emerald-700 text-white font-semibold shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]">{copied ? "Link copied ✓" : "Share the invitation"}</button>
      <p className="text-center text-xs text-slate-400">On the day, open this page and both tap &ldquo;I do&rdquo; during the ceremony.</p>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-amber-50 via-rose-50 to-white text-slate-900">
      <div className="max-w-md mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 space-y-4">
        <Link href="/explore" className="inline-block text-sm font-semibold text-slate-500">← Dubai Life</Link>
        {children}
      </div>
    </main>
  );
}
