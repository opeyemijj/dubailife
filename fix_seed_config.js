const fs = require('fs');
let code = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

if (!code.includes('mapConfig')) {
  code = `export const mapConfig = {
  pitch: 45,
  yaw: 0,
  startX: -1000,
  startY: -500,
  startScale: 0.8
};\n\n` + code;
  fs.writeFileSync('src/data/mapSeed.ts', code);
  console.log("Added mapConfig to mapSeed.ts");
}
