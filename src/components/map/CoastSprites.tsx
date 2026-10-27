import React from 'react';

// The Jumeirah coastline on the city map: Burj Al Arab on its island, its neighbours and the public
// beaches (placed by lib/city/coast.ts). Drawn in the map's tilted view, ground at the bottom.

const label = (name: string, w: number, y: number) => {
  const bw = Math.min(w - 4, name.length * 5.8 + 16);
  return (
    <g>
      <rect x={w / 2 - bw / 2} y={y} width={bw} height="15" rx="7.5" fill="#0f172a" opacity="0.82" />
      <text x={w / 2} y={y + 11} fontSize="8.5" fontWeight="800" fill="#fff" textAnchor="middle">{name.length > 34 ? `${name.slice(0, 33)}…` : name}</text>
    </g>
  );
};

const palm = (x: number, y: number, s = 1) => (
  <g key={`${x}-${y}`}><rect x={x - 1.2 * s} y={y - 14 * s} width={2.4 * s} height={14 * s} fill="#92400e" /><circle cx={x} cy={y - 15 * s} r={6 * s} fill="#16a34a" /></g>
);

/**
 * Burj Al Arab in 3D: the sail as a curved, shaded surface with visible thickness, the steel spine and
 * exoskeleton as solid frames, a helipad and Al Muntaha's cantilever with depth, all on a raised round
 * island casting a shadow on the sea, with the curved bridge back to the shore.
 */
