"use client";

// A wedding's page, opened from the invitation link. Guests RSVP and send gifts; the couple shares the
// invitation, gives guests roles and, during the ceremony, both say "I do". Someone without an account is
// sent to sign up and brought back here afterwards.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { presetFor, rosterThumb } from "@/components/avatar/roster";
import { adjustBalance, updateCitizen, useCitizen } from "@/lib/citizenStore";
import { useNow } from "@/lib/dubaiClock";
import {
  ceremonyOf,
  giveGift,
  LOVE,
  ringOf,
  rsvp,
  sayIDo,
  setRole,
  venueOf,
  weddingLink,
  weddingView,
  type Person,
  type WeddingView,
} from "@/lib/love";
import { gameAudio } from "@/utils/gameAudio";

const CULTURAL_WEDDING_STYLES = [
  {
    id: "lagos_owambe",
    flag: "🇳🇬",
    name: "Lagos Owambe & Asoebi",
    subtitle:
      "Gele, Agbada, Asoebi color code & live AED money spraying!",
    actionLabel: "💸 Spray AED 200 on the Couple!",
    rewardToast: "🇳🇬💸 Oshey! You sprayed crisp AED notes at the Lagos Owambe!",
  },
  {
    id: "indian_shaadi",
    flag: "🇮🇳",
    name: "Indian Grand Shaadi & Saptapadi",
    subtitle:
      "Royal Baraat, Jai Mala floral garlands & 7 sacred steps around the Agni fire.",
    actionLabel: "🔥 Take Sacred Saptapadi Blessing",
    rewardToast:
      "🇮🇳🌸 Subh Vivah! Floral petals and Saptapadi blessings shower the couple!",
  },
  {
    id: "kenyan_harusi",
    flag: "🇰🇪",
    name: "Kenyan Harusi & Ruracio",
    subtitle:
      "Maasai Shuka regalia, beadwork crowns & joyful Harusi line dance.",
    actionLabel: "🛡️ Join Maasai Blessing Jump",
    rewardToast: "🇰🇪✨ Hongera! You led the Kenyan Harusi blessing dance!",
  },
  {
    id: "cameroon_toghu",
    flag: "🇨🇲",
    name: "Cameroonian Royal Toghu",
    subtitle:
      "Bamenda velvet gold-embroidered Toghu, kola nut & ancestral palm wine toast.",
    actionLabel: "🍷 Pour Royal Toghu Libation",
    rewardToast:
      "🇨🇲👑 Royal Toghu blessing! Kola nut & palm wine shared with the elders!",
  },
  {
    id: "emirati_zaffa",
    flag: "🇦🇪",
    name: "Emirati Royal Zaffa & Al-Ayyala",
    subtitle:
      "Oud incense, gold Bisht, Al-Ayyala drums & Dubai palace hospitality.",
    actionLabel: "🥁 Beat Royal Zaffa Drums",
    rewardToast: "🇦🇪🥁 Alf Mabrook! The Emirati Zaffa drums echo across Dubai!",
  },
] as const;

const ASOEBI_PALETTES = [
  {
    id: "emerald_gold",
    label: "Emerald & Gold",
    primary: "#065f46",
    secondary: "#d4af37",
  },
  {
    id: "royal_coral",
    label: "Royal Blue & Coral",
    primary: "#1e3a8a",
    secondary: "#fb7185",
  },
  {
    id: "champagne_rose",
    label: "Champagne & Rose",
    primary: "#f5d0fe",
    secondary: "#be185d",
  },
  {
    id: "burgundy_gold",
    label: "Burgundy & Gold",
    primary: "#7f1d1d",
    secondary: "#f59e0b",
  },
  {
    id: "teal_silver",
    label: "Teal & Silver",
    primary: "#0f766e",
    secondary: "#e2e8f0",
  },
] as const;

