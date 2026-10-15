import React from 'react';

// Palm Jumeirah's landmark buildings for the city map (placed on the island by lib/city/palm.ts).

// ---------------------------------------------------------------- landmark sprites

const label = (name: string, w: number, y: number) => (
  <g>
    <rect x={w / 2 - Math.min(w - 4, name.length * 5.6 + 14) / 2} y={y} width={Math.min(w - 4, name.length * 5.6 + 14)} height="15" rx="7.5" fill="#0f172a" opacity="0.82" />
    <text x={w / 2} y={y + 11} fontSize="8.5" fontWeight="800" fill="#fff" textAnchor="middle">{name.length > 30 ? `${name.slice(0, 29)}…` : name}</text>
  </g>
);

/** Atlantis, The Palm: the coral twin-winged tower with the Royal Bridge Suite arch. */
export const AtlantisPalmSprite = ({ width = 200, height = 150, name = 'Atlantis, The Palm' }: { width?: number; height?: number; name?: string }) => (
  <svg viewBox="0 0 200 150" width={width} height={height} className="drop-shadow-xl overflow-visible">
    {/* beach and pool */}
    <ellipse cx="100" cy="136" rx="96" ry="12" fill="#fde68a" />
    <ellipse cx="62" cy="136" rx="22" ry="5" fill="#22d3ee" />
    <ellipse cx="142" cy="136" rx="26" ry="5" fill="#22d3ee" />
    {/* wings */}
    <polygon points="14,132 52,132 60,62 26,70" fill="#f9a8b4" />
    <polygon points="186,132 148,132 140,62 174,70" fill="#f9a8b4" />
    <polygon points="26,70 60,62 62,56 30,64" fill="#fb7185" />
    <polygon points="174,70 140,62 138,56 170,64" fill="#fb7185" />
    {/* twin towers */}
    <rect x="58" y="22" width="26" height="110" fill="#fda4af" />
    <rect x="116" y="22" width="26" height="110" fill="#fda4af" />
    <rect x="84" y="26" width="4" height="106" fill="#f43f5e" opacity="0.4" />
    <rect x="112" y="26" width="4" height="106" fill="#f43f5e" opacity="0.4" />
    {/* the arch and the Royal Bridge Suite */}
    <path d="M84,132 L84,60 Q100,38 116,60 L116,132 Z" fill="#7dd3fc" opacity="0.55" />
    <rect x="82" y="30" width="36" height="16" rx="3" fill="#fecdd3" stroke="#e11d48" strokeWidth="1" />
    {/* crowns */}
    <path d="M58,22 L71,8 L84,22 Z" fill="#e11d48" />
    <path d="M116,22 L129,8 L142,22 Z" fill="#e11d48" />
    <circle cx="71" cy="7" r="2.5" fill="#facc15" />
    <circle cx="129" cy="7" r="2.5" fill="#facc15" />
    {/* windows */}
    {Array.from({ length: 9 }, (_, i) => (
      <g key={i}>
        <rect x="62" y={30 + i * 11} width="18" height="2" fill="#fff" opacity="0.7" />
        <rect x="120" y={30 + i * 11} width="18" height="2" fill="#fff" opacity="0.7" />
      </g>
    ))}
    {label(name, 200, 140)}
  </svg>
);

/** Atlantis The Royal: stacked, staggered blocks with the Cloud 22 sky pool on the bridge. */
export const AtlantisRoyalSprite = ({ width = 150, height = 150, name = 'Atlantis The Royal' }: { width?: number; height?: number; name?: string }) => {
  const blocks: Array<[number, number, number]> = [[18, 112, 46], [86, 112, 46], [10, 92, 50], [92, 92, 48], [24, 72, 44], [80, 72, 50], [14, 52, 48], [90, 52, 46], [28, 32, 40], [84, 32, 40]];
  return (
    <svg viewBox="0 0 150 150" width={width} height={height} className="drop-shadow-xl overflow-visible">
      <ellipse cx="75" cy="138" rx="72" ry="10" fill="#fde68a" />
      {blocks.map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height="20" fill={i % 2 ? '#e2e8f0' : '#f1f5f9'} stroke="#94a3b8" strokeWidth="0.6" />
          <rect x={x + 3} y={y + 6} width={w - 6} height="3" fill="#38bdf8" opacity="0.7" />
          <polygon points={`${x + w},${y} ${x + w + 6},${y - 4} ${x + w + 6},${y + 16} ${x + w},${y + 20}`} fill="#cbd5e1" />
        </g>
      ))}
      {/* sky bridge with the infinity pool */}
      <rect x="50" y="22" width="52" height="10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.6" />
      <rect x="53" y="19" width="46" height="4" fill="#22d3ee" />
      {label(name, 150, 132)}
    </svg>
  );
};

