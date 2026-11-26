// Doha's landmarks and its own look on its map (types "dq-…" and, in Doha's style, the shared tower, villa,
// townhouse, mall and hotel types: lib/city/doha/map DQ_STYLED_TYPES). Drawn like Dubai's and Abu Dhabi's (an
// isometric block on a plinth, depth running up and to the right, a name board underneath), in Doha's colours:
// Qatar maroon, limestone and sand, West Bay's blue glass. Loaded only on Doha's map.
//  - West Bay: Doha Tower's lattice-wrapped cylinder, the Tornado Tower's hourglass, the Sheraton's pyramid;
//  - Lusail: the golden bowl of Lusail Stadium, the Katara Towers' two crescents, Place Vendôme's palace;
//  - the Pearl: Qanat Quartier's pastel canal houses, Porto Arabia's marina;
//  - the Corniche: I. M. Pei's stacked Museum of Islamic Art, the National Museum's desert-rose discs, the dhows;
//  - Souq Waqif's mud walls and timber beams, the State Grand Mosque's sand domes, Msheireb's white cubes;
//  - Katara's amphitheatre, blue mosque and pigeon towers; Aspire's Torch and Villaggio's canal; the library.

import React from 'react';

type P = { width?: number; height?: number; name?: string; id?: string; tint?: string };
const CLS = 'drop-shadow-xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none overflow-visible';
const MAROON = '#8a1538';

