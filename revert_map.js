const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Reverse map bounds
code = code.replace(/const WORLD_WIDTH = 8000;/, 'const WORLD_WIDTH = 4000;');
code = code.replace(/const WORLD_HEIGHT = 5000;/, 'const WORLD_HEIGHT = 2600;');
code = code.replace(/<g transform=\{\`translate\(0, 5000\) scale\(1, -1\)\`\}>/, '<g transform={`translate(0, 2600) scale(1, -1)`}>');

code = code.replace(/M 0,2500 Q 4000,3000 8000,1800 L 8000,5000 L 0,5000 Z/g, 'M 0,1300 Q 2000,1600 4000,900 L 4000,2600 L 0,2600 Z');
code = code.replace(/M 0 2500 Q 4000 3000 8000 1800/g, 'M 0 1300 Q 2000 1600 4000 900');
code = code.replace(/M 0,2540 Q 4000,3040 8000,1840/g, 'M 0,1320 Q 2000,1620 4000,920');
code = code.replace(/M 0 1500 Q 4000 2000 8000 1000/g, 'M 0 1000 Q 2000 1300 4000 600');
code = code.replace(/M 0 2300 Q 4000 2800 8000 1600/g, 'M 0 1150 Q 2000 1450 4000 750');

code = code.replace(/Array.from\(\{ length: 81 \}\)/g, 'Array.from({ length: 41 })');
code = code.replace(/x2=\{8000\}/g, 'x2={4000}');
code = code.replace(/y2=\{5000\}/g, 'y2={2600}');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Reverted background sizing to 4000x2600.");
