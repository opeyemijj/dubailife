const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Replace Burj Bridge
mapCode = mapCode.replace(/<path d="M 1150 1310 L 1150 1480"/g, '<path d="M 1150 1232 L 1150 1480"');

// Replace Palm Bridge
mapCode = mapCode.replace(/<path d="M 750 1220 L 750 1420"/g, '<path d="M 750 1239 L 750 1420"');

// Replace BW Bridge
mapCode = mapCode.replace(/<path d="M 450 1310 L 350 1530"/g, '<path d="M 450 1224 L 350 1530"');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Updated bridges in InteractiveMap.tsx!");
