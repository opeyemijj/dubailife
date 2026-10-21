import React from 'react';

export interface AmenityProps {
  width?: number;
  height?: number;
  name?: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

// ----------------------------------------------------------------------------
// 1. DIFC GRAND MOSQUE (Gate Avenue's Modern Architectural Masterpiece)
// ----------------------------------------------------------------------------
export const DIFCMosque: React.FC<AmenityProps> = ({
  width = 140,
  height = 110,
  name = "DIFC Grand Mosque",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 160 130" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="difc-mosque-stone" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="40%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="difc-mashrabiya" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="50%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="difc-pool" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>

    {/* Plinth with Reflecting Pool */}
    <polygon points="10,122 148,124 156,108 18,106" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
    <polygon points="14,121 144,123 150,110 20,108" fill="#f8fafc" />
    <polygon points="22,119 58,119.5 62,111 26,110.5" fill="url(#difc-pool)" opacity="0.85" />

    {/* Modern Cuboid Prayer Hall */}
    <g transform="translate(-4.5 0)">
      {/* Shaded Depth Wall */}
      <polygon points="130,111 146,109.5 146,45 130,46.5" fill="#64748b" />
      {/* Front Facade */}
      <polygon points="52,109.5 130,111 130,46.5 52,45.5" fill="url(#difc-mosque-stone)" stroke="#cbd5e1" strokeWidth="0.8" />

      {/* Intricate Islamic Mashrabiya Geometric Screen */}
      <rect x="60" y="52" width="60" height="48" fill="#0f172a" rx="2" />
      {Array.from({ length: 4 }).map((_, r) => (
        <g key={`mash-${r}`}>
          {Array.from({ length: 5 }).map((_, c) => (
            <polygon 
              key={`m-${r}-${c}`}
              points={`${66 + c * 11},${58 + r * 11} ${71 + c * 11},${54 + r * 11} ${76 + c * 11},${58 + r * 11} ${71 + c * 11},${62 + r * 11}`}
              fill="url(#difc-mashrabiya)"
            />
          ))}
        </g>
      ))}

      {/* Modern Minimalist Slender Minaret */}
      <polygon points="42,108.5 50,107 50,13.5 42,14.5" fill="#475569" />
      <polygon points="34,108 42,108.5 42,14.5 34,14" fill="url(#difc-mosque-stone)" stroke="#cbd5e1" strokeWidth="0.5" />
      <line x1="38" y1="14" x2="38" y2="4" stroke="#f59e0b" strokeWidth="1.2" />
      <circle cx="38" cy="3" r="1.5" fill="#f59e0b" />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 2. ZA'ABEEL GRAND MOSQUE (Royal Emirati Grand Islamic Architecture)
// ----------------------------------------------------------------------------
export const ZabeelMosque: React.FC<AmenityProps> = ({
  width = 150,
  height = 120,
  name = "Za'abeel Grand Mosque",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 170 140" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="zabeel-dome-gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ca8a04" />
        <stop offset="35%" stopColor="#fef08a" />
        <stop offset="70%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
      <linearGradient id="zabeel-marble" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>

    {/* Base Courtyard */}
    <polygon points="10,132 158,134 166,118 18,116" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
    <polygon points="14,131 154,133 160,119 20,118" fill="#f8fafc" />

    {/* Main Sanctuary Hall */}
    <g transform="translate(-3.5 0)">
      <polygon points="124,119.5 140,118 140,62 124,63.5" fill="#64748b" />
      <polygon points="56,118.5 124,119.5 124,63.5 56,62.5" fill="url(#zabeel-marble)" stroke="#cbd5e1" strokeWidth="0.8" />

      {/* Islamic Arches on Facade */}
      {[64, 80, 96, 110].map(x => (
        <g key={`arch-${x}`}>
          <rect x={x} y="82" width="10" height="28" fill="#0f172a" rx="1" />
          <path d={`M ${x} 82 Q ${x + 5} 72 ${x + 10} 82 Z`} fill="url(#zabeel-dome-gold)" />
        </g>
      ))}

      {/* Iconic Grand Golden Central Dome */}
      <path d="M 68 62.5 Q 90 28 112 63.5 Z" fill="url(#zabeel-dome-gold)" stroke="#fef08a" strokeWidth="0.8" />
      <line x1="90" y1="28" x2="90" y2="16" stroke="#fef08a" strokeWidth="1.2" />
      <circle cx="90" cy="15" r="2" fill="#ca8a04" />

      {/* Left Minaret */}
      <polygon points="42,117.5 50,116 50,17 42,18.5" fill="#475569" />
      <polygon points="34,117 42,117.5 42,18.5 34,18" fill="url(#zabeel-marble)" stroke="#cbd5e1" strokeWidth="0.5" />
      <path d="M 32 18 Q 38 8 44 18.5 Z" fill="url(#zabeel-dome-gold)" />
      <line x1="38" y1="8" x2="38" y2="2" stroke="#fef08a" strokeWidth="1" />

      {/* Right Minaret */}
      <polygon points="148,120.5 156,119 156,18 148,19.5" fill="#475569" />
      <polygon points="140,120 148,120.5 148,19.5 140,19" fill="url(#zabeel-marble)" stroke="#cbd5e1" strokeWidth="0.5" />
      <path d="M 138 19 Q 144 9 150 19.5 Z" fill="url(#zabeel-dome-gold)" />
      <line x1="144" y1="9" x2="144" y2="3" stroke="#fef08a" strokeWidth="1" />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 3. ONE ZA'ABEEL & THE LINK (World's Longest Cantilever Resort)
// ----------------------------------------------------------------------------
export const OneZaabeel: React.FC<AmenityProps> = ({
  width = 160,
  height = 180,
  name = "One Za'abeel & The Link",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 180 200" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="oz-glass" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="35%" stopColor="#38bdf8" />
        <stop offset="70%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="oz-cantilever" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="40%" stopColor="#7dd3fc" />
        <stop offset="70%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>

    {/* Podium Base */}
    <polygon points="14,192 164,194 172,178 22,176" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
    <polygon points="18,191 160,193 166,179 24,178" fill="#f8fafc" />

    {/* Tower 1 (Left Tower, 305m) */}
    <g>
      <polygon points="76,179 88,177.5 88,21.5 76,23" fill="#0f172a" />
      <polygon points="44,178.5 76,179 76,23 44,22.5" fill="url(#oz-glass)" stroke="#7dd3fc" strokeWidth="0.6" />
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={`oz1-fl-${i}`} x1="44" y1={35 + i * 10} x2="76" y2={35.5 + i * 10} stroke="#ffffff" strokeWidth="0.5" opacity="0.6" />
      ))}
    </g>

    {/* Tower 2 (Right Tower, 235m) */}
    <g>
      <polygon points="152,181 164,179.5 164,51.5 152,53" fill="#0f172a" />
      <polygon points="124,180.5 152,181 152,53 124,52.5" fill="url(#oz-glass)" stroke="#7dd3fc" strokeWidth="0.6" />
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={`oz2-fl-${i}`} x1="124" y1={65 + i * 10} x2="152" y2={65.5 + i * 10} stroke="#ffffff" strokeWidth="0.5" opacity="0.6" />
      ))}
    </g>

    {/* THE LINK: Suspended 100m High Cantilever Skybridge */}
    <g>
      {/* 3D Cantilever Bridge spanning across towers with cantilever extension to the right */}
      <polygon points="20,105 174,106.5 174,86.5 20,85" fill="url(#oz-cantilever)" stroke="#bae6fd" strokeWidth="0.8" />
      {/* Top Deck Infinity Pool & Promenade */}
      <polygon points="20,85 174,86.5 178,81.5 24,80" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.5" />
      <rect x="76" y="82" width="36" height="3" fill="#facc15" />
      {/* Diagonal Structural Steel Bracing inside Glass Bridge */}
      {[30, 50, 70, 90, 110, 130, 150].map((bx, i) => (
        <line key={`link-br-${i}`} x1={bx} y1="105" x2={bx + 14} y2="86" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
      ))}
      <text x="96" y="98" fill="#ffffff" fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="1">THE LINK</text>
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 4. THE RITZ-CARLTON DIFC (Luxury Limestone Portico Hotel)
// ----------------------------------------------------------------------------
export const RitzCarltonDIFC: React.FC<AmenityProps> = ({
  width = 135,
  height = 120,
  name = "The Ritz-Carlton DIFC",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 150 135" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="rc-limestone" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#fdfbf7" />
        <stop offset="50%" stopColor="#f5f0e6" />
        <stop offset="100%" stopColor="#e8dfce" />
      </linearGradient>
    </defs>
    <polygon points="12,126 138,128 144,114 18,112" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
    <polygon points="16,125 134,127 138,115 20,114" fill="#f8fafc" />

    {/* Limestone Main Building */}
    <g transform="translate(-7.4 0)">
      <polygon points="120,115.5 134,114 134,32 120,33.5" fill="#57493a" />
      <polygon points="42,114.5 120,115.5 120,33.5 42,32.5" fill="url(#rc-limestone)" stroke="#d4c5b1" strokeWidth="0.8" />
      {/* Classical French Windows with Juliet Balconies */}
      {Array.from({ length: 6 }).map((_, r) => (
        <g key={`rc-row-${r}`}>
          {[50, 68, 86, 104].map(c => (
            <g key={`rc-w-${r}-${c}`}>
              <rect x={c} y={42 + r * 11} width="8" height="7.5" fill="#1e293b" rx="0.5" />
              <line x1={c - 1} y1={49.5 + r * 11} x2={c + 9} y2={49.5 + r * 11} stroke="#d4af37" strokeWidth="0.8" />
            </g>
          ))}
        </g>
      ))}
      {/* Grand Entrance Canopy */}
      <polygon points="68,115 94,115.3 92,104 70,103.7" fill="#1e293b" stroke="#d4af37" strokeWidth="0.8" />
      <text x="81" y="111" fill="#fde68a" fontSize="5" fontWeight="bold" textAnchor="middle">RITZ-CARLTON</text>
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 5. ZUMA DIFC (World-Famous Japanese Contemporary Izakaya)
// ----------------------------------------------------------------------------
export const ZumaDIFC: React.FC<AmenityProps> = ({
  width = 120,
  height = 95,
  name = "Zuma Dubai DIFC",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 130 110" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <polygon points="8,102 120,103.5 126,91 14,89.5" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
    <polygon points="12,101 116,102.5 120,92 16,91" fill="#1c1917" />
    <g transform="translate(-6.8 0)">
    {/* Dark Timber & Steel Architecture */}
    <polygon points="106,92.5 118,91 118,36 106,37.5" fill="#0c0a09" />
    <polygon points="34,91.5 106,92.5 106,37.5 34,36.5" fill="#292524" stroke="#44403c" strokeWidth="0.8" />
    {/* Timber Louvers */}
    {Array.from({ length: 8 }).map((_, i) => (
      <line key={`z-lv-${i}`} x1="38" y1={44 + i * 5.5} x2="102" y2={44.5 + i * 5.5} stroke="#d97706" strokeWidth="1.2" opacity="0.85" />
    ))}
    {/* Ambient Glowing Entrance */}
    <rect x="58" y="74" width="24" height="18" fill="#f59e0b" rx="1" opacity="0.9" />
    <text x="70" y="86" fill="#000000" fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="1">ZUMA</text>
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 6. AMAZÓNICO DIFC (3-Floor Tropical Rainforest Dining & Rooftop)
// ----------------------------------------------------------------------------
export const AmazonicoDIFC: React.FC<AmenityProps> = ({
  width = 125,
  height = 105,
  name = "Amazónico DIFC",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 140 120" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <polygon points="10,112 128,113.5 134,101 16,99.5" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
    <polygon points="14,111 124,112.5 128,102 18,101" fill="#14532d" />
    <g transform="translate(-7.8 0)">
    {/* Lush 3-Storey Terraced Pavilion */}
    <polygon points="114,102.5 126,101 126,36 114,37.5" fill="#052e16" />
    <polygon points="38,101.5 114,102.5 114,37.5 38,36.5" fill="#166534" stroke="#4ade80" strokeWidth="0.8" />
    {/* Golden Curved Canopies & Foliage */}
    <rect x="44" y="44" width="64" height="12" fill="#ca8a04" rx="2" />
    <rect x="44" y="66" width="64" height="12" fill="#ca8a04" rx="2" />
    {/* Lush Green Rooftop Terrace Garden */}
    <ellipse cx="76" cy="36" rx="36" ry="7" fill="#22c55e" />
    <circle cx="56" cy="33" r="5" fill="#15803d" />
    <circle cx="76" cy="31" r="6" fill="#16a34a" />
    <circle cx="94" cy="33" r="5" fill="#15803d" />
    <text x="76" y="94" fill="#fde047" fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="1">AMAZÓNICO</text>
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 7. LPM RESTAURANT & BAR (French Mediterranean Dining Legend)
// ----------------------------------------------------------------------------
export const LPMDIFC: React.FC<AmenityProps> = ({
  width = 115,
  height = 90,
  name = "LPM Restaurant & Bar",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 130 100" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <polygon points="10,92 118,93.5 124,81 16,79.5" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
    <polygon points="14,91 114,92.5 118,82 18,81" fill="#f8fafc" />
    <g transform="translate(-8.8 0)">
    {/* Provencal White & Wood Bistro Facade */}
    <polygon points="106,82.5 118,81 118,32 106,33.5" fill="#78716c" />
    <polygon points="38,81.5 106,82.5 106,33.5 38,32.5" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="0.8" />
    {/* Classic Bistro Striped Awning */}
    <polygon points="36,54 108,55 106,44 34,43" fill="#0284c7" />
    {[42, 54, 66, 78, 90, 102].map(ax => (
      <rect key={`lpm-awn-${ax}`} x={ax} y="44" width="6" height="11" fill="#ffffff" />
    ))}
    <text x="72" y="72" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle" letterSpacing="1">LPM</text>
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 8. TING-IRIE ARCHITECTURE NIGHTCLUB VENUE BASE COMPONENT
// ----------------------------------------------------------------------------
export interface NightclubProps extends AmenityProps {
  marqueeText?: string;
  marqueeColor?: string;
  accentGlow?: string;
  stripes?: [string, string, string];
  ledColors?: string[];
  wallColor?: string;
  hasPalm?: boolean;
  hasUmbrella?: boolean;
}

export const IsometricNightclubVenue: React.FC<NightclubProps & { marqueeText: string }> = ({
  width = 130,
  height = 95,
  name,
  marqueeText,
  marqueeColor = "#facc15",
  accentGlow,
  stripes = ["#16a34a", "#facc15", "#dc2626"],
  ledColors = ["#16a34a", "#facc15", "#dc2626", "#16a34a", "#facc15", "#dc2626"],
  wallColor = "#0c0a09",
  hasPalm = true,
  hasUmbrella = true,
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => {
  const safeId = marqueeText.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const glow = accentGlow || marqueeColor;

  return (
    <svg 
      viewBox="0 0 140 100" 
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px`, ...style }} 
      className={className}
      onClick={onClick}
    >
      <defs>
        <linearGradient id={`nc-facade-${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#292524" />
          <stop offset="100%" stopColor={wallColor} />
        </linearGradient>
      </defs>

      {/* 1. Base Stone Plinth with Illuminated Front Lip */}
      <polygon points="10,90 126,92 134,68 18,66" fill="#1c1917" stroke="#44403c" strokeWidth="0.8" />
      <polygon points="10,90 126,92 126,94 10,92" fill={glow} opacity="0.65" />

      {/* 2. Main Architectural Pavilion Facade */}
      <g transform="translate(-1.3 0)">
        {/* Right Shaded Depth Wall */}
        <polygon points="114,71.5 122,70.4 122,34.4 114,35.5" fill="#0c0a09" />
        {/* Front Facade Wall */}
        <polygon points="30,70.1 114,71.5 114,35.5 30,34.1" fill={`url(#nc-facade-${safeId})`} stroke={glow} strokeWidth="0.8" />

        {/* 3. Signature Brand Tricolor Trim Banners */}
        <polygon points="30,35.5 114,36.9 114,39 30,37.6" fill={stripes[0]} />
        <polygon points="30,37.6 114,39 114,41.1 30,39.7" fill={stripes[1]} />
        <polygon points="30,39.7 114,41.1 114,43.2 30,41.8" fill={stripes[2]} />

        {/* 4. Glowing Neon Marquee Box with Backlit Typography */}
        <rect x="36" y="44" width="72" height="15" fill="#09090b" rx="3" stroke={glow} strokeWidth="1" />
        <text 
          x="72" 
          y="55" 
          fill={glow} 
          fontSize={marqueeText.length > 7 ? "6.8" : "8.5"} 
          fontWeight="900" 
          textAnchor="middle" 
          letterSpacing={marqueeText.length > 7 ? "1.1" : "1.8"} 
          fontFamily="sans-serif"
        >
          {marqueeText}
        </text>

        {/* 5. Sound-System Bass LEDs / Spotlights */}
        <g>
          {ledColors.map((color, idx) => (
            <circle key={`led-${safeId}-${idx}`} cx={44 + idx * 12} cy={63} r={1.5} fill={color} />
          ))}
        </g>

        {/* 6. VIP Outdoor Terrace with Palm & Parasol */}
        <g>
          {hasPalm && (
            <g>
              <line x1="22" y1="84" x2="22" y2="68" stroke="#78350f" strokeWidth="1.8" />
              <circle cx="22" cy="66" r="6" fill="#15803d" />
              <circle cx="22" cy="66" r="3" fill="#22c55e" />
            </g>
          )}

          {hasUmbrella && (
            <g>
              <line x1="120" y1="86" x2="120" y2="74" stroke="#44403c" strokeWidth="1" />
              <path d="M 113 75 Q 120 68 127 75 Z" fill={glow} stroke="#44403c" strokeWidth="0.5" />
            </g>
          )}

          {/* VIP Velvet Rope / Entrance Railing */}
          <line x1="38" y1="88" x2="68" y2="88.5" stroke="#ca8a04" strokeWidth="0.9" />
          <circle cx="38" cy="88" r="1.2" fill="#ca8a04" />
          <circle cx="68" cy="88.5" r="1.2" fill="#ca8a04" />
          <path d="M 38 88 Q 53 91 68 88.5" fill="none" stroke="#dc2626" strokeWidth="0.8" />
        </g>
      </g>
    </svg>
  );
};

// ----------------------------------------------------------------------------
// 9. KIZA DUBAI (Legendary Pan-African Luxury Lounge & Club, DIFC)
// ----------------------------------------------------------------------------
export const KizaClub: React.FC<AmenityProps> = (props) => (
  <IsometricNightclubVenue
    marqueeText="KIZA"
    marqueeColor="#facc15"
    accentGlow="#eab308"
    stripes={["#15803d", "#facc15", "#b91c1c"]}
    ledColors={["#15803d", "#facc15", "#ef4444", "#15803d", "#facc15", "#ef4444"]}
    wallColor="#1c1917"
    name="KIZA Pan-African Lounge & Club"
    {...props}
  />
);

// ----------------------------------------------------------------------------
// 10. BABYLON DIFC (Luxury Dinner-and-Show Cabaret Nightclub)
// ----------------------------------------------------------------------------
export const BabylonDIFC: React.FC<AmenityProps> = (props) => (
  <IsometricNightclubVenue
    marqueeText="BABYLON"
    marqueeColor="#fbbf24"
    accentGlow="#f59e0b"
    stripes={["#f59e0b", "#991b1b", "#18181b"]}
    ledColors={["#f59e0b", "#dc2626", "#f59e0b", "#dc2626", "#f59e0b", "#dc2626"]}
    wallColor="#450a0a"
    name="Babylon DIFC"
    {...props}
  />
);

// ----------------------------------------------------------------------------
// 11. SPHERE AT THE LINK (High-Altitude Suspended Sky Lounge & Club, Za'abeel)
// ----------------------------------------------------------------------------
export const SphereZaabeel: React.FC<AmenityProps> = (props) => (
  <IsometricNightclubVenue
    marqueeText="SPHERE"
    marqueeColor="#38bdf8"
    accentGlow="#06b6d4"
    stripes={["#06b6d4", "#8b5cf6", "#ec4899"]}
    ledColors={["#06b6d4", "#8b5cf6", "#ec4899", "#06b6d4", "#8b5cf6", "#ec4899"]}
    wallColor="#0f172a"
    name="Sphere at The Link"
    {...props}
  />
);
