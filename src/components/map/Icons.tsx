import React from 'react';
import { MallBlock, type MallBlockProps } from './MallBlock';
import { MuseumOfFutureIcon, type MuseumOfFutureProps } from './MuseumOfFuture';
import { HotelBlock, type HotelBlockProps, HotelResortComponent } from './HotelBlock';
import { BurjKhalifa, type BurjKhalifaProps, BurjKhalifaIcon } from './BurjKhalifa';
import { FloorTile, type FloorTileProps, IslandFloorTile } from './FloorTile';
import { TallBuilding, type TallBuildingProps, type TallBuildingShape, type RoofFeature } from './TallBuilding';
import { Plot, type PlotProps, type PlotTheme } from './Plot';

export const isoToScreen = (gx: number, gy: number, originX = 150, originY = 80) => ({
  x: originX + (gx - gy) * 0.866,
  y: originY + (gx + gy) * 0.5
});

export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 2600;

export const EstateBase = ({ name }: { name: string }) => (
  <svg viewBox="0 0 320 220" className="w-[320px] h-[220px] drop-shadow-sm pointer-events-none z-0">
    <rect x="0" y="0" width="320" height="220" fill="#bbf7d0" rx="8" opacity="0.5" />
    <rect x="0" y="0" width="320" height="220" fill="none" stroke="#86efac" strokeWidth="2" rx="8" />
    <text x="160" y="210" fill="#15803d" fontSize="16" fontWeight="black" textAnchor="middle" className="tracking-widest opacity-70">{name.toUpperCase()}</text>
  </svg>
);

export interface IsometricHouseProps {
  id?: string;
  width?: number;
  height?: number;
  roofColor?: string;
  wallColor?: string;
  plotColor?: string;
  showToken?: boolean;
  name?: string;
  price?: number;
  rent?: number;
  onClick?: () => void;
  className?: string;
}

