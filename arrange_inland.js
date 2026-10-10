const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// The venues are listed individually. Let's do targeted replaces for the overlapping ones.

const replacements = [
  // Deep Inland (Y: 300 - 700)
  [/\{ id: "ranches", name: "Arabian Ranches", type: "community-ranches", virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "ranches", name: "Arabian Ranches", type: "community-ranches", virtualX: 1450, virtualY: 400 },'],
  
  [/\{ id: "dubai-hills", name: "Dubai Hills", type: "community-dubai-hills", virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "dubai-hills", name: "Dubai Hills", type: "community-dubai-hills", virtualX: 1700, virtualY: 500 },'],
   
  [/\{ id: "motor-city", name: "Motor City", type: "community-motor-city", virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "motor-city", name: "Motor City", type: "community-motor-city", virtualX: 1250, virtualY: 550 },'],
   
  [/\{ id: "emirates-hills", name: "Emirates Hills", type: "community-emirates-hills", virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "emirates-hills", name: "Emirates Hills", type: "community-emirates-hills", virtualX: 1050, virtualY: 700 },'],

  [/\{ id: "discovery-gardens", name: "Discovery Gdns", type: "generic-district", virtualX: [0-9]+, virtualY: [0-9]+, seed: 104 \},/,
   '{ id: "discovery-gardens", name: "Discovery Gdns", type: "generic-district", virtualX: 750, virtualY: 600, seed: 104 },'],

  // Mid Inland (Y: 700 - 900)
  [/\{ id: "al-barsha", name: "Al Barsha", type: "generic-district", virtualX: [0-9]+, virtualY: [0-9]+, seed: 103 \},/,
   '{ id: "al-barsha", name: "Al Barsha", type: "generic-district", virtualX: 1350, virtualY: 750, seed: 103 },'],
   
  [/\{ id: "al-quoz", name: "Al Quoz", type: "generic-district", virtualX: [0-9]+, virtualY: [0-9]+, seed: 101 \},/,
   '{ id: "al-quoz", name: "Al Quoz", type: "generic-district", virtualX: 1700, virtualY: 800, seed: 101 },'],

  [/\{ id: "business-bay", name: "Business Bay", type: "community-business-bay", virtualX: [0-9]+, virtualY: [0-9]+ \},/,
   '{ id: "business-bay", name: "Business Bay", type: "community-business-bay", virtualX: 1900, virtualY: 700 },'],

  [/\{ id: "burj-khalifa", name: "Burj Khalifa", type: "hotel", virtualX: [0-9]+, virtualY: [0-9]+ \},/,
   '{ id: "burj-khalifa", name: "Burj Khalifa", type: "hotel", virtualX: 2050, virtualY: 820 },'],

  [/\{ id: "dubai-mall", name: "The Dubai Mall", type: "mall", size: "text-8xl", virtualX: [0-9]+, virtualY: [0-9]+ \},/,
   '{ id: "dubai-mall", name: "The Dubai Mall", type: "mall", size: "text-8xl", virtualX: 2200, virtualY: 820 },'],
   
  [/\{ id: "media-city", name: "Dubai Media City", type: "office", size: "text-8xl", virtualX: [0-9]+, virtualY: [0-9]+ \},/,
   '{ id: "media-city", name: "Dubai Media City", type: "office", size: "text-8xl", virtualX: 950, virtualY: 1000 },'],
   
  [/\{ id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: [0-9]+, virtualY: [0-9]+ \},/,
   '{ id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: 2750, virtualY: 450 },']
];

for (const [regex, replacement] of replacements) {
  if (!code.match(regex)) {
     console.log("Could not find match for:", regex);
  }
  code = code.replace(regex, replacement);
}

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Re-arranged inland communities side-by-side to avoid overlaps");
