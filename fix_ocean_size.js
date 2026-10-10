const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Increase WORLD_HEIGHT
code = code.replace(/const WORLD_HEIGHT = 1800;/, 'const WORLD_HEIGHT = 2600;');

// 2. Fix SVG viewBox and container sizes
code = code.replace(/className="w-\[3000px\] h-\[1800px\] bg-\[#E3CDA4\]"/, 'className="w-[3000px] h-[2600px] bg-[#E3CDA4]"');
code = code.replace(/viewBox="0 0 3000 1800"/, 'viewBox="0 0 3000 2600"');
code = code.replace(/translate\(0, 1800\)/g, 'translate(0, 2600)');

// 3. Update Ocean polygons to span up to 2600
code = code.replace(/L 3000 1800 L 0 1800 Z/g, 'L 3000 2600 L 0 2600 Z');
code = code.replace(/<rect width="3000" height="1800" fill="#E3CDA4" \/>/, '<rect width="3000" height="2600" fill="#E3CDA4" />');

// 4. Add Marine Routes to the SVG (near the traffic roads)
const marineRoutes = `
                {/* Marine Routes (Hidden paths for animation) */}
                <path id="route-yacht-1" d="M -100 2400 Q 1500 2200 3100 2400" fill="none" />
                <path id="route-yacht-2" d="M 3100 2100 Q 1500 2300 -100 2100" fill="none" />
                <path id="route-jetski-1" d="M -100 1800 Q 1000 1900 1400 1800 Q 2000 1700 3100 1800" fill="none" />
                <path id="route-jetski-2" d="M 900 1500 Q 600 1650 200 1500" fill="none" />
                <path id="route-jetski-3" d="M 2100 1400 Q 1600 1500 1200 1400" fill="none" />
                
                {/* E11 Traffic Roads */}`;
code = code.replace(/\{\/\* E11 Traffic Roads \*\/\}/, marineRoutes);

// 5. Generate Boats in useMemo
const boatsGenCode = `
  const boats = useMemo(() => {
    const arr = [];
    const yachtColors = ['#ffffff', '#f8fafc', '#e2e8f0'];
    const jetskiColors = ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
    
    for (let i = 0; i < 40; i++) {
      const isYacht = i < 15;
      const prng = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      
      let pathId = '';
      if (isYacht) pathId = i % 2 === 0 ? '#route-yacht-1' : '#route-yacht-2';
      else pathId = i % 3 === 0 ? '#route-jetski-1' : (i % 3 === 1 ? '#route-jetski-2' : '#route-jetski-3');
      
      arr.push({
        id: i,
        type: isYacht ? 'yacht' : 'jetski',
        color: isYacht ? yachtColors[Math.floor(prng * yachtColors.length)] : jetskiColors[Math.floor(prng * jetskiColors.length)],
        duration: prng * (isYacht ? 100 : 40) + (isYacht ? 80 : 30),
        delay: -(prng * 200),
        offset: (prng2 - 0.5) * (isYacht ? 200 : 80),
        path: pathId
      });
    }
    return arr;
  }, []);

  const cars = useMemo`;
code = code.replace(/const cars = useMemo/, boatsGenCode);

// 6. Render Boats
const boatsRenderCode = `
                {/* Marine Traffic */}
                {boats.map(boat => (
                  <g key={\`boat-\${boat.id}\`}>
                    <animateMotion dur={\`\${boat.duration}s\`} begin={\`\${boat.delay}s\`} repeatCount="indefinite" rotate="auto">
                      <mpath href={boat.path} />
                    </animateMotion>
                    <g transform={\`translate(0, \${boat.offset})\`}>
                      {boat.type === 'yacht' ? (
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
                ))}

                {/* Highway Traffic */}`;
code = code.replace(/\{\/\* Highway Traffic \*\/\}/, boatsRenderCode);


fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Increased ocean size and added boats");
