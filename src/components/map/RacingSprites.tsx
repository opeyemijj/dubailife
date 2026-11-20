// Map sprites for the race days (lib/city/racing.ts), drawn like the map's other landmarks (see OldDubaiSprites):
// an isometric block on a paved plinth, base at the bottom, depth running up and to the right (0.55 across for each
// 1 up), with a name board underneath. The oval lies flat on the ground in the same projection.
//  - Meydan Racecourse: the dirt and turf ovals with the infield lake, the long grandstand at the back under its
//    crescent roof with the gold edge, the big screen in the infield and horses on the home straight.
//  - Al Marmoom Camel Racetrack: the sand oval inside the 4x4 road, a shaded stand, dunes behind, camels with their
//    robot jockeys and the owners' 4x4s.

import React from 'react';

type SpriteProps = { width?: number; height?: number; name?: string };
const SVG_CLASS = 'drop-shadow-xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none overflow-visible';

/** The map's projection: ground point (u across, v deep) from the plinth's front-left corner (x0, y0). */
const ground = (x0: number, y0: number) => (u: number, v: number) => [x0 + u + v * 0.55, y0 - v] as const;

/** An oval lying on the ground (centre cu, cv; half-length a across, half-depth b), as a closed path. */
function ovalPath(P: (u: number, v: number) => readonly [number, number], cu: number, cv: number, a: number, b: number, n = 56) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    // A racecourse oval: long straights and round ends (a superellipse).
    const c = Math.cos(t), s = Math.sin(t);
    const [x, y] = P(cu + a * Math.sign(c) * Math.abs(c) ** 0.6, cv + b * Math.sign(s) * Math.abs(s) ** 0.6);
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + 'Z';
}

/** An isometric box: front face, right side and top, from its front-left foot (x, y). Depth runs up-right. */
function Box({ x, y, w, h, d, front, side, top, stroke = '#00000022' }: { x: number; y: number; w: number; h: number; d: number; front: string; side: string; top: string; stroke?: string }) {
  const dx = d * 0.55, dy = d;
  return (
    <g>
      <polygon points={`${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y - dy - h} ${x + w},${y - h}`} fill={side} stroke={stroke} strokeWidth="0.5" />
      <polygon points={`${x},${y - h} ${x + w},${y - h} ${x + w + dx},${y - h - dy} ${x + dx},${y - h - dy}`} fill={top} stroke={stroke} strokeWidth="0.5" />
      <rect x={x} y={y - h} width={w} height={h} fill={front} stroke={stroke} strokeWidth="0.5" />
    </g>
  );
}

/** The ground a landmark stands on: its top, and the edge along the front. */
function Plinth({ x, y, w, d, fill, edge }: { x: number; y: number; w: number; d: number; fill: string; edge: string }) {
  const dx = d * 0.55;
  return (
    <g>
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + dx},${y - d} ${x + w + dx},${y - d + 4} ${x + w},${y + 4} ${x},${y + 4}`} fill={edge} />
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + dx},${y - d} ${x + dx},${y - d}`} fill={fill} stroke={edge} strokeWidth="0.8" />
    </g>
  );
}

function NameBoard({ x, y, text, bg, fg = '#ffffff' }: { x: number; y: number; text: string; bg: string; fg?: string }) {
  const w = Math.max(60, text.length * 6.2 + 16);
  return (
    <g>
      <rect x={x - w / 2} y={y - 9} width={w} height={15} rx="7.5" fill={bg} opacity="0.94" />
      <text x={x} y={y + 2} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={fg} fontFamily="system-ui, sans-serif">{text}</text>
    </g>
  );
}

/** A small runner on the ground, seen side on: a horse with its jockey, or a camel with its robot. */
function Runner({ x, y, coat, silk, camel }: { x: number; y: number; coat: string; silk: string; camel?: boolean }) {
  return camel ? (
    <g transform={`translate(${x},${y})`}>
      <path d="M-8,0 Q-6,-8 -1,-6 Q2,-10 6,-5 L10,-11 L12,-10 L9,-2 Q4,1 -8,0 Z" fill={coat} />
      <line x1="-6" y1="0" x2="-7" y2="6" stroke="#5b4026" strokeWidth="1.1" /><line x1="5" y1="0" x2="6.5" y2="6" stroke="#5b4026" strokeWidth="1.1" />
      <rect x="-4" y="-12.5" width="3" height="4.5" fill={silk} />
    </g>
  ) : (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="-3" rx="6.5" ry="2.8" fill={coat} />
      <path d="M4.5,-4 L9,-8.5 L10.5,-7 L6.5,-2 Z" fill={coat} />
      <line x1="-4.5" y1="-1" x2="-7.5" y2="4" stroke="#2b1a0e" strokeWidth="1.2" /><line x1="4" y1="-1" x2="7" y2="4" stroke="#2b1a0e" strokeWidth="1.2" />
      <circle cx="0.5" cy="-7.5" r="2.3" fill={silk} />
    </g>
  );
}

