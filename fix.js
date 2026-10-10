const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// The airport block text to insert
const airport = fs.readFileSync('/tmp/airport.tsx', 'utf8');

// Remove the wrongly injected one
code = code.replace(airport, '');

// Find where to insert it safely (after SkylineTower is closed)
const insertIndex = code.indexOf('// --- BUYABLE COMMUNITY BLOCKS ---');
if (insertIndex !== -1) {
  code = code.slice(0, insertIndex) + airport + '\n' + code.slice(insertIndex);
}

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
