const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const missingCode = `
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

export const ApartmentComplexBlock = ({ width = 250, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 300 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
      <g transform="translate(150, 120)">
        <IsoBase width={220} height={220} color="#22c55e" edgeLeft="#166534" edgeRight="#14532d" name="UNIVERSITY APTS" />
        <ellipse cx="0" cy="15" rx="50" ry="25" fill="none" stroke="#ea580c" strokeWidth="4" />
        <ellipse cx="0" cy="15" rx="46" ry="23" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="2,2" />
        
        <IsoBox x={-40} y={-20} w={20} d={20} h={40} colorLeft="#94a3b8" colorRight="#f8fafc" colorTop="#ef4444" />
        <IsoBox x={40} y={-20} w={20} d={20} h={40} colorLeft="#94a3b8" colorRight="#f8fafc" colorTop="#ef4444" />
        <IsoBox x={-60} y={10} w={15} d={15} h={30} colorLeft="#94a3b8" colorRight="#f8fafc" colorTop="#ef4444" />
        <IsoBox x={60} y={10} w={15} d={15} h={30} colorLeft="#94a3b8" colorRight="#f8fafc" colorTop="#ef4444" />
      </g>
    </svg>
  );
};

export const getBuildingSprite = (id: string, type: string, seed?: number, title?: string, loc?: any, onUnitClick?: any) => {
  if (type === 'hotel') return <HotelBlock width={loc?.width} height={loc?.height} />;
  if (type === 'mall') return <MallBlock width={loc?.width} height={loc?.height} />;
  if (type === 'museum-future') return <MuseumOfFutureIcon width={loc?.width} height={loc?.height} />;
  if (type === 'apartment-complex') return <ApartmentComplexBlock width={loc?.width} height={loc?.height} />;
  if (type === 'configurable-apartment') return <ConfigurableApartmentBlock width={loc?.width} height={loc?.height} hasPool={loc?.hasPool} hasParking={loc?.hasParking} hasCourt={loc?.hasCourt} numBuildings={loc?.numBuildings} color={loc?.color} name={loc?.name} onUnitClick={onUnitClick} />;
  if (type === 'giant-billboard') return <GiantBillboardBlock width={loc?.width} height={loc?.height} text1={loc?.text1} text2={loc?.text2} color1={loc?.color1} color2={loc?.color2} />;
  if (type === 'marina') return <MarinaBlock name={title} width={loc?.width} height={loc?.height} />;
  if (type === 'road-path') return <RoadPathBlock pathData={loc?.pathData} color={loc?.color} width={loc?.width} isDashed={loc?.isDashed} />;
  if (type === 'bridge') return <BridgeBlock name={title} width={loc?.width} height={loc?.height} />;
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

if (!code.includes('export const getBuildingSprite')) {
  fs.writeFileSync('src/components/map/Icons.tsx', code + '\n' + missingCode);
  console.log("Restored missing components");
} else {
  console.log("Already present");
}
