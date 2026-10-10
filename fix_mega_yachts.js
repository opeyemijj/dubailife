const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Update boats generator to ensure Mega Yachts are definitely on screen and moving at a decent pace
const oldBoatsGen = /const boats = useMemo\(\(\) => \{[\s\S]*?return arr;\n  \}, \[\]\);/;
const newBoatsGen = `const boats = useMemo(() => {
    const arr = [];
    const yachtColors = ['#ffffff', '#f8fafc', '#e2e8f0'];
    const jetskiColors = ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
    
    for (let i = 0; i < 40; i++) {
      const isMegaYacht = i < 2;
      const isYacht = i >= 2 && i < 15;
      const isBoat = isMegaYacht || isYacht;
      
      const prng = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      
      let pathId = '';
      if (isBoat) pathId = i % 2 === 0 ? '#route-yacht-1' : '#route-yacht-2';
      else pathId = i % 3 === 0 ? '#route-jetski-1' : (i % 3 === 1 ? '#route-jetski-2' : '#route-jetski-3');
      
      arr.push({
        id: i,
        type: isMegaYacht ? 'mega-yacht' : (isYacht ? 'yacht' : 'jetski'),
        color: isBoat ? yachtColors[Math.floor(prng * yachtColors.length)] : jetskiColors[Math.floor(prng * jetskiColors.length)],
        duration: isMegaYacht ? 90 : (prng * (isYacht ? 100 : 40) + (isYacht ? 80 : 30)),
        delay: isMegaYacht ? -(i * 45) : -(prng * 200),
        offset: isMegaYacht ? 0 : (prng2 - 0.5) * (isBoat ? 120 : 80),
        path: pathId
      });
    }
    return arr;
  }, []);`;

code = code.replace(oldBoatsGen, newBoatsGen);

// 2. Make them visibly larger by using scale(1.5)
const oldMegaRender = /<g>\s*<path d="M -30 -10 L 25 -10 L 45 0 L 25 10 L -30 10 Z" fill="#f8fafc" className="drop-shadow-2xl" \/>[\s\S]*?<\/g>\s*\) : boat\.type === 'yacht'/;
const newMegaRender = `<g transform="scale(1.5)">
                          <path d="M -30 -10 L 25 -10 L 45 0 L 25 10 L -30 10 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" className="drop-shadow-2xl" />
                          <rect x="-20" y="-7" width="35" height="14" fill="#f1f5f9" rx="2" />
                          <rect x="-10" y="-5" width="20" height="10" fill="#e2e8f0" rx="1" />
                          <rect x="0" y="-3" width="8" height="6" fill="#0284c7" opacity="0.6" />
                          <circle cx="-15" cy="0" r="4" fill="#22c55e" stroke="#ffffff" strokeWidth="1" />
                          <text x="-15" y="1.2" fill="#ffffff" fontSize="3" fontWeight="bold" textAnchor="middle">H</text>
                          <path d="M -30 -10 L -60 -20 M -30 10 L -60 20" stroke="#bae6fd" strokeWidth="3" fill="none" opacity="0.6" />
                          <path d="M -30 0 L -80 0" stroke="#bae6fd" strokeWidth="5" fill="none" opacity="0.4" />
                        </g>
                      ) : boat.type === 'yacht'`;

code = code.replace(oldMegaRender, newMegaRender);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed Mega Yachts rendering");
