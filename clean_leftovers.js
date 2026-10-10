const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const toRemove = [
  "emirates-hills", "motor-city", "dubai-hills", "ranches", 
  "business-bay", "al-quoz", "al-barsha", "silicon-oasis", "deira"
];

for (const id of toRemove) {
  const regex = new RegExp(`\\{\\s*id:\\s*"${id}"[\\s\\S]*?\\},`, 'g');
  code = code.replace(regex, '');
}

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Cleaned leftovers");