export const IsometricHouse: React.FC<IsometricHouseProps> = ({
  width = 80,
  height = 70,
  roofColor = "#22c55e",
  wallColor = "#ffffff",
  plotColor = "#f8fafc",
  showToken = false,
  name = "Villa Residence",
  onClick,
  className = ""
}) => {
  return (
    <svg 
      viewBox="0 0 100 85" 
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }} 
      className={`drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom select-none ${className}`}
      onClick={onClick}
    >
      <defs>
        {/* Roof tile gradient */}
        <linearGradient id="houseRoofFront" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={roofColor} />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        {/* Plot Paver Gradient */}
        <linearGradient id="housePlotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={plotColor} />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* ==================================================================== */}
      {/* 1. ISOMETRIC PLOT BASE UNDERNEATH (Aligned with FloorTile Isometry)   */}
      {/* ==================================================================== */}
      <g>
        {/* Upper Plot Surface */}
        <polygon 
          points="10,71 88,72.3 98,34.3 20,33" 
          fill="url(#housePlotGrad)" 
          stroke="#cbd5e1" 
          strokeWidth="0.8" 
        />
        {/* Plot Lower Side Emboss Lip (FloorTile style) */}
        <polygon 
          points="10,71 88,72.3 88,74.8 10,73.5" 
          fill="#94a3b8" 
        />
        <polygon 
          points="10,73.5 88,74.8 88,76 10,74.7" 
          fill="#000000" 
          opacity="0.12" 
        />
        {/* Front walkway / lawn accent */}
        <polygon 
          points="15,69 32,69.3 35,58.3 18,58" 
          fill="#86efac" 
          opacity="0.5" 
        />
      </g>

      {/* ==================================================================== */}
      {/* 2. HOUSE 3D VOLUMETRIC WALLS                                         */}
      {/* ==================================================================== */}
      <g>
        {/* Ground shadow beneath house */}
        <polygon points="26,64 74,64.8 80,41.8 32,41" fill="#000000" opacity="0.2" />

        {/* Front Facade (Facing South/Southeast) */}
        <polygon 
          points="28,63 74,63.8 74,41.8 28,41" 
          fill={wallColor} 
          stroke="#cbd5e1" 
          strokeWidth="0.8" 
        />

        {/* Left Side Facade (Shaded wall receding along 0.235 slant) */}
        <polygon 
          points="28,63 35,37 35,15 31.5,24 28,41" 
          fill="#cbd5e1" 
          stroke="#94a3b8" 
          strokeWidth="0.8" 
        />

        {/* Front Entrance Door */}
        <rect x="47" y="52" width="8" height="11.4" fill="#78350f" rx="0.5" />
        <rect x="48" y="53" width="6" height="5" fill="#fef3c7" opacity="0.7" />
        <circle cx="53.5" cy="58" r="0.6" fill="#facc15" />

        {/* Ground Floor Windows (Floor 1) */}
        {/* Left Window */}
        <rect x="33" y="52" width="7" height="7" fill="#0f172a" rx="0.5" />
        <rect x="33.5" y="52.5" width="6" height="6" fill="#38bdf8" opacity="0.8" />
        <line x1="36.5" y1="52.5" x2="36.5" y2="58.5" stroke="#ffffff" strokeWidth="0.5" />
        <line x1="33.5" y1="55.5" x2="39.5" y2="55.5" stroke="#ffffff" strokeWidth="0.5" />

        {/* Right Window */}
        <rect x="61" y="52.5" width="7" height="7" fill="#0f172a" rx="0.5" />
        <rect x="61.5" y="53" width="6" height="6" fill="#38bdf8" opacity="0.8" />
        <line x1="64.5" y1="53" x2="64.5" y2="59" stroke="#ffffff" strokeWidth="0.5" />
        <line x1="61.5" y1="56" x2="67.5" y2="56" stroke="#ffffff" strokeWidth="0.5" />

        {/* Upper Floor Windows (Floor 2) */}
        {/* Upper Left Window */}
        <rect x="33" y="44" width="7" height="6" fill="#0f172a" rx="0.5" />
        <rect x="33.5" y="44.5" width="6" height="5" fill="#38bdf8" opacity="0.8" />
        <line x1="36.5" y1="44.5" x2="36.5" y2="49.5" stroke="#ffffff" strokeWidth="0.5" />

        {/* Upper Right Window */}
        <rect x="61" y="44.5" width="7" height="6" fill="#0f172a" rx="0.5" />
        <rect x="61.5" y="45" width="6" height="5" fill="#38bdf8" opacity="0.8" />
        <line x1="64.5" y1="45" x2="64.5" y2="50" stroke="#ffffff" strokeWidth="0.5" />

        {/* Side Windows on shaded facade */}
        <polygon points="30,51 33,40 33,46 30,57" fill="#0284c7" opacity="0.65" />
      </g>

      {/* ==================================================================== */}
      {/* 3. 3D ISOMETRIC GABLE ROOF (EMERALD GREEN / CUSTOM)                  */}
      {/* ==================================================================== */}
      <g>
        {/* Front Slanted Roof Pitch (Facing Camera) */}
        <polygon 
          points="25,41.5 76,42.3 79,24.3 29,23.5" 
          fill="url(#houseRoofFront)" 
          stroke="#166534" 
          strokeWidth="0.8" 
        />
        {/* Roof Tiles texture lines */}
        {[0.33, 0.66].map((t, i) => {
          const y1 = 41.5 + t * (23.5 - 41.5);
          const y2 = 42.3 + t * (24.3 - 42.3);
          const x1 = 25 + t * (29 - 25);
          const x2 = 76 + t * (79 - 76);
          return <line key={`rt-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#14532d" strokeWidth="0.6" opacity="0.5" />;
        })}

        {/* Rear Slanted Roof Pitch */}
        <polygon 
          points="29,23.5 79,24.3 82,34.3 33,33.5" 
          fill="#14532d" 
          stroke="#0f391e" 
          strokeWidth="0.8" 
        />

        {/* Roof Ridge Cap Highlight */}
        <line x1="29" y1="23.5" x2="79" y2="24.3" stroke="#86efac" strokeWidth="1" opacity="0.75" />

        {/* Chimney */}
        <polygon points="66,28 70,28 70,20 66,20" fill="#b91c1c" />
        <polygon points="65,20 71,20 72,18.5 66,18.5" fill="#cbd5e1" />
      </g>

      {/* ==================================================================== */}
      {/* 4. OPTIONAL STATUS ORB TOKEN (From Reference Screenshot)             */}
      {/* ==================================================================== */}
      {showToken && (
        <g transform="translate(52, 13)">
          <circle cx="0" cy="0" r="7" fill="#22c55e" opacity="0.35">
            <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.2;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="0" r="3.5" fill="#22c55e" stroke="#ffffff" strokeWidth="0.8" />
        </g>
      )}
    </svg>
  );
};

export interface IsometricDubaiVillaProps {
  id?: string;
  width?: number;
  height?: number;
  wallColor?: string;
  accentColor?: string;
  hasPool?: boolean;
  hasPalm?: boolean;
  plotColor?: string;
  name?: string;
  price?: number;
  rent?: number;
  onClick?: () => void;
  className?: string;
}

export const IsometricDubaiVilla: React.FC<IsometricDubaiVillaProps> = ({
  width = 120,
  height = 95,
  wallColor = "#f8fafc",
  accentColor = "#fef3c7",
  hasPool = true,
  hasPalm = true,
  plotColor = "#bbf7d0",
  name = "Palm Luxury Villa",
  onClick,
  className = ""
}) => {
  return (
    <svg 
      viewBox="0 0 140 105" 
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }} 
      className={`drop-shadow-xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none ${className}`}
      onClick={onClick}
    >
      <defs>
        {/* Azure pool water gradient */}
        <linearGradient id="villaPoolWater" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* Travertine stone tile gradient */}
        <linearGradient id="villaStonePaving" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Teak Wood Pergola */}
        <linearGradient id="villaTeakPergola" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="50%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>

      {/* ==================================================================== */}
      {/* 1. DUBAI LUXURY ESTATE PLOT BASE (Isometric FloorTile Alignment)     */}
      {/* ==================================================================== */}
      <g>
        {/* Estate Lawn & Patio Base */}
        <polygon 
          points="8,88 132,90.1 140,40.1 16,38" 
          fill={plotColor} 
          stroke="#86efac" 
          strokeWidth="0.8" 
        />
        {/* Plot Lower Side Emboss Lip */}
        <polygon 
          points="8,88 132,90.1 132,93.1 8,91" 
          fill="#64748b" 
        />
        <polygon 
          points="8,91 132,93.1 132,94.5 8,92.4" 
          fill="#000000" 
          opacity="0.13" 
        />

        {/* Travertine Stone Paving Area under Villa & Pool Deck */}
        <polygon 
          points="14,84 126,85.9 130,46.9 18,45" 
          fill="url(#villaStonePaving)" 
          stroke="#cbd5e1" 
          strokeWidth="0.6" 
        />

        {/* Low Perimeter White Wall on boundary */}
        <polygon points="16,38 140,40.1 140,42.1 16,40" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
      </g>

      {/* ==================================================================== */}
      {/* 2. PRIVATE TURQUOISE SWIMMING POOL & LOUNGE SUNBEDS                  */}
      {/* ==================================================================== */}
      {hasPool && (
        <g>
          {/* Sunken Pool White Marble Coping */}
          <polygon 
            points="18,78 52,78.6 57,56.6 23,56" 
            fill="#ffffff" 
            stroke="#cbd5e1" 
            strokeWidth="0.8" 
          />
          {/* Pool Water Basin */}
          <polygon 
            points="20,77 50,77.5 54,58.5 24,58" 
            fill="url(#villaPoolWater)" 
          />
          {/* Water Shimmer Line */}
          <path d="M 23,64 Q 35,63 48,65" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
          {/* Pool Internal Steps */}
          <line x1="22" y1="60" x2="27" y2="60.1" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
          <line x1="22" y1="62" x2="27" y2="62.1" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />

          {/* Luxury Sun Lounger Beds */}
          <polygon points="45,82 54,82.1 53,79.1 44,79" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
          <polygon points="46,81 50,81.1 50,80.1 46,80" fill="#0284c7" />

          {/* Miniature Patio Parasol Umbrella */}
          <line x1="53" y1="83" x2="53" y2="72" stroke="#64748b" strokeWidth="1" />
          <polygon points="48,72 58,72.2 53,67" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        </g>
      )}

      {/* ==================================================================== */}
      {/* 3. MINIATURE DUBAI DATE PALM TREE                                    */}
      {/* ==================================================================== */}
      {hasPalm && (
        <g transform="translate(120, 75)">
          {/* Palm Trunk */}
          <path d="M 0,0 Q 2,-16 -1,-26" fill="none" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
          {/* Arching Date Palm Fronds */}
          <path d="M -1,-26 Q -10,-32 -16,-26" fill="none" stroke="#15803d" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M -1,-26 Q 8,-34 14,-28" fill="none" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M -1,-26 Q -5,-38 -1,-40" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M -1,-26 Q 6,-24 10,-20" fill="none" stroke="#15803d" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M -1,-26 Q -8,-22 -12,-18" fill="none" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}

      {/* ==================================================================== */}
      {/* 4. CONTEMPORARY DUBAI ARCHITECTURAL VILLA                            */}
      {/* ==================================================================== */}
      <g>
        {/* Villa Ground Footprint Shadow */}
        <polygon points="56,76 114,77 120,49 62,48" fill="#000000" opacity="0.25" />

        {/* --- GROUND FLOOR --- */}
        {/* Front Panoramic Glass Facade */}
        <polygon 
          points="58,74 112,74.9 112,54.9 58,54" 
          fill="#0f172a" 
          stroke="#334155" 
          strokeWidth="0.8" 
        />
        {/* Large Floor-to-Ceiling Tinted Glass Sliding Panels */}
        <rect x="62" y="56" width="22" height="17" fill="#0284c7" opacity="0.75" />
        <rect x="86" y="56" width="22" height="17" fill="#0284c7" opacity="0.75" />
        {/* Glass reflection diagonals */}
        <line x1="64" y1="71" x2="78" y2="57" stroke="#ffffff" strokeWidth="0.8" opacity="0.5" />
        <line x1="88" y1="71" x2="102" y2="57" stroke="#ffffff" strokeWidth="0.8" opacity="0.5" />

        {/* Right Wall / Travertine Cladding Feature */}
        <polygon 
          points="112,74.9 118,50.9 118,32.9 112,54.9" 
          fill={accentColor} 
          stroke="#cbd5e1" 
          strokeWidth="0.8" 
        />

        {/* --- SECOND FLOOR CANTILEVERED SUITE --- */}
        <polygon 
          points="56,54 114,54.9 114,34.9 56,34" 
          fill={wallColor} 
          stroke="#cbd5e1" 
          strokeWidth="0.8" 
        />
        {/* Second Floor Master Balcony & Panoramic Glazing */}
        <rect x="62" y="37" width="24" height="12" fill="#0284c7" opacity="0.8" />
        <rect x="88" y="37.5" width="20" height="11.5" fill="#0284c7" opacity="0.8" />
        {/* Seamless Glass Terrace Balustrade */}
        <polygon 
          points="56,54 114,54.9 114,50.9 56,50" 
          fill="#38bdf8" 
          opacity="0.5" 
          stroke="#0284c7" 
          strokeWidth="0.5" 
        />

        {/* --- ROOFTOP TERRACE & TEAK SHADE PERGOLA --- */}
        {/* Flat Roof Parapet */}
        <polygon 
          points="56,34 114,34.9 118,17.9 60,17" 
          fill="#f1f5f9" 
          stroke="#cbd5e1" 
          strokeWidth="0.8" 
        />
        {/* Parapet border */}
        <polygon points="56,34 114,34.9 114,32.9 56,32" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />

        {/* Architectural Teak Pergola Beams */}
        {[0, 1, 2, 3, 4].map(i => {
          const x1 = 66 + i * 8;
          const y1 = 30 + i * 0.14;
          const x2 = 70 + i * 8;
          const y2 = 18 + i * 0.14;
          return (
            <line 
              key={`pergola-${i}`} 
              x1={x1} 
              y1={y1} 
              x2={x2} 
              y2={y2} 
              stroke="#b45309" 
              strokeWidth="1.8" 
            />
          );
        })}

        {/* Warm Architectural Downlights */}
        <circle cx="68" cy="53.5" r="1" fill="#fef08a" />
        <circle cx="102" cy="54" r="1" fill="#fef08a" />
      </g>
    </svg>
  );
};

export const ClickableHouseNew = (props: any) => <IsometricHouse {...props} />;
export const SmallHouseIcon = (props: any) => <IsometricHouse {...props} />;
export const VillaBlock = IsometricDubaiVilla;

export interface IsometricHospitalProps {
  id?: string;
  width?: number;
  height?: number;
  name?: string;
  wallColor?: string;
  glassColor?: string;
  accentColor?: string;
  plotColor?: string;
  hasHelipad?: boolean;
  hasAmbulance?: boolean;
  onClick?: () => void;
  className?: string;
}

export const IsometricHospital: React.FC<IsometricHospitalProps> = ({
  id = "hospital",
  width = 150,
  height = 120,
  name = "Dubai Hospital",
  wallColor = "#f8fafc",
  glassColor = "#38bdf8",
  accentColor = "#0284c7",
  plotColor = "#cbd5e1",
  hasHelipad = true,
  hasAmbulance = true,
  onClick,
  className = ""
}) => {
  return (
    <svg 
      viewBox="0 0 180 145" 
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }} 
      className={`drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none ${className}`}
      onClick={onClick}
    >
      <defs>
        {/* Hospital Glass Gradient */}
        <linearGradient id="hospGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={glassColor} />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* Hospital Facade Gradient */}
        <linearGradient id="hospWallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={wallColor} />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Hospital Asphalt Pavement */}
        <linearGradient id="hospAsphaltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Emergency Beacon Glow */}
        <radialGradient id="hospRedGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
          <stop offset="60%" stopColor="#ef4444" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ==================================================================== */}
      {/* 1. ISOMETRIC PLOT BASE (Matches FloorTile's exact geometry)          */}
      {/* ==================================================================== */}
      <g>
        {/* Concrete Foundation Base */}
        <polygon 
          points="12,126 168,128.6 182,72.6 26,70" 
          fill={plotColor} 
          stroke="#94a3b8" 
          strokeWidth="0.8" 
        />
        {/* Foundation Lower Side Emboss Lip */}
        <polygon 
          points="12,126 168,128.6 168,133.6 12,131" 
          fill="#64748b" 
        />
        <polygon 
          points="12,131 168,133.6 168,135 12,132.4" 
          fill="#000000" 
          opacity="0.16" 
        />

        {/* Landscaped Green Lawn Verge */}
        <polygon 
          points="14,124 166,126.5 180,74 28,71.5" 
          fill="#86efac" 
        />

        {/* Ambulance Bay Asphalt Driveway & Apron */}
        <polygon 
          points="18,122 86,123.1 94,86 26,85" 
          fill="url(#hospAsphaltGrad)" 
          stroke="#475569" 
          strokeWidth="0.8" 
        />

        {/* Emergency Drop-off Lane Markings */}
        <line x1="22" y1="120" x2="82" y2="121" stroke="#facc15" strokeWidth="1" strokeDasharray="6 3" />
        <line x1="24" y1="102" x2="86" y2="103" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.8" />
        {/* ER Chevron directional arrows on asphalt */}
        <path d="M 40,116 L 45,114 L 40,112" fill="none" stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 52,116.2 L 57,114.2 L 52,112.2" fill="none" stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" />

        {/* Landscaped Date Palms at Front Right Lawn */}
        <g transform="translate(152, 114)">
          <path d="M 0,0 Q 2,-10 4,-18" stroke="#78350f" strokeWidth="2" fill="none" />
          <path d="M 4,-18 Q -6,-22 -10,-17" stroke="#15803d" strokeWidth="1.5" fill="none" />
          <path d="M 4,-18 Q 14,-22 18,-17" stroke="#15803d" strokeWidth="1.5" fill="none" />
          <path d="M 4,-18 Q 0,-28 2,-29" stroke="#16a34a" strokeWidth="1.5" fill="none" />
          <path d="M 4,-18 Q -4,-26 -8,-25" stroke="#16a34a" strokeWidth="1.5" fill="none" />
          <path d="M 4,-18 Q 12,-26 16,-25" stroke="#16a34a" strokeWidth="1.5" fill="none" />
        </g>
        <g transform="translate(164, 104)">
          <path d="M 0,0 Q -2,-8 -3,-15" stroke="#78350f" strokeWidth="1.8" fill="none" />
          <path d="M -3,-15 Q -10,-19 -14,-15" stroke="#15803d" strokeWidth="1.3" fill="none" />
          <path d="M -3,-15 Q 7,-19 11,-15" stroke="#15803d" strokeWidth="1.3" fill="none" />
          <path d="M -3,-15 Q -4,-23 -3,-24" stroke="#16a34a" strokeWidth="1.3" fill="none" />
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 2. EMERGENCY WING & CANOPY (Left Outpatient Complex)                 */}
      {/* ==================================================================== */}
      <g>
        {/* Outpatient Base Building Front */}
        <polygon 
          points="28,106 78,106.8 78,66.8 28,66" 
          fill="#ffffff" 
          stroke="#cbd5e1" 
          strokeWidth="0.8" 
        />
        {/* Shaded Left Facade (Receding along slant dY=-22, dX=+5.2) */}
        <polygon 
          points="28,106 28,66 33.2,44 33.2,84" 
          fill="#cbd5e1" 
          stroke="#94a3b8" 
          strokeWidth="0.6" 
        />
        {/* Outpatient Roof Deck */}
        <polygon 
          points="28,66 78,66.8 83.2,44.8 33.2,44" 
          fill="#e2e8f0" 
          stroke="#cbd5e1" 
          strokeWidth="0.6" 
        />
        {/* Roof Mechanical HVAC Pods */}
        <polygon points="40,55 54,55.2 56,48 42,47.8" fill="#94a3b8" />
        <polygon points="40,55 42,47.8 42,45 40,52" fill="#64748b" />

        {/* Windows on Outpatient Wing */}
        {[0, 1].map(row => (
          <g key={`er-win-${row}`}>
            {[0, 1, 2].map(col => (
              <polygon 
                key={`er-w-${row}-${col}`} 
                points={`${32 + col * 14},${72 + row * 16} ${42 + col * 14},${72.1 + row * 16} ${42 + col * 14},${82.1 + row * 16} ${32 + col * 14},${82 + row * 16}`} 
                fill="url(#hospGlassGrad)" 
                stroke="#ffffff" 
                strokeWidth="0.8" 
              />
            ))}
          </g>
        ))}

        {/* Cantilevered Glass/Steel ER Entrance Canopy */}
        <polygon 
          points="22,98 68,98.7 72,87.7 26,87" 
          fill={accentColor} 
          opacity="0.88" 
          stroke="#38bdf8" 
          strokeWidth="1" 
        />
        {/* Canopy Glass Edge Highlight */}
        <line x1="22" y1="98" x2="68" y2="98.7" stroke="#ffffff" strokeWidth="1.2" />
        {/* Steel Pylon Supports */}
        <line x1="24" y1="98" x2="24" y2="114" stroke="#475569" strokeWidth="1.5" />
        <line x1="66" y1="98.7" x2="66" y2="114.7" stroke="#475569" strokeWidth="1.5" />

        {/* Luminous Red ER Banner */}
        <polygon points="28,91 66,91.6 66,84.6 28,84" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.6" />
        <text x="47" y="89" fill="#ffffff" fontSize="4.8" fontWeight="900" letterSpacing="0.8" textAnchor="middle">
          🚑 EMERGENCY
        </text>

        {/* Automatic Sliding Glass Lobby Doors */}
        <polygon points="40,106 58,106.3 58,99.3 40,99" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
        <line x1="49" y1="99.1" x2="49" y2="106.1" stroke="#ffffff" strokeWidth="0.8" />
      </g>

      {/* ==================================================================== */}
      {/* 3. MAIN CLINICAL HOSPITAL TOWER (High-Rise Central/East Wing)         */}
      {/* ==================================================================== */}
      <g>
        {/* Tower Main Front Facade */}
        <polygon 
          points="76,104 156,105.3 156,33.3 76,32" 
          fill="url(#hospWallGrad)" 
          stroke="#cbd5e1" 
          strokeWidth="1" 
        />
        {/* Tower Shaded Left Facade (Receding dY=-24, dX=+5.65) */}
        <polygon 
          points="76,104 76,32 81.65,8 81.65,80" 
          fill="#cbd5e1" 
          stroke="#94a3b8" 
          strokeWidth="0.8" 
        />
        {/* Tower Rooftop Deck */}
        <polygon 
          points="76,32 156,33.3 161.65,9.3 81.65,8" 
          fill="#e2e8f0" 
          stroke="#94a3b8" 
          strokeWidth="0.8" 
        />

        {/* Facade Architectural Brise-Soleil Vertical Fins */}
        {[0, 1, 2, 3, 4].map(idx => {
          const x = 86 + idx * 15;
          const yBottom = 104.2 + idx * 0.25;
          const yTop = 32.2 + idx * 0.25;
          return (
            <line 
              key={`fin-${idx}`} 
              x1={x} 
              y1={yBottom} 
              x2={x} 
              y2={yTop} 
              stroke="#94a3b8" 
              strokeWidth="1.2" 
              opacity="0.75" 
            />
          );
        })}

        {/* 4 Floors of Clinical Window Ribbons */}
        {[0, 1, 2, 3].map(floor => {
          const y = 44 + floor * 14;
          return (
            <g key={`floor-ribbon-${floor}`}>
              {/* Window Band */}
              <polygon 
                points={`80,${y} 152,${y + 1.2} 152,${y + 7.2} 80,${y + 6}`} 
                fill="url(#hospGlassGrad)" 
                stroke="#ffffff" 
                strokeWidth="0.8" 
              />
              {/* Vertical Mullions */}
              {[1, 2, 3, 4, 5, 6].map(m => (
                <line 
                  key={`m-${m}`} 
                  x1={80 + m * 10} 
                  y1={y + m * 0.17} 
                  x2={80 + m * 10} 
                  y2={y + 6 + m * 0.17} 
                  stroke="#ffffff" 
                  strokeWidth="0.6" 
                />
              ))}
            </g>
          );
        })}

        {/* Illuminated Medical Red Cross Emblem on Upper Tower Facade */}
        <g transform="translate(116, 38)">
          {/* White Circular Plaque */}
          <circle cx="0" cy="0" r="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
          {/* Red Cross Symbol */}
          <rect x="-1.8" y="-4.2" width="3.6" height="8.4" rx="0.5" fill="#ef4444" />
          <rect x="-4.2" y="-1.8" width="8.4" height="3.6" rx="0.5" fill="#ef4444" />
          {/* Neon Glow Dot */}
          <circle cx="0" cy="0" r="1.2" fill="#ffffff" opacity="0.8" />
        </g>

        {/* Rooftop HVAC Machinery Block & Sat Comms */}
        <polygon points="86,22 100,22.2 102,15 88,14.8" fill="#64748b" stroke="#475569" strokeWidth="0.6" />
        <polygon points="86,22 88,14.8 88,12 86,19.2" fill="#475569" />
        {/* Comms Mast with Red Obstacle Light */}
        <line x1="94" y1="14" x2="94" y2="4" stroke="#475569" strokeWidth="1" />
        <circle cx="94" cy="4" r="1.2" fill="#ef4444">
          <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ==================================================================== */}
      {/* 4. ROOFTOP MEDEVAC HELIPAD (Elevated Platform & H Markings)          */}
      {/* ==================================================================== */}
      {hasHelipad && (
        <g>
          {/* Structural Steel Support Piers */}
          <line x1="106" y1="26" x2="106" y2="32.5" stroke="#334155" strokeWidth="1.5" />
          <line x1="148" y1="26.7" x2="148" y2="33.2" stroke="#334155" strokeWidth="1.5" />
          <line x1="110" y1="14" x2="110" y2="19" stroke="#334155" strokeWidth="1.5" />
          <line x1="152" y1="14.7" x2="152" y2="19.7" stroke="#334155" strokeWidth="1.5" />

          {/* Elevated Deck Platform Surface */}
          <polygon 
            points="104,26 150,26.7 154,12.7 108,12" 
            fill="#334155" 
            stroke="#1e293b" 
            strokeWidth="0.8" 
          />
          {/* Deck Rim Lip */}
          <polygon points="104,26 150,26.7 150,28.2 104,27.5" fill="#0f172a" />

          {/* Yellow Safety Perimeter Ellipse */}
          <ellipse cx="129" cy="19.3" rx="19" ry="5.5" fill="none" stroke="#facc15" strokeWidth="1.2" />

          {/* White Touchdown Perimeter Dash Circle */}
          <ellipse cx="129" cy="19.3" rx="14" ry="4" fill="none" stroke="#ffffff" strokeWidth="0.9" strokeDasharray="3 2" />

          {/* White Helipad 'H' Marking */}
          <text 
            x="129" 
            y="22.2" 
            fill="#ffffff" 
            fontSize="8.5" 
            fontWeight="900" 
            fontFamily="Arial, sans-serif" 
            textAnchor="middle"
          >
            H
          </text>

          {/* Helipad Perimeter Aviation Beacons */}
          <circle cx="107" cy="25" r="1.2" fill="#ef4444" />
          <circle cx="147" cy="25.6" r="1.2" fill="#22c55e" />
          <circle cx="151" cy="13.7" r="1.2" fill="#ef4444" />
          <circle cx="111" cy="13.1" r="1.2" fill="#22c55e" />
        </g>
      )}

      {/* ==================================================================== */}
      {/* 5. MINIATURE EMERGENCY AMBULANCE VEHICLE                              */}
      {/* ==================================================================== */}
      {hasAmbulance && (
        <g id="mini-ambulance">
          {/* Ground Contact Shadow */}
          <polygon points="34,117 56,117.3 52,112 30,111.7" fill="#000000" opacity="0.3" />

          {/* White Van Main Chassis Body */}
          <polygon 
            points="32,114 54,114.3 56,106 34,105.7" 
            fill="#ffffff" 
            stroke="#94a3b8" 
            strokeWidth="0.6" 
          />
          {/* Shaded Van Rear Face */}
          <polygon points="32,114 34,105.7 30,105 28,113.3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5" />
          {/* Van Front Hood Slope */}
          <polygon points="54,114.3 56,106 59,106.1 57,114.4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />

          {/* Lateral Red Emergency Stripe */}
          <polygon points="32,110.5 56,110.8 56,108.8 32,108.5" fill="#ef4444" />

          {/* Blue Tinted Windshield */}
          <polygon points="48,107 55,107.1 54,105 48,104.9" fill="#0284c7" stroke="#ffffff" strokeWidth="0.4" />

          {/* Rubber Black Tires with Hubcaps */}
          <ellipse cx="37" cy="115" rx="2" ry="1.2" fill="#1e293b" />
          <ellipse cx="49" cy="115.2" rx="2" ry="1.2" fill="#1e293b" />

          {/* Active Flashing Red Emergency Siren */}
          <circle cx="43" cy="104.8" r="1.4" fill="#ef4444">
            <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
          </circle>
          {/* Ambient Siren Glow Flare */}
          <ellipse cx="43" cy="104.8" rx="3.5" ry="1.8" fill="url(#hospRedGlow)" opacity="0.85">
            <animate attributeName="opacity" values="0.85;0.1;0.85" dur="0.8s" repeatCount="indefinite" />
          </ellipse>
        </g>
      )}

      {/* ==================================================================== */}
      {/* 6. HOSPITAL PLAZA MONUMENT ENTRANCE SIGN                             */}
      {/* ==================================================================== */}
      <g transform="translate(90, 115)">
        {/* Modern Slate Monument Pedestal */}
        <polygon points="0,0 60,1 58,10 0,9" fill="#0f172a" opacity="0.9" stroke="#38bdf8" strokeWidth="0.8" />
        <circle cx="8" cy="5" r="2.5" fill="#ef4444" />
        <text x="8" y="6.8" fill="#ffffff" fontSize="4.5" fontWeight="900" textAnchor="middle">+</text>
        <text x="14" y="6.8" fill="#ffffff" fontSize="5.5" fontWeight="900" letterSpacing="0.6">
          {name.toUpperCase()}
        </text>
      </g>
    </svg>
  );
};

export const HospitalBlock = IsometricHospital;
export const HospitalIcon = (props: any) => <IsometricHospital {...props} />;

export const ApartmentBuildingIconNew = () => (
  <svg viewBox="0 0 50 120" className="w-[50px] h-[120px] drop-shadow-2xl cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="10" width="30" height="110" fill="#cbd5e1" rx="2" />
    <rect x="15" y="0" width="20" height="10" fill="#94a3b8" rx="1" />
    {Array.from({length: 8}).map((_, i) => (
       <g key={i}>
         <rect x="15" y={20 + i*10} width="8" height="6" fill="#38bdf8" opacity="0.6" />
         <rect x="27" y={20 + i*10} width="8" height="6" fill="#38bdf8" opacity="0.6" />
       </g>
    ))}
  </svg>
);

export const RooftopIconNew = () => (
  <svg viewBox="0 0 60 100" className="w-[50px] h-[80px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="40" width="40" height="60" fill="#334155" rx="2" />
    <rect x="15" y="45" width="10" height="50" fill="#94a3b8" />
    <rect x="35" y="45" width="10" height="50" fill="#94a3b8" />
    <circle cx="30" cy="20" r="18" fill="#1e293b" />
    <path d="M 23 28 L 30 15 L 37 28" fill="none" stroke="#facc15" strokeWidth="2" />
    <circle cx="30" cy="11" r="3" fill="#facc15" />
    <text x="30" y="36" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">SKY</text>
  </svg>
);

export const NightclubIconNew = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="30" width="60" height="40" fill="#1e293b" rx="4" />
    <rect x="15" y="35" width="50" height="30" fill="#0f172a" rx="2" />
    <rect x="35" y="50" width="10" height="20" fill="#ef4444" opacity="0.8" />
    <circle cx="40" cy="18" r="16" fill="#9333ea" />
    <circle cx="40" cy="18" r="12" fill="none" stroke="#f472b6" strokeWidth="2" strokeDasharray="2 2" />
    <path d="M 35 12 L 35 24 L 47 18 Z" fill="#ffffff" />
  </svg>
);

export interface IsometricBeachProps {
  id?: string;
  width?: number;
  height?: number;
  name?: string;
  sandColor?: string;
  waterColor?: string;
  plotColor?: string;
  hasBar?: boolean;
  hasVolleyball?: boolean;
  hasJetSki?: boolean;
  hasUmbrellas?: boolean;
  price?: number;
  onClick?: () => void;
  className?: string;
}

export const IsometricBeach: React.FC<IsometricBeachProps> = ({
  id = "beach",
  width = 160,
  height = 120,
  name = "Jumeirah Beach Club",
  sandColor = "#fde68a",
  waterColor = "#38bdf8",
  plotColor = "#fef08a",
  hasBar = true,
  hasVolleyball = true,
  hasJetSki = true,
  hasUmbrellas = true,
  onClick,
  className = ""
}) => {
  return (
    <svg 
      viewBox="0 0 180 140" 
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }} 
      className={`drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none ${className}`}
      onClick={onClick}
    >
      <defs>
        {/* Persian Gulf Golden Sand Gradient */}
        <linearGradient id="beachSandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor={sandColor} />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        {/* Sparkling Azure Sea Water Gradient */}
        <linearGradient id="beachSeaWater" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor={waterColor} />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>

        {/* Tropical Thatched Palm Roof */}
        <linearGradient id="tikiThatchedRoof" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="50%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>

        {/* Weathered Teak Boardwalk */}
        <linearGradient id="boardwalkTeak" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>

      {/* ==================================================================== */}
      {/* 1. ISOMETRIC PLOT BASE (FloorTile Alignment: Baseline 0.01667, Slant -0.2355) */}
      {/* ==================================================================== */}
      <g>
        {/* Plot Foundation */}
        <polygon 
          points="10,122 170,124.7 183.2,68.7 23.2,66" 
          fill={plotColor} 
          stroke="#d97706" 
          strokeWidth="0.8" 
        />
        {/* Foundation Lower Side Emboss Lip */}
        <polygon 
          points="10,122 170,124.7 170,129.7 10,127" 
          fill="#b45309" 
        />
        <polygon 
          points="10,127 170,129.7 170,131.2 10,128.5" 
          fill="#000000" 
          opacity="0.18" 
        />

        {/* Deep Sparkling Turquoise Sea Water Strip (Upper Shoreline) */}
        <polygon 
          points="23.2,66 183.2,68.7 180,88 20,85" 
          fill="url(#beachSeaWater)" 
        />

        {/* Animated Surf Wave Foams Washing Against Shoreline */}
        <path 
          d="M 22,84 Q 45,82.5 68,84.5 T 115,85.2 T 155,85.8 T 179,86.5" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="1.6" 
          opacity="0.9" 
        />
        <path 
          d="M 23,80 Q 52,78.5 82,80.8 T 138,81.8 T 181,83" 
          fill="none" 
          stroke="#e0f2fe" 
          strokeWidth="0.9" 
          opacity="0.75" 
        />
        {/* Wave Glistening Shimmer Dots */}
        {[35, 60, 95, 125, 150, 170].map(wx => (
          <ellipse key={`w-dot-${wx}`} cx={wx} cy={74 + wx * 0.04} rx="3" ry="1" fill="#ffffff" opacity="0.65" />
        ))}

        {/* Wet Compact Sand Washline */}
        <polygon 
          points="20,85 180,88 178,92 18,89" 
          fill="#ca8a04" 
          opacity="0.38" 
        />

        {/* Fine Golden Beach Sand Body */}
        <polygon 
          points="18,89 178,92 168,122.5 12,120" 
          fill="url(#beachSandGrad)" 
        />

        {/* Sand Ripple Textures */}
        {[102, 110, 118].map(sy => (
          <line 
            key={`sand-rip-${sy}`} 
            x1="80" 
            y1={sy} 
            x2="160" 
            y2={sy + 1.3} 
            stroke="#f59e0b" 
            strokeWidth="0.5" 
            strokeDasharray="8 6 12 5" 
            opacity="0.4" 
          />
        ))}
      </g>

      {/* ==================================================================== */}
      {/* 2. TEAK WOODEN BOARDWALK PROMENADE                                   */}
      {/* ==================================================================== */}
      <g>
        {/* Diagonal Boardwalk Promenade leading from entrance to Cabana */}
        <polygon 
          points="12,116 78,117.1 84,93 18,92" 
          fill="url(#boardwalkTeak)" 
          stroke="#78350f" 
          strokeWidth="0.7" 
        />
        {/* Boardwalk Edge Highlight */}
        <line x1="12" y1="116" x2="78" y2="117.1" stroke="#fcd34d" strokeWidth="0.8" opacity="0.6" />
        {/* Individual Plank Grooves */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const x1 = 18 + i * 9;
          const y1 = 116.1 + i * 0.15;
          const x2 = 24 + i * 9;
          const y2 = 92.1 + i * 0.15;
          return <line key={`plank-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#451a03" strokeWidth="0.6" opacity="0.6" />;
        })}
      </g>

      {/* ==================================================================== */}
      {/* 3. TIKI CABANA BEACH BAR (With Thatched Roof & Cocktail Counter)     */}
      {/* ==================================================================== */}
      {hasBar && (
        <g id="tiki-bar">
          {/* Deck Ground Shadow */}
          <polygon points="34,103 76,103.7 82,85 40,84.3" fill="#000000" opacity="0.25" />

          {/* Elevated Teak Deck Platform */}
          <polygon points="36,101 74,101.6 78,87.6 40,87" fill="#b45309" stroke="#78350f" strokeWidth="0.6" />
          <polygon points="36,101 74,101.6 74,103.1 36,102.5" fill="#451a03" />

          {/* Bamboo Corner Support Posts */}
          <line x1="40" y1="100" x2="40" y2="76" stroke="#d97706" strokeWidth="1.8" />
          <line x1="70" y1="100.5" x2="70" y2="76.5" stroke="#d97706" strokeWidth="1.8" />
          <line x1="43" y1="88" x2="43" y2="67" stroke="#92400e" strokeWidth="1.6" />
          <line x1="74" y1="88.5" x2="74" y2="67.5" stroke="#92400e" strokeWidth="1.6" />

          {/* Thatched Palm Leaf Roof (Dual Slanted Pitch) */}
          {/* Front Slant */}
          <polygon 
            points="34,80 76,80.7 72,66.7 30,66" 
            fill="url(#tikiThatchedRoof)" 
            stroke="#451a03" 
            strokeWidth="0.8" 
          />
          {/* Left Shaded Eaves */}
          <polygon points="34,80 30,66 26,71 30,85" fill="#451a03" />
          {/* Thatched Straw Strands Edge */}
          {[0, 1, 2, 3, 4, 5, 6].map(s => (
            <line 
              key={`thatch-${s}`} 
              x1={35 + s * 6} 
              y1={80.1 + s * 0.1} 
              x2={34 + s * 6} 
              y2={83.1 + s * 0.1} 
              stroke="#b45309" 
              strokeWidth="1.2" 
            />
          ))}

          {/* Teak Bar Counter & Shelves */}
          <polygon points="44,97 66,97.4 68,91.4 46,91" fill="#78350f" stroke="#451a03" strokeWidth="0.6" />
          <polygon points="44,97 66,97.4 66,99.4 44,99" fill="#451a03" />

          {/* Tropical Cocktails & Coconuts on Bar */}
          <circle cx="48" cy="95.5" r="1.3" fill="#06b6d4" />
          <line x1="48" y1="95.5" x2="49" y2="93.5" stroke="#ef4444" strokeWidth="0.6" />
          <circle cx="54" cy="95.8" r="1.5" fill="#78350f" />
          <circle cx="61" cy="96" r="1.2" fill="#ec4899" />

          {/* High Wooden Bar Stools */}
          {[46, 55, 64].map((bx, bidx) => (
            <g key={`stool-${bidx}`}>
              <ellipse cx={bx} cy={100 + bidx * 0.1} rx="2" ry="1.2" fill="#b45309" stroke="#451a03" strokeWidth="0.4" />
              <line x1={bx} y1={100} x2={bx} y2={104.5} stroke="#451a03" strokeWidth="0.8" />
            </g>
          ))}

          {/* Flanking Date Palms */}
          <g transform="translate(34, 94)">
            <path d="M 0,0 Q -6,-14 -4,-26" stroke="#78350f" strokeWidth="2.4" fill="none" />
            <path d="M -4,-26 Q -16,-30 -20,-24" stroke="#15803d" strokeWidth="1.8" fill="none" />
            <path d="M -4,-26 Q 8,-30 12,-24" stroke="#15803d" strokeWidth="1.8" fill="none" />
            <path d="M -4,-26 Q -8,-36 -4,-38" stroke="#16a34a" strokeWidth="1.8" fill="none" />
            <path d="M -4,-26 Q -14,-34 -18,-32" stroke="#16a34a" strokeWidth="1.8" fill="none" />
            <path d="M -4,-26 Q 6,-34 10,-32" stroke="#16a34a" strokeWidth="1.8" fill="none" />
          </g>
        </g>
      )}

      {/* ==================================================================== */}
      {/* 4. LUXURY SUN DAYBEDS & STRIPED PARASOLS                             */}
      {/* ==================================================================== */}
      {hasUmbrellas && (
        <g id="beach-loungers">
          {/* Daybed 1 + Turquoise Parasol */}
          <g transform="translate(86, 105)">
            {/* Wooden Sunbed */}
            <polygon points="0,6 14,6.2 16,0 2,-0.2" fill="#d97706" stroke="#92400e" strokeWidth="0.4" />
            <polygon points="1,5.5 13,5.7 15,0.5 3,0.3" fill="#ffffff" />
            {/* Turquoise/White Striped Umbrella */}
            <line x1="8" y1="5" x2="8" y2="-12" stroke="#475569" strokeWidth="1" />
            <path d="M -2,-12 Q 8,-20 18,-11.8 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
            <path d="M 2,-12 Q 8,-19 14,-11.9 Z" fill="#ffffff" />
            <path d="M 5,-12 Q 8,-18.5 11,-11.95 Z" fill="#38bdf8" />
          </g>

          {/* Daybed 2 + Coral Red Parasol */}
          <g transform="translate(108, 105.3)">
            {/* Wooden Sunbed */}
            <polygon points="0,6 14,6.2 16,0 2,-0.2" fill="#d97706" stroke="#92400e" strokeWidth="0.4" />
            <polygon points="1,5.5 13,5.7 15,0.5 3,0.3" fill="#ffffff" />
            {/* Red/White Striped Umbrella */}
            <line x1="8" y1="5" x2="8" y2="-12" stroke="#475569" strokeWidth="1" />
            <path d="M -2,-12 Q 8,-20 18,-11.8 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.5" />
            <path d="M 2,-12 Q 8,-19 14,-11.9 Z" fill="#ffffff" />
            <path d="M 5,-12 Q 8,-18.5 11,-11.95 Z" fill="#f87171" />
          </g>

          {/* Daybed 3 + Yellow Parasol */}
          <g transform="translate(130, 105.6)">
            {/* Wooden Sunbed */}
            <polygon points="0,6 14,6.2 16,0 2,-0.2" fill="#d97706" stroke="#92400e" strokeWidth="0.4" />
            <polygon points="1,5.5 13,5.7 15,0.5 3,0.3" fill="#ffffff" />
            {/* Yellow/White Striped Umbrella */}
            <line x1="8" y1="5" x2="8" y2="-12" stroke="#475569" strokeWidth="1" />
            <path d="M -2,-12 Q 8,-20 18,-11.8 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="0.5" />
            <path d="M 2,-12 Q 8,-19 14,-11.9 Z" fill="#ffffff" />
            <path d="M 5,-12 Q 8,-18.5 11,-11.95 Z" fill="#fef08a" />
          </g>
        </g>
      )}

      {/* ==================================================================== */}
      {/* 5. BEACH VOLLEYBALL COURT                                            */}
      {/* ==================================================================== */}
      {hasVolleyball && (
        <g id="volleyball-court">
          {/* Court Perimeter Boundary Line */}
          <polygon 
            points="120,118 168,118.8 174,96 126,95.2" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="0.8" 
            strokeDasharray="4 2" 
          />

          {/* Center Wooden Net Poles */}
          <line x1="145" y1="118.4" x2="145" y2="103" stroke="#78350f" strokeWidth="1.4" />
          <line x1="151" y1="95.6" x2="151" y2="82" stroke="#78350f" strokeWidth="1.4" />

          {/* Volleyball Net Mesh along isometric slant */}
          <polygon 
            points="145,114 151,92.5 151,85 145,106.5" 
            fill="#ffffff" 
            opacity="0.75" 
            stroke="#94a3b8" 
            strokeWidth="0.5" 
          />
          {/* Top White Binding Tape */}
          <line x1="145" y1="106.5" x2="151" y2="85" stroke="#ffffff" strokeWidth="1" />
          {/* Net Mesh Grid Lines */}
          <line x1="145" y1="110" x2="151" y2="88.5" stroke="#cbd5e1" strokeWidth="0.4" />

          {/* Volleyball on the sand */}
          <circle cx="134" cy="110" r="2.2" fill="#facc15" stroke="#1e3a8a" strokeWidth="0.5" />
          <path d="M 132.5,109 Q 134,110 135.5,111" stroke="#3b82f6" strokeWidth="0.6" fill="none" />
        </g>
      )}

      {/* ==================================================================== */}
      {/* 6. WATER SPORTS JET SKI & SURFBOARDS                                 */}
      {/* ==================================================================== */}
      {hasJetSki && (
        <g id="jet-ski">
          {/* Jet Ski in Shallows */}
          <g transform="translate(136, 75)">
            {/* Water Wake Ripples */}
            <ellipse cx="0" cy="5" rx="10" ry="2.5" fill="none" stroke="#bae6fd" strokeWidth="0.8" opacity="0.7" />
            {/* Jet Ski Hull (Yellow/Black) */}
            <polygon points="-8,4 8,4.2 12,0 -4,-0.2" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
            <polygon points="-8,4 8,4.2 8,6 -8,5.8" fill="#0f172a" />
            {/* Handlebars & Seat */}
            <polygon points="-2,1 4,1.1 5,-1.5 -1,-1.6" fill="#1e293b" />
            <line x1="4" y1="-1.5" x2="7" y2="-4" stroke="#0f172a" strokeWidth="0.8" />
            <line x1="5.5" y1="-4" x2="8.5" y2="-4" stroke="#ef4444" strokeWidth="1" />
          </g>

          {/* Surfboards Standing in Sand near the Boardwalk */}
          <g transform="translate(76, 92)">
            {/* Hibiscus Pink Surfboard */}
            <ellipse cx="0" cy="0" rx="2.5" ry="8" fill="#ec4899" stroke="#be185d" strokeWidth="0.5" transform="rotate(-15)" />
            <line x1="-1" y1="-6" x2="1" y2="6" stroke="#ffffff" strokeWidth="0.8" />
            {/* Ocean Cyan Surfboard */}
            <ellipse cx="5" cy="1" rx="2.5" ry="8" fill="#06b6d4" stroke="#0891b2" strokeWidth="0.5" transform="rotate(10)" />
            <line x1="4" y1="-5" x2="6" y2="7" stroke="#facc15" strokeWidth="0.8" />
          </g>
        </g>
      )}

      {/* ==================================================================== */}
      {/* 7. LIFEGUARD SURF TOWER                                              */}
      {/* ==================================================================== */}
      <g id="lifeguard-tower" transform="translate(20, 72)">
        {/* Stilts */}
        <line x1="2" y1="18" x2="2" y2="6" stroke="#ffffff" strokeWidth="1.2" />
        <line x1="12" y1="18.2" x2="12" y2="6.2" stroke="#ffffff" strokeWidth="1.2" />
        <line x1="4" y1="12" x2="4" y2="1" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="14" y1="12.2" x2="14" y2="1.2" stroke="#cbd5e1" strokeWidth="1" />
        {/* Cabin */}
        <polygon points="1,6 13,6.2 15,1 3,0.8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <polygon points="1,6 13,6.2 13,0 1,-0.2" fill="#ef4444" />
        {/* Red Lookout Roof */}
        <polygon points="-1,0 15,0.2 17,-4 1,-4.2" fill="#dc2626" />
        {/* Red Lifebuoy Ring on Rail */}
        <circle cx="2" cy="3" r="2" fill="none" stroke="#ef4444" strokeWidth="1" />
        <circle cx="2" cy="3" r="2" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
      </g>

      {/* ==================================================================== */}
      {/* 8. BEACH CLUB BOARDWALK ENTRANCE MONUMENT                            */}
      {/* ==================================================================== */}
      <g transform="translate(18, 114)">
        {/* Driftwood Surfboard Plaque */}
        <polygon points="0,0 56,0.9 54,8.9 0,8" fill="#0f172a" opacity="0.9" stroke="#38bdf8" strokeWidth="0.8" />
        <text x="28" y="5.8" fill="#ffffff" fontSize="4.6" fontWeight="900" letterSpacing="0.6" textAnchor="middle">
          🏖️ {name.toUpperCase()}
        </text>
      </g>
    </svg>
  );
};

