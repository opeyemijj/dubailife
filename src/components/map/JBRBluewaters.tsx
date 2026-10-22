import React from 'react';

// JBR (Jumeirah Beach Residence): the wall of sand-coloured residential towers along the beach, with The
// Walk at their feet (JBR Beach is its own entity, on the sea side behind them). Bluewaters: the island just offshore with Ain Dubai, the
// low-rise residences and retail, and the footbridge back to JBR. Both drawn front-on with their right
// side showing, like the rest of the map.

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

/** One residential tower: front face with balcony bands, a narrow right wall and a roof slab. */
function Tower({ x, w, top, base, color }: { x: number; w: number; top: number; base: number; color: string }) {
  const side = Math.max(5, Math.round(w * 0.2)), rise = Math.round(side * 0.6);
  const rows = Math.floor((base - top - 6) / 7);
  return (
    <g>
      <polygon points={`${x + w},${top} ${x + w + side},${top - rise} ${x + w + side},${base - rise} ${x + w},${base}`} fill={shade(color, -50)} />
      <polygon points={`${x},${top} ${x + w},${top} ${x + w + side},${top - rise} ${x + side},${top - rise}`} fill={shade(color, 25)} />
      <rect x={x} y={top} width={w} height={base - top} fill={color} stroke={shade(color, -35)} strokeWidth="0.8" />
      {Array.from({ length: rows }, (_, i) => (
        <g key={i}>
          <rect x={x + 2} y={top + 5 + i * 7} width={w - 4} height="3.2" fill="#0f172a" opacity="0.55" />
          <rect x={x + 2} y={top + 8.2 + i * 7} width={w - 4} height="0.9" fill="#ffffff" opacity="0.7" />
        </g>
      ))}
      {/* rooftop plant */}
      <rect x={x + w * 0.3} y={top - 5} width={w * 0.4} height="5" fill={shade(color, -20)} />
    </g>
  );
}

export const JBRSprite: React.FC<{ width?: number; height?: number; name?: string }> = ({ width = 400, height = 240, name = 'JBR' }) => {
  // Six clusters along the beach (Shams, Amwaj, Rimal, Bahar, Sadaf, Murjan), with hotel towers among them.
  const towers = [
    { x: 14, w: 34, top: 70, color: '#e7c9a0' }, { x: 52, w: 30, top: 48, color: '#d9b48a' }, { x: 86, w: 36, top: 82, color: '#ecd4b0' },
    { x: 128, w: 30, top: 40, color: '#e2bf93' }, { x: 162, w: 38, top: 64, color: '#f0dcbc' }, { x: 206, w: 30, top: 30, color: '#c9a77f' },
    { x: 240, w: 36, top: 58, color: '#e7c9a0' }, { x: 282, w: 30, top: 44, color: '#d9b48a' }, { x: 316, w: 36, top: 76, color: '#ecd4b0' },
  ];
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="none" style={{ width, height }} className="drop-shadow-2xl cursor-pointer hover:scale-[1.03] transition-transform origin-bottom select-none" aria-label={name}>
      <ellipse cx="200" cy="232" rx="196" ry="7" fill="#000" opacity="0.15" />
      {/* plinth: the podium the towers stand on */}
      <polygon points="6,196 370,196 390,184 26,184" fill="#e2d3b8" />
      <rect x="6" y="196" width="364" height="10" fill="#cbb48f" />
      <polygon points="370,196 390,184 390,194 370,206" fill="#a88f6a" />
      {towers.map((t, i) => <Tower key={i} {...t} base={196} />)}
      {/* The Walk: shopfronts, awnings and palms along the podium */}
      <rect x="6" y="206" width="364" height="10" fill="#f8fafc" />
      {Array.from({ length: 18 }, (_, i) => (
        <g key={i}>
          <rect x={10 + i * 20} y="198" width="14" height="7" fill={['#fde68a', '#bae6fd', '#fecaca', '#bbf7d0'][i % 4]} opacity="0.9" />
          <polygon points={`${8 + i * 20},198 ${26 + i * 20},198 ${24 + i * 20},195 ${10 + i * 20},195`} fill={['#dc2626', '#0ea5e9', '#16a34a', '#f59e0b'][i % 4]} />
        </g>
      ))}
      {[30, 110, 190, 270, 350].map((px) => (
        <g key={px}>
          <line x1={px} y1="216" x2={px} y2="202" stroke="#78350f" strokeWidth="1.6" />
          <path d={`M${px - 7},203 Q${px},196 ${px + 7},203 M${px - 6},200 Q${px},192 ${px + 6},200`} stroke="#16a34a" strokeWidth="2.2" fill="none" />
        </g>
      ))}
      {/* The Walk paving in front (JBR Beach itself lies behind the towers, on the sea side) */}
      <polygon points="0,216 380,216 396,206 16,206" fill="#e7e5e4" />
      <rect x="0" y="216" width="380" height="6" fill="#d6d3d1" />
      <rect x="140" y="219" width="120" height="16" rx="8" fill="#0f172a" opacity="0.9" />
      <text x="200" y="230.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif" letterSpacing="1.5">JBR · THE WALK</text>
    </svg>
  );
};

