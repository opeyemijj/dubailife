const fs = require('fs');
let code = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

code = code.replace(
  /export const mapConfig = \{[\s\S]*?\};/,
  'export const mapConfig = { pitch: 45, yaw: 0, startX: -200, startY: -1000, startScale: 0.6 };'
);

fs.writeFileSync('src/data/mapSeed.ts', code);
console.log("Adjusted center to -200, -1000!");
