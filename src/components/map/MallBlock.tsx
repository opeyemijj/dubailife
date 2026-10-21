import React from 'react';

export interface MallBlockProps {
  width?: number;
  height?: number;
  className?: string;
  name?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const MallBlock: React.FC<MallBlockProps> = ({
  width = 280,
  height = 230,
  className = "drop-shadow-2xl cursor-pointer hover:scale-[1.02] transition-transform origin-bottom z-30 select-none",
  name = "Dubai Mall",
  onClick,
  style
}) => {
  const displayName = (name || "Dubai Mall").toUpperCase();

  return (
    <svg 
      viewBox="0 0 340 280" 
      preserveAspectRatio="none"
      style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%', ...style }} 
      className={className}
      onClick={onClick}
    >
      <defs>
        {/* Front Facade Pearl & Titanium Cladding */}
        <linearGradient id="mallFrontFacade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#f8fafc" />
          <stop offset="70%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Shaded Left Facade (Receding along FloorTile depth: dx = +0.2355*dy) */}
        <linearGradient id="mallLeftFacade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Top Roof Surface Gradient (Camera angle from the top) */}
        <linearGradient id="mallTopRoof" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="40%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>

        {/* Crystal Glass Geodesic Dome Gradient */}
        <linearGradient id="mallGlassDome" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#bae6fd" />
          <stop offset="60%" stopColor="#38bdf8" />
          <stop offset="90%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* Teak Boardwalk Promenade Gradient */}
        <linearGradient id="mallTeakDeck" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="30%" stopColor="#b45309" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        {/* Travertine Ground Plaza Gradient */}
        <linearGradient id="mallTravertine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Luxury Architectural Gold Ribbon */}
        <linearGradient id="mallGoldRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ca8a04" />
          <stop offset="35%" stopColor="#fde047" />
          <stop offset="70%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        {/* Lake Water Gradient */}
        <linearGradient id="mallLakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
      </defs>

      {/* ==================================================================== */}
      {/* 1. LOWER SIDE EMBOSS & BASE PLATFORM (FloorTile Matching Isometry)   */}
      {/* ==================================================================== */}
      <polygon points="16,252 276,256.3 276,259.8 16,255.5" fill="#1e293b" />
      <polygon points="16,252 276,256.3 276,258.3 16,254" fill="#334155" />

      {/* Main Ground Plot (FloorTile matching: baseline tilt +0.01667, depth slant +0.2355) */}
      <polygon 
        points="52,98 312,102.3 276,252 16,248" 
        fill="url(#mallTravertine)" 
        stroke="#cbd5e1" 
        strokeWidth="2" 
        strokeLinejoin="round" 
      />

      {/* Plaza Paver Texture Lines */}
      {[125, 160, 195, 230].map((gy, i) => {
        const lx = 52 - (gy - 98) * 0.2355;
        const rx = 312 - (gy - 102.3) * 0.2355;
        return (
          <line 
            key={`pave-grid-${i}`} 
            x1={lx} 
            y1={gy} 
            x2={rx} 
            y2={gy + 4.3} 
            stroke="#cbd5e1" 
            strokeWidth="0.8" 
            strokeDasharray="8 6" 
          />
        );
      })}

      {/* ==================================================================== */}
      {/* 2. BURJ LAKE WATERFRONT PROMENADE (Front Boardwalk)                  */}
      {/* ==================================================================== */}
      <g>
        {/* Lake Water Surface along front */}
        <polygon points="22,226 270,230 264,250 16,246" fill="url(#mallLakeGrad)" stroke="#38bdf8" strokeWidth="1" />
        <line x1="30" y1="234" x2="114" y2="235" stroke="#7dd3fc" strokeWidth="1" opacity="0.6">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
        </line>
        <line x1="144" y1="236" x2="234" y2="237" stroke="#7dd3fc" strokeWidth="1" opacity="0.6">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" begin="1s" repeatCount="indefinite" />
        </line>

        {/* Teak Boardwalk */}
        <polygon points="30,210 278,214 270,226 22,222" fill="url(#mallTeakDeck)" stroke="#78350f" strokeWidth="0.8" />
        <line x1="30" y1="210" x2="278" y2="214" stroke="#fde047" strokeWidth="0.8" opacity="0.5" />

        {/* Stainless Steel Railing */}
        <line x1="22" y1="220" x2="270" y2="224" stroke="#cbd5e1" strokeWidth="1" />
        {[30, 65, 100, 135, 170, 205, 240, 265].map((rx, idx) => {
          const ry = 220 + (rx - 22) * (4 / 248);
          return <line key={`st-${idx}`} x1={rx} y1={ry} x2={rx} y2={ry + 4} stroke="#94a3b8" strokeWidth="1.2" />;
        })}

        {/* Outdoor Cafe Dining Terraces with Striped Parasols */}
        <g transform="translate(72, 206)">
          <ellipse cx="0" cy="3" rx="10" ry="5" fill="#000000" opacity="0.25" />
          <ellipse cx="0" cy="1" rx="5" ry="2.8" fill="#d97706" />
          <ellipse cx="-6" cy="1" rx="2" ry="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
          <ellipse cx="6" cy="1" rx="2" ry="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
          <line x1="0" y1="1" x2="0" y2="-9" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="0" cy="-9" rx="12" ry="6.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <path d="M 0,-15 Q -4,-9 0,-3 L -3,-3 Q -6,-9 -3,-15 Z" fill="#0284c7" />
          <path d="M 0,-15 Q 4,-9 0,-3 L 3,-3 Q 6,-9 3,-15 Z" fill="#0284c7" />
          <circle cx="0" cy="-15" r="1.2" fill="#f59e0b" />
        </g>
        <g transform="translate(126, 207)">
          <ellipse cx="0" cy="3" rx="10" ry="5" fill="#000000" opacity="0.25" />
          <ellipse cx="0" cy="1" rx="5" ry="2.8" fill="#ffffff" />
          <ellipse cx="-6" cy="1" rx="2" ry="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
          <ellipse cx="6" cy="1" rx="2" ry="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
          <line x1="0" y1="1" x2="0" y2="-9" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="0" cy="-9" rx="12" ry="6.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <path d="M 0,-15 Q -4,-9 0,-3 L -3,-3 Q -6,-9 -3,-15 Z" fill="#f59e0b" />
          <path d="M 0,-15 Q 4,-9 0,-3 L 3,-3 Q 6,-9 3,-15 Z" fill="#f59e0b" />
          <circle cx="0" cy="-15" r="1.2" fill="#d97706" />
        </g>
        <g transform="translate(228, 209)">
          <ellipse cx="0" cy="3" rx="10" ry="5" fill="#000000" opacity="0.25" />
          <ellipse cx="0" cy="1" rx="5" ry="2.8" fill="#d97706" />
          <ellipse cx="-6" cy="1" rx="2" ry="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
          <ellipse cx="6" cy="1" rx="2" ry="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
          <line x1="0" y1="1" x2="0" y2="-9" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="0" cy="-9" rx="12" ry="6.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <path d="M 0,-15 Q -4,-9 0,-3 L -3,-3 Q -6,-9 -3,-15 Z" fill="#0284c7" />
          <path d="M 0,-15 Q 4,-9 0,-3 L 3,-3 Q 6,-9 3,-15 Z" fill="#0284c7" />
          <circle cx="0" cy="-15" r="1.2" fill="#f59e0b" />
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 3. VIP VALET CONCOURSE & PARKED SUPERCARS                             */}
      {/* ==================================================================== */}
      <g>
        <polygon points="38,172 286,176 278,200 30,196" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <line x1="42" y1="184" x2="280" y2="188" stroke="#f8fafc" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.75" />

        {/* Supercar 1 (Rolls-Royce Cullinan) */}
        <g transform="translate(68, 184)">
          <ellipse cx="0" cy="4" rx="12" ry="5.5" fill="#000000" opacity="0.4" />
          <polygon points="-10,2 10,2.4 8,-4 -8,-4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <polygon points="-7,-4 6,-3.8 5,-8 -6,-8" fill="#1e293b" />
          <polygon points="-5,-4.5 4,-4.3 3,-7 -4,-7" fill="#38bdf8" opacity="0.8" />
          <circle cx="9" cy="1.5" r="0.8" fill="#38bdf8" />
          <line x1="-10" y1="1.8" x2="-8" y2="1.8" stroke="#ef4444" strokeWidth="1" />
        </g>
        {/* Supercar 2 (Yellow Ferrari) */}
        <g transform="translate(148, 186)">
          <ellipse cx="0" cy="4" rx="11" ry="5" fill="#000000" opacity="0.4" />
          <polygon points="-9,2 9,2.3 7,-3 -7,-3" fill="#facc15" stroke="#ca8a04" strokeWidth="0.6" />
          <polygon points="-5,-3 4,-2.8 3,-6 -4,-6" fill="#0f172a" />
          <circle cx="8" cy="1.5" r="0.8" fill="#ffffff" />
          <line x1="-9" y1="1.8" x2="-7" y2="1.8" stroke="#ef4444" strokeWidth="1" />
        </g>
        {/* Supercar 3 (Red Sports Coupe) */}
        <g transform="translate(228, 188)">
          <ellipse cx="0" cy="4" rx="11" ry="5" fill="#000000" opacity="0.4" />
          <polygon points="-9,2 9,2.3 7,-3 -7,-3" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.6" />
          <polygon points="-5,-3 4,-2.8 3,-6 -4,-6" fill="#0f172a" />
          <circle cx="8" cy="1.5" r="0.8" fill="#ffffff" />
          <line x1="-9" y1="1.8" x2="-7" y2="1.8" stroke="#ef4444" strokeWidth="1" />
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 4. DUBAI MALL ATRIUM COMPLEX (Strictly following FloorTile Isometry)  */}
      {/* (Front visible, right side slightly visible, camera angle from top)   */}
      {/* ==================================================================== */}