export const BurjAlArabSprite = ({ width = 200, height = 330, name = 'Burj Al Arab' }: { width?: number; height?: number; name?: string }) => (
  <svg viewBox="0 0 200 330" width={width} height={height} className="drop-shadow-xl overflow-visible">
    <defs>
      {/* the sail's curve: bright where it faces the light, greyer as it turns away */}
      <linearGradient id="baa-sail" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="35%" stopColor="#ffffff" />
        <stop offset="70%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>
      <linearGradient id="baa-sail-edge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <linearGradient id="baa-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="baa-steel-dark" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <linearGradient id="baa-rock" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a8a29e" />
        <stop offset="100%" stopColor="#57534e" />
      </linearGradient>
      <radialGradient id="baa-sand" cx="45%" cy="40%" r="65%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="100%" stopColor="#fcd34d" />
      </radialGradient>
    </defs>

    {/* shadow on the sea, cast to the right */}
    <ellipse cx="128" cy="314" rx="86" ry="16" fill="#0c4a6e" opacity="0.25" />

    {/* the curved bridge, a raised deck running down to the shore below the island */}
    <path d="M84,306 C66,342 96,382 68,438" stroke="#64748b" strokeWidth="11" fill="none" strokeLinecap="round" transform="translate(2 4)" opacity="0.6" />
    <path d="M84,306 C66,342 96,382 68,438" stroke="#e2e8f0" strokeWidth="9" fill="none" strokeLinecap="round" />
    <path d="M84,306 C66,342 96,382 68,438" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 4" fill="none" />

    {/* the island: a raised disc with a rock wall, sand on top and the terrace pool */}
    <path d="M24,294 L24,306 A76 18 0 0 0 176,306 L176,294 Z" fill="url(#baa-rock)" />
    <ellipse cx="100" cy="294" rx="76" ry="18" fill="url(#baa-sand)" stroke="#fde68a" strokeWidth="1" />
    <ellipse cx="134" cy="298" rx="22" ry="5" fill="#0891b2" />
    <ellipse cx="134" cy="297" rx="20" ry="4" fill="#22d3ee" stroke="#fff" strokeWidth="0.8" />
    {[[40, 292], [160, 290], [118, 284]].map(([x, y]) => (
      <g key={x}><rect x={x - 1} y={y - 11} width="2" height="11" fill="#92400e" /><circle cx={x} cy={y - 12} r="5" fill="#16a34a" /></g>
    ))}

    {/* the sail's far edge, showing its thickness */}
    <path d="M78,22 Q144,92 156,290 L150,292 Q138,94 74,26 Z" fill="url(#baa-sail-edge)" />
    {/* the sail itself */}
    <path d="M72,292 L72,40 Q76,24 80,20 Q140,92 150,292 Z" fill="url(#baa-sail)" stroke="#94a3b8" strokeWidth="0.8" />
    {/* the fabric's horizontal seams, curving with the surface */}
    {Array.from({ length: 12 }, (_, i) => {
      const y = 52 + i * 20;
      const edge = 80 + (Math.min(1, (y - 20) / 270) ** 0.8) * 70;
      return <path key={i} d={`M72,${y + 4} Q${(72 + edge) / 2 + 6},${y - 4} ${edge},${y + 2}`} stroke="#cbd5e1" strokeWidth="0.7" fill="none" />;
    })}
    {/* the glass atrium slit down the middle */}
    <path d="M86,280 L86,70 Q94,90 98,280 Z" fill="#bae6fd" opacity="0.45" />

    {/* the spine: a solid steel column with a lit face and a shaded side */}
    <rect x="60" y="44" width="12" height="250" fill="url(#baa-steel)" />
    <polygon points="72,44 76,40 76,290 72,294" fill="url(#baa-steel-dark)" />
    {/* the exoskeleton: two outer legs with cross-bracing, each with a shaded side */}
    {[50, 42].map((x, k) => (
      <g key={x}>
        <rect x={x} y={70 + k * 26} width="4" height={224 - k * 26} fill="#e5e7eb" />
        <rect x={x + 4} y={70 + k * 26} width="1.6" height={224 - k * 26} fill="#94a3b8" />
      </g>
    ))}
    {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M42,${282 - i * 34} L60,${264 - i * 34} M50,${270 - i * 34} L60,${252 - i * 34}`} stroke="#d1d5db" strokeWidth="1.8" />)}

    {/* the mast */}
    <rect x="66" y="0" width="3" height="44" fill="#e5e7eb" />
    <rect x="69" y="0" width="1.2" height="44" fill="#94a3b8" />

    {/* the helipad: a disc with thickness on its strut */}
    <path d="M60,82 L46,86" stroke="#94a3b8" strokeWidth="2" />
    <path d="M30,74 L30,78 A16 4.5 0 0 0 62,78 L62,74 Z" fill="#475569" />
    <ellipse cx="46" cy="74" rx="16" ry="4.5" fill="#cbd5e1" />
    <ellipse cx="46" cy="74" rx="9" ry="2.4" fill="none" stroke="#f8fafc" strokeWidth="0.8" />
    <text x="46" y="76" fontSize="4" fontWeight="900" fill="#475569" textAnchor="middle">H</text>

    {/* Al Muntaha: the cantilevered sky restaurant, a box with a lit underside */}
    <polygon points="76,50 108,46 108,54 76,58" fill="#e2e8f0" />
    <polygon points="76,58 108,54 110,57 78,61" fill="#64748b" />
    <polygon points="108,46 111,44 111,52 108,54" fill="#94a3b8" />
    <rect x="80" y="51" width="24" height="2" fill="#38bdf8" opacity="0.8" />

    {label(name, 200, 312)}
  </svg>
);

/** Jumeirah Beach Hotel: the long, rising wave next to Burj Al Arab. */
export const JumeirahBeachHotelSprite = ({ width = 220, height = 150, name = 'Jumeirah Beach Hotel' }: { width?: number; height?: number; name?: string }) => (
  <svg viewBox="0 0 220 150" width={width} height={height} className="drop-shadow-lg overflow-visible">
    <polygon points="4,140 216,140 200,112 20,112" fill="#fde68a" />
    <ellipse cx="60" cy="126" rx="26" ry="5" fill="#22d3ee" stroke="#fff" strokeWidth="1" />
    {/* the wave: low on the left, cresting on the right */}
    <path d="M20,118 C60,116 120,96 160,48 Q180,22 196,14 L200,118 Z" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1.2" />
    <path d="M40,117 C80,112 128,92 164,56 Q182,34 196,26 L198,117 Z" fill="#bae6fd" opacity="0.7" />
    {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${30 + i * 8},${117 - i * 2} C${80 + i * 4},${112 - i * 6} ${130 + i * 2},${92 - i * 4} ${168 + i * 2},${54 - i * 3}`} stroke="#38bdf8" strokeWidth="0.7" fill="none" opacity="0.6" />)}
    <path d="M196,14 L200,118 L208,112 L204,10 Z" fill="#7dd3fc" />
    {[palm(14, 132), palm(110, 132), palm(206, 132)]}
    {label(name, 220, 136)}
  </svg>
);

