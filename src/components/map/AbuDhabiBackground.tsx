"use client";

// Abu Dhabi's ground (/abu-dhabi): the Arabian Gulf across the top with the islands in it (Saadiyat, Yas,
// Abu Dhabi island and Al Reem, each on a sandy beach), the Al Maqtaa channel cutting the island off from the
// mainland, the bridges over it, and the highways: the Corniche Road along the shore, the E10 to the airport and
// Yas, and the E11 east to Dubai. Drawn in rendered map coordinates (y down), under the plains and buildings.

import { AD_PLAINS, type AdPlain } from "@/lib/city/abuDhabi/map";

const W = 4000, H = 2600;
const SLANT = 0.2355, TILT = 0.01667;

/** A plain's outline (as FloorTile draws it, centred where the map puts it), pushed out by `pad`. */
function outline(p: AdPlain, pad: number) {
  const yc = p.y + (p.x - 2000) * TILT;
  const w = p.w + pad * 2, h = p.h + pad * 2;
  const left = p.x - w / 2, top = yc - h / 2;
  const sx = h * SLANT, ty = (w - sx) * TILT;
  return [
    [left + sx, top], [left + w, top + ty], [left + w - sx, top + h], [left, top + h - ty],
  ].map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(" ");
}

const plain = (id: string) => AD_PLAINS.find((p) => p.id === id)!;
/** A plain's centre in rendered coordinates. */
const mid = (id: string) => { const p = plain(id); return { x: p.x, y: p.y + (p.x - 2000) * TILT }; };

// Boats on the Gulf: dhows and yachts crossing slowly between the islands.
const BOATS = Array.from({ length: 9 }, (_, i) => ({
  y: 330 + (i % 3) * 220 + (i * 37) % 60, dur: 70 + (i * 23) % 50, delay: -((i * 31) % 70), dhow: i % 3 === 0, rev: i % 2 === 1,
}));

