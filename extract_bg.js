const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const startStr = '<svg width={WORLD_WIDTH} height={WORLD_HEIGHT} className="absolute inset-0 pointer-events-none">';
const startIndex = code.indexOf(startStr);
let endIndex = code.indexOf('</svg>', startIndex) + 6;

const bgSvg = code.slice(startIndex, endIndex);

const mapBgCode = `import React from 'react';
import { WORLD_WIDTH, WORLD_HEIGHT } from './Icons';

export const MapBackground = () => (
  ${bgSvg}
);
`;

fs.writeFileSync('src/components/map/MapBackground.tsx', mapBgCode);

// Replace it in InteractiveMap.tsx
code = code.replace(bgSvg, '<MapBackground />');
// add import MapBackground
code = code.replace("import { mapSeedVenues }", "import { MapBackground } from './MapBackground';\nimport { mapSeedVenues }");

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Extracted MapBackground!");