function Box({ x, y, w, h, d, front, side, top }: { x: number; y: number; w: number; h: number; d: number; front: string; side: string; top: string }) {
  const dx = d * 0.55;
  return (
    <g stroke="#00000022" strokeWidth="0.5">
      <polygon points={`${x + w},${y} ${x + w + dx},${y - d} ${x + w + dx},${y - d - h} ${x + w},${y - h}`} fill={side} />
      <polygon points={`${x},${y - h} ${x + w},${y - h} ${x + w + dx},${y - h - d} ${x + dx},${y - h - d}`} fill={top} />
      <rect x={x} y={y - h} width={w} height={h} fill={front} />
    </g>
  );
}
function Plinth({ x, y, w, d, fill, edge }: { x: number; y: number; w: number; d: number; fill: string; edge: string }) {
  const dx = d * 0.55;
  return (
    <g>
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + dx},${y - d} ${x + w + dx},${y - d + 4} ${x + w},${y + 4} ${x},${y + 4}`} fill={edge} />
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + dx},${y - d} ${x + dx},${y - d}`} fill={fill} stroke={edge} strokeWidth="0.8" />
    </g>
  );
}
function NameBoard({ x, y, text, bg = MAROON }: { x: number; y: number; text: string; bg?: string }) {
  const w = Math.max(70, text.length * 6.4 + 18);
  return (
    <g>
      <rect x={x - w / 2} y={y - 9} width={w} height={16} rx="8" fill={bg} opacity="0.95" />
      <text x={x} y={y + 2.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff" fontFamily="system-ui, sans-serif">{text}</text>
    </g>
  );
}
function Dome({ cx, cy, r, fill = '#f8fafc', shade = '#e2e8f0', tip = '#d4af37' }: { cx: number; cy: number; r: number; fill?: string; shade?: string; tip?: string }) {
  return (
    <g>
      <path d={`M${cx - r},${cy} A${r},${r * 1.05} 0 0 1 ${cx + r},${cy} Z`} fill={fill} stroke="#00000018" strokeWidth="0.6" />
      <path d={`M${cx + r * 0.1},${cy} A${r * 0.9},${r} 0 0 1 ${cx + r},${cy} Z`} fill={shade} opacity="0.8" />
      <line x1={cx} y1={cy - r * 1.05} x2={cx} y2={cy - r * 1.05 - r * 0.4} stroke={tip} strokeWidth={Math.max(1, r * 0.08)} />
    </g>
  );
}
function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <line x1="0" y1="0" x2="1" y2="-16" stroke="#8b6b4a" strokeWidth="1.6" />
      {[-60, -25, 15, 50, 90].map((a) => <path key={a} d="M1,-16 q7,-3 12,3" transform={`rotate(${a} 1 -16)`} fill="none" stroke="#2f7d32" strokeWidth="2" strokeLinecap="round" />)}
    </g>
  );
}
const Svg = ({ width = 300, height = 200, children, vw = 300, vh = 200 }: P & { children: React.ReactNode; vw?: number; vh?: number }) => (
  <svg width={width} height={height} viewBox={`0 0 ${vw} ${vh}`} className={CLS}>{children}</svg>
);
const pick = (id: string | undefined, n: number) => [...(id ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11) % n;

// ---------------------------------------------------------------- West Bay

/** Doha Tower: the cylinder wrapped in its silver lattice (mashrabiya), its domed top and spire. */
export function DohaTowerSprite(p: P) {
  return (
    <Svg width={p.width ?? 110} height={p.height ?? 240} vw={110} vh={240}>
      <Plinth x={10} y={232} w={80} d={20} fill="#e2e8f0" edge="#94a3b8" />
      <path d="M30,226 L30,52 Q55,28 80,52 L80,226 Z" fill="#475569" />
      {/* The lattice: two families of curves crossing over the glass. */}
      {Array.from({ length: 12 }, (_, i) => <path key={`a${i}`} d={`M${30 + i * 4.5},226 Q${55},${140 - i * 6} ${30 + i * 4.5},52`} fill="none" stroke="#cbd5e1" strokeWidth="0.9" opacity="0.9" />)}
      {Array.from({ length: 16 }, (_, i) => <path key={`b${i}`} d={`M30,${220 - i * 11} Q55,${214 - i * 11} 80,${220 - i * 11}`} fill="none" stroke="#e2e8f0" strokeWidth="0.7" opacity="0.7" />)}
      <path d="M62,226 L62,60 Q72,62 80,52 L80,226 Z" fill="#1e293b" opacity="0.35" />
      <ellipse cx={55} cy={46} rx={22} ry={10} fill="#94a3b8" />
      <line x1={55} y1={36} x2={55} y2={8} stroke="#e2e8f0" strokeWidth="2" />
      <NameBoard x={55} y={236} text={p.name ?? 'Doha Tower'} bg="#334155" />
    </Svg>
  );
}

/** The Tornado Tower: an hourglass of glass lit in sweeping colours. */
export function TornadoSprite(p: P) {
  return (
    <Svg width={p.width ?? 110} height={p.height ?? 220} vw={110} vh={220}>
      <Plinth x={10} y={212} w={80} d={20} fill="#e2e8f0" edge="#94a3b8" />
      <path d="M26,206 Q50,120 26,34 L84,34 Q60,120 84,206 Z" fill="#0f172a" />
      {Array.from({ length: 16 }, (_, i) => {
        const y = 200 - i * 10.5, pinch = Math.abs(y - 120) / 86;
        const half = 10 + pinch * 19;
        return <line key={i} x1={55 - half} y1={y} x2={55 + half} y2={y} stroke={['#ec4899', '#a855f7', '#3b82f6', '#22d3ee'][i % 4]} strokeWidth="2" opacity="0.85" />;
      })}
      <NameBoard x={55} y={216} text={p.name ?? 'Tornado Tower'} bg="#7c3aed" />
    </Svg>
  );
}

/** The Sheraton Grand Doha: the stepped pyramid at the head of the Corniche, on its gardens. */
export function PyramidSprite(p: P) {
  return (
    <Svg width={p.width ?? 200} height={p.height ?? 140} vw={240} vh={170}>
      <Plinth x={14} y={156} w={190} d={44} fill="#cfe3b0" edge="#8fae68" />
      {[0, 1, 2, 3, 4].map((k) => (
        <Box key={k} x={40 + k * 14} y={150 - k * 22} w={130 - k * 28} h={22} d={30 - k * 4} front={k % 2 ? '#d6b98a' : '#c9a877'} side="#a98a5c" top="#e3cba3" />
      ))}
      <path d="M95,40 L110,14 L125,40 Z" fill="#7dd3fc" />
      <Palm x={22} y={156} /><Palm x={200} y={150} />
      <NameBoard x={120} y={164} text={p.name ?? 'Sheraton Grand Doha'} />
    </Svg>
  );
}

/** A residential tower in Doha's style: blue-silver glass with a maroon fin, or a limestone tower with arched windows,
 *  or a twisting "zig-zag" stack. */
export function DqTowerSprite(p: P) {
  const v = pick(p.id, 3);
  const W = p.width ?? 110, H = p.height ?? 220;
  if (v === 0) return (
    <Svg width={W} height={H} vw={110} vh={220}>
      <Plinth x={8} y={212} w={80} d={22} fill="#e2e8f0" edge="#94a3b8" />
      <Box x={26} y={204} w={46} h={170} d={22} front="#60a5fa" side="#1d4ed8" top="#bfdbfe" />
      {Array.from({ length: 14 }, (_, i) => <line key={i} x1={26} y1={196 - i * 12} x2={72} y2={196 - i * 12} stroke="#e0f2fe" strokeWidth="0.8" opacity="0.7" />)}
      <rect x={68} y={30} width={6} height={174} fill={MAROON} />
      <path d="M26,34 L49,16 L72,34 Z" fill="#e2e8f0" />
      <NameBoard x={55} y={216} text={p.name ?? 'Tower'} bg="#1d4ed8" />
    </Svg>
  );
  if (v === 1) return (
    <Svg width={W} height={H} vw={110} vh={220}>
      <Plinth x={8} y={212} w={80} d={22} fill="#eadfc8" edge="#b9a27a" />
      <Box x={24} y={204} w={52} h={168} d={22} front="#eadcc0" side="#c9b48d" top="#f5ecd9" />
      {Array.from({ length: 12 }, (_, r) => [0, 1, 2].map((c) => <path key={`${r}${c}`} d={`M${30 + c * 15},${196 - r * 13} v-7 a4,4.5 0 0 1 8,0 v7 z`} fill="#7c5a2e" opacity="0.7" />))}
      <rect x={24} y={34} width={52} height={4} fill={MAROON} />
      <NameBoard x={55} y={216} text={p.name ?? 'Tower'} />
    </Svg>
  );
  return (
    <Svg width={W} height={H} vw={110} vh={220}>
      <Plinth x={8} y={212} w={80} d={22} fill="#e2e8f0" edge="#94a3b8" />
      {Array.from({ length: 8 }, (_, i) => <Box key={i} x={26 + (i % 2) * 8} y={204 - i * 21} w={42} h={21} d={20} front={i % 2 ? '#93c5fd' : '#bae6fd'} side="#3b82f6" top="#e0f2fe" />)}
      <NameBoard x={55} y={216} text={p.name ?? 'Tower'} bg="#0369a1" />
    </Svg>
  );
}

/** A Doha hotel tower: glass with a maroon crown. */
export function DqHotelTowerSprite(p: P) {
  const t = p.tint ?? '#0e7490';
  return (
    <Svg width={p.width ?? 120} height={p.height ?? 190} vw={200} vh={300}>
      <Plinth x={10} y={282} w={150} d={46} fill="#e2e8f0" edge="#94a3b8" />
      <polygon points="18,276 80,276 92,264 30,264" fill="#38bdf8" />
      <Box x={60} y={262} w={60} h={196} d={34} front={t} side="#0f172a" top="#cbd5e1" />
      {Array.from({ length: 16 }, (_, i) => <line key={i} x1={60} y1={250 - i * 12} x2={120} y2={250 - i * 12} stroke="#f8fafc" strokeWidth="0.8" opacity="0.5" />)}
      <path d="M56,66 Q90,26 124,66 Z" fill={MAROON} />
      <Palm x={22} y={282} /><Palm x={160} y={280} />
      <NameBoard x={100} y={294} text={p.name ?? 'Hotel'} />
    </Svg>
  );
}

// ---------------------------------------------------------------- Lusail

/** Lusail Stadium: the golden bowl, its lattice of triangular openings like a fanar lantern's. */
export function StadiumSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={58} fill="#d1d5db" edge="#6b7280" />
      <path d="M40,160 L40,118 A110,36 0 0 1 260,118 L260,160 A110,30 0 0 1 40,160 Z" fill="#d4a53a" />
      <path d="M40,118 A110,36 0 0 1 260,118" fill="none" stroke="#f5d27a" strokeWidth="4" />
      {Array.from({ length: 22 }, (_, i) => {
        const x = 46 + i * 9.6;
        return <path key={i} d={`M${x},158 L${x + 4.8},126 L${x + 9.6},158 Z`} fill="#7c5a1a" opacity="0.55" />;
      })}
      <ellipse cx={150} cy={114} rx={98} ry={26} fill="#1f2937" />
      <ellipse cx={150} cy={114} rx={70} ry={16} fill="#22c55e" />
      <NameBoard x={150} y={194} text={p.name ?? 'Stadium'} bg="#a16207" />
    </Svg>
  );
}

/** The Katara Towers: two crescents facing each other over a podium (Qatar's crossed swords). */
export function KataraTowersSprite(p: P) {
  return (
    <Svg width={p.width ?? 200} height={p.height ?? 240} vw={220} vh={280}>
      <Plinth x={16} y={270} w={180} d={44} fill="#e2e8f0" edge="#94a3b8" />
      <Box x={30} y={262} w={160} h={22} d={30} front="#f1f5f9" side="#cbd5e1" top="#ffffff" />
      <path d="M58,240 Q20,140 78,40 Q60,140 96,240 Z" fill="#d4af37" stroke="#a16207" strokeWidth="1" />
      <path d="M162,240 Q200,140 142,40 Q160,140 124,240 Z" fill="#d4af37" stroke="#a16207" strokeWidth="1" />
      {Array.from({ length: 10 }, (_, i) => <line key={i} x1={48 + i * 0.8} y1={230 - i * 18} x2={88 - i * 0.5} y2={230 - i * 18} stroke="#fef3c7" strokeWidth="0.8" opacity="0.6" />)}
      {Array.from({ length: 10 }, (_, i) => <line key={`r${i}`} x1={132 + i * 0.5} y1={230 - i * 18} x2={172 - i * 0.8} y2={230 - i * 18} stroke="#fef3c7" strokeWidth="0.8" opacity="0.6" />)}
      <NameBoard x={110} y={276} text={p.name ?? 'Katara Towers'} bg="#a16207" />
    </Svg>
  );
}

