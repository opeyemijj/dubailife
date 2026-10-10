const fs = require('fs');

let seedCode = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

const e311Regex = /M -100,350 Q 1500,650 3100,-50/g;
seedCode = seedCode.replace(e311Regex, "M -8000,1500 Q 1500,650 12000,-1300");

fs.writeFileSync('src/data/mapSeed.ts', seedCode);
console.log("Updated E311 path!");
