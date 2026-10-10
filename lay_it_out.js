const fs = require('fs');

// 1. MapBackground.tsx - Move sea closer to the skyscrapers (Y_path: 1000, 1850, 3800)
let bgCode = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');

// Replace Ocean path
bgCode = bgCode.replace(
  /<path d="M -8000,1200 Q 1500,2050 12000,4000 L 12000,10000 L -8000,10000 Z" fill="#60BAEB" \/>/,
  '<path d="M -8000,1000 Q 1500,1850 12000,3800 L 12000,10000 L -8000,10000 Z" fill="#60BAEB" />'
);

// Replace Beach sand
bgCode = bgCode.replace(
  /<path d="M -8000,1200 Q 1500,2050 12000,4000" fill="none" stroke="#fde047" strokeWidth="25" \/>/,
  '<path d="M -8000,1000 Q 1500,1850 12000,3800" fill="none" stroke="#fde047" strokeWidth="25" />'
);

// Replace Ocean glow
bgCode = bgCode.replace(
  /<path d="M -8000,1220 Q 1500,2070 12000,4020" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0\.5" \/>/,
  '<path d="M -8000,1020 Q 1500,1870 12000,3820" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" />'
);

fs.writeFileSync('src/components/map/MapBackground.tsx', bgCode);
console.log("Updated coastline to be right behind the skyscrapers!");

// 2. mapSeed.ts - Update default zoom
let seedCode = fs.readFileSync('src/data/mapSeed.ts', 'utf8');
seedCode = seedCode.replace(
  /export const mapConfig = \{ pitch: 45, yaw: 0, startX: -200, startY: -1000, startScale: 0\.6 \};/,
  'export const mapConfig = { pitch: 45, yaw: 0, startX: -700, startY: -500, startScale: 0.95 };'
);
fs.writeFileSync('src/data/mapSeed.ts', seedCode);
console.log("Updated default zoom and panning to frame perfectly!");