/** Place Vendôme: a Parisian palace with a mansard roof and columns, and the canal in front. */
export function VendomeSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="10,188 260,188 286,170 36,170" fill="#38bdf8" />
      <Plinth x={20} y={170} w={240} d={50} fill="#eee6d6" edge="#bfae8f" />
      <Box x={36} y={162} w={210} h={46} d={40} front="#f5ecdc" side="#dacdb2" top="#faf5ea" />
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={42 + i * 14.5} y={124} width={4} height={38} fill="#e5d8bd" />)}
      {Array.from({ length: 13 }, (_, i) => <rect key={`w${i}`} x={48 + i * 14.5} y={132} width={6} height={14} fill="#93c5fd" opacity="0.85" />)}
      <path d="M36,116 L246,116 L262,92 L52,92 Z" fill="#475569" />
      {[90, 150, 210].map((x) => <Dome key={x} cx={x} cy={92} r={14} fill="#64748b" shade="#475569" tip="#d4af37" />)}
      <NameBoard x={150} y={194} text={p.name ?? 'Place Vendôme'} />
    </Svg>
  );
}

// ---------------------------------------------------------------- The Pearl

/** Qanat Quartier: pastel houses (pink, yellow, blue, mint) along a canal with a little bridge. */
export function QanatSprite(p: P) {
  const colours = ['#f9a8d4', '#fde68a', '#93c5fd', '#a7f3d0', '#fdba74', '#c4b5fd'];
  return (
    <Svg {...p}>
      <Plinth x={16} y={184} w={240} d={56} fill="#eadfc8" edge="#b9a27a" />
      <polygon points="40,176 230,176 244,160 54,160" fill="#22d3ee" />
      {colours.map((c, i) => <Box key={i} x={30 + i * 36} y={150 - (i % 2) * 6} w={32} h={44 + (i % 3) * 8} d={22} front={c} side="#00000018" top="#ffffff" />)}
      {colours.map((_, i) => [0, 1].map((k) => <rect key={`${i}${k}`} x={36 + i * 36 + k * 12} y={120 - (i % 2) * 6} width={7} height={10} fill="#ffffff" opacity="0.85" />))}
      <path d="M126,176 Q140,160 154,176" fill="none" stroke="#f8fafc" strokeWidth="4" />
      <NameBoard x={150} y={194} text={p.name ?? 'Qanat Quartier'} bg="#0e7490" />
    </Svg>
  );
}

/** A marina: the boardwalk and yachts at their berths, Porto Arabia's arc behind. */
export function DqMarinaSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,186 250,186 300,130 50,130" fill="#38bdf8" />
      <path d="M40,126 Q150,60 260,126" fill="none" stroke="#e7dccb" strokeWidth="16" />
      <path d="M40,126 Q150,60 260,126" fill="none" stroke="#bfa98a" strokeWidth="2" strokeDasharray="4 6" />
      <polygon points="20,176 240,176 252,164 32,164" fill="#d6c3a5" />
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i} transform={`translate(${70 + i * 34},${152 - (i % 2) * 6})`}>
          <path d="M-14,0 L14,0 L18,-4 L-12,-4 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.6" />
          <rect x={-7} y={-9} width={14} height={5} rx={1.5} fill="#e2e8f0" />
          <line x1={0} y1={-9} x2={0} y2={-24} stroke="#64748b" strokeWidth="1" />
        </g>
      ))}
      <NameBoard x={150} y={194} text={p.name ?? 'Marina'} bg="#0e7490" />
    </Svg>
  );
}

// ---------------------------------------------------------------- the Corniche and culture

/** The Museum of Islamic Art: I. M. Pei's stacked limestone cubes, stepping up to the central block with its small
 *  oculus, on its own island with a palm-lined causeway. */
export function MiaSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,190 260,190 300,140 40,140" fill="#38bdf8" />
      <Plinth x={40} y={170} w={200} d={44} fill="#ede4d3" edge="#bfae8f" />
      <Box x={60} y={164} w={160} h={30} d={36} front="#f1e9d9" side="#d7c9ae" top="#f8f3e9" />
      <Box x={88} y={134} w={104} h={28} d={28} front="#efe6d4" side="#d3c4a6" top="#f8f3e9" />
      <Box x={112} y={106} w={56} h={34} d={20} front="#ece2cd" side="#cdbd9d" top="#f8f3e9" />
      <polygon points="140,72 152,62 164,72 152,82" fill="#e4d8c1" stroke="#bfae8f" />
      <rect x={134} y={86} width={12} height={8} fill="#334155" />
      {[80, 196].map((x) => <rect key={x} x={x} y={140} width={6} height={18} fill="#334155" opacity="0.6" />)}
      {Array.from({ length: 6 }, (_, i) => <Palm key={i} x={20 + i * 10} y={186 - i * 3} s={0.8} />)}
      <NameBoard x={150} y={194} text={p.name ?? 'Museum of Islamic Art'} bg="#0f3d5e" />
    </Svg>
  );
}

