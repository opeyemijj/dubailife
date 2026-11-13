"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Compass,
  Globe2,
  MapPin,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { PLACES } from "@/lib/city/places";
import { GAMES } from "@/lib/games/registry";
import { SITE } from "@/lib/site";
import { MIN_AGE } from "@/lib/age";
import { useCitizen } from "@/lib/citizenStore";

const venueCount = PLACES.reduce((n, p) => n + p.venues.filter((v) => !v.comingSoon).length, 0);
const landmarks = PLACES.filter((p) => p.kind !== "residential" && p.kind !== "home").slice(0, 12);

const PILLARS = [
  {
    icon: "🏙️",
    tag: "3D Open City",
    title: "Walk, Drive & Explore Real Dubai Districts",
    text: `Downtown, Dubai Marina, Palm Jumeirah, DIFC, and Deira — with ${venueCount.toLocaleString()} interactive stores, clubs, beaches, clinics, and attractions you can step inside.`,
  },
  {
    icon: "🛂",
    tag: "The Visa & Blueprint Loop",
    title: "09:00 GST Settlement & 5-Tier Visa Ladder",
    text: "Arrive on a 30-day Visit Visa, configure your daily Housing, Food & Transport Blueprint, and work your way up to a 10-year UAE Golden Visa.",
  },
  {
    icon: "🏠",
    tag: "9 Housing Tiers",
    title: "From a Deira Bed-Space to a Palm Signature Villa",
    text: "Upgrade through 9 authentic Dubai homes, customize every room in 3D, or hire a real player Interior Decorator to style your apartment.",
  },
  {
    icon: "💼",
    tag: "Careers & Ventures",
    title: "Work 3D Venue Shifts, City Service Jobs & Ventures",
    text: "Earn AED as a Barista, Careem Captain, RTA Officer, Doctor, or Lawyer — or launch your own Dubai business venture and collect daily dividends.",
  },
  {
    icon: "🎙️",
    tag: "Live Audio Spaces",
    title: "Host Voice Spaces with Co-Hosts & Stage Games",
    text: "Start a 60-minute Live Space with up to 8 mics on stage, run Talent Night or Truth or Dare, and keep the audio bar floating on top while you play.",
  },
  {
    icon: "🎱",
    tag: `${GAMES.length} Multiplayer Games`,
    title: "3D 8-Ball Pool, Syndicate Wars & Daily Vault",
    text: `Play ${GAMES.slice(0, 5).map((g) => g.name).join(", ")} and more against real citizens or AI, crack the Daily Luxury Vault, and score for your district Syndicate.`,
  },
];

const FAQ_ITEMS: Array<[string, string]> = [
  [
    "Is Dubai Life free to play?",
    "Yes. Dubai Life is 100% free to play in any modern browser on mobile, tablet, or desktop. You can also install it to your home screen as a full-screen web app.",
  ],
  [
    "Do I need to download anything?",
    `No download is required. Open ${SITE.domain} and start immediately. On iOS or Android, tap 'Install App' for push notifications and full-screen play.`,
  ],
  [
    "How does time and money work in Dubai Life?",
    "The city runs on real Dubai Standard Time (GST, UTC+4). Every morning at 09:00 GST, your chosen Sustainability Blueprint (Housing, Food, and Transport) settles automatically in virtual AED.",
  ],
  [
    "Who can play?",
    `Anyone aged ${MIN_AGE} or older. Pick your 3D avatar, choose your starting Dubai neighborhood, and begin your story.`,
  ],
  [
    "Can I play and talk with friends?",
    "Yes! Share your invite link, meet inside venues for up to a 2.5× Co-Presence boost, host Live Audio Spaces, visit friends' 3D homes, and play 12 arcade & board games together.",
  ],
];

const DEVELOPER_LINKS: Array<{ label: string; handle: string; href: string; icon: string; badge: string }> = [
  {
    label: "LinkedIn",
    handle: "in/opeyemijj",
    href: "https://www.linkedin.com/in/opeyemijj/",
    icon: "💼",
    badge: "Professional Network",
  },
  {
    label: "Instagram",
    handle: "@brainofficial_",
    href: "https://www.instagram.com/brainofficial_/",
    icon: "📸",
    badge: "Behind the Scenes",
  },
  {
    label: "WhatsApp",
    handle: "+971 58 549 0044",
    href: "https://wa.me/971585490044",
    icon: "💬",
    badge: "Direct Dubai Line",
  },
];

