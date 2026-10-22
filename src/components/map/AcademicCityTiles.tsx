import React from 'react';
import { ACADEMIC_CAMPUSES } from '@/lib/city/academic';

export interface AcademicCampus3DProps {
  loc?: any;
  width?: number;
  height?: number;
  className?: string;
}

// ============================================================================
// 1. BRAIN UNIVERSITY — 3D CYBERNETIC ACCELERATOR CAMPUS
// ============================================================================
export const OneBrain3DCampus: React.FC<AcademicCampus3DProps> = ({
  width = 280,
  height = 200,
  className = "",
}) => {
  return (
    <svg
      viewBox="0 0 280 200"
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`drop-shadow-2xl cursor-pointer hover:scale-[1.04] transition-transform origin-bottom select-none ${className}`}
    >
      <defs>
        {/* Foundation Grid Gradient */}
        <linearGradient id="obBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1035" />
          <stop offset="50%" stopColor="#0f0728" />
          <stop offset="100%" stopColor="#030014" />
        </linearGradient>

        {/* Cyber Neon Glow */}
        <linearGradient id="obNeonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>

        {/* Glass Facade Gradient */}
        <linearGradient id="obGlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0.9" />
        </linearGradient>

        {/* Shaded Wall */}
        <linearGradient id="obShadedWall" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>

        {/* Rooftop Holographic Pulse */}
        <radialGradient id="obHoloCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
          <stop offset="60%" stopColor="#818cf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ---------------- 1. ISOMETRIC FOUNDATION PLATFORM ---------------- */}
      <g>
        {/* Raised Cyber Foundation */}
        <polygon
          points="20,172 260,174 278,98 38,96"
          fill="url(#obBaseGrad)"
          stroke="#a855f7"
          strokeWidth="1.5"
        />
        {/* Isometric Foundation Thickness Lip */}
        <polygon points="20,172 260,174 260,181 20,179" fill="#2e1065" />
        <polygon points="260,174 278,98 278,105 260,181" fill="#170535" />

        {/* Glowing Neon Cyber Grid Lines on Foundation */}
        <line x1="45" y1="162" x2="245" y2="164" stroke="#8b5cf6" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="60" y1="140" x2="255" y2="142" stroke="#8b5cf6" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="75" y1="118" x2="265" y2="120" stroke="#8b5cf6" strokeWidth="0.8" strokeOpacity="0.6" />

        {/* Diagonal Circuit Traces */}
        <path d="M 50,172 L 75,130 L 100,130" fill="none" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.8" />
        <circle cx="100" cy="130" r="2" fill="#06b6d4" />
        <path d="M 230,173 L 210,135 L 180,135" fill="none" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.8" />
        <circle cx="180" cy="135" r="2" fill="#a855f7" />
      </g>

      {/* ---------------- 2. GROUND FLOOR LAB & MAIN ENTRANCE ---------------- */}
      <g>
        {/* Ground Building Footprint Shadow */}
        <polygon points="60,158 220,159 232,106 72,105" fill="#000000" opacity="0.45" />

        {/* Front Lit Facade */}
        <polygon
          points="68,154 212,155.5 212,98 68,96.5"
          fill="#1e1b4b"
          stroke="#6366f1"
          strokeWidth="1"
        />
        {/* Right Shaded Facade */}
        <polygon
          points="212,155.5 212,98 226,63.5 226,121"
          fill="url(#obShadedWall)"
          stroke="#4f46e5"
          strokeWidth="1"
        />

        {/* High-Tech Entrance Glass Portal */}
        <polygon points="115,154.5 165,155 165,115 115,114.5" fill="url(#obGlassGrad)" stroke="#38bdf8" strokeWidth="1" />
        {/* Entrance Light Glow Pillars */}
        <line x1="117" y1="154.5" x2="117" y2="114.5" stroke="#06b6d4" strokeWidth="2.5" />
        <line x1="163" y1="155" x2="163" y2="115" stroke="#06b6d4" strokeWidth="2.5" />

        {/* Digital LED Entrance Marquee */}
        <polygon points="105,118 175,118.5 175,108 105,107.5" fill="#090514" stroke="#a855f7" strokeWidth="1.2" />
        <text x="140" y="115.5" fill="#38bdf8" fontSize="6" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
          ⚡ BRAIN LABS
        </text>

        {/* Side Ribbon Windows */}
        <polygon points="76,145 106,145.3 106,128 76,127.7" fill="url(#obGlassGrad)" stroke="#818cf8" strokeWidth="0.8" />
        <polygon points="174,146 204,146.3 204,129 174,128.7" fill="url(#obGlassGrad)" stroke="#818cf8" strokeWidth="0.8" />
      </g>

      {/* ---------------- 3. CANTILEVERED UPPER QUANTUM TOWER ---------------- */}
      <g>
        {/* Cantilevered Glass Cube Front */}
        <polygon
          points="80,102 200,103.2 200,52 80,51"
          fill="url(#obGlassGrad)"
          stroke="#06b6d4"
          strokeWidth="1.2"
        />
        {/* Shaded Right Cantilever Facade */}
        <polygon
          points="200,103.2 200,52 214,27 214,78.2"
          fill="#312e81"
          stroke="#4338ca"
          strokeWidth="1"
        />
        {/* Rooftop Platform Deck */}
        <polygon
          points="80,51 200,52 214,27 94,26"
          fill="#0f0728"
          stroke="#a855f7"
          strokeWidth="1.2"
        />

        {/* High-tech vertical mullions */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={95 + i * 22}
            y1={102.2 + i * 0.2}
            x2={95 + i * 22}
            y2={51.2 + i * 0.2}
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />
        ))}

        {/* Horizontal glowing data tier rings */}
        <line x1="82" y1="86" x2="198" y2="87.2" stroke="#a855f7" strokeWidth="1.2" />
        <line x1="82" y1="68" x2="198" y2="69.2" stroke="#06b6d4" strokeWidth="1.2" />
      </g>

      {/* ---------------- 4. ROOFTOP AI NEURAL CORE & TRANSMISSION ANTENNA ---------------- */}
      <g>
        {/* Satellite Dish & Comms Mast */}
        <line x1="147" y1="39" x2="147" y2="10" stroke="#c084fc" strokeWidth="2" />
        <line x1="147" y1="10" x2="137" y2="16" stroke="#c084fc" strokeWidth="1.2" />
        <line x1="147" y1="10" x2="157" y2="16" stroke="#c084fc" strokeWidth="1.2" />

        {/* Holographic Neural Core Sphere */}
        <circle cx="147" cy="18" r="9" fill="url(#obHoloCore)">
          <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="147" cy="18" r="4" fill="#ffffff" />

        {/* Floating Hologram Ring */}
        <ellipse cx="147" cy="18" rx="14" ry="4" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" />

        {/* Solar Cyber Radomes */}
        <circle cx="112" cy="38" r="5" fill="#38bdf8" opacity="0.85" />
        <circle cx="182" cy="39" r="5" fill="#a855f7" opacity="0.85" />
      </g>

      {/* ---------------- 5. CYBER DATE PALMS & ILLUMINATED PATHS ---------------- */}
      <g transform="translate(36, 155)">
        <path d="M 0,0 Q 2,-12 -2,-22" fill="none" stroke="#06b6d4" strokeWidth="2" />
        <path d="M -2,-22 Q -10,-28 -14,-24" fill="none" stroke="#a855f7" strokeWidth="1.6" />
        <path d="M -2,-22 Q 6,-30 12,-25" fill="none" stroke="#a855f7" strokeWidth="1.6" />
        <path d="M -2,-22 Q -4,-34 0,-35" fill="none" stroke="#38bdf8" strokeWidth="1.6" />
      </g>
      <g transform="translate(244, 157)">
        <path d="M 0,0 Q -2,-12 2,-22" fill="none" stroke="#06b6d4" strokeWidth="2" />
        <path d="M 2,-22 Q -6,-30 -12,-25" fill="none" stroke="#a855f7" strokeWidth="1.6" />
        <path d="M 2,-22 Q 10,-28 14,-24" fill="none" stroke="#a855f7" strokeWidth="1.6" />
        <path d="M 2,-22 Q 4,-34 0,-35" fill="none" stroke="#38bdf8" strokeWidth="1.6" />
      </g>

      {/* Floating Status Badge */}
      <g transform="translate(140, 186)">
        <rect x="-95" y="-10" width="190" height="18" rx="9" fill="#090514" stroke="#a855f7" strokeWidth="1.5" />
        <text x="0" y="2.5" fill="#ffffff" fontSize="8" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
          ⚡ 10 HIGH-DEMAND COURSES · ACCELERATOR
        </text>
      </g>
    </svg>
  );
};