/** The National Museum of Qatar: the desert rose, interlocking sand-coloured discs at every angle. */
export function NmoqSprite(p: P) {
  const discs = [[70, 150, 52, -12], [120, 140, 60, 8], [175, 150, 50, -20], [150, 118, 46, 18], [95, 118, 40, 28], [205, 128, 38, -6], [130, 100, 34, -30]];
  return (
    <Svg {...p}>
      <Plinth x={24} y={182} w={230} d={56} fill="#e8d5b5" edge="#bba07a" />
      {discs.map(([x, y, r, a], i) => (
        <g key={i} transform={`rotate(${a} ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.32} fill={i % 2 ? '#e7cfa6' : '#dcc196'} stroke="#b89a6c" strokeWidth="1" />
          <ellipse cx={x} cy={y + 3} rx={r * 0.92} ry={r * 0.2} fill="#00000014" />
        </g>
      ))}
      <NameBoard x={150} y={194} text={p.name ?? 'National Museum of Qatar'} bg="#8a5a2b" />
    </Svg>
  );
}

/** A park on the bay: lawns, palms, a path and a kite in the air. */
export function DqParkSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={56} fill="#86c06c" edge="#5d8f47" />
      <path d="M30,178 Q120,150 250,158" fill="none" stroke="#efe6d3" strokeWidth="7" />
      {Array.from({ length: 7 }, (_, i) => <Palm key={i} x={34 + i * 32} y={176 - (i % 2) * 14} s={1.1} />)}
      <path d="M200,70 L212,58 L222,72 L210,84 Z" fill={MAROON} /><path d="M210,84 Q200,120 186,150" fill="none" stroke="#64748b" strokeWidth="0.8" />
      <NameBoard x={150} y={194} text={p.name ?? 'Park'} bg="#15803d" />
    </Svg>
  );
}

/** Dhows: wooden boats with lateen sails at a stone quay. */
export function DqDhowSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,190 260,190 300,124 40,124" fill="#38bdf8" />
      <polygon points="20,180 250,180 262,168 32,168" fill="#d9c7a4" />
      {[[80, 160, 1], [160, 150, 0.95], [236, 140, 0.8]].map(([x, y, sc], i) => (
        <g key={i} transform={`translate(${x},${y}) scale(${sc})`}>
          <path d="M-32,0 L30,0 L38,-9 L-38,-9 Z" fill="#8b5a2b" stroke="#5b3a1e" strokeWidth="0.8" />
          <line x1={0} y1={-9} x2={2} y2={-52} stroke="#5b3a1e" strokeWidth="1.6" />
          <path d="M2,-50 L28,-12 L-16,-14 Z" fill="#fef3c7" stroke="#d6c7a1" strokeWidth="0.6" />
          <rect x={-20} y={-6} width={36} height={2} fill={MAROON} />
        </g>
      ))}
      <NameBoard x={150} y={194} text={p.name ?? 'Dhow Harbour'} bg="#92400e" />
    </Svg>
  );
}

/** Banana Island: the crescent island in the bay, with villas over the water. */
export function BananaSprite(p: P) {
  return (
    <Svg {...p}>
      <ellipse cx={150} cy={160} rx={140} ry={34} fill="#7dd3fc" opacity={0.9} />
      <path d="M40,160 Q150,100 262,150 Q150,128 40,170 Z" fill="#f3dfa6" />
      <path d="M60,158 Q150,112 244,148 Q150,126 60,164 Z" fill="#86c06c" />
      {Array.from({ length: 6 }, (_, i) => <Palm key={i} x={80 + i * 28} y={146 - Math.sin(i / 5 * Math.PI) * 12} s={0.9} />)}
      {Array.from({ length: 7 }, (_, i) => <g key={`v${i}`} transform={`translate(${70 + i * 26},${178 - (i % 2) * 4})`}><rect x={-7} y={-8} width={14} height={8} fill="#fdf8ee" /><path d="M-9,-8 L0,-14 L9,-8 Z" fill="#a16207" /><line x1={0} y1={0} x2={0} y2={6} stroke="#78350f" /></g>)}
      <NameBoard x={150} y={194} text={p.name ?? 'Banana Island'} bg="#0e7490" />
    </Svg>
  );
}

/** A small venue (dining, a gym): a low limestone building with a maroon awning and tables outside. */
export function DqSmallSprite(p: P) {
  return (
    <Svg width={p.width ?? 140} height={p.height ?? 100} vw={160} vh={120}>
      <Plinth x={10} y={104} w={120} d={30} fill="#e7e5e4" edge="#a8a29e" />
      <Box x={24} y={98} w={86} h={36} d={20} front="#f3ead8" side="#d8c9aa" top="#faf5ea" />
      <polygon points="20,64 116,64 108,74 28,74" fill={MAROON} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={30 + i * 16} y={78} width={8} height={12} fill="#7dd3fc" opacity="0.8" />)}
      {[30, 64, 98].map((x) => <circle key={x} cx={x} cy={103} r={4} fill="#f8fafc" stroke="#a8a29e" />)}
      <NameBoard x={75} y={114} text={p.name ?? 'Venue'} />
    </Svg>
  );
}

/** A beach (or a beach club, with a pool and daybeds): sand, the water and umbrellas in Qatar's maroon and white. */
export function DqBeachSprite(p: P & { club?: boolean }) {
  return (
    <Svg {...p}>
      <polygon points="0,186 250,186 300,120 50,120" fill="#38bdf8" />
      <polygon points="0,186 250,186 280,148 30,148" fill="#fde68a" />
      {p.club && <polygon points="70,176 190,176 204,158 84,158" fill="#22d3ee" stroke="#f8fafc" strokeWidth="2" />}
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} transform={`translate(${40 + i * 32},${172 - (i % 2) * 8})`}>
          <line x1={0} y1={0} x2={0} y2={-16} stroke="#78350f" strokeWidth="1" />
          <path d="M-9,-14 Q0,-22 9,-14 Z" fill={i % 2 ? MAROON : '#ffffff'} stroke="#00000022" strokeWidth="0.5" />
        </g>
      ))}
      <NameBoard x={150} y={194} text={p.name ?? 'Beach'} bg="#0369a1" />
    </Svg>
  );
}

// ---------------------------------------------------------------- Souq Waqif, mosques, Msheireb

/** Souq Waqif: mud-plastered walls with timber beams sticking out, wooden doors, lanterns and the lanes. */
export function SouqSprite(p: P & { small?: boolean }) {
  const n = p.small ? 2 : 4;
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={56} fill="#e2cfa8" edge="#b2976a" />
      {Array.from({ length: n }, (_, i) => {
        const w = (210 / n) - 6, x = 30 + i * (210 / n);
        return (
          <g key={i}>
            <Box x={x} y={172 - (i % 2) * 6} w={w} h={50 + (i % 2) * 10} d={34} front="#cfae7d" side="#a98a5c" top="#dcc196" />
            {Array.from({ length: Math.floor(w / 12) }, (_, k) => <line key={k} x1={x + 6 + k * 12} y1={128 - (i % 2) * 16} x2={x + 2 + k * 12} y2={122 - (i % 2) * 16} stroke="#6b4423" strokeWidth="2.4" />)}
            <path d={`M${x + w / 2 - 8},${172 - (i % 2) * 6} v-18 a8,9 0 0 1 16,0 v18 z`} fill="#6b4423" />
            <circle cx={x + w / 2} cy={140 - (i % 2) * 6} r={3} fill="#fbbf24" />
          </g>
        );
      })}
      <NameBoard x={150} y={194} text={p.name ?? 'Souq Waqif'} bg="#7c4a21" />
    </Svg>
  );
}

/** The State Grand Mosque: sand-coloured, with rows of many small domes, a big central dome and a minaret. */
export function DqMosqueSprite(p: P & { blue?: boolean }) {
  const wall = p.blue ? '#3b82f6' : '#e9d8b4', shade = p.blue ? '#1d4ed8' : '#cdb486', dome = p.blue ? '#60a5fa' : '#efe1c0';
  return (
    <Svg {...p}>
      <Plinth x={20} y={180} w={230} d={60} fill="#f1e9d8" edge="#c9b48d" />
      <Box x={50} y={170} w={170} h={30} d={44} front={wall} side={shade} top={dome} />
      {Array.from({ length: p.blue ? 0 : 8 }, (_, i) => <Dome key={i} cx={68 + i * 20} cy={138} r={7} fill={dome} shade={shade} />)}
      <Dome cx={136} cy={128} r={p.blue ? 26 : 22} fill={dome} shade={shade} />
      {p.blue && Array.from({ length: 9 }, (_, i) => <rect key={`t${i}`} x={56 + i * 18} y={150} width={10} height={10} fill="#facc15" opacity="0.7" />)}
      <rect x={228} y={70} width={10} height={100} fill={wall} stroke={shade} strokeWidth="0.6" />
      <path d="M228,70 L233,56 L238,70 Z" fill={dome} />
      <NameBoard x={140} y={194} text={p.name ?? 'Mosque'} bg={p.blue ? '#1d4ed8' : '#a16207'} />
    </Svg>
  );
}

/** Msheireb: crisp white and sand cubes with deep-set windows and shaded lanes, old Qatari lines made new. */
export function MsheirebSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={56} fill="#ece6da" edge="#b7ab95" />
      {[[30, 172, 60, 60, '#f7f3ea'], [94, 166, 54, 84, '#e7dcc6'], [152, 172, 50, 52, '#f7f3ea'], [206, 168, 40, 70, '#e7dcc6']].map(([x, y, w, h, c], i) => (
        <g key={i}>
          <Box x={x as number} y={y as number} w={w as number} h={h as number} d={30} front={c as string} side="#cfc2a8" top="#fbf8f1" />
          {Array.from({ length: 3 }, (_, k) => <rect key={k} x={(x as number) + 8 + k * ((w as number) / 3.2)} y={(y as number) - (h as number) + 12} width={6} height={(h as number) - 24} fill="#57534e" opacity="0.45" />)}
        </g>
      ))}
      <NameBoard x={150} y={194} text={p.name ?? 'Msheireb'} bg="#57534e" />
    </Svg>
  );
}

/** The Falcon Souq: falconers' shops with hooded falcons on their perches outside. */
export function DqFalconSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={56} fill="#e2cfa8" edge="#b2976a" />
      <Box x={40} y={172} w={190} h={48} d={34} front="#cfae7d" side="#a98a5c" top="#dcc196" />
      {Array.from({ length: 12 }, (_, k) => <line key={k} x1={48 + k * 15} y1={124} x2={44 + k * 15} y2={118} stroke="#6b4423" strokeWidth="2.4" />)}
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} transform={`translate(${58 + i * 26},176)`}>
          <rect x={-1} y={-14} width={2} height={14} fill="#78350f" /><rect x={-6} y={-15} width={12} height={2} fill="#78350f" />
          <ellipse cx={0} cy={-21} rx={4} ry={6} fill="#a16207" /><circle cx={0} cy={-28} r={2.8} fill={MAROON} />
        </g>
      ))}
      <path d="M200,70 q10,-10 20,0 q10,-10 20,0 q-10,-2 -20,4 q-10,-6 -20,-4 z" fill="#57534e" />
      <NameBoard x={150} y={194} text={p.name ?? 'Falcon Souq'} bg="#7c4a21" />
    </Svg>
  );
}

// ---------------------------------------------------------------- Katara

/** Katara's amphitheatre: tiers of limestone seats round a stage facing the sea. */
export function AmphitheatreSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,190 260,190 300,150 40,150" fill="#38bdf8" />
      <Plinth x={30} y={176} w={220} d={50} fill="#eadfc8" edge="#b9a27a" />
      {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${50 + i * 8},${168 - i * 10} Q150,${120 - i * 14} ${250 - i * 8},${168 - i * 10}`} fill="none" stroke={i % 2 ? '#e7dcc6' : '#d9c9a8'} strokeWidth="9" />)}
      <rect x={128} y={160} width={44} height={10} fill="#a16207" />
      {Array.from({ length: 8 }, (_, i) => <rect key={`c${i}`} x={60 + i * 24} y={80 - Math.sin(i / 7 * Math.PI) * 10} width={4} height={18} fill="#f5efe3" />)}
      <NameBoard x={150} y={194} text={p.name ?? 'Amphitheatre'} />
    </Svg>
  );
}

/** The pigeon towers: tall mud-brick cones dotted with nesting holes. */
export function PigeonSprite(p: P) {
  return (
    <Svg width={p.width ?? 120} height={p.height ?? 120} vw={160} vh={160}>
      <Plinth x={14} y={148} w={120} d={32} fill="#e2cfa8" edge="#b2976a" />
      {[[50, 140, 64], [86, 132, 80], [118, 140, 58]].map(([x, y, h], i) => (
        <g key={i}>
          <path d={`M${x - 14},${y} L${x - 8},${y - h} L${x + 8},${y - h} L${x + 14},${y} Z`} fill="#cfae7d" stroke="#a98a5c" />
          {Array.from({ length: 10 }, (_, k) => <rect key={k} x={x - 7 + (k % 3) * 5} y={y - 10 - Math.floor(k / 3) * 14} width={2.5} height={3} fill="#5b3a1e" />)}
          <circle cx={x} cy={y - h - 4} r={3} fill="#94a3b8" />
        </g>
      ))}
      <NameBoard x={80} y={156} text={p.name ?? 'Pigeon Towers'} bg="#7c4a21" />
    </Svg>
  );
}

// ---------------------------------------------------------------- Aspire Zone, Education City

/** The Torch: the 300 m tower shaped like the 2006 Asian Games torch, flaring to its crown. */
export function TorchSprite(p: P) {
  return (
    <Svg width={p.width ?? 110} height={p.height ?? 240} vw={110} vh={240}>
      <Plinth x={10} y={232} w={80} d={20} fill="#e2e8f0" edge="#94a3b8" />
      <path d="M42,226 L46,70 L64,70 L68,226 Z" fill="#cbd5e1" />
      <path d="M52,226 L56,70 L64,70 L68,226 Z" fill="#94a3b8" />
      <path d="M34,70 Q55,30 76,70 Z" fill="#475569" />
      <path d="M44,40 Q55,6 66,40 Q55,30 44,40 Z" fill="#f97316" />
      <path d="M49,36 Q55,16 61,36 Q55,30 49,36 Z" fill="#facc15" />
      <NameBoard x={55} y={236} text={p.name ?? 'The Torch'} bg="#c2410c" />
    </Svg>
  );
}

/** Villaggio: an Italian façade of coloured houses with a canal and a gondola in front. */
export function VillaggioSprite(p: P) {
  const c = ['#fca5a5', '#fde68a', '#fdba74', '#bef264', '#a5b4fc'];
  return (
    <Svg {...p}>
      <Plinth x={16} y={184} w={240} d={56} fill="#eadfc8" edge="#b9a27a" />
      <polygon points="30,180 240,180 252,168 42,168" fill="#38bdf8" />
      {c.map((col, i) => <Box key={i} x={34 + i * 40} y={164} w={38} h={48 + (i % 2) * 12} d={30} front={col} side="#00000018" top="#ffffff" />)}
      {c.map((_, i) => <path key={`a${i}`} d={`M${44 + i * 40},164 v-14 a8,9 0 0 1 16,0 v14`} fill="#57534e" opacity="0.5" />)}
      <path d="M110,176 Q130,172 150,176 L146,180 L114,180 Z" fill="#111827" />
      <line x1={148} y1={176} x2={156} y2={160} stroke="#111827" strokeWidth="1" />
      <NameBoard x={150} y={194} text={p.name ?? 'Villaggio'} bg="#2563eb" />
    </Svg>
  );
}

/** The sports museum: the ring-shaped building beside the stadium (plain rings in silver and maroon). */
export function SportsMuseumSprite(p: P) {
  return (
    <Svg width={p.width ?? 160} height={p.height ?? 110} vw={200} vh={140}>
      <Plinth x={14} y={126} w={170} d={36} fill="#e5e7eb" edge="#9ca3af" />
      {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={46 + i * 26} cy={i % 2 ? 92 : 80} rx={16} ry={16} fill="none" stroke={i % 2 ? MAROON : '#cbd5e1'} strokeWidth="6" />)}
      <Box x={36} y={122} w={124} h={14} d={20} front="#f8fafc" side="#cbd5e1" top="#ffffff" />
      <NameBoard x={100} y={134} text={p.name ?? 'Sports Museum'} />
    </Svg>
  );
}

