const fs = require('fs');

let seedCode = fs.readFileSync('run_seed.js', 'utf8');
seedCode = seedCode.replace(
  /fs\.writeFileSync\('src\/data\/mapSeed\.ts', \`export const mapSeed = \$\{JSON\.stringify\(venues, null, 2\)\};\`\);/,
  "fs.writeFileSync('src/data/mapSeed.ts', `export const mapConfig = { pitch: 45, yaw: 0, startX: -1000, startY: -500, startScale: 0.8 };\\nexport const mapSeed = ${JSON.stringify(venues, null, 2)};`);"
);
fs.writeFileSync('run_seed.js', seedCode);

// Also manually fix mapSeed.ts
let code = fs.readFileSync('src/data/mapSeed.ts', 'utf8');
if (!code.includes('mapConfig')) {
  code = `export const mapConfig = { pitch: 45, yaw: 0, startX: -1000, startY: -500, startScale: 0.8 };\n` + code;
  fs.writeFileSync('src/data/mapSeed.ts', code);
}
console.log("Restored mapConfig!");