      {/* --- LEVEL 1: GROUND & ATRIUM COMPLEX --- */}
      <g>
        {/* Right Side Facade (Recedes along FloorTile depth: dx=+0.2355*dy) */}
        <polygon 
          points="276,171.8 283,141.8 283,95.8 276,125.8" 
          fill="url(#mallLeftFacade)" 
          stroke="#334155" 
          strokeWidth="1" 
        />
        {/* Front Facade (Baseline slope +0.01667) */}
        <polygon 
          points="46,168 276,171.8 276,125.8 46,122" 
          fill="url(#mallFrontFacade)" 
          stroke="#94a3b8" 
          strokeWidth="1.2" 
        />

        {/* Luxury Boutique Showcase Windows on Front Facade */}
        {[
          { x: 58, w: 26, brand: "#fef08a" },
          { x: 94, w: 32, brand: "#38bdf8" },
          { x: 192, w: 34, brand: "#f43f5e" },
          { x: 236, w: 30, brand: "#22c55e" }
        ].map((boutique, i) => (
          <g key={`boutique-${i}`}>
            <polygon 
              points={`${boutique.x},138 ${boutique.x + boutique.w},138.6 ${boutique.x + boutique.w},162 ${boutique.x},161.4`} 
              fill="#0f172a" 
              stroke="#cbd5e1" 
              strokeWidth="0.8" 
            />
            <circle cx={boutique.x + boutique.w / 2} cy={148} r="2.5" fill={boutique.brand} opacity="0.9" />
            <line x1={boutique.x + 4} y1={156} x2={boutique.x + boutique.w - 4} y2={156.2} stroke="#f8fafc" strokeWidth="0.8" />
          </g>
        ))}

