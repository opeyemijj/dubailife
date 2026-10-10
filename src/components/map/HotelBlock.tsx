import React from 'react';

export interface HotelBlockProps {
  width?: number;
  height?: number;
  className?: string;
  name?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const HotelBlock: React.FC<HotelBlockProps> = ({
  width = 280,
  height = 220,
  className = "drop-shadow-md cursor-pointer hover:scale-105 transition-transform origin-bottom z-30",
  name = "Luxury Resort & Hotel",
  onClick,
  style
}) => {
  const displayName = (name || "Luxury Resort & Hotel").toUpperCase();

  return (
    <svg 
      viewBox="0 0 300 230" 
      style={{ width: `${width}px`, height: `${height}px`, ...style }} 
      className={className}
      onClick={onClick}
    >
      <defs>
        {/* Lawn & Pool Gradients */}
        <linearGradient id="hotel-grass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>

        <linearGradient id="hotel-pool-water" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="40%" stopColor="#22d3ee" />
          <stop offset="80%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        <linearGradient id="hotel-glass-light" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="50%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>

        <linearGradient id="hotel-glass-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>

      {/* ==================================================================== */}
      {/* 1. WIDE GROUND BASE PLANE (Same oblique direction as the Mall plane) */}
      {/* Sits directly on the ground, thin plain profile, no floating shadow  */}
      {/* ==================================================================== */}

      {/* Subtle thin front bevel rim on lower side only (2.5px) */}
      <polygon points="14,212 254,216 254,218.5 14,214.5" fill="#4ade80" />

      {/* Main Ground Plane Surface (Plain green lawn with crisp white border, 0.235 slant matching FloorTile) */}
      <polygon 
        points="47,72 287,76 254,216 14,212" 
        fill="#84cc6d" 
        stroke="#ffffff" 
        strokeWidth="2.5" 
        strokeLinejoin="round" 
      />

      {/* Travertine Entrance Plaza / Promenade Walkway */}
      <polygon 
        points="105,126 183,127 165,190 95,190" 
        fill="#f8fafc" 
        stroke="#e2e8f0" 
        strokeWidth="1" 
        strokeLinejoin="round" 
      />

      {/* ==================================================================== */}
      {/* 2. TALL & SLENDER HOTEL TOWERS (Standing tall at back, thinner profile)*/}
      {/* Drawn in matching oblique 3D perspective (front + right receding wall)*/}
      {/* ==================================================================== */}

      {/* --- TOWER 1: WEST WING (Height ~72px, slender 26px width) --- */}
      <g>
        {/* Right 3D Receding Wall */}
        <polygon points="122,54 126,48 126,120 122,126" fill="#334155" />
        {/* Front Facade */}
        <rect x="96" y="54" width="26" height="72" fill="#475569" stroke="#334155" strokeWidth="0.5" />
        {/* Roof Deck */}
        <polygon points="96,54 100,48 126,48 122,54" fill="#64748b" stroke="#475569" strokeWidth="0.6" />
        
        {/* Rooftop Garden Box */}
        <rect x="100" y="50" width="18" height="3" fill="#15803d" rx="1" />
        <circle cx="105" cy="49" r="2" fill="#22c55e" />
        <circle cx="113" cy="49" r="2" fill="#16a34a" />

        {/* Suite Window Bands */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect 
            key={`w-west-${i}`} 
            x="99" 
            y={60 + i * 11} 
            width="20" 
            height="5" 
            fill="#38bdf8" 
            rx="1" 
            opacity="0.9" 
          />
        ))}
      </g>

      {/* --- TOWER 3: EAST SUITES WING (Height ~84px, slender 24px width) --- */}
      <g>
        {/* Right 3D Receding Wall */}
        <polygon points="196,42 201,36 201,118 196,126" fill="#1e293b" />
        {/* Front Facade */}
        <rect x="172" y="42" width="24" height="84" fill="#475569" stroke="#334155" strokeWidth="0.5" />
        {/* Roof Deck */}
        <polygon points="172,42 177,36 201,36 196,42" fill="#64748b" stroke="#475569" strokeWidth="0.6" />
        
