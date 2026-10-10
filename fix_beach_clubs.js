const fs = require('fs');

let seedCode = fs.readFileSync('run_seed.js', 'utf8');

const oldLogicRegex = /let x = 300 \+ Math\.random\(\) \* 3400;[\s\S]*?let y = isBeach \? \(curveY \+ 10\) : \(600 \+ Math\.random\(\) \* 500\);/;
const newLogic = `let x = 100 + Math.random() * 2500;
    let t = (x + 100) / 3200;
    // ACTUAL Coastline equation: M -100 1250 Q 1500 1550 3100 850
    let curveY = Math.pow(1 - t, 2) * 1250 + 2 * (1 - t) * t * 1550 + Math.pow(t, 2) * 850;
    // Place beach clubs precisely on the sand (curveY + 10 matches the water edge perfectly)
    let y = isBeach ? (curveY + 15) : (500 + Math.random() * 500);`;

seedCode = seedCode.replace(oldLogicRegex, newLogic);

fs.writeFileSync('run_seed.js', seedCode);
console.log("Fixed beach clubs math!");
