const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Remove the Inland Road Network
const roadsRegex = /\{\/\* Inland Road Network \[\s\S]*?\{\/\* Marine Traffic \*\/\}/;
code = code.replace(roadsRegex, '{/* Marine Traffic */}');

// 2. Re-map communities into the symmetrical sweeping double-arch
const communityUpdates = [
  // ROW 1: Smooth curve parallel to E11, spaced every 400px
  [/\{ id: "discovery-gardens"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+, seed: 104 \},/, 
   '{ id: "discovery-gardens", name: "Discovery Gdns", type: "generic-district", virtualX: 500, virtualY: 800, seed: 104 },'],
  [/\{ id: "emirates-hills"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "emirates-hills", name: "Emirates Hills", type: "community-emirates-hills", virtualX: 900, virtualY: 900 },'],
  [/\{ id: "al-barsha"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+, seed: 103 \},/, 
   '{ id: "al-barsha", name: "Al Barsha", type: "generic-district", virtualX: 1300, virtualY: 950, seed: 103 },'],
  [/\{ id: "al-quoz"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+, seed: 101 \},/, 
   '{ id: "al-quoz", name: "Al Quoz", type: "generic-district", virtualX: 1700, virtualY: 850, seed: 101 },'],
  [/\{ id: "burj-khalifa"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "burj-khalifa", name: "Burj Khalifa", type: "hotel", virtualX: 2100, virtualY: 650 },'],
  [/\{ id: "dubai-mall"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "dubai-mall", name: "The Dubai Mall", type: "mall", size: "text-8xl", virtualX: 2200, virtualY: 630 },'],
  [/\{ id: "deira"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "deira", name: "Deira & Old Dubai", type: "community-deira", virtualX: 2500, virtualY: 500 },'],

  // ROW 2: Deeper inland, smooth curve parallel to Row 1, interleaved (spaced by 400px offset by 200)
  [/\{ id: "motor-city"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "motor-city", name: "Motor City", type: "community-motor-city", virtualX: 700, virtualY: 600 },'],
  [/\{ id: "ranches"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "ranches", name: "Arabian Ranches", type: "community-ranches", virtualX: 1100, virtualY: 650 },'],
  [/\{ id: "dubai-hills"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "dubai-hills", name: "Dubai Hills", type: "community-dubai-hills", virtualX: 1500, virtualY: 700 },'],
  [/\{ id: "business-bay"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "business-bay", name: "Business Bay", type: "community-business-bay", virtualX: 1900, virtualY: 550 },'],
  [/\{ id: "silicon-oasis"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+, seed: 105 \},/, 
   '{ id: "silicon-oasis", name: "Silicon Oasis", type: "generic-district", virtualX: 2300, virtualY: 400 },'],
  [/\{ id: "dxb"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: 2700, virtualY: 300 },']
];

for (const [regex, replacement] of communityUpdates) {
  if (!code.match(regex)) {
     console.log("Warning: Could not find match for:", regex);
  }
  code = code.replace(regex, replacement);
}

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Removed roads and aligned communities symmetrically");