        {/* Architectural Spire on East Tower */}
        <line x1="185" y1="36" x2="185" y2="16" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="185" cy="16" r="2.2" fill="#facc15" />

        {/* East Suite Windows */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect 
            key={`w-east-${i}`} 
            x="175" 
            y={48 + i * 11} 
            width="18" 
            height="5" 
            fill="#67e8f9" 
            rx="1" 
            opacity="0.9" 
          />
        ))}
      </g>

      {/* --- TOWER 2: GRAND CENTRAL TOWER (Tallest ~106px, slender 32px width) --- */}
      <g>
        {/* Right 3D Receding Wall */}
        <polygon points="162,20 167,14 167,118 162,126" fill="#0f172a" />
        {/* Front Facade */}
        <rect x="130" y="20" width="32" height="106" fill="#1e293b" stroke="#0f172a" strokeWidth="0.5" />
        {/* Roof Deck */}
        <polygon points="130,20 135,14 167,14 162,20" fill="#334155" stroke="#475569" strokeWidth="0.6" />

        {/* Rooftop Helipad with "H" */}
        <g transform="translate(148, 17)">
          <ellipse cx="0" cy="0" rx="14" ry="3.5" fill="#0f172a" stroke="#ffffff" strokeWidth="0.8" />
          <ellipse cx="0" cy="0" rx="11" ry="2.8" fill="#1e293b" stroke="#facc15" strokeWidth="0.8" strokeDasharray="3 1.5" />
          <text x="0" y="2" fill="#ffffff" fontSize="5.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">H</text>
        </g>

        {/* Panoramic Glass Balconies */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <g key={`cw-central-${i}`}>
            <rect 
              x="133" 
              y={28 + i * 12} 
              width="26" 
              height="6.5" 
              fill="url(#hotel-glass-light)" 
              rx="1" 
              opacity="0.95" 
            />
            {/* Center Mullion Divider */}
            <line 
              x1="146" 
              y1={28 + i * 12} 
              x2="146" 
              y2={34.5 + i * 12} 
              stroke="#ffffff" 
              strokeWidth="0.8" 
            />
          </g>
        ))}

        {/* Grand Portico Entrance Canopy at Base */}
        <g>
          <polygon points="126,126 166,126 170,122 130,122" fill="#0284c7" opacity="0.9" stroke="#38bdf8" strokeWidth="0.8" />
          <polygon points="126,126 166,126 166,128 126,128" fill="#0369a1" />
          <line x1="130" y1="126" x2="130" y2="133" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
          <line x1="162" y1="126" x2="162" y2="133" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 3. 3D ISOMETRIC LUXURY RESORT POOL & SUN DECK (Center-Right)         */}
      {/* Leaves generous 30px+ padding on the right edge                      */}
      {/* ==================================================================== */}
      <g>
        {/* Pool Sun Deck Coping */}
        <polygon 
          points="174,142 236,143 231,185 169,184" 
          fill="#f1f5f9" 
          stroke="#cbd5e1" 
          strokeWidth="1" 
        />

        {/* Sunken Basin Depth Walls */}
        <polygon points="177,146 232,147 232,151 177,150" fill="#0369a1" />
        <polygon points="173,180 177,150 177,153 173,183" fill="#0284c7" />

        {/* Sparkling Turquoise Pool Water Surface */}
        <polygon 
          points="177,150 231,151 227,181 173,180" 
          fill="url(#hotel-pool-water)" 
        />

        {/* Water caustic ripples */}
        <path d="M 185 160 Q 198 156 210 162" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.75" />
        <path d="M 194 170 Q 206 166 218 171" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.7" />

        {/* Underwater Pool Steps (Back-left) */}
        <polygon points="179,152 191,152 190,157 178,157" fill="#38bdf8" opacity="0.8" />
        <polygon points="181,154 190,154 189,158 180,158" fill="#7dd3fc" opacity="0.8" />

        {/* Swim-up Center Island with Palm Tree */}
        <g transform="translate(202, 166)">
          <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.6" />
          <ellipse cx="0" cy="0" rx="5.5" ry="2.6" fill="#22c55e" />
          {/* Miniature Island Palm Tree */}
          <line x1="0" y1="0" x2="-1.5" y2="-12" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="-3" cy="-13" rx="5" ry="1.8" fill="#15803d" transform="rotate(-30, -3, -13)" />
          <ellipse cx="2" cy="-14" rx="5" ry="1.8" fill="#16a34a" transform="rotate(30, 2, -14)" />
          <ellipse cx="0" cy="-15" rx="5" ry="1.8" fill="#22c55e" />
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 4. 3D SUN PARASOLS & RESORT LOUNGERS AROUND POOL                     */}
      {/* ==================================================================== */}
      {[
        { x: 164, y: 148, color: "#ef4444" },
        { x: 161, y: 172, color: "#facc15" },
        { x: 238, y: 152, color: "#3b82f6" },
        { x: 234, y: 176, color: "#ef4444" },
      ].map((p, idx) => (
        <g key={`parasol-${idx}`} transform={`translate(${p.x}, ${p.y})`}>
          {/* Subtle Shadow */}
          <ellipse cx="1" cy="2" rx="5" ry="2.5" fill="#0f172a" opacity="0.2" />
          {/* Upright Pole */}
          <line x1="0" y1="0" x2="0" y2="-11" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
          {/* 3D Umbrella Canopy */}
          <polygon points="-7,-11 0,-7 7,-11 0,-15" fill={p.color} stroke="#ffffff" strokeWidth="0.5" />
          <polygon points="-7,-11 0,-7 0,-6 -7,-10" fill={p.color} opacity="0.8" />
          <polygon points="0,-7 7,-11 7,-10 0,-6" fill={p.color} opacity="0.65" />
          <circle cx="0" cy="-11" r="0.9" fill="#ffffff" />
          
          {/* 3D Sun Lounger Chair */}
          <g transform="translate(5, 0)">
            <polygon points="-4,1 2,4 5,2 -1,-1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
            <polygon points="-1,-1 5,2 7,0 1,-3" fill="#38bdf8" />
          </g>
        </g>
      ))}

      {/* ==================================================================== */}
      {/* 5. 3D TENNIS / SPORTS COURT (Left Side)                              */}
      {/* Leaves generous 25px+ padding on the left edge                       */}
      {/* ==================================================================== */}
      <g>
        {/* Terracotta Court Apron */}
        <polygon 
          points="36,142 82,143 78,185 32,184" 
          fill="#ea580c" 
          stroke="#c2410c" 
          strokeWidth="1" 
        />
        {/* Green Court Playing Surface */}
        <polygon 
          points="40,145 78,146 75,182 36,181" 
          fill="#15803d" 
        />
        {/* White Regulation Court Lines */}
        <polygon 
          points="43,148 75,149 72,179 40,178" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="0.75" 
        />
        {/* Center Service Line */}
        <line x1="57" y1="149" x2="56" y2="178.5" stroke="#ffffff" strokeWidth="0.75" />

        {/* 3D Tennis Net across the center */}
        <polygon 
          points="39,163 76,164 76,160.5 39,159.5" 
          fill="#ffffff" 
          opacity="0.9" 
          stroke="#cbd5e1" 
          strokeWidth="0.4" 
        />
        <line x1="39" y1="163" x2="39" y2="159" stroke="#0f172a" strokeWidth="1" />
        <line x1="76" y1="164" x2="76" y2="160" stroke="#0f172a" strokeWidth="1" />
      </g>

      {/* ==================================================================== */}
      {/* 6. 3D RESORT PARKING LOT & 3D CARS                                   */}
      {/* ==================================================================== */}
      <g>
        {/* Asphalt Parking Bay */}
        <polygon 
          points="88,142 124,143 120,185 84,184" 
          fill="#334155" 
          stroke="#1e293b" 
          strokeWidth="0.8" 
        />
        {/* White Parking Stall Markings */}
        <line x1="94" y1="143" x2="90" y2="184" stroke="#ffffff" strokeWidth="0.6" strokeDasharray="3 2" />
        <line x1="104" y1="143" x2="100" y2="184" stroke="#ffffff" strokeWidth="0.6" strokeDasharray="3 2" />
        <line x1="114" y1="143" x2="110" y2="184" stroke="#ffffff" strokeWidth="0.6" strokeDasharray="3 2" />

        {/* 3D Car 1 (White Sedan) */}
        <g transform="translate(93, 154)">
          <polygon points="-4,-2 4,-2 6,6 -2,6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
          <polygon points="4,-2 6,6 6,9 4,1" fill="#cbd5e1" />
          {/* Windshield */}
          <polygon points="-2,-1 3,-1 4,2 -1,2" fill="#0284c7" opacity="0.85" />
        </g>

        {/* 3D Car 2 (Red Sports Car) */}
        <g transform="translate(105, 160)">
          <polygon points="-4,-2 4,-2 6,6 -2,6" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.5" />
          <polygon points="4,-2 6,6 6,9 4,1" fill="#991b1b" />
          {/* Windshield */}
          <polygon points="-2,-1 3,-1 4,2 -1,2" fill="#0f172a" opacity="0.85" />
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 7. 3D TROPICAL PALM TREES IN THE GENEROUS EDGE PADDING AREAS         */}
      {/* Planted in the visible lawn margins on the left, right, and front    */}
      {/* ==================================================================== */}
      {[
        // Left margin padding
        { x: 26, y: 105 },
        { x: 22, y: 155 },
        // Right margin padding
        { x: 260, y: 105 },
        { x: 265, y: 155 },
        // Front promenade padding
        { x: 74, y: 198 },
        { x: 222, y: 200 },
      ].map((pt, i) => (
        <g key={`palm-edge-${i}`} transform={`translate(${pt.x}, ${pt.y})`}>
          {/* Subtle Shadow */}
          <ellipse cx="2" cy="2" rx="4.5" ry="2.2" fill="#0f172a" opacity="0.25" />
          {/* Trunk */}
          <path d="M 0 0 Q -2 -9 -1 -19" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Lush Tiered Fronds */}
          <ellipse cx="-5" cy="-21" rx="7" ry="2.2" fill="#15803d" transform="rotate(-30, -5, -21)" />
          <ellipse cx="4" cy="-21" rx="7" ry="2.2" fill="#16a34a" transform="rotate(30, 4, -21)" />
          <ellipse cx="-1" cy="-24" rx="7" ry="2.2" fill="#22c55e" />
          <ellipse cx="5" cy="-17" rx="6" ry="2" fill="#15803d" transform="rotate(60, 5, -17)" />
          <ellipse cx="-5" cy="-17" rx="6" ry="2" fill="#16a34a" transform="rotate(-60, -5, -17)" />
        </g>
      ))}

      {/* ==================================================================== */}
      {/* 8. 5-STAR RESORT CREST & PROPERTY NAME BADGE                         */}
      {/* Positioned at bottom center within the lawn boundary                 */}
      {/* ==================================================================== */}
      <g transform="translate(148, 203)" className="pointer-events-none">
        {/* Navy & Gold Plaque */}
        <rect 
          x="-58" 
          y="-10" 
          width="116" 
          height="20" 
          rx="5" 
          fill="#0f172a" 
          stroke="#f59e0b" 
          strokeWidth="1.2" 
        />
        <rect 
          x="-55" 
          y="-7" 
          width="110" 
          height="14" 
          rx="3.5" 
          fill="#1e293b" 
        />
        {/* Gold Luxury Stars */}
        <text 
          x="-35" 
          y="3.5" 
          fill="#facc15" 
          fontSize="8.5" 
          fontWeight="black"
        >
          ★
        </text>
        <text 
          x="30" 
          y="3.5" 
          fill="#facc15" 
          fontSize="8.5" 
          fontWeight="black"
        >
          ★
        </text>
        {/* Hotel Name */}
        <text 
          x="0" 
          y="3.5" 
          fill="#fef08a" 
          fontSize="7.5" 
          fontWeight="900" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          letterSpacing="1" 
          textAnchor="middle"
        >
          {displayName}
        </text>
      </g>
    </svg>
  );
};

export const HotelResortComponent = HotelBlock;
export default HotelBlock;
