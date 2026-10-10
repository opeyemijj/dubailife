const fs = require('fs');

let code = fs.readFileSync('run_seed.js', 'utf8');

code = code.replace(
  /hasPool: true, hasParking: true, hasCourt: true,/,
  "hasPool: true, hasParking: true, hasCourt: true, numBuildings: 4, color: '#38bdf8',"
);

fs.writeFileSync('run_seed.js', code);
console.log("Updated seed vars");
