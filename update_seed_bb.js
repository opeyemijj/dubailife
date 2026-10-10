const fs = require('fs');
let code = fs.readFileSync('run_seed.js', 'utf8');

const bbCode = `
// Sample Giant Billboard
venues.push({
  id: 'giant-billboard-1', name: 'Yadsale Ad', type: 'giant-billboard',
  virtualX: 2000, virtualY: 1500, width: 250, height: 200, 
  text1: 'yad', text2: 'sale', color1: '#064e3b', color2: '#16a34a',
  interactive: true
});
`;

code = code.replace(/fs\.writeFileSync\('src\/data\/mapSeed\.ts'/g, bbCode + "\nfs.writeFileSync('src/data/mapSeed.ts'");
fs.writeFileSync('run_seed.js', code);
console.log("Added Giant Billboard to seed!");
