const fs = require('fs');

const fixFile = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/mapSeedVenues/g, 'mapSeed');
  fs.writeFileSync(file, code);
}

fixFile('src/components/admin/BuilderClient.tsx');
fixFile('src/components/map/InteractiveMap.tsx');
fixFile('run_seed.js');

console.log("Fixed mapSeed references!");