export const BluewatersSprite: React.FC<{ width?: number; height?: number; name?: string }> = ({ width = 320, height = 300, name = 'Bluewaters' }) => {
  const cx = 92, cy = 128, r = 86;
  const spokes = 24, pods = 24;
  return (
    <svg viewBox="0 0 320 300" preserveAspectRatio="none" style={{ width, height }} className="drop-shadow-2xl cursor-pointer hover:scale-[1.03] transition-transform origin-bottom select-none" aria-label={name}>
      {/* footbridge back to JBR (down and to the left, toward the shore) */}
      <polygon points="64,268 108,262 30,300 0,300" fill="#e2e8f0" />
      <polygon points="64,268 108,262 108,266 66,272" fill="#94a3b8" />
      {/* the island: sand ring and landscaped top, in the map's slant */}
      <ellipse cx="170" cy="262" rx="150" ry="30" fill="#0284c7" opacity="0.35" />
      <ellipse cx="170" cy="256" rx="146" ry="27" fill="#fde68a" />
      <ellipse cx="172" cy="252" rx="132" ry="21" fill="#a7f3d0" />
      {/* low-rise residences and retail with right walls */}
      {[{ x: 160, w: 44, h: 46, c: '#f8fafc' }, { x: 210, w: 38, h: 58, c: '#e0f2fe' }, { x: 254, w: 40, h: 40, c: '#f1f5f9' }].map((b, i) => (
        <g key={i}>
          <polygon points={`${b.x + b.w},${252 - b.h} ${b.x + b.w + 8},${248 - b.h} ${b.x + b.w + 8},${248} ${b.x + b.w},${252}`} fill={shade(b.c, -60)} />
          <polygon points={`${b.x},${252 - b.h} ${b.x + b.w},${252 - b.h} ${b.x + b.w + 8},${248 - b.h} ${b.x + 8},${248 - b.h}`} fill={shade(b.c, -15)} />
          <rect x={b.x} y={252 - b.h} width={b.w} height={b.h} fill={b.c} stroke="#cbd5e1" strokeWidth="0.8" />
          {Array.from({ length: Math.floor(b.h / 10) }, (_, k) => <rect key={k} x={b.x + 3} y={256 - b.h + k * 10} width={b.w - 6} height="4" fill="#0ea5e9" opacity="0.55" />)}
        </g>
      ))}
      {/* Banyan Tree: the resort at the island's tip, with its pool */}
      <polygon points="248,212 300,212 306,208 254,208" fill="#78350f" />
      <ellipse cx="282" cy="256" rx="14" ry="4" fill="#22d3ee" />
      {/* Ain Dubai: legs, rim, spokes and cabins */}
      <polygon points={`${cx - 34},252 ${cx - 4},${cy} ${cx + 4},${cy} ${cx - 26},252`} fill="#94a3b8" />
      <polygon points={`${cx + 34},252 ${cx + 4},${cy} ${cx - 4},${cy} ${cx + 26},252`} fill="#cbd5e1" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx={cx} cy={cy} r={r - 6} fill="none" stroke="#94a3b8" strokeWidth="1.2" />
      {Array.from({ length: spokes }, (_, i) => {
        const a = (i / spokes) * Math.PI * 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * (r - 4)} y2={cy + Math.sin(a) * (r - 4)} stroke="#cbd5e1" strokeWidth="0.7" />;
      })}
      {Array.from({ length: pods }, (_, i) => {
        const a = (i / pods) * Math.PI * 2;
        return <rect key={i} x={cx + Math.cos(a) * r - 4} y={cy + Math.sin(a) * r - 3} width="8" height="6" rx="2" fill={i % 6 === 0 ? '#f472b6' : '#38bdf8'} stroke="#0f172a" strokeWidth="0.5" />;
      })}
      <circle cx={cx} cy={cy} r="8" fill="#475569" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="168" y="268" width="104" height="16" rx="8" fill="#0f172a" opacity="0.85" />
      <text x="220" y="279.5" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif" letterSpacing="1.3">BLUEWATERS</text>
    </svg>
  );
};

