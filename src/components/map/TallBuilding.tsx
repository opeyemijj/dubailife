import React from 'react';
import { MirrorX } from './mirror';

export type TallBuildingShape = 
  | 'rectangular' 
  | 'stepped' 
  | 'curved' 
  | 'tapered' 
  | 'twin' 
  | 'spire' 
  | 'gate';

export type RoofFeature = 'helipad' | 'spire' | 'garden' | 'crown' | 'simple';

export interface TallBuildingProps {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  floors?: number;
  shape?: TallBuildingShape;
  color?: string;
  roofType?: RoofFeature;
  showGroundShadow?: boolean;
  hasPlot?: boolean;
  plotTheme?: 'lawn' | 'plaza' | 'sand' | 'asphalt';
  plotColor?: string;
  plotPadding?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

// Color theme helper
interface ThemePalette {
  frontBase: string;
  frontHighlight: string;
  frontMullion: string;
  windowLight: string;
  windowGlow: string;
  leftWall: string;
  leftMullion: string;
  leftWindow: string;
  roofBase: string;
  roofTrim: string;
  metalTrim: string;
}

const getThemePalette = (color?: string): ThemePalette => {
  const c = (color || '#38bdf8').toLowerCase();

  // Gold / Bronze luxury tower
  if (c.includes('gold') || c === '#f59e0b' || c === '#d97706' || c === '#fbbf24' || c === '#eab308') {
    return {
      frontBase: '#78350f',
      frontHighlight: '#fde68a',
      frontMullion: '#b45309',
      windowLight: '#fef08a',
      windowGlow: '#f59e0b',
      leftWall: '#451a03',
      leftMullion: '#78350f',
      leftWindow: '#92400e',
      roofBase: '#92400e',
      roofTrim: '#fef08a',
      metalTrim: '#fef3c7',
    };
  }

  // Silver / Steel / Platinum DIFC tower
  if (c.includes('silver') || c === '#94a3b8' || c === '#cbd5e1' || c === '#64748b' || c === '#475569') {
    return {
      frontBase: '#334155',
      frontHighlight: '#f1f5f9',
      frontMullion: '#64748b',
      windowLight: '#e2e8f0',
      windowGlow: '#94a3b8',
      leftWall: '#0f172a',
      leftMullion: '#1e293b',
      leftWindow: '#334155',
      roofBase: '#475569',
      roofTrim: '#94a3b8',
      metalTrim: '#f8fafc',
    };
  }

  // Emerald / Green sustainable tower
  if (c.includes('green') || c === '#10b981' || c === '#059669' || c === '#34d399') {
    return {
      frontBase: '#064e3b',
      frontHighlight: '#a7f3d0',
      frontMullion: '#047857',
      windowLight: '#6ee7b7',
      windowGlow: '#10b981',
      leftWall: '#022c22',
      leftMullion: '#064e3b',
      leftWindow: '#065f46',
      roofBase: '#065f46',
      roofTrim: '#34d399',
      metalTrim: '#d1fae5',
    };
  }

  // Obsidian / Dark Charcoal modern tower
  if (c.includes('dark') || c === '#0f172a' || c === '#1e293b' || c === '#18181b') {
    return {
      frontBase: '#18181b',
      frontHighlight: '#71717a',
      frontMullion: '#27272a',
      windowLight: '#38bdf8',
      windowGlow: '#0284c7',
      leftWall: '#09090b',
      leftMullion: '#18181b',
      leftWindow: '#27272a',
      roofBase: '#27272a',
      roofTrim: '#52525b',
      metalTrim: '#a1a1aa',
    };
  }

  // Default: Marina Azure / Cyan glass (Standard Dubai iconic blue glass)
  return {
    frontBase: '#0369a1',
    frontHighlight: '#e0f2fe',
    frontMullion: '#0284c7',
    windowLight: '#7dd3fc',
    windowGlow: '#38bdf8',
    leftWall: '#082f49',
    leftMullion: '#0c4a6e',
    leftWindow: '#075985',
    roofBase: '#0284c7',
    roofTrim: '#bae6fd',
    metalTrim: '#f0f9ff',
  };
};

export const TallBuilding: React.FC<TallBuildingProps> = ({
  name = "Dubai Tower",
  width = 180,
  height = 320,
  floors = 24,
  shape = 'rectangular',
  color = '#38bdf8',
  roofType = 'helipad',
  showGroundShadow = true,
  hasPlot = true,
  plotTheme = 'lawn',
  plotColor,
  plotPadding = 50,
  className = "drop-shadow-xl cursor-pointer hover:scale-[1.02] transition-transform origin-bottom select-none",
  style,
  onClick,
}) => {
  const palette = getThemePalette(color);
  const clampedFloors = Math.max(4, Math.min(60, floors));

  // Determine Plot Surface & Bevel Colors
  const plotSurface = plotColor || (
    plotTheme === 'plaza' ? '#f1f5f9' :
    plotTheme === 'sand' ? '#dfce9d' :
    plotTheme === 'asphalt' ? '#334155' : '#84cc6d'
  );
  const plotBevelFront = plotTheme === 'plaza' ? '#cbd5e1' : (plotTheme === 'sand' ? '#cbb685' : '#4ade80');
  const plotBevelSide = plotTheme === 'plaza' ? '#94a3b8' : (plotTheme === 'sand' ? '#b59e69' : '#22c55e');

  // Geometry dimensions in SVG coordinate space (viewBox 0 0 240 380)
  // Camera rule:
  // - Front facade: DOMINANT (takes ~84% of total width)
  // - Left facade: NARROW and MINIMALLY visible (takes ~16% of width, shaded deep)
  // - Rooftop: PARTIALLY visible (depth ~14px, subtle 2.5D cap)
  const VB_W = 240;
  const VB_H = 380;
  const BASE_Y = 350; // Ground contact level

  // Visual building dimensions inside the SVG
  // Building height dynamically scales with floor count if height prop is default,
  // or adapts comfortably within the viewBox
  const topMargin = 55; // reserve space for roof spires / helipads
  const availableH = BASE_Y - topMargin;
  const bHeight = Math.min(availableH, Math.max(160, clampedFloors * 9.5 + 40));
  const TOP_Y = BASE_Y - bHeight;

  // Perspective offsets:
  // Left wall recedes back-left:
  const LEFT_FACADE_W = 22; // NARROW! Minimally visible (strictly follows priority)
  const ROOF_DEPTH_Y = 12;  // Subtle rooftop visibility, not excessive top-down!

  // Front facade X bounds:
  const FRONT_X_LEFT = 52;
  const FRONT_X_RIGHT = 208;
  const FRONT_W = FRONT_X_RIGHT - FRONT_X_LEFT; // 156px (dominant!)

  // Left facade X bounds:
  const BACK_X_LEFT = FRONT_X_LEFT - LEFT_FACADE_W; // 30px

  // Rooftop points
  const pRoofFrontL = { x: FRONT_X_LEFT, y: TOP_Y };
  const pRoofFrontR = { x: FRONT_X_RIGHT, y: TOP_Y };
  const pRoofBackR = { x: FRONT_X_RIGHT - LEFT_FACADE_W, y: TOP_Y - ROOF_DEPTH_Y };
  const pRoofBackL = { x: BACK_X_LEFT, y: TOP_Y - ROOF_DEPTH_Y };

  // Generate floor window rows
  const floorHeight = (BASE_Y - TOP_Y - 24) / clampedFloors;
  const floorIndices = Array.from({ length: clampedFloors }, (_, i) => i);

  // Render Roof Feature
  const renderRoofFeature = () => {
    const roofCenterX = (pRoofFrontL.x + pRoofFrontR.x) / 2 - LEFT_FACADE_W / 2;
    const roofCenterY = TOP_Y - ROOF_DEPTH_Y / 2;

    if (roofType === 'helipad') {
      return (
        <g transform={`translate(${roofCenterX}, ${roofCenterY})`}>
          {/* Helipad deck */}
          <ellipse cx="0" cy="0" rx="22" ry="6" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
          <ellipse cx="0" cy="0" rx="17" ry="4.5" fill="#1e293b" stroke="#facc15" strokeWidth="1" strokeDasharray="3 2" />
          <text x="0" y="2.5" fill="#ffffff" fontSize="7" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">H</text>
          {/* Safety perimeter beacons */}
          <circle cx="-19" cy="0" r="1.2" fill="#ef4444" />
          <circle cx="19" cy="0" r="1.2" fill="#ef4444" />
          <circle cx="0" cy="-4" r="1.2" fill="#22c55e" />
          <circle cx="0" cy="4" r="1.2" fill="#22c55e" />
        </g>
      );
    }

    if (roofType === 'spire') {
      return (
        <g transform={`translate(${roofCenterX}, ${roofCenterY})`}>
          {/* Spire pedestal */}
          <polygon 
            points="-8,2 8,2 5,-8 -5,-8" 
            fill={palette.roofTrim} 
            stroke={palette.metalTrim} 
            strokeWidth="0.8" 
          />
          {/* Main Needle Spire */}
          <line x1="0" y1="-8" x2="0" y2="-46" stroke={palette.metalTrim} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="0" y1="-46" x2="0" y2="-62" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
          {/* Aircraft Warning Beacon */}
          <circle cx="0" cy="-62" r="2.2" fill="#ef4444" />
          <circle cx="0" cy="-62" r="5" fill="#ef4444" opacity="0.3" />
        </g>
      );
    }

    if (roofType === 'garden') {
      return (
        <g transform={`translate(${roofCenterX}, ${roofCenterY})`}>
          {/* Sky garden lawn */}
          <ellipse cx="0" cy="0" rx="20" ry="5.5" fill="#15803d" stroke="#86efac" strokeWidth="0.8" />
          {/* Canopy & Trees */}
          <circle cx="-8" cy="-1" r="3" fill="#22c55e" />
          <circle cx="0" cy="-2" r="3.5" fill="#16a34a" />
          <circle cx="8" cy="-1" r="2.8" fill="#4ade80" />
          {/* Pool strip */}
          <path d="M -12,1 Q 0,3 12,1" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      );
    }

    if (roofType === 'crown') {
      return (
        <g transform={`translate(${roofCenterX}, ${roofCenterY})`}>
          {/* Dubai Architectural Crown Arches */}
          <path 
            d="M -24,2 L -20,-14 L -12,-6 L 0,-20 L 12,-6 L 20,-14 L 24,2 Z" 
            fill={palette.frontHighlight} 
            stroke={palette.metalTrim} 
            strokeWidth="1" 
            opacity="0.9"
          />
          <line x1="0" y1="-20" x2="0" y2="-36" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="-36" r="2" fill="#facc15" />
        </g>
      );
    }

    // Default simple mechanical penthouse
    return (
      <g transform={`translate(${roofCenterX}, ${roofCenterY})`}>
        <polygon points="-14,1 14,1 10,-8 -10,-8" fill="#334155" stroke="#64748b" strokeWidth="0.8" />
        <rect x="-6" y="-6" width="12" height="5" fill="#475569" />
        <line x1="8" y1="-8" x2="8" y2="-22" stroke="#94a3b8" strokeWidth="1.2" />
        <circle cx="8" cy="-22" r="1.5" fill="#ef4444" />
      </g>
    );
  };

  // Render Building Geometry by Shape
  const renderBuildingBody = () => {
    switch (shape) {
      // -------------------------------------------------------------
      // 1. STEPPED / TIERED (Iconic Dubai Setback Skyscraper)
      // -------------------------------------------------------------
      case 'stepped': {
        const tierH = (BASE_Y - TOP_Y) / 3;
        const t1_top = BASE_Y - tierH;
        const t2_top = BASE_Y - tierH * 2;
        const t3_top = TOP_Y;

        // Insets for each tier
        const inset1 = 0;
        const inset2 = 18;
        const inset3 = 36;

        return (
          <g>
            {/* TIER 1 (Base Tier) */}
            {/* Left facade */}
            <polygon 
              points={`${FRONT_X_LEFT - LEFT_FACADE_W},${BASE_Y - ROOF_DEPTH_Y} ${FRONT_X_LEFT},${BASE_Y} ${FRONT_X_LEFT},${t1_top} ${FRONT_X_LEFT - LEFT_FACADE_W},${t1_top - ROOF_DEPTH_Y}`} 
              fill={palette.leftWall} 
            />
            {/* Front facade */}
            <rect 
              x={FRONT_X_LEFT} 
              y={t1_top} 
              width={FRONT_W} 
              height={tierH} 
              fill={palette.frontBase} 
            />
            {/* Tier 1 Roof Setback */}
            <polygon 
              points={`${FRONT_X_LEFT},${t1_top} ${FRONT_X_RIGHT},${t1_top} ${FRONT_X_RIGHT - LEFT_FACADE_W},${t1_top - ROOF_DEPTH_Y} ${FRONT_X_LEFT - LEFT_FACADE_W},${t1_top - ROOF_DEPTH_Y}`} 
              fill={palette.roofBase} 
            />

            {/* TIER 2 (Middle Tier) */}
            <polygon 
              points={`${FRONT_X_LEFT + inset2 - LEFT_FACADE_W},${t1_top - ROOF_DEPTH_Y} ${FRONT_X_LEFT + inset2},${t1_top} ${FRONT_X_LEFT + inset2},${t2_top} ${FRONT_X_LEFT + inset2 - LEFT_FACADE_W},${t2_top - ROOF_DEPTH_Y}`} 
              fill={palette.leftWall} 
            />
            <rect 
              x={FRONT_X_LEFT + inset2} 
              y={t2_top} 
              width={FRONT_W - inset2 * 2} 
              height={tierH} 
              fill={palette.frontBase} 
            />
            <polygon 
              points={`${FRONT_X_LEFT + inset2},${t2_top} ${FRONT_X_RIGHT - inset2},${t2_top} ${FRONT_X_RIGHT - inset2 - LEFT_FACADE_W},${t2_top - ROOF_DEPTH_Y} ${FRONT_X_LEFT + inset2 - LEFT_FACADE_W},${t2_top - ROOF_DEPTH_Y}`} 
              fill={palette.roofBase} 
            />

            {/* TIER 3 (Top Tower Tier) */}
            <polygon 
              points={`${FRONT_X_LEFT + inset3 - LEFT_FACADE_W},${t2_top - ROOF_DEPTH_Y} ${FRONT_X_LEFT + inset3},${t2_top} ${FRONT_X_LEFT + inset3},${t3_top} ${FRONT_X_LEFT + inset3 - LEFT_FACADE_W},${t3_top - ROOF_DEPTH_Y}`} 
              fill={palette.leftWall} 
            />
            <rect 
              x={FRONT_X_LEFT + inset3} 
              y={t3_top} 
              width={FRONT_W - inset3 * 2} 
              height={tierH} 
              fill={palette.frontBase} 
            />
            <polygon 
              points={`${FRONT_X_LEFT + inset3},${t3_top} ${FRONT_X_RIGHT - inset3},${t3_top} ${FRONT_X_RIGHT - inset3 - LEFT_FACADE_W},${t3_top - ROOF_DEPTH_Y} ${FRONT_X_LEFT + inset3 - LEFT_FACADE_W},${t3_top - ROOF_DEPTH_Y}`} 
              fill={palette.roofTrim} 
            />

            {/* Floor Windows on Front Facade */}
            {floorIndices.map(f => {
              const y = BASE_Y - (f + 1) * floorHeight;
              if (y < TOP_Y) return null;
              const currentInset = y > t1_top ? inset1 : (y > t2_top ? inset2 : inset3);
              const curW = FRONT_W - currentInset * 2 - 8;
              const curX = FRONT_X_LEFT + currentInset + 4;
              return (
                <rect 
                  key={`step-win-${f}`} 
                  x={curX} 
                  y={y + 1} 
                  width={curW} 
                  height={Math.max(2, floorHeight - 2.5)} 
                  fill={palette.windowLight} 
                  rx={0.8}
                  opacity={0.88}
                />
              );
            })}

            {/* Vertical Mullion Lines */}
            <line x1={FRONT_X_LEFT + FRONT_W * 0.33} y1={t1_top} x2={FRONT_X_LEFT + FRONT_W * 0.33} y2={BASE_Y} stroke={palette.frontMullion} strokeWidth="1.2" />
            <line x1={FRONT_X_LEFT + FRONT_W * 0.66} y1={t1_top} x2={FRONT_X_LEFT + FRONT_W * 0.66} y2={BASE_Y} stroke={palette.frontMullion} strokeWidth="1.2" />
            <line x1={FRONT_X_LEFT + FRONT_W * 0.5} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.5} y2={t1_top} stroke={palette.frontMullion} strokeWidth="1.5" />
          </g>
        );
      }

      // -------------------------------------------------------------
      // 2. CURVED / ELLIPTICAL (Aerodynamic Glass Tower)
      // -------------------------------------------------------------
      case 'curved': {
        const cx = FRONT_X_LEFT + FRONT_W / 2;
        const bulge = 12;

        return (
          <g>
            {/* Left facade */}
            <polygon 
              points={`${BACK_X_LEFT},${BASE_Y - ROOF_DEPTH_Y} ${FRONT_X_LEFT},${BASE_Y} ${FRONT_X_LEFT},${TOP_Y} ${BACK_X_LEFT},${TOP_Y - ROOF_DEPTH_Y}`} 
              fill={palette.leftWall} 
            />

            {/* Front Curved Facade Surface */}
            <path 
              d={`
                M ${FRONT_X_LEFT},${BASE_Y} 
                Q ${cx},${BASE_Y + bulge} ${FRONT_X_RIGHT},${BASE_Y} 
                L ${FRONT_X_RIGHT},${TOP_Y} 
                Q ${cx},${TOP_Y + bulge} ${FRONT_X_LEFT},${TOP_Y} 
                Z
              `} 
              fill={palette.frontBase} 
            />

            {/* Rooftop Cap */}
            <path 
              d={`
                M ${FRONT_X_LEFT},${TOP_Y} 
                Q ${cx},${TOP_Y + bulge} ${FRONT_X_RIGHT},${TOP_Y} 
                L ${FRONT_X_RIGHT - LEFT_FACADE_W},${TOP_Y - ROOF_DEPTH_Y} 
                Q ${cx - LEFT_FACADE_W},${TOP_Y - ROOF_DEPTH_Y + bulge} ${BACK_X_LEFT},${TOP_Y - ROOF_DEPTH_Y} 
                Z
              `} 
              fill={palette.roofTrim} 
            />

            {/* Curved Floor Ribbon Bands */}
            {floorIndices.map(f => {
              const y = BASE_Y - (f + 1) * floorHeight;
              if (y < TOP_Y + 4) return null;
              return (
                <path 
                  key={`curve-win-${f}`} 
                  d={`M ${FRONT_X_LEFT + 4},${y} Q ${cx},${y + bulge} ${FRONT_X_RIGHT - 4},${y}`} 
                  stroke={palette.windowLight} 
                  strokeWidth={Math.max(2, floorHeight - 2.5)} 
                  strokeLinecap="round"
                  fill="none" 
                  opacity={0.9}
                />
              );
            })}

            {/* Architectural Vertical Glass Spines */}
            <line x1={cx - 24} y1={TOP_Y} x2={cx - 24} y2={BASE_Y} stroke={palette.frontHighlight} strokeWidth="1.2" opacity="0.6" />
            <line x1={cx + 24} y1={TOP_Y} x2={cx + 24} y2={BASE_Y} stroke={palette.frontHighlight} strokeWidth="1.2" opacity="0.6" />
          </g>
        );
      }

      // -------------------------------------------------------------
      // 3. TAPERED / WEDGE (Obelisk / Tapered Skyscraper)
      // -------------------------------------------------------------
      case 'tapered': {
        const topInset = 34;
        const topLX = FRONT_X_LEFT + topInset;
        const topRX = FRONT_X_RIGHT - topInset;
        const topBackLX = topLX - LEFT_FACADE_W;
        const topBackRX = topRX - LEFT_FACADE_W;

        return (
          <g>
            {/* Left facade (Tapered) */}
            <polygon 
              points={`${BACK_X_LEFT},${BASE_Y - ROOF_DEPTH_Y} ${FRONT_X_LEFT},${BASE_Y} ${topLX},${TOP_Y} ${topBackLX},${TOP_Y - ROOF_DEPTH_Y}`} 
              fill={palette.leftWall} 
            />

            {/* Front facade (Tapered Trapezoid) */}
            <polygon 
              points={`${FRONT_X_LEFT},${BASE_Y} ${FRONT_X_RIGHT},${BASE_Y} ${topRX},${TOP_Y} ${topLX},${TOP_Y}`} 
              fill={palette.frontBase} 
            />

            {/* Rooftop Deck */}
            <polygon 
              points={`${topLX},${TOP_Y} ${topRX},${TOP_Y} ${topBackRX},${TOP_Y - ROOF_DEPTH_Y} ${topBackLX},${TOP_Y - ROOF_DEPTH_Y}`} 
              fill={palette.roofTrim} 
            />

            {/* Floor Windows conforming to taper */}
            {floorIndices.map(f => {
              const y = BASE_Y - (f + 1) * floorHeight;
              if (y < TOP_Y + 4) return null;
              const progress = (BASE_Y - y) / (BASE_Y - TOP_Y);
              const inset = topInset * progress;
              const w = FRONT_W - inset * 2 - 8;
              const x = FRONT_X_LEFT + inset + 4;
              return (
                <rect 
                  key={`tap-win-${f}`} 
                  x={x} 
                  y={y} 
                  width={w} 
                  height={Math.max(2, floorHeight - 2.5)} 
                  fill={palette.windowLight} 
                  rx={0.8}
                  opacity={0.88}
                />
              );
            })}

            {/* Tapered Vertical Mullions */}
            <line x1={FRONT_X_LEFT + FRONT_W * 0.5} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.5} y2={BASE_Y} stroke={palette.frontHighlight} strokeWidth="1.8" />
          </g>
        );
      }

      // -------------------------------------------------------------
      // 4. TWIN TOWERS (Connected via Skybridge)
      // -------------------------------------------------------------
      case 'twin': {
        const gap = 20;
        const tW = (FRONT_W - gap) / 2;
        const bridgeY = TOP_Y + (BASE_Y - TOP_Y) * 0.38;

        return (
          <g>
            {/* TOWER 1 (Left Tower) */}
            {/* Left facade */}
            <polygon 
              points={`${BACK_X_LEFT},${BASE_Y - ROOF_DEPTH_Y} ${FRONT_X_LEFT},${BASE_Y} ${FRONT_X_LEFT},${TOP_Y} ${BACK_X_LEFT},${TOP_Y - ROOF_DEPTH_Y}`} 
              fill={palette.leftWall} 
            />
            {/* Front facade */}
            <rect x={FRONT_X_LEFT} y={TOP_Y} width={tW} height={BASE_Y - TOP_Y} fill={palette.frontBase} />
            {/* Roof */}
            <polygon 
              points={`${FRONT_X_LEFT},${TOP_Y} ${FRONT_X_LEFT + tW},${TOP_Y} ${FRONT_X_LEFT + tW - LEFT_FACADE_W},${TOP_Y - ROOF_DEPTH_Y} ${BACK_X_LEFT},${TOP_Y - ROOF_DEPTH_Y}`} 
              fill={palette.roofTrim} 
            />

            {/* TOWER 2 (Right Tower) */}
            {/* Left facade */}
            <polygon 
              points={`${FRONT_X_LEFT + tW + gap - LEFT_FACADE_W},${BASE_Y - ROOF_DEPTH_Y} ${FRONT_X_LEFT + tW + gap},${BASE_Y} ${FRONT_X_LEFT + tW + gap},${TOP_Y} ${FRONT_X_LEFT + tW + gap - LEFT_FACADE_W},${TOP_Y - ROOF_DEPTH_Y}`} 
              fill={palette.leftWall} 
            />
            {/* Front facade */}
            <rect x={FRONT_X_LEFT + tW + gap} y={TOP_Y} width={tW} height={BASE_Y - TOP_Y} fill={palette.frontBase} />
            {/* Roof */}
            <polygon 
              points={`${FRONT_X_LEFT + tW + gap},${TOP_Y} ${FRONT_X_RIGHT},${TOP_Y} ${FRONT_X_RIGHT - LEFT_FACADE_W},${TOP_Y - ROOF_DEPTH_Y} ${FRONT_X_LEFT + tW + gap - LEFT_FACADE_W},${TOP_Y - ROOF_DEPTH_Y}`} 
              fill={palette.roofTrim} 
            />

            {/* ICONIC DUBAI SKYBRIDGE (Connecting both towers) */}
            <g>
              <rect x={FRONT_X_LEFT + tW} y={bridgeY} width={gap} height={18} fill="#1e293b" stroke={palette.metalTrim} strokeWidth="1" />
              <rect x={FRONT_X_LEFT + tW + 1} y={bridgeY + 3} width={gap - 2} height={12} fill={palette.windowLight} opacity="0.9" />
              {/* Skybridge truss bracing */}
              <line x1={FRONT_X_LEFT + tW} y1={bridgeY + 18} x2={FRONT_X_LEFT + tW + gap / 2} y2={bridgeY + 24} stroke={palette.metalTrim} strokeWidth="1.5" />
              <line x1={FRONT_X_LEFT + tW + gap} y1={bridgeY + 18} x2={FRONT_X_LEFT + tW + gap / 2} y2={bridgeY + 24} stroke={palette.metalTrim} strokeWidth="1.5" />
            </g>

            {/* Windows on both towers */}
            {floorIndices.map(f => {
              const y = BASE_Y - (f + 1) * floorHeight;
              if (y < TOP_Y + 4) return null;
              return (
                <g key={`twin-win-${f}`}>
                  <rect x={FRONT_X_LEFT + 3} y={y} width={tW - 6} height={Math.max(2, floorHeight - 2.5)} fill={palette.windowLight} rx={0.8} opacity={0.88} />
                  <rect x={FRONT_X_LEFT + tW + gap + 3} y={y} width={tW - 6} height={Math.max(2, floorHeight - 2.5)} fill={palette.windowLight} rx={0.8} opacity={0.88} />
                </g>
              );
            })}

            {/* Architectural Spires on both towers */}
            <line x1={FRONT_X_LEFT + tW / 2} y1={TOP_Y} x2={FRONT_X_LEFT + tW / 2} y2={TOP_Y - 32} stroke={palette.metalTrim} strokeWidth="2" strokeLinecap="round" />
            <circle cx={FRONT_X_LEFT + tW / 2} cy={TOP_Y - 32} r="1.5" fill="#facc15" />
            <line x1={FRONT_X_LEFT + tW + gap + tW / 2} y1={TOP_Y} x2={FRONT_X_LEFT + tW + gap + tW / 2} y2={TOP_Y - 32} stroke={palette.metalTrim} strokeWidth="2" strokeLinecap="round" />
            <circle cx={FRONT_X_LEFT + tW + gap + tW / 2} cy={TOP_Y - 32} r="1.5" fill="#facc15" />
          </g>
        );
      }

      // -------------------------------------------------------------
      // 5. GATE / PORTAL (DIFC Gate / Atlantis Royal Portal Style)
      // -------------------------------------------------------------
      case 'gate': {
        const pillarW = 40;
        const archTopY = BASE_Y - (BASE_Y - TOP_Y) * 0.58;
        const archL = FRONT_X_LEFT + pillarW;
        const archR = FRONT_X_RIGHT - pillarW;

        return (
          <g>
            {/* Left facade */}
            <polygon 
              points={`${BACK_X_LEFT},${BASE_Y - ROOF_DEPTH_Y} ${FRONT_X_LEFT},${BASE_Y} ${FRONT_X_LEFT},${TOP_Y} ${BACK_X_LEFT},${TOP_Y - ROOF_DEPTH_Y}`} 
              fill={palette.leftWall} 
            />

            {/* Front facade (with monumental cutout arch) */}
            <path 
              d={`
                M ${FRONT_X_LEFT},${BASE_Y} 
                L ${archL},${BASE_Y} 
                L ${archL},${archTopY} 
                Q ${FRONT_X_LEFT + FRONT_W / 2},${archTopY - 14} ${archR},${archTopY} 
                L ${archR},${BASE_Y} 
                L ${FRONT_X_RIGHT},${BASE_Y} 
                L ${FRONT_X_RIGHT},${TOP_Y} 
                L ${FRONT_X_LEFT},${TOP_Y} 
                Z
              `} 
              fill={palette.frontBase} 
            />

            {/* Rooftop */}
            <polygon 
              points={`${pRoofFrontL.x},${pRoofFrontL.y} ${pRoofFrontR.x},${pRoofFrontR.y} ${pRoofBackR.x},${pRoofBackR.y} ${pRoofBackL.x},${pRoofBackL.y}`} 
              fill={palette.roofTrim} 
            />

            {/* Inner soffit of the arch (shaded ceiling of portal) */}
            <polygon 
              points={`${archL},${archTopY} ${archR},${archTopY} ${archR - LEFT_FACADE_W / 2},${archTopY - 6} ${archL - LEFT_FACADE_W / 2},${archTopY - 6}`} 
              fill="#090d16" 
              opacity="0.6" 
            />

            {/* Floor windows on the pillars and upper bridge */}
            {floorIndices.map(f => {
              const y = BASE_Y - (f + 1) * floorHeight;
              if (y < TOP_Y + 4) return null;
              if (y > archTopY) {
                // Windows on left and right pillars only
                return (
                  <g key={`gate-win-${f}`}>
                    <rect x={FRONT_X_LEFT + 3} y={y} width={pillarW - 6} height={Math.max(2, floorHeight - 2.5)} fill={palette.windowLight} rx={0.8} opacity={0.88} />
                    <rect x={archR + 3} y={y} width={pillarW - 6} height={Math.max(2, floorHeight - 2.5)} fill={palette.windowLight} rx={0.8} opacity={0.88} />
                  </g>
                );
              }
              // Windows span full upper bridge
              return (
                <rect 
                  key={`gate-win-${f}`} 
                  x={FRONT_X_LEFT + 4} 
                  y={y} 
                  width={FRONT_W - 8} 
                  height={Math.max(2, floorHeight - 2.5)} 
                  fill={palette.windowLight} 
                  rx={0.8} 
                  opacity={0.88} 
                />
              );
            })}
          </g>
        );
      }

      // -------------------------------------------------------------
      // 6. SPIRE / CROWN (Marina 101 / Elite Tower Style)
      // -------------------------------------------------------------
      case 'spire': {
        return (
          <g>
            {/* Left facade */}
            <polygon 
              points={`${BACK_X_LEFT},${BASE_Y - ROOF_DEPTH_Y} ${FRONT_X_LEFT},${BASE_Y} ${FRONT_X_LEFT},${TOP_Y} ${BACK_X_LEFT},${TOP_Y - ROOF_DEPTH_Y}`} 
              fill={palette.leftWall} 
            />
            {/* Left facade subtle floor bands */}
            {floorIndices.map(f => {
              const y = BASE_Y - (f + 1) * floorHeight;
              if (y < TOP_Y + 4) return null;
              return (
                <polygon 
                  key={`l-win-${f}`} 
                  points={`${BACK_X_LEFT + 2},${y - ROOF_DEPTH_Y + 1} ${FRONT_X_LEFT - 2},${y + 1} ${FRONT_X_LEFT - 2},${y + floorHeight - 1} ${BACK_X_LEFT + 2},${y + floorHeight - ROOF_DEPTH_Y - 1}`} 
                  fill={palette.leftWindow} 
                />
              );
            })}

            {/* Front facade */}
            <rect x={FRONT_X_LEFT} y={TOP_Y} width={FRONT_W} height={BASE_Y - TOP_Y} fill={palette.frontBase} />

            {/* Floor windows on front facade */}
            {floorIndices.map(f => {
              const y = BASE_Y - (f + 1) * floorHeight;
              if (y < TOP_Y + 4) return null;
              return (
                <rect 
                  key={`win-${f}`} 
                  x={FRONT_X_LEFT + 4} 
                  y={y + 1} 
                  width={FRONT_W - 8} 
                  height={Math.max(2, floorHeight - 2.5)} 
                  fill={palette.windowLight} 
                  rx={0.8}
                  opacity={0.88}
                />
              );
            })}

            {/* Vertical Mullion Lines */}
            <line x1={FRONT_X_LEFT + FRONT_W * 0.25} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.25} y2={BASE_Y} stroke={palette.frontMullion} strokeWidth="1.2" />
            <line x1={FRONT_X_LEFT + FRONT_W * 0.5} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.5} y2={BASE_Y} stroke={palette.frontHighlight} strokeWidth="1.5" />
            <line x1={FRONT_X_LEFT + FRONT_W * 0.75} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.75} y2={BASE_Y} stroke={palette.frontMullion} strokeWidth="1.2" />

