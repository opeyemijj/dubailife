import React from 'react';

export interface DXBAirportBlockProps {
  width?: number;
  height?: number;
  name?: string;
  onClick?: () => void;
  className?: string;
  onTerminalClick?: (terminal: 1 | 2 | 3) => void;
}

/**
 * DXBAirportBlock: 2.5D Isometric Full-Tile Replica of Dubai International Airport (DXB).
 * Designed for the 1400x450 Al Khawaneej tile with 0.2355 slant and 0.01667 baseline tilt.
 * Features:
 *  - Terminal 1 (Sheikh Rashid Concourse D & International Airlines)
 *  - Terminal 2 (flydubai, Executive Aviation & Regional Stands)
 *  - Terminal 3 (Emirates A380 Aerofoil Megahub, Concourses A & B)
 *  - The Famous 87m DXB Flower-Bud Air Traffic Control (ATC) Tower
 *  - Northern Runway 12L / 30R & Southern Runway 12R / 30L
 *  - Dubai Metro Red Line Elevated Viaduct & Dedicated Airport Stations
 *  - Animated Emirates Landing Aircraft with Dynamic Ground Shadow & Touchdown Smoke
 *  - Parked A380 Superjumbos, B777s, flydubai 737s, Ground Support Equipment (GSE)
 *  - Landside Airport Road (Al Matar St) with Dubai Taxis & Departures Viaducts
 */
