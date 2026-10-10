const fs = require('fs');

let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Ensure all new types are in getBuildingSprite
const additions = `
  if (type === 'hotel') return <HotelBlock width={loc?.width} height={loc?.height} />;
  if (type === 'mall') return <MallBlock width={loc?.width} height={loc?.height} />;
  if (type === 'museum-future') return <MuseumOfFutureIcon width={loc?.width} height={loc?.height} />;
  if (type === 'apartment-complex') return <ApartmentComplexBlock width={loc?.width} height={loc?.height} />;
  if (type === 'configurable-apartment') return <ConfigurableApartmentBlock width={loc?.width} height={loc?.height} hasPool={loc?.hasPool} hasParking={loc?.hasParking} hasCourt={loc?.hasCourt} onUnitClick={onUnitClick} />;
  if (type === 'giant-billboard') return <GiantBillboardBlock width={loc?.width} height={loc?.height} text1={loc?.text1} text2={loc?.text2} color1={loc?.color1} color2={loc?.color2} />;
  if (type === 'marina') return <MarinaBlock name={title} width={loc?.width} height={loc?.height} />;
  if (type === 'road-path') return <RoadPathBlock pathData={loc?.pathData} color={loc?.color} width={loc?.width} isDashed={loc?.isDashed} />;
  if (type === 'bridge') return <BridgeBlock name={title} width={loc?.width} height={loc?.height} />;
  if (type === 'dynamic-community') return <DynamicCommunityBlock name={title} width={loc?.width} height={loc?.height} color={loc?.color} rows={loc?.rows} cols={loc?.cols} buildingType={loc?.buildingType} />;
`;

code = code.replace(
  /if \(type === 'billboard'\) return <BillboardSpace seed=\{seed \|\| 0\} \/>;/,
  "if (type === 'billboard') return <BillboardSpace seed={seed || 0} />;\n" + additions
);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed getBuildingSprite with all new types");