const ROOF: Record<string, string> = { palace: '#b08d57', ottoman: '#7c2d12', thai: '#92400e', moorish: '#0f766e', modern: '#1e3a8a', eco: '#4d7c0f', polynesian: '#a16207' };

/** A beach resort on the crescent, styled by theme so each hotel looks different. */
export const PalmResortSprite = ({ width = 150, height = 104, name = 'Resort', theme = 'modern', roof }: { width?: number; height?: number; name?: string; theme?: string; roof?: string }) => {
  const r = roof ?? ROOF[theme] ?? '#1e3a8a';
  const wall = theme === 'modern' ? '#e0f2fe' : theme === 'eco' ? '#e7e5e4' : theme === 'polynesian' ? '#fef3c7' : '#fff7ed';
  const side = theme === 'modern' ? '#bae6fd' : '#fde7c8';
  return (
    <svg viewBox="0 0 150 104" width={width} height={height} className="drop-shadow-lg overflow-visible">
      {/* beach, lawn and the pool */}
      <polygon points="-8,100 158,100 140,66 10,66" fill="#fde68a" />
      <polygon points="-8,100 158,100 156,104 -10,104" fill="#67e8f9" opacity="0.7" />
      {[14, 30, 120, 136].map((x) => (<g key={x}><rect x={x - 4} y="93" width="8" height="2.4" rx="1" fill="#fff" /><ellipse cx={x} cy="90" rx="5.5" ry="2.2" fill="#f43f5e" opacity="0.9" /></g>))}
      <polygon points="18,82 132,82 126,72 24,72" fill="#86c96b" />
      <ellipse cx="44" cy="88" rx="18" ry="4.5" fill="#22d3ee" stroke="#fff" strokeWidth="1" />
      {/* main block: front, side, roof */}
      <rect x="34" y="34" width="72" height="40" fill={wall} stroke="#e7e5e4" strokeWidth="0.6" />
      <polygon points="106,34 120,26 120,66 106,74" fill={side} />
      {theme === 'modern' && <rect x="38" y="38" width="64" height="32" fill="#7dd3fc" opacity="0.55" />}
      {Array.from({ length: 4 }, (_, i) => <rect key={i} x="38" y={40 + i * 8} width="64" height="2" fill={theme === 'modern' ? '#fff' : '#d6d3d1'} opacity="0.8" />)}
      {theme === 'palace' && (<>
        <polygon points="34,34 48,22 92,22 106,34" fill={r} />
        <ellipse cx="70" cy="20" rx="12" ry="9" fill={r} />
        <rect x="68" y="6" width="4" height="7" fill="#facc15" />
      </>)}
      {theme === 'ottoman' && (<>
        <polygon points="34,34 106,34 120,26 48,26" fill={r} />
        <path d="M56,30 Q70,6 84,30 Z" fill={r} />
        <rect x="36" y="10" width="4" height="24" fill="#f5f5f4" /><path d="M35,10 L38,3 L41,10 Z" fill={r} />
        <rect x="100" y="10" width="4" height="24" fill="#f5f5f4" /><path d="M99,10 L102,3 L105,10 Z" fill={r} />
      </>)}
      {theme === 'thai' && (<>
        <polygon points="28,36 70,12 112,36" fill={r} />
        <polygon points="44,26 70,4 96,26" fill={r} opacity="0.85" />
        <path d="M28,36 L22,30 M112,36 L118,30" stroke={r} strokeWidth="2.5" />
      </>)}
      {theme === 'moorish' && (<>
        <polygon points="34,34 106,34 120,26 48,26" fill="#c2410c" />
        {[44, 58, 72, 86].map((x) => <path key={x} d={`M${x},74 L${x},58 Q${x + 6},50 ${x + 12},58 L${x + 12},74 Z`} fill="#fde7c8" stroke={r} strokeWidth="1" />)}
        <rect x="64" y="14" width="12" height="20" fill={wall} stroke={r} strokeWidth="1" /><polygon points="62,14 70,6 78,14" fill={r} />
      </>)}
      {theme === 'modern' && <polygon points="34,34 106,34 120,26 48,26" fill={r} />}
      {theme === 'eco' && (<>
        <polygon points="34,34 106,34 120,26 48,26" fill={r} />
        {[40, 56, 72, 88].map((x) => <circle key={x} cx={x} cy="30" r="5" fill="#65a30d" />)}
      </>)}
      {theme === 'polynesian' && (<>
        <polygon points="26,36 70,10 114,36" fill="#ca8a04" />
        <path d="M30,34 L70,12 L110,34" stroke="#a16207" strokeWidth="1" fill="none" strokeDasharray="3 3" />
      </>)}
      {/* palms on the beach */}
      {[[16, 78], [134, 78]].map(([x, y]) => (
        <g key={x}><rect x={x - 1} y={y - 14} width="2" height="14" fill="#92400e" /><circle cx={x} cy={y - 15} r="6" fill="#16a34a" /></g>
      ))}
      {label(name, 150, 92)}
    </svg>
  );
};