export const BeachClubBlock = IsometricBeach;
export const BeachClubIconNew = (props: any) => <IsometricBeach {...props} />;
export const BeachComponent = IsometricBeach;

export const RestaurantIconNew = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <polygon points="10,40 40,25 70,40" fill="#b91c1c" />
    <rect x="15" y="40" width="50" height="35" fill="#f8fafc" />
    <rect x="25" y="50" width="10" height="15" fill="#cbd5e1" />
    <rect x="45" y="50" width="10" height="15" fill="#cbd5e1" />
    <circle cx="40" cy="15" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
    <path d="M 35 10 L 35 20 M 32 12 L 38 12 M 32 15 L 38 15" stroke="#64748b" strokeWidth="1" />
    <path d="M 45 8 Q 42 15 45 22 Q 48 15 45 8" fill="none" stroke="#64748b" strokeWidth="1" />
  </svg>
);

export const EstateCommunityBlock = ({ name }: { name: string }) => <EstateBase name={name} />;

export const VillaHouse = ClickableHouseNew;
export const ApartmentHouse = ApartmentBuildingIconNew;
export type AdPlacement = { 
  id: string; 
  x?: number; 
  y?: number; 
  title?: string; 
  image?: string;
  gridX?: number;
  gridY?: number;
  w?: number;
  h?: number;
  img?: string;
};
export const categoryColors: Record<string, string> = {
  community: "#22c55e",
  entertainment: "#ec4899",
  shopping: "#3b82f6",
  hospitality: "#f59e0b",
  dining: "#f97316",
  landmark: "#8b5cf6",
};

export type ActionDef = { label: string; amount: number; color: string };
export const venueActions: Record<string, ActionDef[]> = {
  club: [{ label: "Enter & Party", amount: -150, color: "bg-pink-500" }],
  mall: [{ label: "Go Shopping", amount: -300, color: "bg-blue-500" }],
  hotel: [{ label: "Check-in", amount: -500, color: "bg-yellow-500" }],
  beach: [{ label: "Relax", amount: -50, color: "bg-cyan-500" }],
  office: [{ label: "Work Shift", amount: +800, color: "bg-purple-500" }],
  school: [{ label: "Attend Class", amount: -100, color: "bg-indigo-500" }],
  hospital: [{ label: "Get Checkup", amount: -250, color: "bg-red-500" }],
  restaurant: [{ label: "Dine In", amount: -180, color: "bg-orange-500" }],
  stadium: [{ label: "Watch Match", amount: -200, color: "bg-green-600" }],
  casino: [{ label: "Gamble", amount: -500, color: "bg-emerald-600" }],
  park: [{ label: "Walk in Park", amount: 0, color: "bg-green-500" }],
};


export const StadiumIcon = () => (
  <svg viewBox="0 0 100 80" className="w-[80px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <ellipse cx="50" cy="40" rx="45" ry="30" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="4" />
     <ellipse cx="50" cy="40" rx="35" ry="20" fill="#22c55e" />
     <rect x="48" y="25" width="4" height="30" fill="#ffffff" opacity="0.6" />
     <circle cx="50" cy="40" r="5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
  </svg>
);

export const SchoolIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <rect x="10" y="40" width="60" height="30" fill="#fbbf24" rx="2" />
     <polygon points="10,40 40,20 70,40" fill="#b45309" />
     <rect x="35" y="50" width="10" height="20" fill="#78350f" />
  </svg>
);

export const CasinoIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <rect x="20" y="20" width="40" height="50" fill="#0f172a" rx="4" />
     <circle cx="40" cy="40" r="10" fill="#eab308" />
     <text x="40" y="44" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">$</text>
     <rect x="10" y="70" width="60" height="10" fill="#1e293b" />
  </svg>
);

export const ParkIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[70px] h-[70px] drop-shadow-md cursor-pointer hover:scale-110 transition-transform">
     <rect x="5" y="5" width="70" height="70" fill="#4ade80" rx="8" />
     <circle cx="25" cy="25" r="12" fill="#16a34a" />
     <circle cx="55" cy="55" r="15" fill="#15803d" />
     <circle cx="60" cy="20" r="10" fill="#16a34a" />
     <path d="M 20 60 Q 40 40 60 20" fill="none" stroke="#d4d4d8" strokeWidth="4" />
  </svg>
);

// Replaced by new 3D BurjKhalifa with base grounds imported from ./BurjKhalifa

export const BulgariIslandIcon = () => (
  <svg viewBox="0 0 120 120" className="w-[120px] h-[120px] drop-shadow-xl z-20 relative cursor-pointer group">
    {/* Seahorse Island */}
    <path d="M 60 100 C 20 100, 20 60, 40 40 C 60 20, 80 20, 90 40 C 100 60, 80 70, 70 70 C 60 70, 50 60, 50 50" fill="none" stroke="#d6bc8a" strokeWidth="25" strokeLinecap="round" />
    {/* Resort Buildings */}
    <rect x="35" y="45" width="20" height="10" fill="#f8fafc" rx="2" transform="rotate(-30 45 50)" />
    <rect x="65" y="30" width="15" height="15" fill="#f8fafc" rx="2" />
    <text x="60" y="115" fill="#16a34a" fontSize="12" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-md">BULGARI RESORT</text>
  </svg>
);

export const AtlantisTheRoyalIcon = () => (
  <svg viewBox="0 0 160 80" className="w-[140px] h-[70px] drop-shadow-2xl z-20 relative cursor-pointer group">
    <rect x="10" y="50" width="140" height="10" fill="#f1f5f9" rx="2" />
    <rect x="20" y="30" width="30" height="20" fill="#e2e8f0" rx="1" />
    <rect x="30" y="10" width="30" height="20" fill="#cbd5e1" rx="1" />
    <rect x="110" y="30" width="30" height="20" fill="#e2e8f0" rx="1" />
    <rect x="100" y="10" width="30" height="20" fill="#cbd5e1" rx="1" />
    <rect x="50" y="15" width="60" height="8" fill="#f8fafc" />
    <text x="80" y="75" fill="#e11d48" fontSize="12" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-md">ATLANTIS THE ROYAL</text>
  </svg>
);

export const JumeirahBeachHotelIcon = () => (
  <svg viewBox="0 0 160 100" className="w-[120px] h-[75px] drop-shadow-xl z-20 relative cursor-pointer">
    <ellipse cx="80" cy="90" rx="75" ry="10" fill="#d6bc8a" />
    <path d="M 10 90 C 10 40, 80 10, 150 90 Z" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" />
    <path d="M 20 90 C 20 50, 80 25, 140 90 Z" fill="#e0f2fe" />
    <path d="M 30 90 C 30 60, 80 40, 130 90 Z" fill="#f0f9ff" />
    <text x="80" y="115" fill="#16a34a" fontSize="14" fontWeight="black" textAnchor="middle" className="drop-shadow-md tracking-widest">JUMEIRAH BEACH HOTEL</text>
  </svg>
);

export const BurjAlArabIcon = () => (
  <svg viewBox="0 0 160 320" className="w-[120px] h-[240px] drop-shadow-2xl z-40 relative cursor-pointer hover:scale-110 transition-transform origin-bottom">
    <ellipse cx="80" cy="285" rx="70" ry="15" fill="#d6bc8a" />
    <path d="M 20 280 L 140 280 L 130 290 L 30 290 Z" fill="#94a3b8" />
    
    <rect x="55" y="40" width="12" height="240" fill="#f8fafc" />
    <rect x="61" y="40" width="6" height="240" fill="#cbd5e1" />
    
    <polygon points="55,40 67,40 61,0" fill="#f8fafc" />
    <polygon points="61,40 67,40 61,0" fill="#cbd5e1" />
    
    <path d="M 55 75 L 15 75 L 15 88 L 55 98 Z" fill="#0ea5e9" opacity="0.9" stroke="#0284c7" strokeWidth="1" />
    <path d="M 55 70 L 15 70 L 15 75 L 55 75 Z" fill="#f8fafc" />
    <polygon points="55,98 15,88 55,110" fill="#cbd5e1" opacity="0.5" />
    
    <path d="M 67 60 Q 180 180 67 280 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
    <path d="M 67 60 Q 120 180 67 280 Z" fill="#bae6fd" opacity="0.6" stroke="#7dd3fc" strokeWidth="2" />
    
    <path d="M 67 60 L 105 130 L 67 170" fill="none" stroke="#f8fafc" strokeWidth="4" strokeLinejoin="round" />
    <path d="M 67 170 L 120 220 L 67 280" fill="none" stroke="#f8fafc" strokeWidth="5" strokeLinejoin="round" />
    <path d="M 67 60 L 105 130 L 67 170" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinejoin="round" />
    <path d="M 67 170 L 120 220 L 67 280" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinejoin="round" />

    <path d="M 67 100 Q 125 150 67 200" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.5" />
    <path d="M 67 130 Q 140 180 67 240" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.5" />
    
    <path d="M 67 90 L 110 80" fill="none" stroke="#64748b" strokeWidth="4" />
    <ellipse cx="120" cy="78" rx="22" ry="6" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
    <ellipse cx="120" cy="78" rx="14" ry="4" fill="none" stroke="#ffffff" strokeWidth="1" />
    <text x="120" y="80.5" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">H</text>

    <text x="80" y="315" fill="#1d4ed8" fontSize="16" fontWeight="black" textAnchor="middle" className="drop-shadow-md tracking-wider">BURJ AL ARAB</text>
  </svg>
);

export { MuseumOfFutureIcon, type MuseumOfFutureProps };
export const MuseumOfTheFutureIcon = MuseumOfFutureIcon;

