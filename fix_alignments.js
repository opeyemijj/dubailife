const fs = require('fs');

let seedCode = fs.readFileSync('run_seed.js', 'utf8');

// 1. Fix coordinates of classics
// JBR should be on land, before the beach. Coastline at X=550 is Y=1363.
seedCode = seedCode.replace(/\{ id: "jbr"[\s\S]*?\},/, `{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 550, virtualY: 1300 },`);

// Palm trunk needs to be exactly at the bridge. We'll leave it at 1000, 1600 (center of a 600px tall block, so top is 1300, matching coast at 1380).

// Burj Al Arab is on water. Coast at 1400 is 1387.
seedCode = seedCode.replace(/\{ id: "burj-al-arab"[\s\S]*?\},/, `{ id: "burj-al-arab", name: "Burj Al Arab", type: "burj-al-arab", virtualX: 1400, virtualY: 1450 },`);

// 2. Fix Beach Clubs to precisely hug the quadratic Bezier coastline
const beachLogicOld = /let x = 500 \+ Math\.random\(\) \* 3000;\s*let y = isBeach \? \(1300 \+ Math\.random\(\) \* 200\) : \(600 \+ Math\.random\(\) \* 500\);/g;
const beachLogicNew = `let x = 300 + Math.random() * 3400;
    let t = x / 4000;
    // Coastline equation: M 0,1300 Q 2000,1600 4000,900
    let curveY = Math.pow(1 - t, 2) * 1300 + 2 * (1 - t) * t * 1600 + Math.pow(t, 2) * 900;
    // Place beach clubs slightly on the sand (curveY - 30), and inland clubs far away
    let y = isBeach ? (curveY - 30) : (600 + Math.random() * 500);`;
seedCode = seedCode.replace(beachLogicOld, beachLogicNew);

fs.writeFileSync('run_seed.js', seedCode);
console.log("Fixed run_seed.js alignment logic");
