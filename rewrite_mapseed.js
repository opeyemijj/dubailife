const fs = require('fs');

const content = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

// Extract the array using simple eval or regex
const arrayMatch = content.match(/export const mapSeed = (\[[\s\S]*\]);/);
if (!arrayMatch) {
  console.log("Could not find mapSeed array");
  process.exit(1);
}

const mapSeed = eval(arrayMatch[1]);

console.log("Original length:", mapSeed.length);

const typesToKeep = new Set([
  'road-path',
  'car-lane',
  'palm-community',
  'marina',
  'marina-yachts',
  'mega-yacht',
  'scattered-boats',
  'bridge' // keeping bridges just in case they are part of roads
]);

const keepIds = new Set([
  'palm-jumeirah',
  'marina' // it was type: 'generic-district' but we want to keep marina
]);

const newSeed = mapSeed.filter(venue => {
  // Keep roads and cars
  if (venue.type === 'road-path' || venue.type === 'car-lane') return true;
  
  // Keep palm
  if (venue.type === 'palm-community' || venue.id === 'palm-jumeirah' || venue.name.toLowerCase().includes('palm')) return true;
  
  // Keep marina
  if (venue.type.includes('marina') || venue.id.includes('marina') || venue.name.toLowerCase().includes('marina')) return true;
  
  // Keep yachts/boats
  if (venue.type.includes('yacht') || venue.type.includes('boat')) return true;

  // Keep bridges as they usually go with roads
  if (venue.type === 'bridge') return true;

  return false;
});

console.log("New length:", newSeed.length);

const newContent = content.replace(arrayMatch[1], JSON.stringify(newSeed, null, 2));
fs.writeFileSync('src/data/mapSeed.ts', newContent);
console.log("Successfully updated mapSeed.ts");
