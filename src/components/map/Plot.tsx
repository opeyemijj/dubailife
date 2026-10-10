import React from 'react';

export type PlotTheme = 'lawn' | 'plaza' | 'sand' | 'waterfront' | 'asphalt';

export interface PlotProps {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  color?: string;
  theme?: PlotTheme;
  hasPlaza?: boolean;
  hasPool?: boolean;
  hasBorder?: boolean;
  borderColor?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Plot: React.FC<PlotProps> = ({
  name = "Plot",
  width = 300,
  height = 300,
  color,
  theme = 'lawn',
  hasPlaza = false,
  hasPool = false,
  hasBorder = true,
  borderColor = "#ffffff",
  className = "z-0 transition-transform origin-center select-none",
  style,
  onClick,
}) => {
  // Determine surface & bevel colors based on theme / color override
  const getColors = () => {
    if (color) {
      return {
        surface: color,
        bevelFront: '#4ade80',
        bevelSide: '#22c55e',
      };
    }

    switch (theme) {
      case 'plaza':
        return {
          surface: '#f1f5f9',
          bevelFront: '#cbd5e1',
          bevelSide: '#94a3b8',
        };
      case 'sand':
        return {
          surface: '#dfce9d',
          bevelFront: '#cbb685',
          bevelSide: '#b59e69',
        };
      case 'asphalt':
        return {
          surface: '#334155',
          bevelFront: '#1e293b',
          bevelSide: '#0f172a',
        };
      case 'waterfront':
        return {
          surface: '#84cc6d',
          bevelFront: '#0284c7',
          bevelSide: '#0369a1',
        };
      case 'lawn':
      default:
        return {
          surface: '#84cc6d',
          bevelFront: '#4ade80',
          bevelSide: '#22c55e',
        };
    }
  };

  const colors = getColors();

  return (
    <svg 
      viewBox="0 0 320 320" 
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
        {/* Soft pool water gradient if pool is enabled */}
        <linearGradient id="plot-pool-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        <linearGradient id="plot-plaza-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>

      {/* ==================================================================== */}
      {/* 1. LOWER SIDE EMBOSS (Exact same direction & isometry as FloorTile)  */}
      {/* Runs strictly along the lower bottom edge only, slim subtle ~2.5px lip*/}
      {/* ==================================================================== */}
      
      {/* Front Bevel Lip in matching bevel color */}
      <polygon 
        points="31,218 261,222 261,224.5 31,220.5" 
        fill={colors.bevelFront} 
      />

      {/* ==================================================================== */}
      {/* 2. MAIN GROUND BASE PLAIN (Same direction & isometry as FloorTile)    */}
      {/* Exact 3D Square, recedes back-right matching FloorTile's angle        */}
      {/* ==================================================================== */}
      <polygon 
        points="59,98 289,102 261,222 31,218" 
        fill={colors.surface} 
        stroke={hasBorder ? borderColor : 'none'} 
        strokeWidth={hasBorder ? "2.5" : "0"} 
        strokeLinejoin="round" 
      />

      {/* ==================================================================== */}
      {/* 3. OPTIONAL TRAVERTINE PLAZA WALKWAY (Central promenade / paving)    */}
      {/* ==================================================================== */}
      {hasPlaza && (
        <polygon 
          points="95,124 175,125 158,198 78,197" 
          fill="url(#plot-plaza-grad)" 
          stroke="#e2e8f0" 
          strokeWidth="1.2" 
          strokeLinejoin="round" 
        />
      )}

      {/* ==================================================================== */}
      {/* 4. OPTIONAL WATER FEATURE / POOL (Fountain basin or resort pool)     */}
      {/* ==================================================================== */}
      {hasPool && (
        <g>
          {/* Stone Coping Curb */}
          <polygon 
            points="185,134 235,135 218,190 168,189" 
            fill="#f8fafc" 
            stroke="#cbd5e1" 
            strokeWidth="1" 
          />
          {/* Sunken Turquoise Pool Basin */}
          <polygon 
            points="188,137 232,138 215,187 171,186" 
            fill="url(#plot-pool-grad)" 
          />
          {/* Pool water ripple highlight */}
          <line x1="180" y1="150" x2="215" y2="151" stroke="#ffffff" strokeWidth="0.8" opacity="0.7" strokeLinecap="round" />
          <line x1="185" y1="168" x2="220" y2="169" stroke="#ffffff" strokeWidth="0.8" opacity="0.7" strokeLinecap="round" />
        </g>
      )}

      {/* ==================================================================== */}
      {/* 5. WATERFRONT THEME: FRONT CANAL DOCK BASIN                          */}
      {/* ==================================================================== */}
      {theme === 'waterfront' && (
        <g>
          {/* Wooden boardwalk deck */}
          <polygon points="31,218 261,222 261,230 31,226" fill="#78350f" />
          <polygon points="33,220 259,224 259,228 33,224" fill="#92400e" stroke="#451a03" strokeWidth="0.5" />
        </g>
      )}

      {/* Optional Plot Name Badge */}
      {name && name.toLowerCase() !== 'plot' && (
        <g transform="translate(135, 68)" className="pointer-events-none select-none">
          <text 
            x="0" 
            y="0" 
            fill="#ffffff" 
            fontSize="10" 
            fontWeight="bold" 
            fontFamily="system-ui, sans-serif" 
            letterSpacing="2" 
            opacity="0.6"
          >
            {name.toUpperCase()}
          </text>
        </g>
      )}
    </svg>
  );
};

export default Plot;
