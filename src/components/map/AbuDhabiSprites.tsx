// Abu Dhabi's landmarks on its map (types "ad-…", lib/city/abuDhabi/map.ts), drawn like Dubai's: an isometric
// block on a paved plinth, base at the bottom, depth running up and to the right (0.55 across for each 1 up), and a
// name board underneath. Loaded only on Abu Dhabi's map (InteractiveMap reaches for these first for "ad-" types).
//  - the Sheikh Zayed Grand Mosque: white marble, 82 domes, four minarets with gold finials, the reflecting pools;
//  - Louvre Abu Dhabi: low white galleries under the floating lattice dome, on the water;
//  - Emirates Palace: the sand-gold palace with its central dome and the beach;
//  - Qasr Al Watan: the white presidential palace's great dome and colonnade;
//  - Etihad Towers: five curved glass towers; Ferrari World's red roof; W Yas's lit grid over the circuit;
//  - marinas (yachts at the boardwalk), beaches (umbrellas and loungers), the desert camp, and small venues.

import React from 'react';

type P = { width?: number; height?: number; name?: string };
const CLS = 'drop-shadow-xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none overflow-visible';
const VW = 300, VH = 200;

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
function NameBoard({ x, y, text, bg }: { x: number; y: number; text: string; bg: string }) {
  const w = Math.max(70, text.length * 6.4 + 18);
  return (
    <g>
      <rect x={x - w / 2} y={y - 9} width={w} height={16} rx="8" fill={bg} opacity="0.95" />
      <text x={x} y={y + 2.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff" fontFamily="system-ui, sans-serif">{text}</text>
    </g>
  );
}
/** A dome seen side-on: a half-ellipse with a highlight and a finial. */
function Dome({ cx, cy, r, fill = '#f8fafc', shade = '#e2e8f0', tip = '#d4af37' }: { cx: number; cy: number; r: number; fill?: string; shade?: string; tip?: string }) {
  return (
    <g>
      <path d={`M${cx - r},${cy} A${r},${r * 1.05} 0 0 1 ${cx + r},${cy} Z`} fill={fill} stroke="#cbd5e1" strokeWidth="0.6" />
      <path d={`M${cx + r * 0.1},${cy} A${r * 0.9},${r} 0 0 1 ${cx + r},${cy} Z`} fill={shade} opacity="0.8" />
      <line x1={cx} y1={cy - r * 1.05} x2={cx} y2={cy - r * 1.05 - r * 0.45} stroke={tip} strokeWidth={Math.max(1, r * 0.09)} />
      <circle cx={cx} cy={cy - r * 1.05 - r * 0.45} r={Math.max(0.8, r * 0.08)} fill={tip} />
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
const Svg = ({ width = 300, height = 200, children }: P & { children: React.ReactNode }) => (
  <svg width={width} height={height} viewBox={`0 0 ${VW} ${VH}`} className={CLS}>{children}</svg>
);

/** Sheikh Zayed Grand Mosque. */
export function GrandMosqueSprite(p: P) {
  const domes = Array.from({ length: 9 }, (_, i) => 70 + i * 17);
  return (
    <Svg {...p}>
      <Plinth x={20} y={178} w={220} d={70} fill="#f1ede6" edge="#d6cfc2" />
      {/* The reflecting pools along the front */}
      <polygon points="40,174 220,174 232,163 52,163" fill="#7dd3fc" opacity="0.9" />
      <Box x={55} y={155} w={170} h={26} d={46} front="#f8fafc" side="#e5e7eb" top="#f1f5f9" />
      {/* Arcade of arches along the front */}
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${60 + i * 13.5},155 v-14 a5,6 0 0 1 10,0 v14`} fill="#e2e8f0" />)}
      {/* Rows of small domes on the roof, then the great central dome */}
      {domes.map((x, i) => <Dome key={`a${i}`} cx={x + 14} cy={128 - 8} r={6} />)}
      {domes.slice(1, -1).map((x, i) => <Dome key={`b${i}`} cx={x + 22} cy={116} r={7} />)}
      <Dome cx={150} cy={112} r={26} />
      <Dome cx={118} cy={114} r={14} /><Dome cx={182} cy={110} r={14} />
      {/* Four minarets with gold finials */}
      {[[58, 155], [222, 155], [84, 112], [248, 112]].map(([x, y], i) => (
        <g key={`m${i}`}>
          <rect x={x - 3.5} y={y - 92} width={7} height={92} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.6" />
          <rect x={x - 5} y={y - 60} width={10} height={3} fill="#e2e8f0" /><rect x={x - 5} y={y - 82} width={10} height={3} fill="#e2e8f0" />
          <path d={`M${x - 3.5},${y - 92} q3.5,-10 7,0 z`} fill="#f8fafc" />
          <line x1={x} y1={y - 101} x2={x} y2={y - 108} stroke="#d4af37" strokeWidth="1.4" />
        </g>
      ))}
      <Palm x={34} y={176} s={1.1} /><Palm x={236} y={176} s={1.1} />
      <NameBoard x={140} y={192} text={p.name ?? 'Sheikh Zayed Grand Mosque'} bg="#0f766e" />
    </Svg>
  );
}

/** Louvre Abu Dhabi under its floating dome. */
export function LouvreSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="10,182 250,182 290,140 50,140" fill="#38bdf8" opacity="0.85" />
      <Plinth x={60} y={170} w={160} d={44} fill="#f5f5f4" edge="#d6d3d1" />
      {/* The galleries: white cubes of different heights */}
      {[[70, 166, 34, 16], [104, 166, 26, 24], [130, 166, 40, 14], [170, 166, 30, 20], [96, 150, 28, 12], [150, 150, 36, 18]].map(([x, y, w, h], i) => (
        <Box key={i} x={x} y={y} w={w} h={h} d={16} front="#fafaf9" side="#e7e5e4" top="#f5f5f4" />
      ))}
      {/* The dome: a shallow lattice disc floating on four piers */}
      {[96, 196].map((x) => <rect key={x} x={x} y={112} width={4} height={40} fill="#a8a29e" />)}
      <ellipse cx={150} cy={108} rx={98} ry={20} fill="#d6d3d1" stroke="#a8a29e" strokeWidth="1" />
      <ellipse cx={150} cy={104} rx={98} ry={18} fill="#e7e5e4" />
      {Array.from({ length: 14 }, (_, i) => <line key={`l${i}`} x1={60 + i * 13} y1={92} x2={70 + i * 11} y2={118} stroke="#a8a29e" strokeWidth="0.6" opacity="0.8" />)}
      {Array.from({ length: 14 }, (_, i) => <line key={`r${i}`} x1={240 - i * 13} y1={92} x2={230 - i * 11} y2={118} stroke="#a8a29e" strokeWidth="0.6" opacity="0.8" />)}
      {/* The rain of light under it */}
      {Array.from({ length: 18 }, (_, i) => <circle key={`d${i}`} cx={80 + ((i * 37) % 140)} cy={128 + ((i * 13) % 22)} r={1.2} fill="#fef9c3" />)}
      <NameBoard x={150} y={192} text={p.name ?? 'Louvre Abu Dhabi'} bg="#57534e" />
    </Svg>
  );
}

/** Emirates Palace on its beach. */
export function EmiratesPalaceSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,184 260,184 300,150 40,150" fill="#fde68a" />
      <Plinth x={30} y={172} w={220} d={50} fill="#e7d3a8" edge="#c9ad78" />
      <Box x={40} y={164} w={70} h={26} d={30} front="#e9c98f" side="#d4b072" top="#efd8a8" />
      <Box x={190} y={164} w={58} h={26} d={30} front="#e9c98f" side="#d4b072" top="#efd8a8" />
      <Box x={100} y={164} w={100} h={38} d={36} front="#edd09b" side="#d8b67a" top="#f2dcb0" />
      {/* Arches along the front */}
      {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${46 + i * 12.5},164 v-12 a4.5,5 0 0 1 9,0 v12`} fill="#c08a3e" opacity="0.55" />)}
      {/* The domes: the great central one in gold-capped sand, smaller ones over the wings */}
      <Dome cx={160} cy={126} r={26} fill="#f1dcae" shade="#dcbf86" />
      {[[80, 138], [222, 138], [118, 128], [202, 128]].map(([x, y], i) => <Dome key={i} cx={x} cy={y} r={10} fill="#f1dcae" shade="#dcbf86" />)}
      <Palm x={28} y={176} /><Palm x={258} y={170} /><Palm x={270} y={176} />
      <NameBoard x={150} y={194} text={p.name ?? 'Emirates Palace'} bg="#a16207" />
    </Svg>
  );
}

