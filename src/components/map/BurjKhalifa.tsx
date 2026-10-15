import React from 'react';

export interface BurjKhalifaProps {
  width?: number;
  height?: number;
  className?: string;
  name?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** How much taller the tower is drawn than in the base artwork. */
export const TOWER_STRETCH = 2.6;

export const BurjKhalifa: React.FC<BurjKhalifaProps> = ({
  width = 300,
  height = 380,
  className = "drop-shadow-2xl cursor-pointer hover:scale-[1.02] transition-transform origin-bottom z-40 select-none",
  name = "Burj Khalifa",
  onClick,
  style
}) => {
  const displayName = (name || "Burj Khalifa").toUpperCase();

  return (
    <svg 
      viewBox="0 0 340 440" 
      preserveAspectRatio="none"
      style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%', overflow: 'visible', ...style }} 
      className={className}
      onClick={onClick}
    >
      <defs>
        {/* Keep outlines thin on the stretched tower. */}
        <style>{`.bk-tower * { vector-effect: non-scaling-stroke; }`}</style>
        {/* Stainless Steel Sunlit Front Facade */}
        <linearGradient id="bk-front-facet" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="18%" stopColor="#ffffff" />
          <stop offset="42%" stopColor="#e2e8f0" />
          <stop offset="70%" stopColor="#cbd5e1" />
          <stop offset="88%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* Shaded Left Facade (Recedes along FloorTile depth axis: dx = +0.2355*dy) */}
        <linearGradient id="bk-left-facet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Mirrored Azure Sky Curtain Wall */}
        <linearGradient id="bk-mirror-facet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="25%" stopColor="#e0f2fe" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="80%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* Top Terrace Caps (Camera angle from the top) */}
        <linearGradient id="bk-steel-cap" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        {/* Mechanical Equipment Louver Bands */}
        <linearGradient id="bk-louver-band" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="25%" stopColor="#475569" />
          <stop offset="60%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        {/* Spire Needle */}
        <linearGradient id="bk-spire-needle" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#f8fafc" />
          <stop offset="70%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Dubai Fountain Turquoise Water Gradient */}
        <linearGradient id="bk-fountain-lake" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="30%" stopColor="#06b6d4" />
          <stop offset="70%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* Pulsing Aircraft Beacon Flare */}
        <radialGradient id="bk-beacon-star" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#e0f2fe" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ==================================================================== */}
      {/* 1. ISOMETRIC PLOT BASE (Exact direction & isometry as FloorTile)      */}
      {/* ==================================================================== */}

      {/* Lower side emboss rim (Runs strictly along lower bottom edge) */}
      <polygon points="20,420 260,424 260,427.5 20,423.5" fill="#1e293b" />
      <polygon points="20,420 260,424 260,426 20,422" fill="#334155" />

      {/* Main Ground Base Surface (FloorTile matching: baseline tilt +0.01667, depth slant +0.2355) */}
      <polygon 
        points="46,310 286,314 260,424 20,420" 
        fill="#f8fafc" 
        stroke="#cbd5e1" 
        strokeWidth="2" 
        strokeLinejoin="round" 
      />

      {/* ==================================================================== */}
      {/* 2. GRAND TRAVERTINE ARRIVAL PLAZA & PROMENADE (Tower Base Grounds)  */}
      {/* ==================================================================== */}
      <g>
        {/* Plaza Paving Border */}
        <polygon 
          points="28,414 252,417.7 274,319.7 50,316" 
          fill="#f1f5f9" 
          stroke="#cbd5e1" 
          strokeWidth="1.2" 
        />

        {/* Plaza Marble Inlay Platform */}
        <polygon 
          points="34,410 246,413.5 266,323.5 54,320" 
          fill="#e2e8f0" 
          stroke="#cbd5e1" 
          strokeWidth="0.8" 
        />

        {/* VIP Porte-Cochere Drop-off Circle */}
        <ellipse cx="150" cy="370" rx="55" ry="22" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="5 3" />
        <ellipse cx="150" cy="370" rx="32" ry="13" fill="#cbd5e1" opacity="0.4" stroke="#94a3b8" strokeWidth="1" />

        {/* Landscaped Date Palms at Promenade Corners */}
        {[
          { x: 44, y: 398 },
          { x: 68, y: 340 },
          { x: 232, y: 402 },
          { x: 252, y: 345 }
        ].map((pt, i) => (
          <g key={`bk-palm-${i}`}>
            <line x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.y - 12} stroke="#78350f" strokeWidth="1.6" />
            <circle cx={pt.x} cy={pt.y - 14} r="5" fill="#15803d" />
            <circle cx={pt.x} cy={pt.y - 14} r="2.5" fill="#22c55e" />
          </g>
        ))}
      </g>

      {/* ==================================================================== */}
      {/* 3. BURJ KHALIFA TOWER (Aligned strictly with FloorTile Isometry)     */}
      {/* (Front visible, Left side slightly visible, Camera angle from top)   */}
      {/* ==================================================================== */}

      {/* --- CENTRAL PODIUM ISLAND --- */}
      <g>
        {/* Left Side Facade (Along FloorTile depth vector: dx=+0.2355*dy) */}
        <polygon 
          points="116,320 122,296 122,308 116,332" 
          fill="url(#bk-left-facet)" 
          stroke="#1e293b" 
          strokeWidth="1" 
        />
        {/* Front Facade (Baseline slope +0.01667) */}
        <polygon 
          points="116,320 204,321.5 204,333.5 116,332" 
          fill="url(#bk-front-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.2" 
        />
        {/* Top Roof Deck (Camera from top!) */}
        <polygon 
          points="116,320 204,321.5 210,297.5 122,296" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="1.2" 
        />

        {/* Sculptural Aerodynamic Entrance Portico */}
        <polygon points="148,316 160,336 172,316 160,310" fill="url(#bk-steel-cap)" stroke="#0f172a" strokeWidth="1.2" />
        <polygon points="148,316 160,336 160,340 148,320" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
        <polygon points="160,336 172,316 172,320 160,340" fill="#334155" stroke="#0f172a" strokeWidth="1" />
        <rect x="156" y="322" width="8" height="10" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" rx="1" />
        <line x1="160" y1="322" x2="160" y2="332" stroke="#38bdf8" strokeWidth="0.8" />
      </g>

      {/* The tower above the podium, stretched upward from where it stands (y=312) so it rises far
          above every other tower, as the world's tallest building does (828 m vs ~300–356 m nearby).
          It draws above the sprite's box; the plaza, podium and badge keep their size. */}
      <g className="bk-tower" transform={`translate(0 312) scale(1 ${TOWER_STRETCH}) translate(0 -312)`}>
      {/* --- TIER 1: LOWER SPIRALING WINGS (y=262 to 312) --- */}
      <g>
        {/* LEFT WING (Left side slightly visible along FloorTile depth) */}
        <polygon 
          points="120,278 126,256 126,290 120,312" 
          fill="url(#bk-left-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.2" 
        />
        <polygon 
          points="120,278 148,278.5 148,312 120,312" 
          fill="url(#bk-front-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.3" 
        />
        <polygon 
          points="120,278 148,278.5 154,256.5 126,256" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="1.1" 
        />
        <line x1="128" y1="278" x2="128" y2="312" stroke="#ffffff" strokeWidth="0.9" opacity="0.95" />
        <line x1="140" y1="278" x2="140" y2="312" stroke="#64748b" strokeWidth="0.8" />

        {/* RIGHT WING */}
        <polygon 
          points="172,268 200,268.5 200,312 172,312" 
          fill="url(#bk-front-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.3" 
        />
        <polygon 
          points="172,268 200,268.5 204,250.5 176,250" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="1.1" 
        />

        {/* CENTER PROW CYLINDER */}
        <polygon 
          points="144,262 176,262.5 176,312 144,312" 
          fill="url(#bk-mirror-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.4" 
        />
        <polygon 
          points="144,262 176,262.5 180,242.5 148,242" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="1.2" 
        />
        <line x1="160" y1="262" x2="160" y2="312" stroke="#ffffff" strokeWidth="1.6" opacity="0.95" />
      </g>

      {/* --- TIER 2: MID-LOWER SETBACKS (y=218 to 262) --- */}
      <g>
        <polygon 
          points="128,234 133,214 133,242 128,262" 
          fill="url(#bk-left-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.1" 
        />
        <polygon 
          points="128,234 152,234.4 152,262 128,262" 
          fill="url(#bk-front-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.2" 
        />
        <polygon 
          points="128,234 152,234.4 157,214.4 133,214" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="1" 
        />

        {/* Right Wing Front & Top */}
        <polygon 
          points="168,224 192,224.4 192,262 168,262" 
          fill="url(#bk-front-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.2" 
        />
        <polygon 
          points="168,224 192,224.4 196,206.4 172,206" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="1" 
        />

        {/* Center Spine */}
        <polygon 
          points="148,218 172,218.4 172,262 148,262" 
          fill="url(#bk-mirror-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.3" 
        />
        <polygon 
          points="148,218 172,218.4 176,200.4 152,200" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="1.1" 
        />
        <line x1="160" y1="218" x2="160" y2="262" stroke="#ffffff" strokeWidth="1.5" />
      </g>

      {/* --- TIER 3: MID-TOWER SETBACKS (y=178 to 218) --- */}
      <g>
        <polygon 
          points="136,194 140,176 140,200 136,218" 
          fill="url(#bk-left-facet)" 
          stroke="#0f172a" 
          strokeWidth="1" 
        />
        <polygon 
          points="136,194 156,194.3 156,218 136,218" 
          fill="url(#bk-front-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.1" 
        />
        <polygon 
          points="136,194 156,194.3 160,176.3 140,176" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="0.9" 
        />

        <polygon 
          points="164,186 184,186.3 184,218 164,218" 
          fill="url(#bk-front-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.1" 
        />
        <polygon 
          points="164,186 184,186.3 188,170.3 168,170" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="0.9" 
        />

        <polygon 
          points="152,178 168,178.3 168,218 152,218" 
          fill="url(#bk-mirror-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.2" 
        />
        <polygon 
          points="152,178 168,178.3 172,162.3 156,162" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="1" 
        />
        <line x1="160" y1="178" x2="160" y2="218" stroke="#ffffff" strokeWidth="1.3" />
      </g>

      {/* --- TIER 4: HIGH-ALTITUDE SHAFT (y=143 to 178) --- */}
      <g>
        <polygon 
          points="144,156 148,141 148,163 144,178" 
          fill="url(#bk-left-facet)" 
          stroke="#0f172a" 
          strokeWidth="0.9" 
        />
        <polygon 
          points="144,156 158,156.2 158,178 144,178" 
          fill="url(#bk-front-facet)" 
          stroke="#0f172a" 
          strokeWidth="1" 
        />
        <polygon 
          points="144,156 158,156.2 162,141.2 148,141" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="0.8" 
        />

        <polygon 
          points="154,143 166,143.2 166,178 154,178" 
          fill="url(#bk-mirror-facet)" 
          stroke="#0f172a" 
          strokeWidth="1.1" 
        />
        <polygon 
          points="154,143 166,143.2 169,130.2 157,130" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="0.9" 
        />
        <line x1="160" y1="143" x2="160" y2="178" stroke="#ffffff" strokeWidth="1.2" />
      </g>

      {/* --- TIER 5: UPPER PINNACLE CORE (y=108 to 143) --- */}
      <g>
        <polygon 
          points="155,112 158,100 158,131 155,143" 
          fill="url(#bk-left-facet)" 
          stroke="#0f172a" 
          strokeWidth="0.8" 
        />
        <polygon 
          points="155,112 165,112.2 165,143 155,143" 
          fill="url(#bk-front-facet)" 
          stroke="#0f172a" 
          strokeWidth="0.9" 
        />
        <polygon 
          points="155,112 165,112.2 168,100.2 158,100" 
          fill="url(#bk-steel-cap)" 
          stroke="#0f172a" 
          strokeWidth="0.8" 
        />
        <line x1="160" y1="112" x2="160" y2="143" stroke="#ffffff" strokeWidth="1" />
      </g>

      {/* --- TELESCOPIC NEEDLE SPIRE (y=20 to 112) --- */}
      <g>
        <polygon points="158,112 162,112 161.5,75 158.5,75" fill="url(#bk-spire-needle)" stroke="#0f172a" strokeWidth="0.9" />
        <polygon points="158.8,75 161.2,75 160.6,42 159.4,42" fill="url(#bk-spire-needle)" stroke="#0f172a" strokeWidth="0.7" />
        <line x1="160" y1="42" x2="160" y2="20" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="160" y1="20" x2="160" y2="16" stroke="#cbd5e1" strokeWidth="0.9" strokeLinecap="round" />

        {/* Flashing Aircraft Obstruction Beacon */}
        <circle cx="160" cy="16" r="4.5" fill="url(#bk-beacon-star)">
          <animate attributeName="r" values="3;7;3" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="160" cy="16" r="1.5" fill="#ef4444" />
      </g>
      </g>

      {/* ==================================================================== */}
      {/* 4. PRESTIGE GOLD EMBOSSED BADGE                                      */}
      {/* ==================================================================== */}
      <g transform="translate(26, 408)">
        <polygon points="0,0 160,2.6 158,18 0,15.4" fill="#0f172a" opacity="0.9" stroke="#eab308" strokeWidth="1" />
        <circle cx="12" cy="8.5" r="3.5" fill="#eab308" />
        <text x="22" y="12" fill="#fef08a" fontSize="8" fontWeight="900" letterSpacing="1.2">
          ★ {displayName}
        </text>
      </g>
    </svg>
  );
};

export const BurjKhalifaIcon = BurjKhalifa;
export default BurjKhalifa;
