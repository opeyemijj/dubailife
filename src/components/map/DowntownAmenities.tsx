import React from 'react';

// ============================================================================
// DOWNTOWN DUBAI 3D ISOMETRIC AMENITY COMPONENTS
// Strictly aligned to FloorTile 2.5D Isometry:
// Baseline tilt: +0.01667, Depth slant: +0.2355, Vertical elevation: straight up
// ============================================================================

export interface AmenityProps {
  width?: number;
  height?: number;
  name?: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

// ----------------------------------------------------------------------------
// 1. DUBAI OPERA (Iconic 2,000-seat Dhow-shaped Performing Arts Centre)
// ----------------------------------------------------------------------------
export const DubaiOpera: React.FC<AmenityProps> = ({
  width = 170,
  height = 125,
  name = "Dubai Opera",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 190 140" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      {/* Curved Dhow Glass Bow Gradient */}
      <linearGradient id="opera-glass-bow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="35%" stopColor="#38bdf8" />
        <stop offset="70%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#075985" />
      </linearGradient>

      {/* Titanium / Steel Hull Roof Shell */}
      <linearGradient id="opera-hull-roof" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="25%" stopColor="#f1f5f9" />
        <stop offset="60%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>

      {/* Shaded Depth Wall */}
      <linearGradient id="opera-depth-wall" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      {/* Travertine Promenade Paving */}
      <linearGradient id="opera-travertine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="50%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>

    {/* Ground Plinth (FloorTile matching: tilt +0.01667, slant +0.2355) */}
    <g>
      {/* Plinth Curb Emboss */}
      <polygon points="14,130 174,132.7 174,136 14,133.3" fill="#1e293b" />
      <polygon points="14,130 174,132.7 174,134.5 14,131.8" fill="#475569" />
      {/* Main Plaza Pavement */}
      <polygon points="14,130 174,132.7 184,98.7 24,96" fill="url(#opera-travertine)" stroke="#cbd5e1" strokeWidth="0.8" />
      {/* Plaza Arrival Fountain Pool */}
      <polygon points="28,124 64,124.6 68,108.6 32,108" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.6" />
      <line x1="48" y1="124.3" x2="48" y2="114" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
    </g>

    {/* Stage Fly Tower (The tall vertical box at the stern of the dhow) */}
    <g>
      {/* Shaded Right Flank */}
      <polygon points="168,98.8 180,98.6 180,32.6 168,32.8" fill="url(#opera-depth-wall)" />
      {/* Front Facade */}
      <polygon points="132,98.2 168,98.8 168,32.8 132,32.2" fill="url(#opera-hull-roof)" stroke="#cbd5e1" strokeWidth="0.5" />
      {/* Fly Tower Louvers */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={`fly-${i}`} x1="132" y1={44 + i * 8} x2="168" y2={44.6 + i * 8} stroke="#475569" strokeWidth="0.6" />
      ))}
    </g>

    {/* 3D Dhow Auditorium Bow (The soaring curved glass prow facing the fountain) */}
    <g>
      {/* Sweeping Glass Prow Facade */}
      <path 
        d="
          M 40 120 
          C 30 100, 36 60, 68 52 
          L 132 53 
          L 132 108 
          L 40 120 Z
        " 
        fill="url(#opera-glass-bow)" 
        stroke="#38bdf8" 
        strokeWidth="1" 
      />

      {/* Internal Timber Auditorium Shell visible through glass */}
      <path 
        d="M 64 114 Q 52 85 78 72 L 126 73 L 126 104 Z" 
        fill="#92400e" 
        opacity="0.85" 
      />