/** Qasr Al Watan, the presidential palace. */
export function QasrAlWatanSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={30} y={178} w={220} d={56} fill="#e7f5e9" edge="#86b38a" />
      {Array.from({ length: 8 }, (_, i) => <Palm key={i} x={40 + i * 28} y={180} s={0.8} />)}
      <Box x={60} y={160} w={170} h={30} d={40} front="#f8fafc" side="#e2e8f0" top="#f1f5f9" />
      {/* The colonnade */}
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={65 + i * 12} y={134} width={3.5} height={26} fill="#e2e8f0" />)}
      <Dome cx={160} cy={118} r={34} fill="#f8fafc" shade="#e2e8f0" />
      <Dome cx={104} cy={124} r={12} /><Dome cx={214} cy={120} r={12} />
      <NameBoard x={150} y={194} text={p.name ?? 'Qasr Al Watan'} bg="#1e3a8a" />
    </Svg>
  );
}

/** Etihad Towers: five curved glass towers on a shared podium. */
export function EtihadTowersSprite(p: P) {
  const towers = [[60, 120], [94, 150], [130, 175], [166, 140], [200, 110]];
  return (
    <svg width={p.width ?? 200} height={p.height ?? 260} viewBox="0 0 300 380" className={CLS}>
      <Plinth x={30} y={360} w={230} d={56} fill="#cbd5e1" edge="#94a3b8" />
      <Box x={40} y={350} w={210} h={26} d={40} front="#e2e8f0" side="#cbd5e1" top="#f1f5f9" />
      {towers.map(([x, h], i) => (
        <g key={i}>
          <path d={`M${x},324 L${x},${324 - h * 1.5} Q${x + 15},${324 - h * 1.5 - 30} ${x + 32},${324 - h * 1.5 + 6} L${x + 32},324 Z`} fill="#38bdf8" stroke="#0369a1" strokeWidth="1" />
          <path d={`M${x + 20},324 L${x + 20},${324 - h * 1.5 + 2} Q${x + 27},${324 - h * 1.5 - 10} ${x + 32},${324 - h * 1.5 + 6} L${x + 32},324 Z`} fill="#0ea5e9" opacity="0.7" />
          {Array.from({ length: Math.floor(h / 10) }, (_, k) => <line key={k} x1={x} y1={324 - k * 15} x2={x + 32} y2={324 - k * 15} stroke="#e0f2fe" strokeWidth="0.6" opacity="0.6" />)}
        </g>
      ))}
      <NameBoard x={150} y={374} text={p.name ?? 'Etihad Towers'} bg="#0369a1" />
    </svg>
  );
}

/** Ferrari World: the red flowing roof and Formula Rossa's track. */
export function FerrariWorldSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={20} y={180} w={230} d={60} fill="#e5e7eb" edge="#9ca3af" />
      <path d="M40,168 Q150,96 268,140 L250,170 Q150,150 40,168 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="1.2" />
      <path d="M60,160 Q150,112 250,145" fill="none" stroke="#fca5a5" strokeWidth="2" opacity="0.7" />
      {/* Formula Rossa's track and its loop */}
      <path d="M20,176 C60,120 110,60 150,70 C190,80 200,130 262,112" fill="none" stroke="#fbbf24" strokeWidth="2.6" />
      {Array.from({ length: 10 }, (_, i) => <line key={i} x1={40 + i * 22} y1={176} x2={44 + i * 21} y2={130 - Math.sin(i / 3) * 40} stroke="#9ca3af" strokeWidth="1" />)}
      <circle cx={150} cy={130} r={10} fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
      <NameBoard x={150} y={194} text={p.name ?? 'Ferrari World'} bg="#b91c1c" />
    </Svg>
  );
}

/** W Abu Dhabi Yas Island under its lit grid canopy. */
export function WYasSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={20} y={176} w={240} d={50} fill="#334155" edge="#1e293b" />
      <Box x={40} y={166} w={90} h={40} d={30} front="#e2e8f0" side="#cbd5e1" top="#f1f5f9" />
      <Box x={160} y={166} w={90} h={40} d={30} front="#e2e8f0" side="#cbd5e1" top="#f1f5f9" />
      <path d="M30,126 Q150,62 270,120 L270,132 Q150,80 30,138 Z" fill="#a855f7" opacity="0.45" />
      {Array.from({ length: 20 }, (_, i) => <line key={i} x1={30 + i * 12} y1={138 - Math.sin(i / 19 * Math.PI) * 52} x2={36 + i * 12} y2={126 - Math.sin((i + 0.5) / 19 * Math.PI) * 52} stroke="#e9d5ff" strokeWidth="1" />)}
      <path d="M0,184 Q150,168 300,184" fill="none" stroke="#f8fafc" strokeWidth="3" strokeDasharray="10 6" />
      <NameBoard x={150} y={194} text={p.name ?? 'W Yas Island'} bg="#7c3aed" />
    </Svg>
  );
}