export const DubaiFrameIcon = ({ width = 80, height = 110 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 100 140" style={{ width: `${width}px`, height: `${height}px` }} className="drop-shadow-xl z-30 cursor-pointer hover:scale-110 transition-transform">
     <rect x="15" y="15" width="70" height="110" fill="none" stroke="#eab308" strokeWidth="14" rx="4" />
     <rect x="18" y="18" width="64" height="104" fill="none" stroke="#fef08a" strokeWidth="4" rx="2" />
     <text x="50" y="138" fill="#ca8a04" fontSize="10" fontWeight="black" textAnchor="middle">DUBAI FRAME</text>
  </svg>
);

export const AtlantisIcon = () => (
  <svg viewBox="0 0 150 120" className="w-[140px] h-[110px] drop-shadow-2xl">
    <path d="M 0 120 L 150 120 L 125 40 L 105 40 L 105 0 L 45 0 L 45 40 L 25 40 Z" fill="#fda4af" stroke="#fb7185" strokeWidth="1" />
    <path d="M 75 40 Q 75 80 50 120 L 100 120 Q 75 80 75 40 Z" fill="#A6D59A" />
    <rect x="45" y="0" width="60" height="20" fill="#fca5a5" />
    <rect x="45" y="20" width="60" height="5" fill="#e11d48" />
  </svg>
);

export const EmiratesTowersIcon = () => (
  <svg viewBox="0 0 150 350" className="w-[120px] h-[280px] drop-shadow-2xl">
    <path d="M 10 350 L 50 350 L 50 50 L 10 100 Z" fill="#94a3b8" />
    <path d="M 50 350 L 70 350 L 70 150 L 50 50 Z" fill="#cbd5e1" opacity="0.8" />
    <path d="M 80 350 L 120 350 L 120 120 L 80 170 Z" fill="#94a3b8" />
    <path d="M 120 350 L 140 350 L 140 220 L 120 120 Z" fill="#cbd5e1" opacity="0.8" />
  </svg>
);

export const GevoraIcon = () => (
  <svg viewBox="0 0 100 450" className="w-[60px] h-[350px] drop-shadow-2xl">
    <rect x="30" y="100" width="40" height="350" fill="#d97706" />
    <rect x="35" y="100" width="30" height="350" fill="#f59e0b" />
    <path d="M 30 100 L 70 100 L 60 40 L 40 40 Z" fill="#fbbf24" />
    <path d="M 40 40 L 60 40 L 50 0 Z" fill="#fef3c7" />
  </svg>
);

export const RoseRayhaanIcon = () => (
  <svg viewBox="0 0 100 400" className="w-[70px] h-[300px] drop-shadow-2xl">
    <rect x="25" y="100" width="50" height="300" fill="#0284c7" />
    <rect x="35" y="100" width="30" height="300" fill="#38bdf8" />
    <path d="M 25 100 Q 50 0 75 100 Z" fill="#7dd3fc" />
    <circle cx="50" cy="50" r="8" fill="#e0f2fe" />
    <path d="M 48 50 L 52 50 L 50 10 Z" fill="#e0f2fe" />
  </svg>
);

export const DWTCIcon = () => (
  <svg viewBox="0 0 150 300" className="w-[90px] h-[180px] drop-shadow-2xl">
    <rect x="15" y="250" width="120" height="50" fill="#f8fafc" />
    <rect x="25" y="200" width="100" height="50" fill="#e2e8f0" />
    <rect x="35" y="150" width="80" height="50" fill="#f8fafc" />
    <rect x="45" y="100" width="60" height="50" fill="#e2e8f0" />
    <rect x="55" y="50" width="40" height="50" fill="#f8fafc" />
    <rect x="25" y="260" width="100" height="20" fill="#1e293b" opacity="0.1" />
    <rect x="35" y="210" width="80" height="20" fill="#1e293b" opacity="0.1" />
    <rect x="45" y="160" width="60" height="20" fill="#1e293b" opacity="0.1" />
    <rect x="55" y="110" width="40" height="20" fill="#1e293b" opacity="0.1" />
    <rect x="65" y="60" width="20" height="20" fill="#1e293b" opacity="0.1" />
  </svg>
);

export const SalikGate = ({ width = 100, height = 40 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 100 40" style={{ width: `${width}px`, height: `${height}px` }} className="drop-shadow-xl z-20 relative pointer-events-none">
    <rect x="0" y="0" width="8" height="40" fill="#94a3b8" />
    <rect x="92" y="0" width="8" height="40" fill="#94a3b8" />
    <rect x="0" y="10" width="100" height="10" fill="#e2e8f0" />
    <rect x="25" y="5" width="50" height="20" fill="#ef4444" rx="4" />
    <text x="50" y="19" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">SALIK</text>
  </svg>
);

export const RoadSign = ({ text }: { text: string }) => (
  <svg viewBox="0 0 120 60" width="100%" height="100%">
    <rect width="120" height="60" fill="#166534" rx="5" />
    <text x="60" y="35" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">{text}</text>
  </svg>
);

export const SkylineTower = ({ seed }: { seed: number }) => (
  <svg viewBox="0 0 100 300" width="100%" height="100%" className="drop-shadow-xl z-30 hover:scale-105 transition-transform">
    <rect x="20" y="50" width="60" height="250" fill="#64748b" rx="4" />
    <rect x="30" y="60" width="40" height="240" fill="#94a3b8" />
  </svg>
);

export interface DubaiMetroStationProps {
  id?: string;
  name?: string;
  stationCode?: string;
  line?: 'red' | 'green';
  width?: number;
  height?: number;
  onClick?: () => void;
  className?: string;
}

export const DubaiMetroStation: React.FC<DubaiMetroStationProps> = ({
  name = "Burj Khalifa / Dubai Mall",
  stationCode = "25",
  line = "red",
  width = 340,
  height = 200,
  onClick,
  className = ""
}) => {
  return (
    <svg
      viewBox="0 0 360 220"
      preserveAspectRatio="none"
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`drop-shadow-2xl z-20 cursor-pointer hover:scale-[1.03] transition-all origin-bottom select-none ${className}`}
      onClick={onClick}
    >
      <defs>
        {/* Dubai Metro Iconic Metallic Golden Shell Gradient */}
        <linearGradient id="metroGoldShell" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="20%" stopColor="#f59e0b" />
          <stop offset="45%" stopColor="#fde68a" />
          <stop offset="70%" stopColor="#fbbf24" />
          <stop offset="90%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Shimmering Specular Highlight on Shell Spine */}
        <linearGradient id="metroGoldSpine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
        </linearGradient>

        {/* Panoramic Azure Tinted Window Ribbon */}
        <linearGradient id="metroWindowGlass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="40%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>

        {/* Architectural Concrete Pier Gradient */}
        <linearGradient id="metroConcretePier" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="40%" stopColor="#94a3b8" />
          <stop offset="70%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Interior Platform Ambient Light */}
        <linearGradient id="metroPlatformLight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#fef08a" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.3" />
        </linearGradient>

        {/* Red Line Glow Filter */}
        <filter id="metroRedGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ef4444" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* ==================================================================== */}
      {/* 1. GROUND FOUNDATION PLINTH (Aligned with FloorTile Isometry)        */}
      {/* ==================================================================== */}
      <g>
        {/* Concrete Foundation Slab (Matches 0.0166 baseline incline) */}
        <polygon points="36,192 324,196.8 308,180.8 20,176" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
        {/* Lower Emboss Lip */}
        <polygon points="36,192 324,196.8 324,201.8 36,197" fill="#64748b" />
        <polygon points="36,197 324,201.8 324,203.5 36,198.7" fill="#000000" opacity="0.13" />

        {/* Landscaping Palm Planters */}
        {[55, 170, 285].map((tx, idx) => (
          <ellipse key={`tree-${idx}`} cx={tx} cy={183 + idx * 1.5} rx="5" ry="3" fill="#15803d" opacity="0.8" />
        ))}
      </g>

      {/* ==================================================================== */}
      {/* 2. MASSIVE SCULPTED CONCRETE V-SHAPED SUPPORT PIERS                   */}
      {/* Lifting the elevated station above the ground                        */}
      {/* ==================================================================== */}
      <g>
        {/* Pier 1 (Left Pier) */}
        <polygon points="76,190 88,190.2 92,154 72,154" fill="url(#metroConcretePier)" stroke="#334155" strokeWidth="0.8" />
        <polygon points="68,154 76,154 62,136 54,136" fill="url(#metroConcretePier)" />
        <polygon points="88,154 96,154 110,136 102,136" fill="url(#metroConcretePier)" />

        {/* Pier 2 (Center Pier) */}
        <polygon points="172,191.6 184,191.8 188,155.6 168,155.6" fill="url(#metroConcretePier)" stroke="#334155" strokeWidth="0.8" />
        <polygon points="164,155.6 172,155.6 158,137.6 150,137.6" fill="url(#metroConcretePier)" />
        <polygon points="184,155.6 192,155.6 206,137.6 198,137.6" fill="url(#metroConcretePier)" />

        {/* Pier 3 (Right Pier) */}
        <polygon points="268,193.2 280,193.4 284,157.2 264,157.2" fill="url(#metroConcretePier)" stroke="#334155" strokeWidth="0.8" />
        <polygon points="260,157.2 268,157.2 254,139.2 246,139.2" fill="url(#metroConcretePier)" />
        <polygon points="280,157.2 288,157.2 302,139.2 294,139.2" fill="url(#metroConcretePier)" />

        {/* Elevated Viaduct Track Deck passing through the station */}
        <polygon points="10,140 350,145.6 348,152.6 8,147" fill="#334155" stroke="#1e293b" strokeWidth="1" />
        {/* Continuous Steel Track Rails */}
        <line x1="8" y1="142" x2="350" y2="147.6" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="8" y1="145" x2="350" y2="150.6" stroke="#94a3b8" strokeWidth="1.5" />
      </g>

      {/* ==================================================================== */}
      {/* 3. CYLINDRICAL PEDESTRIAN SKYBRIDGE TUBE (AIR-CONDITIONED LINK)      */}
      {/* Overpass connecting station to street-level concourse entrance pod   */}
      {/* ==================================================================== */}
      <g>
        {/* Enclosed Glass & Golden Tube Walkway */}
        <polygon points="110,138 52,168 56,179 114,149" fill="url(#metroWindowGlass)" opacity="0.9" stroke="#78350f" strokeWidth="0.8" />
        {/* Tube Golden Roof Canopy Cap */}
        <polygon points="110,138 52,168 54,163 112,133" fill="url(#metroGoldShell)" stroke="#78350f" strokeWidth="0.8" />
        {/* Tube Internal Walkway Warm Lights */}
        {[0.2, 0.4, 0.6, 0.8].map((t, idx) => {
          const x = 110 + t * (52 - 110);
          const y = 143.5 + t * (173.5 - 143.5);
          return <circle key={`sb-light-${idx}`} cx={x} cy={y} r="1.5" fill="#fef08a" />;
        })}

        {/* Street-Level Entrance Concourse Pod */}
        <polygon points="34,166 68,166.5 64,188 30,187.5" fill="url(#metroGoldShell)" stroke="#78350f" strokeWidth="1" />
        {/* Glass Entrance Doors with illuminated sign */}
        <polygon points="38,172 60,172.4 58,187.4 36,187" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
        {/* RTA Red Metro 'M' Totem Sign at entrance */}
        <rect x="22" y="168" width="4" height="20" fill="#dc2626" />
        <circle cx="24" cy="166" r="3.5" fill="#dc2626" />
        <text x="24" y="168" fill="#ffffff" fontSize="4.5" fontWeight="black" textAnchor="middle">M</text>
      </g>

      {/* ==================================================================== */}
      {/* 4. THE ICONIC GOLDEN ARMADILLO / NAUTILUS PEARL SHELL CANOPY        */}
      {/* Designed by Aedas: Sweeping aerodynamic cocoon spanning the viaduct  */}
      {/* ==================================================================== */}
      <g>
        {/* Soft Ambient Ground & Viaduct Shadow under the Shell */}
        <ellipse cx="180" cy="142" rx="140" ry="18" fill="#000000" opacity="0.35" />

        {/* Main Golden Pearl Shell Body (Aerodynamic Cocoon) */}
        <path
          d="M 38,118 Q 180,56 322,122 L 318,142 Q 180,166 34,140 Z"
          fill="url(#metroGoldShell)"
          stroke="#78350f"
          strokeWidth="1.2"
        />

        {/* Architectural Rib Louver Seams (The signature Armadillo shell bands) */}
        {[0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.90].map((t, idx) => {
          const topX = 38 + t * (322 - 38);
          const topY = 118 + t * 4 - Math.sin(t * Math.PI) * 58;
          const botX = 34 + t * (318 - 34);
          const botY = 140 + t * 2 + Math.sin(t * Math.PI) * 24;
          return (
            <path
              key={`rib-${idx}`}
              d={`M ${topX},${topY} Q ${topX - 6},${(topY + botY) / 2} ${botX},${botY}`}
              fill="none"
              stroke="#78350f"
              strokeWidth="1.2"
              opacity="0.8"
            />
          );
        })}

        {/* Shimmering Metallic Specular Highlight along Top Curved Spine */}
        <path
          d="M 52,114 Q 180,60 308,118"
          fill="none"
          stroke="url(#metroGoldSpine)"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Continuous Panoramic Sapphire Window Ribbon (Platform Glazing) */}
        <path
          d="M 44,123 Q 180,95 314,126 L 312,135 Q 180,111 42,132 Z"
          fill="url(#metroWindowGlass)"
          stroke="#0284c7"
          strokeWidth="1"
        />

        {/* Interior Platform Warm Lights through window glass */}
        <path
          d="M 48,126 Q 180,100 310,129 L 308,132 Q 180,105 46,130 Z"
          fill="url(#metroPlatformLight)"
        />

        {/* Platform Waiting Passengers Silhouettes & Screen Doors */}
        {[70, 95, 120, 145, 170, 195, 220, 245, 270, 290].map((px, idx) => (
          <g key={`psg-${idx}`}>
            <circle cx={px} cy={122 - Math.sin((px - 38) / 284 * Math.PI) * 16} r="1.2" fill="#0f172a" opacity="0.75" />
            <line 
              x1={px} 
              y1={123.5 - Math.sin((px - 38) / 284 * Math.PI) * 16} 
              x2={px} 
              y2={127 - Math.sin((px - 38) / 284 * Math.PI) * 16} 
              stroke="#0f172a" 
              strokeWidth="1.2" 
              opacity="0.75" 
            />
          </g>
        ))}

        {/* Track Entry & Exit Tunnel Portals at Shell Ends */}
        <ellipse cx="38" cy="129" rx="6" ry="10" fill="#0f172a" stroke="#d97706" strokeWidth="1" />
        <ellipse cx="320" cy="132" rx="6" ry="10" fill="#0f172a" stroke="#d97706" strokeWidth="1" />
      </g>

      {/* ==================================================================== */}
      {/* 5. STATION IDENTIFIER & ILLUMINATED RTA METRO SIGNAGE                */}
      {/* ==================================================================== */}
      <g>
        {/* Central Dubai Metro Illuminated Red Medallion Badge */}
        <circle cx="180" cy="80" r="10" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" filter="url(#metroRedGlow)" />
        <text x="180" y="84" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif">
          M
        </text>

        {/* Station Nameplate Banner (Glass Backlit Plaque) */}
        <g transform="translate(180, 102)">
          <rect x="-85" y="-10" width="170" height="20" rx="4" fill="#020617" opacity="0.92" stroke="#d97706" strokeWidth="1" />
          {/* Station Red Line Code Dot */}
          <circle cx="-73" cy="0" r="4" fill="#ef4444" />
          <text x="-73" y="2.5" fill="#ffffff" fontSize="5" fontWeight="900" textAnchor="middle">
            {stationCode}
          </text>
          {/* Station Title */}
          <text x="-64" y="-1" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.8">
            {name.toUpperCase()}
          </text>
          <text x="-64" y="6.5" fill="#f59e0b" fontSize="5.5" fontWeight="bold" fontFamily="monospace">
            RED LINE • محطة مترو دبي
          </text>
          {/* Live Train Indicator */}
          <rect x="52" y="-6" width="26" height="12" rx="3" fill="#22c55e" opacity="0.9" />
          <text x="65" y="2" fill="#ffffff" fontSize="4.5" fontWeight="black" textAnchor="middle">
            LIVE 2m
          </text>
        </g>

        {/* Click to Board Prompt Badge */}
        <g transform="translate(180, 158)" className="pointer-events-none">
          <rect x="-60" y="-8" width="120" height="16" rx="8" fill="#2563eb" stroke="#ffffff" strokeWidth="1" className="shadow-lg" />
          <text x="0" y="3" fill="#ffffff" fontSize="7" fontWeight="black" textAnchor="middle" letterSpacing="0.8">
            🚆 ENTER METRO / BOARD TRAIN
          </text>
        </g>
      </g>
    </svg>
  );
};

export const MetroStationBlock = DubaiMetroStation;

