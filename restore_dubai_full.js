const fs = require('fs');
const { execSync } = require('child_process');

console.log("1. Restoring Icons.tsx via revert_flat.js...");
execSync('node revert_flat.js');

console.log("2. Restoring apartment block via restore_exact_apt.js...");
execSync('node restore_exact_apt.js');

console.log("3. Restoring MapBackground.tsx coastline, beaches & paths...");
let bg = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');

// Restore ocean
bg = bg.replace(
  /<path d="M -8000,880 Q 1500,1730 12000,3680 L 12000,10000 L -8000,10000 Z" fill="#60BAEB" \/>/,
  '<path d="M 0,1300 Q 2000,1600 4000,900 L 4000,2600 L 0,2600 Z" fill="#60BAEB" />'
);
// Beach sand
bg = bg.replace(
  /<path d="M -8000,880 Q 1500,1730 12000,3680" fill="none" stroke="#fde047" strokeWidth="25" \/>/,
  '<path d="M 0 1300 Q 2000 1600 4000 900" fill="none" stroke="#fde047" strokeWidth="25" />'
);
// Ocean edge glow
bg = bg.replace(
  /<path d="M -8000,900 Q 1500,1750 12000,3700" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0\.5" \/>/,
  '<path d="M 0,1320 Q 2000,1620 4000,920" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" />'
);
// Metro path in bg
bg = bg.replace(
  /<path id="metro-path" d="M -8000,1650 Q 1500,800 12000,-1150"/,
  '<path id="metro-path" d="M -100,900 Q 1500,1200 3100,500"'
);

fs.writeFileSync('src/components/map/MapBackground.tsx', bg);

console.log("4. Restoring complete Dubai mapSeed.ts via run_seed.js...");
execSync('node run_seed.js');

console.log("5. Restoring InteractiveMap.tsx clean camera and rendering...");
let map = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Remove 3D rotateX and transformStyle on map container
map = map.replace(
  /className="relative cursor-crosshair shadow-2xl origin-center"\s*style=\{\{[\s\S]*?onClick=\{handleMapClick\}/,
  `className="relative cursor-crosshair shadow-2xl origin-center" 
  style={{ 
    width: \`\${WORLD_WIDTH}px\`, 
    height: \`\${WORLD_HEIGHT}px\`, 
    backgroundColor: "#E3CDA4"
  }} 
  onClick={handleMapClick}`
);

// Remove rotateX(-45deg) and preserve-3d on venue containers
map = map.replace(
  /transform: \`\$\{baseTransform\} \$\{rotationTransform\} rotateX\(-45deg\)\`\.trim\(\), transformOrigin: "bottom center", transformStyle: 'preserve-3d'/g,
  'transform: `${baseTransform} ${rotationTransform}`.trim(), transformOrigin: "bottom center"'
);

// Restore standard skylineFillers (along SZR)
const oldSkylineRegex = /const skylineFillers = useMemo\(\(\) => \{[\s\S]*?return blocks;\n  \}, \[\]\);/;
const origSkyline = `const skylineFillers = useMemo(() => {
    const blocks = [];
    const count = 75; 
    for (let i = 0; i <= count; i++) {
      if (i > 30 && i < 55) continue; 

      const t = i / count;
      const cx = (1-t)*(1-t)*(-100) + 2*(1-t)*t*1500 + t*t*3100;
      const cy = (1-t)*(1-t)*950 + 2*(1-t)*t*1250 + t*t*550;
      
      const seed = Math.floor(((i * 9301 + 49297) % 233280) / 233280 * 1000) + i;
      
      blocks.push({ id: \`skyline-up-\${i}\`, virtualX: cx - 40, virtualY: cy - 70, type: 'skyline', seed: seed, interactive: false });
      blocks.push({ id: \`skyline-dn-\${i}\`, virtualX: cx + 60, virtualY: cy + 50, type: 'skyline', seed: seed + 1, interactive: false });
    }
    return blocks;
  }, []);`;

map = map.replace(oldSkylineRegex, origSkyline);

// Restore TransformWrapper settings
const twRegex = /<TransformWrapper[\s\S]*?<TransformComponent/;
const origTW = `<TransformWrapper 
        initialScale={mapConfig?.startScale || 0.8} 
        initialPositionX={mapConfig?.startX || -1000} 
        initialPositionY={mapConfig?.startY || -500}
        minScale={minScale} 
        maxScale={3}
        limitToBounds={true}
        wheel={{ step: 0.1 }}
        panning={{ velocityMultiplier: 0.8 }}
      >
        <TransformComponent`;

map = map.replace(twRegex, origTW);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', map);

// Also make sure SkylineTower is in Icons.tsx for the skyline type
let icons = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');
if (!icons.includes("type === 'skyline'")) {
  icons = icons.replace(
    /if \(type === 'burj-khalifa'\) return <BurjKhalifaIcon \/>;/,
    "if (type === 'skyline') return <SkylineTower seed={seed || 0} />;\n  if (type === 'burj-khalifa') return <BurjKhalifaIcon />;"
  );
  fs.writeFileSync('src/components/map/Icons.tsx', icons);
}

console.log("All Dubai components successfully restored!");
