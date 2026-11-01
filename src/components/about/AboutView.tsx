"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PLACES } from "@/lib/city/places";
import { GAMES } from "@/lib/games/registry";
import { SITE } from "@/lib/site";
import { MIN_AGE } from "@/lib/age";
import { useCitizen } from "@/lib/citizenStore";
import { WIKI_HUBS } from "@/components/wiki/WikiData";

const venueCount = PLACES.reduce((n, p) => n + p.venues.filter((v) => !v.comingSoon).length, 0);
const landmarks = PLACES.filter((p) => p.kind !== "residential" && p.kind !== "home").slice(0, 12);

const FEATURES: Array<{
  icon: string;
  title: string;
  text: string;
  toneA: string;
  toneB: string;
  tile: string;
}> = [
  {
    icon: "🏙️",
    title: "A whole city to walk around",
    text: `Downtown, Dubai Marina, the Palm and more, with ${venueCount.toLocaleString()} shops, restaurants, clubs, beaches and attractions you can go into.`,
    toneA: "#E6F0FB",
    toneB: "#CFE2F7",
    tile: "#dbeafe",
  },
  {
    icon: "🚇",
    title: "Get around like a resident",
    text: "Walk, hail a Dubai taxi with a running meter, or ride the Red Line metro with station announcements in English and Arabic.",
    toneA: "#E0F7FA",
    toneB: "#B2EBF2",
    tile: "#cffafe",
  },
  {
    icon: "🏠",
    title: "A home that's yours",
    text: "Start in a shared bed space or a studio and work up to a Marina flat, a townhouse, a Downtown penthouse or a villa on the Palm. Furnish and decorate every room in 3D.",
    toneA: "#E8F7EF",
    toneB: "#C9EEDB",
    tile: "#d1fae5",
  },
  {
    icon: "💼",
    title: "Work, study and earn",
    text: "Take jobs, study at Academic City, pass your RTA driving test, start a business and keep an eye on rent, visa days and your AED wallet.",
    toneA: "#FFF4DF",
    toneB: "#FCE4B8",
    tile: "#fef3c7",
  },
  {
    icon: "🎲",
    title: `${GAMES.length} games to play with friends`,
    text: `${GAMES.slice(0, 6).map((g) => g.name).join(", ")} and more — against real players or the computer.`,
    toneA: "#F1ECFA",
    toneB: "#E0D6F4",
    tile: "#ede9fe",
  },
  {
    icon: "🎙️",
    title: "Real people & Live Audio Spaces",
    text: "Everyone you meet with a username is another player. Host Live Audio Spaces, chat, add friends, knock on doors and send AED.",
    toneA: "#FDECEF",
    toneB: "#F9D3DA",
    tile: "#fce7f3",
  },
];

export const ABOUT_FAQ: Array<[string, string]> = [
  [
    "Is Dubai Life free?",
    "Yes. Dubai Life is free to play in any modern browser on phone, tablet or computer. You can also add it to your home screen like an app.",
  ],
  [
    "Do I need to download anything?",
    `No. Open ${SITE.domain} and play. On iPhone or Android you can install it from the browser for a full-screen app with notifications.`,
  ],
  [
    "Is it the real Dubai?",
    "It's a virtual Dubai drawn from the real city: real neighbourhoods, landmarks, metro stations and the kinds of places people go. Prices are in AED and life runs on Dubai time.",
  ],
  [
    "Who can play?",
    `Anyone aged ${MIN_AGE} or over. You make an avatar, choose your first home and budget, and start your Dubai life straight away.`,
  ],
  [
    "Can I play with friends?",
    "Yes. Invite friends with your link, host a Live Audio Space, meet in the city, visit each other's homes and play Ludo, Chess, 3D Pool and the other games together.",
  ],
];

const DEVELOPER: Array<{ label: string; handle: string; href: string; icon: string }> = [
  { label: "LinkedIn", handle: "in/opeyemijj", href: "https://www.linkedin.com/in/opeyemijj/", icon: "💼" },
  { label: "Instagram", handle: "@brainofficial_", href: "https://www.instagram.com/brainofficial_/", icon: "📸" },
  { label: "WhatsApp", handle: "+971 58 549 0044", href: "https://wa.me/971585490044", icon: "💬" },
];

