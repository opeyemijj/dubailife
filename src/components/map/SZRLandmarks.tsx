import React from 'react';

// Sheikh Zayed Road landmarks standing on the floor-ad strip: the hotel towers (each with its own
// silhouette — Fairmont's four lit pyramids, The H's twin towers, Shangri-La's stepped crown…) and
// Coca-Cola Arena. Drawn like the older towers (TallBuilding): the front face, a narrow darker left wall
// receding up and to the left, and a sliver of roof, anchored at the base like other buildings.

export type TowerCrown = 'stepped' | 'slab' | 'spire' | 'pyramids' | 'twin';

export interface SZRTowerProps {
  width?: number;
  height?: number;
  name?: string;
  sign?: string;
  glass?: string;
  frame?: string;
  accent?: string;
  crown?: TowerCrown;
}

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

/** One glass tower: podium, shaft with window bands, side face and a crown. */
function Shaft({ x, w, top, bottom, glass, frame, id }: { x: number; w: number; top: number; bottom: number; glass: string; frame: string; id: string }) {
  // Left wall ~16% of the front's width, rising by about half its width (as TallBuilding does).
  const side = Math.max(6, Math.round(w * 0.16)), rise = Math.round(side * 0.55);
  const rows = Math.floor((bottom - top - 8) / 9);
  return (
    <g>
      {/* left wall and roof */}
      <polygon points={`${x - side},${top - rise} ${x},${top} ${x},${bottom} ${x - side},${bottom - rise}`} fill={shade(glass, -55)} />
      {Array.from({ length: rows }, (_, i) => <line key={i} x1={x - side} y1={top - rise + 6 + i * 9} x2={x} y2={top + 6 + i * 9} stroke="#ffffff" strokeWidth="1.2" opacity="0.12" />)}
      <polygon points={`${x},${top} ${x + w},${top} ${x + w - side},${top - rise} ${x - side},${top - rise}`} fill={shade(frame, -20)} />
      {/* front face */}
      <rect x={x} y={top} width={w} height={bottom - top} fill={`url(#${id}-glass)`} stroke={frame} strokeWidth="1.2" />
      {Array.from({ length: rows }, (_, i) => (
        <rect key={i} x={x + 3} y={top + 6 + i * 9} width={w - 6} height="4.5" fill="#ffffff" opacity={i % 3 === 0 ? 0.35 : 0.18} />
      ))}
      {[0.33, 0.66].map((f) => <line key={f} x1={x + w * f} y1={top} x2={x + w * f} y2={bottom} stroke={frame} strokeWidth="0.8" opacity="0.6" />)}
    </g>
  );
}