      {/* Structural Diagrid Mullions on the Glass Proscenium */}
      {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
        const x1 = 40 + ratio * 92;
        const y1 = 120 - ratio * 12;
        const x2 = 68 + ratio * 64;
        const y2 = 52 + ratio * 1;
        return (
          <line key={`diag-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
        );
      })}

      {/* Sculptural Dhow Curved Roof Shell (Upper Canopy) */}
      <path 
        d="
          M 34 116 
          C 26 88, 48 44, 76 38 
          L 138 39 
          L 132 53 
          C 68 52, 30 100, 40 120 Z
        " 
        fill="url(#opera-hull-roof)" 
        stroke="#cbd5e1" 
        strokeWidth="0.8" 
      />
      {/* Roof Crest Highlight Line */}
      <path 
        d="M 36 114 C 28 88, 50 46, 78 40 L 136 41" 
        stroke="#ffffff" 
        strokeWidth="1.2" 
        fill="none" 
        opacity="0.8" 
      />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 2. SOUK AL BAHAR (Traditional Arabesque Dining & Shopping Island)
// ----------------------------------------------------------------------------
export const SoukAlBahar: React.FC<AmenityProps> = ({
  width = 160,
  height = 115,
  name = "Souk Al Bahar",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 180 130" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="souk-sand-wall" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#d4b270" />
        <stop offset="35%" stopColor="#fde68a" />
        <stop offset="70%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="souk-wood-pergola" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="50%" stopColor="#92400e" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>
      <linearGradient id="souk-terracotta-roof" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
    </defs>

    {/* Island Quay Plinth in Burj Lake */}
    <g>
      <polygon points="12,120 168,122.6 168,126 12,123.4" fill="#0f172a" opacity="0.4" />
      <polygon points="12,120 168,122.6 178,88.6 22,86" fill="#fef3c7" stroke="#cbd5e1" strokeWidth="0.8" />
      {/* Stone Footbridge connecting to Dubai Mall & Burj Lake Promenade */}
      <polygon points="0,105 22,105.4 24,96 2,95.6" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.6" />
      <polygon points="0,105 22,105.4 22,108 0,107.6" fill="#475569" />
    </g>

    {/* Main Arabesque Souk Complex */}
    <g transform="translate(-6.3 0)">
      {/* Shaded Right Wall */}
      <polygon points="160,90.2 172,90 172,44 160,44.2" fill="#78350f" opacity="0.5" />
      {/* Front Sandstone Facades with Arches */}
      <polygon points="40,88.2 160,90.2 160,44.2 40,42.2" fill="url(#souk-sand-wall)" stroke="#ca8a04" strokeWidth="0.5" />

      {/* Traditional Windtowers (Barjeel) */}
      {[50, 110, 146].map((bx, i) => (
        <g key={`barjeel-${i}`}>
          <polygon points={`${bx},42 ${bx+12},42.2 ${bx+12},20.2 ${bx},20`} fill="url(#souk-sand-wall)" stroke="#ca8a04" strokeWidth="0.5" />
          <rect x={bx+3} y={23} width="6" height="12" fill="#0f172a" opacity="0.85" rx="0.5" />
          <polygon points={`${bx-1},20 ${bx+13},20.2 ${bx+6},14`} fill="url(#souk-terracotta-roof)" />
        </g>
      ))}

      {/* Mashrabiya Lattice Carved Windows & Dining Arches */}
      {[46, 68, 90, 114, 136].map((wx, i) => (
        <g key={`arch-${i}`}>
          <path d={`M ${wx} 82 L ${wx} 62 Q ${wx+8} 54 ${wx+16} 62 L ${wx+16} 82 Z`} fill="#0f172a" />
          <path d={`M ${wx+1} 81 L ${wx+1} 63 Q ${wx+8} 56 ${wx+15} 63 L ${wx+15} 81 Z`} fill="#fef08a" opacity="0.3" />
          <line x1={wx+8} y1={56} x2={wx+8} y2={81} stroke="#ca8a04" strokeWidth="0.6" />
        </g>
      ))}

      {/* Waterfront Dining Boardwalk & Wooden Pergola Terraces */}
      <polygon points="34,106 166,108.2 162,88.2 30,86" fill="url(#souk-wood-pergola)" stroke="#451a03" strokeWidth="0.6" />
      {/* Outdoor Table Umbrellas */}
      <circle cx="48" cy="98" r="3" fill="#ffffff" />
      <circle cx="70" cy="99" r="3" fill="#ef4444" />
      <circle cx="92" cy="100" r="3" fill="#ffffff" />
      <circle cx="114" cy="101" r="3" fill="#ef4444" />
      <circle cx="136" cy="102" r="3" fill="#ffffff" />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 3. BURJ PARK (Green Island Park with Lawns & Sculpture)
// ----------------------------------------------------------------------------
export const BurjPark: React.FC<AmenityProps> = ({
  width = 170,
  height = 115,
  name = "Burj Park",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-20 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 190 130" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="bp-lawn-grass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="50%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#15803d" />
      </linearGradient>
      <linearGradient id="bp-sculpture-steel" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>
    </defs>

    {/* Island Seawall / Lake Coping */}
    <polygon points="12,120 174,122.7 174,126 12,123.3" fill="#0f172a" opacity="0.4" />
    <polygon points="12,120 174,122.7 184,86.7 22,84" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.8" />

    {/* Lush Green Park Lawn Island (Matches FloorTile slant & tilt) */}
    <polygon points="18,116 168,118.5 178,88.5 28,86" fill="url(#bp-lawn-grass)" stroke="#16a34a" strokeWidth="0.8" />

    {/* Granite Promenade Walkways */}
    <polygon points="34,115 152,117 154,111 36,109" fill="#f8fafc" />
    <polygon points="90,116 100,116.2 108,87.2 98,87" fill="#f8fafc" />

    {/* "Wings of Mexico" World-Famous Sculpture on Plinth */}
    <g>
      {/* Stone Pedestal */}
      <polygon points="92,102 106,102.2 108,94.2 94,94" fill="#64748b" />
      {/* Left Angel Wing */}
      <path d="M 97 94 C 92 84, 86 68, 92 60 C 96 68, 96 82, 98 94 Z" fill="url(#bp-sculpture-steel)" stroke="#cbd5e1" strokeWidth="0.5" />
      {/* Right Angel Wing */}
      <path d="M 101 94 C 106 84, 112 68, 106 60 C 102 68, 102 82, 100 94 Z" fill="url(#bp-sculpture-steel)" stroke="#cbd5e1" strokeWidth="0.5" />
      {/* Central Frame Stanchion */}
      <line x1="99" y1="94" x2="99" y2="72" stroke="#334155" strokeWidth="0.8" />
    </g>

    {/* Landscaped Date Palms around Island */}
    {[36, 62, 80, 124, 148, 164].map((px, i) => (
      <g key={`palm-${i}`}>
        <line x1={px} y1={102} x2={px} y2={92} stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx={px} cy={90} r="4.5" fill="#15803d" />
        <circle cx={px} cy={89} r="3.2" fill="#22c55e" />
      </g>
    ))}
  </svg>
);

// ----------------------------------------------------------------------------
// 4. ADDRESS DOWNTOWN (63-story Postmodern Supertall Hotel & Residences)
// ----------------------------------------------------------------------------
export const AddressDowntown: React.FC<AmenityProps> = ({
  width = 110,
  height = 270,
  name = "Address Downtown",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 130 310" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="ad-titanium-face" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#f8fafc" />
        <stop offset="70%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="ad-depth-side" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="50%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="ad-glass-strip" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
    </defs>

    {/* Ground Plinth */}
    <polygon points="12,298 116,299.7 122,283.7 18,282" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
    <polygon points="16,297 112,298.6 116,284.6 20,283" fill="#f8fafc" />

    {/* 3D Supertall Tower */}
    <g transform="translate(-3.4 0)">
      {/* Right Shaded Depth Facade */}
      <polygon points="96,285.5 108,284 108,42 96,43.5" fill="url(#ad-depth-side)" />
      {/* Sunlit Curved Front Facade */}
      <polygon points="38,284.5 96,285.5 96,43.5 38,42.5" fill="url(#ad-titanium-face)" stroke="#cbd5e1" strokeWidth="0.6" />

      {/* Central Cyan Tinted Glass Curtain Wall Ribbon */}
      <polygon points="54,284.8 80,285.2 80,43.2 54,42.8" fill="url(#ad-glass-strip)" opacity="0.85" />

      {/* Floor Bands */}
      {Array.from({ length: 22 }).map((_, i) => (
        <line key={`ad-fl-${i}`} x1="38" y1={52 + i * 10.5} x2="96" y2={53 + i * 10.5} stroke="#64748b" strokeWidth="0.6" opacity="0.5" />
      ))}

      {/* Stepped Architectural Crown & Spire */}
      <polygon points="44,42.5 90,43.5 86,22.5 48,21.5" fill="url(#ad-titanium-face)" stroke="#94a3b8" strokeWidth="0.6" />
      <polygon points="56,21.5 78,22 76,10 58,9.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
      <line x1="67" y1="10" x2="67" y2="2" stroke="#ffffff" strokeWidth="1.2" />
      <circle cx="67" cy="1" r="1.5" fill="#ef4444" className="animate-pulse" />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 5. ADDRESS SKY VIEW (Twin Towers with Iconic SkyBridge & CÉ LA VI)
// ----------------------------------------------------------------------------
export const AddressSkyView: React.FC<AmenityProps> = ({
  width = 160,
  height = 230,
  name = "Address Sky View & CÉ LA VI",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 190 270" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="asv-glass" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="35%" stopColor="#38bdf8" />
        <stop offset="70%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#075985" />
      </linearGradient>
      <linearGradient id="asv-steel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>

    {/* Ground Plinth */}
    <polygon points="14,258 174,260.7 182,242.7 22,240" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
    <polygon points="18,257 170,259.5 178,243.5 26,241" fill="#f8fafc" />

    {/* TOWER 1 (Left Tower, 260m) */}
    <g>
      <polygon points="76,243 86,241.5 86,47.5 76,49" fill="#1e293b" />
      <polygon points="42,242.5 76,243 76,49 42,48.5" fill="url(#asv-glass)" stroke="#38bdf8" strokeWidth="0.5" />
      {Array.from({ length: 18 }).map((_, i) => (
        <line key={`asv1-${i}`} x1="42" y1={58 + i * 10} x2="76" y2={58.5 + i * 10} stroke="#ffffff" strokeWidth="0.5" opacity="0.6" />
      ))}
    </g>

    {/* TOWER 2 (Right Tower, 237m) */}
    <g>
      <polygon points="158,244 168,242.5 168,53.5 158,55" fill="#1e293b" />
      <polygon points="124,243.5 158,244 158,55 124,54.5" fill="url(#asv-glass)" stroke="#38bdf8" strokeWidth="0.5" />
      {Array.from({ length: 18 }).map((_, i) => (
        <line key={`asv2-${i}`} x1="124" y1={64 + i * 10} x2="158" y2={64.5 + i * 10} stroke="#ffffff" strokeWidth="0.5" opacity="0.6" />
      ))}
    </g>

    {/* 3-STORY CONNECTING SKYBRIDGE (Home to CÉ LA VI, Sky Views Pool & Glass Walk) */}
    <g>
      {/* Sky Bridge Main Structure spanning across the two towers */}
      <polygon points="28,48 168,50.3 168,26.3 28,24" fill="url(#asv-steel)" stroke="#cbd5e1" strokeWidth="0.8" />
      {/* Infinity Pool on the Sky Bridge Top */}
      <polygon points="36,25 160,27 164,18 40,16" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.6" />
      {/* CÉ LA VI Red Umbrella & Sky Lounge */}
      <circle cx="98" cy="20" r="2.8" fill="#ef4444" />
      <circle cx="108" cy="21" r="2.8" fill="#ffffff" />
      {/* Panoramic Glass Floor Ribbon along the bridge */}
      <polygon points="32,42 164,44.2 164,36.2 32,34" fill="url(#asv-glass)" stroke="#ffffff" strokeWidth="0.5" />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 6. PALACE DOWNTOWN & THE SPA (Heritage Arabesque Resort & Spa on Burj Lake)
// ----------------------------------------------------------------------------
export const PalaceDowntown: React.FC<AmenityProps> = ({
  width = 160,
  height = 115,
  name = "Palace Downtown & Spa",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 180 130" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="palace-sand" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#eab308" />
        <stop offset="35%" stopColor="#fef08a" />
        <stop offset="70%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="palace-pool" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
    </defs>

    {/* Island Grounds Plinth */}
    <polygon points="12,120 168,122.6 178,92.6 22,90" fill="#fef3c7" stroke="#cbd5e1" strokeWidth="0.8" />

    {/* Palace Main Building */}
    <g transform="translate(-2.6 0)">
      {/* Shaded Side */}
      <polygon points="150,94 162,93.8 162,49.8 150,50" fill="#78350f" opacity="0.5" />
      {/* Front Facade with Arched Loggia */}
      <polygon points="42,92.2 150,94 150,50 42,48.2" fill="url(#palace-sand)" stroke="#ca8a04" strokeWidth="0.5" />

      {/* Central Grand Arabesque Dome */}
      <path d="M 86 50 Q 96 28 106 50 Z" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.8" />
      <line x1="96" y1="28" x2="96" y2="20" stroke="#ca8a04" strokeWidth="1" />
      <circle cx="96" cy="19" r="1.5" fill="#facc15" />

      {/* Flanking Side Domes */}
      <path d="M 52 49 Q 58 35 64 49 Z" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.6" />
      <path d="M 128 50 Q 134 36 140 50 Z" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.6" />

      {/* Palace Courtyard Reflecting Pool & The Spa at Palace Downtown */}
      <polygon points="62,114 130,115.1 134,98.1 66,97" fill="url(#palace-pool)" stroke="#ffffff" strokeWidth="0.8" />
      <line x1="96" y1="114" x2="96" y2="104" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />

      {/* Palm Trees in Palace Courtyard */}
      {[46, 146].map((px, i) => (
        <g key={`ppalm-${i}`}>
          <line x1={px} y1={108} x2={px} y2={96} stroke="#78350f" strokeWidth="1.4" />
          <circle cx={px} cy={94} r="5" fill="#15803d" />
        </g>
      ))}
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 7. DUBAI FOUNTAIN (World's Largest Choreographed Fountain in Burj Lake)
// ----------------------------------------------------------------------------
export const DubaiFountain: React.FC<AmenityProps> = ({
  width = 220,
  height = 120,
  name = "The Dubai Fountain",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 240 140" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="fountain-lake" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="50%" stopColor="#0369a1" />
        <stop offset="100%" stopColor="#075985" />
      </linearGradient>
      <linearGradient id="water-jet-glow" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#e0f2fe" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
      </linearGradient>
      <filter id="fountain-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Lake Water Basin (FloorTile Isometry: slant +0.2355, tilt +0.01667) */}
    <g>
      {/* Outer Basin Stone Edge */}
      <polygon points="15,125 215,128.3 227,82.3 27,79" fill="#0c4a6e" />
      <polygon points="15,122 215,125.3 227,79.3 27,76" fill="#0284c7" />
      {/* Main Shimmering Water Body */}
      <polygon points="18,121 212,124.2 224,80.2 30,77" fill="url(#fountain-lake)" stroke="#38bdf8" strokeWidth="1" />
    </g>

    {/* Fountain Arc Rings & High-Pressure Shooters */}
    <g filter="url(#fountain-glow)">
      {/* Central High Shooter Jets (500ft illuminated vertical streams) */}
      <path d="M 115 110 Q 120 20 125 110" fill="none" stroke="url(#water-jet-glow)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 118 108 L 120 12 L 122 108" fill="url(#water-jet-glow)" opacity="0.95" />
      <circle cx="120" cy="12" r="3" fill="#ffffff" />

      {/* Flanking Secondary Arcs Left */}
      <path d="M 65 105 Q 85 45 105 106" fill="none" stroke="url(#water-jet-glow)" strokeWidth="2" strokeLinecap="round" />
      <path d="M 45 102 Q 65 55 85 104" fill="none" stroke="url(#water-jet-glow)" strokeWidth="1.6" strokeLinecap="round" />

      {/* Flanking Secondary Arcs Right */}
      <path d="M 135 107 Q 155 45 175 108" fill="none" stroke="url(#water-jet-glow)" strokeWidth="2" strokeLinecap="round" />
      <path d="M 155 108 Q 175 55 195 109" fill="none" stroke="url(#water-jet-glow)" strokeWidth="1.6" strokeLinecap="round" />

      {/* Nozzle Rings on Lake Surface */}
      <ellipse cx="120" cy="103" rx="30" ry="10" fill="none" stroke="#7dd3fc" strokeWidth="1" strokeDasharray="3 3" />
      <ellipse cx="65" cy="100" rx="18" ry="6" fill="none" stroke="#7dd3fc" strokeWidth="0.8" strokeDasharray="2 2" />
      <ellipse cx="175" cy="103" rx="18" ry="6" fill="none" stroke="#7dd3fc" strokeWidth="0.8" strokeDasharray="2 2" />

      {/* Choreographed Light Points */}
      {[50, 65, 80, 105, 120, 135, 160, 175, 190].map((lx, i) => (
        <circle key={`fl-${i}`} cx={lx} cy={100 + (lx > 120 ? 3 : 1)} r="1.5" fill="#fef08a" />
      ))}
    </g>

    {/* Lake Promenade Boardwalk Edge */}
    <line x1="16" y1="126" x2="216" y2="129.3" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ----------------------------------------------------------------------------
// 8. TIME OUT MARKET DUBAI (Gourmet Food Hall & Waterside Terrace)
// ----------------------------------------------------------------------------
export const TimeOutMarket: React.FC<AmenityProps> = ({
  width = 135,
  height = 95,
  name = "Time Out Market Dubai",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 140 100" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="tom-brick" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
    </defs>
    {/* Base Plot */}
    <polygon points="10,90 126,92 134,68 18,66" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" />
    <polygon points="10,90 126,92 126,94 10,92" fill="#94a3b8" />

    {/* Building Box */}
    <g transform="translate(-1.3 0)">
      {/* Right Shaded Wall */}
      <polygon points="114,71.5 122,71.4 122,37.4 114,37.5" fill="#451a03" />
      {/* Front Facade */}
      <polygon points="30,70.1 114,71.5 114,37.5 30,36.1" fill="url(#tom-brick)" stroke="#78350f" strokeWidth="0.8" />

      {/* Time Out Red Marquee Sign */}
      <rect x="42" y="42" width="60" height="12" fill="#dc2626" rx="2" stroke="#ffffff" strokeWidth="0.5" />
      <text x="72" y="51" fill="#ffffff" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        TIME OUT MARKET
      </text>

      {/* Arched Food Hall Entrances & Warm Interior Lighting */}
      {[36, 56, 76, 96].map((ax, i) => (
        <path key={`toma-${i}`} d={`M ${ax} 69 L ${ax} 58 Q ${ax + 6} 53 ${ax + 12} 58 L ${ax + 12} 69 Z`} fill="#fef08a" stroke="#451a03" strokeWidth="0.5" />
      ))}

      {/* Outdoor Waterside Pergola & Dining Umbrellas */}
      <g>
        {/* Shaded Timber Pergola */}
        <polygon points="18,88 50,88.5 54,74.5 22,74" fill="#d97706" opacity="0.3" />
        <line x1="22" y1="74" x2="22" y2="88" stroke="#78350f" strokeWidth="1.2" />
        <line x1="50" y1="74.5" x2="50" y2="88.5" stroke="#78350f" strokeWidth="1.2" />

        {/* Dining Umbrellas */}
        {[30, 42].map((ux, i) => (
          <g key={`tumu-${i}`}>
            <line x1={ux} y1={86} x2={ux} y2={76} stroke="#475569" strokeWidth="1" />
            <path d={`M ${ux - 7} 77 Q ${ux} 70 ${ux + 7} 77 Z`} fill="#dc2626" stroke="#ffffff" strokeWidth="0.5" />
          </g>
        ))}
      </g>
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 9. THE GUILD (High-End Downtown Culinary Collective & Dining Room)
// ----------------------------------------------------------------------------
export const TheGuild: React.FC<AmenityProps> = ({
  width = 135,
  height = 95,
  name = "The Guild",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 140 100" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="guild-bronze" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="50%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="guild-obsidian" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>
    {/* Base Granite Paver */}
    <polygon points="12,90 126,92 134,68 20,66" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.8" />
    <polygon points="12,90 126,92 126,94 12,92" fill="#64748b" />

    {/* Building Body */}
    <g transform="translate(-2.3 0)">
      {/* Side Wall */}
      <polygon points="116,71.5 124,71.4 124,33.4 116,33.5" fill="#0f172a" />
      {/* Front Architectural Bronze Facade */}
      <polygon points="32,70.1 116,71.5 116,33.5 32,32.1" fill="url(#guild-obsidian)" stroke="#d97706" strokeWidth="0.8" />

      {/* Bronze Portal Frame & Marquee */}
      <rect x="42" y="38" width="64" height="12" fill="url(#guild-bronze)" rx="2" />
      <text x="74" y="47" fill="#0f172a" fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="sans-serif">
        THE GUILD
      </text>

      {/* Amber Glowing Interior Panes (Dining Room & Salon) */}
      {[38, 56, 74, 92].map((gx, i) => (
        <rect key={`g-win-${i}`} x={gx} y="54" width="14" height="15" fill="#fef08a" stroke="#d97706" strokeWidth="0.6" rx="1" opacity="0.9" />
      ))}

      {/* Brass Valet Canopy */}
      <polygon points="62,70.5 86,71 88,64 64,63.5" fill="url(#guild-bronze)" />
      <line x1="64" y1="70.5" x2="64" y2="76" stroke="#b45309" strokeWidth="1" />
      <line x1="86" y1="71" x2="86" y2="76.5" stroke="#b45309" strokeWidth="1" />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 10. ARMANI/PRIVÉ (Exclusive Super-Luxe Nightclub at Burj Khalifa)
// ----------------------------------------------------------------------------
export const ArmaniPrive: React.FC<AmenityProps> = ({
  width = 120,
  height = 90,
  name = "Armani/Privé",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 130 95" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="armani-black" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#18181b" />
        <stop offset="50%" stopColor="#09090b" />
        <stop offset="100%" stopColor="#000000" />
      </linearGradient>
      <linearGradient id="armani-gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ca8a04" />
        <stop offset="50%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>
    </defs>
    {/* Base Dark Floor */}
    <polygon points="12,86 118,87.8 126,65.8 20,64" fill="#27272a" stroke="#52525b" strokeWidth="0.8" />
    <polygon points="12,86 118,87.8 118,90 12,88.2" fill="#09090b" />

    {/* Obsidian Monolith Cube Pavilion */}
    <g transform="translate(-3.1 0)">
      {/* Side Shaded Wall */}
      <polygon points="108,68.3 116,68.2 116,28.2 108,28.3" fill="#000000" />
      {/* Front Facade */}
      <polygon points="34,67.1 108,68.3 108,28.3 34,27.1" fill="url(#armani-black)" stroke="#ca8a04" strokeWidth="0.8" />

      {/* Gold Illuminated Strip Accents */}
      <line x1="34" y1="28" x2="108" y2="29.2" stroke="url(#armani-gold)" strokeWidth="1.5" />
      <line x1="71" y1="28.6" x2="71" y2="67.7" stroke="url(#armani-gold)" strokeWidth="0.8" />

      {/* Armani/Privé Luxury Badge */}
      <rect x="44" y="35" width="54" height="12" fill="#000000" stroke="url(#armani-gold)" strokeWidth="0.8" rx="2" />
      <text x="71" y="44" fill="#fef08a" fontSize="6.5" fontWeight="900" textAnchor="middle" letterSpacing="1" fontFamily="sans-serif">
        ARMANI / PRIVÉ
      </text>

      {/* VIP Velvet Ropes & Red Carpet Entrance */}
      <polygon points="62,78 80,78.3 82,68 64,67.7" fill="#dc2626" />
      <circle cx="60" cy="74" r="1.5" fill="#facc15" />
      <circle cx="82" cy="74.4" r="1.5" fill="#facc15" />
      <path d="M 60 74 Q 71 78 82 74.4" fill="none" stroke="#dc2626" strokeWidth="1.2" />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 11. DUBAI AQUARIUM & UNDERWATER ZOO
// ----------------------------------------------------------------------------
export const DubaiAquarium: React.FC<AmenityProps> = ({
  width = 135,
  height = 95,
  name = "Dubai Aquarium & Underwater Zoo",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 140 100" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="aqua-tank" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="50%" stopColor="#0369a1" />
        <stop offset="100%" stopColor="#082f49" />
      </linearGradient>
    </defs>
    {/* Base Plinth */}
    <polygon points="12,90 126,92 134,68 20,66" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />

    {/* Aquarium Glass Tunnel Pavilion */}
    <g>
      {/* Side Wall */}
      <polygon points="114,71.5 122,71.4 122,37.4 114,37.5" fill="#075985" />
      {/* Front Facade */}
      <polygon points="30,70.1 114,71.5 114,37.5 30,36.1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />

      {/* Massive 10-Million Liter Acrylic Tank Viewport */}
      <rect x="36" y="44" width="72" height="23" fill="url(#aqua-tank)" rx="3" stroke="#38bdf8" strokeWidth="1" />

      {/* Silhouettes of Marine Life (Sharks, Rays) */}
      <path d="M 50 54 Q 56 50 62 55 Q 56 57 50 54 Z" fill="#38bdf8" opacity="0.8" />
      <path d="M 80 50 Q 86 46 92 51 Q 86 53 80 50 Z" fill="#7dd3fc" opacity="0.7" />
      {/* Ray */}
      <path d="M 68 60 Q 73 57 78 60 Q 73 64 68 60 Z" fill="#e0f2fe" opacity="0.75" />

      {/* Header Sign */}
      <rect x="42" y="34" width="60" height="9" fill="#0284c7" rx="1.5" />
      <text x="72" y="41" fill="#ffffff" fontSize="5.5" fontWeight="900" textAnchor="middle" letterSpacing="0.8" fontFamily="sans-serif">
        DUBAI AQUARIUM
      </text>
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 12. BLU DUBAI NIGHTCLUB (Multi-Level Mega Club Lounge)
// ----------------------------------------------------------------------------
export const BluDubaiClub: React.FC<AmenityProps> = ({
  width = 120,
  height = 90,
  name = "BLU Dubai Nightclub",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 130 95" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="blu-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="60%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
    </defs>
    {/* Base Platform */}
    <polygon points="12,86 118,87.8 126,65.8 20,64" fill="#0f172a" stroke="#0284c7" strokeWidth="0.8" />
    <polygon points="12,86 118,87.8 118,90 12,88.2" fill="#0284c7" opacity="0.6" />

    {/* Club Architecture */}
    <g transform="translate(-3.1 0)">
      <polygon points="108,68.3 116,68.2 116,26.2 108,26.3" fill="#020617" />
      <polygon points="34,67.1 108,68.3 108,26.3 34,25.1" fill="url(#blu-gradient)" stroke="#38bdf8" strokeWidth="1" />

      {/* Cyber Blue Neon Grid & Laser Lights */}
      <line x1="34" y1="26" x2="108" y2="27.2" stroke="#38bdf8" strokeWidth="2" />
      <line x1="34" y1="46" x2="108" y2="47.2" stroke="#7dd3fc" strokeWidth="0.8" strokeDasharray="4 2" />

      {/* BLU DUBAI Marquee Sign */}
      <rect x="42" y="32" width="58" height="13" fill="#020617" stroke="#38bdf8" strokeWidth="1" rx="2" />
      <text x="71" y="42" fill="#38bdf8" fontSize="7.5" fontWeight="900" textAnchor="middle" letterSpacing="1.5" fontFamily="sans-serif">
        BLU DUBAI
      </text>

      {/* Entrance Laser Beams */}
      <polygon points="60,78 82,78.3 84,67.3 62,67" fill="#0369a1" opacity="0.6" />
      <line x1="62" y1="67" x2="52" y2="20" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      <line x1="82" y1="67.3" x2="92" y2="20" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 13. 1OAK DUBAI (1 of a Kind Luxury Nightclub)
// ----------------------------------------------------------------------------
export const OneOakClub: React.FC<AmenityProps> = ({
  width = 120,
  height = 90,
  name = "1OAK Dubai",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 130 95" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="oneoak-gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="50%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    {/* Base Platform */}
    <polygon points="12,86 118,87.8 126,65.8 20,64" fill="#18181b" stroke="#3f3f46" strokeWidth="0.8" />
    <polygon points="12,86 118,87.8 118,90 12,88.2" fill="#f59e0b" opacity="0.5" />

    {/* Monolith Cube Facade */}
    <g transform="translate(-3.1 0)">
      <polygon points="108,68.3 116,68.2 116,26.2 108,26.3" fill="#09090b" />
      <polygon points="34,67.1 108,68.3 108,26.3 34,25.1" fill="#18181b" stroke="#f59e0b" strokeWidth="0.8" />

      {/* Signature 1OAK Geometric Slats */}
      {[38, 48, 58, 68, 78, 88, 98].map((sx, i) => (
        <line key={`oak-slat-${i}`} x1={sx} y1="26" x2={sx + 4} y2="67.5" stroke="#27272a" strokeWidth="1" />
      ))}

      {/* 1OAK Marquee Badge */}
      <rect x="44" y="33" width="54" height="14" fill="#09090b" stroke="url(#oneoak-gold)" strokeWidth="1" rx="2" />
      <text x="71" y="44" fill="#fef08a" fontSize="8" fontWeight="900" textAnchor="middle" letterSpacing="2" fontFamily="sans-serif">
        1 O A K
      </text>

      {/* VIP Amber Lights */}
      <circle cx="56" cy="60" r="1.5" fill="#f59e0b" />
      <circle cx="71" cy="60" r="1.5" fill="#f59e0b" />
      <circle cx="86" cy="60" r="1.5" fill="#f59e0b" />

      {/* Red Carpet */}
      <polygon points="62,78 80,78.3 82,67.3 64,67" fill="#dc2626" />
    </g>
  </svg>
);

// ----------------------------------------------------------------------------
// 14. TING IRIE (Iconic Jamaican Restaurant, Lounge & Reggae Nightclub)
// ----------------------------------------------------------------------------
export const TingIrie: React.FC<AmenityProps> = ({
  width = 130,
  height = 95,
  name = "Ting Irie Jamaican Lounge & Club",
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30 select-none",
  onClick,
  style
}) => (
  <svg 
    viewBox="0 0 140 100" 
    preserveAspectRatio="none"
    style={{ width: `${width}px`, height: `${height}px`, ...style }} 
    className={className}
    onClick={onClick}
  >
    <defs>
      <linearGradient id="ting-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="50%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>
      <linearGradient id="ting-timber" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#292524" />
        <stop offset="100%" stopColor="#0c0a09" />
      </linearGradient>
    </defs>
    {/* Base Stone Plinth */}
    <polygon points="10,90 126,92 134,68 18,66" fill="#1c1917" stroke="#44403c" strokeWidth="0.8" />
    <polygon points="10,90 126,92 126,94 10,92" fill="#eab308" opacity="0.6" />

    {/* Tropical Modern Pavilion Facade */}
    <g transform="translate(-1.3 0)">
      {/* Side Wall */}
      <polygon points="114,71.5 122,71.4 122,35.4 114,35.5" fill="#0c0a09" />
      {/* Front Facade */}
      <polygon points="30,70.1 114,71.5 114,35.5 30,34.1" fill="url(#ting-timber)" stroke="#facc15" strokeWidth="0.8" />

      {/* Reggae / Caribbean Tricolor Trim Banner */}
      <polygon points="30,35.5 114,36.9 114,39 30,37.6" fill="#16a34a" />
      <polygon points="30,37.6 114,39 114,41.1 30,39.7" fill="#facc15" />
      <polygon points="30,39.7 114,41.1 114,43.2 30,41.8" fill="#dc2626" />

      {/* Glowing Neon Marquee Sign: TING IRIE */}
      <rect x="38" y="44" width="68" height="15" fill="#0c0a09" rx="3" stroke="#facc15" strokeWidth="1" />
      <text x="72" y="55" fill="#facc15" fontSize="8.5" fontWeight="900" textAnchor="middle" letterSpacing="1.8" fontFamily="sans-serif">
        TING IRIE
      </text>

      {/* Tropical Island Palm & Neon Soundsystem Lights */}
      <g>
        <circle cx="44" cy="63" r="1.5" fill="#16a34a" />
        <circle cx="56" cy="63" r="1.5" fill="#facc15" />
        <circle cx="68" cy="63" r="1.5" fill="#dc2626" />
        <circle cx="80" cy="63" r="1.5" fill="#16a34a" />
        <circle cx="92" cy="63" r="1.5" fill="#facc15" />
        <circle cx="104" cy="63" r="1.5" fill="#dc2626" />
      </g>

      {/* Outdoor Caribbean Rum Bar Terrace & Pergola */}
      <g>
        {/* Palm Tree on Terrace */}
        <line x1="22" y1="84" x2="22" y2="68" stroke="#78350f" strokeWidth="1.8" />
        <circle cx="22" cy="66" r="6" fill="#15803d" />
        <circle cx="22" cy="66" r="3" fill="#22c55e" />

        {/* Terrace Umbrella */}
        <line x1="120" y1="86" x2="120" y2="74" stroke="#44403c" strokeWidth="1" />
        <path d="M 113 75 Q 120 68 127 75 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
      </g>
    </g>
  </svg>
);