/** A block in the map's tilted view: lit front, shaded side going back, and the roof on top. */
function Block({ x, y, w, h, d, front, side, top, children }: { x: number; y: number; w: number; h: number; d: number; front: string; side: string; top: string; children?: React.ReactNode }) {
  const dx = d * 0.8, dy = d * 0.55;
  return (
    <g>
      <polygon points={`${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y + h - dy} ${x + w},${y + h}`} fill={side} />
      <polygon points={`${x},${y} ${x + dx},${y - dy} ${x + w + dx},${y - dy} ${x + w},${y}`} fill={top} />
      <rect x={x} y={y} width={w} height={h} fill={front} />
      {children}
    </g>
  );
}

/**
 * Madinat Jumeirah in 3D: sand-stone buildings as solid blocks with crenellated parapets, wind towers
 * (barjeel) with depth and louvres, arched windows set into the walls, and a canal sunk into a raised
 * ground plate with abras on it.
 */
export const MadinatJumeirahSprite = ({ width = 240, height = 150, name = 'Madinat Jumeirah' }: { width?: number; height?: number; name?: string }) => {
  const stone = { front: '#f2e2bf', side: '#d4b98a', top: '#fbf1d9' };
  const buildings: Array<[number, number, number, number, number]> = [
    // x, ground y, width, height, depth (back row first so the front row overlaps it)
    [96, 92, 58, 44, 16], [30, 100, 50, 30, 14], [160, 98, 44, 32, 14], [58, 112, 40, 22, 12], [196, 112, 30, 20, 10],
  ];
  return (
    <svg viewBox="0 0 240 150" width={width} height={height} className="drop-shadow-lg overflow-visible">
      <defs>
        <linearGradient id="madinat-canal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e7490" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {/* the raised ground plate */}
      <polygon points="6,140 234,140 234,145 6,145" fill="#b59a6a" />
      <polygon points="6,140 234,140 214,92 26,92" fill="#e7d3a8" />
      {/* shadows of the buildings on the ground */}
      {buildings.map(([x, gy, w, , d], i) => <polygon key={`s${i}`} points={`${x + w},${gy} ${x + w + d * 1.6},${gy - 2} ${x + w + d * 1.6 + 6},${gy + 6} ${x + w + 4},${gy + 6}`} fill="#000" opacity="0.12" />)}
      {buildings.map(([x, gy, w, h, d], i) => {
        const y = gy - h;
        const dx = d * 0.8, dy = d * 0.55;
        const towerX = x + w * 0.42;
        return (
          <g key={i}>
            <Block x={x} y={y} w={w} h={h} d={d} {...stone}>
              {/* crenellated parapet along the roof edge */}
              {Array.from({ length: Math.floor(w / 7) }, (_, k) => <rect key={k} x={x + 1 + k * 7} y={y - 3} width="4" height="3" fill={stone.front} />)}
              {/* arched windows with a dark recess */}
              {Array.from({ length: Math.max(1, Math.floor(w / 14)) }, (_, k) => {
                const wx = x + 5 + k * 14;
                return (
                  <g key={k}>
                    <path d={`M${wx},${gy - 4} v-${h * 0.35} q4,-6 8,0 v${h * 0.35} z`} fill="#7c5a2e" />
                    <path d={`M${wx + 1},${gy - 4} v-${h * 0.35 - 1} q3,-4 6,0 v${h * 0.35 - 1} z`} fill="#3b2a1e" opacity="0.55" />
                  </g>
                );
              })}
              {/* a lantern by the door */}
              <circle cx={x + w - 5} cy={gy - h * 0.55} r="1.6" fill="#fbbf24" />
            </Block>
            {/* the wind tower on the roof: a slim block with louvred openings */}
            <Block x={towerX} y={y - dy * 0.5 - 22} w={10} h={22} d={6} {...stone}>
              {[0, 1, 2].map((k) => <rect key={k} x={towerX + 1.5} y={y - dy * 0.5 - 19 + k * 6} width="7" height="3" fill="#7c5a2e" />)}
              <polygon points={`${towerX + 10},${y - dy * 0.5 - 19} ${towerX + 10 + 4.8},${y - dy * 0.5 - 22.3} ${towerX + 10 + 4.8},${y - dy * 0.5 - 6} ${towerX + 10},${y - dy * 0.5 - 3}`} fill="#7c5a2e" opacity="0.35" />
            </Block>
            {/* the roof's far edge where the parapet turns back */}
            <polyline points={`${x},${y} ${x + dx},${y - dy} ${x + w + dx},${y - dy}`} fill="none" stroke="#e8d5ab" strokeWidth="0.6" />
          </g>
        );
      })}
      {/* the canal, sunk into the ground plate, with abras */}
      <path d="M10,138 C70,124 120,142 230,122 L232,130 C120,150 70,132 12,146 Z" fill="#a8895a" />
      <path d="M10,136 C70,122 120,140 230,120 L231,127 C120,147 70,129 11,143 Z" fill="url(#madinat-canal)" />
      {[[60, 131], [150, 131]].map(([x, y]) => (
        <g key={x}>
          <path d={`M${x - 8},${y} q8,4 16,0 l-2,3 h-12 z`} fill="#78350f" />
          <rect x={x - 4} y={y - 5} width="8" height="4" fill="#fbbf24" opacity="0.85" />
        </g>
      ))}
      {[palm(18, 108), palm(150, 96, 1.2), palm(228, 110), palm(112, 128, 0.9)]}
      {label(name, 240, 132)}
    </svg>
  );
};

