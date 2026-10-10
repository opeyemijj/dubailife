const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

code = code.replace(
  /if \(type === 'configurable-apartment'\) return <ConfigurableApartmentBlock width=\{loc\?\.width\} height=\{loc\?\.height\} hasPool=\{loc\?\.hasPool\} hasParking=\{loc\?\.hasParking\} hasCourt=\{loc\?\.hasCourt\} onUnitClick=\{onUnitClick\} \/>;/,
  "if (type === 'configurable-apartment') return <ConfigurableApartmentBlock width={loc?.width} height={loc?.height} hasPool={loc?.hasPool} hasParking={loc?.hasParking} hasCourt={loc?.hasCourt} numBuildings={loc?.numBuildings} color={loc?.color} name={loc?.name} onUnitClick={onUnitClick} />;"
);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Updated getBuildingSprite mapping");
