const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const oldSkyline = /const skylineFillers = useMemo\(\(\) => \{[\s\S]*?return blocks;\n  \}, \[\]\);/;

const newSkyline = `const skylineFillers = useMemo(() => {
    const blocks = [];
    const count = 15; // Drastically reduced for "well spaced"
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      
      // E11 (formerly E44) path: M -100,650 Q 1500,950 3100,250
      const roadX = (1-t)*(1-t)*(-100) + 2*(1-t)*t*1500 + t*t*3100;
      const roadY = (1-t)*(1-t)*650 + 2*(1-t)*t*950 + t*t*250;
      
      const visualY_up = roadY - 140; // a bit further back
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
console.log("Updated skylineFillers to be well spaced!");

let seedCode = fs.readFileSync('src/data/mapSeed.ts', 'utf8');
seedCode = seedCode.replace(/E44 Al Khail Road/g, 'E11 Sheikh Zayed Road');
seedCode = seedCode.replace(/E44 Centerline/g, 'E11 Centerline');
fs.writeFileSync('src/data/mapSeed.ts', seedCode);
console.log("Renamed E44 to E11!");
