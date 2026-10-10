const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

code = code.replace(/\{ id: "jbr-beach", name: "JBR Beach", type: "beach", size: "text-7xl", virtualX: [0-9]+, virtualY: [0-9]+ \}/, '{ id: "jbr-beach", name: "JBR Beach", type: "beach", size: "text-7xl", virtualX: 400, virtualY: 1360 }');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed JBR beach placement");
