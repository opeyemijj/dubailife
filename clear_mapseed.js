const fs = require('fs');

const content = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

const arrayMatch = content.match(/export const mapSeed = (\[[\s\S]*\]);/);
if (!arrayMatch) {
  console.log("Could not find mapSeed array");
  process.exit(1);
}

const mapSeed = JSON.parse(arrayMatch[1]);
console.log("Original length:", mapSeed.length);

const newSeed = mapSeed.filter(venue => {
  return venue.type === 'road-path' || venue.type === 'car-lane';
});

console.log("New length:", newSeed.length);

const newContent = content.replace(arrayMatch[1], JSON.stringify(newSeed, null, 2));
fs.writeFileSync('src/data/mapSeed.ts', newContent);
console.log("Successfully updated mapSeed.ts");