export const PENDING_WEDDING = "dubai_pending_wedding";
const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
const Face = ({ p, size = 72 }: { p: Pick<Person, "look">; size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={rosterThumb(presetFor(p.look ?? { gender: "woman" }))}
    alt=""
    style={{ width: size, height: size }}
    className="rounded-full object-cover object-top bg-white ring-4 ring-white shadow-lg"
  />
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
  const [cultureId, setCultureId] =
    useState<(typeof CULTURAL_WEDDING_STYLES)[number]["id"]>("lagos_owambe");
  const [asoebiId, setAsoebiId] =
    useState<(typeof ASOEBI_PALETTES)[number]["id"]>("emerald_gold");
  const [sprayedTotal, setSprayedTotal] = useState(0);
  const [wearingAsoebi, setWearingAsoebi] = useState(false);

  const load = useCallback(async () => {
    const r = await weddingView(code);
    if (r.data) setW(r.data);
    else setError(r.error ?? "This wedding couldn't be found.");
  }, [code]);

  // Not signed in: remember the invitation, sign up (keeping the inviter as referrer), and come back.
  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      try {
        localStorage.setItem(PENDING_WEDDING, code);
      } catch {
        /* storage off */
      }
      const ref = new URLSearchParams(window.location.search).get("ref");
      router.replace(
        `/?signup=true${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`,
      );
      return;
    }
    try {
      if (localStorage.getItem(PENDING_WEDDING) === code)
        localStorage.removeItem(PENDING_WEDDING);
    } catch {
      /* storage off */
    }
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => void load(), 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [hydrated, isLoggedIn, code, load, router]);

  const run = async (fn: () => Promise<{ error?: string }>, ok: string) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    setNote(r.error ? { ok: false, text: r.error } : { ok: true, text: ok });
    if (!r.error) gameAudio.playCoinSound();
    void load();
  };

  if (error)
    return (
      <Shell>
        <p className="text-center text-slate-600 py-20">{error}</p>
      </Shell>
    );
  if (!w || !now)
    return (
      <Shell>
        <p className="text-center text-slate-500 py-20">
          Opening the invitation…
        </p>
      </Shell>
    );

  const venue = venueOf(w.venue),
    ceremony = ceremonyOf(w.ceremony);
  const start = Date.parse(w.startsAt);
  const minutes = (now - start) / 60_000;
  const live =
    w.status === "planned" &&
    minutes >= -LOVE.iDoWindow.beforeMinutes &&
    minutes <= LOVE.iDoWindow.afterMinutes;
  const couple = w.me === "man" || w.me === "woman";
  const iSaid =
    w.me === "man" ? w.iDoMan : w.me === "woman" ? w.iDoWoman : false;
  const when = new Date(start).toLocaleString("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
  const untilText = (() => {
    const ms = start - now;
    if (ms <= 0) return "now";
    const d = Math.floor(ms / 86_400_000),
      h = Math.floor((ms % 86_400_000) / 3_600_000),
      m = Math.floor((ms % 3_600_000) / 60_000);
    return d ? `in ${d}d ${h}h` : h ? `in ${h}h ${m}m` : `in ${m}m`;
  })();
  const step = [...LOVE.programme].reverse().find((s) => minutes >= s.at);

  return (
    <Shell>
      {/* The couple */}
      <div className="text-center space-y-3 pt-4">
        <p className="text-sm font-semibold tracking-[0.2em] uppercase text-amber-700">
          {w.status === "done" ? "Just married" : "You're invited"}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Face p={w.man} />
          <span className="text-3xl">
            {w.status === "done" ? "💞" : (ringOf(w.ring)?.icon ?? "💍")}
          </span>
          <Face p={w.woman} />
        </div>
        <h1 className="text-3xl font-black tracking-tight">
          @{w.man.username} &amp; @{w.woman.username}
        </h1>
        <p className="text-slate-600">
          {venue?.icon} {venue?.name}
        </p>
        <p className="text-slate-600">
          {when} · {ceremony?.name}
        </p>
        {w.status === "planned" && !live && (
          <p className="inline-block px-4 py-1.5 rounded-full bg-white shadow text-sm font-semibold">
            Starts {untilText}
          </p>
        )}
        {w.status === "missed" && (
          <p className="text-rose-600 font-semibold">
            The ceremony window passed without both &ldquo;I do&rdquo;s.
          </p>
        )}
        {w.status === "cancelled" && (
          <p className="text-rose-600 font-semibold">
            This wedding was cancelled.
          </p>
        )}
      </div>

      {note && (
        <p
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${note.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
        >
          {note.text}
        </p>
      )}

      {/* The ceremony, live */}
      {(live || w.status === "done") && (
        <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
          <p className="font-black text-lg">
            {w.status === "done"
              ? "🎉 They're married!"
              : "🔴 The ceremony is on"}
          </p>
          <ol className="space-y-2">
            {LOVE.programme.map((s) => (
              <li
                key={s.at}
                className={`flex items-center gap-3 px-3 py-2 rounded-2xl ${step === s && w.status !== "done" ? "bg-amber-100 font-semibold" : "text-slate-500"}`}
              >
                <span className="text-xl">{s.icon}</span>
                {s.text}
              </li>
            ))}
          </ol>
          {w.status === "planned" && (
            <p className="text-sm text-slate-600">
              &ldquo;I do&rdquo;: @{w.man.username} {w.iDoMan ? "✅" : "…"} · @
              {w.woman.username} {w.iDoWoman ? "✅" : "…"}
            </p>
          )}
          {couple && w.status === "planned" && (
            <button
              disabled={busy || iSaid}
              onClick={() => run(() => sayIDo(code), "💍 You said I do.")}
              className="w-full h-16 rounded-full bg-rose-500 text-white text-2xl font-semibold shadow-[inset_0_-5px_0_rgba(0,0,0,0.18)] disabled:opacity-60"
            >
              {iSaid ? "You said “I do” 💗" : "I do 💍"}
            </button>
          )}
          <Link
            href={`/place/${w.venue}`}
            className="block text-center font-semibold text-sky-600"
          >
            Go to {venue?.name.split(",")[0]} →
          </Link>
        </section>
      )}

      {/* Guests: RSVP and gifts */}
      {!couple && w.status === "planned" && (
        <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
          {w.me === "guest" ? (
            <>
              <p className="font-black text-lg">✅ You&apos;re going</p>
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    () => rsvp(code, false),
                    "You've let them know you can't make it.",
                  )
                }
                className="text-sm font-semibold text-slate-500"
              >
                Can&apos;t make it after all
              </button>
            </>
          ) : (
            <button
              disabled={busy || w.guests.length >= w.guestsMax}
              onClick={() =>
                run(() => rsvp(code, true), "🎉 You're on the guest list!")
              }
              className="w-full h-16 rounded-full bg-emerald-700 text-white text-xl font-semibold shadow-[inset_0_-5px_0_rgba(0,0,0,0.2)] disabled:opacity-50"
            >
              {w.guests.length >= w.guestsMax
                ? "The guest list is full"
                : "RSVP: I'll be there"}
            </button>
          )}
        </section>
      )}
      {!couple &&
        (w.me === "guest" || w.status === "done") &&
        w.status !== "cancelled" && (
          <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
            <p className="font-black text-lg">🎁 Send a gift</p>
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((a) => (
                <button
                  key={a}
                  onClick={() => setGift(a)}
                  className={`h-11 rounded-full font-semibold ${gift === a ? "bg-amber-500 text-white" : "bg-slate-100"}`}
                >
                  {a.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              value={giftMsg}
              onChange={(e) => setGiftMsg(e.target.value)}
              maxLength={200}
              placeholder="Mabrook! A message for the couple"
              className="w-full h-12 px-4 rounded-full bg-slate-100 outline-none"
            />
            <button
              disabled={busy || (citizen?.balance ?? 0) < gift}
              onClick={() =>
                run(
                  () => giveGift(code, gift, giftMsg),
                  `🎁 ${aed(gift)} sent to the couple.`,
                )
              }
              className="w-full h-14 rounded-full bg-slate-900 text-white font-semibold disabled:opacity-50"
            >
              Give {aed(gift)}
            </button>
          </section>
        )}

      {/* The couple's tools */}
      {couple && w.status === "planned" && (
        <Invite code={code} me={citizen?.username ?? ""} />
      )}

      {/* #14 Cultural Wedding Celebration, Lagos Asoebi & Money Spraying */}
      {w.status !== "cancelled" && (
        <section className="rounded-[28px] bg-white shadow p-5 space-y-3.5 border border-amber-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-lg">
                🌍 Cultural Wedding &amp; Asoebi
              </p>
              <p className="text-xs text-slate-500">
                Celebrate in Lagos Owambe, Indian Shaadi, Kenyan Harusi,
                Cameroonian Toghu or Emirati Zaffa style!
              </p>
            </div>
            {sprayedTotal > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                💸 Sprayed: {aed(sprayedTotal)}
              </span>
            )}
          </div>

          {/* Cultural Style Selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CULTURAL_WEDDING_STYLES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  gameAudio.playClickSound();
                  setCultureId(c.id);
                }}
                className={`px-3 py-2 rounded-2xl text-xs font-black whitespace-nowrap border transition-all ${
                  cultureId === c.id
                    ? "bg-slate-900 text-amber-300 border-slate-900 shadow"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                {c.flag} {c.name.split(" ")[0]} {c.name.split(" ")[1]}
              </button>
            ))}
          </div>

          {(() => {
            const activeCulture =
              CULTURAL_WEDDING_STYLES.find((c) => c.id === cultureId) ??
              CULTURAL_WEDDING_STYLES[0];
            const activeAsoebi =
              ASOEBI_PALETTES.find((p) => p.id === asoebiId) ??
              ASOEBI_PALETTES[0];
            return (
              <div className="rounded-2xl bg-gradient-to-br from-amber-50/90 via-rose-50/60 to-emerald-50/60 p-3.5 border border-amber-200/60 space-y-3">
                <div>
                  <div className="font-black text-sm text-slate-900">
                    {activeCulture.flag} {activeCulture.name}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {activeCulture.subtitle}
                  </div>
                </div>

                {/* Lagos Asoebi Color Code & 1-Tap Outfit Sync */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-700">
                    <span>👗 Official Asoebi / Wedding Color Code:</span>
                    <span className="text-amber-800">{activeAsoebi.label}</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {ASOEBI_PALETTES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          gameAudio.playClickSound();
                          setAsoebiId(p.id);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                          asoebiId === p.id
                            ? "border-slate-900 bg-white ring-2 ring-amber-400"
                            : "border-slate-200 bg-white/70"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ background: p.primary }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 -ml-2"
                          style={{ background: p.secondary }}
                        />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playCoinSound();
                      const isWoman =
                        (citizen?.look?.gender ?? "woman") === "woman";
                      const outfitId =
                        cultureId === "lagos_owambe"
                          ? isWoman
                            ? "ng-asoebi-lace"
                            : "ng-agbada"
                          : cultureId === "indian_shaadi"
                            ? isWoman
                              ? "in-lehenga"
                              : "in-sherwani"
                            : cultureId === "kenyan_harusi"
                              ? isWoman
                                ? "ke-kitenge-gown"
                                : "ke-maasai-shuka"
                              : cultureId === "cameroon_toghu"
                                ? isWoman
                                  ? "cm-toghu-velvet"
                                  : "cm-toghu-chief"
                                : isWoman
                                  ? "ae-abaya-gold"
                                  : "ae-kandura-bisht";
                      updateCitizen((c) => ({
                        ...c,
                        outfit: outfitId,
                        look: {
                          ...(c.look ?? { gender: "woman" }),
                          wear: outfitId,
                          primaryColor: activeAsoebi.primary,
                          secondaryColor: activeAsoebi.secondary,
                          wigId:
                            cultureId === "lagos_owambe"
                              ? isWoman
                                ? "gele_crown"
                                : "fila_cap"
                              : c.look?.wigId,
                        },
                      }));
                      setWearingAsoebi(true);
                      setNote({
                        ok: true,
                        text: `👗✨ You're now wearing the couple's ${activeAsoebi.label} ${activeCulture.name} attire! VIP table unlocked.`,
                      });
                    }}
                    className={`w-full py-2.5 rounded-2xl font-black text-xs transition-all active:scale-95 ${
                      wearingAsoebi
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-amber-300"
                    }`}
                  >
                    {wearingAsoebi
                      ? `✅ Wearing ${activeAsoebi.label} Asoebi Attire (VIP Table Unlocked)`
                      : `👗 Wear Couple's ${activeAsoebi.label} Asoebi Attire (Free Match)`}
                  </button>
                </div>

                {/* Interactive Money Spraying / Cultural Ceremony Action */}
                <div className="pt-1 border-t border-amber-200/60 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!adjustBalance(-200)) {
                        setNote({
                          ok: false,
                          text: "You need AED 200 in your wallet to spray cash!",
                        });
                        return;
                      }
                      gameAudio.playCoinSound();
                      setSprayedTotal((s) => s + 200);
                      setNote({ ok: true, text: activeCulture.rewardToast });
                    }}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow active:scale-95"
                  >
                    {activeCulture.actionLabel}
                  </button>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Guest list */}
      <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="font-black text-lg">Guest list</p>
          <p className="text-sm text-slate-500">
            {w.guests.length} / {w.guestsMax}
            {w.gifts ? ` · ${aed(w.gifts)} in gifts` : ""}
          </p>
        </div>
        {w.guests.length === 0 ? (
          <p className="text-slate-500">
            No guests yet{couple ? ": share your invitation." : "."}
          </p>
        ) : (
          w.guests.map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <Face p={g} size={40} />
              <span className="flex-1 font-semibold truncate">
                @{g.username}
              </span>
              {couple && w.status === "planned" ? (
                <select
                  value={g.role}
                  onChange={(e) =>
                    void run(
                      () => setRole(code, g.id, e.target.value),
                      "Role updated.",
                    )
                  }
                  className="h-9 rounded-full bg-slate-100 px-2 text-sm"
                >
                  {Object.entries(LOVE.roles).map(([id, r]) => (
                    <option key={id} value={id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              ) : (
                g.role !== "guest" && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                    {LOVE.roles[g.role].name}
                  </span>
                )
              )}
            </div>
          ))
        )}
      </section>
    </Shell>
  );
}

