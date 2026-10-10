const fs = require('fs');
let code = fs.readFileSync('run_seed.js', 'utf8');

const hotelCode = `
// Sample Hotel
venues.push({
  id: 'hotel-1', name: 'Grand Resort Hotel', type: 'hotel',
  virtualX: 1900, virtualY: 1000, width: 250, height: 250, interactive: true
});
`;

code = code.replace(/fs\.writeFileSync\('src\/data\/mapSeed\.ts'/g, hotelCode + "\nfs.writeFileSync('src/data/mapSeed.ts'");
fs.writeFileSync('run_seed.js', code);
console.log("Added Hotel to seed!");