/** Dubai Marina Mall: a glass-fronted three-level mall with its name over the entrance. */
export const MarinaMallSprite: React.FC<{ width?: number; height?: number; name?: string }> = ({ width = 260, height = 150, name = 'Dubai Marina Mall' }) => (
  <svg viewBox="0 0 260 150" preserveAspectRatio="none" style={{ width, height }} className="drop-shadow-2xl cursor-pointer hover:scale-[1.03] transition-transform origin-bottom select-none" aria-label={name}>
    <ellipse cx="128" cy="143" rx="124" ry="6" fill="#000" opacity="0.15" />
    <polygon points="6,132 236,132 252,122 22,122" fill="#e2e8f0" />
    {/* right wall and roof */}
    <polygon points="226,44 246,34 246,118 226,128" fill="#64748b" />
    <polygon points="14,44 226,44 246,34 34,34" fill="#cbd5e1" />
    {/* front: three glass levels between white bands */}
    <rect x="14" y="44" width="212" height="84" fill="#f8fafc" stroke="#cbd5e1" />
    {[50, 76, 102].map((y) => <rect key={y} x="20" y={y} width="200" height="20" fill="#38bdf8" opacity="0.75" />)}
    {Array.from({ length: 11 }, (_, i) => <line key={i} x1={20 + i * 20} y1="50" x2={20 + i * 20} y2="122" stroke="#e0f2fe" strokeWidth="1" />)}
    {/* entrance canopy and sign */}
    <rect x="86" y="104" width="68" height="24" fill="#0f172a" opacity="0.85" />
    <polygon points="78,104 162,104 156,98 84,98" fill="#0ea5e9" />
    <rect x="54" y="20" width="132" height="16" rx="3" fill="#0f172a" />
    <text x="120" y="31.5" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif" letterSpacing="1.2">DUBAI MARINA MALL</text>
    {[30, 60, 180, 210].map((px) => <g key={px}><line x1={px} y1="132" x2={px} y2="118" stroke="#78350f" strokeWidth="1.5" /><circle cx={px} cy="116" r="5" fill="#16a34a" /></g>)}
  </svg>
);

/** Pier 7: the round seven-storey glass dining tower on the marina, one restaurant per floor. */
export const Pier7Sprite: React.FC<{ width?: number; height?: number; name?: string }> = ({ width = 110, height = 230, name = 'Pier 7' }) => (
  <svg viewBox="0 0 110 230" preserveAspectRatio="none" style={{ width, height }} className="drop-shadow-2xl cursor-pointer hover:scale-[1.03] transition-transform origin-bottom select-none" aria-label={name}>
    <ellipse cx="55" cy="224" rx="50" ry="5" fill="#000" opacity="0.15" />
    {/* pier deck in the water */}
    <polygon points="6,214 96,214 106,206 16,206" fill="#a16207" />
    <rect x="6" y="214" width="90" height="6" fill="#78350f" />
    {/* the round tower: lit front, darker right flank */}
    <defs>
      <linearGradient id="pier7-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#bae6fd" /><stop offset="55%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0c4a6e" />
      </linearGradient>
    </defs>
    <rect x="22" y="36" width="66" height="172" rx="6" fill="url(#pier7-glass)" stroke="#e0f2fe" strokeWidth="1" />
    <ellipse cx="55" cy="36" rx="33" ry="7" fill="#e2e8f0" />
    {Array.from({ length: 7 }, (_, i) => (
      <g key={i}>
        <rect x="22" y={56 + i * 22} width="66" height="3" fill="#f8fafc" />
        <rect x="26" y={42 + i * 22} width="58" height="10" fill={['#fde68a', '#fecaca', '#bbf7d0', '#ddd6fe', '#fed7aa', '#bae6fd', '#fbcfe8'][i]} opacity="0.55" />
      </g>
    ))}
    <rect x="30" y="10" width="50" height="16" rx="8" fill="#0f172a" />
    <text x="55" y="21.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif" letterSpacing="1.5">PIER 7</text>
  </svg>
);
