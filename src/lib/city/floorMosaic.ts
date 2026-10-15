import { mapSeed } from "@/data/mapSeed";

// The floor-ad mosaic: a dense grid of ad blocks of mixed sizes laid on the sand between Sheikh Zayed
// Road and the Jumeirah coast road (like a "million dollar homepage" on the ground). Each block is
// booked on its own for 7 days as placement "floor:<block id>"; the id carries its size (…-w4h3) so the
// server prices it per cell. The layout is fixed (seeded), so block ids never change.

export const CELL = 18; // px per cell on the map
export const ROWS = 8;

/**
 * One continuous mosaic from JBR in the west to past Downtown. It only breaks around billboards standing
 * on it (so no ad is ever hidden behind one), cell by cell.
 */
export const SECTIONS = [
  { key: "a", x0: -600, cols: 238, seed: 20261017 },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];

export interface Block { id: string; c: number; r: number; w: number; h: number }

/** Centre line of Sheikh Zayed Road (virtual y); the mosaic's middle is 120 units north of it. */
export const e11 = (x: number) => 1072 - (160 * (x + 3000)) / 9600;
export const MOSAIC_OFFSET = 120;

/** The world x range a cell covers, allowing for the mosaic's slant (top rows sit further right). */
const SLANT = 0.2355;
function cellSpan(x0: number, c: number, r: number): [number, number] {
  const shift = SLANT * ((ROWS * CELL) / 2 - (r + 0.5) * CELL);
  return [x0 + c * CELL + shift, x0 + (c + 1) * CELL + shift];
}

/**
 * Cells left empty ("c,r"): under every billboard standing on the mosaic, so none of its ads are ever
 * hidden behind one.
 */
export function blockedCells(key: SectionKey): Set<string> {
  const { x0, cols } = SECTIONS.find((s) => s.key === key)!;
  const spans: Array<[number, number]> = [];
  const pad = 14;
  for (const e of mapSeed as Array<{ type: string; virtualX: number; virtualY: number; width?: number; height?: number; scale?: number }>) {
    if (!/billboard/.test(e.type)) continue;
    const s = e.scale ?? 1, w = (e.width ?? 140) * s, h = (e.height ?? 90) * s;
    // Sprites stand on a point 90% of the way down them.
    const bottom = e.virtualY - 0.1 * h, top = e.virtualY + 0.9 * h;
    const mid = e11(e.virtualX) + MOSAIC_OFFSET, half = (ROWS * CELL) / 2;
    if (top < mid - half || bottom > mid + half) continue;
    spans.push([e.virtualX - w / 2 - pad, e.virtualX + w / 2 + pad]);
  }
  const out = new Set<string>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const [a, b] = cellSpan(x0, c, r);
      if (spans.some(([l, rr]) => a < rr && b > l)) out.add(`${c},${r}`);
    }
  }
  return out;
}

/** Block sizes (cols × rows) and how often to try each, biggest first. */
const SIZES: Array<[number, number, number]> = [[7, 5, 0.05], [6, 4, 0.06], [5, 4, 0.07], [4, 3, 0.1], [3, 3, 0.1], [4, 2, 0.09], [3, 2, 0.12], [2, 2, 0.16], [2, 1, 0.14], [1, 1, 1]];

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

const cached = new Map<string, Block[]>();

/** Every block in one stretch of the mosaic, packed left to right, top to bottom. */
export function mosaicBlocks(key: SectionKey): Block[] {
  const hit = cached.get(key);
  if (hit) return hit;
  const { cols, seed } = SECTIONS.find((s) => s.key === key)!;
  const rows = ROWS;
  const blocked = blockedCells(key);
  const used: boolean[][] = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, c) => blocked.has(`${c},${y}`)));
  const fits = (c: number, r: number, w: number, h: number) => {
    if (c + w > cols || r + h > rows) return false;
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (used[y][x]) return false;
    return true;
  };
  const r = rng(seed);
  const out: Block[] = [];
  for (let c = 0; c < cols; c++) {
    for (let y = 0; y < rows; y++) {
      if (used[y][c]) continue;
      let size: [number, number] = [1, 1];
      for (const [w, h, p] of SIZES) if (r() < p && fits(c, y, w, h)) { size = [w, h]; break; }
      const [w, h] = size;
      for (let yy = y; yy < y + h; yy++) for (let xx = c; xx < c + w; xx++) used[yy][xx] = true;
      out.push({ id: `fm-${c}-${y}-w${w}h${h}`, c, r: y, w, h });
    }
  }
  cached.set(key, out);
  return out;
}

