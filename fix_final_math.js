const fs = require('fs');

// 1. Fix InteractiveMap.tsx road path
let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// The road is: <path d="M -100 1210 Q 1500 1510 3100 810" ... />
// We want to move it 60px inland (smaller Y_svg means further inland since Y_svg=0 is DOM Bottom).
// Wait! If Y_svg=0 is DOM Bottom, and we want it further inland, we need DOM Y to be LARGER.
// To make DOM Y larger, we need Y_svg to be SMALLER!
// So 1210 -> 1150, 1510 -> 1450, 810 -> 750.
mapCode = mapCode.replace(/d="M -100 1210 Q 1500 1510 3100 810"/g, 'd="M -100 1150 Q 1500 1450 3100 750"');

// And adjust the Bridges so they reach the new road!
// Palm Bridge was M 750 1280...
mapCode = mapCode.replace(/M 750 1280 L 750 1420/g, 'M 750 1220 L 750 1420');

// Burj Bridge was M 1150 1370...
mapCode = mapCode.replace(/M 1150 1370 L 1150 1480/g, 'M 1150 1310 L 1150 1480');

// Bluewaters Bridge was M 450 1370...
mapCode = mapCode.replace(/M 450 1370 L 350 1530/g, 'M 450 1310 L 350 1530');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);


// 2. Fix run_seed.js
let seedCode = fs.readFileSync('run_seed.js', 'utf8');

seedCode = seedCode.replace(/\{ id: "jbr"[\s\S]*?\},/, `{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 450, virtualY: 1300 },`);
// Wait, JBR virtualY:
// Center DOM = 1300 -> Y_svg = 1300. Coast is ~1290. So JBR covers Coast.
seedCode = seedCode.replace(/\{ id: "bluewaters"[\s\S]*?\},/, `{ id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 350, virtualY: 1630 },`);
seedCode = seedCode.replace(/\{ id: "palm"[\s\S]*?\},/, `{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: 1620 },`);
seedCode = seedCode.replace(/\{ id: "marina"[\s\S]*?\},/, `{ id: "marina", name: "Dubai Marina", type: "generic-district", virtualX: 550, virtualY: 1180, seed: 3 },`);

fs.writeFileSync('run_seed.js', seedCode);

console.log("Fixed all math alignments!");
