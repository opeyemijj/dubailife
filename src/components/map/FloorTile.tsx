import React from 'react';

export interface FloorTileProps {
  width?: number;
  height?: number;
  className?: string;
  name?: string;
  color?: string;
  upperColor?: string;
  showGrid?: boolean;
  showLabel?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const FloorTile: React.FC<FloorTileProps> = ({
  width = 600,
  height = 280,
  className = "z-0 transition-transform origin-center select-none",
  name = "Island",
  color = "#b8cf9e",
  upperColor,
  showGrid = true,
  showLabel = true,
  onClick,
  style
}) => {
  const activeColor = color || upperColor || "#b8cf9e";
  const displayName = (name || "ISLAND").toUpperCase();

  // Perspective: Looking down from an upper camera and from the top-left
  // The plane recedes towards the top-left; the lower side (bottom edge) is in the foreground
  const topL = { x: 92, y: 32 };
  const topR = { x: 554, y: 38 };
  const bottomR = { x: 524, y: 246 };
  const bottomL = { x: 42, y: 238 };

  // Main flat surface path with smooth rounded corners
  const surfacePath = `
    M 108,${topL.y} 
    L 538,${topR.y} 
    Q 556,${topR.y} 552,56 
    L 528,230 
    Q 524,246 506,246 
    L 60,238 
    Q 42,238 46,222 
    L 82,48 
    Q 86,${topL.y} 108,${topL.y} 
    Z
  `;

  // Lower side emboss band (runs STRICTLY along the bottom lower edge only, slim subtle ~2.2px lip)
  const lowerEmbossPath = `
    M 48,226 
    Q 43,238 60,238 
    L 506,246 
    Q 523,246 526,234 
    L 527,236.5 
    Q 524,248.5 506,248.5 
    L 60,240.5 
    Q 42,240.5 47,228.5 
    Z
  `;

  return (
    <svg 
      viewBox="0 0 600 280" 
      preserveAspectRatio="none"
      style={{ 
        width: width ? `${width}px` : '100%', 
        height: height ? `${height}px` : '100%', 
        ...style 
      }} 
      className={className}
      onClick={onClick}
    >
      <defs>
        {/* Clip path for grid lines so they stay strictly inside the main surface */}
        <clipPath id="ft-top-surface-clip">
          <path d={surfacePath} />
        </clipPath>
      </defs>

      {/* ==================================================================== */}
      {/* 1. LOWER SIDE EMBOSS (ONLY the lower side, delicate & slim)           */}
      {/* ==================================================================== */}
      
      {/* Base of lower emboss in the exact same color */}
      <path 
        d={lowerEmbossPath} 
        fill={activeColor} 
      />

      {/* Subtle, soft emboss shading of the same color (gentle depth) */}
      <path 
        d={lowerEmbossPath} 
        fill="#000000" 
        opacity="0.13" 
      />

      {/* ==================================================================== */}
      {/* 2. MAIN FLAT PLAIN SURFACE (Seen from upper camera, pure plain color)*/}
      {/* Top, Left, and Right have ZERO shadow and ZERO emboss                */}
      {/* ==================================================================== */}
      <path 
        d={surfacePath} 
        fill={activeColor} 
      />

      {/* ==================================================================== */}
      {/* 3. OPTIONAL SUBTLE GRID & LABEL (Clipped cleanly within the plain)    */}
      {/* ==================================================================== */}
      {showGrid && (
        <g clipPath="url(#ft-top-surface-clip)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="3 3">
          {/* Isometric grid lines aligned with top-left perspective */}
          <line x1="190" y1="20" x2="135" y2="260" />
          <line x1="295" y1="20" x2="240" y2="260" />
          <line x1="400" y1="20" x2="345" y2="260" />
          <line x1="505" y1="20" x2="450" y2="260" />
          {/* Transverse grid lines */}
          <line x1="65" y1="95" x2="550" y2="100" />
          <line x1="45" y1="170" x2="535" y2="175" />
        </g>
      )}

      {/* Subtle Header Label (e.g. "ISLAND", "COMMUNITY", "DOWNTOWN") */}
      {showLabel && displayName && (
        <g transform="translate(150, 52)" className="pointer-events-none select-none">
          <text 
            x="0" 
            y="0" 
            fill="#ffffff" 
            fontSize="13" 
            fontWeight="900" 
            fontFamily="system-ui, -apple-system, sans-serif" 
            letterSpacing="4" 
            opacity="0.5"
          >
            {displayName}
          </text>
        </g>
      )}
    </svg>
  );
};

export const IslandFloorTile = FloorTile;
export default FloorTile;
