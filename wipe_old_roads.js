const fs = require('fs');
let code = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');

const regexesToRemove = [
  /<path d="M 800,1300 Q 900,750 1500,200" fill="none" stroke="#94a3b8".*\/>/g,
  /<path d="M 1200,1300 Q 1300,750 1900,200" fill="none" stroke="#94a3b8".*\/>/g,
  /<path id="metro-path" d="M -100,900 Q 1500,1200 3100,500" fill="none" stroke="#cbd5e1" strokeWidth="4" \/>/g,
  /<path d="M -100,650 Q 1500,950 3100,250" fill="none" stroke="#64748b" strokeWidth="16".*\/>/g,
  /<path d="M -100,650 Q 1500,950 3100,250" fill="none" stroke="#fbbf24".*\/>/g,
  /<path d="M -100,350 Q 1500,650 3100,-50" fill="none" stroke="#64748b" strokeWidth="16".*\/>/g,
  /<path d="M -100,350 Q 1500,650 3100,-50" fill="none" stroke="#fbbf24".*\/>/g
];

regexesToRemove.forEach(r => {
  code = code.replace(r, '');
});

fs.writeFileSync('src/components/map/MapBackground.tsx', code);
console.log("Wiped old roads");