export const AirportBlock = ({ width = 620, height = 330, name = "DXB International Airport" }: { width?: number, height?: number, name?: string }) => (
  <svg 
    viewBox="0 0 620 330" 
    preserveAspectRatio="none"
    style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }} 
    className="drop-shadow-2xl z-20 hover:scale-[1.02] transition-transform select-none cursor-pointer"
  >
    <defs>
      {/* Runway Asphalt Gradient */}
      <linearGradient id="isoAsphaltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#090d16" />
        <stop offset="50%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#090d16" />
      </linearGradient>

      {/* Terminal Glass Roof Gradient */}
      <linearGradient id="isoTerminalGlass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
        <stop offset="50%" stopColor="#0284c7" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
      </linearGradient>

      {/* Airplane Shadow Gradient */}
      <radialGradient id="planeIsoShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>

      {/* Isometric Airfield Surface Clip Path (Same 0.235 slant & 0.0166 tilt as FloorTile) */}
      <clipPath id="airport-iso-base-clip">
        <polygon points="84,38 596,47 536,297 24,288" />
      </clipPath>

      {/* Approach Glide & Runway Rollout Path (Following isometric runway centerline) */}
      <path id="airplane-iso-glide-path" d="M -70 120 C 30 180, 110 230, 175 237 L 485 242 C 525 242, 575 205, 665 110" fill="none" />
      <path id="airplane-iso-shadow-path" d="M -70 237 L 175 237 L 485 242 L 665 242" fill="none" />
    </defs>

    {/* ==================================================================== */}
    {/* 1. LOWER SIDE EMBOSS (Exact same lower edge bevel as FloorTile)      */}
    {/* ==================================================================== */}
    <polygon points="24,288 536,297 536,302 24,293" fill="#0f172a" />
    <polygon points="24,288 536,297 536,300 24,291" fill="#334155" />

    {/* ==================================================================== */}
    {/* 2. ISOMETRIC AIRFIELD BASE PLATFORM (Matching FloorTile geometry)    */}
    {/* ==================================================================== */}
    <polygon 
      points="84,38 596,47 536,297 24,288" 
      fill="#1e293b" 
      stroke="#475569" 
      strokeWidth="2.5" 
      strokeLinejoin="round" 
    />

    {/* Elements Clipped Inside Isometric Airfield Plane */}
    <g clipPath="url(#airport-iso-base-clip)">
      {/* Airfield Infield Grass / Turf Grounds (Isometric Parcels) */}
      <polygon points="90,44 590,53 570,120 74,111" fill="#2d3748" opacity="0.8" />
      <polygon points="68,140 564,149 550,195 56,186" fill="#334155" opacity="0.6" />
      <polygon points="54,272 522,280 520,294 30,286" fill="#2d3748" opacity="0.9" />

      {/* ==================================================================== */}
      {/* 3. 3D ISOMETRIC TERMINAL COMPLEX & CONCOURSE (TOP)                   */}
      {/* ==================================================================== */}
      <g>
        {/* Terminal Apron Paving */}
        <polygon points="120,60 550,68 536,128 106,120" fill="#1e293b" stroke="#334155" strokeWidth="1" />

        {/* 3D Concourse Base Wall (Depth Drop) */}
        <polygon points="135,78 525,85 525,89 135,82" fill="#0f172a" />

        {/* 3D Curved Concourse Roof (Isometric Aerofoil Design) */}
        <polygon points="140,54 530,61 520,85 130,78" fill="url(#isoTerminalGlass)" stroke="#bae6fd" strokeWidth="1.2" />

        {/* Solar Panels & Skylight Glazing Rows on Concourse */}
        {Array.from({ length: 16 }).map((_, i) => {
          const t1 = (15 + i * 23) / 400;
          const t2 = (32 + i * 23) / 400;
          const x1 = 145 + t1 * 365;
          const y1 = 57 + t1 * 6;
          const x2 = 145 + t2 * 365;
          const y2 = 57 + t2 * 6;
          const x3 = 137 + t2 * 365;
          const y3 = 76 + t2 * 6;
          const x4 = 137 + t1 * 365;
          const y4 = 76 + t1 * 6;
          return (
            <polygon key={`iso-sky-${i}`} points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} fill="#0f172a" opacity="0.4" stroke="#38bdf8" strokeWidth="0.6" />
          );
        })}

        {/* Terminal Gates / Telescoping Jet Bridges */}
        {Array.from({ length: 8 }).map((_, i) => {
          const t = (i + 0.5) / 8;
          const gx = 145 + t * 350;
          const gy = 80 + t * 6;
          return (
            <g key={`iso-gate-${i}`} transform={`translate(${gx}, ${gy})`}>
              {/* Jet Bridge Arm */}
              <polygon points="0,0 8,0.1 6,14 -2,13.9" fill="#64748b" />
              <polygon points="-4,13.5 12,13.7 10,20 -6,19.8" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />
              
              {/* Parked Widebody Jet at Alternate Gates (Isometric 3D Airliner) */}
              {i % 2 === 1 && (
                <g transform="translate(3, 22) scale(0.65)">
                  {/* Aircraft Shadow */}
                  <ellipse cx="0" cy="18" rx="20" ry="6" fill="#000000" opacity="0.35" />
                  {/* Fuselage */}
                  <polygon points="0,-18 5,-12 4,20 0,26 -4,20 -5,-12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
                  {/* Swept Wings */}
                  <polygon points="0,-2 26,12 22,14 0,6 -22,14 -26,12" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
                  {/* Red Tailfin */}
                  <polygon points="0,15 4,26 -4,26" fill="#ef4444" />
                  {/* Turbofans */}
                  <rect x="8" y="4" width="4" height="8" rx="1.5" fill="#d97706" />
                  <rect x="-12" y="4" width="4" height="8" rx="1.5" fill="#d97706" />
                </g>
              )}
            </g>
          );
        })}

        {/* 3D Iconic DXB Air Traffic Control Tower (Back-Right) */}
        <g transform="translate(528, 42)">
          {/* Tower Shadow */}
          <ellipse cx="10" cy="40" rx="12" ry="4" fill="#000000" opacity="0.3" />
          {/* Front Tower Shaft Wall */}
          <polygon points="4,10 16,10.2 14,40 2,39.8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
          {/* Right Tower Wall (3D Shading) */}
          <polygon points="16,10.2 22,9 20,38 14,40" fill="#94a3b8" />
          {/* 360° Glass Control Cab */}
          <polygon points="1,10 19,10.3 25,6 7,5.7" fill="#38bdf8" opacity="0.9" stroke="#0284c7" strokeWidth="0.8" />
          <polygon points="3,6 17,6.2 15,-2 1,-2.2" fill="#0284c7" opacity="0.9" />
          {/* Pulsing Red Hazard Beacon */}
          <circle cx="8" cy="-3" r="2.5" fill="#ef4444">
            <animate attributeName="opacity" values="1;0.1;1" dur="1s" repeatCount="indefinite" />
          </circle>
          {/* Radar Antenna */}
          <line x1="8" y1="-3" x2="8" y2="-9" stroke="#64748b" strokeWidth="1.2" />
          <circle cx="8" cy="-9" r="1.5" fill="#94a3b8" />
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 4. HIGH-SPEED ISOMETRIC TAXIWAYS & APRON ROADWAYS                    */}
      {/* ==================================================================== */}
      <path d="M 110,135 L 530,142" stroke="#facc15" strokeWidth="1.5" strokeDasharray="12 8" fill="none" opacity="0.85" />
      <path d="M 160,136 Q 190,175 210,210" stroke="#facc15" strokeWidth="1.5" fill="none" opacity="0.85" />
      <path d="M 320,139 Q 345,178 365,213" stroke="#facc15" strokeWidth="1.5" fill="none" opacity="0.85" />
      <path d="M 460,141 Q 480,180 500,215" stroke="#facc15" strokeWidth="1.5" fill="none" opacity="0.85" />

      {/* Taxiway Blue Edge Lights */}
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={`iso-tblue-${i}`} cx={120 + i * 30} cy={140 + i * 0.5} r="1.8" fill="#38bdf8" opacity="0.9">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
        </circle>
      ))}

      {/* ==================================================================== */}
      {/* 5. 3D ISOMETRIC RUNWAY 12R / 30L                                     */}
      {/* ==================================================================== */}
      {/* Runway Asphalt Surface (Aligned with FloorTile's slant & tilt) */}
      <polygon 
        points="74,208 524,216 512,266 62,258" 
        fill="url(#isoAsphaltGrad)" 
        stroke="#475569" 
        strokeWidth="1.8" 
      />

      {/* Touchdown Zone Skid Marks Texture */}
      <polygon points="160,218 280,220 274,256 154,254" fill="#000000" opacity="0.38" />

      {/* Threshold "Piano Key" Stripes (Left - 12R) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const y = 214 + i * 5;
        const x1 = 86 - (i * 0.8);
        const x2 = 104 - (i * 0.8);
        return <line key={`iso-pk-l-${i}`} x1={x1} y1={y} x2={x2} y2={y + 0.3} stroke="#ffffff" strokeWidth="3" />;
      })}
      {/* Runway Number 12R */}
      <text x="114" y="240" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="monospace" letterSpacing="0.8">12R</text>

      {/* Threshold "Piano Key" Stripes (Right - 30L) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const y = 222 + i * 5;
        const x1 = 485 - (i * 0.8);
        const x2 = 503 - (i * 0.8);
        return <line key={`iso-pk-r-${i}`} x1={x1} y1={y} x2={x2} y2={y + 0.3} stroke="#ffffff" strokeWidth="3" />;
      })}
      <text x="460" y="247" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="monospace" letterSpacing="0.8">30L</text>

      {/* Aiming Point Touchdown Zone Markers */}
      <polygon points="175,217 210,217.6 208,224 173,223.4" fill="#ffffff" />
      <polygon points="171,248 206,248.6 204,255 169,254.4" fill="#ffffff" />

      {/* Runway Centerline (Following 0.017 incline) */}
      <line x1="145" y1="237" x2="450" y2="242" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="18 12" />

      {/* Runway Edge Lights (Top and Bottom along the Runway) */}
      {Array.from({ length: 18 }).map((_, i) => {
        const t = i / 17;
        const tx = 76 + t * (522 - 76);
        const ty = 210 + t * (216 - 210);
        const bx = 64 + t * (510 - 64);
        const by = 260 + t * (266 - 260);
        return (
          <g key={`iso-rwl-${i}`}>
            <circle cx={tx} cy={ty} r="1.8" fill={i < 3 || i > 14 ? "#facc15" : "#ffffff"}>
              <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={bx} cy={by} r="1.8" fill={i < 3 || i > 14 ? "#facc15" : "#ffffff"}>
              <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}

      {/* Threshold Green Lights (Arrival End) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <circle key={`iso-thg-${i}`} cx={76 - i * 1.5} cy={215 + i * 8} r="2.2" fill="#22c55e" />
      ))}
      {/* Runway End Red Lights */}
      {Array.from({ length: 6 }).map((_, i) => (
        <circle key={`iso-thr-${i}`} cx={521 - i * 1.5} cy={223 + i * 8} r="2.2" fill="#ef4444" />
      ))}

      {/* ==================================================================== */}
      {/* 6. APPROACH LIGHTING SYSTEM (ALS) WITH STROBE LIGHTS                 */}
      {/* ==================================================================== */}
      <g>
        {[-35, -15, 5, 25].map((xOffset, i) => (
          <g key={`iso-als-${i}`} transform={`translate(${45 + xOffset}, 235)`}>
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="2.5" fill="#ffffff">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </g>

      {/* ==================================================================== */}
      {/* 7. TOUCHDOWN SMOKE EFFECT                                            */}
      {/* ==================================================================== */}
      <g transform="translate(175, 237)">
        <ellipse cx="0" cy="0" rx="4" ry="2" fill="#f8fafc" opacity="0">
          <animate attributeName="rx" values="3;18;24;3" dur="10s" repeatCount="indefinite" keyTimes="0;0.34;0.42;1" />
          <animate attributeName="ry" values="1.5;9;12;1.5" dur="10s" repeatCount="indefinite" keyTimes="0;0.34;0.42;1" />
          <animate attributeName="opacity" values="0;0.8;0;0" dur="10s" repeatCount="indefinite" keyTimes="0;0.34;0.44;1" />
        </ellipse>
      </g>
    </g>

    {/* ==================================================================== */}
    {/* 8. ANIMATED 3D ISOMETRIC LANDING AIRPLANE                            */}
    {/* ==================================================================== */}
    {/* Dynamic Ground Shadow Under Aircraft */}
    <g>
      <animateMotion dur="10s" repeatCount="indefinite" rotate="auto" keyTimes="0;0.33;0.75;1" keyPoints="0;0.33;0.75;1">
        <mpath href="#airplane-iso-shadow-path" />
      </animateMotion>
      <ellipse cx="0" cy="0" rx="28" ry="7" fill="url(#planeIsoShadow)">
        <animate attributeName="rx" values="14;28;26;14" dur="10s" repeatCount="indefinite" keyTimes="0;0.33;0.75;1" />
        <animate attributeName="opacity" values="0.2;0.6;0.5;0.1" dur="10s" repeatCount="indefinite" keyTimes="0;0.33;0.75;1" />
      </ellipse>
    </g>

    {/* The Aircraft Body (Emirates Widebody Airliner in 3D Isometric View) */}
    <g className="filter drop-shadow-xl">
      <animateMotion dur="10s" repeatCount="indefinite" rotate="auto" keyTimes="0;0.33;0.75;1" keyPoints="0;0.33;0.75;1">
        <mpath href="#airplane-iso-glide-path" />
      </animateMotion>
      
      <g transform="scale(1.15)">
        {/* Main Fuselage */}
        <path d="M 30 0 C 28 -5, 10 -6, -24 -5 C -34 -4, -38 -2, -40 0 C -38 2, -34 4, -24 5 C 10 6, 28 5, 30 0 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
        {/* Cockpit Windshield */}
        <path d="M 25 -2 L 28 0 L 25 2 L 23 1.8 L 23 -1.8 Z" fill="#0f172a" />

        {/* Swept Main Wings (Isometric Aspect) */}
        <path d="M 6 -3 L -10 -32 L -16 -32 L -8 -3 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
        <path d="M 6 3 L -10 32 L -16 32 L -8 3 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />

        {/* Winglets (Signature Red Emirates Accents) */}
        <polygon points="-10,-32 -14,-35 -16,-32" fill="#ef4444" />
        <polygon points="-10,32 -14,35 -16,32" fill="#ef4444" />

        {/* Under-Wing High-Bypass Turbofans */}
        <rect x="-3" y="-17" width="13" height="5.5" rx="1.8" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
        <ellipse cx="10" cy="-14" rx="1.5" ry="2.8" fill="#d97706" />
        <rect x="-3" y="11.5" width="13" height="5.5" rx="1.8" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
        <ellipse cx="10" cy="14" rx="1.5" ry="2.8" fill="#d97706" />

        {/* Horizontal Tail Stabilizers */}
        <polygon points="-28,-2 -38,-14 -41,-14 -34,-2" fill="#e2e8f0" />
        <polygon points="-28,2 -38,14 -41,14 -34,2" fill="#e2e8f0" />

        {/* Vertical Tailfin with Signature Emirates Flag Livery */}
        <path d="M -28 0 L -40 -2 L -42 0 L -40 2 Z" fill="#ef4444" />
        <polygon points="-30,0 -40,-1 -40,1" fill="#f59e0b" />

        {/* Port (Left) Red Navigation Light */}
        <circle cx="-13" cy="-33" r="1.8" fill="#ef4444">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
        </circle>
        {/* Starboard (Right) Green Navigation Light */}
        <circle cx="-13" cy="33" r="1.8" fill="#22c55e">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
        </circle>

        {/* Anti-Collision Flashing High-Intensity White Strobes */}
        <circle cx="-14" cy="-33" r="2.8" fill="#ffffff" opacity="0">
          <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" keyTimes="0;0.1;1" />
        </circle>
        <circle cx="-14" cy="33" r="2.8" fill="#ffffff" opacity="0">
          <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" keyTimes="0;0.1;1" />
        </circle>
      </g>
    </g>

    {/* ==================================================================== */}
    {/* 9. ISOMETRIC AIRPORT GLASS EMBOSSED BADGE                            */}
    {/* ==================================================================== */}
    <g transform="translate(30, 280)">
      <polygon points="0,0 230,3.8 228,24 0,20.2" fill="#0f172a" opacity="0.85" stroke="#38bdf8" strokeWidth="1.2" />
      <circle cx="16" cy="11" r="4.5" fill="#22c55e" />
      <text x="28" y="15" fill="#ffffff" fontSize="11" fontWeight="900" letterSpacing="0.8">
        ✈️ {name.toUpperCase()}
      </text>
    </g>
  </svg>
);

export const TycoonBlock = ({ name, type, cols, rows, w, h }: any) => {
  const cellW = (w - 20) / cols;
  const cellH = (h - 40) / rows;
  const units = [];
  for(let r=0; r<rows; r++) {
    for(let c=0; c<cols; c++) {
      units.push({ c, r, x: 10 + c*cellW, y: 30 + r*cellH });
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: `${w}px`, height: `${h}px` }} className="drop-shadow-xl hover:scale-105 transition-transform z-20">
      <rect x="0" y="0" width={w} height={h} fill="#22c55e" rx="10" stroke="#16a34a" strokeWidth="4" />
      <rect x="0" y="0" width={w} height="25" fill="#16a34a" rx="10" />
      {name && <text x={w/2} y={17} fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">{name.toUpperCase()}</text>}
      
      {units.map((u, i) => (
        <rect 
          key={i} x={u.x + cellW*0.1} y={u.y + cellH*0.1} 
          width={cellW*0.8} height={cellH*0.8} 
          fill={type === 'apartment' ? "#3b82f6" : "#f59e0b"} 
          rx="2" 
        />
      ))}
    </svg>
  );
};

export const BluewatersBlock = () => <TycoonBlock name="Bluewaters" type="apartment" cols={8} rows={4} w={200} h={120} />;
export const ArabianRanchesBlock = () => <TycoonBlock name="Arabian Ranches" type="villa" cols={11} rows={8} w={340} h={270} />;
export const JBRBlock = () => <TycoonBlock name="JBR" type="apartment" cols={12} rows={2} w={350} h={90} />;
export const EmiratesHillsBlock = () => <TycoonBlock name="Emirates Hills" type="villa" cols={12} rows={7} w={360} h={240} />;
export const BusinessBayBlock = () => <TycoonBlock name="Business Bay" type="apartment" cols={12} rows={10} w={360} h={320} />;
export const DeiraBlock = () => <TycoonBlock name="Deira" type="apartment" cols={11} rows={7} w={340} h={240} />;
export const MotorCityBlock = () => <TycoonBlock name="Motor City" type="apartment" cols={10} rows={6} w={310} h={210} />;

export const PalmCommunityBlock = ({ width = 350, height = 350 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 500 500" style={{ width: `${width}px`, height: `${height}px` }} className="drop-shadow-2xl z-20 relative cursor-pointer group">
     <path d="M 110 95 A 220 220 0 0 1 390 95" fill="none" stroke="#d6bc8a" strokeWidth="35" strokeLinecap="round" />
     <path d="M 90 110 A 220 220 0 0 0 70 400" fill="none" stroke="#d6bc8a" strokeWidth="30" strokeLinecap="round" />
     <path d="M 410 110 A 220 220 0 0 1 430 400" fill="none" stroke="#d6bc8a" strokeWidth="30" strokeLinecap="round" />
     
     <line x1="250" y1="50" x2="250" y2="150" stroke="#94a3b8" strokeWidth="6" strokeDasharray="5,5" />
     
     <rect x="210" y="140" width="8" height="280" fill="#d6bc8a" />
     <rect x="170" y="370" width="160" height="30" rx="10" fill="#d6bc8a" />
     <rect x="190" y="410" width="120" height="20" rx="6" fill="#d6bc8a" />
     
     {Array.from({length: 8}).map((_, i) => {
        const y = 160 + i * 27;
        return (
           <g key={i}>
              <path d={`M 230 ${y} Q 110 ${y+10} 70 ${y - 30}`} fill="none" stroke="#d6bc8a" strokeWidth="24" strokeLinecap="round" />
              <path d={`M 270 ${y} Q 390 ${y+10} 430 ${y - 30}`} fill="none" stroke="#d6bc8a" strokeWidth="24" strokeLinecap="round" />
           </g>
        )
     })}

     <rect x="246" y="140" width="8" height="310" fill="#94a3b8" />
     
     <g transform="translate(210, 15)">
        <rect x="10" y="15" width="60" height="35" fill="#f43f5e" rx="4" />
        <rect x="30" y="25" width="20" height="25" fill="#d6bc8a" /> 
        <rect x="0" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <rect x="65" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <polygon points="0,15 7.5,-5 15,15" fill="#9f1239" />
        <polygon points="65,15 72.5,-5 80,15" fill="#9f1239" />
        <polygon points="25,15 40,0 55,15" fill="#9f1239" />
        <text x="40" y="65" fill="#9f1239" fontSize="12" fontWeight="black" textAnchor="middle" className="drop-shadow-md">ATLANTIS</text>
     </g>

     <text x="250" y="340" fill="#16a34a" fontSize="20" fontWeight="black" textAnchor="middle" transform="rotate(-90 250 340)" className="tracking-widest drop-shadow-md">PALM JUMEIRAH</text>
  </svg>
);

export const GenericNeighborhood = ({ name, seed }: { name: string, seed: number }) => (
  <svg viewBox="0 0 200 200" width="100%" height="100%" className="drop-shadow-lg z-10 hover:scale-105 transition-transform">
    <rect width="200" height="200" fill="#e2e8f0" rx="10" stroke="#cbd5e1" strokeWidth="4" />
    <rect width="200" height="30" fill="#cbd5e1" rx="10" />
    <text x="100" y="20" fill="#475569" fontSize="14" fontWeight="bold" textAnchor="middle">{name.toUpperCase()}</text>
    <rect x="20" y="50" width="60" height="60" fill="#94a3b8" rx="4" />
    <rect x="100" y="50" width="80" height="120" fill="#64748b" rx="4" />
    <rect x="20" y="130" width="60" height="40" fill="#cbd5e1" rx="4" />
  </svg>
);

export const initialAds: any[] = [];

export const BridgeBlock = ({ width = 10, height = 100 }: any) => (
  <svg viewBox="0 0 100 100" style={{ width: `${width}px`, height: `${height}px` }} className="z-10" preserveAspectRatio="none">
    <rect x="20" y="0" width="60" height="100" fill="#334155" />
    <line x1="50" y1="0" x2="50" y2="100" stroke="#facc15" strokeWidth="4" strokeDasharray="10 10" />
  </svg>
);

export const DynamicCommunityBlock = ({ name = "Community", width = 400, height = 300, color = "#bbf7d0", rows = 4, cols = 6, buildingType = "small-house" }: any) => {
  const cellW = (width - 40) / cols;
  const cellH = (height - 60) / rows;
  const units = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      units.push({ c, r, x: 20 + c * cellW, y: 40 + r * cellH });
    }
  }

  return (
    <div 
      className="relative rounded-xl border-4 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-sm z-20 cursor-pointer hover:scale-105 transition-transform"
      style={{ width: `${width}px`, height: `${height}px`, backgroundColor: `${color}40`, borderColor: color }}
    >
      <div className="w-full py-1 text-center font-black tracking-widest text-xs uppercase shadow-sm" style={{ backgroundColor: color, color: '#0f172a' }}>
        {name}
      </div>

      <div className="absolute inset-0 top-6 p-2 flex flex-wrap gap-2 items-center justify-center pointer-events-none">
        {units.map((u, i) => (
          <div key={i} style={{ width: `${cellW * 0.8}px`, height: `${cellH * 0.8}px` }} className="flex items-center justify-center">
            {buildingType === 'small-house' ? (
              <SmallHouseIcon />
            ) : (
              <ApartmentBuildingIconNew />
            )}
          </div>
        ))}
      </div>

      <div className="w-full py-0.5 text-center text-[10px] font-bold text-gray-500 opacity-60">
        MASTER COMMUNITY
      </div>
    </div>
  );
};

export const MarinaBlock = ({ name = "Dubai Harbour", width = 600, height = 310 }: { name?: string, width?: number, height?: number }) => {
  return (
    <svg 
      viewBox="0 0 600 310" 
      preserveAspectRatio="none"
      style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }} 
      className="drop-shadow-2xl z-20 hover:scale-[1.02] transition-transform select-none cursor-pointer"
    >
      <defs>
        {/* Marina Deep Sea Water Gradient */}
        <linearGradient id="marinaWaterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="45%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>

        {/* Travertine Quay Promenade Gradient */}
        <linearGradient id="marinaQuayStone" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Parking Lot Dark Asphalt Gradient */}
        <linearGradient id="marinaAsphalt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="60%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        {/* Teak Wood Plank Pier Gradient */}
        <linearGradient id="teakPierGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="25%" stopColor="#b45309" />
          <stop offset="75%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        {/* Mega Yacht Hull Pearl Gradient */}
        <linearGradient id="yachtPearlHull" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Dark Midnight Navy Hull Gradient */}
        <linearGradient id="navyYachtHull" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="60%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* Champagne Metallic Hull Gradient */}
        <linearGradient id="champagneHull" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>

        {/* Pool Water Shimmer */}
        <linearGradient id="poolWater" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Isometric Basin Clip Path (Exact floor tile 0.2355 slant & 0.01667 tilt) */}
        <clipPath id="marina-iso-basin-clip">
          <polygon points="80,35 560,43 503,285 23,277" />
        </clipPath>
      </defs>

      {/* ==================================================================== */}
      {/* 1. LOWER SIDE EMBOSS QUAY (FloorTile matching edge depth)             */}
      {/* ==================================================================== */}
      <polygon points="23,277 503,285 503,289 23,281" fill="#1e293b" />
      <polygon points="23,277 503,285 503,287.5 23,279.5" fill="#334155" />

      {/* ==================================================================== */}
      {/* 2. ISOMETRIC MARINA WATER BASIN                                       */}
      {/* ==================================================================== */}
      <polygon 
        points="80,35 560,43 503,285 23,277" 
        fill="url(#marinaWaterGrad)" 
        stroke="#38bdf8" 
        strokeWidth="2.5" 
        strokeLinejoin="round" 
      />

      {/* Basin Inner Elements (Clipped strictly within water plane) */}
      <g clipPath="url(#marina-iso-basin-clip)">
        {/* Shimmering Water Ripple Lines */}
        {Array.from({ length: 8 }).map((_, i) => (
          <path 
            key={`iso-ripple-${i}`} 
            d={`M ${50 + i * 55} ${135 + i * 18} L ${130 + i * 55} ${136 + i * 18}`} 
            stroke="#7dd3fc" 
            strokeWidth="1.2" 
            opacity="0.4"
          >
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${2.4 + i * 0.4}s`} repeatCount="indefinite" />
          </path>
        ))}

        {/* Outer Curved Stone Breakwater Seawall (Channel entrance) */}
        <path 
          d="M 525,115 Q 545,180 488,255 Q 450,283 330,281 L 332,271 Q 440,271 475,245 Q 528,175 510,115 Z" 
          fill="#334155" 
          stroke="#475569" 
          strokeWidth="1.5" 
        />
        {Array.from({ length: 12 }).map((_, i) => (
          <circle key={`stone-${i}`} cx={505 - Math.pow(i, 1.25) * 8} cy={125 + i * 12} r={2.5 + (i % 3)} fill="#475569" opacity="0.6" />
        ))}

        {/* Channel Entrance Navigation Beacons */}
        <g transform="translate(330, 276)">
          <circle cx="0" cy="0" r="3.5" fill="#22c55e">
            <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="0" r="7" fill="#22c55e" opacity="0.25">
            <animate attributeName="r" values="3.5;8;3.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>
        <g transform="translate(290, 275)">
          <circle cx="0" cy="0" r="3.5" fill="#ef4444">
            <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" begin="0.75s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="0" r="7" fill="#ef4444" opacity="0.25">
            <animate attributeName="r" values="3.5;8;3.5" dur="1.5s" begin="0.75s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ==================================================================== */}
        {/* 3. ISOMETRIC TEAK PONTOON PIER NETWORK                               */}
        {/* ==================================================================== */}

        {/* Gangway from Promenade down to Pier */}
        <polygon points="198,104 212,104.2 210,118 196,118" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
        <line x1="197" y1="104" x2="195" y2="118" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="213" y1="104" x2="211" y2="118" stroke="#cbd5e1" strokeWidth="1" />

        {/* Central Floating Pier Spine */}
        <polygon 
          points="200,118 218,118 178,260 160,260" 
          fill="url(#teakPierGrad)" 
          stroke="#78350f" 
          strokeWidth="1" 
        />
        {Array.from({ length: 18 }).map((_, i) => {
          const t = i / 18;
          const x1 = 200 + t * (160 - 200);
          const y1 = 118 + t * (260 - 118);
          const x2 = 218 + t * (178 - 218);
          const y2 = 118 + t * (260 - 118);
          return <line key={`spine-plank-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#78350f" strokeWidth="0.7" opacity="0.6" />;
        })}
        {/* Pier LED Bollards */}
        {Array.from({ length: 6 }).map((_, i) => {
          const t = (i + 0.5) / 6;
          const cx = 209 + t * (169 - 209);
          const cy = 118 + t * (260 - 118);
          return (
            <circle key={`dl-${i}`} cx={cx} cy={cy} r="1.8" fill="#fbbf24">
              <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Finger Pier 1 (Right Upper - Mega Yacht Berth) */}
        <polygon points="212,138 438,141.5 437,149 211,145.5" fill="url(#teakPierGrad)" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="260" cy="141" r="1.5" fill="#fbbf24" />
        <circle cx="370" cy="142.5" r="1.5" fill="#fbbf24" />
        <circle cx="430" cy="143.5" r="1.5" fill="#38bdf8" />

        {/* Finger Pier 2 (Right Lower - Superyacht Berth) */}
        <polygon points="196,204 406,207.5 405,214.5 195,211" fill="url(#teakPierGrad)" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="250" cy="207" r="1.5" fill="#fbbf24" />
        <circle cx="350" cy="208.5" r="1.5" fill="#fbbf24" />

        {/* Finger Pier 3 (Left Upper - Sport Yacht Berth) */}
        <polygon points="90,148 206,150 205,157 89,155" fill="url(#teakPierGrad)" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="140" cy="151" r="1.5" fill="#fbbf24" />

        {/* Finger Pier 4 (Left Lower - Catamaran Berth) */}
        <polygon points="78,218 184,220 183,227 77,225" fill="url(#teakPierGrad)" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="125" cy="221" r="1.5" fill="#fbbf24" />

        {/* ==================================================================== */}
        {/* 4. PARKED YACHTS (DIFFERENT SIZES & STUNNING DETAILS)                 */}
        {/* ==================================================================== */}

        {/* --- YACHT 1: FLAGSHIP 95M TRI-DECK MEGA YACHT (Right Upper Berth) --- */}
        <g>
          {/* Underwater Transom Glow */}
          <ellipse cx="225" cy="168" rx="14" ry="5" fill="#38bdf8" opacity="0.35">
            <animate attributeName="opacity" values="0.25;0.45;0.25" dur="3s" repeatCount="indefinite" />
          </ellipse>
          {/* Hull Ground Shadow */}
          <polygon points="228,162 444,165 438,181 222,178" fill="#000000" opacity="0.32" />

          {/* Pearl White Main Hull Deck Surface */}
          <polygon points="232,159 430,162 442,168 430,174 228,171" fill="url(#yachtPearlHull)" stroke="#cbd5e1" strokeWidth="0.8" />
          {/* Teak Main Deck Inlay */}
          <polygon points="235,161 422,164 430,168 422,172 232,169" fill="#b45309" opacity="0.85" />

          {/* Lower Hull Starboard Face (in water) */}
          <polygon points="228,171 430,174 442,168 442,174 430,180 228,177" fill="#94a3b8" opacity="0.95" />
          <polygon points="228,175 430,178 442,172 442,174 430,180 228,177" fill="#0369a1" opacity="0.85" />

          {/* Tier 2 & 3 Superstructure */}
          <polygon points="255,160 388,162 394,166 388,170 252,168" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" />
          {/* Tinted Panoramic Azure Glazing */}
          <polygon points="270,161 380,162.5 383,165.5 380,168.5 268,167" fill="#0284c7" opacity="0.88" />

          {/* Top Sun Deck & Radar Mast */}
          <polygon points="288,161.5 360,162.5 363,165 360,167.5 286,166.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="325" cy="163" r="2.2" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" />
          <circle cx="335" cy="163.2" r="2.2" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" />
          <line x1="330" y1="163" x2="330" y2="157" stroke="#cbd5e1" strokeWidth="1" />

          {/* Bow Helipad with White "H" */}
          <ellipse cx="410" cy="168" rx="8" ry="4" fill="#1e293b" stroke="#eab308" strokeWidth="0.9" />
          <text x="410" y="170" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">H</text>

          {/* Aft Infinity Jacuzzi Pool */}
          <polygon points="238,163 250,163.2 248,167 236,166.8" fill="url(#poolWater)" stroke="#ffffff" strokeWidth="0.6" />
          {/* Teak Swim Platform */}
          <polygon points="226,165 232,165.1 231,167.5 225,167.4" fill="#d97706" />

          {/* Mooring Lines Tethered to Dock */}
          <line x1="245" y1="159" x2="245" y2="149" stroke="#f1f5f9" strokeWidth="0.8" strokeDasharray="3 1.5" />
          <line x1="410" y1="162" x2="410" y2="149" stroke="#f1f5f9" strokeWidth="0.8" strokeDasharray="3 1.5" />
        </g>

        {/* --- YACHT 2: 65M MIDNIGHT NAVY SUPERYACHT (Right Lower Berth) --- */}
        <g>
          {/* Shadow */}
          <polygon points="214,228 388,231 382,246 208,243" fill="#000000" opacity="0.28" />
          {/* Midnight Navy Hull Surface */}
          <polygon points="216,226 376,229 386,234 376,240 212,237" fill="url(#navyYachtHull)" stroke="#475569" strokeWidth="0.8" />
          {/* Teak Deck */}
          <polygon points="218,228 372,230.5 378,234 372,237.5 214,235" fill="#b45309" opacity="0.8" />
          {/* Navy Starboard Face */}
          <polygon points="212,237 376,240 386,234 386,239 376,245 212,242" fill="#0f172a" />
          {/* White Flybridge Superstructure */}
          <polygon points="236,228 335,229.5 340,233 335,236.5 232,235" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" />
          <polygon points="250,229 320,230 322,232.5 320,235 248,234" fill="#0369a1" opacity="0.8" />
          {/* Aft Cocktail Table & Loungers */}
          <circle cx="228" cy="231" r="2.2" fill="#d97706" />
          <ellipse cx="260" cy="231" rx="2" ry="1.2" fill="url(#poolWater)" />
          {/* Mooring Lines */}
          <line x1="230" y1="226" x2="230" y2="214.5" stroke="#f1f5f9" strokeWidth="0.7" strokeDasharray="3 1.5" />
          <line x1="360" y1="228" x2="360" y2="214.5" stroke="#f1f5f9" strokeWidth="0.7" strokeDasharray="3 1.5" />
        </g>

        {/* --- YACHT 3: 38M SPORT COUPE YACHT (Left Upper Berth) --- */}
        <g>
          {/* Shadow */}
          <polygon points="102,122 198,123.5 194,134 98,132.5" fill="#000000" opacity="0.25" />
          {/* Hull */}
          <polygon points="102,122 188,123.5 196,127 188,131 100,129.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
          <polygon points="100,129.5 188,131 196,127 196,131 188,135 100,133.5" fill="#94a3b8" />
          {/* Superstructure with Azure Glass */}
          <polygon points="116,123.5 170,124.5 174,127 170,129.5 114,128.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.6" />
          <polygon points="125,124.5 158,125 160,127 158,128.5 123,128" fill="#0284c7" opacity="0.9" />
          {/* Foredeck Sunbed */}
          <polygon points="175,124.5 185,124.7 184,128 174,127.8" fill="#fef08a" />
          {/* Mooring line */}
          <line x1="120" y1="130" x2="120" y2="150" stroke="#f1f5f9" strokeWidth="0.7" strokeDasharray="2 1.5" />
        </g>

        {/* --- YACHT 4: 28M LUXURY POWER CATAMARAN (Left Lower Berth) --- */}
        <g>
          {/* Shadow */}
          <polygon points="90,186 180,187.5 176,203 86,201.5" fill="#000000" opacity="0.22" />
          {/* Twin Catamaran Hulls */}
          <polygon points="92,185 172,186.5 178,189 172,191.5 90,190" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
          <polygon points="88,197 168,198.5 174,201 168,203.5 86,202" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
          {/* Central Bridge Deck */}
          <polygon points="104,188 158,189 156,199 102,198" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.6" />
          <polygon points="114,190 146,190.5 145,197 113,196.5" fill="#0369a1" opacity="0.85" />
          {/* Forward Trampoline Netting */}
          <polygon points="93,190 103,190.2 101,197 91,196.8" fill="#67e8f9" opacity="0.45" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="2 1.5" />
        </g>

        {/* --- YACHT 5: 18M RIVA-STYLE MAHOGANY SPEEDBOAT (Inner Slip) --- */}
        <g>
          <polygon points="106,242 164,243 160,251 102,250" fill="#000000" opacity="0.2" />
          <polygon points="106,241 156,242 162,245 156,248 104,247" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.7" />
          <polygon points="104,247 156,248 162,245 162,248 156,251 104,250" fill="#0369a1" />
          {/* Varnished Mahogany Foredeck */}
          <polygon points="135,242 160,242.5 162,245 158,247 134,246.5" fill="#78350f" stroke="#92400e" strokeWidth="0.5" />
          {/* Turquoise Cockpit */}
          <polygon points="112,243 130,243.3 129,246.5 111,246" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.5" />
        </g>

        {/* --- YACHT 6: 12M MODERN CENTER-CONSOLE HARBOR TENDER (Pier Tip Slip) --- */}
        <g>
          <polygon points="185,248 225,248.6 222,256 182,255.4" fill="#000000" opacity="0.2" />
          <polygon points="186,247 222,247.6 226,250 222,252.5 184,252" fill="#ffffff" stroke="#0284c7" strokeWidth="0.7" />
          {/* T-Top Canopy */}
          <polygon points="196,248 210,248.2 209,251 195,250.8" fill="#1e293b" />
          {/* Twin Outboards */}
          <rect x="182" y="248" width="3" height="3" fill="#334155" rx="0.5" />
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 5. LANDSIDE PROMENADE (SITTING AREA, FLOWERS & CAR PARKING)           */}
      {/* ==================================================================== */}

      {/* Quay Wall Vertical Drop into Water Basin */}
      <polygon points="64,105 544,113 544,120 64,112" fill="#0f172a" />
      <polygon points="64,105 544,113 544,116 64,108" fill="#475569" />

      {/* Stainless Steel Guardrail along Quay Wall */}
      <line x1="64" y1="102" x2="544" y2="110" stroke="#cbd5e1" strokeWidth="1" />
      {[70, 110, 150, 190, 230, 270, 310, 350, 390, 430, 470, 510, 540].map((rx, idx) => {
        const ry = 102 + (rx - 64) * (8 / 480);
        return <line key={`stanchion-${idx}`} x1={rx} y1={ry} x2={rx} y2={ry + 4} stroke="#94a3b8" strokeWidth="1.2" />;
      })}

      {/* -------------------------------------------------------------------- */}
      {/* 5A. WATERFRONT SITTING & LOUNGE AREA (Left Side: X ≈ 65 to 205)      */}
      {/* -------------------------------------------------------------------- */}
      <g>
        {/* Travertine Stone Paved Terrace */}
        <polygon points="80,35 210,37 195,106 64,105" fill="url(#marinaQuayStone)" stroke="#cbd5e1" strokeWidth="0.8" />
        {/* Paving grid texture */}
        {[50, 70, 90].map((gy, i) => (
          <line key={`pave-y-${i}`} x1={75 - i * 3} y1={gy} x2={205 - i * 3} y2={gy + 2} stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="4 4" />
        ))}

        {/* Teak Boardwalk Border along Water */}
        <polygon points="67,99 197,101 195,106 65,104" fill="#b45309" stroke="#78350f" strokeWidth="0.6" />

        {/* Shaded Pergola / Cabana Lounge Bar Structure */}
        <polygon points="86,43 146,44 140,66 80,65" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.95" />
        {/* Louvred Pergola Slats */}
        {[47, 51, 55, 59, 63].map((slatY, i) => (
          <line key={`slat-${i}`} x1={85 - i * 1} y1={slatY} x2={145 - i * 1} y2={slatY + 1} stroke="#94a3b8" strokeWidth="0.9" />
        ))}
        {/* Teak Cocktail Bar Counter */}
        <polygon points="88,52 120,52.5 118,58 86,57.5" fill="#92400e" stroke="#78350f" strokeWidth="0.6" />
        <line x1="86" y1="58" x2="118" y2="58.5" stroke="#fbbf24" strokeWidth="1" /> {/* Warm LED bar glow */}

        {/* --- CAFE TABLE 1 (Navy & White Striped Parasol) --- */}
        <g transform="translate(108, 82)">
          {/* Ground Shadow */}
          <ellipse cx="0" cy="4" rx="14" ry="7" fill="#000000" opacity="0.22" />
          {/* Round Teak Table */}
          <ellipse cx="0" cy="2" rx="7" ry="3.8" fill="#d97706" stroke="#92400e" strokeWidth="0.6" />
          {/* Iced Drinks */}
          <circle cx="-2" cy="1" r="1.2" fill="#38bdf8" />
          <circle cx="2" cy="1.5" r="1.2" fill="#f43f5e" />
          {/* 3 Wicker Armchairs */}
          <ellipse cx="-8" cy="2" rx="2.5" ry="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <ellipse cx="8" cy="2" rx="2.5" ry="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <ellipse cx="0" cy="6" rx="3.5" ry="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          {/* Parasol Pole */}
          <line x1="0" y1="2" x2="0" y2="-12" stroke="#64748b" strokeWidth="1.2" />
          {/* Large Striped Parasol Canopy */}
          <ellipse cx="0" cy="-12" rx="15" ry="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
          {/* Navy Blue Stripes */}
          <path d="M 0,-20 Q -5,-12 0,-4 L -4,-4 Q -8,-12 -4,-20 Z" fill="#0284c7" />
          <path d="M 0,-20 Q 5,-12 0,-4 L 4,-4 Q 8,-12 4,-20 Z" fill="#0284c7" />
          <path d="M -15,-12 Q -7,-12 0,-4 L -2,-4 Q -10,-12 -15,-12 Z" fill="#0284c7" />
          <path d="M 15,-12 Q 7,-12 0,-4 L 2,-4 Q 10,-12 15,-12 Z" fill="#0284c7" />
          <circle cx="0" cy="-20" r="1.5" fill="#f59e0b" /> {/* Gold Finial */}
        </g>

        {/* --- CAFE TABLE 2 (Sunburst Gold & Cream Parasol) --- */}
        <g transform="translate(162, 78)">
          <ellipse cx="0" cy="4" rx="14" ry="7" fill="#000000" opacity="0.22" />
          <ellipse cx="0" cy="2" rx="7" ry="3.8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="-1" cy="1" r="1.2" fill="#22c55e" />
          <ellipse cx="-8" cy="2" rx="2.5" ry="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <ellipse cx="8" cy="2" rx="2.5" ry="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <ellipse cx="0" cy="6" rx="3.5" ry="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <line x1="0" y1="2" x2="0" y2="-12" stroke="#64748b" strokeWidth="1.2" />
          <ellipse cx="0" cy="-12" rx="15" ry="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
          <path d="M 0,-20 Q -5,-12 0,-4 L -4,-4 Q -8,-12 -4,-20 Z" fill="#f59e0b" />
          <path d="M 0,-20 Q 5,-12 0,-4 L 4,-4 Q 8,-12 4,-20 Z" fill="#f59e0b" />
          <circle cx="0" cy="-20" r="1.5" fill="#d97706" />
        </g>

        {/* Waterfront Park Viewing Benches */}
        <g transform="translate(126, 96)">
          <polygon points="0,0 20,0.3 19,4 0,3.7" fill="#92400e" stroke="#78350f" strokeWidth="0.6" />
          <line x1="0" y1="0" x2="0" y2="-2.5" stroke="#334155" strokeWidth="1" />
          <line x1="20" y1="0.3" x2="20" y2="-2.2" stroke="#334155" strokeWidth="1" />
          <line x1="0" y1="-2.5" x2="20" y2="-2.2" stroke="#92400e" strokeWidth="1" />
        </g>
        <g transform="translate(172, 97)">
          <polygon points="0,0 18,0.3 17,4 0,3.7" fill="#92400e" stroke="#78350f" strokeWidth="0.6" />
          <line x1="0" y1="0" x2="0" y2="-2.5" stroke="#334155" strokeWidth="1" />
          <line x1="18" y1="0.3" x2="18" y2="-2.2" stroke="#334155" strokeWidth="1" />
          <line x1="0" y1="-2.5" x2="18" y2="-2.2" stroke="#92400e" strokeWidth="1" />
        </g>
      </g>

      {/* -------------------------------------------------------------------- */}
      {/* 5B. LUSH GARDEN & FLOWER BEDS (Center: X ≈ 205 to 335)              */}
      {/* -------------------------------------------------------------------- */}
      <g>
        {/* Promenade Walkway Base */}
        <polygon points="210,37 340,39 324,108 195,106" fill="url(#marinaQuayStone)" />

        {/* --- RAISED LIMESTONE PLANTER BED 1 (Upper) --- */}
        <polygon points="216,42 328,44 322,64 210,62" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
        <polygon points="218,44 326,45.8 321,62.5 212,61" fill="#3f2e1e" /> {/* Rich soil */}

        {/* Manicured Boxwood Emerald Border */}
        {[222, 238, 254, 270, 286, 302, 318].map((hx, i) => (
          <ellipse key={`hedge-1-${i}`} cx={hx} cy={48 + i * 0.25} rx="6" ry="3.5" fill="#15803d" />
        ))}

        {/* Bougainvillea Magenta & Fuchsia Blossoms */}
        {[224, 228, 234, 252, 258, 264, 284, 290, 312, 316].map((fx, i) => (
          <circle key={`boug-${i}`} cx={fx} cy={48 + (i % 3) * 3} r={1.6 + (i % 2) * 0.8} fill={i % 2 === 0 ? "#f43f5e" : "#ec4899"} />
        ))}
        {/* Golden Orange Marigold Blossoms */}
        {[242, 246, 274, 278, 304, 308].map((mx, i) => (
          <circle key={`mari-${i}`} cx={mx} cy={49 + (i % 2) * 3} r="1.8" fill={i % 2 === 0 ? "#f59e0b" : "#fbbf24"} />
        ))}
        {/* Royal Purple Petunias & White Jasmine */}
        {[230, 260, 294, 320].map((px, i) => (
          <circle key={`pet-${i}`} cx={px} cy={54} r="1.5" fill={i % 2 === 0 ? "#a855f7" : "#ffffff"} />
        ))}

        {/* --- RAISED LIMESTONE PLANTER BED 2 (Lower Esplanade) --- */}
        <polygon points="204,80 316,82 310,98 198,96" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
        <polygon points="206,82 314,83.8 309,96.5 200,95" fill="#3f2e1e" />
        {[212, 228, 244, 260, 276, 292, 308].map((hx, i) => (
          <ellipse key={`hedge-2-${i}`} cx={hx} cy={86 + i * 0.25} rx="6" ry="3" fill="#166534" />
        ))}
        {[214, 222, 246, 254, 278, 286, 302, 310].map((fx, i) => (
          <circle key={`flower-low-${i}`} cx={fx} cy={87 + (i % 3) * 2.5} r={1.6 + (i % 2) * 0.7} fill={['#f43f5e', '#f59e0b', '#ec4899', '#ffffff'][i % 4]} />
        ))}

        {/* --- 3 ORNAMENTAL DUBAI DATE PALM TREES --- */}
        {/* Palm 1 (Left Upper) */}
        <g transform="translate(230, 52)">
          <ellipse cx="0" cy="5" rx="5" ry="2.5" fill="#000000" opacity="0.3" />
          <path d="M 0,5 Q 1,-8 0,-20" stroke="#78350f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Coconut/Dates */}
          <circle cx="-1" cy="-18" r="1.5" fill="#b45309" />
          <circle cx="1" cy="-18" r="1.5" fill="#b45309" />
          {/* Palm Fronds */}
          <path d="M 0,-20 Q -10,-26 -16,-20" stroke="#15803d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M 0,-20 Q 10,-26 16,-20" stroke="#15803d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M 0,-20 Q -8,-16 -14,-10" stroke="#22c55e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M 0,-20 Q 8,-16 14,-10" stroke="#22c55e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M 0,-20 Q 0,-30 2,-32" stroke="#16a34a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <circle cx="0" cy="6" r="1.2" fill="#fbbf24" /> {/* LED Uplight */}
        </g>

        {/* Palm 2 (Right Upper) */}
        <g transform="translate(305, 53)">
          <ellipse cx="0" cy="5" rx="5" ry="2.5" fill="#000000" opacity="0.3" />
          <path d="M 0,5 Q -1,-8 0,-20" stroke="#78350f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 0,-20 Q -10,-26 -16,-20" stroke="#15803d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M 0,-20 Q 10,-26 16,-20" stroke="#15803d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M 0,-20 Q -8,-16 -14,-10" stroke="#22c55e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M 0,-20 Q 8,-16 14,-10" stroke="#22c55e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <circle cx="0" cy="6" r="1.2" fill="#fbbf24" />
        </g>

        {/* Palm 3 (Center Lower) */}
        <g transform="translate(262, 86)">
          <ellipse cx="0" cy="5" rx="5" ry="2.5" fill="#000000" opacity="0.3" />
          <path d="M 0,5 Q 1,-8 0,-18" stroke="#78350f" strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <path d="M 0,-18 Q -9,-24 -14,-18" stroke="#15803d" strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <path d="M 0,-18 Q 9,-24 14,-18" stroke="#15803d" strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <path d="M 0,-18 Q -7,-14 -12,-8" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 0,-18 Q 7,-14 12,-8" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="0" cy="6" r="1.2" fill="#fbbf24" />
        </g>
      </g>

      {/* -------------------------------------------------------------------- */}
      {/* 5C. MARINA CAR PARKING AREA (Right Side: X ≈ 335 to 555)             */}
      {/* -------------------------------------------------------------------- */}
      <g>
        {/* Dark Asphalt Parking Lot Surface */}
        <polygon points="340,39 558,43 543,113 324,108" fill="url(#marinaAsphalt)" stroke="#334155" strokeWidth="1" />

        {/* Concrete Curb & Access Lane */}
        <polygon points="338,40 342,40 327,108 323,108" fill="#64748b" />
        {/* White Painted Directional Entrance Arrow */}
        <path d="M 334,94 L 348,94.3 L 344,91 M 348,94.3 L 344,97" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Angled Parking Stalls (White Painted Lines) */}
        {[
          { x1: 375, y1: 44, x2: 363, y2: 82 },
          { x1: 418, y1: 45, x2: 406, y2: 83 },
          { x1: 461, y1: 46, x2: 449, y2: 84 },
          { x1: 504, y1: 47, x2: 492, y2: 85 },
          { x1: 546, y1: 48, x2: 534, y2: 86 }
        ].map((line, idx) => (
          <g key={`stall-line-${idx}`}>
            <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#f8fafc" strokeWidth="1.4" opacity="0.9" />
            {/* Concrete Wheel Stop at head of stall */}
            <line x1={line.x1 - 10} y1={line.y1 + 4} x2={line.x1 - 2} y2={line.y1 + 4.2} stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        ))}

        {/* Yellow VIP / Accessible Bay Marker in Stall 1 */}
        <rect x="352" y="48" width="12" height="10" fill="none" stroke="#eab308" strokeWidth="0.8" rx="1" />
        <circle cx="358" cy="51" r="1.2" fill="#eab308" />
        <path d="M 358,52.5 L 358,55 L 360,56 M 356,54 L 358,54" stroke="#eab308" strokeWidth="0.7" fill="none" />

        {/* --- CAR 1: ARCTIC WHITE SUPERCAR (Ferrari / McLaren Style) in Stall 1 --- */}
        <g transform="translate(382, 62)">
          {/* Ground Shadow */}
          <ellipse cx="0" cy="5" rx="15" ry="6.5" fill="#000000" opacity="0.45" />
          {/* Lower Chassis / Wheels */}
          <ellipse cx="-8" cy="5" rx="3" ry="2" fill="#0f172a" />
          <ellipse cx="8" cy="5" rx="3" ry="2" fill="#0f172a" />
          <circle cx="-8" cy="5" r="1.2" fill="#ef4444" /> {/* Red Brake Caliper */}
          <circle cx="8" cy="5" r="1.2" fill="#ef4444" />
          {/* Aerodynamic White Supercar Body */}
          <polygon points="-12,3 12,3.5 10,-3 -10,-3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.7" />
          {/* Cockpit Canopy & Tinted Glass */}
          <polygon points="-5,-3 5,-2.8 3,-7 -3,-7" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.5" />
          {/* Rear Aero Spoiler & Red Taillight Strip */}
          <line x1="-12" y1="2" x2="-10" y2="-1" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="-12" y1="2.5" x2="-8" y2="2.6" stroke="#ef4444" strokeWidth="1" />
          {/* Xenon Headlights */}
          <circle cx="11" cy="2.5" r="1" fill="#38bdf8" />
        </g>

        {/* --- CAR 2: MIDNIGHT BLACK LUXURY G-WAGON (SUV) in Stall 2 --- */}
        <g transform="translate(425, 63)">
          <ellipse cx="0" cy="6" rx="15" ry="7.5" fill="#000000" opacity="0.45" />
          <ellipse cx="-8" cy="6" rx="3.5" ry="2.2" fill="#020617" />
          <ellipse cx="8" cy="6" rx="3.5" ry="2.2" fill="#020617" />
          {/* Rugged Boxy Body */}
          <polygon points="-12,4 12,4.5 11,-4 -11,-4" fill="#1e293b" stroke="#0f172a" strokeWidth="0.7" />
          {/* High SUV Cabin */}
          <polygon points="-9,-4 8,-3.7 7,-10 -8,-10" fill="#0f172a" stroke="#334155" strokeWidth="0.7" />
          {/* Tinted Privacy Windows */}
          <polygon points="-7,-5 6,-4.8 5,-8 -6,-8" fill="#0284c7" opacity="0.75" />
          {/* Silver Roof Rails */}
          <line x1="-7" y1="-10.5" x2="6" y2="-10.2" stroke="#cbd5e1" strokeWidth="0.9" />
          {/* Tailgate-Mounted Spare Tire */}
          <circle cx="-12" cy="-1" r="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="0.7" />
        </g>

        {/* --- CAR 3: ROSSO CORSA RED SPORTS COUPE (Porsche 911 Style) in Stall 3 --- */}
        <g transform="translate(468, 64)">
          <ellipse cx="0" cy="5" rx="14" ry="6.5" fill="#000000" opacity="0.45" />
          <ellipse cx="-8" cy="5" rx="3" ry="2" fill="#0f172a" />
          <ellipse cx="8" cy="5" rx="3" ry="2" fill="#0f172a" />
          {/* Sloping Italian Red Body */}
          <polygon points="-12,3 12,3.5 10,-2 -10,-2" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.7" />
          {/* Fastback Curved Roofline */}
          <polygon points="-6,-2 5,-1.8 3,-6 -4,-6" fill="#1e293b" stroke="#ef4444" strokeWidth="0.6" />
          <polygon points="-4,-2.5 4,-2.3 2,-5 -2,-5" fill="#38bdf8" opacity="0.8" />
          {/* Dual Chrome Exhausts */}
          <circle cx="-12" cy="3.5" r="0.8" fill="#cbd5e1" />
          <circle cx="-12" cy="2" r="0.8" fill="#cbd5e1" />
        </g>

        {/* --- CAR 4: ELECTRIC CYAN GRAND TOURER in Stall 4 --- */}
        <g transform="translate(511, 65)">
          <ellipse cx="0" cy="5" rx="14" ry="6.5" fill="#000000" opacity="0.45" />
          <ellipse cx="-8" cy="5" rx="3" ry="2" fill="#0f172a" />
          <ellipse cx="8" cy="5" rx="3" ry="2" fill="#0f172a" />
          {/* Electric Cyan Sedan */}
          <polygon points="-11,3 11,3.5 10,-3 -10,-3" fill="#06b6d4" stroke="#0891b2" strokeWidth="0.7" />
          {/* Panoramic Glass Roof */}
          <polygon points="-5,-3 5,-2.8 4,-7 -4,-7" fill="#0f172a" stroke="#67e8f9" strokeWidth="0.5" />
          <line x1="-11" y1="2.5" x2="-8" y2="2.6" stroke="#ef4444" strokeWidth="0.9" />
          <circle cx="10" cy="2.5" r="0.9" fill="#ffffff" />
        </g>

        {/* Dual EV Charging Pedestals at Parking Curb */}
        <g transform="translate(365, 41)">
          <rect x="0" y="0" width="4" height="7" fill="#334155" rx="1" />
          <circle cx="2" cy="2.5" r="1" fill="#22c55e" /> {/* Green Charging LED */}
          <line x1="2" y1="5" x2="2" y2="7" stroke="#22c55e" strokeWidth="0.5" />
        </g>
        <g transform="translate(450, 42)">
          <rect x="0" y="0" width="4" height="7" fill="#334155" rx="1" />
          <circle cx="2" cy="2.5" r="1" fill="#22c55e" />
        </g>

        {/* Modern Stainless Steel Street Lighting Pole */}
        <g transform="translate(535, 46)">
          <line x1="0" y1="4" x2="0" y2="-18" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M 0,-18 Q -4,-22 -8,-20" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
          <circle cx="-8" cy="-20" r="2" fill="#ffffff" />
          {/* Warm Illumination Light Cone */}
          <ellipse cx="-10" cy="12" rx="22" ry="11" fill="#fef08a" opacity="0.16" />
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 6. MARINA HARBOUR GLASS EMBOSSED BADGE                               */}
      {/* ==================================================================== */}
      <g transform="translate(30, 266)">
        <polygon points="0,0 230,3.8 228,24 0,20.2" fill="#0f172a" opacity="0.88" stroke="#38bdf8" strokeWidth="1.2" />
        <circle cx="16" cy="11" r="4.5" fill="#38bdf8" />
        <text x="28" y="15" fill="#ffffff" fontSize="11" fontWeight="900" letterSpacing="1">
          ⚓ {name.toUpperCase()}
        </text>
      </g>
    </svg>
  );
};

