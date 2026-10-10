const fs = require('fs');
let code = fs.readFileSync('run_seed.js', 'utf8');

const mallCode = `
// Sample Mall
venues.push({
  id: 'mall-1', name: 'Dubai Mall', type: 'mall',
  virtualX: 2000, virtualY: 1000, width: 250, height: 220, interactive: true
});
`;

code = code.replace(/fs\.writeFileSync\('src\/data\/mapSeed\.ts'/g, mallCode + "\nfs.writeFileSync('src/data/mapSeed.ts'");
fs.writeFileSync('run_seed.js', code);
console.log("Added Mall to seed!");
