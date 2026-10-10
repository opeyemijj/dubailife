const fs = require('fs');
let code = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

// Change mapConfig to center E11
code = code.replace(
  /export const mapConfig = \{ pitch: 45, yaw: 0, startX: -1000, startY: -500, startScale: 0.8 \};/,
  'export const mapConfig = { pitch: 45, yaw: 0, startX: -500, startY: -300, startScale: 0.8 };'
);

fs.writeFileSync('src/data/mapSeed.ts', code);
console.log("Centered E11 on screen!");