function Invite({ code, me }: { code: string; me: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = weddingLink(code, me);
    const text = "You're invited to our wedding on Dubai Life 💍 Tap to RSVP:";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Wedding invitation", text, url });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      /* blocked */
    }
  };
  return (
    <section className="rounded-[28px] bg-white shadow p-5 space-y-3">
      <p className="font-black text-lg">💌 Invite your guests</p>
      <p className="text-slate-600">
        Send the link on WhatsApp or anywhere. Friends who aren&apos;t on Dubai
        Life yet can join from it and RSVP. Give your closest friends roles:
        best man, maid of honour, bridesmaids and groomsmen.
      </p>
      <button
        onClick={share}
        className="w-full h-14 rounded-full bg-emerald-700 text-white font-semibold shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]"
      >
        {copied ? "Link copied ✓" : "Share the invitation"}
      </button>
      <p className="text-center text-xs text-slate-400">
        On the day, open this page and both tap &ldquo;I do&rdquo; during the
        ceremony.
      </p>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-amber-50 via-rose-50 to-white text-slate-900">
      <div className="max-w-md mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 space-y-4">
        <Link
          href="/explore"
          className="inline-block text-sm font-semibold text-slate-500"
        >
          ← Dubai Life
        </Link>
        {children}
      </div>
    </main>
  );
}