/** A marina: the boardwalk and yachts at their berths. */
export function MarinaSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,186 250,186 300,130 50,130" fill="#38bdf8" />
      <polygon points="20,176 240,176 252,164 32,164" fill="#a8a29e" />
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={50 + i * 34} y={140} width={3} height={24} fill="#a8a29e" />)}
      {Array.from({ length: 5 }, (_, i) => (
        <g key={`y${i}`} transform={`translate(${70 + i * 34},${150 - (i % 2) * 6})`}>
          <path d="M-14,0 L14,0 L18,-4 L-12,-4 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.6" />
          <rect x={-7} y={-9} width={14} height={5} rx={1.5} fill="#e2e8f0" />
          <line x1={0} y1={-9} x2={0} y2={-24} stroke="#64748b" strokeWidth="1" />
        </g>
      ))}
      <Palm x={30} y={168} /><Palm x={236} y={168} />
      <NameBoard x={150} y={194} text={p.name ?? 'Marina'} bg="#0e7490" />
    </Svg>
  );
}

/** A beach: sand, the water's edge, umbrellas and loungers. */
export function BeachSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,186 250,186 300,120 50,120" fill="#38bdf8" />
      <polygon points="0,186 250,186 280,148 30,148" fill="#fde68a" />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} transform={`translate(${40 + i * 32},${172 - (i % 2) * 8})`}>
          <line x1={0} y1={0} x2={0} y2={-16} stroke="#78716c" strokeWidth="1" />
          <path d="M-9,-14 Q0,-22 9,-14 Z" fill={['#ef4444', '#0ea5e9', '#f59e0b', '#22c55e'][i % 4]} />
          <rect x={4} y={-2} width={10} height={3} fill="#f8fafc" />
        </g>
      ))}
      <NameBoard x={150} y={194} text={p.name ?? 'Beach'} bg="#0369a1" />
    </Svg>
  );
}

/** A small venue: a low building with an awning and tables outside. */
export function SmallVenueSprite(p: P) {
  return (
    <svg width={p.width ?? 140} height={p.height ?? 100} viewBox="0 0 160 120" className={CLS}>
      <Plinth x={10} y={104} w={120} d={30} fill="#e7e5e4" edge="#a8a29e" />
      <Box x={24} y={98} w={86} h={36} d={20} front="#fef3c7" side="#fde68a" top="#fef9c3" />
      <polygon points="20,64 116,64 108,74 28,74" fill="#b91c1c" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={30 + i * 16} y={78} width={8} height={12} fill="#7dd3fc" opacity="0.8" />)}
      {[30, 64, 98].map((x) => <circle key={x} cx={x} cy={103} r={4} fill="#f8fafc" stroke="#a8a29e" />)}
      <NameBoard x={75} y={114} text={p.name ?? 'Venue'} bg="#7c2d12" />
    </svg>
  );
}

/** The desert camp: Bedouin tents, a fire, camels and a 4x4 on the dunes. */
export function DesertCampSprite(p: P) {
  return (
    <Svg {...p}>
      <path d="M0,186 Q70,140 150,170 Q220,130 300,176 L300,190 L0,190 Z" fill="#e6b980" />
      <path d="M20,160 Q90,120 160,150 Q230,112 290,150" fill="none" stroke="#d39b5f" strokeWidth="3" />
      {[[70, 168], [130, 158], [190, 166]].map(([x, y], i) => (
        <g key={i}><path d={`M${x - 26},${y} L${x},${y - 26} L${x + 26},${y} Z`} fill="#f5f0e6" stroke="#a16207" strokeWidth="1" /><path d={`M${x - 5},${y} L${x},${y - 10} L${x + 5},${y} Z`} fill="#7c2d12" /></g>
      ))}
      <circle cx={160} cy={178} r={5} fill="#f97316" /><circle cx={160} cy={176} r={2.5} fill="#fde047" />
      <g transform="translate(236,172)"><path d="M-10,0 Q-8,-10 -1,-8 Q2,-13 7,-7 L12,-14 L14,-13 L11,-3 Q5,1 -10,0 Z" fill="#a16207" /></g>
      <g transform="translate(40,182)"><rect x={-14} y={-10} width={28} height={9} rx={2} fill="#f8fafc" /><circle cx={-8} cy={0} r={3} fill="#111" /><circle cx={8} cy={0} r={3} fill="#111" /></g>
      <NameBoard x={150} y={194} text={p.name ?? 'Desert Camp'} bg="#9a3412" />
    </Svg>
  );
}

/** A university campus: the main hall with its clock tower, wings round a green quad, students' paths. */
export function UniversitySprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={20} y={180} w={230} d={60} fill="#d9f99d" edge="#84cc16" />
      {/* The quad and its crossing paths */}
      <polygon points="80,176 200,176 222,154 102,154" fill="#86efac" />
      <path d="M90,166 L212,166 M150,176 L162,154" stroke="#f5f5f4" strokeWidth="3" />
      {/* The wings either side and the main hall behind */}
      <Box x={30} y={170} w={56} h={34} d={30} front="#f1f5f9" side="#cbd5e1" top="#e2e8f0" />
      <Box x={204} y={170} w={56} h={34} d={30} front="#f1f5f9" side="#cbd5e1" top="#e2e8f0" />
      <Box x={92} y={150} w={120} h={44} d={34} front="#fafaf9" side="#d6d3d1" top="#e7e5e4" />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={98 + i * 12.5} y={114} width={6} height={30} fill="#7dd3fc" opacity="0.85" />)}
      {[[36, 140], [210, 140]].map(([x, y], k) => Array.from({ length: 4 }, (_, i) => <rect key={`${k}${i}`} x={x + 3 + i * 13} y={y} width={7} height={18} fill="#7dd3fc" opacity="0.85" />))}
      {/* The clock tower */}
      <Box x={140} y={108} w={24} h={46} d={14} front="#f8fafc" side="#e2e8f0" top="#f1f5f9" />
      <circle cx={152} cy={74} r={7} fill="#fef3c7" stroke="#a16207" strokeWidth="1.2" />
      <line x1={152} y1={74} x2={152} y2={69} stroke="#78350f" strokeWidth="1" /><line x1={152} y1={74} x2={156} y2={74} stroke="#78350f" strokeWidth="1" />
      <path d="M138,62 L152,46 L166,62 Z" fill="#1e3a8a" />
      <Palm x={30} y={182} /><Palm x={262} y={182} />
      <NameBoard x={150} y={194} text={p.name ?? 'University'} bg="#1e3a8a" />
    </Svg>
  );
}

