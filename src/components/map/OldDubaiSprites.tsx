"use client";

// Bur Dubai and Deira landmarks on the city map (placed by lib/city/oldDubai.ts): Dubai Courts, the two
// maternity hospitals, the Al Fahidi and Al Ras heritage houses with their wind towers, Meena Bazaar, the
// abra stations, the Gold Souk, the Spice Souk and the Deira Clocktower. Drawn like the map's other
// landmarks: an isometric block on a paved plinth, base at the bottom of the box, depth going up and right.

import React from "react";

type SpriteProps = { width?: number; height?: number; name?: string };

/** An isometric box: front face, right side and top, from its front-left foot (x, y). Depth runs up-right. */
function Box({ x, y, w, h, d, front, side, top, stroke = "#00000022" }: { x: number; y: number; w: number; h: number; d: number; front: string; side: string; top: string; stroke?: string }) {
  const dx = d * 0.55, dy = d;
  return (
    <g>
      <polygon points={`${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y - dy - h} ${x + w},${y - h}`} fill={side} stroke={stroke} strokeWidth="0.5" />
      <polygon points={`${x},${y - h} ${x + w},${y - h} ${x + w + dx},${y - h - dy} ${x + dx},${y - h - dy}`} fill={top} stroke={stroke} strokeWidth="0.5" />
      <rect x={x} y={y - h} width={w} height={h} fill={front} stroke={stroke} strokeWidth="0.5" />
    </g>
  );
}

