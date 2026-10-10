const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Remove the transition-transform that fights with RZPP and causes blinking
mapCode = mapCode.replace(
  /className="relative cursor-crosshair shadow-2xl origin-center transition-transform duration-500"/g,
  'className="relative cursor-crosshair shadow-2xl origin-center"'
);

// Optional: check if there are other transition classes that could cause it
mapCode = mapCode.replace(/transition-all duration-300/g, ''); // Often on venues, might cause blinking if they constantly re-render

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Removed problematic transitions from InteractiveMap.tsx!");
