const fs = require('fs');
let code = fs.readFileSync('run_seed.js', 'utf8');

const roadsCode = `
// Extra Editable Roads
venues.push({
  id: 'road-cross-1', name: 'Cross Road 1', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 4, color: '#94a3b8', isDashed: false,
  pathData: 'M 800,1300 Q 900,750 1500,200', interactive: true
});
venues.push({
  id: 'road-cross-2', name: 'Cross Road 2', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 4, color: '#94a3b8', isDashed: false,
  pathData: 'M 1200,1300 Q 1300,750 1900,200', interactive: true
});
venues.push({
  id: 'road-e44', name: 'E44 Al Khail Road', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 16, color: '#64748b', isDashed: false,
  pathData: 'M -100,650 Q 1500,950 3100,250', interactive: true
});
venues.push({
  id: 'road-e44-dashed', name: 'E44 Centerline', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 2, color: '#fbbf24', isDashed: true,
  pathData: 'M -100,650 Q 1500,950 3100,250', interactive: true
});
venues.push({
  id: 'road-e311', name: 'E311 SMBZ Road', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 16, color: '#64748b', isDashed: false,
  pathData: 'M -100,350 Q 1500,650 3100,-50', interactive: true
});
venues.push({
  id: 'road-e311-dashed', name: 'E311 Centerline', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 2, color: '#fbbf24', isDashed: true,
  pathData: 'M -100,350 Q 1500,650 3100,-50', interactive: true
});
venues.push({
  id: 'metro-line', name: 'Metro Line', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 4, color: '#cbd5e1', isDashed: false,
  pathData: 'M -100,900 Q 1500,1200 3100,500', interactive: true
});
`;

code = code.replace(/fs\.writeFileSync\('src\/data\/mapSeed\.ts'/g, roadsCode + "\nfs.writeFileSync('src/data/mapSeed.ts'");
fs.writeFileSync('run_seed.js', code);
console.log("Added editable roads to seed!");
