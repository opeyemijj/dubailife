const fs = require('fs');

let seedCode = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

const arrayMatch = seedCode.match(/export const mapSeed = (\[[\s\S]*\]);/);
const mapSeed = JSON.parse(arrayMatch[1]);

const newSeed = mapSeed.filter(venue => !venue.name.includes('Cross Road'));

const newContent = seedCode.replace(arrayMatch[1], JSON.stringify(newSeed, null, 2));
fs.writeFileSync('src/data/mapSeed.ts', newContent);
console.log("Removed cross roads!");