export const SZRTower: React.FC<SZRTowerProps> = ({
  width = 110, height = 270, name = 'Hotel', sign, glass = '#38bdf8', frame = '#e2e8f0', accent = '#facc15', crown = 'slab',
}) => {
  const id = `szr-${(sign ?? name).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const top = crown === 'twin' ? 46 : 40;
  return (
    <svg viewBox="0 0 110 280" preserveAspectRatio="none" style={{ width, height }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none" aria-label={name}>
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shade(glass, 45)} />
          <stop offset="55%" stopColor={glass} />
          <stop offset="100%" stopColor={shade(glass, -35)} />
        </linearGradient>
      </defs>
      {/* ground shadow and podium */}
      <ellipse cx="55" cy="272" rx="52" ry="6" fill="#000" opacity="0.18" />
      <polygon points="0,244 8,250 8,272 0,266" fill={shade(frame, -70)} />
      <polygon points="0,244 88,244 96,250 8,250" fill={shade(frame, -25)} />
      <rect x="8" y="250" width="88" height="22" fill={shade(frame, -40)} />
      <rect x="38" y="256" width="28" height="16" fill="#0f172a" />
      <rect x="40" y="258" width="24" height="12" fill={accent} opacity="0.45" />

      {crown === 'twin' ? (
        <>
          <Shaft x={14} w={34} top={top} bottom={250} glass={glass} frame={frame} id={id} />
          <Shaft x={56} w={34} top={top} bottom={250} glass={glass} frame={frame} id={id} />
          {/* sky bridge and the two crowns */}
          <rect x="44" y="60" width="16" height="10" fill={shade(frame, -20)} stroke={frame} />
          <polygon points={`14,${top} 31,${top - 22} 48,${top}`} fill={shade(frame, -15)} stroke={frame} />
          <polygon points={`56,${top} 73,${top - 22} 90,${top}`} fill={shade(frame, -15)} stroke={frame} />
          <circle cx="31" cy={top - 10} r="2.2" fill={accent} /><circle cx="73" cy={top - 10} r="2.2" fill={accent} />
        </>
      ) : (
        <>
          <Shaft x={18} w={66} top={top} bottom={250} glass={glass} frame={frame} id={id} />
          {crown === 'stepped' && (
            <>
              <rect x="24" y={top - 12} width="54" height="12" fill={shade(glass, -10)} stroke={frame} />
              <rect x="32" y={top - 22} width="38" height="10" fill={shade(glass, -20)} stroke={frame} />
              <rect x="46" y={top - 36} width="10" height="14" fill={frame} />
              <rect x="24" y={top - 3} width="54" height="2" fill={accent} />
            </>
          )}
          {crown === 'slab' && (
            <>
              <rect x="18" y={top - 14} width="66" height="14" fill={shade(glass, -25)} stroke={frame} />
              <rect x="74" y={top - 34} width="6" height="34" fill={frame} />
              <rect x="18" y={top - 3} width="66" height="2.5" fill={accent} />
            </>
          )}
          {crown === 'spire' && (
            <>
              <polygon points={`18,${top} 51,${top - 26} 84,${top}`} fill={shade(glass, -20)} stroke={frame} />
              <rect x="50" y={top - 48} width="2.5" height="24" fill={frame} />
              <circle cx="51" cy={top - 49} r="2" fill={accent} />
            </>
          )}
          {crown === 'pyramids' && (
            <>
              {/* Fairmont's four corner pyramids, lit at night */}
              <rect x="18" y={top - 8} width="66" height="8" fill={shade(frame, -25)} />
              {[18, 34, 52, 68].map((px) => <polygon key={px} points={`${px},${top - 8} ${px + 8},${top - 26} ${px + 16},${top - 8}`} fill={accent} stroke={shade(accent, -60)} strokeWidth="0.8" />)}
            </>
          )}
        </>
      )}

      {/* name on the façade */}
      {sign && (
        <g>
          <rect x="14" y={top + 6} width="82" height="13" rx="2" fill="#0f172a" opacity="0.78" />
          <text x="55" y={top + 15.5} textAnchor="middle" fontSize={sign.length > 12 ? 6.4 : 7.6} fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif" letterSpacing="0.4">{sign}</text>
        </g>
      )}
    </svg>
  );
};

/** Coca-Cola Arena at City Walk: a wide indoor arena with a curved red roof and an LED screen. */
export const CocaColaArena: React.FC<{ width?: number; height?: number; name?: string }> = ({ width = 250, height = 140, name = 'Coca-Cola Arena' }) => (
  <svg viewBox="0 0 250 140" preserveAspectRatio="none" style={{ width, height }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none" aria-label={name}>
    <defs>
      <linearGradient id="cca-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#991b1b" /></linearGradient>
      <linearGradient id="cca-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#bae6fd" /><stop offset="100%" stopColor="#0369a1" /></linearGradient>
    </defs>
    <ellipse cx="125" cy="133" rx="122" ry="7" fill="#000" opacity="0.18" />
    {/* plaza */}
    <polygon points="6,120 244,120 236,134 14,134" fill="#e7e5e4" />
    <g transform="translate(16,0)">
    {/* left wall */}
    <polygon points="-14,48 10,56 10,120 -14,112" fill="#7f1d1d" />
    {/* main hall */}
    <rect x="10" y="56" width="216" height="64" fill="#f8fafc" stroke="#cbd5e1" />
    <path d="M10,58 Q118,8 226,58 L202,50 Q104,0 -14,50 Z" fill="#b91c1c" />
    <path d="M10,58 Q118,12 226,58 Z" fill="url(#cca-roof)" />
    {/* red band with the name */}
    <rect x="10" y="62" width="216" height="16" fill="#dc2626" />
    <text x="118" y="74" textAnchor="middle" fontSize="11" fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif" letterSpacing="1.2">COCA-COLA ARENA</text>
    {/* glass lobby and doors */}
    <rect x="22" y="84" width="192" height="36" fill="url(#cca-glass)" opacity="0.9" />
    {Array.from({ length: 12 }, (_, i) => <line key={i} x1={22 + i * 16} y1="84" x2={22 + i * 16} y2="120" stroke="#e2e8f0" strokeWidth="1" />)}
    {/* LED screen */}
    <rect x="160" y="86" width="46" height="22" rx="2" fill="#0f172a" />
    <text x="183" y="96" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#facc15" fontFamily="system-ui, sans-serif">LIVE</text>
    <text x="183" y="104" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#f472b6" fontFamily="system-ui, sans-serif">TONIGHT</text>
    {/* crowd queue */}
    </g>
    {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={36 + i * 9} cy={126 + (i % 2)} r="2.2" fill={['#f97316', '#0ea5e9', '#a855f7', '#22c55e'][i % 4]} />)}
  </svg>
);

/** A two-storey restaurant-lounge with a lit sign, a canopy, a VIP rope and coloured lights. */
export const SZRLounge: React.FC<{ width?: number; height?: number; name?: string; sign?: string; colors?: string[] }> = ({
  width = 170, height = 125, name = 'Lounge', sign = 'LOUNGE', colors = ['#a855f7', '#22d3ee', '#ec4899'],
}) => {
  const [a, b, c] = colors;
  const id = `lounge-${sign.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 170 130" preserveAspectRatio="none" style={{ width, height }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none" aria-label={name}>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#27272a" /><stop offset="100%" stopColor="#09090b" /></linearGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <ellipse cx="85" cy="124" rx="80" ry="5" fill="#000" opacity="0.2" />
      {/* left wall and roof terrace */}
      <polygon points="2,26 18,34 18,118 2,110" fill="#18181b" />
      <polygon points="18,34 146,34 130,26 2,26" fill="#3f3f46" />
      {/* front façade, two floors */}
      <rect x="18" y="34" width="128" height="84" fill={`url(#${id}-wall)`} stroke="#3f3f46" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={26 + i * 30} y="44" width="22" height="18" rx="1" fill={[a, b, c, a][i]} opacity="0.55" />)}
      {/* neon sign */}
      <rect x="30" y="68" width="104" height="18" rx="3" fill="#000" stroke={a} strokeWidth="1.6" filter={`url(#${id}-glow)`} />
      <text x="82" y="81.5" textAnchor="middle" fontSize={sign.length > 7 ? 10 : 12} fontWeight="900" fill={b} fontFamily="system-ui, sans-serif" letterSpacing="1.5" filter={`url(#${id}-glow)`}>{sign}</text>
      {/* canopy and door */}
      <polygon points="56,92 108,92 114,99 50,99" fill={c} />
      <rect x="66" y="99" width="32" height="19" fill="#000" />
      <rect x="68" y="101" width="28" height="17" fill={a} opacity="0.35" />
      {/* VIP rope and string lights */}
      {[40, 52, 112, 124].map((x) => <rect key={x} x={x} y="106" width="2" height="12" fill="#d4af37" />)}
      <path d="M41,108 Q47,113 53,108 M113,108 Q119,113 125,108" stroke="#b91c1c" strokeWidth="1.6" fill="none" />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={22 + i * 11} cy={30 + (i % 2) * 1.5} r="1.6" fill={[a, b, c][i % 3]} filter={`url(#${id}-glow)`} />)}
    </svg>
  );
};
