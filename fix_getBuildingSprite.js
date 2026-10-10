const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Update signature
code = code.replace(
  /export const getBuildingSprite = \(id: string, type: string, seed\?: number, title\?: string\) => \{/,
  "export const getBuildingSprite = (id: string, type: string, seed?: number, title?: string, loc?: any, onUnitClick?: any) => {"
);

// Add configurable-apartment
code = code.replace(
  /if \(type === 'apartment-complex'\) return <ApartmentComplexBlock width=\{loc\.width\} height=\{loc\.height\} \/>;/,
  "if (type === 'apartment-complex') return <ApartmentComplexBlock width={loc?.width} height={loc?.height} />;\n  if (type === 'configurable-apartment') return <ConfigurableApartmentBlock width={loc?.width} height={loc?.height} hasPool={loc?.hasPool} hasParking={loc?.hasParking} hasCourt={loc?.hasCourt} onUnitClick={onUnitClick} />;"
);

// We should also check for loc being passed
// Actually, earlier in InteractiveMap we just had `getBuildingSprite(loc.id, loc.type, loc.seed, loc.name)`
// In BuilderClient we had a custom renderIcon...

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Updated getBuildingSprite");
