const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('const getBuildingSprite'));
console.log(lines.slice(start, start + 30).join('\n'));
