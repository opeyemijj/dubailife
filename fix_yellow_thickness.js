const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// The user is seeing "3 layers" because the 120px stroke with 0.8 opacity creates overlapping bands with the background colors.
// We change it to a solid, single 25px line hugging the sea!
mapCode = mapCode.replace(/stroke="#fde047" strokeWidth="120" opacity="0.8"/g, 'stroke="#fde047" strokeWidth="25"');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Fixed yellow layer thickness!");
