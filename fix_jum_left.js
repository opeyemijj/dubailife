const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

mapCode = mapCode.replace(/d="M 3100 810 Q 1500 1510 -100 1210"/g, 'd="M 3100 750 Q 1500 1450 -100 1150"');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Fixed jum-left!");