// ============================================================================
// 2. CRESCENT UNIVERSITY (id aud) — 3D NEOCLASSICAL CAMPUS
// ============================================================================
export const AUD3DCampus: React.FC<AcademicCampus3DProps> = ({
  width = 280,
  height = 200,
  className = "",
}) => {
  return (
    <svg
      viewBox="0 0 280 200"
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`drop-shadow-2xl cursor-pointer hover:scale-[1.04] transition-transform origin-bottom select-none ${className}`}
    >
      <defs>
        {/* Sandstone Wall Gradient */}
        <linearGradient id="audWallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="60%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Shaded Sandstone Wall */}
        <linearGradient id="audShadedWall" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Golden Dome Gradient */}
        <linearGradient id="audDomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        {/* Manicured Lawn Base */}
        <linearGradient id="audLawnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#15803d" />
          <stop offset="50%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>

        {/* Marble steps */}
        <linearGradient id="audMarbleSteps" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* ---------------- 1. ISOMETRIC MANICURED QUAD LAWN ---------------- */}
      <g>
        <polygon
          points="20,172 260,174 278,98 38,96"
          fill="url(#audLawnGrad)"
          stroke="#ca8a04"
          strokeWidth="1.5"
        />
        <polygon points="20,172 260,174 260,181 20,179" fill="#14532d" />
        <polygon points="260,174 278,98 278,105 260,181" fill="#052e16" />

        {/* Central Stone Promenade Pathway */}
        <polygon points="120,173 160,173.5 168,135 112,134.5" fill="url(#audMarbleSteps)" stroke="#cbd5e1" strokeWidth="0.8" />

        {/* Front Stone Water Fountain */}
        <ellipse cx="140" cy="158" rx="14" ry="7" fill="#0284c7" stroke="#ffffff" strokeWidth="1.2" />
        <ellipse cx="140" cy="158" rx="8" ry="4" fill="#38bdf8" />
        <circle cx="140" cy="157" r="2" fill="#ffffff" />
      </g>

      {/* ---------------- 2. FLANKING SYMMETRICAL ACADEMIC WINGS ---------------- */}
      <g>
        {/* Left Wing Front */}
        <polygon points="45,140 105,140.5 105,82 45,81.5" fill="url(#audWallGrad)" stroke="#d97706" strokeWidth="1" />
        {/* Shaded Side (on the right wing's right edge: buildings show front and right) */}
        <polygon points="235,141.5 235,83 248,55.5 248,114" fill="url(#audShadedWall)" stroke="#92400e" strokeWidth="1" />
        {/* Left Wing Roof */}
        <polygon points="45,81.5 105,82 118,54.5 58,54" fill="#b45309" stroke="#78350f" strokeWidth="0.8" />

        {/* Right Wing Front */}
        <polygon points="175,141 235,141.5 235,83 175,82.5" fill="url(#audWallGrad)" stroke="#d97706" strokeWidth="1" />
        {/* Right Wing Roof */}
        <polygon points="175,82.5 235,83 248,55.5 188,55" fill="#b45309" stroke="#78350f" strokeWidth="0.8" />

        {/* Arched Collegiate Windows on Wings */}
        {[0, 1].map((row) => (
          <g key={`win-row-${row}`}>
            {[0, 1].map((col) => (
              <polygon
                key={`left-w-${row}-${col}`}
                points={`${52 + col * 24},${122 - row * 26} ${68 + col * 24},${122.2 - row * 26} ${68 + col * 24},${102.2 - row * 26} ${52 + col * 24},${102 - row * 26}`}
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth="0.8"
              />
            ))}
            {[0, 1].map((col) => (
              <polygon
                key={`right-w-${row}-${col}`}
                points={`${182 + col * 24},${123 - row * 26} ${198 + col * 24},${123.2 - row * 26} ${198 + col * 24},${103.2 - row * 26} ${182 + col * 24},${103 - row * 26}`}
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth="0.8"
              />
            ))}
          </g>
        ))}
      </g>

      {/* ---------------- 3. GRAND CENTRAL PORTICO WITH COLUMNS ---------------- */}
      <g>
        {/* Central Hall Front */}
        <polygon points="98,136 182,136.8 182,72 98,71.2" fill="url(#audWallGrad)" stroke="#b45309" strokeWidth="1" />

        {/* Grand Classical Columns (4 Ionic Columns) */}
        {[0, 1, 2, 3].map((i) => {
          const x = 108 + i * 21;
          return (
            <g key={`col-${i}`}>
              <polygon
                points={`${x},136 ${x + 6},136.1 ${x + 6},88.1 ${x},88`}
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth="0.8"
              />
              {/* Column Capital */}
              <polygon points={`${x - 2},88 ${x + 8},88.1 ${x + 7},85.1 ${x - 1},85`} fill="#fde68a" />
              {/* Column Base */}
              <polygon points={`${x - 1},136 ${x + 7},136.1 ${x + 8},138.1 ${x - 2},138`} fill="#fde68a" />
            </g>
          );
        })}

        {/* Triangular Neoclassical Pediment (Gable) */}
        <polygon points="96,85 184,85.8 140,58" fill="#fef3c7" stroke="#b45309" strokeWidth="1.2" />
        {/* Eagle crest in the pediment */}
        <circle cx="140" cy="74" r="6" fill="#d97706" />
        <text x="140" y="76.5" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">🦅</text>

        {/* Grand Entrance Double Doors */}
        <polygon points="126,136 154,136.2 154,106.2 126,106" fill="#78350f" stroke="#fde68a" strokeWidth="1" />
        <line x1="140" y1="106.1" x2="140" y2="136.1" stroke="#fde68a" strokeWidth="0.8" />
      </g>

      {/* ---------------- 4. POLISHED GOLDEN ROTUNDA DOME ---------------- */}
      <g>
        {/* Dome Drum */}
        <polygon points="122,58 158,58.3 162,44.3 126,44" fill="#fef3c7" stroke="#ca8a04" strokeWidth="0.8" />
        {/* Semicircular Dome */}
        <path d="M 124,44 Q 142,16 160,44.3 Z" fill="url(#audDomeGrad)" stroke="#ca8a04" strokeWidth="1" />
        {/* Dome Lantern & Flagpole */}
        <line x1="142" y1="20" x2="142" y2="2" stroke="#a16207" strokeWidth="1.5" />
        {/* UAE National Flag Flying */}
        <polygon points="142,2 158,5 158,13 142,10" fill="#15803d" />
        <polygon points="142,5 158,8 158,11 142,8" fill="#ffffff" />
        <polygon points="142,8 158,11 158,14 142,11" fill="#000000" />
        <polygon points="142,2 146,2.5 146,11.5 142,11" fill="#dc2626" />
      </g>

      {/* ---------------- 5. DATE PALMS ON CAMPUS FLANKS ---------------- */}
      <g transform="translate(34, 150)">
        <path d="M 0,0 Q 2,-14 -1,-26" fill="none" stroke="#78350f" strokeWidth="2.2" />
        <path d="M -1,-26 Q -10,-32 -16,-26" fill="none" stroke="#15803d" strokeWidth="1.6" />
        <path d="M -1,-26 Q 8,-34 14,-28" fill="none" stroke="#16a34a" strokeWidth="1.6" />
        <path d="M -1,-26 Q -4,-38 0,-40" fill="none" stroke="#22c55e" strokeWidth="1.6" />
      </g>
      <g transform="translate(246, 152)">
        <path d="M 0,0 Q -2,-14 1,-26" fill="none" stroke="#78350f" strokeWidth="2.2" />
        <path d="M 1,-26 Q -8,-34 -14,-28" fill="none" stroke="#16a34a" strokeWidth="1.6" />
        <path d="M 1,-26 Q 10,-32 16,-26" fill="none" stroke="#15803d" strokeWidth="1.6" />
        <path d="M 1,-26 Q 4,-38 0,-40" fill="none" stroke="#22c55e" strokeWidth="1.6" />
      </g>

      {/* Floating Status Badge */}
      <g transform="translate(140, 186)">
        <rect x="-95" y="-10" width="190" height="18" rx="9" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="0" y="2.5" fill="#fef08a" fontSize="8" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
          🦅 CRESCENT UNIVERSITY
        </text>
      </g>
    </svg>
  );
};

