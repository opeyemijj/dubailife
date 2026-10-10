const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /your ad here/i;
const match = code.match(regex);
if (match) {
   const index = match.index;
   console.log("Found at index:", index);
   console.log(code.substring(index - 100, index + 100));
} else {
   console.log("Not found.");
}
