const fs = require('fs');
let code = fs.readFileSync('run_seed.js', 'utf8');

// We need to inject the bridges into the venues array.
const bridgesCode = `
// Bridges
venues.push({
  id: 'bridge-palm', name: 'Palm Bridge', type: 'bridge',
  virtualX: 750, virtualY: 1419, // Center Y_svg = (1239+1600)/2 = 1419.5
  width: 14, height: 361, rotate: 0, interactive: true
});
venues.push({
  id: 'bridge-burj', name: 'Burj Bridge', type: 'bridge',
  virtualX: 1150, virtualY: 1356, // (1232+1480)/2 = 1356
  width: 8, height: 248, rotate: 0, interactive: true
});
venues.push({
  id: 'bridge-bluewaters', name: 'Bluewaters Bridge', type: 'bridge',
  virtualX: 400, virtualY: 1377, 
  width: 10, height: 322, rotate: 18, interactive: true // wait! 18 or -18?
  // Top point needs to be X=350, Bottom X=450.
  // Unrotated: Top=400, Bottom=400.
  // Rotated by positive 18 degrees (clockwise): Top goes right (X>400), Bottom goes left (X<400).
  // We want Top X=350 (left), Bottom X=450 (right).
  // So we need counter-clockwise rotation: -18.
});
venues.push({
  id: 'bridge-bulgari', name: 'Bulgari Bridge', type: 'bridge',
  virtualX: 1600, virtualY: 1392, // (1335+1450)/2 = 1392.5
  width: 8, height: 115, rotate: 0, interactive: true
});
`;

// Insert just before writing to file
code = code.replace(/fs\.writeFileSync\('src\/data\/mapSeed\.ts'/g, bridgesCode + "\nfs.writeFileSync('src/data/mapSeed.ts'");
fs.writeFileSync('run_seed.js', code);
console.log("Added bridges to seed!");
