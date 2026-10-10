const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

code = code.replace(/d="M -100 550 Q 1500 250 3100 950"/g, 'd="M -100 950 Q 1500 1250 3100 550"');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Restored proper Y coords for E11");