// ============================================================================
// 3. FALCON UNIVERSITY (id ud) — 3D CYBER & TRADE TOWER CAMPUS
// ============================================================================
export const UD3DCampus: React.FC<AcademicCampus3DProps> = ({
  width = 280,
  height = 200,
  className = "",
}) => {
  return (
    <svg
      viewBox="0 0 280 200"
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`drop-shadow-2xl cursor-pointer hover:scale-[1.04] transition-transform origin-bottom select-none ${className}`}
    >
      <defs>
        {/* Azure Tower Glass */}
        <linearGradient id="udGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* Corporate Steel Facade */}
        <linearGradient id="udSteelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Skybridge Glass */}
        <linearGradient id="udBridgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
        </linearGradient>

        {/* Granite Paving Base */}
        <linearGradient id="udPavingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* ---------------- 1. ISOMETRIC FOUNDATION WITH WATER FEATURE ---------------- */}
      <g>
        <polygon
          points="20,172 260,174 278,98 38,96"
          fill="url(#udPavingGrad)"
          stroke="#0284c7"
          strokeWidth="1.5"
        />
        <polygon points="20,172 260,174 260,181 20,179" fill="#0f172a" />
        <polygon points="260,174 278,98 278,105 260,181" fill="#020617" />

        {/* Reflecting Pool Basin */}
        <polygon points="50,165 230,166.5 240,140 60,139" fill="#0369a1" stroke="#38bdf8" strokeWidth="0.8" />
        <path d="M 70,152 Q 140,150 210,153" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
      </g>

      {/* ---------------- 2. LEFT INNOVATION TOWER ---------------- */}
      <g>
        {/* Left Tower Front */}
        <polygon points="65,142 120,142.5 120,44 65,43.5" fill="url(#udSteelGrad)" stroke="#0284c7" strokeWidth="1" />
        {/* Shaded Side (on the right tower's right edge) */}
        <polygon points="215,143.5 215,45 228,21.5 228,120" fill="#475569" stroke="#334155" strokeWidth="1" />
        {/* Left Tower Roof */}
        <polygon points="65,43.5 120,44 133,20.5 78,20" fill="#0f172a" stroke="#0284c7" strokeWidth="0.8" />

        {/* Blue Curtain Wall Glazing */}
        {[0, 1, 2, 3].map((f) => (
          <polygon
            key={`l-glaze-${f}`}
            points={`72,${130 - f * 22} 113,${130.3 - f * 22} 113,${115.3 - f * 22} 72,${115 - f * 22}`}
            fill="url(#udGlassGrad)"
            stroke="#ffffff"
            strokeWidth="0.8"
          />
        ))}

        {/* Solar Canopy on Left Roof */}
        <line x1="85" y1="26" x2="120" y2="26.3" stroke="#38bdf8" strokeWidth="2.5" />
      </g>

      {/* ---------------- 3. RIGHT CYBERSECURITY TOWER ---------------- */}
      <g>
        {/* Right Tower Front */}
        <polygon points="160,143 215,143.5 215,45 160,44.5" fill="url(#udSteelGrad)" stroke="#0284c7" strokeWidth="1" />
        {/* Right Tower Roof */}
        <polygon points="160,44.5 215,45 228,21.5 173,21" fill="#0f172a" stroke="#0284c7" strokeWidth="0.8" />

        {/* Blue Curtain Wall Glazing */}
        {[0, 1, 2, 3].map((f) => (
          <polygon
            key={`r-glaze-${f}`}
            points={`167,${131 - f * 22} 208,${131.3 - f * 22} 208,${116.3 - f * 22} 167,${116 - f * 22}`}
            fill="url(#udGlassGrad)"
            stroke="#ffffff"
            strokeWidth="0.8"
          />
        ))}

        {/* Satellite Comms Radome on Right Roof */}
        <circle cx="195" cy="27" r="7" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
        <line x1="195" y1="20" x2="195" y2="10" stroke="#0284c7" strokeWidth="1.5" />
        <circle cx="195" cy="10" r="1.5" fill="#38bdf8" />
      </g>

      {/* ---------------- 4. 3D ELEVATED GLASS SKYBRIDGE ---------------- */}
      <g>
        {/* Skybridge Front */}
        <polygon points="120,86 160,86.4 160,66.4 120,66" fill="url(#udBridgeGrad)" stroke="#ffffff" strokeWidth="1.2" />
        {/* Skybridge Roof */}
        <polygon points="120,66 160,66.4 170,50.4 130,50" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
        {/* Structural Diagonal Trusses */}
        <line x1="120" y1="86" x2="140" y2="66.2" stroke="#ffffff" strokeWidth="1" />
        <line x1="140" y1="86.2" x2="160" y2="66.4" stroke="#ffffff" strokeWidth="1" />
        <line x1="120" y1="66" x2="140" y2="86.2" stroke="#ffffff" strokeWidth="1" />
        <line x1="140" y1="66.2" x2="160" y2="86.4" stroke="#ffffff" strokeWidth="1" />
      </g>

      {/* ---------------- 5. CENTRAL ENTRY ATRIUM & SIGNAGE ---------------- */}
      <g>
        <polygon points="115,142 165,142.4 165,108.4 115,108" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />
        <polygon points="122,142.1 158,142.3 158,114.3 122,114.1" fill="url(#udGlassGrad)" />
        <text x="140" y="127" fill="#ffffff" fontSize="5.5" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
          🏛️ DUBAI CHAMBER
        </text>
      </g>

      {/* Floating Status Badge */}
      <g transform="translate(140, 186)">
        <rect x="-95" y="-10" width="190" height="18" rx="9" fill="#082f49" stroke="#0284c7" strokeWidth="1.5" />
        <text x="0" y="2.5" fill="#38bdf8" fontSize="8" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
          🏛️ FALCON UNIVERSITY · CYBER & TRADE
        </text>
      </g>
    </svg>
  );
};

