"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  MapPin,
  Moon,
  Search,
  Sparkles,
  Sun,
  CheckCircle2,
  Layers,
  Terminal,
} from "lucide-react";
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

/** Renders inline `**bold**` and `` `code` `` cleanly without dangerouslySetInnerHTML */
function RichInline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold text-[var(--dl-text)]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded-md bg-[var(--dl-bg-subtle)] border border-[var(--dl-border)] px-1.5 py-0.5 text-[0.88em] font-semibold text-emerald-600 dark:text-emerald-400"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

// The numbered pins: each sits in the middle of the part of the screen it describes.
const centre = (start: string, size: string) => `${parseFloat(start) + parseFloat(size) / 2}%`;
const CALLOUTS = SCREEN_CALLOUTS.map((c) => ({
  num: c.id,
  x: centre(c.box.left, c.box.width),
  y: centre(c.box.top, c.box.height),
  title: c.title,
  short: c.title,
  detail: c.text,
}));

/** Interactive HUD Architecture Explorer */
function InteractiveScreenGuide({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState<number>(1);
  const active = CALLOUTS.find((c) => c.num === selected) ?? CALLOUTS[0];

  return (
    <div className="dl-bento overflow-hidden p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-5 border-b border-[var(--dl-border)]">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-600">
            <Terminal className="w-3.5 h-3.5" /> Interactive HUD Blueprint
          </span>
          <h3 className="text-xl font-black tracking-tight mt-0.5">
            Dubai Life Interface &amp; Controls
          </h3>
        </div>
        {compact && (
          <Link
            href="/wiki/screen"
            className="inline-flex items-center gap-1 rounded-full bg-[var(--dl-bg-subtle)] hover:bg-emerald-500/10 border border-[var(--dl-border)] px-3.5 py-1.5 text-xs font-bold text-emerald-600 transition-colors"
          >
            <span>Full HUD Reference</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr] items-start">
        {/* Futuristic Telemetry Viewport Mockup */}
        <div className="mx-auto w-full max-w-[300px] aspect-[9/18.5] rounded-[36px] bg-slate-950 p-2.5 shadow-2xl ring-1 ring-white/15 relative select-none">
          <div className="relative h-full w-full rounded-[28px] overflow-hidden bg-gradient-to-b from-slate-900 via-[#0b2926] to-slate-950 text-white flex flex-col justify-between p-3">
            {/* Top HUD Strip */}
            <div className="relative z-10 flex items-center justify-between gap-1 rounded-2xl bg-slate-950/85 backdrop-blur-md px-2.5 py-2 border border-white/10">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-xs shrink-0">
                  🧕🏼
                </span>
                <div className="leading-none truncate">
                  <div className="text-[10px] font-black text-emerald-400">AED 18,450</div>
                  <div className="text-[8px] text-amber-300 font-bold">-235/d · 09:00</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold">
                  😊 94%
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                  78d
                </span>
              </div>
            </div>

            {/* Center 3D Skyline & Co-Presence Preview */}
            <div className="relative flex-1 my-2 rounded-2xl border border-white/10 bg-gradient-to-b from-teal-500/10 via-transparent to-slate-950/80 flex flex-col justify-between p-2.5 overflow-hidden">
              <div className="flex items-center justify-between text-[9px] font-extrabold bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-2.5 py-1 text-emerald-200">
                <span>🔥 1.45× Co-Op Boost</span>
                <span>🥂 Treat</span>
              </div>

              <div className="my-auto text-center space-y-1">
                <div className="text-3xl">🏙️</div>
                <div className="text-[11px] font-black tracking-wide text-white/90">
                  DOWNTOWN DUBAI · 3D
                </div>
                <div className="text-[9px] text-slate-400">Tap buildings, cars &amp; citizens</div>
              </div>

              <div className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-2.5 py-1.5 text-[9px] font-bold text-amber-200 flex items-center justify-between">
                <span className="truncate">🎙️ Live Space: Talent Night</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[8px]">
                  JOIN
                </span>
              </div>
            </div>

            {/* Bottom Navigation Dock */}
            <div className="relative z-10 grid grid-cols-5 gap-1 rounded-2xl bg-slate-950/90 backdrop-blur-md p-1.5 border border-white/10 text-center">
              {[
                ["🙂", "Me"],
                ["✨", "Wishes"],
                ["🗺️", "City"],
                ["📱", "Phone"],
                ["🏠", "Home"],
              ].map(([ic, lbl], idx) => (
                <div
                  key={lbl}
                  className={`rounded-xl py-1 flex flex-col items-center ${
                    idx === 2 ? "bg-emerald-600 text-white" : "text-slate-300"
                  }`}
                >
                  <span className="text-xs leading-none">{ic}</span>
                  <span className="text-[8px] font-bold mt-0.5">{lbl}</span>
                </div>
              ))}
            </div>

            {/* Numbered Interactive Callout Pins */}
            {CALLOUTS.map((c) => {
              const isSelected = c.num === selected;
              return (
                <button
                  key={c.num}
                  type="button"
                  onClick={() => setSelected(c.num)}
                  style={{ left: c.x, top: c.y }}
                  aria-label={`HUD Callout ${c.num}: ${c.title}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full font-black text-xs flex items-center justify-center transition-all shadow-lg ${
                    isSelected
                      ? "bg-amber-400 text-slate-950 scale-125 ring-4 ring-amber-400/40"
                      : "bg-emerald-600 text-white hover:scale-110 ring-2 ring-white"
                  }`}
                >
                  {c.num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Interactive Callout List */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 p-5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow">
                {active.num}
              </span>
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
                  Active HUD Element
                </div>
                <h4 className="font-black text-lg leading-tight">{active.title}</h4>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--dl-text-soft)] leading-relaxed">
              <RichInline text={active.detail} />
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {CALLOUTS.map((c) => {
              const isSelected = c.num === selected;
              return (
                <button
                  key={c.num}
                  type="button"
                  onClick={() => setSelected(c.num)}
                  className={`text-left rounded-xl p-3 border transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                      : "border-[var(--dl-border)] bg-[var(--dl-surface-2)] hover:border-[var(--dl-border-strong)]"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--dl-surface)] text-[var(--dl-text-soft)] border border-[var(--dl-border)]"
                    }`}
                  >
                    {c.num}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">{c.title}</div>
                    <div className="text-[11px] text-[var(--dl-text-muted)] truncate">
                      {c.short}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Article Block Card inside a Chapter */
function BlockCard({ block }: { block: WikiSectionBlock }) {
  return (
    <article id={block.id} className="dl-bento p-5 sm:p-7 scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <span className="dl-badge-icon w-12 h-12 text-2xl shrink-0" aria-hidden="true">
            {block.icon}
          </span>
          <div>
            {block.badge && (
              <span className="inline-block rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 mb-1">
                {block.badge}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              {block.title}
            </h2>
          </div>
        </div>
        {block.cta && (
          <Link
            href={block.cta.href}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-transform active:scale-95"
          >
            <span>{block.cta.label}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-[var(--dl-text-soft)]">
        <RichInline text={block.summary} />
      </p>

      {block.bullets.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {block.bullets.map((b, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-[var(--dl-text-soft)]"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
              <span>
                <RichInline text={b} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {block.table && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--dl-border)] bg-[var(--dl-surface-2)]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--dl-border)] bg-[var(--dl-bg-subtle)]">
                {block.table.headers.map((h, i) => (
                  <th
                    key={i}
                    className="py-3 px-4 font-extrabold text-xs uppercase tracking-wider text-[var(--dl-text-soft)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--dl-border)]">
              {block.table.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-emerald-500/5 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-3 px-4 align-top ${
                        cIdx === 0
                          ? "font-bold text-[var(--dl-text)] whitespace-nowrap"
                          : "text-[var(--dl-text-soft)]"
                      }`}
                    >
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
        <div className="mt-5 rounded-2xl border-l-4 border-amber-500 bg-amber-500/10 px-4 py-3.5 text-sm text-[var(--dl-text)]">
          <strong className="font-extrabold text-amber-600 dark:text-amber-400">
            💡 Insider Tip:{" "}
          </strong>
          <RichInline text={block.tip} />
        </div>
      )}
    </article>
  );
}

/** Searchable A–Z Places & Districts Directory */
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
    <div className="space-y-4">
      <div className="dl-bento p-3.5">
        <label className="flex items-center gap-2.5 px-2">
          <Search className="w-4 h-4 text-emerald-600 shrink-0" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter Dubai districts & venues: Dubai Mall, Marina, Palm, Club, Beach…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--dl-text-muted)]"
          />
        </label>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        {filtered.map((p) => {
          const activeVenues = p.venues.filter((v) => !v.comingSoon);
          return (
            <div key={p.id} className="dl-bento dl-bento-interactive p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-lg">{p.name}</h3>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {p.kind}
                  </span>
                </div>
                <p className="text-xs text-[var(--dl-text-soft)] mt-1 leading-relaxed">{p.blurb}</p>
                {activeVenues.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-[var(--dl-border)] pt-3">
                    {activeVenues.slice(0, 5).map((v) => (
                      <li key={v.id} className="text-xs flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-bold">{v.name}</span>
                        <span className="text-[var(--dl-text-muted)] truncate">· {v.blurb}</span>
                      </li>
                    ))}
                    {activeVenues.length > 5 && (
                      <li className="text-[11px] text-emerald-600 font-bold pl-5">
                        +{activeVenues.length - 5} more venues inside
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[var(--dl-border)]">
                <span className="text-xs text-[var(--dl-text-muted)] font-bold">
                  {activeVenues.length} {activeVenues.length === 1 ? "venue" : "venues"} open
                </span>
                <Link
                  href={`/place/${p.id}`}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 hover:underline"
                >
                  <span>Teleport on Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WikiView({ slug }: { slug?: string }) {
  const { citizen } = useCitizen();
  const isLoggedIn = Boolean(citizen?.id);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [search, setSearch] = useState("");
  const [helpful, setHelpful] = useState<"yes" | "no" | null>(null);

  const placeCount = useMemo(
    () => PLACES.reduce((n, p) => n + p.venues.filter((v) => !v.comingSoon).length, 0),
    []
  );

  const isPlacesPage = slug === "places";
  const activeHub: WikiHub | undefined = useMemo(() => {
    if (!slug) return undefined;
    if (slug === "places") {
      return {
        slug: "places",
        icon: "🗺️",
        title: "Dubai Districts & Places A–Z",
        subtitle: `Explore all ${PLACES.length} Dubai landmarks and ${placeCount} interactive venues.`,
        toneA: "#059669",
        toneB: "#047857",
        parent: { slug: "getting-around", title: "Getting around & driving" },
        blocks: [],
      };
    }
    return WIKI_HUBS.find((h) => h.slug === slug);
  }, [slug, placeCount]);

  // Instant search across all chapters, blocks, tables, and Dubai venues
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const matches: Array<{
      href: string;
      icon: string;
      title: string;
      snippet: string;
      tag: string;
    }> = [];

    for (const hub of WIKI_HUBS) {
      if (hub.title.toLowerCase().includes(q) || hub.subtitle.toLowerCase().includes(q)) {
        matches.push({
          href: `/wiki/${hub.slug}`,
          icon: hub.icon,
          title: hub.title,
          snippet: hub.subtitle,
          tag: "Chapter",
        });
      }
      for (const b of hub.blocks) {
        const inBlock =
          b.title.toLowerCase().includes(q) ||
          b.summary.toLowerCase().includes(q) ||
          b.bullets.some((bul) => bul.toLowerCase().includes(q)) ||
          b.table?.rows.some((r) => r.some((c) => c.toLowerCase().includes(q)));
        if (inBlock) {
          matches.push({
            href: `/wiki/${hub.slug}#${b.id}`,
            icon: b.icon,
            title: `${b.title}`,
            snippet: b.summary,
            tag: hub.title,
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
          tag: "Dubai Landmark",
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
    <div className="dl-editorial h-dvh overflow-y-auto select-text" data-theme={theme}>
      {/* Floating Glass Command Header */}
      <header
        className="sticky top-0 z-30 border-b border-[var(--dl-border)] pt-[env(safe-area-inset-top)] backdrop-blur-xl"
        style={{ backgroundColor: "var(--dl-surface-glass)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/wiki"
              onClick={() => setSearch("")}
              className="flex items-center gap-2.5 group min-w-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/icon-192.png"
                alt="Dubai Life"
                className="w-10 h-10 rounded-xl shadow-md ring-1 ring-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base tracking-tight">Dubai Life</span>
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                    Codex
                  </span>
                </div>
                <span className="block text-[11px] font-semibold text-[var(--dl-text-muted)] truncate">
                  Official Citizen Handbook &amp; Systems Guide
                </span>
              </div>
            </Link>
          </div>

          {/* Center Search Bar */}
          <form
            role="search"
            className="hidden md:flex flex-1 max-w-md mx-4"
            onSubmit={(e) => e.preventDefault()}
          >
            <label className="flex w-full items-center gap-2.5 rounded-xl bg-[var(--dl-bg-subtle)] border border-[var(--dl-border)] focus-within:border-emerald-500 px-3.5 h-10 text-sm transition-colors">
              <Search className="w-4 h-4 text-[var(--dl-text-muted)] shrink-0" />
              <input
                type="search"
                maxLength={120}
                placeholder="Jump to topic: Golden Visa, 09:00 GST, Spaces, 3D Pool…"
                className="min-w-0 flex-1 bg-transparent text-[var(--dl-text)] outline-none placeholder:text-[var(--dl-text-muted)] text-xs font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[11px] font-bold text-[var(--dl-text-muted)] hover:text-[var(--dl-text)]"
                >
                  Clear
                </button>
              )}
            </label>
          </form>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/about"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[var(--dl-bg-subtle)] hover:bg-emerald-500/10 border border-[var(--dl-border)] px-3 h-10 text-xs font-bold transition-colors"
            >
              <span>About Us</span>
            </Link>

            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle Day/Night theme"
              className="w-10 h-10 rounded-xl bg-[var(--dl-bg-subtle)] border border-[var(--dl-border)] flex items-center justify-center text-[var(--dl-text)] hover:border-emerald-500/50 transition-colors"
              title={theme === "dark" ? "Switch to Pearl Day mode" : "Switch to Marina Night mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <Link
              href={isLoggedIn ? "/explore" : "/"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 h-10 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <span>{isLoggedIn ? "Enter City" : "Play Free"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Mobile Search & Horizontal Chapter Pill Strip */}
        <div className="mx-auto max-w-7xl px-4 pb-2.5 space-y-2 md:hidden">
          <label className="flex w-full items-center gap-2 rounded-xl bg-[var(--dl-bg-subtle)] border border-[var(--dl-border)] px-3.5 h-9 text-xs">
            <Search className="w-3.5 h-3.5 text-[var(--dl-text-muted)] shrink-0" />
            <input
              type="search"
              maxLength={120}
              placeholder="Search visas, jobs, metro, spaces, pool…"
              className="min-w-0 flex-1 bg-transparent text-[var(--dl-text)] outline-none placeholder:text-[var(--dl-text-muted)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
      </header>

      {/* Main Content Container with Left Chapter Rail on Desktop */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-[250px_1fr] items-start">
          {/* Left Sticky Chapter Navigation Sidebar */}
          <aside className="hidden lg:block sticky top-20 space-y-5">
            <div className="dl-bento p-4 space-y-1">
              <div className="px-2.5 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--dl-text-muted)] flex items-center justify-between">
                <span>Handbook Chapters</span>
                <span>{WIKI_HUBS.length}</span>
              </div>
              <Link
                href="/wiki"
                onClick={() => setSearch("")}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  !slug && !search
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-[var(--dl-text-soft)] hover:bg-[var(--dl-bg-subtle)] hover:text-[var(--dl-text)]"
                }`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span>Overview &amp; Flight Path</span>
              </Link>

              {WIKI_HUBS.map((h) => {
                const active = slug === h.slug && !search;
                return (
                  <Link
                    key={h.slug}
                    href={`/wiki/${h.slug}`}
                    onClick={() => setSearch("")}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                      active
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-[var(--dl-text-soft)] hover:bg-[var(--dl-bg-subtle)] hover:text-[var(--dl-text)]"
                    }`}
                  >
                    <span className="text-base leading-none shrink-0">{h.icon}</span>
                    <span className="truncate">{h.title}</span>
                  </Link>
                );
              })}

              <Link
                href="/wiki/places"
                onClick={() => setSearch("")}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  isPlacesPage && !search
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-[var(--dl-text-soft)] hover:bg-[var(--dl-bg-subtle)] hover:text-[var(--dl-text)]"
                }`}
              >
                <span className="text-base leading-none shrink-0">🗺️</span>
                <span className="truncate">Places A–Z ({placeCount})</span>
              </Link>
            </div>

            {/* Quick Telemetry Card in Sidebar */}
            <div className="dl-bento p-4 space-y-2.5 bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/5">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">
                Dubai Standard Time
              </div>
              <p className="text-xs text-[var(--dl-text-soft)] leading-relaxed">
                Daily Blueprint rent, food &amp; transport settle every morning at{" "}
                <strong className="text-[var(--dl-text)]">09:00 GST</strong>. Keep at least{" "}
                <strong className="text-[var(--dl-text)]">3 days of Runway</strong> in your wallet!
              </p>
            </div>
          </aside>

          {/* Right Primary Content Column */}
          <main id="wk-main" className="min-w-0 space-y-8">
            {/* Mobile Horizontal Chapter Selector */}
            <nav
              aria-label="Chapters"
              className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
            >
              <Link
                href="/wiki"
                onClick={() => setSearch("")}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold border transition-colors ${
                  !slug && !search
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-[var(--dl-surface)] text-[var(--dl-text-soft)] border-[var(--dl-border)]"
                }`}
              >
                🏠 Overview
              </Link>
              {WIKI_HUBS.map((h) => (
                <Link
                  key={h.slug}
                  href={`/wiki/${h.slug}`}
                  onClick={() => setSearch("")}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold border transition-colors ${
                    slug === h.slug && !search
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-[var(--dl-surface)] text-[var(--dl-text-soft)] border-[var(--dl-border)]"
                  }`}
                >
                  {h.icon} {h.title}
                </Link>
              ))}
            </nav>

            {/* Instant Search Results View */}
            {search.trim().length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">
                    Search results for “{search.trim()}” ({searchResults.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs font-bold text-emerald-500 hover:underline"
                  >
                    Clear search
                  </button>
                </div>
                {searchResults.length === 0 ? (
                  <div className="dl-bento p-8 text-center text-[var(--dl-text-soft)]">
                    No matching chapters or venues for “{search.trim()}”. Try searching{" "}
                    <strong>visa</strong>, <strong>blueprint</strong>, <strong>spaces</strong>,{" "}
                    <strong>pool</strong>, or <strong>metro</strong>.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {searchResults.map((r, i) => (
                      <Link
                        key={`${r.href}-${i}`}
                        href={r.href}
                        onClick={() => setSearch("")}
                        className="dl-bento dl-bento-interactive flex items-start gap-3.5 p-4"
                      >
                        <span className="dl-badge-icon w-11 h-11 text-xl shrink-0" aria-hidden="true">
                          {r.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-sm truncate">{r.title}</span>
                          <span className="mt-0.5 block text-xs text-[var(--dl-text-soft)] line-clamp-2">
                            <RichInline text={r.snippet} />
                          </span>
                          <span className="mt-2 inline-block rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
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
                 WIKI HOME (/wiki) — Original Dubai Skyline Editorial Layout
                 ================================================================ */
              <>
                {/* Asymmetric Split Hero Banner */}
                <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071923] via-[#0b2e2b] to-[#1e1b4b] text-white p-6 sm:p-10 shadow-2xl border border-white/10">
                  {/* Decorative Skyline SVG Background */}
                  <svg
                    className="absolute bottom-0 right-0 w-full h-36 text-emerald-400/10 pointer-events-none"
                    viewBox="0 0 800 140"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M0 140V105h45V80h30v25h35V55h25v50h30V20l10-20 10 20v85h35V65h40v40h28V50h35v55h45V75h35v30h50V40h30v65h40V85h50V60h35v45h60V35h25v70h45V75h35v30h32v35z"
                    />
                  </svg>

                  <div className="relative z-10 grid gap-8 lg:grid-cols-[1.35fr_1fr] items-center">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-1 text-xs font-extrabold tracking-wide text-emerald-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>DUBAI LIFE CITIZEN CODEX · HOW TO PLAY</span>
                      </div>

                      <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.08]">
                        From a 30-Day Visit Visa to{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300">
                          Palm Jumeirah Royalty.
                        </span>
                      </h1>

                      <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-xl">
                        Master the 09:00 GST Sustainability Blueprint, climb the 5-tier UAE Visa
                        Ladder, host Live Audio Spaces, drive supercars on Sheikh Zayed Road, and
                        compete in Dubai Syndicate Wars.
                      </p>

                      {/* Quick Filter Topic Chips */}
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400 mr-1">Hot topics:</span>
                        {[
                          { label: "🛂 Visa Ladder", href: "/wiki/visa-ladder" },
                          { label: "🎙️ Audio Spaces", href: "/wiki/social#audio-spaces" },
                          { label: "📐 09:00 GST Burn", href: "/wiki/start-here#blueprint" },
                          { label: "🎱 3D Pool & Vault", href: "/wiki/games-and-prizes" },
                          { label: "🛡️ Scam Shield", href: "/wiki/safety-and-scams" },
                        ].map((chip) => (
                          <Link
                            key={chip.href}
                            href={chip.href}
                            className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors"
                          >
                            {chip.label}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Right Telemetry Bento Card */}
                    <div className="rounded-2xl bg-slate-950/65 backdrop-blur-xl border border-white/15 p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/brand/icon-192.png"
                            alt=""
                            className="w-9 h-9 rounded-xl ring-1 ring-white/20"
                          />
                          <div>
                            <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                              City Specifications
                            </div>
                            <div className="text-[11px] text-slate-300">Real-Time Simulation Engine</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black">
                          LIVE 3D
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-left">
                        {[
                          { k: "Interactive Venues", v: `${placeCount} Places`, ic: "🏙️" },
                          { k: "Residency Path", v: "5 Visa Tiers", ic: "🛂" },
                          { k: "Housing Ladder", v: "9 3D Homes", ic: "🏠" },
                          { k: "Live Multiplayer", v: "12 Games + Spaces", ic: "🎙️" },
                        ].map((stat) => (
                          <div
                            key={stat.k}
                            className="rounded-xl bg-white/5 border border-white/10 p-3"
                          >
                            <div className="text-base">{stat.ic}</div>
                            <div className="font-black text-sm mt-1 text-white">{stat.v}</div>
                            <div className="text-[11px] text-slate-400">{stat.k}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Link
                          href="/wiki/start-here"
                          className="flex-1 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read Day-1 Guide</span>
                        </Link>
                        <Link
                          href="/wiki/screen"
                          className="h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center"
                        >
                          📱 HUD Map
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>

                {/* DXB Arrival Flight Path (5-Stage Connected Boarding Timeline) */}
                <section aria-labelledby="flight-path" className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-500">
                        Fast-Track Onboarding
                      </span>
                      <h2 id="flight-path" className="text-2xl font-black tracking-tight">
                        Your First 5 Minutes in Dubai
                      </h2>
                    </div>
                    <Link
                      href="/wiki/start-here"
                      className="text-xs font-extrabold text-emerald-500 hover:underline flex items-center gap-1"
                    >
                      <span>Full Day-1 Checklist</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
                    {FIVE_MINUTE_STEPS.map((step) => (
                      <li key={step.num} className="dl-bento p-4 relative overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                              Stage 0{step.num}
                            </span>
                            <span className="text-2xl" aria-hidden="true">
                              {step.icon}
                            </span>
                          </div>
                          <h3 className="font-black text-[15px] leading-snug">{step.title}</h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-[var(--dl-text-soft)]">
                            {step.text}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[var(--dl-border)] flex items-center justify-between text-[10px] font-bold text-[var(--dl-text-muted)]">
                          <span>DXB FLIGHT PATH</span>
                          <span>0{step.num} / 05</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* System Chapters Bento Grid */}
                <section aria-labelledby="chapters-heading" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-500">
                        Complete Game Encyclopedia
                      </span>
                      <h2 id="chapters-heading" className="text-2xl font-black tracking-tight">
                        Explore Every System &amp; Mechanic
                      </h2>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {mainGridHubs.map((hub, idx) => (
                      <Link
                        key={hub.slug}
                        href={`/wiki/${hub.slug}`}
                        className="dl-bento dl-bento-interactive p-5 flex flex-col justify-between group relative overflow-hidden"
                      >
                        {/* Top Accent Strip */}
                        <div className="flex items-start justify-between gap-3">
                          <span className="dl-badge-icon w-12 h-12 text-2xl shrink-0 group-hover:scale-110 transition-transform">
                            {hub.icon}
                          </span>
                          <span className="rounded-full bg-[var(--dl-bg-subtle)] border border-[var(--dl-border)] px-2.5 py-0.5 text-[10px] font-extrabold text-[var(--dl-text-muted)]">
                            CH 0{idx + 1} · {hub.blocks.length}{" "}
                            {hub.blocks.length === 1 ? "topic" : "topics"}
                          </span>
                        </div>

                        <div className="mt-4">
                          <h3 className="text-lg font-black group-hover:text-emerald-500 transition-colors">
                            {hub.title}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--dl-text-soft)]">
                            {hub.subtitle}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[var(--dl-border)] flex items-center justify-between text-xs font-extrabold text-emerald-500">
                          <span>Open Chapter</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* Interactive HUD Blueprint Section */}
                <section aria-labelledby="hud-blueprint">
                  <InteractiveScreenGuide compact />
                </section>
              </>
            ) : (
              /* ================================================================
                 WIKI SUBPAGE (/wiki/[slug])
                 ================================================================ */
              <>
                {/* Breadcrumb bar */}
                <nav
                  aria-label="Breadcrumb"
                  className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--dl-text-muted)]"
                >
                  <Link href="/wiki" className="hover:text-emerald-500">
                    Codex Home
                  </Link>
                  {activeHub.parent && (
                    <>
                      <span aria-hidden="true">/</span>
                      <Link href={`/wiki/${activeHub.parent.slug}`} className="hover:text-emerald-500">
                        {activeHub.parent.title}
                      </Link>
                    </>
                  )}
                  <span aria-hidden="true">/</span>
                  <span className="text-[var(--dl-text)]">{activeHub.title}</span>
                </nav>

                {/* Chapter Header Banner */}
                <section className="dl-bento p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className="dl-badge-icon w-16 h-16 text-4xl shrink-0" aria-hidden="true">
                      {activeHub.icon}
                    </span>
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">
                        <Layers className="w-3 h-3" /> Official System Guide
                      </span>
                      <h1 className="text-2xl sm:text-4xl font-black tracking-tight mt-0.5">
                        {activeHub.title}
                      </h1>
                      <p className="mt-1.5 max-w-2xl text-sm sm:text-base text-[var(--dl-text-soft)] leading-relaxed">
                        {activeHub.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Quick Jump Anchor Chips */}
                  {activeHub.blocks.length > 1 && (
                    <div className="mt-5 pt-4 border-t border-[var(--dl-border)] flex flex-wrap gap-2">
                      {activeHub.blocks.map((b) => (
                        <a
                          key={b.id}
                          href={`#${b.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--dl-surface)] hover:border-emerald-500 border border-[var(--dl-border)] px-3 py-1.5 text-xs font-bold shadow-sm transition-colors"
                        >
                          <span aria-hidden="true">{b.icon}</span>
                          <span>{b.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </section>

                {/* Special Interactive Views for /wiki/screen and /wiki/places */}
                {slug === "screen" && <InteractiveScreenGuide />}
                {isPlacesPage && <PlacesDirectory />}

                {/* Section Blocks */}
                <div className="space-y-5">
                  {activeHub.blocks.map((b) => (
                    <BlockCard key={b.id} block={b} />
                  ))}
                </div>
              </>
            )}

            {/* Feedback & Version Bar */}
            <div className="dl-bento p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-bold text-sm">
                  {helpful
                    ? "Shukran! Your feedback helps us improve the Citizen Codex."
                    : "Did this guide answer your question?"}
                </div>
                <div className="text-xs text-[var(--dl-text-muted)] mt-0.5">
                  Updated for Dubai Life Season 1 · Live Audio Spaces &amp; 3D Venues
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHelpful("yes")}
                  className={`rounded-xl px-4 py-2 text-xs font-extrabold border transition-colors ${
                    helpful === "yes"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-[var(--dl-bg-subtle)] border-[var(--dl-border)] hover:border-emerald-500"
                  }`}
                >
                  👍🏼 Helpful
                </button>
                <button
                  type="button"
                  onClick={() => setHelpful("no")}
                  className={`rounded-xl px-4 py-2 text-xs font-extrabold border transition-colors ${
                    helpful === "no"
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-[var(--dl-bg-subtle)] border-[var(--dl-border)] hover:border-rose-500"
                  }`}
                >
                  👎🏼 Needs detail
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Architectural Footer */}
      <footer className="border-t border-[var(--dl-border)] bg-[var(--dl-surface)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
              <span className="font-black text-lg">Dubai Life</span>
            </div>
            <p className="text-xs text-[var(--dl-text-soft)] leading-relaxed max-w-md">
              The official Dubai Life Citizen Codex. All AED balances, properties, vehicles, and
              prizes in the simulation are virtual game currency and cannot be cashed out.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-[var(--dl-text-soft)] sm:justify-end items-start">
            <Link href="/about" className="hover:text-emerald-500">
              About Us &amp; Creator
            </Link>
            <Link href="/wiki/places" className="hover:text-emerald-500">
              Places A–Z
            </Link>
            <Link href="/scam-check" className="hover:text-emerald-500">
              30-Second Scam Check
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