            {/* Architectural Stepped Crown & Needle Spire */}
            <polygon 
              points={`${pRoofFrontL.x},${pRoofFrontL.y} ${pRoofFrontR.x},${pRoofFrontR.y} ${pRoofBackR.x},${pRoofBackR.y} ${pRoofBackL.x},${pRoofBackL.y}`} 
              fill={palette.roofTrim} 
            />
            {/* Crown tier */}
            <polygon 
              points={`${FRONT_X_LEFT + 20},${TOP_Y} ${FRONT_X_RIGHT - 20},${TOP_Y} ${FRONT_X_RIGHT - 35},${TOP_Y - 18} ${FRONT_X_LEFT + 5},${TOP_Y - 18}`} 
              fill={palette.frontHighlight} 
              stroke={palette.metalTrim} 
              strokeWidth="1" 
            />
            <line x1={(FRONT_X_LEFT + FRONT_X_RIGHT) / 2 - 10} y1={TOP_Y - 18} x2={(FRONT_X_LEFT + FRONT_X_RIGHT) / 2 - 10} y2={TOP_Y - 56} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx={(FRONT_X_LEFT + FRONT_X_RIGHT) / 2 - 10} cy={TOP_Y - 56} r="2.5" fill="#facc15" />
          </g>
        );
      }

      // -------------------------------------------------------------
      // 7. DEFAULT: RECTANGULAR MODERN GLASS SKYSCRAPER
      // -------------------------------------------------------------
      case 'rectangular':
      default: {
        return (
          <g>
            {/* ========================================================= */}
            {/* LEFT-SIDE FACADE: NARROW, MINIMALLY VISIBLE, DEEP SHADOW  */}
            {/* ========================================================= */}
            <polygon 
              points={`
                ${BACK_X_LEFT},${BASE_Y - ROOF_DEPTH_Y} 
                ${FRONT_X_LEFT},${BASE_Y} 
                ${FRONT_X_LEFT},${TOP_Y} 
                ${BACK_X_LEFT},${TOP_Y - ROOF_DEPTH_Y}
              `} 
              fill={palette.leftWall} 
            />

            {/* Left facade subtle floor bands (narrow) */}
            {floorIndices.map(f => {
              const y = BASE_Y - (f + 1) * floorHeight;
              if (y < TOP_Y + 4) return null;
              return (
                <polygon 
                  key={`l-win-${f}`} 
                  points={`
                    ${BACK_X_LEFT + 2},${y - ROOF_DEPTH_Y + 1} 
                    ${FRONT_X_LEFT - 2},${y + 1} 
                    ${FRONT_X_LEFT - 2},${y + floorHeight - 1} 
                    ${BACK_X_LEFT + 2},${y + floorHeight - ROOF_DEPTH_Y - 1}
                  `} 
                  fill={palette.leftWindow} 
                />
              );
            })}

            {/* ========================================================= */}
            {/* FRONT FACADE: DOMINANT VISIBLE SURFACE, BRIGHT & CRISP    */}
            {/* ========================================================= */}
            <rect 
              x={FRONT_X_LEFT} 
              y={TOP_Y} 
              width={FRONT_W} 
              height={BASE_Y - TOP_Y} 
              fill={palette.frontBase} 
            />

            {/* Floor glass window bands */}
            {floorIndices.map(f => {
              const y = BASE_Y - (f + 1) * floorHeight;
              if (y < TOP_Y + 4) return null;
              return (
                <rect 
                  key={`win-${f}`} 
                  x={FRONT_X_LEFT + 4} 
                  y={y + 1} 
                  width={FRONT_W - 8} 
                  height={Math.max(2, floorHeight - 2.5)} 
                  fill={palette.windowLight} 
                  rx={0.8}
                  opacity={0.88}
                />
              );
            })}

            {/* Vertical Mullion Lines (Dubai high-rise architectural verticality) */}
            <line x1={FRONT_X_LEFT + FRONT_W * 0.2} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.2} y2={BASE_Y} stroke={palette.frontMullion} strokeWidth="1.2" />
            <line x1={FRONT_X_LEFT + FRONT_W * 0.4} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.4} y2={BASE_Y} stroke={palette.frontMullion} strokeWidth="1.2" />
            <line x1={FRONT_X_LEFT + FRONT_W * 0.6} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.6} y2={BASE_Y} stroke={palette.frontMullion} strokeWidth="1.2" />
            <line x1={FRONT_X_LEFT + FRONT_W * 0.8} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.8} y2={BASE_Y} stroke={palette.frontMullion} strokeWidth="1.2" />

            {/* Prominent Architectural Center Spine / Accent Highlight */}
            <line x1={FRONT_X_LEFT + FRONT_W * 0.5} y1={TOP_Y} x2={FRONT_X_LEFT + FRONT_W * 0.5} y2={BASE_Y} stroke={palette.frontHighlight} strokeWidth="1.8" />

            {/* ========================================================= */}
            {/* ROOFTOP: PARTIALLY VISIBLE, CLEAN 2.5D TOP CAP            */}
            {/* ========================================================= */}
            <polygon 
              points={`
                ${pRoofFrontL.x},${pRoofFrontL.y} 
                ${pRoofFrontR.x},${pRoofFrontR.y} 
                ${pRoofBackR.x},${pRoofBackR.y} 
                ${pRoofBackL.x},${pRoofBackL.y}
              `} 
              fill={palette.roofTrim} 
            />
          </g>
        );
      }
    }
  };

  // 3D Isometric Ground Plot Foundation Geometry
  // The plot matches the EXACT direction and isometry of FloorTile:
  // - Recedes towards the top-right with FloorTile's exact ratio (slantX = depth * 0.235)
  // - Bottom and top edges have FloorTile's gentle baseline tilt (slope = 0.0166)
  // - Lower side has FloorTile's slim subtle emboss lip
  // Centred under the building as drawn: its front plus the wall on the right (the body is mirrored).
  const centerX = Math.round(FRONT_X_LEFT + FRONT_W / 2 + LEFT_FACADE_W / 2); // ~141
  const centerY = Math.round(BASE_Y - ROOF_DEPTH_Y / 2); // ~344

  const pad = Math.max(10, Math.min(120, plotPadding));
  const halfW = Math.round(78 + pad * 1.15);
  // Foreshortened depth matching 3D square geometry in FloorTile's camera projection:
  const halfD = Math.round(halfW * 0.52);
  // Slant vector matching FloorTile's exact direction and angle (recedes back-right):
  const slantX = Math.round((2 * halfD) * 0.235);
  const tiltY = Math.round((2 * halfW) * 0.0166);

  // 4 Corner Vertices of the ground plot (exact 3D direction & isometry matching FloorTile)
  const pFrontL = {
    x: Math.round(centerX - slantX / 2 - halfW),
    y: Math.round(centerY + halfD - tiltY / 2)
  };
  const pFrontR = {
    x: Math.round(centerX - slantX / 2 + halfW),
    y: Math.round(centerY + halfD + tiltY / 2)
  };
  const pBackR = {
    x: Math.round(centerX + slantX / 2 + halfW),
    y: Math.round(centerY - halfD + tiltY / 2)
  };
  const pBackL = {
    x: Math.round(centerX + slantX / 2 - halfW),
    y: Math.round(centerY - halfD - tiltY / 2)
  };

  // Dynamic ViewBox so the full plot fits with generous margin
  const minX = Math.round(Math.min(0, pFrontL.x - 10, pBackL.x - 10));
  const maxX = Math.round(Math.max(VB_W, pFrontR.x + 10, pBackR.x + 10));
  const minY = Math.round(Math.min(0, pBackL.y - 10));
  const maxY = Math.round(Math.max(VB_H, pFrontR.y + 12));
  const vbWidth = maxX - minX;
  const vbHeight = maxY - minY;

  return (
    <svg 
      viewBox={`${minX} ${minY} ${vbWidth} ${vbHeight}`} 
      style={{ width: `${width}px`, height: `${height}px`, ...style }} 
      className={className}
      onClick={onClick}
    >
      <defs>
        {/* Soft ground drop shadow blur */}
        <filter id={`tb-shadow-${clampedFloors}`} x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>

      {/* ==================================================================== */}
      {/* 1. GROUND DROP SHADOW (Consistent 2.5D contact shadow on the terrain) */}
      {/* ==================================================================== */}
      {showGroundShadow && (
        <g filter={`url(#tb-shadow-${clampedFloors})`}>
          <ellipse 
            cx={FRONT_X_LEFT + FRONT_W / 2 - LEFT_FACADE_W / 2} 
            cy={BASE_Y + 12} 
            rx={FRONT_W / 2 + 25} 
            ry={8} 
            fill="#090d16" 
            opacity="0.32" 
          />
        </g>
      )}

      {/* ==================================================================== */}
      {/* 2. BASE PLOT FOUNDATION (Well-padded base matching building angle)    */}
      {/* One solid clean color, crisp white border, NO extra inner shapes     */}
      {/* ==================================================================== */}
      {hasPlot && (
        <g>
          {/* Subtle thin front bevel rim on lower side only (~2.2px) */}
          <polygon 
            points={`${pFrontL.x},${pFrontL.y} ${pFrontR.x},${pFrontR.y} ${pFrontR.x},${pFrontR.y + 2.2} ${pFrontL.x},${pFrontL.y + 2.2}`} 
            fill={plotBevelFront} 
          />

          {/* Main Ground Plot Surface - EXACT SAME ISOMETRIC ANGLE AS THE BUILDING */}
          <polygon 
            points={`${pBackL.x},${pBackL.y} ${pBackR.x},${pBackR.y} ${pFrontR.x},${pFrontR.y} ${pFrontL.x},${pFrontL.y}`} 
            fill={plotSurface} 
            stroke="#ffffff" 
            strokeWidth="2.5" 
            strokeLinejoin="round" 
          />
        </g>
      )}

      {/* ==================================================================== */}
      {/* 3. MAIN BUILDING BODY & FACADES (Front Dominant, Left Narrow)         */}
      {/* ==================================================================== */}
      {/* Front and right side: the body is drawn with a left wall, so it is mirrored round the front. */}
      <MirrorX cx={FRONT_X_LEFT + FRONT_W / 2}>
      {renderBuildingBody()}

      {/* ==================================================================== */}
      {/* 3. ROOFTOP ARCHITECTURAL FEATURE (Helipad, Spire, Garden, Crown)      */}
      {/* ==================================================================== */}
      {shape !== 'spire' && renderRoofFeature()}

      {/* ==================================================================== */}
      {/* 4. GROUND LEVEL LOBBY CANOPY & ENTRANCE                              */}
      {/* ==================================================================== */}
      <g>
        {/* Illuminated Grand Lobby Entrance */}
        <rect 
          x={FRONT_X_LEFT + FRONT_W * 0.35} 
          y={BASE_Y - 14} 
          width={FRONT_W * 0.3} 
          height={14} 
          fill="#fef08a" 
          opacity="0.9" 
        />
        {/* Cantilevered Glass Canopy over entrance */}
        <polygon 
          points={`
            ${FRONT_X_LEFT + FRONT_W * 0.3},${BASE_Y - 14} 
            ${FRONT_X_LEFT + FRONT_W * 0.7},${BASE_Y - 14} 
            ${FRONT_X_LEFT + FRONT_W * 0.72},${BASE_Y - 11} 
            ${FRONT_X_LEFT + FRONT_W * 0.28},${BASE_Y - 11}
          `} 
          fill={palette.metalTrim} 
        />
        {/* Revolving / Sliding glass doors */}
        <line 
          x1={FRONT_X_LEFT + FRONT_W * 0.5} 
          y1={BASE_Y - 14} 
          x2={FRONT_X_LEFT + FRONT_W * 0.5} 
          y2={BASE_Y} 
          stroke="#1e293b" 
          strokeWidth="1.2" 
        />
      </g>

      </MirrorX>

      {/* ==================================================================== */}
      {/* 5. OPTIONAL BUILDING BADGE / NAME                                    */}
      {/* ==================================================================== */}
      {name && (
        <g transform={`translate(${FRONT_X_LEFT + FRONT_W / 2}, ${BASE_Y - 22})`} className="pointer-events-none select-none">
          <rect 
            x="-36" 
            y="-6" 
            width="72" 
            height="10" 
            fill="#0f172a" 
            rx="2" 
            opacity="0.8" 
          />
          <text 
            x="0" 
            y="1.5" 
            fill="#ffffff" 
            fontSize="5.5" 
            fontWeight="bold" 
            fontFamily="system-ui, sans-serif" 
            textAnchor="middle" 
            letterSpacing="0.5"
          >
            {name.length > 18 ? name.slice(0, 16) + '..' : name}
          </text>
        </g>
      )}
    </svg>
  );
};

export default TallBuilding;
