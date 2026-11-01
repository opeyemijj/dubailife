"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { PLACES } from "@/lib/city/places";
import { SITE } from "@/lib/site";
import { useCitizen } from "@/lib/citizenStore";
import {
  FIVE_MINUTE_STEPS,
  MAIN_GRID_SLUGS,
  SCREEN_CALLOUTS,
  WIKI_HUBS,
  type WikiHub,
  type WikiSectionBlock,
} from "./WikiData";

/** Official Dubai Life Brand Logo */
function DubaiLifeLogo({ className = "h-12 w-12 rounded-2xl" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/icon-192.png" alt="Dubai Life" className={className} />
  );
}

/** Renders inline `**bold**` and `` `code` `` cleanly without dangerouslySetInnerHTML */
function RichInline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function InteractiveScreenGuide() {
  const [selected, setSelected] = useState<number>(1);
  return (
    <div className="mt-6">
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,340px)_1fr]">
        {/* Interactive Phone Screen Mockup */}
        <div className="relative mx-auto w-full max-w-[340px] px-9">
          <div
            className="relative aspect-[9/19] overflow-hidden rounded-[38px] border-[6px] border-[#1d2433] shadow-[0_24px_50px_-20px_rgba(29,36,51,0.55)]"
            style={{
              background: "linear-gradient(180deg,#bfe0f7 0%,#e8f1f7 45%,#d9ead3 70%,#cbb89a 100%)",
            }}
            aria-hidden="true"
          >
            {/* 3D Room / City Backdrop inside Mockup */}
            <div className="absolute top-[50%] left-[14%] h-[11%] w-[52%] rounded-[14px] bg-[#e9d8bd] shadow-[0_10px_18px_-8px_rgba(0,0,0,0.35)]" />
            <div className="absolute top-[63%] left-[20%] h-[8%] w-[56%] rounded-[50%] bg-[#d9b98d]/70" />
            <div className="absolute top-[39%] left-[44%] size-[12%] rounded-full bg-[#7c4a2d] shadow-[0_8px_14px_-6px_rgba(0,0,0,0.4)]" />

            {/* 1. Top Bar */}
            <div className="absolute top-[3%] left-[4%] flex h-[9%] w-[58%] flex-col justify-center rounded-[16px] bg-white/85 px-2 text-[9px] leading-tight font-semibold text-[#1d2433] backdrop-blur">
              <span>☀️ 10:15 AM · 😄 Very Happy</span>
              <span className="font-medium text-[#5b6475]">● online · 👀 visits</span>
            </div>
            <div className="absolute top-[4.5%] right-[4%] flex h-[6%] w-[30%] items-center justify-between rounded-full bg-white/90 pr-1 pl-2 text-[10px] font-bold text-[#1d2433]">
              <span>AED 24k</span>
              <span className="grid size-[1.3rem] place-items-center rounded-full bg-[#22b573] text-white">+</span>
            </div>

            {/* 2. Avatar & Need Chip */}
            <div className="absolute top-[14.5%] left-[4%] flex items-center gap-1">
              <span className="size-9 rounded-full bg-[#a0663d] ring-2 ring-white" />
              <span className="rounded-full bg-white/90 px-2 py-1 text-[9px] font-bold text-[#0f7d4c]">
                🍽️ 84% · ⚡ 78%
              </span>
            </div>

            {/* 5. First Day / Goals / Vault */}
            <div className="absolute top-[15%] right-[4%] flex gap-1">
              <span className="grid size-8 place-items-center rounded-full bg-amber-300 text-sm shadow">🌅</span>
              <span className="grid size-8 place-items-center rounded-full bg-white/90 text-sm shadow">🎁</span>
            </div>

            {/* 4. Home 3D & Party Controls */}
            <div className="absolute top-[65%] right-[4%] flex gap-1">
              <span className="rounded-full bg-fuchsia-600 px-2 py-1 text-[8px] font-bold text-white shadow">
                🎉 Party
              </span>
              <span className="grid size-7 place-items-center rounded-full bg-white/90 text-xs font-bold text-[#1d2433]">
                ⋯
              </span>
            </div>

            {/* 3. Live Pulse + Bottom Dock + Phone */}
            <div className="absolute bottom-[11.5%] left-[4%] right-[4%] flex items-center justify-between rounded-full bg-slate-900/90 px-2.5 py-1 text-[8px] font-bold text-amber-300">
              <span>🍾 VIP Bottle Service at Skyview!</span>
              <span className="text-white underline">Join ›</span>
            </div>
            <div className="absolute bottom-[3.5%] left-[4%] flex h-[7%] w-[70%] items-center justify-around rounded-full bg-white/95 text-[8.5px] font-semibold text-[#1d2433] shadow">
              <span className="rounded-full bg-[#e6f2ea] px-2 py-0.5 text-[#0f7d4c]">🗺️ Map</span>
              <span>🏠 Home</span>
              <span>🏆 Top</span>
              <span>👤 Me</span>
            </div>
            <div className="absolute right-[4%] bottom-[3.5%] grid size-[2.8rem] place-items-center rounded-full bg-white text-lg shadow">
              📱
            </div>

            {/* Highlight Boxes */}
            {SCREEN_CALLOUTS.map((c) => (
              <div
                key={c.id}
                className={`absolute rounded-[14px] transition-all pointer-events-none ${
                  selected === c.id
                    ? "ring-3 ring-[#22b573] bg-[#22b573]/15 shadow-[0_0_20px_rgba(34,181,115,0.45)]"
                    : ""
                }`}
                style={c.box}
              />
            ))}
          </div>

          {/* Numbered Pins around the Phone */}
          {SCREEN_CALLOUTS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={`${c.id}: ${c.title}`}
              aria-pressed={selected === c.id}
              onClick={() => setSelected(c.id)}
              className={`absolute grid size-7 -translate-y-1/2 place-items-center rounded-full text-[13px] font-semibold shadow transition-transform ${
                selected === c.id
                  ? "bg-[#22b573] text-white scale-110 ring-2 ring-white"
                  : "bg-[#1d2433] text-white"
              }`}
              style={c.pin}
            >
              {c.id}
            </button>
          ))}
        </div>

        {/* Numbered Callout Cards */}
        <ol className="space-y-2.5">
          {SCREEN_CALLOUTS.map((c) => {
            const active = selected === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(c.id)}
                  className={`wk-card flex w-full gap-3 px-4 py-3.5 text-left transition ${
                    active ? "ring-2 ring-[#22b573]" : ""
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
                      active ? "bg-[#22b573] text-white" : "bg-[#1d2433] text-white"
                    }`}
                  >
                    {c.id}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-[16px]">{c.title}</span>
                    <span className="wk-prose mt-0.5 block text-[14px] text-[var(--wk-text-soft)]">
                      <RichInline text={c.text} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function PlacesDirectory() {
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const filtered = useMemo(() => {
    return PLACES.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.venues.some((v) => v.name.toLowerCase().includes(q) || v.blurb.toLowerCase().includes(q))
      );
    });
  }, [q]);

  return (
    <div className="mt-6 space-y-4">
      <div className="wk-card p-3">
        <label className="flex items-center gap-2 px-2">
          <span aria-hidden="true">🔎</span>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter places & venues: Dubai Mall, Marina, Palm, Club, Beach…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => {
          const activeVenues = p.venues.filter((v) => !v.comingSoon);
          return (
            <div key={p.id} className="wk-card p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-[17px]">{p.name}</h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--wk-surface-2)] text-[var(--wk-text-soft)]">
                    {p.kind}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--wk-text-soft)] mt-0.5">{p.blurb}</p>
                {activeVenues.length > 0 && (
                  <ul className="mt-2.5 space-y-1">
                    {activeVenues.slice(0, 5).map((v) => (
                      <li key={v.id} className="text-[13px] flex items-center gap-1.5">
                        <span>🏢</span>
                        <span className="font-semibold">{v.name}</span>
                        <span className="text-[var(--wk-text-soft)] truncate">· {v.blurb}</span>
                      </li>
                    ))}
                    {activeVenues.length > 5 && (
                      <li className="text-[12px] text-[var(--wk-text-soft)] font-semibold">
                        +{activeVenues.length - 5} more inside
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--wk-line)]">
                <span className="text-[12px] text-[var(--wk-text-soft)] font-semibold">
                  {activeVenues.length} {activeVenues.length === 1 ? "venue" : "venues"}
                </span>
                <Link
                  href={`/place/${p.id}`}
                  className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--wk-link)] hover:underline"
                >
                  <span>Visit in 3D</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlockCard({ block }: { block: WikiSectionBlock }) {
  return (
    <section id={block.id} className="wk-card p-5 sm:p-6 space-y-3.5 scroll-mt-24">
      <div className="flex items-start gap-3">
        <span className="wk-tile size-11 shrink-0 text-2xl" aria-hidden="true">
          {block.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[19px] sm:text-[21px] font-bold leading-snug">{block.title}</h2>
            {block.badge && (
              <span className="rounded-full bg-[#fff6dc] text-[#6b4a05] border border-[#b97b06]/25 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                {block.badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-[14.5px] text-[var(--wk-text-soft)] leading-relaxed">
            <RichInline text={block.summary} />
          </p>
        </div>
      </div>

      {block.bullets.length > 0 && (
        <div className="wk-prose">
          <ul>
            {block.bullets.map((b, i) => (
              <li key={i}>
                <RichInline text={b} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {block.table && (
        <div className="wk-prose pt-1">
          <table>
            <thead>
              <tr>
                {block.table.headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.table.rows.map((row, idx) => (
                <tr key={idx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className={cIdx === 0 ? "font-semibold whitespace-nowrap" : ""}>
                      <RichInline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {block.tip && (
        <div className="wk-prose">
          <blockquote>
            <strong>💡 Pro Tip:</strong> <RichInline text={block.tip} />
          </blockquote>
        </div>
      )}

      {block.cta && (
        <div className="pt-1">
          <Link
            href={block.cta.href}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[var(--wk-action)] text-white text-sm font-semibold shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] hover:brightness-105 transition"
          >
            <span>{block.cta.label}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </section>
  );
}

export function WikiView({ slug }: { slug?: string }) {
  const { isLoggedIn } = useCitizen();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [search, setSearch] = useState("");
  const [helpfulVote, setHelpfulVote] = useState<"yes" | "no" | null>(null);

  const placeCount = useMemo(
    () => PLACES.reduce((n, p) => n + p.venues.filter((v) => !v.comingSoon).length, 0),
    []
  );

  const activeHub: WikiHub | null = useMemo(() => {
    if (!slug) return null;
    if (slug === "places") {
      return {
        slug: "places",
        icon: "🗺️",
        title: "Places A–Z",
        subtitle: `Every landmark, district, and venue across Dubai Life (${placeCount} active venues), and what you can do inside each one.`,
        toneA: "#FFF6DC",
        toneB: "#FDE7A6",
        parent: { slug: "start-here", title: "Start here" },
        blocks: [],
      };
    }
    return WIKI_HUBS.find((h) => h.slug === slug) ?? null;
  }, [slug, placeCount]);

  // Instant search across all hubs, blocks, glossary rows, and places
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const matches: Array<{ href: string; icon: string; title: string; snippet: string; tag: string }> = [];

    for (const hub of WIKI_HUBS) {
      if (hub.title.toLowerCase().includes(q) || hub.subtitle.toLowerCase().includes(q)) {
        matches.push({
          href: `/wiki/${hub.slug}`,
          icon: hub.icon,
          title: hub.title,
          snippet: hub.subtitle,
          tag: "Guide Hub",
        });
      }
      for (const b of hub.blocks) {
        const inBlock =
          b.title.toLowerCase().includes(q) ||
          b.summary.toLowerCase().includes(q) ||
          b.bullets.some((x) => x.toLowerCase().includes(q)) ||
          b.table?.rows.some((r) => r.some((c) => c.toLowerCase().includes(q)));
        if (inBlock) {
          matches.push({
            href: `/wiki/${hub.slug}#${b.id}`,
            icon: b.icon,
            title: `${b.title} (${hub.title})`,
            snippet: b.summary,
            tag: b.badge ?? "Article",
          });
        }
      }
    }

    for (const p of PLACES) {
      if (
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.venues.some((v) => v.name.toLowerCase().includes(q))
      ) {
        matches.push({
          href: `/place/${p.id}`,
          icon: "📍",
          title: p.name,
          snippet: p.blurb,
          tag: "Dubai Place",
        });
      }
    }

    return matches.slice(0, 18);
  }, [search]);

  const mainGridHubs = useMemo(
    () =>
      MAIN_GRID_SLUGS.map((s) => WIKI_HUBS.find((h) => h.slug === s)).filter(
        (h): h is WikiHub => Boolean(h)
      ),
    []
  );

  return (
    <div className="wk h-dvh overflow-y-auto select-text" data-theme={theme}>
      <a
        href="#wk-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to the page
      </a>

      {/* Sticky Gold Wiki Header (matches lagoslife.app/wiki) */}
      <header className="sticky top-0 z-20 pt-[env(safe-area-inset-top)]" style={{ background: "var(--wk-gold)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
          <Link
            href="/wiki"
            onClick={() => setSearch("")}
            className="flex min-w-0 items-center gap-2 rounded-full pr-2"
            aria-label="Dubai Life Wiki home"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/70 shadow-sm ring-1 ring-[#b97b06]/30 overflow-hidden">
              <DubaiLifeLogo className="size-8 rounded-lg object-cover" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-[17px] font-semibold text-[#3b2a05]">Dubai Life</span>
              <span className="block text-[11px] font-bold tracking-wide text-[#6b4a05] uppercase">
                Wiki · How to play
              </span>
            </span>
          </Link>

          <form
            role="search"
            className="ml-auto hidden min-w-0 flex-1 justify-end sm:flex"
            onSubmit={(e) => e.preventDefault()}
          >
            <label className="flex w-full items-center gap-2 rounded-full bg-white/95 px-4 shadow-sm ring-1 ring-black/5 h-10 max-w-sm text-sm">
              <span aria-hidden="true">🔎</span>
              <span className="sr-only">Search the wiki</span>
              <input
                type="search"
                maxLength={120}
                placeholder="Search: visas, jobs, metro, blueprint, pool…"
                className="min-w-0 flex-1 bg-transparent text-[#1d2433] outline-none placeholder:text-[#7a8294]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </form>

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

        {/* Mobile Search Bar */}
        <form
          role="search"
          className="mx-auto flex max-w-5xl px-4 pb-2.5 sm:hidden"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="flex w-full items-center gap-2 rounded-full bg-white/95 px-4 shadow-sm ring-1 ring-black/5 h-10 text-sm">
            <span aria-hidden="true">🔎</span>
            <span className="sr-only">Search the wiki</span>
            <input
              type="search"
              maxLength={120}
              placeholder="Search: visas, jobs, metro, blueprint, pool…"
              className="min-w-0 flex-1 bg-transparent text-[#1d2433] outline-none placeholder:text-[#7a8294]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </form>
      </header>

      <main id="wk-main" className="mx-auto max-w-5xl px-4 pt-5 pb-10">
        {/* Live Search Results Overlay when query is typed */}
        {searchResults !== null ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Search results for &ldquo;{search.trim()}&rdquo; ({searchResults.length})
              </h2>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-sm font-semibold text-[var(--wk-link)] hover:underline"
              >
                Clear search
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div className="wk-card p-6 text-center text-[var(--wk-text-soft)]">
                No matching guides or places found. Try searching for <strong>visa</strong>,{" "}
                <strong>blueprint</strong>, <strong>jobs</strong>, <strong>pool</strong>,{" "}
                <strong>syndicate</strong>, or <strong>metro</strong>.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {searchResults.map((r, idx) => (
                  <Link
                    key={`${r.href}-${idx}`}
                    href={r.href}
                    onClick={() => setSearch("")}
                    className="wk-card wk-lift flex items-start gap-3 p-4"
                  >
                    <span className="wk-tile size-11 shrink-0 text-xl" aria-hidden="true">
                      {r.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-[16px] truncate">{r.title}</span>
                      </span>
                      <span className="mt-0.5 block text-[13px] text-[var(--wk-text-soft)] line-clamp-2">
                        <RichInline text={r.snippet} />
                      </span>
                      <span className="mt-1.5 inline-block rounded-full bg-[var(--wk-surface-2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--wk-text-soft)]">
                        {r.tag}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : !activeHub ? (
          /* ================================================================
             WIKI HOME (/wiki) — 1:1 lagoslife.app/wiki Layout
             ================================================================ */
          <>
            {/* Gold Radial Hero Card */}
            <section
              className="relative overflow-hidden rounded-[32px] px-5 pt-10 pb-8 text-center sm:px-10 sm:pt-16 sm:pb-12"
              style={{
                background:
                  "radial-gradient(120% 80% at 50% 0%, #fff6dc 0%, #fde7a6 45%, #fbcb4c 100%)",
              }}
            >
              <DubaiLifeLogo className="mx-auto size-16 rounded-2xl shadow-lg drop-shadow-[0_6px_10px_rgba(185,123,6,0.35)]" />
              <h1 className="mt-4 text-[34px] leading-[1.1] font-semibold tracking-tight text-[#2b2005] sm:text-5xl">
                Live your Dubai story
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-[16px] leading-snug text-[#5a4410]">
                The official guide to Dubai Life: Sims, but make it Habibi. How everything works, from
                your 30-day Visit Visa &amp; Deira bed-space to a Palm Jumeirah Villa, Golden Visa &amp;
                the Monthly League.
              </p>
              <form
                role="search"
                className="mt-6 flex justify-center"
                onSubmit={(e) => e.preventDefault()}
              >
                <label className="flex w-full items-center gap-2 rounded-full bg-white/95 px-4 shadow-sm ring-1 ring-black/5 h-14 max-w-xl text-base">
                  <span aria-hidden="true">🔎</span>
                  <span className="sr-only">Search the wiki</span>
                  <input
                    type="search"
                    maxLength={120}
                    placeholder="Search: visas, jobs, metro, blueprint, syndicate, pool…"
                    className="min-w-0 flex-1 bg-transparent text-[#1d2433] outline-none placeholder:text-[#7a8294]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </form>
              <p className="mt-4 text-[13px] font-semibold text-[#6b4a05]">
                {WIKI_HUBS.length} guides · {placeCount} places · 10 careers · 12 multiplayer games · 9
                housing tiers
              </p>
            </section>

            {/* How to play in 5 minutes */}
            <section className="mt-10" aria-labelledby="first-steps">
              <h2 id="first-steps" className="text-2xl font-semibold">
                How to play in 5 minutes
              </h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-5">
                {FIVE_MINUTE_STEPS.map((step) => (
                  <li key={step.num}>
                    <div className="wk-card h-full p-4">
                      <span className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-full bg-[#1d2433] text-[13px] font-semibold text-white">
                          {step.num}
                        </span>
                        <span className="text-2xl" aria-hidden="true">
                          {step.icon}
                        </span>
                      </span>
                      <span className="mt-3 block text-[16px] font-semibold">{step.title}</span>
                      <span className="mt-1 block text-[13.5px] leading-snug text-[var(--wk-text-soft)]">
                        {step.text}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Explore the guide (9 colorful Hub Cards) */}
            <section className="mt-10" aria-labelledby="hubs">
              <h2 id="hubs" className="text-2xl font-semibold">
                Explore the guide
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mainGridHubs.map((hub) => (
                  <Link
                    key={hub.slug}
                    href={`/wiki/${hub.slug}`}
                    className="wk-tone wk-lift flex items-center gap-3 rounded-[22px] p-4 ring-1 ring-black/5"
                    style={
                      {
                        "--tone-a": hub.toneA,
                        "--tone-b": hub.toneB,
                      } as React.CSSProperties
                    }
                  >
                    <span className="wk-tile size-12 shrink-0 text-2xl" aria-hidden="true">
                      {hub.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-semibold">{hub.title}</span>
                      <span className="block text-[13px] leading-snug text-[var(--wk-text-soft)]">
                        {hub.subtitle}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Quick Deep-Dive Cards (Reading the screen, Places A-Z, What's New, Help & FAQ) */}
            <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  slug: "screen",
                  icon: "📱",
                  title: "Reading the screen",
                  sub: "Interactive HUD & phone diagram",
                },
                {
                  slug: "places",
                  icon: "🗺️",
                  title: "Places A–Z",
                  sub: `All ${placeCount} venues across Dubai`,
                },
                {
                  slug: "whats-new",
                  icon: "✨",
                  title: "What's new",
                  sub: "Latest multiplayer & 3D updates",
                },
                {
                  slug: "help",
                  icon: "🛟",
                  title: "Help & FAQ",
                  sub: "Log in, iOS alerts & troubleshooting",
                },
              ].map((item) => (
                <Link
                  key={item.slug}
                  href={`/wiki/${item.slug}`}
                  className="wk-card wk-lift flex items-center gap-3 px-4 py-3.5"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[15px]">{item.title}</span>
                    <span className="block text-[12.5px] text-[var(--wk-text-soft)] truncate">
                      {item.sub}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--wk-action)] text-white text-sm shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]"
                  >
                    →
                  </span>
                </Link>
              ))}
            </section>
          </>
        ) : (
          /* ================================================================
             WIKI HUB OR ARTICLE SUBPAGE (/wiki/[slug])
             ================================================================ */
          <>
            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumbs"
              className="mb-3 text-[13px] font-semibold text-[var(--wk-text-soft)]"
            >
              <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <li>
                  <Link className="hover:text-[var(--wk-text)]" href="/wiki">
                    Wiki
                  </Link>
                </li>
                {activeHub.parent && (
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden="true">›</span>
                    <Link
                      className="hover:text-[var(--wk-text)]"
                      href={`/wiki/${activeHub.parent.slug}`}
                    >
                      {activeHub.parent.title}
                    </Link>
                  </li>
                )}
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true">›</span>
                  <span className="text-[var(--wk-text)]" aria-current="page">
                    {activeHub.title}
                  </span>
                </li>
              </ol>
            </nav>

            {/* Hub Tone Banner */}
            <section
              className="wk-tone rounded-[28px] px-5 pt-8 pb-7 sm:px-8 sm:pt-12 sm:pb-10"
              style={
                {
                  "--tone-a": activeHub.toneA,
                  "--tone-b": activeHub.toneB,
                } as React.CSSProperties
              }
            >
              <div className="flex items-start gap-4">
                <span
                  className="wk-tile size-16 shrink-0 text-[34px] sm:size-20 sm:text-[42px]"
                  aria-hidden="true"
                >
                  {activeHub.icon}
                </span>
                <div className="min-w-0 pt-1">
                  <h1 className="text-[28px] leading-tight font-semibold tracking-tight sm:text-4xl">
                    {activeHub.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-[15.5px] leading-snug text-[var(--wk-text-soft)]">
                    {activeHub.subtitle}
                  </p>
                </div>
              </div>
            </section>

            {/* Child Links (like Reading the screen / Places A-Z under Start Here) */}
            {activeHub.childLinks && activeHub.childLinks.length > 0 && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {activeHub.childLinks.map((child) => (
                  <Link
                    key={child.slug}
                    href={`/wiki/${child.slug}`}
                    className="wk-card wk-lift flex items-center gap-3 px-4 py-4"
                  >
                    <span className="text-2xl shrink-0" aria-hidden="true">
                      {child.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-semibold">{child.title}</span>
                      <span className="block text-[13.5px] text-[var(--wk-text-soft)]">
                        {child.subtitle}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--wk-action)] text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]"
                    >
                      →
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Special Interactive Views for "screen" and "places" */}
            {activeHub.slug === "screen" && <InteractiveScreenGuide />}
            {activeHub.slug === "places" && <PlacesDirectory />}

            {/* Detailed Blocks */}
            {activeHub.blocks.length > 0 && (
              <div className="mt-6 space-y-4">
                {activeHub.blocks.map((block) => (
                  <BlockCard key={block.id} block={block} />
                ))}
              </div>
            )}

            {/* Other Guide Hubs Navigation Strip */}
            <section className="mt-10">
              <h2 className="text-lg font-semibold mb-3">More guides in the Wiki</h2>
              <div className="flex flex-wrap gap-2">
                {WIKI_HUBS.filter((h) => h.slug !== activeHub.slug).map((h) => (
                  <Link
                    key={h.slug}
                    href={`/wiki/${h.slug}`}
                    className="wk-card wk-lift inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold"
                  >
                    <span aria-hidden="true">{h.icon}</span>
                    <span>{h.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Was this helpful? Card */}
        <div className="wk-card mt-8 flex flex-wrap items-center gap-3 px-4 py-3">
          <p className="text-[14px] font-semibold">
            {helpfulVote === "yes"
              ? "Shukran! Glad this guide helped 🙌🏽"
              : helpfulVote === "no"
              ? "Thanks for the feedback — we keep improving the handbook!"
              : "Was this helpful?"}
          </p>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setHelpfulVote("yes")}
              className={`h-9 rounded-full px-4 text-sm font-semibold ring-1 ring-[var(--wk-line)] transition ${
                helpfulVote === "yes"
                  ? "bg-[var(--wk-action)] text-white"
                  : "bg-[var(--wk-surface-2)]"
              }`}
            >
              👍🏾 Yes
            </button>
            <button
              type="button"
              onClick={() => setHelpfulVote("no")}
              className={`h-9 rounded-full px-4 text-sm font-semibold ring-1 ring-[var(--wk-line)] transition ${
                helpfulVote === "no"
                  ? "bg-[#1d2433] text-white"
                  : "bg-[var(--wk-surface-2)]"
              }`}
            >
              👎🏾 Not really
            </button>
          </div>
        </div>

        <p className="mt-8 border-t border-[var(--wk-line)] pt-3 text-[12.5px] text-[var(--wk-text-soft)]">
          Last updated 1 Nov 2026 · Handbook version 58 · Applies to Dubai Life as of 1 Nov 2026
        </p>
      </main>

      {/* Wiki Footer (matches lagoslife.app/wiki) */}
      <footer className="mt-14 border-t border-[var(--wk-line)] bg-[var(--wk-surface)]">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-lg font-semibold">Live your Dubai story.</p>
            <p className="mt-1 text-[13.5px] leading-snug text-[var(--wk-text-soft)]">
              The official guide to Dubai Life, written by the Dubai Life team. Everything you win,
              earn or buy in the game is virtual game money (AED): it cannot be cashed out.
            </p>
            <nav
              aria-label="Wiki sections"
              className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold"
            >
              {WIKI_HUBS.map((h) => (
                <Link key={h.slug} className="hover:underline" href={`/wiki/${h.slug}`}>
                  {h.title}
                </Link>
              ))}
              <Link className="hover:underline" href="/wiki/places">
                Places A–Z
              </Link>
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
              <Link href="/about" className="hover:underline">
                About
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

