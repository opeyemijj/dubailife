// Generates supabase/seed/flats.sql from the buildings on the city map.
// Deterministic: the same map always produces the same flats. Run: node supabase/seed/generate-flats.mjs
//
// Prices are in-game AED, anchored to 2026 Downtown Dubai levels (avg ~AED 223k/yr rent across unit types;
// sale prices ~AED 2,600–3,400/sq ft, higher in branded/Burj-facing towers).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const seedTs = fs.readFileSync(path.join(here, "../../src/data/mapSeed.ts"), "utf8");
const buildings = JSON.parse(seedTs.slice(seedTs.indexOf("export const mapSeed = ") + "export const mapSeed = ".length).trim().replace(/;$/, ""));

// Small deterministic PRNG per key.
function rng(key) {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const NPCS = [
  "Mr Dennis", "Sarah Al Mansoori", "Chidi Okafor", "Priya Nair", "Omar Haddad", "Fatima Al Zaabi", "James Whitaker",
  "Aisha Bello", "Ravi Menon", "Elena Petrova", "Hassan Qureshi", "Mei Lin", "Tunde Adeyemi", "Layla Hassan",
  "Marco Rossi", "Ngozi Eze", "Khalid Al Suwaidi", "Grace Mensah", "Arjun Kapoor", "Noura Al Hashimi",
  "Daniel Okoye", "Sofia Martins", "Yusuf Rahman", "Amara Nwosu", "Lucas Weber", "Mariam Saeed",
];

const TYPES = {
  Studio: { bedrooms: 0, sqft: [430, 520], rent: 7000, ppsf: 2600 },
  "1 Bedroom": { bedrooms: 1, sqft: [750, 900], rent: 10500, ppsf: 2700 },
  "2 Bedroom": { bedrooms: 2, sqft: [1200, 1450], rent: 16000, ppsf: 2800 },
  "3 Bedroom": { bedrooms: 3, sqft: [1800, 2200], rent: 24000, ppsf: 3000 },
  Penthouse: { bedrooms: 4, sqft: [3800, 4800], rent: 60000, ppsf: 3800 },
  Townhouse: { bedrooms: 3, sqft: [2200, 2600], rent: 22000, ppsf: 1800 },
  Villa: { bedrooms: 4, sqft: [4200, 5200], rent: 45000, ppsf: 2100 },
};

// Branded / Burj-facing towers command a premium.
const PREMIUM = { "burj-crown-tower": 1.15, "act-one-tower": 1.12, "act-two-tower": 1.1, "the-residences-1-tower": 1.08, "the-residences-2-tower": 1.08, "boulevard-point-tower": 1.12 };

const round = (n, to) => Math.round(n / to) * to;
const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

function occupancy(r) {
  // ~40% owner-occupied NPC homes, ~15% NPC-rented, ~25% for rent, ~12% for sale, ~8% rent or sale.
  const x = r();
  if (x < 0.4) return { owner_npc: NPCS[Math.floor(r() * NPCS.length)] };
  if (x < 0.55) return { tenant_npc: NPCS[Math.floor(r() * NPCS.length)] };
  if (x < 0.8) return { listing: "rent" };
  if (x < 0.92) return { listing: "sale" };
  return { listing: "rent_or_sale" };
}

function flatRow(building, unit, floor, type, r, viewOptions) {
  const t = TYPES[type];
  const premium = (PREMIUM[building.id] ?? 1) * (1 + (floor ?? 0) * 0.004);
  const sqft = round(t.sqft[0] + r() * (t.sqft[1] - t.sqft[0]), 5);
  const occ = occupancy(r);
  return {
    id: `${building.id}:${unit}`,
    building_id: building.id,
    unit,
    floor,
    property_type: type,
    bedrooms: t.bedrooms,
    size_sqft: sqft,
    view: viewOptions[Math.floor(r() * viewOptions.length)],
    owner_npc: occ.owner_npc ?? null,
    tenant_npc: occ.tenant_npc ?? null,
    listing: occ.listing ?? "none",
    rent_price: round(t.rent * premium * (0.92 + r() * 0.16), 250),
    sale_price: round(sqft * t.ppsf * premium * (0.94 + r() * 0.12), 10000),
    access: occ.owner_npc || occ.tenant_npc ? (r() < 0.25 ? "public" : "private") : "private",
  };
}

const rows = [];
for (const b of buildings) {
  const r = rng(b.id);
  if (b.type === "tall-building") {
    const floors = b.floors ?? 30;
    // A representative set of listed floors: low, mid, high, plus the penthouse level.
    const picks = [3, 7, 12, 18, Math.round(floors * 0.7), floors - 3].filter((f, i, a) => f > 1 && f < floors && a.indexOf(f) === i);
    for (const floor of picks) {
      ["01", "02"].forEach((suffix, i) => {
        const type = floor >= floors - 4 && i === 0 ? "3 Bedroom" : ["Studio", "1 Bedroom", "1 Bedroom", "2 Bedroom", "2 Bedroom", "3 Bedroom"][Math.floor(r() * 6)];
        rows.push(flatRow(b, `${floor}${suffix}`, floor, type, r, ["Burj Khalifa view", "Fountain view", "Boulevard view", "City view", "Pool view"]));
      });
    }
    rows.push(flatRow(b, `PH${floors}`, floors, "Penthouse", r, ["Full Burj Khalifa & Fountain view"]));
  } else if (b.type === "dubai-villa") {
    rows.push(flatRow(b, "Villa", 0, "Villa", r, ["Garden & lake view", "Burj Khalifa view", "Courtyard view"]));
  } else if (b.type === "small-house") {
    rows.push(flatRow(b, "House", 0, "Townhouse", r, ["Community park view", "Courtyard view", "Street view"]));
  }
}

const cols = ["id", "building_id", "unit", "floor", "property_type", "bedrooms", "size_sqft", "view", "owner_npc", "tenant_npc", "listing", "rent_price", "sale_price", "access"];
const sql = [
  "-- Generated by supabase/seed/generate-flats.mjs from src/data/mapSeed.ts. Re-running only adds missing flats.",
  `insert into public.flats (${cols.join(", ")}) values`,
  rows.map((row) => `  (${cols.map((c) => q(row[c])).join(", ")})`).join(",\n"),
  "on conflict (id) do nothing;",
  "",
].join("\n");
fs.writeFileSync(path.join(here, "flats.sql"), sql);
const by = (k) => rows.reduce((m, x) => ((m[x[k]] = (m[x[k]] ?? 0) + 1), m), {});
console.log(`${rows.length} flats`, by("property_type"), by("listing"), "npc-owned", rows.filter((x) => x.owner_npc).length, "npc-rented", rows.filter((x) => x.tenant_npc).length);