/** Qatar National Library: the diamond-shaped glass hall, its corners lifted like folded paper. */
export function LibrarySprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={56} fill="#e2e8f0" edge="#94a3b8" />
      <polygon points="40,168 140,118 250,150 150,184" fill="#e0f2fe" stroke="#94a3b8" strokeWidth="1" />
      <polygon points="40,168 40,140 140,92 140,118" fill="#bae6fd" opacity="0.9" />
      <polygon points="140,92 250,124 250,150 140,118" fill="#7dd3fc" opacity="0.9" />
      {Array.from({ length: 8 }, (_, i) => <line key={i} x1={48 + i * 11} y1={164 - i * 5} x2={150 + i * 12} y2={180 - i * 4} stroke="#f8fafc" strokeWidth="1.2" opacity="0.8" />)}
      <NameBoard x={150} y={194} text={p.name ?? 'National Library'} bg="#0f766e" />
    </Svg>
  );
}

/** A university campus round a green: limestone halls with a maroon trim and a lantern tower. */
export function DqUniversitySprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={20} y={180} w={230} d={60} fill="#d9f99d" edge="#84cc16" />
      <polygon points="80,176 200,176 222,154 102,154" fill="#86efac" />
      <Box x={30} y={170} w={56} h={34} d={30} front="#f3ead8" side="#d8c9aa" top="#faf5ea" />
      <Box x={204} y={170} w={56} h={34} d={30} front="#f3ead8" side="#d8c9aa" top="#faf5ea" />
      <Box x={92} y={150} w={120} h={44} d={34} front="#f7f0e2" side="#d8c9aa" top="#fbf8f1" />
      <rect x={92} y={110} width={120} height={4} fill={MAROON} />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={98 + i * 12.5} y={120} width={6} height={22} fill="#7dd3fc" opacity="0.85" />)}
      <rect x={144} y={70} width={16} height={40} fill="#f7f0e2" stroke="#d8c9aa" /><path d="M140,70 L152,56 L164,70 Z" fill={MAROON} />
      <NameBoard x={150} y={194} text={p.name ?? 'University'} />
    </Svg>
  );
}

