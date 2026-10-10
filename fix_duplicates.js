const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

code = code.replace(/WORLD_WIDTH, WORLD_HEIGHT, categoryColors/, 'categoryColors');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed duplicates!");
