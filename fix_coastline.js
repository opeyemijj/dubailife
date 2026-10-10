const fs = require('fs');
let code = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');

// Replace Ocean path
code = code.replace(
  /<path d="M -5000,1000 Q 2000,1600 10000,200 L 10000,5000 L -5000,5000 Z" fill="#60BAEB" \/>/,
  '<path d="M -8000,1200 Q 1500,2050 12000,4000 L 12000,10000 L -8000,10000 Z" fill="#60BAEB" />'
);

// Replace Beach sand
code = code.replace(
  /<path d="M -5000 1000 Q 2000 1600 10000 200" fill="none" stroke="#fde047" strokeWidth="25" \/>/,
  '<path d="M -8000,1200 Q 1500,2050 12000,4000" fill="none" stroke="#fde047" strokeWidth="25" />'
);

// Replace Ocean glow
code = code.replace(
  /<path d="M -5000,1020 Q 2000,1620 10000,220" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0\.5" \/>/,
  '<path d="M -8000,1220 Q 1500,2070 12000,4020" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" />'
);

fs.writeFileSync('src/components/map/MapBackground.tsx', code);
console.log("Updated coastline to perfectly parallel E11!");