/** "fm-12-3-w4h3" → 12 cells. */
export const blockCells = (id: string) => {
  const m = id.match(/-w(\d+)h(\d+)$/);
  return m ? Number(m[1]) * Number(m[2]) : 1;
};

/** Ads for Dubai Life itself, shown on blocks nobody has booked yet. */
export interface HouseAd { title: string; sub: string; bg: string; fg: string; accent: string; icon: string; cta: string; href: string }

export const HOUSE_ADS: HouseAd[] = [
  // Venues (tap to go there) mixed with how-to-play tips and things to do.
  { title: "At the Top", sub: "Burj Khalifa · Level 148", bg: "#020617", fg: "#e0f2fe", accent: "#38bdf8", icon: "🗼", cta: "Go to At the Top", href: "/place/burj-khalifa" },
  { title: "BLU Dubai", sub: "Hip-hop & R&B · bottle service", bg: "#1e1b4b", fg: "#f5d0fe", accent: "#d946ef", icon: "🍾", cta: "Go to BLU Dubai", href: "/place/blu-dubai/blu-dubai" },
  { title: "Live your Dubai life", sub: "Free · play in your browser", bg: "#0f172a", fg: "#ffffff", accent: "#f2b544", icon: "🌴", cta: "Start exploring", href: "/explore" },
  { title: "Aquaventure", sub: "Ride the Leap of Faith", bg: "#0369a1", fg: "#ffffff", accent: "#facc15", icon: "🌊", cta: "Go to Aquaventure", href: "/place/atlantis-the-palm/aquaventure-waterpark" },
  { title: "Nobu Dubai", sub: "Black cod miso · Atlantis", bg: "#0f172a", fg: "#f8fafc", accent: "#e11d48", icon: "🍣", cta: "Book a table", href: "/place/atlantis-the-palm/nobu-dubai" },
  { title: "Tap a building", sub: "Go inside · shop · eat · party", bg: "#e0f2fe", fg: "#0c4a6e", accent: "#0284c7", icon: "👆", cta: "Got it", href: "/explore" },
  { title: "Kite Beach", sub: "Kitesurf · SALT sliders", bg: "#fde68a", fg: "#7c2d12", accent: "#ea580c", icon: "🪁", cta: "Go to Kite Beach", href: "/place/kite-beach/kite-beach" },
  { title: "Burj Al Arab", sub: "Afternoon tea at Sahn Eddar", bg: "#7f1d1d", fg: "#fef3c7", accent: "#d4af37", icon: "⛵", cta: "Visit Burj Al Arab", href: "/explore?open=burj-al-arab" },
  { title: "Get a job", sub: "Work shifts · earn AED", bg: "#e0e7ff", fg: "#312e81", accent: "#4f46e5", icon: "💼", cta: "Find a job", href: "/explore?open=dubai-mall" },
  { title: "The Dubai Mall", sub: "1,200+ shops · Zara to Chanel", bg: "#ffffff", fg: "#0f172a", accent: "#7c3aed", icon: "🛍️", cta: "Go shopping", href: "/explore?open=dubai-mall" },
  { title: "Dubai Aquarium", sub: "Sharks · glass-bottom boat", bg: "#0c4a6e", fg: "#e0f2fe", accent: "#22d3ee", icon: "🦈", cta: "Go to the aquarium", href: "/place/dubai-aquarium/dubai-aquarium-underwater-zoo" },
  { title: "Rent your own flat", sub: "Decorate it · invite friends", bg: "#ecfeff", fg: "#0f172a", accent: "#0891b2", icon: "🏠", cta: "Find a home", href: "/home" },
  { title: "Cloud 22", sub: "Sky pool · Atlantis The Royal", bg: "#ecfeff", fg: "#134e4a", accent: "#0d9488", icon: "🏊", cta: "Go to Cloud 22", href: "/place/atlantis-the-royal/cloud-22" },
  { title: "Armani/Privé", sub: "Glamour nights · Downtown", bg: "#000000", fg: "#f5f5f4", accent: "#d4af37", icon: "🪩", cta: "Go to Armani/Privé", href: "/place/armani-prive/armani-prive" },
  { title: "Meet real people", sub: "Tap anyone · chat · send money", bg: "#fb7185", fg: "#ffffff", accent: "#ffffff", icon: "💬", cta: "Open your phone", href: "/phone" },
  { title: "Madinat Jumeirah", sub: "36 places · souk & abras", bg: "#f2e2bf", fg: "#3b2a1e", accent: "#b08d57", icon: "🕌", cta: "Explore Madinat", href: "/explore?open=madinat-jumeirah" },
  { title: "Hafiz Mustafa 1864", sub: "Baklava & künefe · Souk Madinat", bg: "#7c2d12", fg: "#fef3c7", accent: "#f59e0b", icon: "🍮", cta: "Get dessert", href: "/place/madinat-jumeirah/hafiz-mustafa-1864" },
  { title: "Dance with someone", sub: "Invite them on the dance floor", bg: "#4c1d95", fg: "#f5d0fe", accent: "#e879f9", icon: "💃", cta: "Go to a club", href: "/place/blu-dubai/blu-dubai" },
  { title: "Museum of the Future", sub: "Life in 2071", bg: "#0f172a", fg: "#e0e7ff", accent: "#a78bfa", icon: "🔮", cta: "Go to the museum", href: "/place/motf/museum-of-the-future" },
  { title: "Dubai Opera", sub: "Tonight's show", bg: "#111827", fg: "#fde68a", accent: "#f59e0b", icon: "🎭", cta: "Get tickets", href: "/place/dubai-opera/dubai-opera" },
  { title: "Say hi to a Local", sub: "They hand out gifts 🎁", bg: "#f2b544", fg: "#17143d", accent: "#17143d", icon: "✨", cta: "Find Locals", href: "/explore" },
  { title: "FIVE Palm", sub: "Beach by FIVE · The Penthouse", bg: "#18181b", fg: "#f5d0fe", accent: "#a855f7", icon: "🎉", cta: "Party at FIVE", href: "/explore?open=five-palm-jumeirah" },
  { title: "The View at The Palm", sub: "Level 52 · 360° views", bg: "#0c4a6e", fg: "#f0f9ff", accent: "#38bdf8", icon: "🌴", cta: "Go up", href: "/place/the-palm-tower/the-view-at-the-palm" },
  { title: "1,000,000 AED", sub: "for AED 9.99 · Wallet", bg: "#a3e635", fg: "#14532d", accent: "#14532d", icon: "💰", cta: "Open wallet", href: "/wallet" },
  { title: "Time Out Market", sub: "Dubai's best chefs", bg: "#fef08a", fg: "#111827", accent: "#dc2626", icon: "🍔", cta: "Grab a bite", href: "/explore?open=timeout-market" },
  { title: "Dubai Frame", sub: "Glass floor, 150 m up", bg: "#d4af37", fg: "#1c1917", accent: "#1c1917", icon: "🖼️", cta: "Go to the Frame", href: "/place/dubai-frame/dubai-frame" },
  { title: "Dress up", sub: "New outfits & accessories", bg: "#fdf2f8", fg: "#831843", accent: "#db2777", icon: "👗", cta: "Change outfit", href: "/profile" },
  { title: "Sunset Beach", sub: "The classic Burj Al Arab view", bg: "#fb923c", fg: "#ffffff", accent: "#ffffff", icon: "🌅", cta: "Go to the beach", href: "/place/sunset-beach/sunset-beach-umm-suqeim" },
  { title: "Starbucks", sub: "Coffee at The Dubai Mall", bg: "#14532d", fg: "#ffffff", accent: "#a3e635", icon: "☕", cta: "Get a coffee", href: "/place/dubai-mall/starbucks" },
  { title: "Own a business?", sub: "Claim your venue · AED 1,000/mo", bg: "#ffffff", fg: "#0f172a", accent: "#059669", icon: "✅", cta: "For businesses", href: "/business" },
  { title: "White Beach", sub: "DJs & sunsets at Atlantis", bg: "#f8fafc", fg: "#0f172a", accent: "#e11d48", icon: "🏖️", cta: "Go to White Beach", href: "/place/atlantis-the-palm/white-beach" },
  { title: "Talise Spa", sub: "26 treatment villas", bg: "#e7d3a8", fg: "#3b2a1e", accent: "#0f766e", icon: "💆", cta: "Book a treatment", href: "/place/madinat-jumeirah/talise-spa" },
  { title: "Your ad here", sub: "Tap any spot · 7 days", bg: "#a3e635", fg: "#14532d", accent: "#14532d", icon: "📣", cta: "Advertise here", href: "#advertise" },
];

/** Which free blocks show which house ad: every block of 4+ cells, in order. */
export function houseAdsFor(key: SectionKey): Map<string, HouseAd> {
  const map = new Map<string, HouseAd>();
  let n = 0;
  for (const b of mosaicBlocks(key)) if (b.w * b.h >= 4) map.set(b.id, HOUSE_ADS[n++ % HOUSE_ADS.length]);
  return map;
}

/** The house ad on a block, by block id. */
export function houseAdFor(blockId: string): HouseAd | null {
  return houseAdsFor("a").get(blockId) ?? null;
}
