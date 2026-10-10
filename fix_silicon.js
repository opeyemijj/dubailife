const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

code = code.replace(/\{ id: "silicon-oasis", name: "Silicon Oasis", type: "generic-district", virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
'{ id: "silicon-oasis", name: "Silicon Oasis", type: "generic-district", virtualX: 2400, virtualY: 450, seed: 105 },');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed silicon oasis");