/** Qasr Al Hosn: the white coral-stone fort with its round and square watchtowers. */
export function FortSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={30} y={180} w={220} d={56} fill="#f5e9d3" edge="#c9ad78" />
      <Box x={60} y={164} w={160} h={40} d={40} front="#f8f4ea" side="#e4dccb" top="#efe8d8" />
      {/* Crenellations along the top */}
      {Array.from({ length: 20 }, (_, i) => <rect key={i} x={61 + i * 8} y={120} width={4} height={4} fill="#f8f4ea" />)}
      {/* The watchtowers */}
      <rect x={48} y={98} width={24} height={66} fill="#f8f4ea" stroke="#d6cbb3" strokeWidth="0.8" />
      <ellipse cx={60} cy={98} rx={12} ry={4} fill="#efe8d8" />
      <rect x={206} y={92} width={26} height={72} fill="#f8f4ea" stroke="#d6cbb3" strokeWidth="0.8" />
      <rect x={128} y={88} width={28} height={34} fill="#f8f4ea" stroke="#d6cbb3" strokeWidth="0.8" />
      {[[56, 112], [214, 108], [136, 100], [146, 100]].map(([x, y], i) => <rect key={`w${i}`} x={x} y={y} width={5} height={9} fill="#78716c" />)}
      {/* The gate */}
      <path d="M130,164 v-18 a10,11 0 0 1 20,0 v18 z" fill="#92400e" />
      <Palm x={34} y={182} /><Palm x={248} y={180} />
      <NameBoard x={150} y={194} text={p.name ?? 'Qasr Al Hosn'} bg="#92400e" />
    </Svg>
  );
}

/** An arena for concerts and fights: the oval bowl under a lit roof band. */
export function ArenaSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={20} y={182} w={240} d={56} fill="#cbd5e1" edge="#64748b" />
      <ellipse cx={150} cy={150} rx={110} ry={30} fill="#334155" />
      <path d="M40,150 L40,122 A110,30 0 0 1 260,122 L260,150 A110,30 0 0 1 40,150 Z" fill="#475569" />
      <path d="M40,122 A110,30 0 0 1 260,122" fill="none" stroke="#e879f9" strokeWidth="5" />
      <path d="M40,134 A110,30 0 0 0 260,134" fill="none" stroke="#22d3ee" strokeWidth="3" opacity="0.9" />
      <ellipse cx={150} cy={118} rx={100} ry={24} fill="#1e293b" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={60 + i * 16} y1={146} x2={60 + i * 16} y2={160} stroke="#94a3b8" strokeWidth="1" />)}
      <rect x={118} y={156} width={64} height={12} rx={2} fill="#0f172a" />
      <text x={150} y={165} textAnchor="middle" fontSize="7" fontWeight="900" fill="#f0abfc" fontFamily="system-ui, sans-serif">LIVE TONIGHT</text>
      <NameBoard x={150} y={194} text={p.name ?? 'Arena'} bg="#86198f" />
    </Svg>
  );
}

/** A tall luxury hotel tower with a crown, its pool deck at the foot. */
export function HotelTowerSprite(p: P & { tint?: string }) {
  const t = p.tint ?? '#0ea5e9';
  return (
    <svg width={p.width ?? 160} height={p.height ?? 240} viewBox="0 0 200 300" className={CLS}>
      <Plinth x={10} y={282} w={150} d={46} fill="#e2e8f0" edge="#94a3b8" />
      <polygon points="18,276 80,276 92,264 30,264" fill="#38bdf8" />
      <Box x={90} y={272} w={70} h={18} d={30} front="#f1f5f9" side="#cbd5e1" top="#e2e8f0" />
      <Box x={60} y={262} w={60} h={196} d={34} front={t} side="#0369a1" top="#bae6fd" />
      {Array.from({ length: 16 }, (_, i) => <line key={i} x1={60} y1={250 - i * 12} x2={120} y2={250 - i * 12} stroke="#e0f2fe" strokeWidth="0.8" opacity="0.7" />)}
      {[70, 84, 98, 112].map((x) => <line key={x} x1={x} y1={262} x2={x} y2={70} stroke="#e0f2fe" strokeWidth="0.5" opacity="0.5" />)}
      <path d="M60,66 L90,30 L120,66 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
      <path d="M120,66 L90,30 L138,48 Z" fill="#e2e8f0" />
      <line x1={90} y1={30} x2={90} y2={14} stroke="#d4af37" strokeWidth="2" />
      <Palm x={22} y={282} /><Palm x={160} y={280} />
      <NameBoard x={100} y={294} text={p.name ?? 'Hotel'} bg="#0c4a6e" />
    </svg>
  );
}

/** A beach club: daybeds round an infinity pool, a DJ deck and the sea. */
export function BeachClubSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,186 250,186 300,120 50,120" fill="#38bdf8" />
      <polygon points="0,186 250,186 282,146 32,146" fill="#fde68a" />
      <polygon points="70,174 190,174 204,156 84,156" fill="#22d3ee" stroke="#f8fafc" strokeWidth="2" />
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={46 + i * 34} y={146 + (i % 2) * 2} width={16} height={6} rx={2} fill="#f8fafc" stroke="#e7e5e4" />)}
      <Box x={208} y={172} w={44} h={22} d={16} front="#1f2937" side="#111827" top="#374151" />
      <rect x={214} y={156} width={32} height={6} fill="#f472b6" />
      <path d="M230,150 Q236,138 246,150" fill="none" stroke="#a78bfa" strokeWidth="2" />
      {[30, 260].map((x) => <Palm key={x} x={x} y={176} s={1.1} />)}
      <NameBoard x={150} y={194} text={p.name ?? 'Beach Club'} bg="#be185d" />
    </Svg>
  );
}

/** A wetland reserve: lagoons, reeds and a flock of flamingos. */
export function WetlandSprite(p: P) {
  return (
    <Svg {...p}>
      <path d="M10,180 Q60,130 150,140 Q240,128 290,176 Z" fill="#c8b98a" />
      <ellipse cx={110} cy={160} rx={70} ry={16} fill="#7dd3fc" />
      <ellipse cx={210} cy={156} rx={50} ry={12} fill="#7dd3fc" />
      {Array.from({ length: 16 }, (_, i) => <line key={`r${i}`} x1={30 + i * 16} y1={176} x2={32 + i * 16} y2={164 - (i % 3) * 3} stroke="#4d7c0f" strokeWidth="1.5" />)}
      {Array.from({ length: 10 }, (_, i) => (
        <g key={i} transform={`translate(${70 + (i * 23) % 170},${160 - (i % 3) * 3})`}>
          <line x1={0} y1={0} x2={0} y2={-8} stroke="#f472b6" strokeWidth="0.8" />
          <ellipse cx={0} cy={-10} rx={3.5} ry={2.2} fill="#fb7185" />
          <path d="M2,-11 q3,-6 1,-9" fill="none" stroke="#fb7185" strokeWidth="1" />
        </g>
      ))}
      <rect x={232} y={142} width={22} height={14} fill="#a16207" /><path d="M228,142 L243,132 L258,142 Z" fill="#78350f" />
      <NameBoard x={150} y={194} text={p.name ?? 'Wetland Reserve'} bg="#be123c" />
    </Svg>
  );
}

