const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// The lines are:
// <path d="M 0 1300 Q 2000 1600 4000 900" fill="none" stroke="#fde047" strokeWidth="120" opacity="0.8" />
// <path d="M 0 1300 Q 2000 1600 4000 900" fill="none" stroke="#fef08a" strokeWidth="40" opacity="0.9" />

mapCode = mapCode.replace(/<path d="M 0 1300 Q 2000 1600 4000 900" fill="none" stroke="#fef08a" strokeWidth="40" opacity="0.9" \/>\n/g, '');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Removed extra yellow line.");
