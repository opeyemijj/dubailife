const fs = require('fs');
let code = fs.readFileSync('run_seed.js', 'utf8');

const aptCode = `
// Sample Configurable Apartment
venues.push({
  id: 'luxury-apts-1', name: 'Luxury Residences', type: 'configurable-apartment',
  virtualX: 1800, virtualY: 1500, width: 300, height: 250, 
  hasPool: true, hasParking: true, hasCourt: true,
  interactive: false // We set this to false so the wrapper doesn't block the children from being clicked in InteractiveMap!
});
`;

code = code.replace(/fs\.writeFileSync\('src\/data\/mapSeed\.ts'/g, aptCode + "\nfs.writeFileSync('src/data/mapSeed.ts'");
fs.writeFileSync('run_seed.js', code);
console.log("Added Configurable Apartment to seed script!");