/** Mangrove National Park: dark green mangrove islets in the shallows, kayaks paddling the channels, a launch jetty. */
export function MangroveSprite(p: P) {
  return (
    <Svg {...p}>
      <ellipse cx={150} cy={160} rx={140} ry={34} fill="#7dd3c8" opacity={0.85} />
      {[[70, 150, 34], [120, 140, 26], [200, 146, 36], [250, 158, 24], [160, 168, 22], [95, 172, 20]].map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y + 4} rx={r} ry={r * 0.32} fill="#14532d" opacity={0.35} />
          {Array.from({ length: 5 }, (_, k) => <line key={k} x1={x - r * 0.6 + k * r * 0.3} y1={y + 2} x2={x - r * 0.5 + k * r * 0.25} y2={y - 6} stroke="#5b3a1e" strokeWidth={1.2} />)}
          <ellipse cx={x} cy={y - 10} rx={r} ry={r * 0.45} fill="#166534" />
          <ellipse cx={x - r * 0.3} cy={y - 14} rx={r * 0.55} ry={r * 0.3} fill="#22863a" />
        </g>
      ))}
      {/* Kayaks in the channels */}
      {[[150, 156, '#f97316'], [225, 170, '#facc15'], [108, 160, '#ef4444']].map(([x, y, c], i) => (
        <g key={`k${i}`} transform={`translate(${x},${y})`}>
          <path d="M-12,0 Q0,-4 12,0 Q0,4 -12,0 Z" fill={c as string} />
          <circle cx={0} cy={-4} r={2.4} fill="#7c2d12" />
          <line x1={-7} y1={-6} x2={7} y2={-1} stroke="#1f2937" strokeWidth={1} />
        </g>
      ))}
      <rect x={30} y={176} width={46} height={5} fill="#a16207" />
      {[34, 46, 58, 70].map((x) => <rect key={x} x={x} y={180} width={2} height={6} fill="#78350f" />)}
      <NameBoard x={150} y={194} text={p.name ?? 'Mangrove National Park'} bg="#166534" />
    </Svg>
  );
}

/** The Heritage Village and Dhow Harbour: barasti huts and a fort tower on a jetty, wooden dhows moored alongside. */
export function DhowHarbourSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,190 260,190 300,124 40,124" fill="#38bdf8" />
      <Plinth x={40} y={150} w={170} d={36} fill="#e9d5a7" edge="#b08d57" />
      {/* Barasti (palm-frond) huts and a watchtower */}
      {[[60, 146], [96, 140], [132, 146]].map(([x, y], i) => (
        <g key={i}><rect x={x} y={y - 18} width={26} height={18} fill="#c8a165" /><path d={`M${x - 3},${y - 18} L${x + 13},${y - 30} L${x + 29},${y - 18} Z`} fill="#a47b3f" />
          {Array.from({ length: 4 }, (_, k) => <line key={k} x1={x + 4 + k * 6} y1={y - 18} x2={x + 4 + k * 6} y2={y} stroke="#9a7440" strokeWidth={0.8} />)}</g>
      ))}
      <rect x={172} y={100} width={20} height={46} fill="#efe6d2" stroke="#cdbf9f" strokeWidth={0.8} />
      {[174, 180, 186].map((x) => <rect key={x} x={x} y={96} width={4} height={4} fill="#efe6d2" />)}
      <Palm x={50} y={150} /><Palm x={214} y={148} />
      {/* Dhows: wooden hulls with lateen sails */}
      {[[90, 176, 1], [190, 172, 0.9], [260, 160, 0.75]].map(([x, y, sc], i) => (
        <g key={`d${i}`} transform={`translate(${x},${y}) scale(${sc})`}>
          <path d="M-30,0 L28,0 L36,-8 L-36,-8 Z" fill="#8b5a2b" stroke="#5b3a1e" strokeWidth={0.8} />
          <line x1={0} y1={-8} x2={2} y2={-48} stroke="#5b3a1e" strokeWidth={1.5} />
          <path d="M2,-46 L26,-12 L-14,-14 Z" fill="#fef3c7" stroke="#d6c7a1" strokeWidth={0.6} />
        </g>
      ))}
      <NameBoard x={150} y={194} text={p.name ?? 'Heritage Village & Dhow Harbour'} bg="#92400e" />
    </Svg>
  );
}

/** The Falcon Hospital: the clinic with its falcon-wing roof, perches with hooded falcons, a falcon in flight. */
export function FalconHospitalSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={20} y={182} w={240} d={58} fill="#ead7b0" edge="#c3a46c" />
      <Box x={70} y={168} w={150} h={36} d={36} front="#fdf8ee" side="#e8dcc3" top="#f4ead6" />
      {/* The wing-shaped canopy */}
      <path d="M60,126 Q145,86 230,126 Q145,108 60,126 Z" fill="#b45309" />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} x={80 + i * 19} y={140} width={9} height={14} fill="#7dd3fc" opacity={0.85} />)}
      <path d="M140,168 v-14 a7,8 0 0 1 14,0 v14 z" fill="#92400e" />
      {/* Perches with hooded falcons */}
      {[34, 52, 238, 256].map((x, i) => (
        <g key={i} transform={`translate(${x},${176 - (i % 2) * 4})`}>
          <rect x={-1} y={-12} width={2} height={12} fill="#78350f" /><rect x={-5} y={-13} width={10} height={2} fill="#78350f" />
          <ellipse cx={0} cy={-18} rx={3.5} ry={5} fill="#a16207" /><circle cx={0} cy={-24} r={2.4} fill="#7c2d12" />
        </g>
      ))}
      {/* A falcon in flight over the field */}
      <path d="M190,62 q10,-10 20,0 q10,-10 20,0 q-10,-2 -20,4 q-10,-6 -20,-4 z" fill="#57534e" />
      <NameBoard x={150} y={194} text={p.name ?? 'Falcon Hospital'} bg="#9a3412" />
    </Svg>
  );
}

