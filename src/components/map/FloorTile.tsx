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

  // True Unified 2.5D Isometric Block Geometry
  // Slant depth dx = 0.2355 * H, Horizontal baseline slope dy = 0.01667 * (W - slantX)
  const W = Math.max(120, width || 600);
  const H = Math.max(80, height || 260);
  const slantX = Math.round(H * 0.2355);
  const tiltY = Math.max(2, Math.round((W - slantX) * 0.01667));

  // 4 True Isometric Vertices with 100% parallel edges
  const pBottomL = { x: 4, y: H - tiltY - 4 };
  const pBottomR = { x: W - slantX - 4, y: H - 4 };
  const pTopR = { x: W - 4, y: tiltY + 4 };
  const pTopL = { x: slantX + 4, y: 4 };

  // Smooth crisp-cornered quadrilateral (curbed urban block)
  const surfacePath = `
    M ${pTopL.x + 8},${pTopL.y - 1} 
    L ${pTopR.x - 8},${pTopR.y - 1} 
    Q ${pTopR.x},${pTopR.y} ${pTopR.x - 2},${pTopR.y + 6} 
    L ${pBottomR.x + 2},${pBottomR.y - 6} 
    Q ${pBottomR.x},${pBottomR.y} ${pBottomR.x - 8},${pBottomR.y} 
    L ${pBottomL.x + 8},${pBottomL.y} 
    Q ${pBottomL.x},${pBottomL.y} ${pBottomL.x + 2},${pBottomL.y - 6} 
    L ${pTopL.x - 2},${pTopL.y + 6} 
    Q ${pTopL.x},${pTopL.y} ${pTopL.x + 8},${pTopL.y - 1} 
    Z
  `;

  // Slim subtle lower-edge emboss curb (runs along the bottom edge only)
  const lowerEmbossPath = `
    M ${pBottomL.x},${pBottomL.y - 1}
    L ${pBottomR.x},${pBottomR.y - 1}
    L ${pBottomR.x},${pBottomR.y + 2.5}
    L ${pBottomL.x},${pBottomL.y + 2.5}
    Z
  `;

  return (
    <svg 
      viewBox={`0 0 ${W} ${H}`} 
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
        <clipPath id="ft-top-surface-clip">
          <path d={surfacePath} />
        </clipPath>
      </defs>

      {/* 1. LOWER SIDE EMBOSS (Subtle curb depth lip) */}
      <path d={lowerEmbossPath} fill={activeColor} />
      <path d={lowerEmbossPath} fill="#000000" opacity="0.14" />

      {/* 2. MAIN FLAT PLAIN SURFACE */}
      <path 
        d={surfacePath} 
        fill={activeColor} 
        stroke="rgba(255,255,255,0.45)" 
        strokeWidth="1.2" 
      />

      {/* 3. SUBTLE INTERNAL LOT GRIDLINES (Parallel to isometric block edges) */}
      {showGrid && (
        <g clipPath="url(#ft-top-surface-clip)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" strokeDasharray="3 3">
          {/* Longitudinal Depth Lines (Parallel to slant) */}
          {[0.2, 0.4, 0.6, 0.8].map((u) => {
            const x1 = pTopL.x + u * (pTopR.x - pTopL.x);
            const y1 = pTopL.y + u * (pTopR.y - pTopL.y);
            const x2 = pBottomL.x + u * (pBottomR.x - pBottomL.x);
            const y2 = pBottomL.y + u * (pBottomR.y - pBottomL.y);
            return <line key={`lon-${u}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}

          {/* Transverse Lines (Parallel to horizontal baseline) */}
          {[0.33, 0.66].map((v) => {
            const x1 = pTopL.x + v * (pBottomL.x - pTopL.x);
            const y1 = pTopL.y + v * (pBottomL.y - pTopL.y);
            const x2 = pTopR.x + v * (pBottomR.x - pTopR.x);
            const y2 = pTopR.y + v * (pBottomR.y - pTopR.y);
            return <line key={`lat-${v}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
      )}

      {/* 4. DISTRICT HEADER LABEL */}
      {showLabel && displayName && (
        <g transform={`translate(${pTopL.x + 24}, ${pTopL.y + 36})`} className="pointer-events-none select-none">
          <text 
            x="0" 
            y="0" 
            fill="#ffffff" 
            fontSize="12" 
            fontWeight="900" 
            fontFamily="system-ui, -apple-system, sans-serif" 
            letterSpacing="3" 
            opacity="0.65"
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
