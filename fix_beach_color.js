const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Change bright yellow to natural sand color that matches the rest of the map (#E3CDA4)
mapCode = mapCode.replace(/stroke="#fde047"/g, 'stroke="#E3CDA4"');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Changed beach color to natural sand!");