        {/* Grand Glass Entrance Portal (Center: X=132 to 186) */}
        <polygon points="132,123.5 186,124.4 186,167.4 132,166.5" fill="#0284c7" opacity="0.85" stroke="#38bdf8" strokeWidth="1.2" />
        <line x1="146" y1="123.7" x2="146" y2="166.7" stroke="#bae6fd" strokeWidth="0.8" />
        <line x1="160" y1="124" x2="160" y2="167" stroke="#bae6fd" strokeWidth="0.8" />
        <line x1="174" y1="124.2" x2="174" y2="167.2" stroke="#bae6fd" strokeWidth="0.8" />
        <line x1="132" y1="145.5" x2="186" y2="146.4" stroke="#bae6fd" strokeWidth="0.8" />

        {/* Sculptural Cantilevered Gold Canopy */}
        <polygon points="126,143.5 192,144.5 186,157.5 120,156.5" fill="url(#mallGoldRibbon)" stroke="#92400e" strokeWidth="1" />
        <polygon points="120,156.5 186,157.5 186,160.5 120,159.5" fill="#78350f" />
        <line x1="124" y1="157.5" x2="182" y2="158.5" stroke="#fef08a" strokeWidth="1.5" />

        {/* Golden Architectural Entrance Sign */}
        <rect x="134" y="127.5" width="50" height="11" fill="#0f172a" stroke="#facc15" strokeWidth="1" rx="2" />
        <text x="159" y="135.5" fill="#fef08a" fontSize="6.5" fontWeight="bold" fontFamily="system-ui, sans-serif" letterSpacing="0.8" textAnchor="middle">
          THE DUBAI MALL
        </text>