// ============================================================================
// 4. DESERT ROSE COLLEGE (id dc) — 3D BRITISH COLLEGIATE CLOCK TOWER
// ============================================================================
export const DubaiCollege3DCampus: React.FC<AcademicCampus3DProps> = ({
  width = 280,
  height = 200,
  className = "",
}) => {
  return (
    <svg
      viewBox="0 0 280 200"
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`drop-shadow-2xl cursor-pointer hover:scale-[1.04] transition-transform origin-bottom select-none ${className}`}
    >
      <defs>
        {/* Red Brick Gradient */}
        <linearGradient id="dcBrickGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b91c1c" />
          <stop offset="60%" stopColor="#991b1b" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>

        {/* Shaded Brick */}
        <linearGradient id="dcShadedBrick" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>

        {/* Portland Stone Dressing */}
        <linearGradient id="dcStoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* British Cricket Pitch Green */}
        <linearGradient id="dcPitchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="50%" stopColor="#15803d" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
      </defs>

      {/* ---------------- 1. CRICKET / RUGBY QUAD LAWN ---------------- */}
      <g>
        <polygon
          points="20,172 260,174 278,98 38,96"
          fill="url(#dcPitchGrad)"
          stroke="#16a34a"
          strokeWidth="1.5"
        />
        <polygon points="20,172 260,174 260,181 20,179" fill="#052e16" />
        <polygon points="260,174 278,98 278,105 260,181" fill="#021a0c" />

        {/* White Boundary Oval Markings */}
        <ellipse cx="140" cy="155" rx="75" ry="15" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.8" />
        {/* Cricket Wicket Crease in center */}
        <polygon points="125,158 155,158.3 158,150 128,149.7" fill="#fde68a" stroke="#ca8a04" strokeWidth="0.8" />
      </g>

      {/* ---------------- 2. TRADITIONAL TUDOR-BRICK WINGS ---------------- */}
      <g>
        {/* Left Hall Front */}
        <polygon points="40,138 120,138.6 120,78 40,77.4" fill="url(#dcBrickGrad)" stroke="#7f1d1d" strokeWidth="1" />
        {/* Shaded Side (on the right hall's right edge) */}
        <polygon points="240,139.6 240,79 252,53.6 252,114.2" fill="url(#dcShadedBrick)" stroke="#450a0a" strokeWidth="1" />
        {/* Left Hall Pitched Slate Roof */}
        <polygon points="40,77.4 120,78 132,52.6 52,52" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />

        {/* Right Hall Front */}
        <polygon points="160,139 240,139.6 240,79 160,78.4" fill="url(#dcBrickGrad)" stroke="#7f1d1d" strokeWidth="1" />
        {/* Right Hall Roof */}
        <polygon points="160,78.4 240,79 252,53.6 172,53" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />

        {/* Mullioned Tudor Windows */}
        {[0, 1].map((r) => (
          <g key={`tudor-r-${r}`}>
            {[0, 1, 2].map((c) => (
              <polygon
                key={`dc-lw-${r}-${c}`}
                points={`${48 + c * 22},${124 - r * 28} ${62 + c * 22},${124.2 - r * 28} ${62 + c * 22},${104.2 - r * 28} ${48 + c * 22},${104 - r * 28}`}
                fill="#0f172a"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            ))}
            {[0, 1, 2].map((c) => (
              <polygon
                key={`dc-rw-${r}-${c}`}
                points={`${168 + c * 22},${125 - r * 28} ${182 + c * 22},${125.2 - r * 28} ${182 + c * 22},${105.2 - r * 28} ${168 + c * 22},${105 - r * 28}`}
                fill="#0f172a"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            ))}
          </g>
        ))}
      </g>

      {/* ---------------- 3. ICONIC VICTORIAN CLOCK TOWER ---------------- */}
      <g>
        {/* Central Tower Shaft */}
        <polygon points="118,136 162,136.4 162,34 118,33.6" fill="url(#dcBrickGrad)" stroke="#7f1d1d" strokeWidth="1.2" />
        {/* Right Shaded Tower Side */}
        <polygon points="162,136.4 162,34 172,14.4 172,116.8" fill="url(#dcShadedBrick)" stroke="#450a0a" strokeWidth="1" />

        {/* Stone Quoins on Tower Corners */}
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <rect key={`quoin-${k}`} x="117" y={40 + k * 14} width="4" height="6" fill="#f8fafc" />
        ))}

        {/* Clock Stage (Portland Stone Chamber) */}
        <polygon points="114,56 166,56.4 166,28.4 114,28" fill="url(#dcStoneGrad)" stroke="#64748b" strokeWidth="1" />

        {/* Four-Face Victorian Clock Dial */}
        <circle cx="140" cy="42" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        <circle cx="140" cy="42" r="8.5" fill="#fef08a" />
        {/* Clock Hands pointing to 10:10 */}
        <line x1="140" y1="42" x2="136" y2="38" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="140" y1="42" x2="144" y2="36" stroke="#0f172a" strokeWidth="1" />

        {/* Tower Battlements (Crenellations) */}
        <polygon points="112,28 168,28.4 168,22.4 112,22" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
        <rect x="116" y="18" width="6" height="5" fill="#f8fafc" />
        <rect x="130" y="18" width="6" height="5" fill="#f8fafc" />
        <rect x="144" y="18" width="6" height="5" fill="#f8fafc" />
        <rect x="158" y="18" width="6" height="5" fill="#f8fafc" />

        {/* Copper Verdigris Spire */}
        <polygon points="126,22 154,22.2 140,2" fill="#0d9488" stroke="#042f2e" strokeWidth="1" />
        {/* Weather Vane */}
        <line x1="140" y1="2" x2="140" y2="-4" stroke="#eab308" strokeWidth="1" />
        <polygon points="138,-4 144,-4 140,-7" fill="#eab308" />

        {/* Gothic Arched Entrance Doorway */}
        <polygon points="130,136 150,136.2 150,114.2 130,114" fill="#1e1b4b" stroke="#ffffff" strokeWidth="1" />
        <path d="M 130,114 Q 140,106 150,114.2 Z" fill="#1e1b4b" stroke="#ffffff" strokeWidth="1" />
      </g>

      {/* Floating Status Badge */}
      <g transform="translate(140, 186)">
        <rect x="-95" y="-10" width="190" height="18" rx="9" fill="#14532d" stroke="#22c55e" strokeWidth="1.5" />
        <text x="0" y="2.5" fill="#86efac" fontSize="8" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
          🦁 DESERT ROSE COLLEGE
        </text>
      </g>
    </svg>
  );
};

