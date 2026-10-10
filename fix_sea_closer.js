const fs = require('fs');

// 1. MapBackground.tsx - Move sea even closer (Y_path: 880, 1730, 3680)
let bgCode = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');

bgCode = bgCode.replace(
  /<path d="M -8000,1000 Q 1500,1850 12000,3800 L 12000,10000 L -8000,10000 Z" fill="#60BAEB" \/>/,
  '<path d="M -8000,880 Q 1500,1730 12000,3680 L 12000,10000 L -8000,10000 Z" fill="#60BAEB" />'
);

bgCode = bgCode.replace(
  /<path d="M -8000,1000 Q 1500,1850 12000,3800" fill="none" stroke="#fde047" strokeWidth="25" \/>/,
  '<path d="M -8000,880 Q 1500,1730 12000,3680" fill="none" stroke="#fde047" strokeWidth="25" />'
);

bgCode = bgCode.replace(
  /<path d="M -8000,1020 Q 1500,1870 12000,3820" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0\.5" \/>/,
  '<path d="M -8000,900 Q 1500,1750 12000,3700" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" />'
);

fs.writeFileSync('src/components/map/MapBackground.tsx', bgCode);
console.log("Updated coastline to be EXTREMELY close to the road!");

// 2. InteractiveMap.tsx - Move skyscrapers closer to the road to avoid being in water
let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

mapCode = mapCode.replace(
  /const visualY_up = roadY - 140;/g,
  'const visualY_up = roadY - 60;'
);
mapCode = mapCode.replace(
  /const visualY_dn = roadY \+ 220;/g,
  'const visualY_dn = roadY + 120;'
);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Moved skyscrapers closely hugging the road!");

