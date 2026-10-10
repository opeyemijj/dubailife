const fs = require('fs');
const content = fs.readFileSync('src/data/mapSeed.ts', 'utf8');
const arrayMatch = content.match(/export const mapSeed = (\[[\s\S]*\]);/);
const mapSeed = JSON.parse(arrayMatch[1]);
mapSeed.forEach(v => console.log(v.type, v.name));
