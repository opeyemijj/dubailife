const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const oldPath1 = '<path id="mega-cruise-1" d="M 700 1600 C 700 1500, 1000 1500, 1000 1600 C 1000 1700, 700 1700, 700 1600 Z" fill="none" />';
const newPath1 = '<path id="mega-cruise-1" d="M 1500 2300 C 1500 2200, 1800 2200, 1800 2300 C 1800 2400, 1500 2400, 1500 2300 Z" fill="none" />';

const oldPath2 = '<path id="mega-cruise-2" d="M 1200 1500 C 1200 1350, 1600 1350, 1600 1500 C 1600 1650, 1200 1650, 1200 1500 Z" fill="none" />';
const newPath2 = '<path id="mega-cruise-2" d="M 700 2400 C 700 2300, 1100 2300, 1100 2400 C 1100 2500, 700 2500, 700 2400 Z" fill="none" />';

code = code.replace(oldPath1, newPath1);
code = code.replace(oldPath2, newPath2);

// Update comment
code = code.replace('{/* Slow Luxury Cruise Paths near Burj Al Arab */}', '{/* Slow Luxury Cruise Paths in Deep Ocean */}');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Moved mega yachts to deep ocean");
