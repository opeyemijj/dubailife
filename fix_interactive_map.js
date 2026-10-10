const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Add mapConfig to import
code = code.replace(/import \{ mapSeed \} from '@\/data\/mapSeed';/, "import { mapSeed, mapConfig } from '@/data/mapSeed';");

// 2. Set TransformWrapper defaults
code = code.replace(
  /<TransformWrapper\s+initialScale=\{minScale\}\s+initialPositionX=\{0\}\s+initialPositionY=\{0\}\s+minScale=\{minScale\}\s+maxScale=\{3\}\s+limitToBounds=\{false\}>/,
  `<TransformWrapper 
          initialScale={mapConfig?.startScale || 0.8} 
          initialPositionX={mapConfig?.startX || -1000} 
          initialPositionY={mapConfig?.startY || -500} 
          minScale={minScale} 
          maxScale={3} 
          limitToBounds={false}
        >`
);

// 3. Apply 3D transform to inner div
code = code.replace(
  /<div className="w-\[4000px\] h-\[2600px\] bg-\[#60BAEB\] relative pointer-events-auto">/,
  `<div className="w-[4000px] h-[2600px] bg-[#60BAEB] relative pointer-events-auto origin-center transition-transform duration-500" style={{ transform: \`perspective(2500px) rotateX(\${mapConfig?.pitch || 0}deg) rotateZ(\${mapConfig?.yaw || 0}deg)\`, transformStyle: 'preserve-3d' }}>`
);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated InteractiveMap with 3D Config!");