/** The Palm Tower: St. Regis below, The View at The Palm on level 52 and the Aura sky pool. */
export const PalmTowerSprite = ({ width = 70, height = 230, name = 'The Palm Tower' }: { width?: number; height?: number; name?: string }) => (
  <svg viewBox="0 0 70 230" width={width} height={height} className="drop-shadow-xl overflow-visible">
    <polygon points="14,214 50,214 50,22 14,30" fill="#e7e5e4" />
    <polygon points="50,214 60,208 60,26 50,22" fill="#a8a29e" />
    <polygon points="14,30 50,22 60,26 24,34" fill="#d6d3d1" />
    {Array.from({ length: 30 }, (_, i) => <rect key={i} x="17" y={36 + i * 6} width="30" height="2.2" fill="#38bdf8" opacity="0.55" />)}
    {/* The View, level 52 */}
    <rect x="12" y="20" width="40" height="10" rx="2" fill="#0ea5e9" />
    <rect x="15" y="16" width="34" height="4" fill="#22d3ee" />
    <polygon points="6,214 64,214 60,222 10,222" fill="#fde68a" />
    {label(name, 70, 214)}
  </svg>
);

/** The Pointe: a waterfront promenade of restaurants facing Atlantis, with its fountain. */
export const PointeSprite = ({ width = 150, height = 80, name = 'The Pointe' }: { width?: number; height?: number; name?: string }) => (
  <svg viewBox="0 0 150 80" width={width} height={height} className="drop-shadow-lg overflow-visible">
    <path d="M0,70 Q75,-6 150,70 Z" fill="#fde68a" />
    <path d="M10,66 Q75,6 140,66 Z" fill="#fef3c7" stroke="#fde68a" strokeWidth="2" />
    <path d="M30,62 Q75,22 120,62" stroke="#94a3b8" strokeWidth="2" fill="none" />
    {[34, 50, 66, 82, 98].map((x, i) => (
      <g key={x}><rect x={x} y={44 - (i === 2 ? 6 : Math.abs(2 - i) * -2)} width="13" height="12" fill="#fff7ed" stroke="#d6d3d1" strokeWidth="0.6" /><rect x={x} y={42 - (i === 2 ? 6 : Math.abs(2 - i) * -2)} width="13" height="3" fill="#0f766e" /></g>
    ))}
    <ellipse cx="75" cy="64" rx="24" ry="5" fill="#38bdf8" />
    <path d="M65,62 L63,50 M75,62 L75,46 M85,62 L87,50" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" />
    {label(name, 150, 66)}
  </svg>
);

/** Al Ittihad Park: the linear park down the middle of the trunk. */
export const PalmParkSprite = ({ width = 110, height = 80, name = 'Al Ittihad Park' }: { width?: number; height?: number; name?: string }) => (
  <svg viewBox="0 0 110 80" width={width} height={height} className="drop-shadow-md overflow-visible">
    <polygon points="12,66 98,66 88,22 22,22" fill="#86c96b" stroke="#fff" strokeWidth="1.5" />
    <path d="M55,66 L55,22" stroke="#fde68a" strokeWidth="4" />
    {[[30, 34], [80, 34], [28, 52], [82, 52], [40, 26], [70, 26]].map(([x, y]) => (
      <g key={`${x}-${y}`}><rect x={x - 1} y={y - 10} width="2" height="10" fill="#92400e" /><circle cx={x} cy={y - 11} r="5" fill="#15803d" /></g>
    ))}
    {label(name, 110, 66)}
  </svg>
);

