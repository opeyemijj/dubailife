const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// extract fallbackVenues array block
const block = code.match(/setVenues\(\[\s*([\s\S]*?)\s*\]\);/)[1];
const regex = /id:\s*"([^"]+)"[\s\S]*?virtualX:\s*([0-9]+)[\s\S]*?virtualY:\s*([0-9]+)/g;
let match;
const venues = [];
while ((match = regex.exec(block)) !== null) {
  venues.push({ id: match[1], x: parseInt(match[2]), y: parseInt(match[3]) });
}

let conflicts = 0;
for (let i = 0; i < venues.length; i++) {
  for (let j = i + 1; j < venues.length; j++) {
    const v1 = venues[i];
    const v2 = venues[j];
    const dist = Math.hypot(v1.x - v2.x, v1.y - v2.y);
    if (dist < 100) { // If centers are less than 100px apart, they might overlap significantly
      console.log(`Potential Overlap: ${v1.id} (${v1.x}, ${v1.y}) and ${v2.id} (${v2.x}, ${v2.y}) - Dist: ${Math.round(dist)}`);
      conflicts++;
    }
  }
}
if (conflicts === 0) console.log("No major overlaps found.");
