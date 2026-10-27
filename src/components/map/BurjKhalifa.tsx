import { MirrorX } from './mirror';
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

      {/* Front and right side: the tower is drawn with its left faces showing, so it is mirrored round its spine. */}
      <MirrorX cx={160}>
        <Tower />
      </MirrorX>

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

/**
 * The tower as stacked setbacks, each a block with its front, its side going back and a sliver of roof,
 * the same construction as the other towers on the map (drawn with the side on the left; the caller
 * mirrors it so the side shows on the right). A glass spine runs up the middle of every tier.
 */
const TIERS = [
  { hw: 44, top: 262 }, { hw: 36, top: 205 }, { hw: 29, top: 155 }, { hw: 22, top: 112 },
  { hw: 16, top: 76 }, { hw: 11, top: 48 }, { hw: 7, top: 30 },
];
const BASE_Y = 330;
const CX = 160;

function Tower() {
  // Each tier stands on the one below it.
  const bottoms = TIERS.map((_, i) => (i === 0 ? BASE_Y : TIERS[i - 1].top));
  const bottom = TIERS[TIERS.length - 1].top;
  return (
    <g className="bk-tower">
      {/* Podium */}
      <TowerBlock x0={CX - 58} x1={CX + 58} yb={BASE_Y + 8} yt={BASE_Y - 10} depth={16} rise={7} front="#e2e8f0" />
      {TIERS.map((t, i) => {
        const yb = bottoms[i];
        return (
          <g key={i}>
            <TowerBlock x0={CX - t.hw} x1={CX + t.hw} yb={yb} yt={t.top} depth={6 + t.hw * 0.28} rise={5} front="url(#bk-front-facet)" />
            {/* Glass spine and floor lines */}
            <rect x={CX - t.hw * 0.28} y={t.top} width={t.hw * 0.56} height={yb - t.top} fill="url(#bk-mirror-facet)" opacity="0.9" />
            {Array.from({ length: Math.floor((yb - t.top) / 9) }, (_, k) => (
              <line key={k} x1={CX - t.hw} x2={CX + t.hw} y1={t.top + 9 * (k + 1)} y2={t.top + 9 * (k + 1)} stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
            ))}
          </g>
        );
      })}
      {/* Spire with its beacon */}
      <polygon points={`${CX - 2.4},${bottom} ${CX + 2.4},${bottom} ${CX + 0.6},4 ${CX - 0.6},4`} fill="url(#bk-front-facet)" stroke="#64748b" strokeWidth="0.5" />
      <polygon points={`${CX - 2.4},${bottom} ${CX - 5},${bottom - 3} ${CX - 1.6},4 ${CX - 0.6},4`} fill="url(#bk-left-facet)" />
      <circle cx={CX} cy="4" r="1.6" fill="#ef4444">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

/** One block: the front face, the side going back to the left and up, and the roof edge on top. */
function TowerBlock({ x0, x1, yb, yt, depth, rise, front }: { x0: number; x1: number; yb: number; yt: number; depth: number; rise: number; front: string }) {
  return (
    <g>
      <polygon points={`${x0 - depth},${yb - rise} ${x0},${yb} ${x0},${yt} ${x0 - depth},${yt - rise}`} fill="url(#bk-left-facet)" stroke="#1e293b" strokeWidth="0.6" />
      <polygon points={`${x0},${yt} ${x1},${yt} ${x1 - depth},${yt - rise} ${x0 - depth},${yt - rise}`} fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.6" />
      <rect x={x0} y={yt} width={x1 - x0} height={yb - yt} fill={front} stroke="#64748b" strokeWidth="0.6" />
    </g>
  );
}