/** A watersports beach: jet skis carving the water, a parasail and the rental hut. */
export function AdJetSkiSprite(p: P) {
  return (
    <Svg {...p}>
      <polygon points="0,186 250,186 300,110 50,110" fill="#38bdf8" />
      <polygon points="0,186 250,186 270,162 20,162" fill="#fde68a" />
      <Box x={30} y={180} w={46} h={20} d={16} front="#f8fafc" side="#e2e8f0" top="#0e7490" />
      {[[140, 140, 1], [210, 126, -1], [176, 150, 1]].map(([x, y, dir], i) => (
        <g key={i} transform={`translate(${x},${y}) scale(${dir},1)`}>
          <path d="M-14,0 L12,0 L16,-5 L-10,-5 Z" fill={['#ef4444', '#facc15', '#22c55e'][i]} /><circle cx={0} cy={-9} r={3} fill="#1f2937" />
          <path d="M-16,2 Q-34,4 -48,0" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.85" />
        </g>
      ))}
      <path d="M230,40 Q250,28 270,40 Z" fill="#f97316" /><line x1={250} y1={40} x2={232} y2={110} stroke="#64748b" strokeWidth="0.8" />
      <NameBoard x={150} y={194} text={p.name ?? 'Jet Ski & Watersports'} bg="#0369a1" />
    </Svg>
  );
}

/** Surf Abu Dhabi: the long wave pool with a wave rolling down it and surfers. */
export function SurfSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={184} w={250} d={58} fill="#e7e5e4" edge="#a8a29e" />
      <polygon points="30,176 250,176 270,150 50,150" fill="#06b6d4" />
      <path d="M70,170 Q90,140 120,150 Q150,158 170,150" fill="none" stroke="#ecfeff" strokeWidth="5" />
      <path d="M60,168 Q86,132 118,146" fill="#67e8f9" opacity="0.8" />
      {[[100, 148], [180, 160]].map(([x, y], i) => <g key={i} transform={`translate(${x},${y})`}><path d="M-8,2 L8,2 L6,4 L-6,4 Z" fill="#f97316" /><circle cx={0} cy={-6} r={2.6} fill="#1f2937" /><line x1={0} y1={-4} x2={0} y2={2} stroke="#1f2937" strokeWidth="1.6" /></g>)}
      <Box x={240} y={150} w={30} h={22} d={14} front="#f8fafc" side="#e2e8f0" top="#ffffff" />
      <Palm x={24} y={184} /><Palm x={262} y={182} />
      <NameBoard x={150} y={194} text={p.name ?? 'Surf Abu Dhabi'} bg="#0891b2" />
    </Svg>
  );
}

/** A park: lawns, palms, a path and a playground. */
export function AdParkSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={56} fill="#86c06c" edge="#5d8f47" />
      <path d="M30,178 Q120,150 250,158" fill="none" stroke="#efe6d3" strokeWidth="7" />
      {Array.from({ length: 7 }, (_, i) => <Palm key={i} x={34 + i * 32} y={176 - (i % 2) * 14} s={1.1} />)}
      <g transform="translate(200,150)"><rect x={-12} y={-14} width={24} height={14} fill="none" stroke="#f97316" strokeWidth="2" /><line x1={-12} y1={0} x2={-18} y2={8} stroke="#f97316" strokeWidth="2" /><line x1={12} y1={0} x2={18} y2={8} stroke="#f97316" strokeWidth="2" /></g>
      <NameBoard x={150} y={194} text={p.name ?? 'Park'} bg="#15803d" />
    </Svg>
  );
}

