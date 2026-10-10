const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Fix the `laneOffset` calculation
const oldOffset = /const laneOffset = isE11 \? \(12 \+ laneIndex \* 8\) : \(10 \+ laneIndex \* 6\);/;
const newOffset = `const laneOffset = isE11 ? (8 + laneIndex * 9) : (7 + laneIndex * 8);`;
code = code.replace(oldOffset, newOffset);
// E11 offsets: 8, 17, 26 (Max 26 + 3.5 = 29.5) -> needs radius 30 -> strokeWidth 60
// Jumeirah offsets: 7, 15 (Max 15 + 3.5 = 18.5) -> needs radius 20 -> strokeWidth 40

// 2. Widen Jumeirah Road to strokeWidth="40"
const oldJum = /<path d="M -100 1210 Q 1500 1510 3100 810" fill="none" stroke="#64748b" strokeWidth="24"/;
const newJum = '<path d="M -100 1210 Q 1500 1510 3100 810" fill="none" stroke="#64748b" strokeWidth="40"';
code = code.replace(oldJum, newJum);

// 3. Widen E11 to strokeWidth="60"
const oldE11Base = /<path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#334155" strokeWidth="48" \/>/;
const newE11Base = '<path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#334155" strokeWidth="60" />';
code = code.replace(oldE11Base, newE11Base);

// We should also adjust the dashed lane markings for E11 to match the new offsets
// Old: 8, 16, -8, -16
// New E11 Offsets: 8, 17, 26.
// The lane markings should be exactly between the lanes: ~12.5 and ~21.5. And symmetrically for the other side.
// Let's replace the 4 dashed lines with the correct offsets: 12.5, 21.5, -12.5, -21.5
const oldDashed = /<path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate\(0, 8\)" \/>\s*<path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate\(0, 16\)" \/>\s*<path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate\(0, -8\)" \/>\s*<path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate\(0, -16\)" \/>/;
const newDashed = `<path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 12.5)" />
                <path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 21.5)" />
                <path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -12.5)" />
                <path d="M -100 950 Q 1500 1250 3100 550" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -21.5)" />`;
code = code.replace(oldDashed, newDashed);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed car lanes and widened roads");
