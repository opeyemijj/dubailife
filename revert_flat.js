const fs = require('fs');

const code = `
import React from 'react';

export const isoToScreen = (gx: number, gy: number, originX = 150, originY = 80) => ({
  x: originX + (gx - gy) * 0.866,
  y: originY + (gx + gy) * 0.5
});

export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 2600;

export const EstateBase = ({ name }: { name: string }) => (
  <svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" fill="#22c55e" rx="8" />
    <text x="50" y="50" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">{name}</text>
  </svg>
);

export const ClickableHouseNew = () => <rect width="100" height="100" fill="#fcd34d" rx="4" />;
export const ApartmentBuildingIconNew = () => <rect width="100" height="100" fill="#60a5fa" rx="4" />;
export const RooftopIconNew = () => <circle cx="50" cy="50" r="40" fill="#ef4444" />;
export const NightclubIconNew = () => <rect width="100" height="100" fill="#9333ea" rx="20" />;
export const RestaurantIconNew = () => <rect width="100" height="100" fill="#f97316" rx="4" />;
export const EstateCommunityBlock = ({ name }: { name: string }) => <EstateBase name={name} />;

export const SmallHouseIcon = () => (
  <svg viewBox="0 0 40 40" width="100%" height="100%">
    <rect x="5" y="10" width="30" height="25" fill="#fcd34d" rx="2" />
    <polygon points="5,10 20,0 35,10" fill="#ef4444" />
  </svg>
);

export const StadiumIcon = () => <circle cx="50" cy="50" r="40" fill="#3b82f6" />;
export const HospitalIcon = () => <rect width="100" height="100" fill="#ef4444" rx="10" />;
export const SchoolIcon = () => <rect width="100" height="100" fill="#eab308" rx="10" />;
export const CasinoIcon = () => <rect width="100" height="100" fill="#8b5cf6" rx="10" />;
export const ParkIcon = () => <rect width="100" height="100" fill="#22c55e" rx="10" />;

export const BurjKhalifaIcon = () => (
  <svg viewBox="0 0 100 150" width="100%" height="100%" className="drop-shadow-lg z-30 hover:scale-110 transition-transform cursor-pointer">
    <polygon points="50,10 70,140 30,140" fill="#94a3b8" />
    <polygon points="50,10 60,140 40,140" fill="#cbd5e1" />
  </svg>
);

export const BulgariIslandIcon = () => <circle cx="50" cy="50" r="40" fill="#0ea5e9" />;
export const AtlantisTheRoyalIcon = () => <rect width="100" height="100" fill="#3b82f6" rx="10" />;
export const BeachClubIconNew = () => <rect width="100" height="100" fill="#06b6d4" rx="10" />;

export const JumeirahBeachHotelIcon = () => (
  <svg viewBox="0 0 100 100" width="100%" height="100%">
    <path d="M 10 90 Q 50 10 90 90 Z" fill="#3b82f6" />
  </svg>
);

export const BurjAlArabIcon = () => (
  <svg viewBox="0 0 100 150" width="100%" height="100%" className="drop-shadow-lg z-30 hover:scale-110 transition-transform cursor-pointer">
    <path d="M 20 140 Q 50 10 80 140 Z" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" />
    <rect x="70" y="20" width="10" height="120" fill="#94a3b8" />
  </svg>
);

export const MuseumOfTheFutureIcon = () => (
  <svg viewBox="0 0 100 100" width="100%" height="100%" className="drop-shadow-lg z-30 hover:scale-110 transition-transform cursor-pointer">
    <ellipse cx="50" cy="50" rx="40" ry="25" fill="none" stroke="#94a3b8" strokeWidth="15" />
    <ellipse cx="50" cy="50" rx="40" ry="25" fill="none" stroke="#cbd5e1" strokeWidth="5" />
  </svg>
);

export const MuseumOfFutureIcon = MuseumOfTheFutureIcon;

export const DubaiFrameIcon = () => (
  <svg viewBox="0 0 100 120" width="100%" height="100%" className="drop-shadow-lg z-30 hover:scale-110 transition-transform cursor-pointer">
    <rect x="20" y="20" width="60" height="90" fill="none" stroke="#fcd34d" strokeWidth="15" />
    <rect x="25" y="25" width="50" height="80" fill="none" stroke="#fbbf24" strokeWidth="5" />
  </svg>
);

export const AtlantisIcon = () => <rect width="100" height="100" fill="#f43f5e" rx="10" />;
export const EmiratesTowersIcon = () => <rect width="100" height="100" fill="#94a3b8" rx="10" />;
export const GevoraIcon = () => <rect width="100" height="100" fill="#fbbf24" rx="10" />;
export const RoseRayhaanIcon = () => <rect width="100" height="100" fill="#60a5fa" rx="10" />;
export const DWTCIcon = () => <rect width="100" height="100" fill="#475569" rx="10" />;
export const SalikGate = () => <rect width="100" height="50" fill="#ef4444" rx="10" />;

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

export const AirportBlock = () => (
  <svg viewBox="0 0 400 300" width="100%" height="100%" className="drop-shadow-2xl z-20 hover:scale-105 transition-transform">
    <rect width="400" height="300" fill="#94a3b8" rx="20" />
    <rect x="50" y="50" width="300" height="40" fill="#334155" />
    <rect x="50" y="150" width="300" height="40" fill="#334155" />
    <text x="200" y="130" fill="#ffffff" fontSize="30" fontWeight="bold" textAnchor="middle">DXB AIRPORT</text>
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
    <svg viewBox={\`0 0 \${w} \${h}\`} style={{ width: \`\${w}px\`, height: \`\${h}px\` }} className="drop-shadow-xl hover:scale-105 transition-transform z-20">
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

export const PalmCommunityBlock = () => (
  <svg viewBox="0 0 300 300" width="100%" height="100%" className="drop-shadow-2xl z-20 hover:scale-105 transition-transform">
    <circle cx="150" cy="150" r="140" fill="none" stroke="#22c55e" strokeWidth="20" />
    <path d="M 150 150 L 150 280" stroke="#d97706" strokeWidth="30" strokeLinecap="round" />
    <path d="M 40 100 Q 150 150 260 100" stroke="#22c55e" strokeWidth="20" strokeLinecap="round" />
    <path d="M 50 150 Q 150 170 250 150" stroke="#22c55e" strokeWidth="20" strokeLinecap="round" />
    <path d="M 70 200 Q 150 200 230 200" stroke="#22c55e" strokeWidth="20" strokeLinecap="round" />
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
  <svg viewBox="0 0 100 100" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="z-10" preserveAspectRatio="none">
    <rect x="20" y="0" width="60" height="100" fill="#334155" />
    <rect x="25" y="0" width="50" height="100" fill="#475569" />
  </svg>
);

export const DynamicCommunityBlock = ({ name = "Community", width = 400, height = 300, color = "#bbf7d0", rows = 4, cols = 6, buildingType = "small-house" }: any) => {
  const cellW = (width - 20) / cols;
  const cellH = (height - 40) / rows;
  const units = [];
  for(let r=0; r<rows; r++) {
    for(let c=0; c<cols; c++) {
      units.push({ c, r, x: 10 + c*cellW, y: 30 + r*cellH });
    }
  }
  return (
    <svg viewBox={\`0 0 \${width} \${height}\`} style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-xl hover:scale-105 transition-transform z-20">
      <rect x="0" y="0" width={width} height={height} fill={color} rx="10" />
      <rect x="0" y="0" width={width} height="25" fill="rgba(0,0,0,0.1)" rx="10" />
      {name && <text x={width/2} y={17} fill="#475569" fontSize="14" fontWeight="bold" textAnchor="middle">{name.toUpperCase()}</text>}
      {units.map((u, i) => (
        <rect key={i} x={u.x + cellW*0.1} y={u.y + cellH*0.1} width={cellW*0.8} height={cellH*0.8} fill={buildingType === 'apartment' ? "#64748b" : (buildingType === 'skyscraper' ? "#0284c7" : "#d6d3d1")} rx="2" />
      ))}
    </svg>
  );
};

export const MarinaBlock = ({ name = "Marina", width = 400, height = 200 }: any) => (
  <svg viewBox="0 0 400 200" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl hover:scale-105 transition-transform z-20">
    <rect width="400" height="200" fill="#0ea5e9" rx="10" />
    <rect width="400" height="25" fill="#0284c7" rx="10" />
    <text x="200" y="17" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">{name.toUpperCase()}</text>
    <rect x="20" y="50" width="20" height="120" fill="#d97706" />
    <rect x="100" y="50" width="20" height="120" fill="#d97706" />
    <rect x="45" y="80" width="50" height="20" fill="#ffffff" rx="10" />
    <rect x="45" y="120" width="40" height="15" fill="#f8fafc" rx="10" />
  </svg>
);

export const RoadPathBlock = ({ pathData, color = "#64748b", width = 10, isDashed = false }: any) => (
  <svg viewBox="0 0 4000 2600" className="w-[4000px] h-[2600px] pointer-events-none absolute inset-0 z-0 overflow-visible">
    <path d={pathData} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={isDashed ? "15 15" : "none"} className="pointer-events-auto cursor-pointer" />
  </svg>
);

export const MallBlock = ({ width = 250, height = 200 }: any) => (
  <svg viewBox="0 0 250 200" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl hover:scale-105 transition-transform z-30">
    <rect width="250" height="200" fill="#cbd5e1" rx="10" />
    <rect width="250" height="30" fill="#94a3b8" rx="10" />
    <text x="125" y="20" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">SHOPPING MALL</text>
    <rect x="25" y="50" width="200" height="120" fill="#e2e8f0" rx="4" />
  </svg>
);

export const HotelBlock = ({ width = 200, height = 200 }: any) => (
  <svg viewBox="0 0 200 200" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl hover:scale-105 transition-transform z-30">
    <rect width="200" height="200" fill="#84cc6d" rx="10" />
    <rect width="200" height="30" fill="#4ade80" rx="10" />
    <text x="100" y="20" fill="#14532d" fontSize="14" fontWeight="bold" textAnchor="middle">RESORT</text>
    <circle cx="100" cy="120" r="40" fill="#38bdf8" />
    <rect x="20" y="50" width="160" height="30" fill="#fbbf24" rx="4" />
  </svg>
);

export const GiantBillboardBlock = ({ width = 150, height = 100, text1 = "yad", text2 = "sale", color1 = "#064e3b", color2 = "#16a34a" }: any) => (
  <svg viewBox="0 0 150 100" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30">
    <rect x="0" y="0" width="150" height="100" fill="#1e293b" rx="4" />
    <rect x="5" y="5" width="70" height="90" fill={color1} rx="2" />
    <text x="40" y="55" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">{text1.toUpperCase()}</text>
    <rect x="75" y="5" width="70" height="90" fill={color2} rx="2" />
    <text x="110" y="55" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">{text2.toUpperCase()}</text>
  </svg>
);

export const SimpleBuilding = ({ x=0, y=0, w, h, dX = 15, dY = -20, fColor = "#94a3b8", rColor = "#64748b", tColor = "#cbd5e1" }: any) => (
  <g transform={\`translate(\${x}, \${y})\`}>
    <polygon points={\`\${w},0 \${w+dX},\${dY} \${w+dX},\${dY+h} \${w},\${h}\`} fill={rColor} stroke="#475569" strokeWidth="0.5" />
    <polygon points={\`0,0 \${dX},\${dY} \${w+dX},\${dY} \${w},0\`} fill={tColor} stroke="#94a3b8" strokeWidth="0.5" />
    <rect x="0" y="0" width={w} height={h} fill={fColor} stroke="#64748b" strokeWidth="0.5" />
  </g>
);

export const SimpleBase = ({ w, h, color = "#84cc6d", thickColor = "#4ade80", rightColor = "#22c55e", name = "" }: any) => (
  <g>
    <polygon points={\`0,\${h} \${w},\${h} \${w+10},\${h+10} 10,\${h+10}\`} fill={thickColor} />
    <polygon points={\`\${w},0 \${w+10},10 \${w+10},\${h+10} \${w},\${h}\`} fill={rightColor} />
    <rect x="0" y="0" width={w} height={h} fill={color} stroke="#ffffff" strokeWidth="2" />
    {name && <text x={w/2} y={h - 15} fill="rgba(0,0,0,0.5)" fontSize="14" fontWeight="bold" textAnchor="middle">{name.toUpperCase()}</text>}
  </g>
);

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
  const handleUnitClick = (e: any, unitId: string, unitName: string) => {
    if (onUnitClick) {
      e.stopPropagation();
      onUnitClick(unitId, unitName);
    }
  };

  const buildings = Array.from({length: Math.min(numBuildings, 12)}).map((_, i) => {
    const bW = 45;
    const spacing = 20;
    const totalW = (bW + spacing) * numBuildings;
    const startX = (300 - totalW) / 2;
    const x = startX + i * (bW + spacing);
    const h = 50 + (i % 3) * 30; // 50, 80, 110...
    return { id: \`unit-\${i+1}\`, name: \`Unit \${i+1}\`, x, y: 100, w: bW, h };
  });

  return (
    <svg viewBox="0 0 300 300" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30">
      <SimpleBase w={290} h={260} color="#84cc6d" thickColor="#4ade80" rightColor="#22c55e" name={name} />
      
      {hasPool && (
        <g transform="translate(150, 150)">
           <rect x="0" y="0" width="120" height="70" fill="#e2e8f0" />
           <rect x="10" y="10" width="100" height="50" fill="#38bdf8" />
           <circle cx="30" cy="80" r="12" fill="#ef4444" />
           <circle cx="60" cy="80" r="12" fill="#eab308" />
           <circle cx="90" cy="80" r="12" fill="#3b82f6" />
        </g>
      )}

      {hasParking && (
        <g transform="translate(10, 180)">
           <rect x="0" y="0" width="80" height="70" fill="#475569" />
           <rect x="5" y="10" width="20" height="40" fill="#f8fafc" />
           <rect x="30" y="10" width="20" height="40" fill="#0f172a" />
           <rect x="55" y="10" width="20" height="40" fill="#3b82f6" />
        </g>
      )}

      {hasCourt && (
        <g transform="translate(160, 20)">
           <rect x="0" y="0" width="100" height="60" fill="#c2410c" />
           <rect x="5" y="5" width="90" height="50" fill="#22c55e" />
           <rect x="49" y="5" width="2" height="50" fill="#ffffff" />
        </g>
      )}

      {/* Trees */}
      <polygon points="120,180 140,150 160,180" fill="#15803d" />
      <polygon points="125,185 140,160 155,185" fill="#16a34a" />
      
      <polygon points="250,180 270,150 290,180" fill="#15803d" />
      <polygon points="255,185 270,160 285,185" fill="#16a34a" />

      {buildings.map((b) => (
        <g key={b.id} onClick={(e) => handleUnitClick(e, b.id, b.name)} className={onUnitClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}>
          <SimpleBuilding 
            x={b.x} y={b.y - b.h} 
            w={b.w} h={b.h} dX={15} dY={-15} 
            fColor={color} rColor="#64748b" tColor="#1e293b" 
          />
        </g>
      ))}
    </svg>
  );
};

export const ApartmentComplexBlock = ({ width = 250, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 300 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform z-30">
      <SimpleBase w={280} h={230} color="#22c55e" thickColor="#166534" rightColor="#15803d" name="UNIVERSITY APTS" />
      <ellipse cx="140" cy="150" rx="80" ry="40" fill="none" stroke="#ea580c" strokeWidth="6" />
      <ellipse cx="140" cy="150" rx="76" ry="36" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="4,4" />
      
      <SimpleBuilding x={40} y={100-60} w={40} h={60} fColor="#94a3b8" rColor="#64748b" tColor="#ef4444" />
      <SimpleBuilding x={110} y={100-60} w={40} h={60} fColor="#94a3b8" rColor="#64748b" tColor="#ef4444" />
      <SimpleBuilding x={180} y={100-60} w={40} h={60} fColor="#94a3b8" rColor="#64748b" tColor="#ef4444" />
      
      <SimpleBuilding x={70} y={200-30} w={30} h={30} fColor="#cbd5e1" rColor="#94a3b8" tColor="#ef4444" />
      <SimpleBuilding x={130} y={200-30} w={30} h={30} fColor="#cbd5e1" rColor="#94a3b8" tColor="#ef4444" />
    </svg>
  );
};

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

export const getBuildingSprite = (id: string, type: string, seed?: number, title?: string, loc?: any, onUnitClick?: any) => {
  if (type === 'hotel') return <HotelBlock width={loc?.width} height={loc?.height} />;
  if (type === 'mall') return <MallBlock width={loc?.width} height={loc?.height} />;
  if (type === 'museum-future') return <MuseumOfFutureIcon />;
  if (type === 'apartment-complex') return <ApartmentComplexBlock width={loc?.width} height={loc?.height} />;
  if (type === 'configurable-apartment') return <ConfigurableApartmentBlock width={loc?.width} height={loc?.height} hasPool={loc?.hasPool} hasParking={loc?.hasParking} hasCourt={loc?.hasCourt} numBuildings={loc?.numBuildings} color={loc?.color} name={loc?.name} onUnitClick={onUnitClick} />;
  if (type === 'giant-billboard') return <GiantBillboardBlock width={loc?.width} height={loc?.height} text1={loc?.text1} text2={loc?.text2} color1={loc?.color1} color2={loc?.color2} />;
  if (type === 'marina') return <MarinaBlock name={title} width={loc?.width} height={loc?.height} />;
  if (type === 'road-path') return <RoadPathBlock pathData={loc?.pathData} color={loc?.color} width={loc?.width} isDashed={loc?.isDashed} />;
  if (type === 'bridge') return <BridgeBlock width={loc?.width} height={loc?.height} />;
  if (type === 'dynamic-community') return <DynamicCommunityBlock name={title} width={loc?.width} height={loc?.height} color={loc?.color} rows={loc?.rows} cols={loc?.cols} buildingType={loc?.buildingType} />;
  if (type === 'billboard') return <BillboardSpace seed={seed || 0} />;
  if (type === 'airport') return <AirportBlock />;
  if (type === 'community-emirates-hills') return <EmiratesHillsBlock />;
  if (type === 'community-jbr') return <JBRBlock />;
  if (type === 'community-bluewaters') return <BluewatersBlock />;
  if (type === 'community-ranches') return <ArabianRanchesBlock />;
  if (type === 'community-palm') return <PalmCommunityBlock />;
  if (type === 'community-motor-city') return <MotorCityBlock />;
  if (type === 'community-deira') return <DeiraBlock />;
  if (type === 'community-business-bay') return <BusinessBayBlock />;
  if (type === 'generic-district') return <GenericNeighborhood name={title || "District"} seed={seed || 0} />;
  if (type === 'burj-khalifa') return <BurjKhalifaIcon />;
  if (type === 'burj-al-arab') return <BurjAlArabIcon />;
  if (type === 'dubai-frame') return <DubaiFrameIcon />;
  return <GenericNeighborhood name={title || "District"} seed={seed || 0} />;
};
`;

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Reverted to flat 2D style globally!");