// ---------------------------------------------------------------- Meydan Racecourse

export const MeydanSprite = ({ width = 420, height = 230, name = 'Meydan Racecourse' }: SpriteProps) => {
  const P = ground(10, 212);
  const pt = (u: number, v: number) => P(u, v).join(',');
  return (
    <svg viewBox="0 0 420 230" preserveAspectRatio="none" style={{ width, height }} className={SVG_CLASS} aria-label={name}>
      <Plinth x={10} y={212} w={320} d={150} fill="#cdb98e" edge="#a68f63" />
      {/* Dirt outside, the turf course, the infield with its lake. */}
      <path d={ovalPath(P, 160, 66, 150, 60)} fill="#8a6a4b" />
      <path d={ovalPath(P, 160, 66, 140, 53)} fill="#4d8b31" />
      <path d={ovalPath(P, 160, 66, 140, 53)} fill="none" stroke="#ffffff" strokeWidth="1.2" />
      <path d={ovalPath(P, 160, 66, 112, 34)} fill="#6aa84f" />
      <path d={ovalPath(P, 160, 66, 112, 34)} fill="none" stroke="#ffffff" strokeWidth="1" />
      <path d={ovalPath(P, 172, 66, 44, 12)} fill="#38bdf8" opacity="0.9" />
      {/* Mown stripes across the turf. */}
      {Array.from({ length: 10 }, (_, i) => <polygon key={i} points={`${pt(30 + i * 27, 14)} ${pt(42 + i * 27, 14)} ${pt(42 + i * 27, 30)} ${pt(30 + i * 27, 30)}`} fill="#ffffff" opacity="0.06" />)}
      {/* The big screen in the infield. */}
      <Box x={P(120, 70)[0]} y={P(120, 70)[1]} w={2.5} h={14} d={2} front="#334155" side="#1e293b" top="#475569" />
      <Box x={P(104, 70)[0]} y={P(104, 70)[1] - 12} w={36} h={14} d={2} front="#0f172a" side="#020617" top="#1e293b" />
      <rect x={P(104, 70)[0] + 2} y={P(104, 70)[1] - 24} width={32} height={10} fill="#1d4ed8" opacity="0.7" />
      {/* The grandstand along the back straight: tiers of seats, glass boxes, and the crescent roof. */}
      <Box x={P(26, 128)[0]} y={P(26, 128)[1]} w={268} h={26} d={14} front="#e5e7eb" side="#cbd5e1" top="#f1f5f9" />
      {[0, 1, 2].map((t) => <rect key={t} x={P(26, 128)[0] + 4} y={P(26, 128)[1] - 6 - t * 6} width={260} height={3} fill={['#f43f5e', '#facc15', '#38bdf8'][t]} opacity="0.6" />)}
      <rect x={P(26, 128)[0]} y={P(26, 128)[1] - 26} width={268} height={4} fill="#1e3a5f" />
      {(() => {
        const [lx, ly] = P(14, 136), [rx, ry] = P(306, 136);
        const top = ly - 26;
        return (
          <g>
            <path d={`M${lx},${top} Q${(lx + rx) / 2},${top - 44} ${rx},${ry - 26} L${rx + 8},${ry - 32} Q${(lx + rx) / 2 + 8},${top - 52} ${lx + 8},${top - 6} Z`} fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
            <path d={`M${lx},${top} Q${(lx + rx) / 2},${top - 44} ${rx},${ry - 26}`} fill="none" stroke="#d4af37" strokeWidth="2.4" />
            {Array.from({ length: 9 }, (_, i) => { const x = lx + ((rx - lx) * (i + 0.5)) / 9; const k = (i + 0.5) / 9; return <line key={i} x1={x} y1={top - 44 * 4 * k * (1 - k) * 0.5 - 1} x2={x} y2={top} stroke="#94a3b8" strokeWidth="0.9" />; })}
          </g>
        );
      })()}
      <rect x={P(110, 128)[0]} y={P(110, 128)[1] - 20} width={100} height={12} rx="2" fill="#0f3b2e" />
      <text x={P(160, 128)[0]} y={P(160, 128)[1] - 11} textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#d4af37" fontFamily="system-ui, sans-serif" letterSpacing="2">MEYDAN</text>
      {/* Horses on the home straight in front of the stands, and the winning post. */}
      {[0, 1, 2, 3, 4].map((i) => {
        const [x, y] = P(90 + i * 24 - (i % 2) * 8, 108 + (i % 2) * 4);
        return <Runner key={i} x={x} y={y} coat={['#5b3018', '#9a4a1c', '#bdbab2', '#1c1714', '#7a4a26'][i]} silk={['#dc2626', '#2563eb', '#facc15', '#16a34a', '#db2777'][i]} />;
      })}
      {(() => { const [x, y] = P(232, 116); return <g><rect x={x} y={y - 18} width="1.8" height="18" fill="#fff" /><circle cx={x + 0.9} cy={y - 19} r="3.2" fill="#dc2626" stroke="#fff" strokeWidth="0.8" /></g>; })()}
      <NameBoard x={170} y={222} text={name} bg="#0f3b2e" fg="#fde68a" />
    </svg>
  );
};

