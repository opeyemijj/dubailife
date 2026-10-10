const fs = require('fs');
let code = fs.readFileSync('run_seed.js', 'utf8');

const motfCode = `
// Museum of the Future
venues.push({
  id: 'motf-1', name: 'Museum of the Future', type: 'museum-future',
  virtualX: 2300, virtualY: 1000, width: 100, height: 120, interactive: true
});
`;

code = code.replace(/fs\.writeFileSync\('src\/data\/mapSeed\.ts'/g, motfCode + "\nfs.writeFileSync('src/data/mapSeed.ts'");
fs.writeFileSync('run_seed.js', code);
console.log("Added Museum of the Future to seed!");
