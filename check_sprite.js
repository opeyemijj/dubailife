const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /const getBuildingSprite = [\s\S]*?\{[\s\S]*?\};/;
const match = code.match(regex);
if (match) {
   console.log(match[0]);
} else {
   console.log("Could not find getBuildingSprite.");
}