// ============================================================================
// 5. FOUNDATION ACADEMY (id gems-wellington) — 3D ROYAL ACADEMY PAVILION
// ============================================================================
export const GEMSWellington3DCampus: React.FC<AcademicCampus3DProps> = ({
  width = 280,
  height = 200,
  className = "",
}) => {
  return (
    <svg
      viewBox="0 0 280 200"
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`drop-shadow-2xl cursor-pointer hover:scale-[1.04] transition-transform origin-bottom select-none ${className}`}
    >
      <defs>
        {/* Royal Blue Academy Gradient */}
        <linearGradient id="gemsBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="50%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>

        {/* Modern White Facade */}
        <linearGradient id="gemsWhiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Crown Gold Gradient */}
        <linearGradient id="gemsCrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>

        {/* Academy Courtyard Paving */}
        <linearGradient id="gemsCourtyard" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* ---------------- 1. ISOMETRIC COURTYARD & PALM PROMENADE ---------------- */}
      <g>
        <polygon
          points="20,172 260,174 278,98 38,96"
          fill="url(#gemsCourtyard)"
          stroke="#2563eb"
          strokeWidth="1.5"
        />
        <polygon points="20,172 260,174 260,181 20,179" fill="#1e3a8a" />
        <polygon points="260,174 278,98 278,105 260,181" fill="#0f172a" />

        {/* Student Garden Parterres */}
        <polygon points="40,165 95,165.5 105,145 50,144.5" fill="#86efac" stroke="#16a34a" strokeWidth="0.8" />
        <polygon points="185,166 240,166.5 250,146 195,145.5" fill="#86efac" stroke="#16a34a" strokeWidth="0.8" />
      </g>

      {/* ---------------- 2. CURVED MODERN CLASSROOM WINGS ---------------- */}
      <g>
        {/* Left Wing Front */}
        <polygon points="45,138 110,138.5 110,76 45,75.5" fill="url(#gemsWhiteGrad)" stroke="#2563eb" strokeWidth="1" />
        {/* Shaded Side (on the right wing's right edge: buildings show front and right) */}
        <polygon points="235,139.5 235,77 248,51.5 248,114" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
        {/* Left Wing Roof */}
        <polygon points="45,75.5 110,76 123,50.5 58,50" fill="#1e40af" stroke="#1d4ed8" strokeWidth="0.8" />

        {/* Right Wing Front */}
        <polygon points="170,139 235,139.5 235,77 170,76.5" fill="url(#gemsWhiteGrad)" stroke="#2563eb" strokeWidth="1" />
        {/* Right Wing Roof */}
        <polygon points="170,76.5 235,77 248,51.5 183,51" fill="#1e40af" stroke="#1d4ed8" strokeWidth="0.8" />

        {/* Panoramic Learning Studio Windows with Colourful Shading Louvers */}
        {[0, 1].map((r) => (
          <g key={`gems-w-${r}`}>
            <polygon
              points={`52,${126 - r * 26} 102,${126.3 - r * 26} 102,${108.3 - r * 26} 52,${108 - r * 26}`}
              fill="url(#gemsBlueGrad)"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
            <polygon
              points={`178,${127 - r * 26} 228,${127.3 - r * 26} 228,${109.3 - r * 26} 178,${109 - r * 26}`}
              fill="url(#gemsBlueGrad)"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
          </g>
        ))}
      </g>

      {/* ---------------- 3. CENTRAL INTERNATIONAL ROTUNDA PAVILION ---------------- */}
      <g>
        {/* Central Cylindrical Atrium Drum */}
        <polygon points="100,135 180,135.6 180,68 100,67.4" fill="url(#gemsWhiteGrad)" stroke="#1e40af" strokeWidth="1.2" />

        {/* Expansive Double-Height Glass Curtain */}
        <polygon points="108,135.1 172,135.5 172,82.5 108,82.1" fill="url(#gemsBlueGrad)" stroke="#38bdf8" strokeWidth="1" />

        {/* Royal Blue Canopy Arch */}
        <path d="M 96,68 Q 140,42 184,68.6 Z" fill="url(#gemsBlueGrad)" stroke="#facc15" strokeWidth="1.5" />

        {/* Golden Crown Pavilion Finial */}
        <g transform="translate(140, 36)">
          <polygon points="-8,8 8,8 6,0 0,3 -6,0" fill="url(#gemsCrownGrad)" stroke="#ca8a04" strokeWidth="0.8" />
          <circle cx="-6" cy="-1" r="1.5" fill="#fef08a" />
          <circle cx="0" cy="2" r="1.5" fill="#fef08a" />
          <circle cx="6" cy="-1" r="1.5" fill="#fef08a" />
        </g>
      </g>

      {/* ---------------- 4. LANDSCAPED CAMPUS PALMS ---------------- */}
      <g transform="translate(36, 150)">
        <path d="M 0,0 Q 2,-14 -1,-26" fill="none" stroke="#78350f" strokeWidth="2.2" />
        <path d="M -1,-26 Q -10,-32 -16,-26" fill="none" stroke="#15803d" strokeWidth="1.6" />
        <path d="M -1,-26 Q 8,-34 14,-28" fill="none" stroke="#16a34a" strokeWidth="1.6" />
      </g>
      <g transform="translate(244, 152)">
        <path d="M 0,0 Q -2,-14 1,-26" fill="none" stroke="#78350f" strokeWidth="2.2" />
        <path d="M 1,-26 Q -8,-34 -14,-28" fill="none" stroke="#16a34a" strokeWidth="1.6" />
        <path d="M 1,-26 Q 10,-32 16,-26" fill="none" stroke="#15803d" strokeWidth="1.6" />
      </g>

      {/* Floating Status Badge */}
      <g transform="translate(140, 186)">
        <rect x="-95" y="-10" width="190" height="18" rx="9" fill="#172554" stroke="#3b82f6" strokeWidth="1.5" />
        <text x="0" y="2.5" fill="#93c5fd" fontSize="8" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
          👑 FOUNDATION ACADEMY
        </text>
      </g>
    </svg>
  );
};


