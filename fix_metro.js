const fs = require('fs');

let seedCode = fs.readFileSync('src/data/mapSeed.ts', 'utf8');
seedCode = seedCode.replace(
  /"pathData": "M -100,900 Q 1500,1200 3100,500"/g,
  '"pathData": "M -8000,1650 Q 1500,800 12000,-1150"'
);
fs.writeFileSync('src/data/mapSeed.ts', seedCode);

let bgCode = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');
bgCode = bgCode.replace(
  /<path id="metro-path" d="M -100,900 Q 1500,1200 3100,500"/g,
  '<path id="metro-path" d="M -8000,1650 Q 1500,800 12000,-1150"'
);
fs.writeFileSync('src/components/map/MapBackground.tsx', bgCode);

console.log("Updated metro line!");
