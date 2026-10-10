const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

code = code.replace(/L 3000,1800 L 0,1800 Z/g, 'L 3000,2600 L 0,2600 Z');
code = code.replace(/fill="#60BAEB"/g, 'fill="#0284c7"'); // Make it deeper blue to match "deeper ocean need to be blue"

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed ocean water bounds and color");