export const DXBAirportBlock: React.FC<DXBAirportBlockProps> = ({
  width = 1400,
  height = 450,
  name = "Dubai International Airport (DXB)",
  onClick,
  className = "map-animated z-20 select-none",
  onTerminalClick,
}) => {
  // Tile geometry strictly matching FloorTile:
  // Slant depth dx = 0.2355 * 450 = 106 px, baseline slope dy = 0.01667 * (1400 - 106) = 22 px
  const W = 1400;
  const H = 450;
  const slantX = 106;
  const tiltY = 22;

  // 4 True Isometric Vertices:
  // Top-L: (110, 4), Top-R: (1396, 26), Bottom-R: (1290, 446), Bottom-L: (4, 424)
  const pBottomL = { x: 4, y: H - tiltY - 4 }; // (4, 424)
  const pBottomR = { x: W - slantX - 4, y: H - 4 }; // (1290, 446)
  const pTopR = { x: W - 4, y: tiltY + 4 }; // (1396, 26)
  const pTopL = { x: slantX + 4, y: 4 }; // (110, 4)

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

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%',
      }}
      className={className}
      onClick={onClick}
    >
      <defs>
        {/* Airfield Base Clip Path */}
        <clipPath id="dxb-airfield-surface-clip">
          <path d={surfacePath} />
        </clipPath>

        {/* Runway Asphalt Surface Gradients */}
        <linearGradient id="dxbAsphaltDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#090d16" />
          <stop offset="50%" stopColor="#172033" />
          <stop offset="100%" stopColor="#0a0e1a" />
        </linearGradient>

        <linearGradient id="dxbTaxiwayConcrete" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="50%" stopColor="#283548" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Terminal Glass Shading */}
        <linearGradient id="dxbTerminal3Glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#0284c7" stopOpacity="0.95" />
          <stop offset="80%" stopColor="#0369a1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="dxbTerminal1Glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#475569" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id="dxbTerminal2Glass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.85" />
          <stop offset="30%" stopColor="#0284c7" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
        </linearGradient>

        {/* Metro Golden Tube Gradient */}
        <linearGradient id="dxbMetroGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>

        {/* Dynamic Aircraft Shadow */}
        <radialGradient id="dxbPlaneShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Animated Landing Aircraft Flight Paths */}
        {/* Descent on Southern Runway 12R (Glide slope to touchdown at x=340, rollout to x=1050) */}
        <path id="dxb-landing-glide-path" d="M -80 320 C 120 370, 260 395, 340 396 L 980 405 C 1080 405, 1200 370, 1480 300" fill="none" />
        <path id="dxb-landing-shadow-path" d="M -80 396 L 340 396 L 980 405 L 1480 405" fill="none" />

        {/* Taxiing Aircraft along Taxiway Mike (x=500 to x=920) */}
        <path id="dxb-taxi-path" d="M 460 216 L 820 222 L 870 240 L 920 270" fill="none" />
      </defs>

      {/* ==================================================================== */}
      {/* 1. LOWER SIDE EMBOSS (Exact curb depth bevel matching FloorTile)     */}
      {/* ==================================================================== */}
      <polygon points="4,424 1290,446 1290,450 4,428" fill="#090d16" />
      <polygon points="4,424 1290,446 1290,448 4,426" fill="#1e293b" />

      {/* ==================================================================== */}
      {/* 2. ISOMETRIC AIRFIELD BASE PLATFORM (Dark Tarmac Foundation)          */}
      {/* ==================================================================== */}
      <path
        d={surfacePath}
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Elements clipped neatly within the isometric airfield boundaries */}
      <g clipPath="url(#dxb-airfield-surface-clip)">
        {/* ================================================================== */}
        {/* 3. AIRFIELD INFIELD GRASS / TURF PARCELS (Realistic Desert Green)  */}
        {/* ================================================================== */}
        {/* North Grass Verges (Between T2 and Northern Runway) */}
        <polygon points="120,40 1370,62 1350,116 100,94" fill="#14231a" opacity="0.85" />
        {/* Central Grass Infields (Between Northern Runway and Apron) */}
        <polygon points="170,166 1330,186 1300,210 140,190" fill="#192e21" opacity="0.8" />
        {/* Central-South Grass Infield (Between T1/T3 Concourse and Southern Runway) */}
        <polygon points="130,340 1260,358 1230,368 100,350" fill="#14231a" opacity="0.75" />
        {/* South Perimeter Grass Verges */}
        <polygon points="30,412 1260,432 1250,444 15,424" fill="#1b3022" opacity="0.9" />

        {/* ================================================================== */}
        {/* 4. NORTH ZONE: TERMINAL 2 & EXECUTIVE AVIATION (flydubai HUB)      */}
        {/* ================================================================== */}
        <g id="dxb-terminal-2-group" className="cursor-pointer" onClick={() => onTerminalClick?.(2)}>
          {/* T2 Apron Concrete Slab */}
          <polygon points="260,60 760,68 740,118 240,110" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* Emirates Engineering Hangars (Far Left) */}
          <g transform="translate(130, 48)">
            {/* Hangar 1 */}
            <polygon points="0,15 70,16 65,45 -5,44" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <polygon points="0,15 70,16 66,8 -4,7" fill="#334155" />
            <polygon points="5,22 65,23 62,44 2,43" fill="#0f172a" />
            {/* Emirates Aviation Logo Text */}
            <text x="35" y="14" fill="#ef4444" fontSize="6" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">EMIRATES ENG</text>

            {/* Hangar 2 */}
            <g transform="translate(75, 1)">
              <polygon points="0,15 55,16 51,45 -4,44" fill="#1e293b" stroke="#475569" strokeWidth="1" />
              <polygon points="0,15 55,16 52,8 -3,7" fill="#334155" />
              <polygon points="4,22 51,23 48,44 1,43" fill="#0f172a" />
            </g>
          </g>

          {/* Terminal 2 Main Passenger Building */}
          <g transform="translate(280, 42)">
            {/* Building Shadow */}
            <polygon points="0,22 360,28 360,32 0,26" fill="#000000" opacity="0.4" />
            {/* Base Wall */}
            <polygon points="0,14 350,20 350,24 0,18" fill="#0f172a" />
            {/* Modern Glass Facade & Roof */}
            <polygon points="4,2 354,8 350,20 0,14" fill="url(#dxbTerminal2Glass)" stroke="#38bdf8" strokeWidth="0.8" />
            {/* Solar Panels on Roof */}
            {Array.from({ length: 14 }).map((_, i) => (
              <line key={`t2-solar-${i}`} x1={20 + i * 23} y1={5 + i * 0.4} x2={16 + i * 23} y2={15 + i * 0.4} stroke="#0369a1" strokeWidth="0.8" opacity="0.7" />
            ))}
            {/* Illuminated Signage */}
            <rect x="100" y="5" width="150" height="9" rx="2" fill="#0f172a" opacity="0.9" stroke="#f97316" strokeWidth="0.8" />
            <text x="175" y="12" fill="#f97316" fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="0.6">
              ✈️ DXB TERMINAL 2 • flydubai
            </text>
          </g>

          {/* Terminal 2 Remote Stands (Parked flydubai 737 Aircraft) */}
          {[
            { x: 360, y: 88, scale: 0.65, code: "FZ 401" },
            { x: 500, y: 90, scale: 0.65, code: "FZ 525" },
            { x: 640, y: 92, scale: 0.65, code: "FZ 108" },
          ].map((stand, i) => (
            <g key={`t2-stand-${i}`} transform={`translate(${stand.x}, ${stand.y})`}>
              {/* Stand Markings */}
              <circle cx="0" cy="0" r="16" fill="none" stroke="#facc15" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
              <text x="0" y="-18" fill="#facc15" fontSize="6" fontWeight="bold" textAnchor="middle">{stand.code}</text>

              {/* Parked Boeing 737 MAX (flydubai livery) */}
              <g transform={`scale(${stand.scale})`}>
                {/* Aircraft Ground Shadow */}
                <ellipse cx="0" cy="14" rx="24" ry="7" fill="#000000" opacity="0.4" />
                {/* Fuselage */}
                <path d="M 0 -22 C 4 -16, 4 14, 0 20 C -4 14, -4 -16, 0 -22 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
                {/* Cockpit Window */}
                <polygon points="-2,-18 2,-18 3,-15 -3,-15" fill="#0f172a" />
                {/* Swept Wings */}
                <polygon points="0,-4 28,10 24,12 0,2 -24,12 -28,10" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" />
                {/* flydubai Dual Winglets (Orange & Blue) */}
                <polygon points="26,8 30,5 29,11" fill="#f97316" />
                <polygon points="-26,8 -30,5 -29,11" fill="#0284c7" />
                {/* Turbofans */}
                <rect x="8" y="2" width="4.5" height="9" rx="1.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
                <rect x="-12.5" y="2" width="4.5" height="9" rx="1.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
                {/* Vertical Tailfin (flydubai signature orange/blue) */}
                <polygon points="0,12 4,22 -4,22" fill="#0284c7" />
                <polygon points="0,15 3,22 0,22" fill="#f97316" />
              </g>

              {/* Mobile Passenger Boarding Stairs Rolled to Front Door */}
              <g transform="translate(-14, -8)">
                <rect x="0" y="0" width="8" height="6" fill="#facc15" stroke="#ca8a04" strokeWidth="0.6" />
                <line x1="2" y1="6" x2="2" y2="10" stroke="#64748b" strokeWidth="0.8" />
                <line x1="6" y1="6" x2="6" y2="10" stroke="#64748b" strokeWidth="0.8" />
              </g>
            </g>
          ))}
        </g>

        {/* ================================================================== */}
        {/* 5. NORTHERN RUNWAY 12L / 30R (4,000 m Full-Length Parallel Strip)  */}
        {/* ================================================================== */}
        <g id="dxb-runway-12l-30r">
          {/* Runway Asphalt Surface */}
          <polygon
            points="140,128 1350,148 1338,166 128,146"
            fill="url(#dxbAsphaltDark)"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Runway Skid Marks (Touchdown Zones) */}
          <polygon points="240,132 400,135 390,161 230,158" fill="#000000" opacity="0.45" />
          <polygon points="1050,146 1220,149 1210,164 1040,161" fill="#000000" opacity="0.45" />

          {/* Left Threshold Piano Keys (12L) */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`pk-12l-${i}`}
              x1={155 - i * 0.6}
              y1={133 + i * 3.8}
              x2={175 - i * 0.6}
              y2={133 + i * 3.8 + 0.3}
              stroke="#ffffff"
              strokeWidth="2.5"
            />
          ))}
          <text x="188" y="153" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="monospace">12L</text>

          {/* Right Threshold Piano Keys (30R) */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`pk-30r-${i}`}
              x1={1300 - i * 0.6}
              y1={151 + i * 3.8}
              x2={1320 - i * 0.6}
              y2={151 + i * 3.8 + 0.3}
              stroke="#ffffff"
              strokeWidth="2.5"
            />
          ))}
          <text x="1275" y="167" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="monospace">30R</text>

          {/* Runway Centerline (Following 0.017 incline) */}
          <line x1="220" y1="148" x2="1250" y2="164" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="22 14" />

          {/* High-Speed Rapid Exit Taxiways (Connecting to Central Apron) */}
          <path d="M 420,150 Q 450,165 470,185" stroke="#facc15" strokeWidth="1.5" fill="none" opacity="0.9" />
          <path d="M 720,155 Q 750,170 770,188" stroke="#facc15" strokeWidth="1.5" fill="none" opacity="0.9" />
          <path d="M 1020,160 Q 1050,175 1070,192" stroke="#facc15" strokeWidth="1.5" fill="none" opacity="0.9" />

          {/* Runway Edge Lighting */}
          {Array.from({ length: 24 }).map((_, i) => {
            const t = i / 23;
            const tx = 145 + t * (1345 - 145);
            const ty = 129 + t * (149 - 129);
            const bx = 133 + t * (1333 - 133);
            const by = 147 + t * (167 - 147);
            const isAmber = i < 3 || i > 20;
            return (
              <g key={`rw1-light-${i}`}>
                <circle cx={tx} cy={ty} r="1.5" fill={isAmber ? "#facc15" : "#ffffff"} />
                <circle cx={bx} cy={by} r="1.5" fill={isAmber ? "#facc15" : "#ffffff"} />
              </g>
            );
          })}
        </g>

        {/* ================================================================== */}
        {/* 6. CENTRAL APRON, TAXIWAYS & FAMOUS DXB FLOWER-BUD ATC TOWER       */}
        {/* ================================================================== */}
        <g id="dxb-central-apron">
          {/* Dual Main Parallel Taxiways (Taxiway Kilo & Mike) */}
          <line x1="160" y1="195" x2="1310" y2="212" stroke="#facc15" strokeWidth="1.8" strokeDasharray="14 10" />
          <line x1="180" y1="216" x2="1290" y2="233" stroke="#facc15" strokeWidth="1.8" />

          {/* Taxiway Blue Edge Lights */}
          {Array.from({ length: 22 }).map((_, i) => (
            <circle key={`tw-light-${i}`} cx={170 + i * 52} cy={200 + i * 0.8} r="1.5" fill="#38bdf8" opacity="0.85" />
          ))}

          {/* Taxiway Guidance Signs ([K], [M], [12L-30R]) */}
          {[
            { x: 380, y: 190, text: "K ->" },
            { x: 680, y: 194, text: "M3 | T3" },
            { x: 1080, y: 200, text: "<- 30R" },
          ].map((sign, i) => (
            <g key={`sign-${i}`} transform={`translate(${sign.x}, ${sign.y})`}>
              <rect x="0" y="0" width="28" height="8" rx="1.5" fill="#facc15" stroke="#000000" strokeWidth="0.8" />
              <text x="14" y="6" fill="#000000" fontSize="5.5" fontWeight="900" textAnchor="middle">{sign.text}</text>
            </g>
          ))}

          {/* Aircraft Taxiing on Taxiway Mike (Animated) */}
          <g>
            <animateMotion dur="24s" repeatCount="indefinite" rotate="auto">
              <mpath href="#dxb-taxi-path" />
            </animateMotion>
            <g transform="scale(0.7)">
              <ellipse cx="0" cy="8" rx="20" ry="5" fill="#000000" opacity="0.3" />
              {/* Airplane */}
              <polygon points="0,-18 5,-12 4,18 0,24 -4,18 -5,-12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
              <polygon points="0,-2 26,10 22,12 0,4 -22,12 -26,10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
              <polygon points="0,14 4,24 -4,24" fill="#ef4444" />
              {/* Flashing Red Anti-Collision Beacon */}
              <circle cx="0" cy="-2" r="2" fill="#ef4444">
                <animate attributeName="opacity" values="1;0.1;1" dur="0.9s" repeatCount="indefinite" />
              </circle>
            </g>
          </g>

          {/* ---------------------------------------------------------------- */}
          {/* THE FAMOUS 87-METRE DXB FLOWER-BUD AIR TRAFFIC CONTROL TOWER    */}
          {/* ---------------------------------------------------------------- */}
          <g id="dxb-atc-tower" transform="translate(680, 160)">
            {/* Tower Shadow (Diagonal Isometric Drop) */}
            <ellipse cx="24" cy="58" rx="26" ry="8" fill="#000000" opacity="0.4" />

            {/* Tower Concrete Plinth Base */}
            <polygon points="0,52 36,53 30,62 -6,61" fill="#1e293b" stroke="#475569" strokeWidth="1" />

            {/* Tower Stem: Iconic Curved Sculptural Flower-Petal Column */}
            <path
              d="M 10 52 C 12 36, 6 22, 12 6 L 24 6 C 30 22, 24 36, 26 53 Z"
              fill="#f1f5f9"
              stroke="#94a3b8"
              strokeWidth="0.9"
            />
            {/* Shaded Flank of Column */}
            <path
              d="M 18 52 C 22 36, 18 22, 24 6 L 24 6 C 30 22, 24 36, 26 53 Z"
              fill="#cbd5e1"
              opacity="0.8"
            />

            {/* Flared Sub-Cab Balcony Gallery */}
            <polygon points="6,6 30,6.5 28,10 8,9.5" fill="#475569" />

            {/* 360-Degree Panoramic Glass Control Cab */}
            <polygon points="4,6 32,6.5 28,-4 8,-4.5" fill="url(#dxbTerminal3Glass)" stroke="#0284c7" strokeWidth="0.8" />
            <polygon points="6,-4.5 30,-4 26,-9 10,-9.5" fill="#0369a1" stroke="#38bdf8" strokeWidth="0.6" />

            {/* Radome & Antenna Spire */}
            <circle cx="18" cy="-11" r="3.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.6" />
            <line x1="18" y1="-14" x2="18" y2="-22" stroke="#64748b" strokeWidth="1.2" />

            {/* High-Intensity Red Flashing Aviation Obstruction Beacon */}
            <circle cx="18" cy="-22" r="2.5" fill="#ef4444">
              <animate attributeName="opacity" values="1;0.1;1" dur="1s" repeatCount="indefinite" />
            </circle>

            {/* Illuminated ATC Badge */}
            <rect x="0" y="54" width="36" height="6" rx="1.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" />
            <text x="18" y="59" fill="#38bdf8" fontSize="4.5" fontWeight="bold" textAnchor="middle">DXB TOWER</text>
          </g>
        </g>

        {/* ================================================================== */}
        {/* 7. TERMINAL 1 (SHEIKH RASHID CONCOURSE D & INT'L AIRLINES)         */}
        {/* ================================================================== */}
        <g id="dxb-terminal-1-group" className="cursor-pointer" onClick={() => onTerminalClick?.(1)}>
          {/* T1 Apron Concrete Slab */}
          <polygon points="180,250 560,256 540,325 160,318" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* T1 Concourse Building (Curved Aerodynamic Glass & Steel Vault) */}
          <g transform="translate(200, 240)">
            {/* Building Shadow */}
            <polygon points="0,26 340,32 340,36 0,30" fill="#000000" opacity="0.35" />
            {/* Base Wall Depth */}
            <polygon points="0,18 330,24 330,28 0,22" fill="#0f172a" />
            {/* Main Curved Concourse Roof */}
            <polygon points="4,2 334,8 330,24 0,18" fill="url(#dxbTerminal1Glass)" stroke="#bae6fd" strokeWidth="1" />

            {/* Skylight Bands */}
            {Array.from({ length: 12 }).map((_, i) => (
              <polygon
                key={`t1-sky-${i}`}
                points={`${15 + i * 26},${5 + i * 0.4} ${32 + i * 26},${5.3 + i * 0.4} ${28 + i * 26},${20 + i * 0.4} ${11 + i * 26},${19.7 + i * 0.4}`}
                fill="#0f172a"
                opacity="0.45"
                stroke="#38bdf8"
                strokeWidth="0.6"
              />
            ))}

            {/* Illuminated Marquee Signage */}
            <rect x="80" y="6" width="170" height="10" rx="2" fill="#0f172a" opacity="0.95" stroke="#38bdf8" strokeWidth="0.8" />
            <text x="165" y="13.5" fill="#ffffff" fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="0.6">
              ✈️ DXB TERMINAL 1 • CONCOURSE D
            </text>
          </g>

          {/* Terminal 1 Telescoping Jet Bridges & International Airlines */}
          {[
            { x: 230, y: 265, airline: "BA", tailColor: "#1e3a8a", winglet: "#ef4444" },
            { x: 330, y: 267, airline: "LH", tailColor: "#0f172a", winglet: "#facc15" },
            { x: 430, y: 269, airline: "SQ", tailColor: "#1e1b4b", winglet: "#f59e0b" },
            { x: 510, y: 271, airline: "AF", tailColor: "#1e3a8a", winglet: "#ef4444" },
          ].map((gate, i) => (
            <g key={`t1-gate-${i}`} transform={`translate(${gate.x}, ${gate.y})`}>
              {/* Jet Bridge Arm */}
              <polygon points="0,0 8,0.1 6,18 -2,17.9" fill="#64748b" />
              <polygon points="-4,17.5 12,17.7 10,24 -6,23.8" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />

              {/* Parked International Airliner */}
              <g transform="translate(3, 27) scale(0.72)">
                <ellipse cx="0" cy="20" rx="24" ry="7" fill="#000000" opacity="0.35" />
                <polygon points="0,-20 5,-14 4,22 0,28 -4,22 -5,-14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
                <polygon points="0,-3 30,12 25,14 0,5 -25,14 -30,12" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
                <polygon points="0,17 5,28 -5,28" fill={gate.tailColor} />
                <polygon points="28,10 32,8 30,13" fill={gate.winglet} />
                <polygon points="-28,10 -32,8 -30,13" fill={gate.winglet} />
                <rect x="9" y="3" width="5" height="9" rx="1.5" fill="#d97706" />
                <rect x="-14" y="3" width="5" height="9" rx="1.5" fill="#d97706" />
              </g>
            </g>
          ))}
        </g>

        {/* ================================================================== */}
        {/* 8. TERMINAL 3 (EMIRATES A380 MEGAHUB • CONCOURSES A & B)          */}
        {/* ================================================================== */}
        <g id="dxb-terminal-3-group" className="cursor-pointer" onClick={() => onTerminalClick?.(3)}>
          {/* T3 Apron Heavy-Duty Concrete Slab */}
          <polygon points="560,256 1280,268 1260,345 540,325" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* Terminal 3 Giant Aerofoil Tubular Concourse (1-Kilometer Long Megastructure) */}
          <g transform="translate(580, 246)">
            {/* Drop Shadow */}
            <polygon points="0,32 670,42 670,48 0,38" fill="#000000" opacity="0.45" />
            {/* Front Wall Drop */}
            <polygon points="0,22 660,32 660,38 0,28" fill="#0f172a" />

            {/* Aerodynamic Tubular Glass Roof (The Signature Emirates Blue Aerofoil) */}
            <polygon points="6,2 666,12 660,32 0,22" fill="url(#dxbTerminal3Glass)" stroke="#38bdf8" strokeWidth="1.2" />

            {/* Glazing Rows & Skylight Ribs */}
            {Array.from({ length: 24 }).map((_, i) => (
              <polygon
                key={`t3-sky-${i}`}
                points={`${18 + i * 26},${5 + i * 0.4} ${38 + i * 26},${5.3 + i * 0.4} ${32 + i * 26},${27 + i * 0.4} ${12 + i * 26},${26.7 + i * 0.4}`}
                fill="#0f172a"
                opacity="0.38"
                stroke="#bae6fd"
                strokeWidth="0.6"
              />
            ))}

            {/* Illuminated Mega-Banner Signage */}
            <rect x="180" y="7" width="280" height="12" rx="2.5" fill="#0f172a" opacity="0.95" stroke="#facc15" strokeWidth="1" />
            <text x="320" y="15.5" fill="#ffffff" fontSize="8" fontWeight="900" textAnchor="middle" letterSpacing="0.8">
              ✈️ DXB TERMINAL 3 • EMIRATES MEGAHUB
            </text>
            <text x="320" y="23" fill="#facc15" fontSize="5.5" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
              CONCOURSES A & B • WORLD'S LARGEST A380 TERMINAL
            </text>
          </g>

          {/* Dedicated A380 Multi-Level Double-Decker Jet Bridges & Parked Emirates Jets */}
          {[
            { x: 630, y: 275, type: "A380", gate: "B1", dest: "LHR" },
            { x: 760, y: 278, type: "A380", gate: "B5", dest: "JFK" },
            { x: 890, y: 280, type: "B777", gate: "B9", dest: "SYD" },
            { x: 1020, y: 282, type: "A380", gate: "A2", dest: "CDG" },
            { x: 1150, y: 284, type: "B777", gate: "A6", dest: "HND" },
          ].map((stand, i) => (
            <g key={`t3-gate-${i}`} transform={`translate(${stand.x}, ${stand.y})`}>
              {/* Dual A380 Telescoping Jet Bridges (Upper & Lower Deck) */}
              <polygon points="0,0 12,0.1 9,20 -3,19.9" fill="#64748b" />
              <polygon points="12,0 20,0.1 16,18 8,17.9" fill="#475569" />
              <polygon points="-5,19 22,19.3 18,27 -9,26.7" fill="#94a3b8" stroke="#334155" strokeWidth="0.8" />

              {/* Digital VDGS Gate Sign */}
              <rect x="-8" y="8" width="14" height="6" rx="1" fill="#0f172a" stroke="#22c55e" strokeWidth="0.5" />
              <text x="-1" y="12.5" fill="#22c55e" fontSize="4.5" fontWeight="bold" textAnchor="middle">{stand.gate}</text>

              {/* Parked Emirates Airliner */}
              {stand.type === "A380" ? (
                /* Superjumbo Airbus A380 */
                <g transform="translate(6, 32) scale(0.95)">
                  {/* Giant Ground Shadow */}
                  <ellipse cx="0" cy="24" rx="34" ry="10" fill="#000000" opacity="0.4" />
                  {/* Double-Decker Widebody Fuselage */}
                  <path d="M 0 -28 C 8 -20, 8 22, 0 32 C -8 22, -8 -20, 0 -28 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  {/* Cockpit Window */}
                  <polygon points="-3,-24 3,-24 4,-20 -4,-20" fill="#0f172a" />
                  {/* Massive Swept Wings with Wingtip Fences */}
                  <polygon points="0,-5 42,16 36,19 0,7 -36,19 -42,16" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                  <polygon points="41,13 44,11 43,18" fill="#ef4444" />
                  <polygon points="-41,13 -44,11 -43,18" fill="#ef4444" />
                  {/* 4 Powerful Turbofans (Engine Alliance GP7200) */}
                  <rect x="14" y="6" width="6" height="11" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
                  <ellipse cx="17" cy="17" rx="3" ry="1.5" fill="#d97706" />
                  <rect x="25" y="10" width="6" height="11" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
                  <ellipse cx="28" cy="21" rx="3" ry="1.5" fill="#d97706" />
                  <rect x="-20" y="6" width="6" height="11" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
                  <ellipse cx="-17" cy="17" rx="3" ry="1.5" fill="#d97706" />
                  <rect x="-31" y="10" width="6" height="11" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
                  <ellipse cx="-28" cy="21" rx="3" ry="1.5" fill="#d97706" />
                  {/* Vertical Tailfin with Signature UAE Flag Livery */}
                  <polygon points="0,20 6,34 -6,34" fill="#ef4444" />
                  <polygon points="-4,26 4,26 6,34 -6,34" fill="#15803d" />
                  <polygon points="-3,28 3,28 4,32 -4,32" fill="#ffffff" />
                  <polygon points="-2,30 2,30 3,34 -3,34" fill="#000000" />
                  {/* Golden Emirates Calligraphy Accent */}
                  <line x1="-3" y1="12" x2="3" y2="12" stroke="#eab308" strokeWidth="1" />
                </g>
              ) : (
                /* Long-Range Boeing 777-300ER */
                <g transform="translate(6, 30) scale(0.85)">
                  <ellipse cx="0" cy="22" rx="28" ry="8" fill="#000000" opacity="0.38" />
                  <polygon points="0,-24 6,-16 5,24 0,30 -5,24 -6,-16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.9" />
                  <polygon points="0,-4 36,14 30,16 0,6 -30,16 -36,14" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.9" />
                  <rect x="11" y="4" width="7" height="12" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
                  <ellipse cx="14.5" cy="16" rx="3.5" ry="1.5" fill="#d97706" />
                  <rect x="-18" y="4" width="7" height="12" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
                  <ellipse cx="-14.5" cy="16" rx="3.5" ry="1.5" fill="#d97706" />
                  <polygon points="0,18 5,30 -5,30" fill="#ef4444" />
                </g>
              )}
            </g>
          ))}
        </g>

        {/* ================================================================== */}
        {/* 9. DUBAI METRO RED LINE ELEVATED VIADUCT & AIRPORT STATIONS        */}
        {/* ================================================================== */}
        <g id="dxb-metro-viaduct" transform="translate(0, 340)">
          {/* Elevated Concrete Viaduct Piers & Deck */}
          <line x1="140" y1="0" x2="1260" y2="18" stroke="#334155" strokeWidth="6" />
          <line x1="140" y1="0" x2="1260" y2="18" stroke="#64748b" strokeWidth="2.5" />
          {/* Support Columns */}
          {Array.from({ length: 14 }).map((_, i) => (
            <line
              key={`metro-col-${i}`}
              x1={180 + i * 80}
              y1={i * 1.3}
              x2={180 + i * 80}
              y2={16 + i * 1.3}
              stroke="#475569"
              strokeWidth="3.5"
            />
          ))}

          {/* Airport Terminal 1 Metro Station Pod (Gold Aerodynamic Shell) */}
          <g transform="translate(360, -6)">
            <ellipse cx="30" cy="5" rx="34" ry="10" fill="url(#dxbMetroGold)" stroke="#a16207" strokeWidth="1" />
            <ellipse cx="30" cy="5" rx="26" ry="6" fill="#0f172a" opacity="0.85" />
            <text x="30" y="7.5" fill="#fef08a" fontSize="5" fontWeight="bold" textAnchor="middle">METRO T1</text>
          </g>

          {/* Airport Terminal 3 Metro Station Pod (Gold Aerodynamic Shell) */}
          <g transform="translate(860, 2)">
            <ellipse cx="34" cy="5" rx="38" ry="11" fill="url(#dxbMetroGold)" stroke="#a16207" strokeWidth="1" />
            <ellipse cx="34" cy="5" rx="30" ry="7" fill="#0f172a" opacity="0.85" />
            <text x="34" y="7.5" fill="#fef08a" fontSize="5.5" fontWeight="bold" textAnchor="middle">METRO T3</text>
          </g>

          {/* Dubai Metro Red Line Train Gliding along Track */}
          <g transform="translate(560, -1)">
            {/* 5-Car Metro Train */}
            <rect x="0" y="-3" width="70" height="5.5" rx="2" fill="#e2e8f0" stroke="#0284c7" strokeWidth="0.8" />
            {/* Red Stripe */}
            <line x1="2" y1="-0.5" x2="68" y2="-0.5" stroke="#ef4444" strokeWidth="1.2" />
            {/* Windows */}
            {Array.from({ length: 10 }).map((_, i) => (
              <rect key={`mt-win-${i}`} x={4 + i * 6.5} y="-2" width="4" height="2" fill="#0f172a" />
            ))}
          </g>
        </g>

        {/* ================================================================== */}
        {/* 10. SOUTHERN RUNWAY 12R / 30L (4,450 m Main Arrival Runway)        */}
        {/* ================================================================== */}
        <g id="dxb-runway-12r-30l">
          {/* Main Asphalt Strip */}
          <polygon
            points="110,380 1260,398 1248,418 98,400"
            fill="url(#dxbAsphaltDark)"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Touchdown Zone Skid Marks */}
          <polygon points="260,383 450,386 440,414 250,411" fill="#000000" opacity="0.5" />
          <polygon points="960,395 1150,398 1140,417 950,414" fill="#000000" opacity="0.5" />

          {/* Left Threshold Piano Keys (12R) */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`pk-12r-${i}`}
              x1={125 - i * 0.6}
              y1={385 + i * 3.8}
              x2={145 - i * 0.6}
              y2={385 + i * 3.8 + 0.3}
              stroke="#ffffff"
              strokeWidth="2.5"
            />
          ))}
          <text x="158" y="405" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="monospace">12R</text>

          {/* Right Threshold Piano Keys (30L) */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`pk-30l-${i}`}
              x1={1210 - i * 0.6}
              y1={402 + i * 3.8}
              x2={1230 - i * 0.6}
              y2={402 + i * 3.8 + 0.3}
              stroke="#ffffff"
              strokeWidth="2.5"
            />
          ))}
          <text x="1185" y="419" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="monospace">30L</text>

          {/* Aiming Points */}
          <polygon points="320,384 370,385 368,394 318,393" fill="#ffffff" />
          <polygon points="314,405 364,406 362,415 312,414" fill="#ffffff" />

          {/* Runway Centerline */}
          <line x1="190" y1="400" x2="1160" y2="416" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="22 14" />

          {/* Runway Edge Lighting */}
          {Array.from({ length: 24 }).map((_, i) => {
            const t = i / 23;
            const tx = 115 + t * (1255 - 115);
            const ty = 381 + t * (399 - 381);
            const bx = 103 + t * (1243 - 103);
            const by = 401 + t * (419 - 401);
            const isAmber = i < 3 || i > 20;
            return (
              <g key={`rw2-light-${i}`}>
                <circle cx={tx} cy={ty} r="1.5" fill={isAmber ? "#facc15" : "#ffffff"} />
                <circle cx={bx} cy={by} r="1.5" fill={isAmber ? "#facc15" : "#ffffff"} />
              </g>
            );
          })}

          {/* Threshold Green Lights */}
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={`th-g-${i}`} cx={113 - i * 0.6} cy={387 + i * 5} r="2.2" fill="#22c55e" />
          ))}
          {/* End Red Lights */}
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={`th-r-${i}`} cx={1245 - i * 0.6} cy={404 + i * 5} r="2.2" fill="#ef4444" />
          ))}

          {/* Approach Lighting System (ALS) with Sequenced Flashing Strobes */}
          {[-60, -40, -20, 0].map((offset, i) => (
            <g key={`als-${i}`} transform={`translate(${70 + offset}, 398)`}>
              <line x1="0" y1="-7" x2="0" y2="7" stroke="#cbd5e1" strokeWidth="1" />
              <circle cx="0" cy="0" r="2.2" fill="#ffffff">
                <animate attributeName="opacity" values="0.2;1;0.2" dur="0.8s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}

          {/* Touchdown Tire Smoke Effect */}
          <g transform="translate(340, 396)">
            <ellipse cx="0" cy="0" rx="4" ry="2" fill="#f8fafc" opacity="0">
              <animate attributeName="rx" values="3;22;30;3" dur="12s" repeatCount="indefinite" keyTimes="0;0.34;0.42;1" />
              <animate attributeName="ry" values="1.5;10;14;1.5" dur="12s" repeatCount="indefinite" keyTimes="0;0.34;0.42;1" />
              <animate attributeName="opacity" values="0;0.85;0;0" dur="12s" repeatCount="indefinite" keyTimes="0;0.34;0.44;1" />
            </ellipse>
          </g>
        </g>

        {/* ================================================================== */}
        {/* 11. ANIMATED EMIRATES WIDEBODY AIRLINER LANDING ON RUNWAY 12R      */}
        {/* ================================================================== */}
        {/* Dynamic Ground Shadow */}
        <g>
          <animateMotion dur="12s" repeatCount="indefinite" rotate="auto" keyTimes="0;0.33;0.75;1" keyPoints="0;0.33;0.75;1">
            <mpath href="#dxb-landing-shadow-path" />
          </animateMotion>
          <ellipse cx="0" cy="0" rx="34" ry="9" fill="url(#dxbPlaneShadow)">
            <animate attributeName="rx" values="18;34;32;18" dur="12s" repeatCount="indefinite" keyTimes="0;0.33;0.75;1" />
            <animate attributeName="opacity" values="0.2;0.7;0.6;0.1" dur="12s" repeatCount="indefinite" keyTimes="0;0.33;0.75;1" />
          </ellipse>
        </g>

        {/* The Landing Emirates A380 Aircraft Body */}
        <g>
          <animateMotion dur="12s" repeatCount="indefinite" rotate="auto" keyTimes="0;0.33;0.75;1" keyPoints="0;0.33;0.75;1">
            <mpath href="#dxb-landing-glide-path" />
          </animateMotion>
          <g transform="scale(1.2)">
            {/* Fuselage */}
            <path d="M 32 0 C 30 -6, 12 -7, -26 -6 C -38 -5, -42 -2, -44 0 C -42 2, -38 5, -26 6 C 12 7, 30 6, 32 0 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            {/* Cockpit Glass */}
            <path d="M 27 -2 L 30 0 L 27 2 L 25 1.8 L 25 -1.8 Z" fill="#0f172a" />
            {/* Swept Main Wings */}
            <path d="M 8 -3 L -12 -38 L -18 -38 L -9 -3 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
            <path d="M 8 3 L -12 38 L -18 38 L -9 3 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
            {/* Wingtip Fences (Emirates Red) */}
            <polygon points="-12,-38 -16,-41 -18,-38" fill="#ef4444" />
            <polygon points="-12,38 -16,41 -18,38" fill="#ef4444" />
            {/* Under-Wing Turbofans */}
            <rect x="-3" y="-20" width="14" height="6" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
            <ellipse cx="11" cy="-17" rx="1.5" ry="3" fill="#d97706" />
            <rect x="-3" y="14" width="14" height="6" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
            <ellipse cx="11" cy="17" rx="1.5" ry="3" fill="#d97706" />
            {/* Tail Stabilizers */}
            <polygon points="-30,-2 -42,-16 -45,-16 -37,-2" fill="#e2e8f0" />
            <polygon points="-30,2 -42,16 -45,16 -37,2" fill="#e2e8f0" />
            {/* Tailfin with UAE Flag */}
            <path d="M -30 0 L -44 -2 L -46 0 L -44 2 Z" fill="#ef4444" />
            <polygon points="-32,0 -44,-1.2 -44,1.2" fill="#15803d" />
            <polygon points="-34,0 -44,-0.6 -44,0.6" fill="#f59e0b" />
            {/* Navigation Lights (Port Red, Starboard Green, Anti-Collision Strobes) */}
            <circle cx="-15" cy="-39" r="2" fill="#ef4444">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="-15" cy="39" r="2" fill="#22c55e">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="-16" cy="-39" r="3" fill="#ffffff" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" keyTimes="0;0.1;1" />
            </circle>
            <circle cx="-16" cy="39" r="3" fill="#ffffff" opacity="0">
              <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" keyTimes="0;0.1;1" />
            </circle>
          </g>
        </g>

        {/* ================================================================== */}
        {/* 12. LANDSIDE AIRPORT ROAD (AL MATAR ST) & DUBAI TAXIS CURBSIDE     */}
        {/* ================================================================== */}
        <g id="dxb-airport-road" transform="translate(0, 420)">
          {/* Main Highway Tarmac Strip */}
          <polygon points="20,0 1260,18 1250,26 10,8" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
          <line x1="30" y1="4" x2="1250" y2="21" stroke="#ffffff" strokeWidth="1" strokeDasharray="14 10" opacity="0.6" />

          {/* Palm Trees along Median */}
          {Array.from({ length: 16 }).map((_, i) => (
            <g key={`palm-rd-${i}`} transform={`translate(${50 + i * 76}, ${2 + i * 1.1})`}>
              <ellipse cx="0" cy="2" rx="4" ry="2" fill="#14231a" />
              <line x1="0" y1="2" x2="0" y2="-6" stroke="#78350f" strokeWidth="1.2" />
              <circle cx="0" cy="-6" r="4.5" fill="#15803d" opacity="0.9" />
            </g>
          ))}

          {/* Dubai Taxis (Cream with Signature Red Roof) */}
          {[120, 260, 450, 680, 890].map((txX, i) => (
            <g key={`taxi-${i}`} transform={`translate(${txX}, ${3 + i * 0.4})`}>
              {/* Car Body */}
              <polygon points="0,0 14,0.2 12,5 -2,4.8" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
              {/* Red Roof */}
              <polygon points="3,-1 11,-0.8 9,2 1,1.8" fill="#ef4444" />
              {/* Yellow Taxi Sign */}
              <rect x="5" y="-2.5" width="4" height="1.5" rx="0.5" fill="#facc15" />
            </g>
          ))}
        </g>
      </g>

      {/* ==================================================================== */}
      {/* 13. ARCHITECTURAL AIRPORT BADGE (Bottom-Left Corner)                 */}
      {/* ==================================================================== */}
      <g transform="translate(30, 385)">
        <polygon points="0,0 340,5.8 336,36 -4,30.2" fill="#0f172a" opacity="0.92" stroke="#38bdf8" strokeWidth="1.2" />
        <circle cx="18" cy="18" r="7" fill="#22c55e" />
        <text x="32" y="16" fill="#ffffff" fontSize="11" fontWeight="900" letterSpacing="0.8">
          ✈️ {name.toUpperCase()}
        </text>
        <text x="32" y="27" fill="#38bdf8" fontSize="7.5" fontWeight="bold" letterSpacing="0.5">
          TERMINALS 1, 2 & 3 • DUAL RUNWAYS 12L/30R & 12R/30L
        </text>
      </g>
    </svg>
  );
};