        {/* Top Roof Surface (Camera angle from the top, depth along FloorTile vector) */}
        <polygon 
          points="46,122 276,125.8 283,95.8 53,92" 
          fill="url(#mallTopRoof)" 
          stroke="#1e293b" 
          strokeWidth="1.2" 
        />
      </g>

      {/* --- LEVEL 2: UPPER FASHION AVENUE TIER --- */}
      <g>
        {/* Right Side Facade (FloorTile depth slant: dx=+0.2355*dy) */}
        <polygon 
          points="266,117.5 272,91.5 272,49.5 266,75.5" 
          fill="url(#mallLeftFacade)" 
          stroke="#334155" 
          strokeWidth="1" 
        />

        {/* Front Facade */}
        <polygon 
          points="56,114 266,117.5 266,75.5 56,72" 
          fill="url(#mallFrontFacade)" 
          stroke="#94a3b8" 
          strokeWidth="1.2" 
        />
        {/* Horizontal Gold Architectural Ribbon */}
        <polygon points="54,90 268,93.5 268,96.5 54,93" fill="url(#mallGoldRibbon)" />

        {/* Clerestory Windows */}
        {[70, 100, 130, 190, 220, 246].map((wx, i) => (
          <polygon 
            key={`up-win-${i}`} 
            points={`${wx},80 ${wx + 18},80.3 ${wx + 18},87 ${wx},86.7`} 
            fill="#0f172a" 
            stroke="#38bdf8" 
            strokeWidth="0.6" 
          />
        ))}

        {/* Top Roof Surface (Camera angle from top!) */}
        <polygon 
          points="56,72 266,75.5 272,49.5 62,46" 
          fill="url(#mallTopRoof)" 
          stroke="#1e293b" 
          strokeWidth="1" 
        />
      </g>

