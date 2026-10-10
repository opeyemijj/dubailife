const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Update venues (JBR and Bluewaters positions)
code = code.replace(/\{ id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 350, virtualY: [0-9]+ \},/, '{ id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 350, virtualY: 1530 },');
code = code.replace(/\{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 450, virtualY: [0-9]+ \}/, '{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 450, virtualY: 1370 }');

// 2. Update Bridge Path
const newBridge = `
                {/* Bluewaters Bridge */}
                <path d="M 450 1370 L 350 1530" fill="none" stroke="#64748b" strokeWidth="8" />
                <path d="M 450 1370 L 350 1530" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" />
                
                {/* Palm Bridge (Over water) */}
`;
code = code.replace(/\{\/\* Bluewaters Bridge \*\/\}[\s\S]*?\{\/\* Palm Bridge \(Over water\) \*\/\}/, newBridge);

// 3. Update Traffic (Fewer cars, colorful, wider lanes)
const newCarsGen = `
  const cars = useMemo(() => {
    const arr = [];
    const types = ['taxi', 'bus', 'scooter', 'suv', 'sedan'];
    const taxiColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
    const carColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ec4899', '#ffffff', '#cbd5e1', '#8b5cf6'];
    
    for (let i=0; i<60; i++) { // Reduced count from 200 to 60
      const isReverse = i % 2 === 0;
      const road = i % 4; 
      
      const prng1 = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      const prng3 = (((i+2) * 9301 + 49297) % 233280) / 233280;
      
      const type = types[Math.floor(prng1 * types.length)];
      
      const isE11 = road <= 1;
      const laneIndex = isE11 ? Math.floor(prng2 * 3) : Math.floor(prng2 * 2);
      
      // Increased base offset significantly to ensure massive visual separation between directions
      const laneOffset = isE11 ? (12 + laneIndex * 8) : (10 + laneIndex * 6);
      
      arr.push({
        id: i,
        type,
        color: type === 'taxi' ? taxiColors[Math.floor(prng3 * taxiColors.length)] : carColors[Math.floor(prng3 * carColors.length)],
        duration: prng2 * (type === 'bus' ? 40 : type === 'scooter' ? 50 : 25) + 20, 
        delay: -(prng1 * 100),
        laneOffset,
        path: isE11 ? (isReverse ? '#e11-left' : '#e11-right') : (isReverse ? '#jum-left' : '#jum-right')
      });
    }
    return arr;
  }, []);
`;
code = code.replace(/const cars = useMemo\(\(\) => \{[\s\S]*?return arr;\n  \}, \[\]\);/, newCarsGen);

// 4. Update the car renderer to use the new colors
const newCarRenderer = `
                {cars.map(car => {
                  let Vehicle;
                  if (car.type === 'taxi') Vehicle = (
                     <g>
                        <rect x="-7" y="-3.5" width="14" height="7" rx="2" fill="#fef3c7" />
                        <rect x="2" y="-3.5" width="4" height="7" fill={car.color} />
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
                     <circle cx="0" cy="0" r="2.5" fill={car.color} />
                  );
                  else if (car.type === 'suv') Vehicle = (
                     <g>
                        <rect x="-8" y="-4" width="16" height="8" rx="2.5" fill={car.color} stroke="#cbd5e1" strokeWidth="1" />
                        <rect x="-3" y="-3" width="8" height="6" fill="#0f172a" opacity="0.5" />
                     </g>
                  );
                  else Vehicle = (
                     <g>
                        <rect x="-7" y="-3" width="14" height="6" rx="2" fill={car.color} />
                        <rect x="-2" y="-2" width="6" height="4" fill="#0f172a" opacity="0.5" />
                     </g>
                  );
                  
                  return (
`;
code = code.replace(/\{cars\.map\(car => \{[\s\S]*?return \(/, newCarRenderer);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Applied JBR, Bluewaters, and Traffic fixes.");