export function AboutView() {
  const { citizen } = useCitizen();
  const isLoggedIn = Boolean(citizen?.id);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <div className="wk h-dvh overflow-y-auto select-text" data-theme={theme}>
      {/* Sticky Gold Wiki Header */}
      <header className="sticky top-0 z-20 pt-[env(safe-area-inset-top)]" style={{ background: "var(--wk-gold)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 rounded-full pr-2"
            aria-label="Dubai Life home"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/70 shadow-sm ring-1 ring-[#b97b06]/30 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/icon-192.png" alt="Dubai Life" className="size-8 rounded-lg object-cover" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-[17px] font-semibold text-[#3b2a05]">Dubai Life</span>
              <span className="block text-[11px] font-bold tracking-wide text-[#6b4a05] uppercase">
                Official · About Us
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/wiki"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/80 hover:bg-white px-3.5 h-10 text-xs font-bold text-[#3b2a05] shadow-sm ring-1 ring-[#b97b06]/30"
            >
              <span aria-hidden="true">📖</span>
              <span>How to play · Wiki</span>
            </Link>

            <button
              type="button"
              aria-pressed={theme === "dark"}
              aria-label={theme === "dark" ? "Use the light theme" : "Use the dark theme"}
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-white/70 text-lg shadow-sm ring-1 ring-[#b97b06]/30"
            >
              <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
            </button>

            <Link
              href={isLoggedIn ? "/explore" : "/"}
              className="grid h-10 shrink-0 place-items-center rounded-full bg-[#1d2433] px-4 text-sm font-semibold text-white shadow-sm"
            >
              Play
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-16">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--wk-text-soft)]">
          <Link href="/" className="hover:underline">Dubai Life</Link>
          <span aria-hidden="true">›</span>
          <span className="text-[var(--wk-text)]">About Us</span>
        </nav>

        {/* Gold Radial Hero Card */}
        <section
          className="relative overflow-hidden rounded-[32px] px-5 pt-10 pb-8 text-center sm:px-10 sm:pt-14 sm:pb-12"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, #fff6dc 0%, #fde7a6 45%, #fbcb4c 100%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-192.png"
            alt="Dubai Life"
            className="mx-auto size-16 rounded-2xl shadow-lg drop-shadow-[0_6px_10px_rgba(185,123,6,0.35)]"
          />
          <h1 className="mt-4 text-[32px] leading-[1.1] font-semibold tracking-tight text-[#2b2005] sm:text-5xl">
            Dubai Life — live your Dubai story online
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[16px] leading-snug text-[#5a4410]">
            Dubai Life is a free online life simulation set in Dubai. Move to the city, find a home,
            get a job, ride the Metro, shop at Dubai Mall, host Live Audio Spaces and make real
            friends — all in your browser at {SITE.domain}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              href={isLoggedIn ? "/explore" : "/?signup=true"}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#15803d] hover:bg-[#166534] px-6 text-sm font-semibold text-white shadow-md transition-transform active:scale-95"
            >
              <span>{isLoggedIn ? "Continue in Dubai →" : "Start your Dubai life · free"}</span>
            </Link>
            <Link
              href="/wiki"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white/95 hover:bg-white px-5 text-sm font-semibold text-[#2b2005] shadow-sm ring-1 ring-black/10 transition-transform active:scale-95"
            >
              <span aria-hidden="true">📖</span>
              <span>How to play · Wiki</span>
            </Link>
          </div>
        </section>

        {/* Meet the Developer Section (Highlighted cleanly in the Wiki theme) */}
        <section aria-labelledby="developer" className="mt-10">
          <h2 id="developer" className="text-2xl font-semibold">
            Meet the developer
          </h2>
          <div
            className="wk-tone mt-4 rounded-[24px] p-6 sm:p-8 ring-1 ring-black/5"
            style={{ "--tone-a": "#E8F7EF", "--tone-b": "#C9EEDB" } as React.CSSProperties}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="wk-tile size-16 text-3xl shrink-0" aria-hidden="true">
                🧠
              </span>
              <div>
                <span className="inline-block rounded-full bg-[#128a55]/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#0d6e31]">
                  Creator &amp; Lead Architect
                </span>
                <h3 className="mt-1 text-2xl font-semibold text-[var(--wk-text)]">
                  Opeyemi Ishola{" "}
                  <span className="text-[var(--wk-text-soft)] font-normal">
                    (fondly called <strong className="text-[var(--wk-text)]">Brain</strong>)
                  </span>
                </h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--wk-text-soft)] max-w-2xl">
                  Dubai Life is designed and built in Dubai by{" "}
                  <strong className="text-[var(--wk-text)]">Opeyemi Ishola</strong>, fondly called{" "}
                  <strong className="text-[var(--wk-text)]">Brain</strong>. Questions, ideas,
                  collaborations or partnerships? Get in touch directly below.
                </p>
              </div>
            </div>

            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {DEVELOPER.map((d) => (
                <li key={d.label}>
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wk-card wk-lift flex items-center gap-3 p-3.5"
                  >
                    <span className="wk-tile size-11 text-xl shrink-0" aria-hidden="true">
                      {d.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-[var(--wk-text)]">{d.label}</span>
                      <span className="block text-[13px] text-[var(--wk-text-soft)] truncate">
                        {d.handle}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What you can do in Dubai Life */}
        <section aria-labelledby="what" className="mt-10">
          <h2 id="what" className="text-2xl font-semibold">
            What you can do in Dubai Life
          </h2>
          <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="wk-tone wk-lift flex flex-col justify-between rounded-[22px] p-5 ring-1 ring-black/5"
                style={{ "--tone-a": f.toneA, "--tone-b": f.toneB } as React.CSSProperties}
              >
                <div>
                  <span
                    className="wk-tile size-12 text-2xl"
                    style={{ "--tile": f.tile } as React.CSSProperties}
                    aria-hidden="true"
                  >
                    {f.icon}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-[var(--wk-text)]">{f.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-snug text-[var(--wk-text-soft)]">
                    {f.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Places in Dubai Life */}
        <section aria-labelledby="places" className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 id="places" className="text-2xl font-semibold">
              Places in Dubai Life
            </h2>
            <Link href="/wiki/places" className="text-[13px] font-bold text-[var(--wk-link)] hover:underline">
              All {PLACES.length} places A–Z →
            </Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {landmarks.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/place/${p.id}`}
                  className="wk-card wk-lift inline-flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-semibold"
                >
                  <span aria-hidden="true">📍</span>
                  <span>{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Games you can play */}
        <section aria-labelledby="games" className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 id="games" className="text-2xl font-semibold">
              Games you can play
            </h2>
            <Link href="/wiki/games-and-prizes" className="text-[13px] font-bold text-[var(--wk-link)] hover:underline">
              Games &amp; Prizes guide →
            </Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {GAMES.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/games/${g.id}`}
                  className="wk-card wk-lift inline-flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-semibold"
                >
                  <span aria-hidden="true">{g.icon}</span>
                  <span>{g.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mt-10">
          <h2 id="faq" className="text-2xl font-semibold">
            Frequently Asked Questions
          </h2>
          <div className="mt-4 space-y-3">
            {ABOUT_FAQ.map(([q, a]) => (
              <details key={q} className="wk-card p-5" open>
                <summary className="font-semibold text-[17px] cursor-pointer">{q}</summary>
                <p className="mt-2 text-[14.5px] text-[var(--wk-text-soft)] leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Wiki-Themed Footer */}
      <footer className="mt-14 border-t border-[var(--wk-line)] bg-[var(--wk-surface)]">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-lg font-semibold">Live your Dubai story.</p>
            <p className="mt-1 text-[13.5px] leading-snug text-[var(--wk-text-soft)]">
              Created by Opeyemi Ishola (fondly called Brain). Everything you win, earn or buy in
              the game is virtual game money (AED): it cannot be cashed out.
            </p>
            <nav
              aria-label="Wiki sections"
              className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold"
            >
              <Link className="hover:underline" href="/wiki">
                Wiki Home
              </Link>
              {WIKI_HUBS.map((h) => (
                <Link key={h.slug} className="hover:underline" href={`/wiki/${h.slug}`}>
                  {h.title}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <p className="text-[12px] font-bold tracking-wide text-[var(--wk-text-soft)] uppercase">
              Our official accounts
            </p>
            <ul className="mt-2 space-y-1.5 text-[14px]">
              {SITE.socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer me"
                    className="wk-link"
                  >
                    {s.label === "𝕏" ? "X" : s.label}
                  </a>{" "}
                  <span className="text-[var(--wk-text-soft)]">@dubailifeapp</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold text-[var(--wk-text-soft)]">
              <Link href="/wiki" className="hover:underline">
                How to play · Wiki
              </Link>
              <Link href="/scam-check" className="hover:underline">
                30-Second Scam Check
              </Link>
              <Link href="/business" className="hover:underline">
                Advertise
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

