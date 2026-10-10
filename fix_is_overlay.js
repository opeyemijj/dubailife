const fs = require('fs');

const updateFile = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    /const isOverlay = loc.type.startsWith\('community'\)/g, 
    "const isOverlay = loc.type === 'bridge' || loc.type.startsWith('community')"
  );
  fs.writeFileSync(file, code);
}

updateFile('src/components/admin/BuilderClient.tsx');
updateFile('src/components/map/InteractiveMap.tsx');
console.log("Fixed isOverlay logic for bridges!");