// ---------------------------------------------------------------- the desert

/** A desert camp: Bedouin tents in maroon and black on the dunes, a fire and camels. */
export function DqCampSprite(p: P) {
  return (
    <Svg {...p}>
      <path d="M0,186 Q70,140 150,170 Q220,130 300,176 L300,190 L0,190 Z" fill="#e3b97f" />
      <path d="M20,160 Q90,120 160,150 Q230,112 290,150" fill="none" stroke="#cf9a5c" strokeWidth="3" />
      {[[70, 168], [130, 158], [190, 166]].map(([x, y], i) => (
        <g key={i}><path d={`M${x - 26},${y} L${x - 20},${y - 22} L${x + 20},${y - 22} L${x + 26},${y} Z`} fill={i % 2 ? '#1f2937' : MAROON} /><rect x={x - 20} y={y - 24} width={40} height={3} fill="#fef3c7" /></g>
      ))}
      <circle cx={160} cy={178} r={5} fill="#f97316" /><circle cx={160} cy={176} r={2.5} fill="#fde047" />
      <g transform="translate(236,172)"><path d="M-10,0 Q-8,-10 -1,-8 Q2,-13 7,-7 L12,-14 L14,-13 L11,-3 Q5,1 -10,0 Z" fill="#a16207" /></g>
      <NameBoard x={150} y={194} text={p.name ?? 'Desert Camp'} bg="#9a3412" />
    </Svg>
  );
}

/** Al Zubarah Fort: the square fort with round corner towers and a tall square tower. */
export function DqFortSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={30} y={180} w={220} d={56} fill="#ead9b6" edge="#c3a46c" />
      <Box x={60} y={164} w={160} h={40} d={40} front="#dcc196" side="#b89a6c" top="#e8d3ad" />
      {[56, 212].map((x) => <g key={x}><rect x={x - 8} y={104} width={24} height={60} fill="#d8bb8c" stroke="#b89a6c" /><ellipse cx={x + 4} cy={104} rx={12} ry={4} fill="#e8d3ad" /></g>)}
      <rect x={128} y={82} width={28} height={40} fill="#d8bb8c" stroke="#b89a6c" />
      {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M${61 + i * 8},124 l2,-5 l2,5 z`} fill="#dcc196" />)}
      <path d="M132,164 v-18 a10,11 0 0 1 20,0 v18 z" fill="#6b4423" />
      <NameBoard x={150} y={194} text={p.name ?? 'Al Zubarah Fort'} bg="#92400e" />
    </Svg>
  );
}

// ---------------------------------------------------------------- the stadiums, the water, the fun

/** Al Bayt Stadium: a vast Bedouin tent, bayt al sha'ar, striped black, white and red, its sides lifted. */
export function TentSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={184} w={250} d={58} fill="#e2cfa8" edge="#b2976a" />
      <path d="M30,172 L50,110 Q150,70 250,110 L270,172 Z" fill="#111827" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${44 + i * 19},170 L${58 + i * 17},104`} stroke={i % 3 === 1 ? '#b91c1c' : '#f5f5f4'} strokeWidth="5" opacity="0.9" />)}
      <path d="M50,110 Q150,70 250,110" fill="none" stroke="#f5f5f4" strokeWidth="3" />
      {[60, 150, 240].map((x) => <line key={x} x1={x} y1={172} x2={x - 6} y2={186} stroke="#78350f" strokeWidth="2" />)}
      <NameBoard x={150} y={194} text={p.name ?? 'Al Bayt Stadium'} bg="#111827" />
    </Svg>
  );
}

/** Stadium 974: a bowl of stacked shipping containers in red, blue, orange and yellow on the waterfront. */
export function ContainerStadiumSprite(p: P) {
  const c = ['#dc2626', '#2563eb', '#ea580c', '#facc15', '#16a34a', '#0f172a'];
  return (
    <Svg {...p}>
      <polygon points="0,192 260,192 300,160 40,160" fill="#38bdf8" />
      <Plinth x={24} y={176} w={230} d={50} fill="#9ca3af" edge="#4b5563" />
      {Array.from({ length: 4 }, (_, r) => Array.from({ length: 11 - r }, (_, k) => (
        <rect key={`${r}${k}`} x={40 + r * 10 + k * 19} y={160 - r * 14} width={17} height={12} fill={c[(r * 3 + k) % c.length]} stroke="#00000033" strokeWidth="0.6" />
      )))}
      {Array.from({ length: 10 }, (_, i) => <line key={i} x1={44 + i * 21} y1={108} x2={44 + i * 21} y2={172} stroke="#f8fafc" strokeWidth="0.8" opacity="0.5" />)}
      <NameBoard x={150} y={194} text={p.name ?? 'Stadium 974'} bg="#ea580c" />
    </Svg>
  );
}