export function AboutView() {
  const { citizen } = useCitizen();
  const isLoggedIn = Boolean(citizen?.id);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  return (
    <div className="dl-editorial h-dvh overflow-y-auto select-text" data-theme={theme}>
      {/* Floating Glass Header */}
      <header
        className="sticky top-0 z-30 border-b border-[var(--dl-border)] pt-[env(safe-area-inset-top)] backdrop-blur-xl"
        style={{ backgroundColor: "var(--dl-surface-glass)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-192.png"
              alt="Dubai Life"
              className="w-10 h-10 rounded-xl shadow-md ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform"
            />
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight">Dubai Life</span>
                <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                  Official
                </span>
              </div>
              <span className="block text-[11px] font-semibold text-[var(--dl-text-muted)]">
                About the Simulation &amp; Creator
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/wiki"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--dl-bg-subtle)] hover:bg-emerald-500/10 border border-[var(--dl-border)] px-3.5 h-10 text-xs font-extrabold transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>How to play · Wiki</span>
            </Link>

            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle Day/Night theme"
              className="w-10 h-10 rounded-xl bg-[var(--dl-bg-subtle)] border border-[var(--dl-border)] flex items-center justify-center text-[var(--dl-text)] hover:border-emerald-500/50 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <Link
              href={isLoggedIn ? "/explore" : "/?signup=true"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 h-10 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <span>{isLoggedIn ? "Enter City" : "Play Free"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-20 space-y-12">
        {/* Asymmetric Hero Section */}
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#06151f] via-[#0b2b28] to-[#1d1942] text-white p-6 sm:p-12 shadow-2xl border border-white/10">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.35fr_1fr] items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-1 text-xs font-extrabold tracking-wide text-amber-300">
                <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>LIVE YOUR DUBAI STORY ONLINE · FREE IN BROWSER</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.08]">
                A Living 3D Social World Set in{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300">
                  Dubai, UAE.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-xl">
                Move to the city, choose your Sustainability Blueprint, ride the Red Line Metro in
                3D, build a career or business venture, host Live Audio Spaces, and hang out with
                real people across {venueCount.toLocaleString()} Dubai venues.
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href={isLoggedIn ? "/explore" : "/?signup=true"}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-6 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition-transform active:scale-95"
                >
                  <span>{isLoggedIn ? "Continue in Dubai →" : "Start Your Dubai Life · Free"}</span>
                </Link>
                <Link
                  href="/wiki"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 px-5 text-sm font-bold text-white transition-transform active:scale-95"
                >
                  <Compass className="w-4 h-4 text-amber-300" />
                  <span>Read the Citizen Codex</span>
                </Link>
              </div>
            </div>

            {/* Right World Snapshot Card */}
            <div className="rounded-3xl bg-slate-950/70 backdrop-blur-xl border border-white/15 p-6 space-y-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/icon-192.png"
                  alt="Dubai Life"
                  className="w-12 h-12 rounded-2xl shadow-lg ring-1 ring-white/20"
                />
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                    Dubai Life Engine
                  </div>
                  <div className="text-lg font-black">Built for Mobile &amp; Web</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
                  <div className="text-2xl font-black text-amber-300">{venueCount}+</div>
                  <div className="text-xs text-slate-300 font-semibold mt-0.5">
                    3D Shops, Clubs &amp; Landmarks
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
                  <div className="text-2xl font-black text-emerald-300">{GAMES.length}</div>
                  <div className="text-xs text-slate-300 font-semibold mt-0.5">
                    Multiplayer &amp; Solo Games
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
                  <div className="text-2xl font-black text-sky-300">8 Mics</div>
                  <div className="text-xs text-slate-300 font-semibold mt-0.5">
                    Live Voice Spaces + Floating Pill
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
                  <div className="text-2xl font-black text-purple-300">09:00 GST</div>
                  <div className="text-xs text-slate-300 font-semibold mt-0.5">
                    Daily Real-Time Economy Tick
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Creator & Architect Spotlight — VIP Golden Visa Style Card */}
        <section aria-labelledby="creator-heading" className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 id="creator-heading" className="text-2xl font-black tracking-tight">
              Meet the Developer
            </h2>
          </div>

          <div className="dl-bento overflow-hidden p-6 sm:p-8 relative bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent border-amber-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shrink-0 font-black">
                  🧠
                </div>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-amber-500">
                    <Sparkles className="w-3 h-3" /> Creator &amp; Lead Architect · Dubai, UAE
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Opeyemi Ishola{" "}
                    <span className="text-base sm:text-lg font-bold text-emerald-500">
                      (fondly called Brain)
                    </span>
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[var(--dl-text-soft)] leading-relaxed max-w-2xl">
                    Dubai Life is conceived, designed, and engineered in Dubai by{" "}
                    <strong className="text-[var(--dl-text)]">Opeyemi Ishola</strong>, fondly called{" "}
                    <strong className="text-[var(--dl-text)]">Brain</strong>. Have feature ideas,
                    brand partnerships, or feedback? Reach out directly on any channel below.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {DEVELOPER_LINKS.map((d) => (
                <a
                  key={d.label}
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dl-bento dl-bento-interactive p-4 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="dl-badge-icon w-11 h-11 text-xl shrink-0" aria-hidden="true">
                      {d.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                        {d.badge}
                      </div>
                      <div className="font-black text-sm truncate">{d.label}</div>
                      <div className="text-xs text-[var(--dl-text-muted)] truncate">{d.handle}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[var(--dl-text-muted)] group-hover:text-emerald-500 shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Core Pillars Bento Grid */}
        <section aria-labelledby="pillars-heading" className="space-y-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-500">
              World Architecture
            </span>
            <h2 id="pillars-heading" className="text-2xl font-black tracking-tight">
              What You Can Do in Dubai Life
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="dl-bento dl-bento-interactive p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="dl-badge-icon w-12 h-12 text-2xl">{p.icon}</span>
                    <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                      {p.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-black leading-snug text-[var(--dl-text)]">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--dl-text-soft)]">
                    {p.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Landmarks & Games Split Showcase */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="landmarks-heading" className="dl-bento p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">
                  Interactive Map
                </span>
                <h2 id="landmarks-heading" className="text-xl font-black">
                  Iconic Places in Dubai Life
                </h2>
              </div>
              <Link
                href="/wiki/places"
                className="text-xs font-extrabold text-emerald-500 hover:underline flex items-center gap-1"
              >
                <span>All {PLACES.length} Places</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {landmarks.map((p) => (
                <Link
                  key={p.id}
                  href={`/place/${p.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--dl-bg-subtle)] hover:border-emerald-500 border border-[var(--dl-border)] px-3 py-2 text-xs font-bold transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{p.name}</span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="games-heading" className="dl-bento p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">
                  Game City Arcade
                </span>
                <h2 id="games-heading" className="text-xl font-black">
                  12 Solo &amp; Multiplayer Games
                </h2>
              </div>
              <Link
                href="/wiki/games-and-prizes"
                className="text-xs font-extrabold text-emerald-500 hover:underline flex items-center gap-1"
              >
                <span>Games Guide</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {GAMES.map((g) => (
                <Link
                  key={g.id}
                  href={`/games/${g.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--dl-bg-subtle)] hover:border-emerald-500 border border-[var(--dl-border)] px-3 py-2 text-xs font-bold transition-colors"
                >
                  <span>{g.icon}</span>
                  <span>{g.name}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Frequently Asked Questions */}
        <section aria-labelledby="faq-heading" className="space-y-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-500">
              Quick Answers
            </span>
            <h2 id="faq-heading" className="text-2xl font-black tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FAQ_ITEMS.map(([q, a]) => (
              <div key={q} className="dl-bento p-5 space-y-2">
                <h3 className="font-black text-base text-[var(--dl-text)]">{q}</h3>
                <p className="text-xs sm:text-sm text-[var(--dl-text-soft)] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--dl-border)] bg-[var(--dl-surface)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[var(--dl-text-muted)]">
          <div>
            <strong className="text-[var(--dl-text)]">Dubai Life</strong> · Designed &amp; built by{" "}
            <strong className="text-[var(--dl-text)]">Opeyemi Ishola (Brain)</strong>. Virtual AED
            has no real-world cash value.
          </div>
          <div className="flex flex-wrap gap-4 font-bold">
            <Link href="/feedback" className="text-amber-500 hover:text-amber-400 font-black">
              Feedback &amp; Roadmap
            </Link>
            <Link href="/privacy" className="hover:text-emerald-500">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-emerald-500">
              Terms of Service
            </Link>
            <Link href="/credits" className="hover:text-emerald-500">
              Credits
            </Link>
            <Link href="/wiki" className="hover:text-emerald-500">
              Citizen Codex (Wiki)
            </Link>
            <Link href="/scam-check" className="hover:text-emerald-500">
              Scam Check
            </Link>
            <Link href="/business" className="hover:text-emerald-500">
              Advertise
            </Link>
            {SITE.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer me"
                className="hover:text-emerald-500"
              >
                {s.label === "𝕏" ? "X" : s.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