/** Wild Wadi: twisting slides from a central tower into lagoons. */
export const WildWadiSprite = ({ width = 170, height = 130, name = 'Wild Wadi Waterpark' }: { width?: number; height?: number; name?: string }) => (
  <svg viewBox="0 0 170 130" width={width} height={height} className="drop-shadow-lg overflow-visible">
    <polygon points="4,122 166,122 152,86 18,86" fill="#86c96b" />
    <ellipse cx="50" cy="106" rx="34" ry="9" fill="#22d3ee" stroke="#fff" strokeWidth="1.5" />
    <ellipse cx="124" cy="110" rx="28" ry="7" fill="#22d3ee" stroke="#fff" strokeWidth="1.5" />
    {/* slide tower and slides */}
    <rect x="80" y="26" width="14" height="70" fill="#d6bc8a" />
    <polygon points="76,26 98,26 87,12" fill="#b45309" />
    <path d="M94,34 C130,40 140,70 124,104" stroke="#f97316" strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M80,40 C40,48 30,80 50,100" stroke="#facc15" strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M94,58 C120,62 112,86 96,100" stroke="#ec4899" strokeWidth="5" fill="none" strokeLinecap="round" />
    {label(name, 170, 112)}
  </svg>
);

/**
 * A public beach: shallow water at the back, sand in front, umbrellas and loungers, a lifeguard tower and
 * palms. The ground is laid out like every plot on the map: the far edge sits further right than the
 * near one (0.2355 × the depth), with a thin front edge, so beaches recede the same way as the city.
 * Variants add what each beach is known for (kites and food trucks at Kite Beach…).
 */
const BEACH_D = 92;                       // depth of the ground, back edge (y 0) to front edge (y 92)
const BEACH_SLANT = BEACH_D * 0.2355;     // how far right the back edge sits
const BEACH_W = 300 - BEACH_SLANT;        // width of each edge
/** A point on the beach (x 0–300 along it, y 0 at the water's back edge to 92 at the front) on screen. */
const bp = (x: number, y: number) => [x * (BEACH_W / 300) + BEACH_SLANT * (1 - y / BEACH_D), y] as const;
const band = (y0: number, y1: number) => [bp(0, y0), bp(300, y0), bp(300, y1), bp(0, y1)].map(([x, y]) => `${x},${y}`).join(' ');