// ============================================================================
// 6. DRIVING ACADEMY — SMART YARD, PARKING BAYS AND TEST OFFICE (opens /driving)
// ============================================================================
export const DrivingAcademy3DCampus: React.FC<AcademicCampus3DProps> = ({ width = 240, height = 180, className = "" }) => {
  return (
    <svg
      viewBox="0 0 280 200"
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`drop-shadow-2xl cursor-pointer hover:scale-[1.04] transition-transform origin-bottom select-none ${className}`}
    >
      <defs>
        <linearGradient id="dlAsphalt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="dlOffice" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Yard slab: front and right faces, same slant as the other campuses */}
      <polygon points="20,172 260,174 278,98 38,96" fill="url(#dlAsphalt)" stroke="#0ea5e9" strokeWidth="1.5" />
      <polygon points="20,172 260,174 260,181 20,179" fill="#1e293b" />
      <polygon points="260,174 278,98 278,105 260,181" fill="#0f172a" />

      {/* Driving lane with dashed centre line */}
      <polygon points="28,166 252,167.8 256,152 32,150.2" fill="#3f4b5e" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line key={i} x1={44 + i * 30} y1={158.4} x2={58 + i * 30} y2={158.5} stroke="#facc15" strokeWidth="1.6" />
      ))}

      {/* Parking bays (the Smart Yard) */}
      {[0, 1, 2, 3].map((i) => (
        <polygon key={i} points={`${120 + i * 32},146 ${148 + i * 32},146.2 ${159 + i * 32},104.2 ${131 + i * 32},104`} fill="none" stroke="#f8fafc" strokeWidth="1.2" />
      ))}
      {/* Target bay highlighted */}
      <polygon points="184,146.4 212,146.6 223,104.6 195,104.4" fill="#22c55e44" stroke="#22c55e" strokeWidth="1.4" />

      {/* Cones */}
      {[[118, 148], [186, 149], [214, 149], [228, 102], [196, 101]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x}, ${y})`}>
          <polygon points="-3,0 3,0 0.8,-7 -0.8,-7" fill="#f97316" />
          <rect x="-2" y="-4.5" width="4" height="1.2" fill="#ffffff" />
        </g>
      ))}

      {/* Learner car in a bay */}
      <g transform="translate(140, 128)">
        <polygon points="-11,8 11,8.2 15,-8 -7,-8.2" fill="#0ea5e9" stroke="#0369a1" strokeWidth="0.8" />
        <polygon points="-6,1 7,1.1 9.5,-6 -3.5,-6.1" fill="#e0f2fe" />
        <rect x="-4" y="-12" width="9" height="4" rx="1" fill="#ef4444" />
        <text x="0.5" y="-9" fill="#ffffff" fontSize="3.5" fontWeight="900" textAnchor="middle">L</text>
      </g>

      {/* Test office: front and right faces */}
      <polygon points="42,140 104,140.4 104,92 42,91.6" fill="url(#dlOffice)" stroke="#0ea5e9" strokeWidth="1" />
      <polygon points="104,140.4 104,92 115,70 115,118" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
      <polygon points="42,91.6 104,92 115,70 53,69.6" fill="#0369a1" stroke="#0284c7" strokeWidth="0.8" />
      <polygon points="50,132 96,132.3 96,104 50,103.7" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
      <rect x="66" y="118" width="14" height="22" fill="#0f172a" />
      {/* Roof sign */}
      <g transform="translate(78, 64)">
        <rect x="-26" y="-9" width="52" height="11" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />
        <text x="0" y="-1.5" fill="#7dd3fc" fontSize="6" fontWeight="900" textAnchor="middle">DRIVING</text>
      </g>

      {/* Traffic light */}
      <g transform="translate(244, 140)">
        <rect x="-1" y="-30" width="2" height="30" fill="#334155" />
        <rect x="-4" y="-44" width="8" height="16" rx="2" fill="#0f172a" />
        <circle cx="0" cy="-40" r="2" fill="#ef4444" />
        <circle cx="0" cy="-35" r="2" fill="#facc15" opacity="0.35" />
        <circle cx="0" cy="-30.5" r="2" fill="#22c55e" opacity="0.35" />
      </g>

      {/* Floating status badge */}
      <g transform="translate(140, 186)">
        <rect x="-80" y="-10" width="160" height="18" rx="9" fill="#082f49" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="0" y="2.5" fill="#7dd3fc" fontSize="8" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
          🚗 DRIVING ACADEMY
        </text>
      </g>
    </svg>
  );
};

// ============================================================================
// MAIN DISPATCHER COMPONENT FOR MAP ICONS
// ============================================================================
export function AcademicCampusTile({ loc, width = 280, height = 200 }: { loc: any; width?: number; height?: number }) {
  const campusId = loc?.campus || 'onebrain';

  if (campusId === 'onebrain') {
    return <OneBrain3DCampus width={width} height={height} />;
  }
  if (campusId === 'aud') {
    return <AUD3DCampus width={width} height={height} />;
  }
  if (campusId === 'ud') {
    return <UD3DCampus width={width} height={height} />;
  }
  if (campusId === 'dc') {
    return <DubaiCollege3DCampus width={width} height={height} />;
  }
  if (campusId === 'driving') {
    return <DrivingAcademy3DCampus width={width} height={height} />;
  }
  if (campusId === 'gems-wellington') {
    return <GEMSWellington3DCampus width={width} height={height} />;
  }

  // Fallback
  return <OneBrain3DCampus width={width} height={height} />;
}
