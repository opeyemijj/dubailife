const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const oldSkyline = /const skylineFillers = useMemo\(\(\) => \{[\s\S]*?return blocks;\n  \}, \[\]\);/;

const newSkyline = `const skylineFillers = useMemo(() => {
    const blocks = [];
    const count = 40; 
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      
      // E44 path: M -100,650 Q 1500,950 3100,250
      // We'll place skyscrapers exactly following this curve!
      // But we will offset them significantly so they sit on the sides.
      const roadX = (1-t)*(1-t)*(-100) + 2*(1-t)*t*1500 + t*t*3100;
      const roadY = (1-t)*(1-t)*650 + 2*(1-t)*t*950 + t*t*250;
      
      // Because virtualY gets converted to renderedY = 2600 - virtualY
      // And we want the visual rendered Y to match roadY + offset
      // Let visualY = roadY - 120 (above road)
      const visualY_up = roadY - 120;
      const virtualY_up = 2600 - visualY_up;
      
      // Let visualY_dn = roadY + 180 (below road)
      const visualY_dn = roadY + 200;
      const virtualY_dn = 2600 - visualY_dn;
      
      const seed = Math.floor(((i * 9301 + 49297) % 233280) / 233280 * 1000) + i;
      
      // Give them sizes so they look like big skyscrapers
      blocks.push({ id: \`sky-\${i}-up\`, virtualX: roadX, virtualY: virtualY_up, type: 'skyline', seed: seed, interactive: false });
      blocks.push({ id: \`sky-\${i}-dn\`, virtualX: roadX, virtualY: virtualY_dn, type: 'skyline', seed: seed + 1, interactive: false });
    }
    return blocks;
  }, []);`;

mapCode = mapCode.replace(oldSkyline, newSkyline);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Updated skylineFillers to follow E44 perfectly with offsets!");

let iconsCode = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Ensure 'skyline' renders as IsoBox 
const renderReplacement = `
  if (type === 'skyline') {
    // Generate a nice skyscraper using IsoBox
    const h = 80 + (seed % 100);
    const color = (seed % 3 === 0) ? '#3b82f6' : (seed % 3 === 1) ? '#64748b' : '#0ea5e9';
    return (
      <svg viewBox="-50 -150 100 200" width="100" height="200" className="drop-shadow-lg z-20 overflow-visible">
         <IsoBox x={0} y={0} w={30} d={30} h={h} color={color} />
      </svg>
    );
  }
`;

iconsCode = iconsCode.replace(/export const getBuildingSprite = [\s\S]*?\{/, (match) => {
  return match + renderReplacement;
});

fs.writeFileSync('src/components/map/Icons.tsx', iconsCode);
console.log("Updated getBuildingSprite to render skyline as IsoBox skyscrapers!");