export const CoastBeachSprite = ({ width = 300, height = 108, name = 'Beach', variant = 'public' }: { width?: number; height?: number; name?: string; variant?: string }) => {
  const umbrellaColors = ['#f43f5e', '#0ea5e9', '#f59e0b', '#10b981', '#a855f7'];
  return (
    <svg viewBox="0 0 300 108" width={width} height={height} preserveAspectRatio="none" className="drop-shadow-md overflow-visible">
      {/* the ground's front edge, then shallow water, wet sand and dry sand receding to the right */}
      <polygon points={`${bp(0, BEACH_D).join(',')} ${bp(300, BEACH_D).join(',')} ${bp(300, BEACH_D)[0]},${BEACH_D + 4} 0,${BEACH_D + 4}`} fill="#d6a756" />
      <polygon points={band(0, 22)} fill="#67e8f9" opacity="0.8" />
      <polygon points={band(22, 32)} fill="#fde68a" />
      <polygon points={band(32, BEACH_D)} fill="#fef3c7" />
      {/* swimmers */}
      {[40, 120, 210, 268].map((x, i) => { const [px, py] = bp(x, 8 + (i % 2) * 6); return <circle key={x} cx={px} cy={py} r="1.8" fill="#7c2d12" />; })}
      {/* umbrellas and loungers, upright on the sand */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = bp(18 + i * 23 + (i % 2) * 4, 50 + (i % 3) * 10);
        return (
          <g key={i}>
            <polygon points={`${x - 6},${y + 4} ${x + 6},${y + 4} ${x + 7.4},${y + 1} ${x - 4.6},${y + 1}`} fill="#fff" stroke="#e5e7eb" strokeWidth="0.4" />
            <rect x={x - 0.6} y={y - 5} width="1.2" height="9" fill="#78716c" />
            <ellipse cx={x} cy={y - 5} rx="8" ry="3.2" fill={umbrellaColors[i % umbrellaColors.length]} />
          </g>
        );
      })}
      {/* lifeguard tower */}
      {(() => { const [x, y] = bp(150, 54); return <g><rect x={x} y={y - 14} width="2" height="14" fill="#b91c1c" /><rect x={x + 8} y={y - 14} width="2" height="14" fill="#b91c1c" /><rect x={x - 4} y={y - 22} width="18" height="9" fill="#dc2626" /><rect x={x + 14} y={y - 24} width="3" height="9" fill="#991b1b" /><polygon points={`${x - 6},${y - 22} ${x + 5},${y - 29} ${x + 16},${y - 22}`} fill="#fff" /></g>; })()}
      {variant === 'kite' && (<>
        {/* kitesurfers' kites over the water, and the food trucks behind the beach */}
        {[[60, '#f43f5e', -26], [140, '#facc15', -34], [230, '#22c55e', -22]].map(([x, c, y]) => {
          const [px] = bp(x as number, 0);
          return <g key={x as number}><path d={`M${px},${y} q14,-10 28,0 q-14,4 -28,0`} fill={c as string} /><path d={`M${px + 14},${(y as number) + 2} L${px + 6},${(y as number) + 34}`} stroke="#334155" strokeWidth="0.5" /></g>;
        })}
        {[[70, 'SALT', '#fff'], [118, 'Tacos', '#fde047'], [166, 'Coffee', '#a7f3d0']].map(([x, t, c]) => {
          const [px, py] = bp(x as number, 86);
          return <g key={t as string}><polygon points={`${px + 34},${py - 14} ${px + 37},${py - 17} ${px + 37},${py - 3} ${px + 34},${py}`} fill="#94a3b8" /><rect x={px} y={py - 14} width="34" height="14" rx="2" fill={c as string} stroke="#334155" strokeWidth="0.6" /><text x={px + 17} y={py - 4} fontSize="6.5" fontWeight="900" fill="#0f172a" textAnchor="middle">{t as string}</text></g>;
        })}
      </>)}
      {variant === 'sunset' && <circle cx={bp(270, 0)[0]} cy="-4" r="12" fill="#fb923c" opacity="0.9" />}
      {variant === 'j1' && (<>
        {/* the boardwalk and its cafés */}
        <polygon points={band(80, 86)} fill="#d6a76c" />
        {[40, 120, 200].map((x) => { const [px, py] = bp(x, 80); return <g key={x}><polygon points={`${px + 26},${py - 12} ${px + 30},${py - 15} ${px + 30},${py - 3} ${px + 26},${py}`} fill="#e7e5e4" /><rect x={px} y={py - 12} width="26" height="12" fill="#fff7ed" stroke="#d6d3d1" strokeWidth="0.6" /><rect x={px} y={py - 14} width="26" height="3" fill="#0f766e" /></g>; })}
      </>)}
      {variant === 'jbr' && (<>
        {/* The Walk's towers behind the sand: front and right side */}
        {[20, 70, 120, 170, 220, 260].map((x, i) => {
          const [px, py] = bp(x, 88);
          const h = 40 + (i % 3) * 14;
          return <g key={x} opacity="0.92"><polygon points={`${px + 22},${py - h} ${px + 28},${py - h - 5} ${px + 28},${py - 5} ${px + 22},${py}`} fill="#94a3b8" /><polygon points={`${px},${py - h} ${px + 6},${py - h - 5} ${px + 28},${py - h - 5} ${px + 22},${py - h}`} fill="#f1f5f9" /><rect x={px} y={py - h} width="22" height={h} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.6" /></g>;
        })}
      </>)}
      {/* palms along the front of the beach */}
      {[12, 80, 150, 222, 290].map((x) => { const [px] = bp(x, BEACH_D); return palm(px, BEACH_D, 0.9); })}
      {label(name, 300, 94)}
    </svg>
  );
};
