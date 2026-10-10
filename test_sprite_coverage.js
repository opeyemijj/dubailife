const fs = require('fs');

const { mapSeed } = require('./src/data/mapSeed.ts');
const iconsFile = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const types = [...new Set(mapSeed.map(v => v.type))];
console.log("Unique types in mapSeed:", types);

types.forEach(t => {
  const hasMatch = iconsFile.includes(`type === '${t}'`) || iconsFile.includes(`type.startsWith('${t}')`);
  console.log(`Type '${t}': ${hasMatch ? 'SUPPORTED' : 'FALLBACK TO GENERIC'}`);
});
