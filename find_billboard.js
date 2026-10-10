const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /BillboardSpace[\s\S]*?<\/svg>/;
const match = code.match(regex);
if (match) {
   console.log(match[0]);
} else {
   console.log("BillboardSpace not found.");
}