/** Al Thumama Stadium: the gahfiya, the white woven cap, its lattice of little openings. */
export function GahfiyaSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={20} y={184} w={240} d={58} fill="#d1d5db" edge="#6b7280" />
      <path d="M40,168 L40,120 Q150,40 260,120 L260,168 Q150,150 40,168 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
      {Array.from({ length: 6 }, (_, r) => Array.from({ length: 14 - r * 2 }, (_, k) => (
        <circle key={`${r}${k}`} cx={60 + r * 16 + k * 14} cy={156 - r * 12 - Math.sin((k / (13 - r * 2)) * Math.PI) * 10} r={2.6} fill="#cbd5e1" />
      )))}
      <path d="M40,120 Q150,40 260,120" fill="none" stroke={MAROON} strokeWidth="3" />
      <NameBoard x={150} y={194} text={p.name ?? 'Al Thumama Stadium'} />
    </Svg>
  );
}

/** Mangroves in the shallows, kayaks in the channels and a heron. */
export function DqMangroveSprite(p: P) {
  return (
    <Svg {...p}>
      <ellipse cx={150} cy={160} rx={140} ry={34} fill="#7dd3c8" opacity={0.85} />
      {[[70, 150, 34], [125, 140, 26], [200, 146, 36], [250, 158, 24], [160, 168, 22]].map(([x, y, r], i) => (
        <g key={i}>
          {Array.from({ length: 5 }, (_, k) => <line key={k} x1={x - r * 0.6 + k * r * 0.3} y1={y + 2} x2={x - r * 0.5 + k * r * 0.25} y2={y - 6} stroke="#5b3a1e" strokeWidth={1.2} />)}
          <ellipse cx={x} cy={y - 10} rx={r} ry={r * 0.45} fill="#166534" />
          <ellipse cx={x - r * 0.3} cy={y - 14} rx={r * 0.55} ry={r * 0.3} fill="#22863a" />
        </g>
      ))}
      {[[150, 156, '#f97316'], [225, 170, '#facc15']].map(([x, y, col], i) => (
        <g key={`k${i}`} transform={`translate(${x},${y})`}><path d="M-12,0 Q0,-4 12,0 Q0,4 -12,0 Z" fill={col as string} /><circle cx={0} cy={-4} r={2.4} fill="#7c2d12" /></g>
      ))}
      <g transform="translate(96,168)"><line x1={0} y1={0} x2={0} y2={-10} stroke="#64748b" /><ellipse cx={2} cy={-13} rx={5} ry={3} fill="#e5e7eb" /><path d="M6,-14 q4,-6 2,-10" fill="none" stroke="#e5e7eb" strokeWidth="1.4" /></g>
      <NameBoard x={150} y={194} text={p.name ?? 'Mangroves'} bg="#166534" />
    </Svg>
  );
}

/** A watersports beach: jet skis carving the water, a parasail in the sky and the rental hut. */
export function JetSkiSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,186 250,186 300,110 50,110" fill="#38bdf8" />
      <polygon points="0,186 250,186 270,162 20,162" fill="#fde68a" />
      <Box x={30} y={180} w={46} h={20} d={16} front="#f8fafc" side="#e2e8f0" top={MAROON} />
      {[[140, 140, 1], [210, 126, -1], [176, 150, 1]].map(([x, y, dir], i) => (
        <g key={i} transform={`translate(${x},${y}) scale(${dir},1)`}>
          <path d="M-14,0 L12,0 L16,-5 L-10,-5 Z" fill={['#ef4444', '#facc15', '#22c55e'][i]} />
          <circle cx={0} cy={-9} r={3} fill="#1f2937" />
          <path d={`M-16,2 Q-34,4 -48,0`} fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.85" />
        </g>
      ))}
      <path d="M230,40 Q250,28 270,40 Z" fill={MAROON} /><line x1={250} y1={40} x2={232} y2={110} stroke="#64748b" strokeWidth="0.8" />
      <NameBoard x={150} y={194} text={p.name ?? 'Jet Ski & Watersports'} bg="#0369a1" />
    </Svg>
  );
}

/** A fun fair or theme park: a big wheel, a coaster loop and striped tents. */
export function FunfairSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={184} w={250} d={56} fill="#1e1b4b" edge="#0f0a2e" />
      <circle cx={90} cy={110} r={52} fill="none" stroke="#f472b6" strokeWidth="3" />
      {Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <g key={i}><line x1={90} y1={110} x2={90 + Math.cos(a) * 52} y2={110 + Math.sin(a) * 52} stroke="#f9a8d4" strokeWidth="0.8" /><rect x={86 + Math.cos(a) * 52} y={106 + Math.sin(a) * 52} width={8} height={8} rx={2} fill={['#22d3ee', '#facc15', '#a78bfa'][i % 3]} /></g>; })}
      <line x1={90} y1={110} x2={70} y2={176} stroke="#f9a8d4" strokeWidth="2" /><line x1={90} y1={110} x2={110} y2={176} stroke="#f9a8d4" strokeWidth="2" />
      <path d="M150,176 C170,90 210,80 220,130 C230,170 250,120 262,96" fill="none" stroke="#facc15" strokeWidth="3" />
      <circle cx={214} cy={120} r={16} fill="none" stroke="#facc15" strokeWidth="3" />
      {[160, 196, 232].map((x, i) => <path key={x} d={`M${x - 14},178 L${x},156 L${x + 14},178 Z`} fill={i % 2 ? '#22d3ee' : '#f472b6'} />)}
      <NameBoard x={150} y={194} text={p.name ?? 'Theme Park'} bg="#7c3aed" />
    </Svg>
  );
}

// ---------------------------------------------------------------- Doha's own look for the shared types

/** A Qatari villa: white walls with maroon trim, a majlis wing, a shaded entrance, a palm and a pool. */
export function DqVillaSprite(p: P) {
  return (
    <Svg width={p.width ?? 120} height={p.height ?? 95} vw={160} vh={120}>
      <Plinth x={6} y={104} w={128} d={34} fill="#b5cf8f" edge="#7d9a5c" />
      <polygon points="96,100 128,100 136,90 104,90" fill="#38bdf8" stroke="#f8fafc" strokeWidth="1.5" />
      <Box x={20} y={98} w={72} h={34} d={26} front="#fbf8f2" side="#dcd3c2" top="#ffffff" />
      <rect x={20} y={62} width={72} height={4} fill={MAROON} />
      <Box x={38} y={64} w={38} h={16} d={18} front="#f3ead8" side="#d8c9aa" top="#faf5ea" />
      {[0, 1, 2].map((i) => <rect key={i} x={28 + i * 22} y={76} width={10} height={14} fill="#7c5a2e" opacity="0.7" />)}
      <path d="M50,98 v-12 a6,7 0 0 1 12,0 v12 z" fill={MAROON} />
      <Palm x={14} y={102} s={1.1} /><Palm x={140} y={96} />
      <NameBoard x={75} y={114} text={p.name ?? 'Villa'} />
    </Svg>
  );
}

