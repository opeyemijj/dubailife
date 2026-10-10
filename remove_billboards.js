const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Remove the billboard spaces from the fallbackVenues array
const billboardRegex = /\{\s*id:\s*"ad-\d+"[\s\S]*?\},/g;
code = code.replace(billboardRegex, '');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Removed all billboards from the map.");
