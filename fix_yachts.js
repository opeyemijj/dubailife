const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Update Marine Routes
const oldRoutes = /<path id="route-yacht-1" d="M -100 2400 Q 1500 2200 3100 2400" fill="none" \/>\s*<path id="route-yacht-2" d="M 3100 2100 Q 1500 2300 -100 2100" fill="none" \/>\s*<path id="route-jetski-1" d="M -100 1800 Q 1000 1900 1400 1800 Q 2000 1700 3100 1800" fill="none" \/>/;

const newRoutes = `<path id="route-yacht-1" d="M -100 1950 Q 1500 1750 3100 1950" fill="none" />
                <path id="route-yacht-2" d="M 3100 1850 Q 1500 2050 -100 1850" fill="none" />
                <path id="route-jetski-1" d="M -100 1750 Q 1000 1850 1400 1750 Q 2000 1650 3100 1750" fill="none" />`;

code = code.replace(oldRoutes, newRoutes);

// 2. Update boats generator
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
        duration: isMegaYacht ? (prng * 150 + 120) : (prng * (isYacht ? 100 : 40) + (isYacht ? 80 : 30)),
        delay: -(prng * 200),
        offset: (prng2 - 0.5) * (isBoat ? 120 : 80),
        path: pathId
      });
    }
    return arr;
  }, []);`;

code = code.replace(oldBoatsGen, newBoatsGen);

// 3. Update boats render
const oldBoatsRender = /\{boats\.map\(boat => \([\s\S]*?\}\)\)/;
const newBoatsRender = `{boats.map(boat => (
                  <g key={\`boat-\${boat.id}\`}>
                    <animateMotion dur={\`\${boat.duration}s\`} begin={\`\${boat.delay}s\`} repeatCount="indefinite" rotate="auto">
                      <mpath href={boat.path} />
                    </animateMotion>
                    <g transform={\`translate(0, \${boat.offset})\`}>
                      {boat.type === 'mega-yacht' ? (
                        <g>
                          <path d="M -30 -10 L 25 -10 L 45 0 L 25 10 L -30 10 Z" fill="#f8fafc" className="drop-shadow-2xl" />
                          <rect x="-20" y="-7" width="35" height="14" fill="#cbd5e1" rx="2" />
                          <rect x="-10" y="-5" width="20" height="10" fill="#e2e8f0" rx="1" />
                          <rect x="0" y="-3" width="8" height="6" fill="#0284c7" opacity="0.6" />
                          <circle cx="-15" cy="0" r="4" fill="#22c55e" stroke="#ffffff" strokeWidth="0.5" />
                          <text x="-15" y="1.2" fill="#ffffff" fontSize="3" fontWeight="bold" textAnchor="middle">H</text>
                          <path d="M -30 -10 L -60 -20 M -30 10 L -60 20" stroke="#bae6fd" strokeWidth="3" fill="none" opacity="0.6" />
                          <path d="M -30 0 L -80 0" stroke="#bae6fd" strokeWidth="5" fill="none" opacity="0.4" />
                        </g>
                      ) : boat.type === 'yacht' ? (
                        <g>
                          <path d="M -15 -6 L 10 -6 L 22 0 L 10 6 L -15 6 Z" fill={boat.color} className="drop-shadow-md" />
                          <rect x="-5" y="-3" width="12" height="6" fill="#cbd5e1" rx="1" />
                          <rect x="0" y="-2" width="5" height="4" fill="#0ea5e9" opacity="0.6" />
                          <path d="M -15 -6 L -35 -12 M -15 6 L -35 12" stroke="#bae6fd" strokeWidth="2" fill="none" opacity="0.5" />
                          <path d="M -15 0 L -40 0" stroke="#bae6fd" strokeWidth="3" fill="none" opacity="0.3" />
                        </g>
                      ) : (
                        <g>
                          <ellipse cx="0" cy="0" rx="5" ry="2.5" fill={boat.color} className="drop-shadow-sm" />
                          <circle cx="1" cy="0" r="1.5" fill="#0f172a" opacity="0.7" />
                          <path d="M -5 -2 L -15 -5 M -5 2 L -15 5" stroke="#e0f2fe" strokeWidth="1" fill="none" opacity="0.6" />
                          <path d="M -5 0 L -20 0" stroke="#e0f2fe" strokeWidth="1.5" fill="none" opacity="0.4" />
                        </g>
                      )}
                    </g>
                  </g>
                ))}`;

code = code.replace(oldBoatsRender, newBoatsRender);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated yachts position and added mega yachts");
