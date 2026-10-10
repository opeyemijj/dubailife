const fs = require('fs');

let seedCode = fs.readFileSync('run_seed.js', 'utf8');

// JBR needs to be exactly between coast (1363) and road (1212). Let's use virtualY: 1250.
seedCode = seedCode.replace(/\{ id: "jbr"[\s\S]*?\},/, `{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 550, virtualY: 1250 },`);

// Palm trunk needs to align with road. virtualY: 1280.
seedCode = seedCode.replace(/\{ id: "palm"[\s\S]*?\},/, `{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 1000, virtualY: 1280 },`);

// Bluewaters island near JBR. virtualY: 1420.
seedCode = seedCode.replace(/\{ id: "bluewaters"[\s\S]*?\},/, `{ id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 400, virtualY: 1420 },`);

// Burj Al Arab virtualY: 1450 is fine.
seedCode = seedCode.replace(/\{ id: "burj-al-arab"[\s\S]*?\},/, `{ id: "burj-al-arab", name: "Burj Al Arab", type: "burj-al-arab", virtualX: 1400, virtualY: 1450 },`);

// Beach clubs: let's put them exactly on the coast line (curveY) or slightly into the water (curveY + 10).
// Since the visual pool should touch the water.
const beachLogicOld = /let y = isBeach \? \(curveY - 30\) : \(600 \+ Math\.random\(\) \* 500\);/g;
const beachLogicNew = `let y = isBeach ? (curveY + 10) : (600 + Math.random() * 500);`;
seedCode = seedCode.replace(beachLogicOld, beachLogicNew);

fs.writeFileSync('run_seed.js', seedCode);
console.log("Fixed run_seed.js alignment logic round 2");
