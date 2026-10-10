const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const match = code.match(/setVenues\(\[\s*([\s\S]*?)\s*\]\);/);
if (match) {
   console.log("Found setVenues block. Length:", match[1].length);
} else {
   console.log("Could not find setVenues block!");
}