/** A souq or market hall: arcaded sand walls, awnings and crates of goods. */
export function AdSouqSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={56} fill="#e2cfa8" edge="#b2976a" />
      <Box x={36} y={170} w={200} h={44} d={36} front="#e9d8b4" side="#cdb486" top="#f3e6c8" />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${44 + i * 24},170 v-18 a8,9 0 0 1 16,0 v18`} fill="#7c5a2e" opacity="0.7" />)}
      {Array.from({ length: 8 }, (_, i) => <polygon key={`a${i}`} points={`${42 + i * 24},${150} ${62 + i * 24},${150} ${66 + i * 24},${158} ${38 + i * 24},${158}`} fill={['#0e7490', '#b91c1c', '#ca8a04'][i % 3]} />)}
      {Array.from({ length: 6 }, (_, i) => <rect key={`c${i}`} x={50 + i * 32} y={174} width={14} height={8} fill={['#f97316', '#84cc16', '#eab308'][i % 3]} />)}
      <NameBoard x={150} y={194} text={p.name ?? 'Souq'} bg="#7c4a21" />
    </Svg>
  );
}

/** Masdar City: low terracotta-latticed blocks under solar roofs, round the wind tower. */
export function MasdarSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={184} w={250} d={58} fill="#e7e2d4" edge="#b9ae94" />
      {[[36, 172, 60, 40], [102, 166, 70, 50], [178, 172, 64, 38]].map(([x, y, w, h], i) => (
        <g key={i}>
          <Box x={x} y={y} w={w} h={h} d={30} front="#c9875a" side="#a8693f" top="#1e3a8a" />
          {Array.from({ length: Math.floor(w / 8) }, (_, k) => <line key={k} x1={x + 4 + k * 8} y1={y - h + 6} x2={x + 4 + k * 8} y2={y - 4} stroke="#8b5a35" strokeWidth="1.4" />)}
          {Array.from({ length: Math.floor(w / 12) }, (_, k) => <rect key={`s${k}`} x={x + 16 + k * 12} y={y - h - 26} width={10} height={4} fill="#60a5fa" transform={`skewX(-30)`} />)}
        </g>
      ))}
      <rect x={248} y={70} width={12} height={110} fill="#d6d3d1" stroke="#a8a29e" /><path d="M244,70 L254,56 L264,70 Z" fill="#a8a29e" />
      <NameBoard x={150} y={194} text={p.name ?? 'Masdar City'} bg="#15803d" />
    </Svg>
  );
}

/** A floating party marina out on the Gulf: a ring of pontoons, superyachts moored round it, lights strung over. */
export function PartyMarinaSprite(p: P & { accent?: string }) {
  const a = p.accent ?? '#c084fc';
  return (
    <Svg {...p}>
      <ellipse cx={150} cy={160} rx={146} ry={36} fill="#7dd3fc" opacity={0.5} />
      <ellipse cx={150} cy={160} rx={110} ry={24} fill="none" stroke="#e7e5e4" strokeWidth="8" />
      <ellipse cx={150} cy={160} rx={110} ry={24} fill="none" stroke="#a8a29e" strokeWidth="1" strokeDasharray="6 5" />
      {[[70, 140, 1.2], [150, 132, 1.5], [230, 142, 1.1], [110, 178, 1], [195, 180, 1.1]].map(([x, y, sc], i) => (
        <g key={i} transform={`translate(${x},${y}) scale(${sc})`}>
          <path d="M-22,0 L22,0 L28,-6 L-18,-6 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.6" />
          <rect x={-12} y={-13} width={24} height={7} rx={2} fill="#e2e8f0" /><rect x={-6} y={-18} width={12} height={5} rx={1.5} fill="#f8fafc" />
          <line x1={0} y1={-18} x2={0} y2={-30} stroke="#64748b" strokeWidth="1" />
        </g>
      ))}
      {Array.from({ length: 14 }, (_, i) => <circle key={`l${i}`} cx={44 + i * 16} cy={112 + Math.sin(i / 13 * Math.PI) * -14} r={2.2} fill={i % 2 ? '#facc15' : a} />)}
      <path d="M44,112 Q150,84 256,112" fill="none" stroke="#fde68a" strokeWidth="0.6" />
      <NameBoard x={150} y={194} text={p.name ?? 'Party Marina'} bg="#7c3aed" />
    </Svg>
  );
}

// ---------------------------------------------------------------- Abu Dhabi's own look for the shared types
// Towers, villas, townhouses, malls and resort hotels keep their shared types (homes are found by them), but on
// Abu Dhabi's map they're drawn in its own style: sandstone and white, mashrabiya lattices, wind towers, domes.

/** A stable small number from an id, to vary the drawings. */
const pick = (id: string | undefined, n: number) => [...(id ?? "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % n;

/** A residential tower: a honeycomb-screened sandstone tower, a white tower with teal glass and a sail top, or (one in
 *  a while) a Capital Gate-style tower leaning over its podium. */
export function AdTowerSprite(p: P & { id?: string }) {
  const v = pick(p.id, 7);
  const W = p.width ?? 110, H = p.height ?? 220;
  if (v === 0) return (
    <svg width={W} height={H} viewBox="0 0 110 220" className={CLS}>
      <Plinth x={8} y={212} w={80} d={22} fill="#e2e8f0" edge="#94a3b8" />
      <Box x={14} y={206} w={70} h={18} d={18} front="#f1f5f9" side="#cbd5e1" top="#e2e8f0" />
      {/* Leaning: a parallelogram swelling out to the right as it rises */}
      <path d="M26,188 L56,188 L84,30 L52,28 Z" fill="#7dd3fc" stroke="#0369a1" strokeWidth={1} />
      <path d="M56,188 L66,182 L94,26 L84,30 Z" fill="#0284c7" />
      {Array.from({ length: 14 }, (_, i) => <line key={i} x1={28 + i * 1.95} y1={188 - i * 11.3} x2={58 + i * 1.95} y2={188 - i * 11.3} stroke="#e0f2fe" strokeWidth={0.7} opacity={0.7} />)}
      <path d="M58,150 Q78,120 70,90" fill="none" stroke="#f8fafc" strokeWidth={2} opacity={0.6} />
      <NameBoard x={55} y={216} text={p.name ?? 'Tower'} bg="#0369a1" />
    </svg>
  );
  if (v % 2 === 1) return (
    <svg width={W} height={H} viewBox="0 0 110 220" className={CLS}>
      <Plinth x={8} y={212} w={80} d={22} fill="#eadfc8" edge="#b9a27a" />
      <Box x={24} y={204} w={52} h={176} d={22} front="#d9c29a" side="#b89c6e" top="#efe3c9" />
      {/* The mashrabiya: a honeycomb of hexagons over the glass */}
      {Array.from({ length: 15 }, (_, r) => Array.from({ length: 4 }, (_, c) => (
        <polygon key={`${r}-${c}`} transform={`translate(${30 + c * 12 + (r % 2) * 6},${40 + r * 11})`} points="0,-5 4.3,-2.5 4.3,2.5 0,5 -4.3,2.5 -4.3,-2.5" fill="#1e3a5f" opacity={0.55} stroke="#efe3c9" strokeWidth={0.8} />
      )))}
      <path d="M24,28 L50,14 L76,28 Z" fill="#c8a165" />
      <line x1={50} y1={14} x2={50} y2={4} stroke="#d4af37" strokeWidth={1.6} />
      <NameBoard x={55} y={216} text={p.name ?? 'Tower'} bg="#92400e" />
    </svg>
  );
  return (
    <svg width={W} height={H} viewBox="0 0 110 220" className={CLS}>
      <Plinth x={8} y={212} w={80} d={22} fill="#e2e8f0" edge="#94a3b8" />
      <Box x={24} y={204} w={50} h={168} d={22} front="#f8fafc" side="#e2e8f0" top="#ffffff" />
      {/* Teal glass in a band up the front, white fins either side */}
      <rect x={34} y={42} width={30} height={158} fill="#2dd4bf" opacity={0.8} />
      {Array.from({ length: 13 }, (_, i) => <line key={i} x1={34} y1={52 + i * 12} x2={64} y2={52 + i * 12} stroke="#f0fdfa" strokeWidth={0.8} />)}
      {/* The sail-shaped crown */}
      <path d="M24,36 Q48,6 74,22 L74,36 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth={0.8} />
      <path d="M74,22 Q86,24 92,14 L92,30 L74,36 Z" fill="#e2e8f0" />
      <NameBoard x={55} y={216} text={p.name ?? 'Tower'} bg="#0f766e" />
    </svg>
  );
}

/** A wind tower (barjeel): the square chimney that catches the breeze. */
function WindTower({ x, y, h = 22, fill = '#e9d8b4' }: { x: number; y: number; h?: number; fill?: string }) {
  return (
    <g>
      <rect x={x} y={y - h} width={9} height={h} fill={fill} stroke="#b89c6e" strokeWidth={0.6} />
      {[0, 1, 2].map((k) => <rect key={k} x={x + 1.5 + k * 2.2} y={y - h + 2} width={1.4} height={8} fill="#7c5a2e" />)}
      <rect x={x - 1} y={y - h - 2} width={11} height={2} fill="#c8a165" />
    </g>
  );
}

/** An Arabian villa: sand walls, a shaded arcade, a wind tower, a garden palm and a small pool. */
export function AdVillaSprite(p: P & { id?: string }) {
  const tint = ['#efe1c4', '#f5efe3', '#e8d3ad'][pick(p.id, 3)];
  return (
    <svg width={p.width ?? 120} height={p.height ?? 95} viewBox="0 0 160 120" className={CLS}>
      <Plinth x={6} y={104} w={128} d={34} fill="#b5cf8f" edge="#7d9a5c" />
      <polygon points="96,100 128,100 136,90 104,90" fill="#38bdf8" stroke="#f8fafc" strokeWidth={1.5} />
      <Box x={20} y={98} w={70} h={34} d={26} front={tint} side="#d2b98a" top="#f7eedb" />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${25 + i * 16},98 v-14 a6,7 0 0 1 12,0 v14`} fill="#a47b3f" opacity={0.6} />)}
      <Box x={40} y={64} w={34} h={14} d={18} front={tint} side="#d2b98a" top="#f7eedb" />
      <WindTower x={78} y={58} h={20} />
      <Palm x={14} y={102} s={1.1} /><Palm x={140} y={96} />
      <NameBoard x={75} y={114} text={p.name ?? 'Villa'} bg="#a16207" />
    </svg>
  );
}

