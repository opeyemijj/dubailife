const fs = require('fs');

// 1. MapBackground.tsx
let bgCode = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');

bgCode = bgCode.replace(
  /<svg width=\{WORLD_WIDTH\} height=\{WORLD_HEIGHT\} className="absolute inset-0 pointer-events-none">/,
  '<svg width={WORLD_WIDTH} height={WORLD_HEIGHT} className="absolute inset-0 pointer-events-none overflow-visible">'
);

// Ocean path
bgCode = bgCode.replace(
  /<path d="M 0,1300 Q 2000,1600 4000,900 L 4000,2600 L 0,2600 Z" fill="#60BAEB" \/>/,
  '<path d="M -5000,1000 Q 2000,1600 10000,200 L 10000,5000 L -5000,5000 Z" fill="#60BAEB" />'
);

// Beach sand
bgCode = bgCode.replace(
  /<path d="M 0 1300 Q 2000 1600 4000 900" fill="none" stroke="#fde047" strokeWidth="25" \/>/,
  '<path d="M -5000 1000 Q 2000 1600 10000 200" fill="none" stroke="#fde047" strokeWidth="25" />'
);

// Ocean glow
bgCode = bgCode.replace(
  /<path d="M 0,1320 Q 2000,1620 4000,920" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" \/>/,
  '<path d="M -5000,1020 Q 2000,1620 10000,220" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" />'
);

fs.writeFileSync('src/components/map/MapBackground.tsx', bgCode);
console.log("Updated MapBackground!");

// 2. mapSeed.ts (E11 Path)
let seedCode = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

// We want to make E11 span -8000 to +12000
const e11Regex = /M -100,650 Q 1500,950 3100,250/g;
seedCode = seedCode.replace(e11Regex, "M -8000,1800 Q 1500,950 12000,-1000");

fs.writeFileSync('src/data/mapSeed.ts', seedCode);
console.log("Updated mapSeed E11 path!");

// 3. InteractiveMap.tsx (skylineFillers)
let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const oldSkyline = /const skylineFillers = useMemo\(\(\) => \{[\s\S]*?return blocks;\n  \}, \[\]\);/;

const newSkyline = `const skylineFillers = useMemo(() => {
    const blocks = [];
    const count = 40; // increased count to cover the massive new distance!
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      
      // E11 path: M -8000,1800 Q 1500,950 12000,-1000
      const roadX = (1-t)*(1-t)*(-8000) + 2*(1-t)*t*1500 + t*t*12000;
      const roadY = (1-t)*(1-t)*1800 + 2*(1-t)*t*950 + t*t*(-1000);
      
      const visualY_up = roadY - 140; 
      const virtualY_up = 2600 - visualY_up;
      
      const visualY_dn = roadY + 220;
      const virtualY_dn = 2600 - visualY_dn;
      
      const seed = Math.floor(((i * 9301 + 49297) % 233280) / 233280 * 1000) + i;
      
      blocks.push({ id: \`sky-\${i}-up\`, virtualX: roadX, virtualY: virtualY_up, type: 'skyline', seed: seed, interactive: false });
      blocks.push({ id: \`sky-\${i}-dn\`, virtualX: roadX, virtualY: virtualY_dn, type: 'skyline', seed: seed + 1, interactive: false });
    }
    return blocks;
  }, []);`;

mapCode = mapCode.replace(oldSkyline, newSkyline);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Updated InteractiveMap skylineFillers!");