/** Palm West Beach: a long strip of sand down the trunk's west shore, with loungers and its beach clubs. */
export const PalmBeachSprite = ({ width = 150, height = 320, name = 'Palm West Beach' }: { width?: number; height?: number; name?: string }) => (
  <svg viewBox="0 0 96 250" width={width} height={height} preserveAspectRatio="none" className="drop-shadow-md overflow-visible">
    {/* shallow water, wet sand, dry sand */}
    <path d="M6,236 C2,170 10,90 30,10 L44,10 C30,90 24,170 26,236 Z" fill="#67e8f9" opacity="0.7" />
    <path d="M22,236 C20,170 28,90 42,10 L60,10 C50,90 46,170 48,236 Z" fill="#fde68a" />
    <path d="M44,236 C44,170 50,90 58,10 L90,10 C82,90 80,170 88,236 Z" fill="#fef3c7" stroke="#fff" strokeWidth="1.5" />
    {/* umbrellas and loungers all the way along */}
    {Array.from({ length: 11 }, (_, i) => {
      const y = 26 + i * 19;
      const x = 52 + (i % 2) * 8 - i * 0.6;
      return (
        <g key={i}>
          <rect x={x - 5} y={y + 4} width="10" height="3" rx="1" fill="#fff" stroke="#cbd5e1" strokeWidth="0.4" />
          <rect x={x - 0.5} y={y - 4} width="1" height="8" fill="#78716c" />
          <ellipse cx={x} cy={y - 4} rx="7" ry="3" fill={['#f43f5e', '#0ea5e9', '#f59e0b', '#10b981'][i % 4]} />
        </g>
      );
    })}
    {/* beach club pavilions */}
    {[[74, 60, 'Koko Bay', '#a16207'], [76, 150, 'February 30', '#0f766e']].map(([x, y, n, c]) => (
      <g key={n as string}>
        <rect x={(x as number) - 13} y={(y as number) - 6} width="26" height="14" fill="#fff7ed" stroke="#d6d3d1" strokeWidth="0.6" />
        <polygon points={`${(x as number) - 16},${(y as number) - 6} ${x},${(y as number) - 16} ${(x as number) + 16},${(y as number) - 6}`} fill={c as string} />
        <text x={x as number} y={(y as number) + 18} fontSize="6.5" fontWeight="800" fill="#0f172a" textAnchor="middle">{n as string}</text>
      </g>
    ))}
    {/* palms behind the beach */}
    {[30, 90, 130, 200].map((y) => (
      <g key={y}><rect x="84" y={y - 8} width="1.6" height="9" fill="#92400e" /><circle cx="84.8" cy={y - 9} r="4" fill="#16a34a" /></g>
    ))}
    {label(name, 96, 236)}
  </svg>
);

/** FIVE Palm Jumeirah: bold glass-and-black block, purple neon, rooftop club and a big pool on the beach. */
export const FivePalmSprite = ({ width = 210, height = 180, name = 'FIVE Palm Jumeirah' }: { width?: number; height?: number; name?: string }) => (
  <svg viewBox="0 0 210 180" width={width} height={height} className="drop-shadow-xl overflow-visible">
    {/* beach and the big pool */}
    <polygon points="0,170 210,170 192,128 18,128" fill="#fde68a" />
    <polygon points="0,170 210,170 208,176 -2,176" fill="#67e8f9" opacity="0.7" />
    <ellipse cx="105" cy="146" rx="62" ry="11" fill="#22d3ee" stroke="#fff" strokeWidth="2" />
    {[24, 40, 170, 186].map((x) => (<g key={x}><rect x={x - 5} y="158" width="10" height="3" rx="1" fill="#fff" /><ellipse cx={x} cy="154" rx="7" ry="3" fill="#a855f7" /></g>))}
    {/* main block: front, side, roof */}
    <rect x="40" y="38" width="118" height="92" fill="#18181b" />
    <polygon points="158,38 178,26 178,118 158,130" fill="#27272a" />
    <polygon points="40,38 60,26 178,26 158,38" fill="#3f3f46" />
    {/* glass floors with purple light */}
    {Array.from({ length: 9 }, (_, i) => <rect key={i} x="45" y={44 + i * 9.5} width="108" height="5" fill={i % 3 === 0 ? '#c084fc' : '#7dd3fc'} opacity={i % 3 === 0 ? 0.85 : 0.45} />)}
    {Array.from({ length: 9 }, (_, i) => <polygon key={i} points={`160,${44 + i * 9.5} 176,${35 + i * 9.5} 176,${39 + i * 9.5} 160,${48 + i * 9.5}`} fill="#a855f7" opacity="0.5" />)}
    {/* the neon FIVE sign */}
    <rect x="70" y="12" width="58" height="18" rx="4" fill="#0f0f12" stroke="#d946ef" strokeWidth="2" />
    <text x="99" y="26" fontSize="14" fontWeight="900" fill="#f5d0fe" textAnchor="middle" letterSpacing="3">FIVE</text>
    {/* The Penthouse on the roof */}
    <rect x="62" y="30" width="74" height="8" fill="#a855f7" opacity="0.9" />
    {/* palms */}
    {[[12, 140], [198, 140], [30, 126], [180, 126]].map(([x, y]) => (
      <g key={`${x}-${y}`}><rect x={x - 1.2} y={y - 18} width="2.4" height="18" fill="#92400e" /><circle cx={x} cy={y - 20} r="8" fill="#16a34a" /></g>
    ))}
    {label(name, 210, 164)}
  </svg>
);
