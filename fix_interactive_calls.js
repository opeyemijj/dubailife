const fs = require('fs');

let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// The call is currently: getBuildingSprite(loc.id, loc.type, loc.seed, loc.name)
// Change to: getBuildingSprite(loc.id, loc.type, loc.seed, loc.name, loc, handleSubUnitClick)

// Add handleSubUnitClick inside the component
if (!code.includes('handleSubUnitClick')) {
  code = code.replace(
    /const handleVenueClick = \(loc: any\) => \{/,
    `const handleSubUnitClick = (unitId: string, unitName: string) => {
    setSelectedVenue({
      id: unitId,
      name: unitName,
      type: 'sub-unit',
      description: 'A privately owned unit within the complex.',
      interactive: true,
      options: [
        { label: "Purchase Unit (500k AED)", amount: -500000, color: "bg-blue-600" }
      ]
    });
  };

  const handleVenueClick = (loc: any) => {`
  );
}

// Update the call
code = code.replace(
  /\{getBuildingSprite\(loc\.id, loc\.type, loc\.seed, loc\.name\)\}/g,
  "{getBuildingSprite(loc.id, loc.type, loc.seed, loc.name, loc, handleSubUnitClick)}"
);

// We should also add 'configurable-apartment' to isOverlay in InteractiveMap
code = code.replace(
  /loc\.type === "ad-land";/,
  `loc.type === "ad-land" || loc.type === "hotel" || loc.type === "mall" || loc.type === "museum-future" || loc.type === "apartment-complex" || loc.type === "giant-billboard" || loc.type === "marina" || loc.type === "configurable-apartment";`
);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated InteractiveMap");