/** A townhouse terrace in Doha's style: three linked homes in limestone with maroon doors and roof terraces. */
export function DqTownhouseSprite(p: P) {
  return (
    <Svg width={p.width ?? 120} height={p.height ?? 95} vw={160} vh={120}>
      <Plinth x={6} y={104} w={130} d={30} fill="#b5cf8f" edge="#7d9a5c" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Box x={16 + i * 36} y={98} w={34} h={38 + (i % 2) * 6} d={22} front={['#f3ead8', '#ece0c8', '#f7f0e2'][i]} side="#d8c9aa" top="#fbf8f1" />
          <rect x={26 + i * 36} y={84} width={12} height={14} fill={MAROON} />
          <rect x={22 + i * 36} y={66 - (i % 2) * 6} width={10} height={8} fill="#7dd3fc" opacity="0.85" />
          <rect x={16 + i * 36} y={58 - (i % 2) * 6} width={34} height={2} fill={MAROON} />
        </g>
      ))}
      <Palm x={10} y={104} />
      <NameBoard x={75} y={114} text={p.name ?? 'Townhouse'} />
    </Svg>
  );
}

/** A mall in Doha's style: a long limestone hall with a glass barrel roof and maroon banners. */
export function DqMallSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={60} fill="#e7e5e4" edge="#a8a29e" />
      <Box x={30} y={172} w={200} h={46} d={44} front="#efe6d4" side="#d3c4a6" top="#f8f3e9" />
      <path d="M30,126 Q130,92 230,126 L254,102 Q154,70 54,102 Z" fill="#bae6fd" stroke="#7dd3fc" />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={40 + i * 21} y={134} width={8} height={30} fill={i % 3 === 1 ? MAROON : '#7dd3fc'} opacity={i % 3 === 1 ? 1 : 0.7} />)}
      <Palm x={22} y={184} s={1.1} /><Palm x={258} y={176} s={1.1} />
      <NameBoard x={140} y={194} text={p.name ?? 'Mall'} />
    </Svg>
  );
}

/** A resort hotel in Doha's style: low white wings with arches and a maroon-trimmed tower, among palms. */
export function DqResortSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={58} fill="#cfe3b0" edge="#8fae68" />
      <polygon points="170,178 236,178 248,166 182,166" fill="#38bdf8" stroke="#f8fafc" strokeWidth="2" />
      <Box x={36} y={168} w={74} h={34} d={30} front="#fbf8f2" side="#e2d8c4" top="#ffffff" />
      <Box x={110} y={160} w={56} h={64} d={30} front="#fdfaf4" side="#e2d8c4" top="#ffffff" />
      <rect x={110} y={96} width={56} height={4} fill={MAROON} />
      {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${42 + i * 11},168 v-12 a4,5 0 0 1 8,0 v12`} fill="#c8a165" opacity="0.5" />)}
      {Array.from({ length: 4 }, (_, i) => <rect key={`w${i}`} x={116 + i * 12} y={110} width={6} height={40} fill="#7dd3fc" opacity="0.8" />)}
      {[24, 180, 252, 200].map((x, i) => <Palm key={i} x={x} y={182 - (i % 2) * 6} s={1.1} />)}
      <NameBoard x={140} y={194} text={p.name ?? 'Resort'} bg="#0e7490" />
    </Svg>
  );
}

/** The sprite for a Doha type (or a shared type in Doha's style), or null to use the shared one. */
export function dohaSprite(type: string, loc: { id?: string; width?: number; height?: number; name?: string; tint?: string }) {
  const p = { width: loc.width, height: loc.height, name: loc.name, id: loc.id, tint: loc.tint };
  switch (type) {
    case 'tall-building': return <DqTowerSprite {...p} />;
    case 'dubai-villa': return <DqVillaSprite {...p} />;
    case 'small-house': return <DqTownhouseSprite {...p} />;
    case 'mall': return <DqMallSprite {...p} />;
    case 'hotel': return <DqResortSprite {...p} />;
    case 'dq-doha-tower': return <DohaTowerSprite {...p} />;
    case 'dq-tornado': return <TornadoSprite {...p} />;
    case 'dq-pyramid': return <PyramidSprite {...p} />;
    case 'dq-hotel-tower': return <DqHotelTowerSprite {...p} />;
    case 'dq-stadium': return <StadiumSprite {...p} />;
    case 'dq-katara-towers': return <KataraTowersSprite {...p} />;
    case 'dq-vendome': return <VendomeSprite {...p} />;
    case 'dq-qanat': return <QanatSprite {...p} />;
    case 'dq-marina': return <DqMarinaSprite {...p} />;
    case 'dq-mia': return <MiaSprite {...p} />;
    case 'dq-nmoq': return <NmoqSprite {...p} />;
    case 'dq-park': return <DqParkSprite {...p} />;
    case 'dq-dhow': return <DqDhowSprite {...p} />;
    case 'dq-banana': return <BananaSprite {...p} />;
    case 'dq-dining': return <DqSmallSprite {...p} />;
    case 'dq-beach': return <DqBeachSprite {...p} />;
    case 'dq-beach-club': return <DqBeachSprite {...p} club />;
    case 'dq-souq': return <SouqSprite {...p} />;
    case 'dq-souq-small': return <SouqSprite {...p} small />;
    case 'dq-mosque': return <DqMosqueSprite {...p} />;
    case 'dq-blue-mosque': return <DqMosqueSprite {...p} blue />;
    case 'dq-msheireb': return <MsheirebSprite {...p} />;
    case 'dq-falcon': return <DqFalconSprite {...p} />;
    case 'dq-amphitheatre': return <AmphitheatreSprite {...p} />;
    case 'dq-pigeon': return <PigeonSprite {...p} />;
    case 'dq-torch': return <TorchSprite {...p} />;
    case 'dq-villaggio': return <VillaggioSprite {...p} />;
    case 'dq-sports-museum': return <SportsMuseumSprite {...p} />;
    case 'dq-library': return <LibrarySprite {...p} />;
    case 'dq-university': return <DqUniversitySprite {...p} />;
    case 'dq-camp': return <DqCampSprite {...p} />;
    case 'dq-fort': return <DqFortSprite {...p} />;
    case 'dq-tent': return <TentSprite {...p} />;
    case 'dq-974': return <ContainerStadiumSprite {...p} />;
    case 'dq-gahfiya': return <GahfiyaSprite {...p} />;
    case 'dq-mangrove': return <DqMangroveSprite {...p} />;
    case 'dq-jetski': return <JetSkiSprite {...p} />;
    case 'dq-funfair': return <FunfairSprite {...p} />;
    default: return null;
  }
}