/** The paved ground a landmark stands on. */
function Plinth({ x, y, w, d, fill = "#e7e5e4", edge = "#a8a29e" }: { x: number; y: number; w: number; d: number; fill?: string; edge?: string }) {
  const dx = d * 0.55;
  return (
    <g>
      <polygon points={`${x},${y} ${x + w},${y} ${x + w},${y + 3} ${x},${y + 3}`} fill={edge} />
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + dx},${y - d} ${x + dx},${y - d}`} fill={fill} stroke={edge} strokeWidth="0.6" />
    </g>
  );
}

/** A name board under the building, as on the map's other landmarks. */
function NameBoard({ x, y, text, bg = "#0f172a", fg = "#ffffff" }: { x: number; y: number; text: string; bg?: string; fg?: string }) {
  const w = Math.max(40, text.length * 4.6 + 12);
  return (
    <g>
      <rect x={x - w / 2} y={y - 7} width={w} height={11} rx="5.5" fill={bg} opacity="0.92" />
      <text x={x} y={y + 1.2} textAnchor="middle" fontSize="7.2" fontWeight="800" fill={fg} fontFamily="system-ui, sans-serif">{text}</text>
    </g>
  );
}

const svgStyle = (width: number, height: number): React.CSSProperties => ({ width: `${width}px`, height: `${height}px` });
const SVG_CLASS = "drop-shadow-xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none overflow-visible";

// ---------------------------------------------------------------- Dubai Courts (Umm Hurair, by Al Maktoum Bridge)

export const DubaiCourtsSprite = ({ width = 170, height = 120, name = "Dubai Courts" }: SpriteProps) => (
  <svg viewBox="0 0 200 140" preserveAspectRatio="none" style={svgStyle(width, height)} className={SVG_CLASS}>
    <Plinth x={8} y={128} w={170} d={26} />
    {/* Wings either side of the portico */}
    <Box x={18} y={120} w={56} h={44} d={20} front="#e8d9b8" side="#c9b48a" top="#f3ead6" />
    <Box x={116} y={120} w={56} h={44} d={20} front="#e8d9b8" side="#c9b48a" top="#f3ead6" />
    {[0, 1, 2, 3].map((i) => <rect key={`wl${i}`} x={24 + i * 12.5} y={86} width={6} height={26} fill="#5b6b7c" rx="1" />)}
    {[0, 1, 2, 3].map((i) => <rect key={`wr${i}`} x={122 + i * 12.5} y={86} width={6} height={26} fill="#5b6b7c" rx="1" />)}
    {/* Central hall with its columns */}
    <Box x={70} y={120} w={50} h={58} d={22} front="#f1e6cc" side="#cdb98e" top="#faf3e3" />
    {[0, 1, 2, 3, 4].map((i) => <rect key={`c${i}`} x={73 + i * 10} y={70} width={4.5} height={50} fill="#fffaf0" stroke="#c9b48a" strokeWidth="0.5" />)}
    <polygon points="68,62 122,62 134,52 80,52" fill="#d6c39b" />
    {/* Shallow dome */}
    <ellipse cx={103} cy={46} rx={18} ry={9} fill="#c8a24a" />
    <path d="M85,46 Q103,22 121,46 Z" fill="#d4af37" stroke="#a37f2c" strokeWidth="0.6" />
    {/* Scales of justice over the door */}
    <g transform="translate(95,64)" stroke="#a37f2c" strokeWidth="1" fill="none">
      <line x1="8" y1="0" x2="8" y2="9" /><line x1="1" y1="2" x2="15" y2="2" />
      <path d="M1,2 L-1,6 L3,6 Z M15,2 L13,6 L17,6 Z" fill="#d4af37" />
    </g>
    {/* Flag */}
    <line x1={176} y1={118} x2={176} y2={58} stroke="#94a3b8" strokeWidth="1.2" />
    <rect x={177} y={58} width={4} height={14} fill="#dc2626" />
    <rect x={181} y={58} width={12} height={4.7} fill="#16a34a" /><rect x={181} y={62.7} width={12} height={4.7} fill="#ffffff" /><rect x={181} y={67.4} width={12} height={4.6} fill="#111827" />
    <NameBoard x={95} y={136} text={name} bg="#7c5a1c" />
  </svg>
);

// ---------------------------------------------------------------- Maternity hospitals (Latifa, Dubai Hospital)

export const HospitalSprite = ({ width = 150, height = 150, name = "Hospital", accent = "#0ea5e9" }: SpriteProps & { accent?: string }) => (
  <svg viewBox="0 0 170 170" preserveAspectRatio="none" style={svgStyle(width, height)} className={SVG_CLASS}>
    <Plinth x={6} y={158} w={150} d={26} fill="#e2e8f0" edge="#94a3b8" />
    {/* Low clinic wing and the main tower */}
    <Box x={14} y={150} w={60} h={38} d={22} front="#f8fafc" side="#cbd5e1" top="#ffffff" />
    <Box x={66} y={150} w={58} h={104} d={24} front="#f1f5f9" side="#cbd5e1" top="#ffffff" />
    {Array.from({ length: 8 }).map((_, r) => [0, 1, 2, 3].map((c) => <rect key={`${r}-${c}`} x={71 + c * 13.5} y={54 + r * 11.5} width={8} height={6} fill={accent} opacity="0.55" rx="1" />))}
    {[0, 1, 2].map((c) => <rect key={`l${c}`} x={20 + c * 17} y={124} width={11} height={8} fill={accent} opacity="0.5" rx="1" />)}
    {/* Entrance canopy and ambulance bay */}
    <rect x={30} y={136} width={34} height={4} fill={accent} />
    <rect x={40} y={140} width={14} height={10} fill="#334155" />
    {/* Helipad on the roof */}
    <ellipse cx={108} cy={34} rx={20} ry={8} fill="#475569" />
    <ellipse cx={108} cy={34} rx={14} ry={5.4} fill="none" stroke="#facc15" strokeWidth="1.2" />
    <text x={108} y={36.5} textAnchor="middle" fontSize="7" fontWeight="900" fill="#facc15" fontFamily="system-ui">H</text>
    {/* Sign: a white cross on the accent colour */}
    <g transform="translate(130,66)">
      <rect x={-9} y={-9} width={18} height={18} rx="3" fill={accent} />
      <rect x={-2.2} y={-6} width={4.4} height={12} fill="#ffffff" /><rect x={-6} y={-2.2} width={12} height={4.4} fill="#ffffff" />
    </g>
    <NameBoard x={85} y={166} text={name} bg={accent} />
  </svg>
);

// ---------------------------------------------------------------- Heritage houses with wind towers (Al Fahidi, Al Ras)

export const HeritageSprite = ({ width = 150, height = 110, name = "Al Fahidi Historical District" }: SpriteProps) => (
  <svg viewBox="0 0 180 130" preserveAspectRatio="none" style={svgStyle(width, height)} className={SVG_CLASS}>
    <Plinth x={6} y={118} w={160} d={24} fill="#e9dcc0" edge="#b59a6a" />
    <Box x={14} y={112} w={58} h={30} d={20} front="#dcc49a" side="#b8a072" top="#ead8b4" />
    <Box x={78} y={112} w={70} h={36} d={22} front="#d8bf92" side="#b39a6c" top="#e8d4ae" />
    {/* Barjeel wind towers */}
    {[[40, 82, 26], [118, 76, 34]].map(([x, y, h], i) => (
      <g key={i}>
        <Box x={x - 8} y={y} w={16} h={h} d={8} front="#e2cda4" side="#bfa77a" top="#f0dfbf" />
        {[0, 1, 2].map((k) => <rect key={k} x={x - 6 + k * 4.4} y={y - h + 3} width={2.4} height={h - 8} fill="#7a5c34" />)}
      </g>
    ))}
    {/* Carved wooden doors and a date palm */}
    <rect x={36} y={98} width={10} height={14} fill="#6b4423" rx="1" />
    <rect x={106} y={94} width={12} height={18} fill="#6b4423" rx="1" />
    <g transform="translate(160,112)">
      <rect x={-1.5} y={-34} width={3} height={34} fill="#7c5a33" />
      {[-60, -20, 20, 60, 100, 140].map((a) => <ellipse key={a} cx={0} cy={-34} rx={12} ry={3} fill="#3f7d3a" transform={`rotate(${a} 0 -34) translate(8 0)`} />)}
    </g>
    <NameBoard x={88} y={126} text={name} bg="#7a5c34" />
  </svg>
);

// ---------------------------------------------------------------- Meena Bazaar (bridal and wedding wear)

export const MeenaBazaarSprite = ({ width = 160, height = 110, name = "Meena Bazaar" }: SpriteProps) => {
  const fronts = ["#be185d", "#7c3aed", "#b45309", "#0f766e", "#b91c1c"];
  return (
    <svg viewBox="0 0 190 130" preserveAspectRatio="none" style={svgStyle(width, height)} className={SVG_CLASS}>
      <Plinth x={6} y={118} w={170} d={22} fill="#e5e7eb" edge="#9ca3af" />
      <Box x={12} y={110} w={160} h={54} d={20} front="#f5efe3" side="#d6cbb4" top="#fbf7ef" />
      {fronts.map((c, i) => (
        <g key={i}>
          {/* Shopfront, striped awning and the gowns and saris hanging in the window */}
          <rect x={16 + i * 31} y={80} width={27} height={30} fill="#1f2937" />
          <polygon points={`${14 + i * 31},${80} ${45 + i * 31},${80} ${42 + i * 31},${72} ${17 + i * 31},${72}`} fill={c} />
          {[0, 1, 2].map((k) => <path key={k} d={`M${21 + i * 31 + k * 7},84 l-3,22 h7 z`} fill={k === 1 ? "#fde68a" : c} opacity="0.9" />)}
          <rect x={18 + i * 31} y={62} width={23} height={7} fill={c} opacity="0.85" rx="1" />
        </g>
      ))}
      {/* Strings of lights */}
      <path d="M12,58 Q50,66 92,58 Q134,66 172,58" fill="none" stroke="#fde68a" strokeWidth="1" strokeDasharray="1.5 3" />
      <NameBoard x={92} y={126} text={name} bg="#be185d" />
    </svg>
  );
};

// ---------------------------------------------------------------- Abra stations on the Creek

export const AbraStationSprite = ({ width = 90, height = 70, name = "Abra station" }: SpriteProps) => (
  <svg viewBox="0 0 110 86" preserveAspectRatio="none" style={svgStyle(width, height)} className={SVG_CLASS}>
    <polygon points="6,74 96,74 104,62 14,62" fill="#a16207" stroke="#713f12" strokeWidth="0.6" />
    {[16, 40, 64, 88].map((x) => <rect key={x} x={x} y={42} width={2.5} height={28} fill="#713f12" />)}
    <polygon points="10,44 100,44 92,32 18,32" fill="#c2410c" />
    {/* An abra tied up alongside */}
    <path d="M22,82 Q55,90 92,82 L88,76 L26,76 Z" fill="#7c2d12" />
    <rect x={36} y={68} width={36} height={8} fill="#fef3c7" stroke="#7c2d12" strokeWidth="0.6" />
    <NameBoard x={55} y={20} text={name} bg="#0369a1" />
  </svg>
);

// ---------------------------------------------------------------- Gold Souk (Al Ras, Deira)

export const GoldSoukSprite = ({ width = 180, height = 120, name = "Dubai Gold Souk" }: SpriteProps) => (
  <svg viewBox="0 0 210 140" preserveAspectRatio="none" style={svgStyle(width, height)} className={SVG_CLASS}>
    <defs>
      <linearGradient id="gs-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" /><stop offset="60%" stopColor="#eab308" /><stop offset="100%" stopColor="#a16207" />
      </linearGradient>
    </defs>
    <Plinth x={6} y={128} w={190} d={24} fill="#efe6d2" edge="#b59a6a" />
    {/* The covered souk: a long arcade under a timber roof */}
    <Box x={12} y={120} w={180} h={40} d={22} front="#e9d8b4" side="#c7b07f" top="#8b5a2b" />
    {Array.from({ length: 9 }).map((_, i) => (
      <g key={i}>
        <path d={`M${18 + i * 19.5},120 v-24 a7,7 0 0 1 14,0 v24 z`} fill="#1c1917" />
        {/* Shop windows full of gold */}
        <path d={`M${20 + i * 19.5},118 v-20 a5,5 0 0 1 10,0 v20 z`} fill="url(#gs-gold)" opacity="0.95" />
      </g>
    ))}
    {/* The gateway arch with its sign */}
    <Box x={78} y={120} w={48} h={66} d={22} front="#d9c08d" side="#b59a6a" top="#f0e3c3" />
    <path d="M88,120 v-36 a14,14 0 0 1 28,0 v36 z" fill="#3f2a14" />
    <path d="M91,120 v-34 a11,11 0 0 1 22,0 v34 z" fill="url(#gs-gold)" opacity="0.8" />
    <rect x={80} y={58} width={44} height={12} fill="#7c2d12" rx="1" />
    <text x={102} y={66.5} textAnchor="middle" fontSize="6.4" fontWeight="900" fill="#fde68a" fontFamily="system-ui">GOLD SOUK</text>
    <NameBoard x={102} y={136} text={name} bg="#a16207" />
  </svg>
);

// ---------------------------------------------------------------- Spice Souk (next to the Gold Souk)

export const SpiceSoukSprite = ({ width = 130, height = 90, name = "Spice Souk" }: SpriteProps) => {
  const sacks = ["#dc2626", "#f59e0b", "#a16207", "#16a34a", "#7c2d12", "#f97316", "#ca8a04"];
  return (
    <svg viewBox="0 0 160 110" preserveAspectRatio="none" style={svgStyle(width, height)} className={SVG_CLASS}>
      <Plinth x={6} y={98} w={140} d={22} fill="#efe6d2" edge="#b59a6a" />
      <Box x={14} y={90} w={124} h={34} d={20} front="#dcc49a" side="#b8a072" top="#6b4423" />
      <polygon points="12,60 140,60 148,52 20,52" fill="#92400e" />
      {sacks.map((c, i) => (
        <g key={i} transform={`translate(${24 + i * 16},92)`}>
          <path d="M-6,0 q-1,-12 2,-14 h8 q3,2 2,14 z" fill="#e7d3a8" stroke="#a08156" strokeWidth="0.5" />
          <ellipse cx={0} cy={-14} rx={4.6} ry={1.8} fill={c} />
        </g>
      ))}
      <NameBoard x={78} y={106} text={name} bg="#92400e" />
    </svg>
  );
};

// ---------------------------------------------------------------- Deira Clocktower

export const ClocktowerSprite = ({ width = 90, height = 130, name = "Deira Clocktower" }: SpriteProps) => (
  <svg viewBox="0 0 110 160" preserveAspectRatio="none" style={svgStyle(width, height)} className={SVG_CLASS}>
    {/* The roundabout and its fountain */}
    <ellipse cx={55} cy={142} rx={48} ry={13} fill="#86efac" stroke="#16a34a" strokeWidth="0.8" />
    <ellipse cx={55} cy={142} rx={26} ry={7} fill="#7dd3fc" stroke="#ffffff" strokeWidth="0.8" />
    {/* Four splayed legs meeting under the clock */}
    <path d="M32,140 Q46,108 52,62 L58,62 Q64,108 78,140 L70,140 Q60,110 55,80 Q50,110 40,140 Z" fill="#f5f5f4" stroke="#a8a29e" strokeWidth="0.6" />
    <rect x={47} y={34} width={16} height={30} fill="#fafaf9" stroke="#a8a29e" strokeWidth="0.6" />
    <circle cx={55} cy={46} r={6.2} fill="#ffffff" stroke="#1c1917" strokeWidth="0.9" />
    <line x1={55} y1={46} x2={55} y2={42} stroke="#1c1917" strokeWidth="0.9" /><line x1={55} y1={46} x2={58} y2={47} stroke="#1c1917" strokeWidth="0.9" />
    <path d="M45,34 L55,16 L65,34 Z" fill="#d4d4d4" stroke="#a8a29e" strokeWidth="0.6" />
    <NameBoard x={55} y={156} text={name} bg="#334155" />
  </svg>
);