export function AbuDhabiBackground() {
  const boats = BOATS;
  const islands = AD_PLAINS.filter((p) => p.island);
  // Boats on the Gulf: dhows and yachts crossing slowly between the islands.

  const corniche = mid("ad-tile-corniche"), reem = mid("ad-tile-reem"), raha = mid("ad-tile-raha"), yas = mid("ad-tile-yas");
  const saadiyat = mid("ad-tile-saadiyat"), mosque = mid("ad-tile-mosque"), khalifa = mid("ad-tile-khalifa"), auh = mid("ad-tile-auh");
  const roadY = (id: string) => { const p = plain(id); return mid(id).y + p.h / 2 + 38; };
  return (
    <svg width={W} height={H} className="map-animated absolute inset-0 pointer-events-none overflow-visible">
      <defs>
        <linearGradient id="ad-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3aa6dd" />
          <stop offset="1" stopColor="#6cc4ee" />
        </linearGradient>
        <pattern id="ad-ripples" width="120" height="60" patternUnits="userSpaceOnUse">
          <path d="M0 30 Q30 22 60 30 T120 30" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="3" />
        </pattern>
      </defs>
      {/* The desert all round, past the edges too. */}
      <rect x={-2000} y={-1500} width={W + 4000} height={H + 3000} fill="#d6bc8a" />
      {/* The Gulf, down to the mainland shore just under Abu Dhabi island, with the shore curving away. */}
      <path d={`M -2000,-1500 L ${W + 2000},-1500 L ${W + 2000},1180 C ${W + 600},1230 ${W - 400},1330 3500,1340 L 2240,1360 C 1600,1366 600,1364 -400,1356 C -1100,1350 -1600,1330 -2000,1320 Z`} fill="url(#ad-sea)" />
      <path d={`M -2000,-1500 L ${W + 2000},-1500 L ${W + 2000},1180 C ${W + 600},1230 ${W - 400},1330 3500,1340 L 2240,1360 C 1600,1366 600,1364 -400,1356 C -1100,1350 -1600,1330 -2000,1320 Z`} fill="url(#ad-ripples)" />
      {/* The mainland shore's beach. */}
      <path d={`M ${W + 2000},1180 C ${W + 600},1230 ${W - 400},1330 3500,1340 L 2240,1360 C 1600,1366 600,1364 -400,1356 C -1100,1350 -1600,1330 -2000,1320`} fill="none" stroke="#f3dfa6" strokeWidth="26" strokeLinecap="round" />
      {/* Each island on its beach, with a lighter shallows ring. */}
      {islands.map((p) => <polygon key={`s${p.id}`} points={outline(p, 70)} fill="#9fdcf5" opacity={0.7} />)}
      {islands.map((p) => <polygon key={`b${p.id}`} points={outline(p, 34)} fill="#f3dfa6" />)}
      {/* Mangroves east of the island (the Eastern Mangroves). */}
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse key={`m${i}`} cx={reem.x + 380 + (i % 7) * 34} cy={reem.y + 120 + Math.floor(i / 7) * 40 + (i % 3) * 8} rx={20} ry={11} fill="#3f7d4a" opacity={0.85} />
      ))}

      {/* Highways: grey roadbeds with dashed lanes. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[
          // The Corniche Road along the island's Gulf shore.
          `M ${corniche.x - 700},${corniche.y - 230} L ${reem.x + 360},${reem.y - 230 + 1340 * TILT}`,
          // The E10 / Sheikh Zayed Bridge: from the island over the channel, past the mosque to Khalifa City and the airport.
          `M ${corniche.x + 300},${roadY("ad-tile-corniche")} L ${corniche.x + 360},${roadY("ad-tile-mosque") - 470} L ${auh.x + 760},${roadY("ad-tile-mosque") - 470 + (auh.x + 760 - corniche.x - 360) * TILT}`,
          // The E11 east to Dubai, along the bottom of the airport plain.
          `M ${mosque.x - 700},${roadY("ad-tile-mosque")} L ${W + 1200},${roadY("ad-tile-mosque") + (W + 1200 - mosque.x + 700) * TILT}`,
          // Up to Yas Island over the water from Al Raha.
          `M ${raha.x + 300},${raha.y - 160} L ${yas.x + 260},${yas.y + 220}`,
          // Saadiyat bridge from the island.
          `M ${corniche.x + 560},${corniche.y - 200} L ${saadiyat.x + 420},${saadiyat.y + 210}`,
          // The wider city's ring roads: under the mainland's rows, west to MBZ City and Mussafah, east to Masdar and
          // Al Shahama, and south past Mina Zayed, Shams and Al Samha.
          `M -1500,${roadY("ad-tile-mbz")} L ${W + 1700},${roadY("ad-tile-mbz") + (W + 3200) * TILT}`,
          `M -1500,${roadY("ad-tile-mussafah")} L ${W + 1700},${roadY("ad-tile-mussafah") + (W + 3200) * TILT}`,
          `M -1500,${roadY("ad-tile-mina")} L ${W + 1700},${roadY("ad-tile-mina") + (W + 3200) * TILT}`,
          // Al Wathba road south from Khalifa City.
          `M ${khalifa.x},${roadY("ad-tile-khalifa")} L ${khalifa.x - 420},${roadY("ad-tile-wathba") - 180}`,
        ].map((d, i) => (
          <g key={i}>
            <path d={d} stroke="#4b5563" strokeWidth={46} />
            <path d={d} stroke="#f8fafc" strokeWidth={3} strokeDasharray="26 22" opacity={0.85} />
          </g>
        ))}
      </g>
      {/* The bridges' white arches over the channel (Sheikh Zayed Bridge) and the Saadiyat and Yas crossings. */}
      {[
        { x: corniche.x + 330, y: roadY("ad-tile-corniche") + 70 },
        { x: (corniche.x + 560 + saadiyat.x + 420) / 2, y: (corniche.y - 200 + saadiyat.y + 210) / 2 },
        { x: (raha.x + 300 + yas.x + 260) / 2, y: (raha.y - 160 + yas.y + 220) / 2 },
      ].map((b, i) => (
        <g key={`br${i}`} transform={`translate(${b.x},${b.y})`}>
          <path d="M -60,8 Q -30,-46 0,8 Q 30,-46 60,8" fill="none" stroke="#f8fafc" strokeWidth={7} />
          <path d="M -60,8 Q -30,-30 0,8 Q 30,-30 60,8" fill="none" stroke="#cbd5e1" strokeWidth={3} />
        </g>
      ))}
      {/* Sand dunes out in the desert. */}
      {Array.from({ length: 22 }, (_, i) => (
        <path key={`d${i}`} d={`M ${200 + (i * 197) % 3800},${2380 + (i * 61) % 260} q 60,-34 120,0`} fill="none" stroke="#c9a66b" strokeWidth={8} strokeLinecap="round" opacity={0.7} />
      ))}
      {/* Boats crossing the Gulf. */}
      {boats.map((b, i) => (
        <g key={`boat${i}`}>
          <animateMotion dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" path={b.rev ? `M ${W + 200},${b.y} L -200,${b.y + 30}` : `M -200,${b.y} L ${W + 200},${b.y + 30}`} />
          {b.dhow ? (
            <g transform={b.rev ? "scale(-1,1)" : undefined}>
              <path d="M -26,0 L 26,0 L 18,9 L -20,9 Z" fill="#8b5a2b" />
              <path d="M 0,-2 L 0,-34 L 20,-4 Z" fill="#f8fafc" />
            </g>
          ) : (
            <g transform={b.rev ? "scale(-1,1)" : undefined}>
              <path d="M -24,0 L 22,0 L 30,-6 L -20,-6 Z" fill="#ffffff" />
              <rect x={-10} y={-13} width={20} height={7} rx={2} fill="#e2e8f0" />
              <path d="M -40,2 L -26,2" stroke="#ffffff" strokeWidth={2} opacity={0.7} />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
