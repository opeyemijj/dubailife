const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Replace the cars generator
const newCarsGen = `
  const cars = useMemo(() => {
    const arr = [];
    const types = ['taxi', 'bus', 'scooter', 'suv', 'sedan'];
    const taxiColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
    
    for (let i=0; i<200; i++) {
      const isReverse = i % 2 === 0;
      const road = i % 4; // 0,1=E11, 2,3=Jumeirah
      
      const prng1 = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      const prng3 = (((i+2) * 9301 + 49297) % 233280) / 233280;
      
      const type = types[Math.floor(prng1 * types.length)];
      
      // Multi-lane logic: 3 lanes per side for E11.
      const isE11 = road <= 1;
      const laneIndex = isE11 ? Math.floor(prng2 * 3) : Math.floor(prng2 * 2);
      
      // Lane center offsets
      const baseOffset = isE11 ? (4 + laneIndex * 8) : (4 + laneIndex * 6);
      const laneOffset = isReverse ? -baseOffset : baseOffset;
      
      arr.push({
        id: i,
        type,
        taxiColor: type === 'taxi' ? taxiColors[Math.floor(prng3 * taxiColors.length)] : null,
        duration: prng2 * (type === 'bus' ? 40 : type === 'scooter' ? 50 : 25) + 20, 
        delay: -(prng1 * 100),
        isReverse,
        laneOffset,
        path: isE11 ? (isReverse ? '#e11-left' : '#e11-right') : (isReverse ? '#jum-left' : '#jum-right')
      });
    }
    return arr;
  }, []);
`;
code = code.replace(/const cars = useMemo\(\(\) => \{[\s\S]*?return arr;\n  \}, \[\]\);/, newCarsGen);


// 2. Replace the car renderer
const newCarRenderer = `
                {cars.map(car => {
                  let Vehicle;
                  if (car.type === 'taxi') Vehicle = (
                     <g>
                        <rect x="-7" y="-3.5" width="14" height="7" rx="2" fill="#fef3c7" />
                        <rect x="2" y="-3.5" width="4" height="7" fill={car.taxiColor} />
                        <rect x="-4" y="-2.5" width="3" height="5" fill="#0f172a" opacity="0.6" />
                        <rect x="3" y="-2.5" width="2" height="5" fill="#0f172a" opacity="0.6" />
                     </g>
                  );
                  else if (car.type === 'bus') Vehicle = (
                     <g>
                        <rect x="-16" y="-4.5" width="32" height="9" rx="2" fill="#ef4444" />
                        <rect x="-16" y="-1" width="32" height="2" fill="#ffffff" />
                        <rect x="10" y="-3.5" width="4" height="7" fill="#0f172a" opacity="0.8" />
                     </g>
                  );
                  else if (car.type === 'scooter') Vehicle = (
                     <circle cx="0" cy="0" r="2.5" fill="#38bdf8" />
                  );
                  else if (car.type === 'suv') Vehicle = (
                     <g>
                        <rect x="-8" y="-4" width="16" height="8" rx="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                        <rect x="-3" y="-3" width="8" height="6" fill="#0f172a" opacity="0.5" />
                     </g>
                  );
                  else Vehicle = (
                     <g>
                        <rect x="-7" y="-3" width="14" height="6" rx="2" fill="#1f2937" />
                        <rect x="-2" y="-2" width="6" height="4" fill="#0f172a" opacity="0.5" />
                     </g>
                  );
                  
                  return (
                  <g key={car.id} className="shadow-lg drop-shadow-md">
                    <animateMotion 
                      dur={\`\${car.duration}s\`} 
                      begin={\`\${car.delay}s\`} 
                      repeatCount="indefinite" 
                      rotate="auto"
                      keyPoints={car.isReverse ? "1;0" : "0;1"}
                      keyTimes="0;1"
                      calcMode="linear"
                    >
                      <mpath href={car.path} />
                    </animateMotion>
                    <g transform={\`translate(0, \${car.laneOffset}) \${car.isReverse ? 'rotate(180)' : ''}\`}>
                      {Vehicle}
                    </g>
                  </g>
                )})}
`;
code = code.replace(/\{cars\.map\(car => \{[\s\S]*?return \([\s\S]*?<\/g>\n                \)\}\)\}/, newCarRenderer);

// 3. Upgrade the road visuals in SVG to Multilane
const multiLaneE11 = `
                {/* E11 Base Highway */}
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#334155" strokeWidth="48" />
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#facc15" strokeWidth="2" />
                {/* Dashed Lane Dividers */}
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 8)" />
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 16)" />
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -8)" />
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -16)" />
                
                <path id="e11-right" d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="transparent" />
                <path id="e11-left" d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="transparent" />
`;
code = code.replace(/<path id="e11-right".*? strokeWidth="24" \/>\n\s*<path id="e11-left".*?\/>/, multiLaneE11);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Traffic upgraded!");
