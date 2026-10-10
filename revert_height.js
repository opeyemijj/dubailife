const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Revert WORLD_HEIGHT
code = code.replace(/const WORLD_HEIGHT = 3200;/, 'const WORLD_HEIGHT = 2600;');

// Revert SVG viewbox and transform
code = code.replace(/<svg viewBox="0 0 3000 3200"/, '<svg viewBox="0 0 3000 2600"');
code = code.replace(/<g transform="translate\(0, 3200\) scale\(1, -1\)">/, '<g transform="translate(0, 2600) scale(1, -1)">');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Reverted WORLD_HEIGHT to 2600");