/** A townhouse terrace: three attached homes with flat roofs and wind towers. */
export function AdTownhouseSprite(p: P) {
  return (
    <svg width={p.width ?? 120} height={p.height ?? 95} viewBox="0 0 160 120" className={CLS}>
      <Plinth x={6} y={104} w={130} d={30} fill="#b5cf8f" edge="#7d9a5c" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Box x={16 + i * 36} y={98} w={34} h={36 + (i % 2) * 6} d={22} front={['#efe1c4', '#e8d3ad', '#f5efe3'][i]} side="#d2b98a" top="#f7eedb" />
          <path d={`M${26 + i * 36},98 v-12 a7,8 0 0 1 14,0 v12`} fill="#7c5a2e" opacity={0.75} />
          <rect x={22 + i * 36} y={70 - (i % 2) * 6} width={10} height={8} fill="#7dd3fc" opacity={0.85} />
        </g>
      ))}
      <WindTower x={44} y={56} h={16} /><WindTower x={116} y={56} h={16} />
      <Palm x={10} y={104} />
      <NameBoard x={75} y={114} text={p.name ?? 'Townhouse'} bg="#a16207" />
    </svg>
  );
}

/** A mall in the souk style: sand walls, a long arcade, wind towers and a central dome. */
export function AdMallSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={60} fill="#eadfc8" edge="#b9a27a" />
      <Box x={30} y={172} w={200} h={46} d={44} front="#ecdcb9" side="#cdb486" top="#f5ead3" />
      {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${36 + i * 15},172 v-18 a6,7 0 0 1 12,0 v18`} fill="#8b5e2b" opacity={0.65} />)}
      <rect x={30} y={124} width={200} height={4} fill="#c8a165" />
      <Dome cx={132} cy={112} r={24} fill="#e9d8b4" shade="#cdb486" tip="#d4af37" />
      <WindTower x={48} y={124} h={26} /><WindTower x={206} y={124} h={26} /><WindTower x={88} y={124} h={18} />
      <Palm x={22} y={184} s={1.1} /><Palm x={258} y={176} s={1.1} />
      <NameBoard x={140} y={194} text={p.name ?? 'Mall'} bg="#92400e" />
    </Svg>
  );
}

/** A resort hotel: low white wings with domes and arches among palms. */
export function AdResortSprite(p: P) {
  return (
    <Svg {...p}>
      <Plinth x={16} y={182} w={240} d={58} fill="#cfe3b0" edge="#8fae68" />
      <polygon points="170,178 236,178 248,166 182,166" fill="#38bdf8" stroke="#f8fafc" strokeWidth={2} />
      <Box x={36} y={168} w={74} h={34} d={30} front="#fbf6ec" side="#e6dac3" top="#ffffff" />
      <Box x={110} y={160} w={64} h={52} d={34} front="#fdf9f1" side="#e6dac3" top="#ffffff" />
      {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${42 + i * 11},168 v-12 a4,5 0 0 1 8,0 v12`} fill="#c8a165" opacity={0.5} />)}
      {Array.from({ length: 5 }, (_, i) => <rect key={`w${i}`} x={116 + i * 11} y={122} width={6} height={10} fill="#7dd3fc" opacity={0.85} />)}
      <Dome cx={142} cy={104} r={18} fill="#fdf9f1" shade="#e6dac3" />
      <Dome cx={72} cy={130} r={10} fill="#fdf9f1" shade="#e6dac3" />
      {[24, 160, 252, 196].map((x, i) => <Palm key={i} x={x} y={182 - (i % 2) * 6} s={1.1} />)}
      <NameBoard x={140} y={194} text={p.name ?? 'Resort'} bg="#0e7490" />
    </Svg>
  );
}

/** The sprite for an Abu Dhabi type, or null to use the shared ones (towers, villas, malls, hotels, circuits). */
export function abuDhabiSprite(type: string, loc: { id?: string; width?: number; height?: number; name?: string }) {
  const p = { width: loc.width, height: loc.height, name: loc.name };
  switch (type) {
    // The shared types, in Abu Dhabi's own style (AD_STYLED_TYPES).
    case 'tall-building': return <AdTowerSprite {...p} id={loc.id} />;
    case 'dubai-villa': return <AdVillaSprite {...p} id={loc.id} />;
    case 'small-house': return <AdTownhouseSprite {...p} />;
    case 'mall': return <AdMallSprite {...p} />;
    case 'hotel': return <AdResortSprite {...p} />;
    case 'ad-mosque': return <GrandMosqueSprite {...p} />;
    case 'ad-louvre': return <LouvreSprite {...p} />;
    case 'ad-palace': return <EmiratesPalaceSprite {...p} />;
    case 'ad-qasr': return <QasrAlWatanSprite {...p} />;
    case 'ad-etihad-towers': return <EtihadTowersSprite {...p} />;
    case 'ad-ferrari': return <FerrariWorldSprite {...p} />;
    case 'ad-w-yas': return <WYasSprite {...p} />;
    case 'ad-marina': return <MarinaSprite {...p} />;
    case 'ad-beach': return <BeachSprite {...p} />;
    case 'ad-dining': return <SmallVenueSprite {...p} />;
    case 'ad-camp': return <DesertCampSprite {...p} />;
    case 'ad-university': return <UniversitySprite {...p} />;
    case 'ad-fort': return <FortSprite {...p} />;
    case 'ad-arena': return <ArenaSprite {...p} />;
    case 'ad-hotel-tower': return <HotelTowerSprite {...p} tint={(loc as { tint?: string }).tint} />;
    case 'ad-beach-club': return <BeachClubSprite {...p} />;
    case 'ad-wetland': return <WetlandSprite {...p} />;
    case 'ad-mangrove': return <MangroveSprite {...p} />;
    case 'ad-dhow': return <DhowHarbourSprite {...p} />;
    case 'ad-falcon': return <FalconHospitalSprite {...p} />;
    case 'ad-jetski': return <AdJetSkiSprite {...p} />;
    case 'ad-surf': return <SurfSprite {...p} />;
    case 'ad-park': return <AdParkSprite {...p} />;
    case 'ad-souq': return <AdSouqSprite {...p} />;
    case 'ad-masdar': return <MasdarSprite {...p} />;
    case 'ad-party-marina': return <PartyMarinaSprite {...p} />;
    default: return null;
  }
}
