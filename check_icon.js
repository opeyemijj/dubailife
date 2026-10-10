const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const match = code.match(/const GenericCommunityIcon = [\s\S]*?<\/svg>\s*\);/);
if (match) {
   console.log(match[0]);
} else {
   console.log("Could not find GenericCommunityIcon");
}