      {/* --- LEVEL 3: ROOFTOP SKYLIGHTS & GEODESIC GLASS DOMES (Viewed from top) --- */}
      <g>
        {/* DOME 1 (Fashion Avenue Dome, Center-Left) */}
        <g transform="translate(112, 60)">
          <ellipse cx="0" cy="5" rx="28" ry="13" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          <path 
            d="M -26,4 Q -26,-20 0,-20 Q 26,-20 26,4 Z" 
            fill="url(#mallGlassDome)" 
            stroke="#ffffff" 
            strokeWidth="1.2" 
          />
          <path d="M 0,-20 L -15,4" stroke="#ffffff" strokeWidth="0.8" opacity="0.85" />
          <path d="M 0,-20 L 0,5" stroke="#ffffff" strokeWidth="1" opacity="0.9" />
          <path d="M 0,-20 L 15,4" stroke="#ffffff" strokeWidth="0.8" opacity="0.85" />
          <path d="M -22,-3 Q 0,-11 22,-3" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
          <path d="M -15,-11 Q 0,-16 15,-11" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
          <circle cx="-6" cy="-11" r="2.5" fill="#ffffff" opacity="0.95" />
        </g>

        {/* DOME 2 (Grand Atrium Dome, Center-Right) */}
        <g transform="translate(208, 62)">
          <ellipse cx="0" cy="5" rx="28" ry="13" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          <path 
            d="M -26,4 Q -26,-20 0,-20 Q 26,-20 26,4 Z" 
            fill="url(#mallGlassDome)" 
            stroke="#ffffff" 
            strokeWidth="1.2" 
          />
          <path d="M 0,-20 L -15,4" stroke="#ffffff" strokeWidth="0.8" opacity="0.85" />
          <path d="M 0,-20 L 0,5" stroke="#ffffff" strokeWidth="1" opacity="0.9" />
          <path d="M 0,-20 L 15,4" stroke="#ffffff" strokeWidth="0.8" opacity="0.85" />
          <path d="M -22,-3 Q 0,-11 22,-3" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
          <path d="M -15,-11 Q 0,-16 15,-11" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
          <circle cx="-6" cy="-11" r="2.5" fill="#ffffff" opacity="0.95" />
        </g>

        {/* Barrel-Vaulted Glass Gallery connecting the domes */}
        <polygon points="138,58 182,58.7 184,65.7 140,65" fill="url(#mallGlassDome)" stroke="#ffffff" strokeWidth="0.8" />
        <line x1="148" y1="58.2" x2="150" y2="65.2" stroke="#ffffff" strokeWidth="0.8" />
        <line x1="160" y1="58.4" x2="162" y2="65.4" stroke="#ffffff" strokeWidth="0.8" />
        <line x1="172" y1="58.6" x2="174" y2="65.6" stroke="#ffffff" strokeWidth="0.8" />

        {/* Rooftop Date Palms / Sky Garden */}
        {[
          { x: 50, y: 70 },
          { x: 262, y: 74 }
        ].map((palm, idx) => (
          <g key={`sky-palm-${idx}`} transform={`translate(${palm.x}, ${palm.y})`}>
            <ellipse cx="0" cy="2" rx="4" ry="2" fill="#000000" opacity="0.3" />
            <path d="M 0,2 Q 1,-5 0,-12" stroke="#78350f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M 0,-12 Q -6,-16 -10,-12" stroke="#15803d" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M 0,-12 Q 6,-16 10,-12" stroke="#15803d" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M 0,-12 Q -4,-8 -8,-4" stroke="#22c55e" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M 0,-12 Q 4,-8 8,-4" stroke="#22c55e" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* ==================================================================== */}
      {/* 5. ARCHITECTURAL GOLD EMBOSSED BADGE                                 */}
      {/* ==================================================================== */}
      <g transform="translate(18, 248)">
        <polygon points="0,0 160,2.6 158,18 0,15.4" fill="#0f172a" opacity="0.9" stroke="#eab308" strokeWidth="1.2" />
        <circle cx="12" cy="8.5" r="3.5" fill="#eab308" />
        <text x="22" y="12" fill="#fef08a" fontSize="8" fontWeight="900" letterSpacing="1.2">
          🛍️ {displayName}
        </text>
      </g>
    </svg>
  );
};

export default MallBlock;
