const fs = require('fs');
let code = fs.readFileSync('run_seed.js', 'utf8');

const aptCode = `
// Sample Apartment Complex
venues.push({
  id: 'apartment-complex-1', name: 'University Apartments', type: 'apartment-complex',
  virtualX: 1800, virtualY: 900, width: 300, height: 250, interactive: true
});
`;

code = code.replace(/fs\.writeFileSync\('src\/data\/mapSeed\.ts'/g, aptCode + "\nfs.writeFileSync('src/data/mapSeed.ts'");
fs.writeFileSync('run_seed.js', code);
console.log("Added Apartment Complex to seed!");