// ---------------------------------------------------------------- Al Marmoom Camel Racetrack

export const CamelTrackSprite = ({ width = 400, height = 230, name = 'Al Marmoom Camel Racetrack' }: SpriteProps) => {
  const P = ground(10, 212);
  return (
    <svg viewBox="0 0 400 230" preserveAspectRatio="none" style={{ width, height }} className={SVG_CLASS} aria-label={name}>
      {/* Dunes beyond the track. */}
      <path d="M96,66 Q140,30 186,58 Q236,22 290,54 Q330,30 392,58 L392,70 L96,70 Z" fill="#e2c590" />
      <path d="M104,70 Q170,48 230,66 Q300,44 392,66 L392,74 L104,74 Z" fill="#d4ae6c" />
      <Plinth x={10} y={212} w={300} d={146} fill="#e6cf9c" edge="#bf9f62" />
      {/* The 4x4 road round the outside, the sand course and its white rails. */}
      <path d={ovalPath(P, 150, 66, 144, 60)} fill="#52525b" />
      <path d={ovalPath(P, 150, 66, 132, 50)} fill="#d9b37a" />
      <path d={ovalPath(P, 150, 66, 132, 50)} fill="none" stroke="#ffffff" strokeWidth="1.2" />
      <path d={ovalPath(P, 150, 66, 104, 31)} fill="#ecd6a8" />
      <path d={ovalPath(P, 150, 66, 104, 31)} fill="none" stroke="#ffffff" strokeWidth="1" />
      {/* The shaded stand at the back. */}
      <Box x={P(80, 126)[0]} y={P(80, 126)[1]} w={140} h={16} d={12} front="#e7e5e4" side="#d6d3d1" top="#f5f5f4" />
      {[0, 1].map((t) => <rect key={t} x={P(80, 126)[0] + 4} y={P(80, 126)[1] - 5 - t * 5} width={132} height={2.5} fill={['#f8fafc', '#fde68a'][t]} opacity="0.8" />)}
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={P(84 + i * 33, 126)[0]} y={P(84 + i * 33, 126)[1] - 30} width={1.6} height={14} fill="#a8a29e" />)}
      <Box x={P(74, 126)[0]} y={P(74, 126)[1] - 30} w={152} h={3} d={16} front="#b45309" side="#92400e" top="#c2620e" />
      <rect x={P(110, 126)[0]} y={P(110, 126)[1] - 13} width={80} height={10} rx="2" fill="#7c2d12" />
      <text x={P(150, 126)[0]} y={P(150, 126)[1] - 5.5} textAnchor="middle" fontSize="7" fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif" letterSpacing="1.4">AL MARMOOM</text>
      {/* Camels on the near straight, and the owners' 4x4s on the road alongside. */}
      {[0, 1, 2, 3].map((i) => {
        const [x, y] = P(96 + i * 30, 26 + (i % 2) * 5);
        return <Runner key={i} camel x={x} y={y} coat={['#c9a066', '#e3cfa2', '#3a2a1e', '#8f6239'][i]} silk={['#dc2626', '#2563eb', '#16a34a', '#facc15'][i]} />;
      })}
      {[0, 1].map((i) => {
        const [x, y] = P(110 + i * 46, 9);
        return <Box key={i} x={x} y={y} w={14} h={6} d={6} front="#f8fafc" side="#cbd5e1" top="#e2e8f0" stroke="#64748b55" />;
      })}
      <NameBoard x={160} y={222} text={name} bg="#7c2d12" />
    </svg>
  );
};