export const MarinaHarbourBlock = MarinaBlock;

export { MallBlock, type MallBlockProps };
export const ShoppingMallComponent = MallBlock;

export { HotelBlock, type HotelBlockProps, HotelResortComponent };
export { BurjKhalifa, type BurjKhalifaProps, BurjKhalifaIcon };
export { FloorTile, type FloorTileProps, IslandFloorTile };

export const ApartmentComplexBlock = ({ width = 300, height = 250 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 300 250" style={{ width: `${width}px`, height: `${height}px` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
    <path d="M 5 5 L 295 5 L 295 245 L 5 245 Z" fill="#84cc6d" stroke="#ffffff" strokeWidth="6" rx="2" />
    
    <g transform="translate(100, 20)">
       <path d="M 0,20 Q -5,35 -10,45" stroke="#78350f" strokeWidth="4" fill="none" />
       <path d="M 0,20 Q -15,10 -20,20 Q -10,5 0,20" fill="#15803d" />
       <path d="M 0,20 Q 5,0 15,5 Q 5,10 0,20" fill="#15803d" />
       <path d="M 0,20 Q 20,15 25,25 Q 10,20 0,20" fill="#15803d" />
       <path d="M 0,20 Q -10,25 -15,35 Q -5,25 0,20" fill="#15803d" />
    </g>

    <rect x="250" y="80" width="45" height="60" fill="#38bdf8" />
    <rect x="5" y="125" width="290" height="15" fill="#cbd5e1" />
    <rect x="40" y="140" width="15" height="105" fill="#cbd5e1" />
    
    <g transform="translate(30, 20)">
       <rect x="0" y="0" width="35" height="105" fill="#94a3b8" />
       <rect x="0" y="95" width="35" height="10" fill="#1e293b" />
       <rect x="0" y="0" width="35" height="15" fill="#1e293b" />
       <rect x="5" y="3" width="8" height="4" fill="#64748b" />
       <rect x="22" y="3" width="8" height="4" fill="#64748b" />
       <rect x="5" y="9" width="8" height="4" fill="#64748b" />
       <rect x="22" y="9" width="8" height="4" fill="#64748b" />
       {[1,2,3,4,5,6,7].map(i => <rect key={i} x="5" y={15 + i*10} width="25" height="5" fill="#38bdf8" />)}
    </g>

    <g transform="translate(75, 45)">
       <rect x="0" y="15" width="45" height="65" fill="#60a5fa" />
       <polygon points="0,15 45,5 45,15" fill="#1d4ed8" />
       <rect x="0" y="15" width="45" height="5" fill="#1e293b" />
       <rect x="6" y="25" width="12" height="15" fill="#1e293b" />
       <rect x="24" y="25" width="15" height="15" fill="#1e293b" />
       <rect x="6" y="45" width="12" height="15" fill="#1e293b" />
       <rect x="24" y="45" width="15" height="15" fill="#1e293b" />
       <rect x="6" y="65" width="12" height="10" fill="#1e293b" />
       <rect x="24" y="65" width="15" height="10" fill="#1e293b" />
    </g>

    <g transform="translate(130, 45)">
       <rect x="0" y="0" width="45" height="80" fill="#4ade80" />
       <rect x="0" y="0" width="45" height="8" fill="#15803d" />
       {[1,2,3,4].map(i => (
          <g key={i}>
             <rect x="5" y={8 + i*15} width="14" height="8" fill="#f8fafc" />
             <rect x="24" y={8 + i*15} width="14" height="8" fill="#f8fafc" />
          </g>
       ))}
    </g>

    <g transform="translate(185, 30)">
       <rect x="0" y="0" width="55" height="95" fill="#475569" />
       <rect x="0" y="0" width="55" height="12" fill="#0f172a" />
       <rect x="8" y="4" width="10" height="4" fill="#94a3b8" />
       <rect x="35" y="4" width="10" height="4" fill="#94a3b8" />
       {[1,2,3,4,5].map(i => <rect key={i} x="6" y={15 + i*14} width="43" height="6" fill="#f8fafc" />)}
    </g>

    <ellipse cx="260" cy="50" rx="16" ry="12" fill="#15803d" />
    <ellipse cx="275" cy="65" rx="18" ry="14" fill="#16a34a" />

    <g transform="translate(180, 150)">
       <rect x="0" y="0" width="100" height="80" fill="#ea580c" rx="4" />
       <rect x="5" y="5" width="90" height="70" fill="#22c55e" />
       <rect x="49" y="5" width="2" height="70" fill="#ffffff" />
       <ellipse cx="50" cy="40" rx="14" ry="14" fill="none" stroke="#ffffff" strokeWidth="2" />
    </g>

    <g transform="translate(70, 160)">
       <rect x="0" y="15" width="40" height="35" fill="#e7e5e4" />
       <polygon points="-5,15 20,-2 45,15" fill="#c2410c" />
       <rect x="6" y="20" width="10" height="12" fill="#1e293b" />
       <rect x="24" y="20" width="10" height="12" fill="#1e293b" />
       <rect x="15" y="38" width="10" height="12" fill="#78350f" />
    </g>
    <g transform="translate(120, 160)">
       <rect x="0" y="15" width="40" height="35" fill="#e7e5e4" />
       <polygon points="-5,15 20,-2 45,15" fill="#c2410c" />
       <rect x="6" y="20" width="10" height="12" fill="#1e293b" />
       <rect x="24" y="20" width="10" height="12" fill="#1e293b" />
       <rect x="15" y="38" width="10" height="12" fill="#78350f" />
    </g>

    <g transform="translate(10, 160)">
       <rect x="15" y="70" width="10" height="15" fill="#3b82f6" />
       <rect x="50" y="70" width="10" height="15" fill="#3b82f6" />
       <rect x="15" y="65" width="45" height="5" fill="#10b981" />
       <rect x="0" y="0" width="25" height="50" fill="#475569" />
       <rect x="4" y="5" width="17" height="18" fill="#ffffff" rx="2" />
       <rect x="4" y="26" width="17" height="18" fill="#3b82f6" rx="2" />
    </g>

    <g transform="translate(150, 40)" className="drop-shadow-lg">
       <circle cx="0" cy="0" r="16" fill="#ffffff" />
       <circle cx="0" cy="0" r="14" fill="#0f172a" />
       <polygon points="0,-6 10,-1 0,4 -10,-1" fill="#ffffff" />
       <polygon points="-6,1 6,1 4,5 -4,5" fill="#ffffff" />
       <line x1="8" y1="0" x2="8" y2="6" stroke="#f59e0b" strokeWidth="1.5" />
       <circle cx="8" cy="6" r="1" fill="#f59e0b" />
    </g>
  </svg>
);

export interface IsometricBillboardProps {
  id?: string;
  width?: number;
  height?: number;
  billboardStyle?: 'mega-led' | 'classic-highway' | 'luxury-curved' | 'hoarding-banner';
  imageUrl?: string;
  image?: string;
  img?: string;
  isRented?: boolean;
  rentedBy?: string;
  rentalPrice?: string | number;
  adTitle?: string;
  adSubtitle?: string;
  text1?: string;
  text2?: string;
  color1?: string;
  color2?: string;
  brandColor?: string;
  seed?: number;
  onClick?: () => void;
  className?: string;
}

export const IsometricBillboard: React.FC<IsometricBillboardProps> = ({
  id = 'bb',
  width = 280,
  height = 210,
  billboardStyle = 'mega-led',
  imageUrl,
  image,
  img,
  isRented = false,
  rentedBy,
  rentalPrice = '500 D-Coins / wk',
  adTitle,
  adSubtitle,
  text1,
  text2,
  color1 = '#38bdf8',
  color2 = '#0284c7',
  brandColor,
  seed = 1,
  onClick,
  className = ''
}) => {
  const activeImage = imageUrl || image || img;
  const title = adTitle || text1 || (isRented ? (rentedBy || "LUXURY DUBAI") : "RENT THIS SPACE");
  const subtitle = adSubtitle || text2 || (isRented ? "Exclusive Campaign" : "Place Your Brand Here");
  const clipId = `bb-screen-clip-${id || Math.floor(seed * 1000)}`;

  // ===========================================================================
  // ISOMETRIC GEOMETRY STRICTLY MATCHING FloorTile (320 x 240 coordinate space):
  // Baseline tilt: dY/dX = 0.01667 (approx 4.3px rise across 260px)
  // Depth slant: dX/dY = -0.2355
  // Vertical elevation: dX = 0 (straight up/down)
  // ===========================================================================

  const renderStyleSpecificStructure = () => {
    switch (billboardStyle) {
      case 'classic-highway':
        return (
          <g>
            {/* Twin Concrete Footings */}
            <polygon points="90,218 122,218.5 119,208 87,207.5" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
            <polygon points="90,218 122,218.5 122,223 90,222.5" fill="#475569" />
            <polygon points="198,219.8 230,220.3 227,209.8 195,209.3" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
            <polygon points="198,219.8 230,220.3 230,224.8 198,224.3" fill="#475569" />

            {/* Left Lattice Steel Tower */}
            <rect x="99" y="130" width="14" height="82" fill="url(#pylonMetalGrad)" stroke="#334155" strokeWidth="1" />
            {/* Cross diagonal bracing */}
            {[0, 1, 2, 3].map(i => (
              <g key={`l-brace-${i}`}>
                <line x1="99" y1={134 + i * 19} x2="113" y2={153 + i * 19} stroke="#475569" strokeWidth="1.2" />
                <line x1="113" y1={134 + i * 19} x2="99" y2={153 + i * 19} stroke="#475569" strokeWidth="1.2" />
              </g>
            ))}

            {/* Right Lattice Steel Tower */}
            <rect x="207" y="132" width="14" height="82" fill="url(#pylonMetalGrad)" stroke="#334155" strokeWidth="1" />
            {[0, 1, 2, 3].map(i => (
              <g key={`r-brace-${i}`}>
                <line x1="207" y1={136 + i * 19} x2="221" y2={155 + i * 19} stroke="#475569" strokeWidth="1.2" />
                <line x1="221" y1={136 + i * 19} x2="207" y2={155 + i * 19} stroke="#475569" strokeWidth="1.2" />
              </g>
            ))}

            {/* Service Catwalk Platform under screen */}
            <polygon points="26,140 294,144.5 290,149.5 22,145" fill="#334155" stroke="#1e293b" strokeWidth="1" />
            {/* Catwalk Yellow Safety Handrail */}
            <line x1="24" y1={133} x2="292" y2={137.5} stroke="#eab308" strokeWidth="1.8" />
            {[35, 75, 115, 155, 195, 235, 275].map(hx => (
              <line key={`rail-${hx}`} x1={hx} y1={133 + (hx - 24) * 0.0166} x2={hx} y2={141 + (hx - 24) * 0.0166} stroke="#eab308" strokeWidth="1.5" />
            ))}

            {/* 4 Overhead Cantilevered Floodlight Booms with Illumination Cones */}
            {[65, 125, 185, 245].map((fx, idx) => {
              const fy = 25 + (fx - 30) * 0.0166;
              return (
                <g key={`flood-${idx}`}>
                  {/* Curved light boom arm reaching out and down */}
                  <path d={`M ${fx},${fy} C ${fx},${fy - 14} ${fx - 4},${fy - 14} ${fx - 4},${fy - 6}`} fill="none" stroke="#64748b" strokeWidth="2.2" />
                  {/* Luminaire Lamp Head */}
                  <polygon points={`${fx - 8},${fy - 6} ${fx},${fy - 6} ${fx + 2},${fy - 2} ${fx - 10},${fy - 2}`} fill="#1e293b" stroke="#facc15" strokeWidth="0.8" />
                  {/* Illuminated Bulb */}
                  <circle cx={fx - 4} cy={fy - 2} r="2.5" fill="#fef08a" />
                  {/* Radiant Light Cone casting downward */}
                  <polygon points={`${fx - 4},${fy - 1} ${fx - 24},${fy + 65} ${fx + 16},${fy + 66}`} fill="#fef08a" opacity="0.16" />
                </g>
              );
            })}
          </g>
        );

      case 'luxury-curved':
        return (
          <g>
            {/* Sculpted Metallic Pylon Pedestal */}
            <polygon points="128,214 192,215 186,132 134,131" fill="url(#luxuryBronzeGrad)" stroke="#78350f" strokeWidth="1" />
            <polygon points="128,214 134,131 126,130 120,213" fill="#451a03" />
            {/* Center LED Spine Slit */}
            <line x1="160" y1="214" x2="160" y2="131" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8" />
            {/* Ambient Cyan Underglow beneath display */}
            <ellipse cx="160" cy="142" rx="60" ry="8" fill="#38bdf8" opacity="0.25" />
          </g>
        );

      case 'hoarding-banner':
        return (
          <g>
            {/* Continuous Concrete Jersey Barrier Foundation along the baseline */}
            <polygon points="20,215 300,219.6 296,208.6 16,204" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
            <polygon points="20,215 300,219.6 300,224.6 20,220" fill="#64748b" />
            {/* Steel I-beam structural vertical supports */}
            {[45, 95, 145, 195, 245, 285].map(bx => (
              <rect key={`ib-${bx}`} x={bx - 3} y={135} width="6" height="74" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />
            ))}
            {/* Top Linear Luminaire Beam */}
            <line x1="28" y1="22" x2="292" y2="26.4" stroke="#f1f5f9" strokeWidth="3" />
            <line x1="28" y1="23" x2="292" y2="27.4" stroke="#facc15" strokeWidth="1.5" />
          </g>
        );

      case 'mega-led':
      default:
        return (
          <g>
            {/* Heavy-Gauge Brushed Steel Unipole Column */}
            <rect x="144" y="128" width="32" height="85" fill="url(#pylonMetalGrad)" stroke="#1e293b" strokeWidth="1" />
            {/* Vertical Highlights & Shadow Bevels on Cylinder */}
            <line x1="149" y1="128" x2="149" y2="213" stroke="#94a3b8" strokeWidth="1.5" opacity="0.7" />
            <line x1="171" y1="128" x2="171" y2="213" stroke="#0f172a" strokeWidth="2" opacity="0.9" />

            {/* Structural Flange Ring Base & Anchor Studs */}
            <polygon points="138,212 182,212.7 180,217.7 136,217" fill="#334155" stroke="#1e293b" strokeWidth="1" />
            {[141, 150, 160, 170, 179].map(bx => (
              <circle key={`bolt-${bx}`} cx={bx} cy={214.5} r="1.3" fill="#cbd5e1" />
            ))}

            {/* Rear Maintenance Cage & Safety Ladder */}
            <rect x="139" y="132" width="5" height="78" fill="#1e293b" />
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <line key={`rung-${i}`} x1="139" y1={135 + i * 11} x2="144" y2={135 + i * 11} stroke="#64748b" strokeWidth="1" />
            ))}

            {/* Modern Top Digital Ticker Strip on LED Screen */}
            <polygon points="30,25 290,29.3 290,38.3 30,34" fill="#020617" />
            <text x="36" y="32" fill="#38bdf8" fontSize="6" fontWeight="bold" fontFamily="monospace">
              ● LIVE DIGITAL 8K • DUBAI 28°C
            </text>
            <text x="284" y="32" fill="#22c55e" fontSize="6" fontWeight="bold" textAnchor="end" fontFamily="monospace">
              99.8% VIEWABILITY
            </text>
          </g>
        );
    }
  };

  return (
    <svg 
      viewBox="0 0 320 240" 
      style={{ width: `${width}px`, height: `${height}px` }} 
      className={`drop-shadow-2xl cursor-pointer hover:scale-[1.03] transition-all origin-bottom select-none ${className}`}
      onClick={onClick}
    >
      <defs>
        {/* Brushed Cylindrical Metal Gradient for Pylons */}
        <linearGradient id="pylonMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="25%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="75%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Luxury Bronze / Champagne Metallic Gradient */}
        <linearGradient id="luxuryBronzeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Screen Clip Path (Strictly slanted to match FloorTile's 0.01667 incline) */}
        <clipPath id={clipId}>
          <polygon points="32,27 288,31.3 288,143.3 32,139" />
        </clipPath>

        {/* Glass Screen Reflection Gradient */}
        <linearGradient id="screenGlassReflect" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>

        {/* Cyber Neon Pulse Gradient for Unrented State */}
        <linearGradient id="cyberScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#030712" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>

      {/* ==================================================================== */}
      {/* 1. GROUND FOUNDATION PLINTH (Matches FloorTile's exact geometry)     */}
      {/* ==================================================================== */}
      <g>
        {/* Ground Foundation Top Surface */}
        <polygon 
          points="90,217 230,219.3 225,203.3 85,201" 
          fill="#cbd5e1" 
          stroke="#94a3b8" 
          strokeWidth="1" 
        />
        {/* Foundation Lower Side Lip (Matches FloorTile's subtle emboss lip) */}
        <polygon 
          points="90,217 230,219.3 230,224.3 90,222" 
          fill="#64748b" 
        />
        <polygon 
          points="90,222 230,224.3 230,226 90,223.7" 
          fill="#000000" 
          opacity="0.13" 
        />
      </g>

      {/* ==================================================================== */}
      {/* 2. STYLE-SPECIFIC STRUCTURAL PYLONS, CATWALKS & LIGHTING            */}
      {/* ==================================================================== */}
      {renderStyleSpecificStructure()}

      {/* ==================================================================== */}
      {/* 3. 3D CABINET HOUSING (Rear Depth Bevels aligned along -0.235 slant) */}
      {/* ==================================================================== */}
      <g>
        {/* Top Roof Casing (Receding back along slant: dX=-6, dY=-16) */}
        <polygon 
          points="30,25 290,29.3 284,13.3 24,9" 
          fill={billboardStyle === 'luxury-curved' ? '#b45309' : '#1e293b'} 
          stroke="#0f172a" 
          strokeWidth="1" 
        />
        {/* Anti-glare roof baffles / louvers */}
        {[0.2, 0.4, 0.6, 0.8].map((t, idx) => {
          const x1 = 30 + t * 260;
          const y1 = 25 + t * 4.3;
          const x2 = 24 + t * 260;
          const y2 = 9 + t * 4.3;
          return <line key={`roof-louver-${idx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="0.8" />;
        })}

        {/* Left Side Thickness Bevel (Deep shadow) */}
        <polygon 
          points="30,25 24,9 24,125 30,141" 
          fill={billboardStyle === 'luxury-curved' ? '#78350f' : '#0f172a'} 
          stroke="#020617" 
          strokeWidth="1" 
        />

        {/* Main Front Frame Bevel */}
        <polygon 
          points="30,25 290,29.3 290,145.3 30,141" 
          fill={billboardStyle === 'luxury-curved' ? '#d97706' : '#0f172a'} 
          stroke="#1e293b" 
          strokeWidth="1.5" 
        />
      </g>

      {/* ==================================================================== */}
      {/* 4. BILLBOARD DISPLAY SCREEN (RENTED IMAGE OR CALL-TO-ACTION)         */}
      {/* ==================================================================== */}
      <g>
        {/* Screen Background Surface */}
        <polygon 
          points="32,27 288,31.3 288,143.3 32,139" 
          fill={isRented && activeImage ? '#000000' : 'url(#cyberScreenGrad)'} 
        />

        {/* A. RENTED STATE: ACTIVE IMAGE CREATIVE */}
        {isRented && activeImage ? (
          <g clipPath={`url(#${clipId})`}>
            {/* Embedded Image Ad Creative */}
            <image 
              href={activeImage} 
              x="30" 
              y="25" 
              width="260" 
              height="120" 
              preserveAspectRatio="xMidYMid slice" 
            />

            {/* High-Resolution Outdoor Glass Reflection Sheen */}
            <polygon 
              points="32,27 288,31.3 288,143.3 32,139" 
              fill="url(#screenGlassReflect)" 
            />

            {/* Campaign Advertiser Overlay Bar */}
            <g transform="translate(36, 116)">
              <rect x="0" y="0" width="248" height="22" fill="#000000" opacity="0.65" rx="3" />
              <text x="10" y="14" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="1">
                {title.toUpperCase()}
              </text>
              <text x="240" y="14" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                {subtitle}
              </text>
            </g>

            {/* Top-Right Verified Sponsor Pill */}
            <g transform="translate(222, 33)">
              <rect x="0" y="0" width="60" height="13" fill="#0284c7" opacity="0.9" rx="3" />
              <text x="30" y="9.5" fill="#ffffff" fontSize="7" fontWeight="black" textAnchor="middle" letterSpacing="0.5">
                ● VERIFIED AD
              </text>
            </g>
          </g>
        ) : (
          /* B. UNRENTED / AVAILABLE STATE: HIGH-IMPACT CALL-TO-ACTION */
          <g clipPath={`url(#${clipId})`}>
            {/* Ambient Tech Grid Mesh */}
            <g stroke="#1e293b" strokeWidth="0.5" opacity="0.4">
              {[50, 70, 90, 110, 130].map(gy => (
                <line key={`grid-h-${gy}`} x1="32" y1={gy} x2="288" y2={gy + 4.3} />
              ))}
              {[70, 110, 150, 190, 230, 270].map(gx => (
                <line key={`grid-v-${gx}`} x1={gx} y1="27" x2={gx} y2="143" />
              ))}
            </g>

            {/* Neon Border Pulse */}
            <polygon 
              points="34,29 286,33.2 286,141.2 34,137" 
              fill="none" 
              stroke="#38bdf8" 
              strokeWidth="1.5" 
              opacity="0.8" 
            />

            {/* Main Call to Action Headline */}
            <g transform="translate(160, 64)">
              <text textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="2">
                ✨ {title.toUpperCase()}
              </text>
              <text textAnchor="middle" y="17" fill="#94a3b8" fontSize="9" fontWeight="600">
                {subtitle}
              </text>
            </g>

            {/* Live Rental Price Tag Badge */}
            <g transform="translate(160, 97)">
              <rect x="-65" y="0" width="130" height="18" fill="#1e293b" rx="9" stroke="#38bdf8" strokeWidth="1" />
              <text textAnchor="middle" y="12.5" fill="#facc15" fontSize="9" fontWeight="900" fontFamily="system-ui, sans-serif">
                🏷️ {rentalPrice}
              </text>
            </g>

            {/* Action Prompt Pill */}
            <g transform="translate(160, 126)">
              <rect x="-55" y="0" width="110" height="13" fill="#2563eb" rx="6" />
              <text textAnchor="middle" y="9.5" fill="#ffffff" fontSize="7.5" fontWeight="black" letterSpacing="1">
                ⚡ TAP TO PLACE AD
              </text>
            </g>
          </g>
        )}

        {/* Screen Edge Bevel Highlight */}
        <polygon 
          points="32,27 288,31.3 288,33 32,28.7" 
          fill="#ffffff" 
          opacity="0.3" 
        />
      </g>
    </svg>
  );
};

export const GiantBillboardBlock = (props: any) => <IsometricBillboard {...props} />;
export const BillboardBlock = (props: any) => <IsometricBillboard {...props} />;

export const ConfigurableApartmentBlock = ({ 
  width = 300, 
  height = 250,
  hasPool = true,
  hasParking = true,
  hasCourt = true,
  numBuildings = 3,
  color = "#3b82f6",
  name = "Community",
  onUnitClick = undefined
}: any) => {
  return (
    <ApartmentComplexBlock width={width} height={height} />
  );
};

export const RoadPathBlock = ({ pathData, color = "#64748b", width = 20, isDashed = false }: any) => (
  <svg viewBox="0 0 4000 2600" width="100%" height="100%" className="absolute inset-0 pointer-events-none z-10">
    <path 
      d={pathData} 
      fill="none" 
      stroke={color} 
      strokeWidth={width} 
      strokeDasharray={isDashed ? "20 20" : undefined} 
      strokeLinecap="round" 
    />
  </svg>
);

export const BillboardSpace = ({ seed }: { seed: number }) => {
  const isRed = seed % 2 === 0;
  return (
    <svg viewBox="0 0 100 50" width="100%" height="100%" className="drop-shadow-lg">
      <rect x="0" y="0" width="100" height="50" fill="#334155" rx="4" />
      <rect x="2" y="2" width="96" height="46" fill={isRed ? "#ef4444" : "#3b82f6"} rx="2" />
      <text x="50" y="30" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">YOUR AD</text>
    </svg>
  );
};

export { TallBuilding, type TallBuildingProps, type TallBuildingShape, type RoofFeature };
export { Plot, type PlotProps, type PlotTheme };

export const getBuildingSprite = (id: string, type: string, seed?: number, title?: string, loc?: any, onUnitClick?: any) => {
  if (type === 'plot' || type === 'building-plot' || type === 'base-plot') return (
    <Plot 
      width={loc?.width} 
      height={loc?.height} 
      name={title || loc?.name} 
      color={loc?.color} 
      theme={loc?.theme} 
      hasPlaza={!!loc?.hasPlaza} 
      hasPool={!!loc?.hasPool} 
      hasBorder={loc?.hasBorder !== false} 
      borderColor={loc?.borderColor} 
    />
  );
  if (type === 'tall-building' || type === 'skyscraper') return (
    <TallBuilding 
      width={loc?.width} 
      height={loc?.height} 
      floors={loc?.floors} 
      shape={loc?.shape} 
      color={loc?.color} 
      roofType={loc?.roofType} 
      hasPlot={loc?.hasPlot !== false}
      plotTheme={loc?.plotTheme}
      plotColor={loc?.plotColor}
      plotPadding={loc?.plotPadding}
      name={title || loc?.name} 
    />
  );
  if (type === 'floor-tile' || type === 'island-plain' || type === 'two-plains-tile') return <FloorTile width={loc?.width} height={loc?.height} name={title || loc?.name || "Island"} color={loc?.color || loc?.upperColor} showGrid={loc?.showGrid !== false} showLabel={loc?.showLabel !== false} />;
  if (type === 'burj-khalifa' || type === 'burj' || id === 'burj-khalifa') return <BurjKhalifa width={loc?.width} height={loc?.height} name={title || loc?.name || "Burj Khalifa"} />;
  if (type === 'hotel') return <HotelBlock width={loc?.width} height={loc?.height} name={title || loc?.name || "Luxury Resort & Hotel"} />;
  if (type === 'mall') return <MallBlock width={loc?.width} height={loc?.height} name={title || loc?.name || "Dubai Mall"} />;
  if (type === 'museum-future' || id === 'motf') return <MuseumOfFutureIcon width={loc?.width} height={loc?.height} />;
  if (type === 'dubai-frame' || id === 'dubai-frame') return <DubaiFrameIcon width={loc?.width} height={loc?.height} />;
  if (type === 'apartment-complex') return <ApartmentComplexBlock width={loc?.width} height={loc?.height} />;
  if (type === 'configurable-apartment') return <ConfigurableApartmentBlock width={loc?.width} height={loc?.height} hasPool={loc?.hasPool} hasParking={loc?.hasParking} hasCourt={loc?.hasCourt} numBuildings={loc?.numBuildings} color={loc?.color} name={loc?.name} onUnitClick={onUnitClick} />;
  if (type === 'giant-billboard' || type === 'billboard' || type === 'ad-billboard') return (
    <IsometricBillboard 
      id={id || loc?.id}
      width={loc?.width} 
      height={loc?.height} 
      billboardStyle={loc?.billboardStyle || 'mega-led'}
      imageUrl={loc?.imageUrl || loc?.image || loc?.img}
      isRented={loc?.isRented}
      rentedBy={loc?.rentedBy}
      rentalPrice={loc?.rentalPrice}
      adTitle={loc?.adTitle || title || loc?.name}
      adSubtitle={loc?.adSubtitle}
      text1={loc?.text1} 
      text2={loc?.text2} 
      color1={loc?.color1} 
      color2={loc?.color2} 
      brandColor={loc?.brandColor}
      seed={seed || 1}
    />
  );
  if (type === 'marina' || type === 'marina-harbour') return <MarinaBlock name={title || loc?.name} width={loc?.width} height={loc?.height} />;
  if (type === 'road-path') return <RoadPathBlock pathData={loc?.pathData} color={loc?.color} width={loc?.width} isDashed={loc?.isDashed} />;
  if (type === 'bridge') return <BridgeBlock width={loc?.width} height={loc?.height} />;
  if (type === 'metro-station' || type === 'metro' || type === 'dubai-metro') return (
    <DubaiMetroStation 
      id={id || loc?.id}
      name={title || loc?.name || "Burj Khalifa / Dubai Mall"}
      stationCode={loc?.stationCode || "25"}
      line={loc?.line || "red"}
      width={loc?.width}
      height={loc?.height}
    />
  );
  if (type === 'airport') return <AirportBlock name={title || loc?.name} width={loc?.width} height={loc?.height} />;
  if (type === 'community-emirates-hills') return <EmiratesHillsBlock />;
  if (type === 'community-jbr') return <JBRBlock />;
  if (type === 'community-bluewaters') return <BluewatersBlock />;
  if (type === 'community-ranches') return <ArabianRanchesBlock />;
  if (type === 'community-palm' || id === 'palm') return <PalmCommunityBlock width={loc?.width} height={loc?.height} />;
  if (type === 'community-motor-city') return <MotorCityBlock />;
  if (type === 'community-deira') return <DeiraBlock />;
  if (type === 'community-business-bay') return <BusinessBayBlock />;
  if (type === 'skyline' && seed !== undefined) return <SkylineTower seed={seed} />;
  if (type === 'salik') return <SalikGate width={loc?.width} height={loc?.height} />;
  if (type === 'road-sign' && title) return <RoadSign text={title} />;
  if (type === 'small-house' || type === 'house' || type === 'isometric-house') {
    return (
      <IsometricHouse
        id={id || loc?.id}
        width={loc?.width}
        height={loc?.height}
        roofColor={loc?.roofColor || loc?.color}
        wallColor={loc?.wallColor}
        plotColor={loc?.plotColor}
        showToken={loc?.showToken}
        name={title || loc?.name}
        price={loc?.price}
        rent={loc?.rent}
        onClick={loc?.onClick}
      />
    );
  }
  if (type === 'dubai-villa' || type === 'villa' || type === 'luxury-villa' || type === 'isometric-dubai-villa') {
    return (
      <IsometricDubaiVilla
        id={id || loc?.id}
        width={loc?.width}
        height={loc?.height}
        wallColor={loc?.wallColor || loc?.color}
        accentColor={loc?.accentColor}
        hasPool={loc?.hasPool !== false}
        hasPalm={loc?.hasPalm !== false}
        plotColor={loc?.plotColor}
        name={title || loc?.name}
        price={loc?.price}
        rent={loc?.rent}
        onClick={loc?.onClick}
      />
    );
  }
  if (type === 'apartment-building') return <ApartmentBuildingIconNew />;
  if (type === 'rooftop') return <RooftopIconNew />;
  if (type === 'club') return <NightclubIconNew />;
  if (type === 'beach' || type === 'beach-club' || type === 'isometric-beach') {
    return (
      <IsometricBeach
        id={id || loc?.id}
        width={loc?.width}
        height={loc?.height}
        name={title || loc?.name}
        sandColor={loc?.sandColor}
        waterColor={loc?.waterColor}
        plotColor={loc?.plotColor}
        hasBar={loc?.hasBar !== false}
        hasVolleyball={loc?.hasVolleyball !== false}
        hasJetSki={loc?.hasJetSki !== false}
        hasUmbrellas={loc?.hasUmbrellas !== false}
        price={loc?.price}
        onClick={loc?.onClick}
      />
    );
  }
  if (type === 'restaurant') return <RestaurantIconNew />;
  if (type === 'stadium') return <StadiumIcon />;
  if (type === 'hospital' || type === 'medical' || type === 'isometric-hospital') {
    return (
      <IsometricHospital
        id={id || loc?.id}
        width={loc?.width}
        height={loc?.height}
        name={title || loc?.name}
        wallColor={loc?.wallColor || loc?.color}
        glassColor={loc?.glassColor}
        accentColor={loc?.accentColor}
        plotColor={loc?.plotColor}
        hasHelipad={loc?.hasHelipad !== false}
        hasAmbulance={loc?.hasAmbulance !== false}
        onClick={loc?.onClick}
      />
    );
  }
  if (type === 'school') return <SchoolIcon />;
  if (type === 'casino') return <CasinoIcon />;
  if (type === 'park') return <ParkIcon />;

  switch(id) {
    case 'burj-khalifa': return <BurjKhalifaIcon />;
    case 'burj-al-arab': return <BurjAlArabIcon />;
    case 'jbh': return <JumeirahBeachHotelIcon />;
    case 'beach-club': return <BeachClubIconNew />;
    case 'bulgari': return <BulgariIslandIcon />;
    case 'atlantis-royal': return <AtlantisTheRoyalIcon />;
    case 'motf': return <MuseumOfFutureIcon width={loc?.width} height={loc?.height} />;
    case 'dubai-frame': return <DubaiFrameIcon width={loc?.width} height={loc?.height} />;
    case 'atlantis': return <AtlantisIcon />;
    case 'emirates-towers': return <EmiratesTowersIcon />;
    case 'gevora': return <GevoraIcon />;
    case 'rose-rayhaan': return <RoseRayhaanIcon />;
    case 'dwtc': return <DWTCIcon />;
  }
  return <GenericNeighborhood name={title || "District"} seed={seed || 0} />;
};
