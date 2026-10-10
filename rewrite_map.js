const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Change Background from Green to Desert Sand
code = code.replace(/bg-\[#A6D59A\]/g, 'bg-[#E3CDA4]');
code = code.replace(/backgroundColor: '#A6D59A'/g, "backgroundColor: '#E3CDA4'");

// 2. Reduce SVGs class dimensions significantly
code = code.replace(/w-\[450px\] h-\[450px\]/g, 'w-[250px] h-[250px]'); // Palm
code = code.replace(/w-\[350px\] h-\[350px\]/g, 'w-[200px] h-[200px]'); // JVC
code = code.replace(/w-\[350px\] h-\[250px\]/g, 'w-[200px] h-[140px]'); // Dubai Hills
code = code.replace(/w-\[400px\] h-\[200px\]/g, 'w-[220px] h-[110px]'); // Business Bay
code = code.replace(/w-\[300px\] h-\[200px\]/g, 'w-[180px] h-[120px]'); // Ranches
code = code.replace(/w-\[300px\] h-\[300px\]/g, 'w-[160px] h-[160px]'); // Motor City
code = code.replace(/w-\[450px\] h-\[120px\]/g, 'w-[220px] h-[60px]');  // JBR
code = code.replace(/w-\[220px\] h-\[220px\]/g, 'w-[140px] h-[140px]'); // Generic
code = code.replace(/w-\[700px\] h-\[350px\]/g, 'w-[350px] h-[175px]'); // Airport

// 3. Update Road Thicknesses in the SVG background
code = code.replace(/strokeWidth="60"/g, 'strokeWidth="24"');
code = code.replace(/strokeWidth="40"/g, 'strokeWidth="16"');
code = code.replace(/strokeWidth="30"/g, 'strokeWidth="12"');
code = code.replace(/strokeWidth="20"/g, 'strokeWidth="8"');
// Metro path
code = code.replace(/strokeWidth="8"/g, 'strokeWidth="4"');

// 4. Implement rich vehicles
const carsCode = `
  const cars = useMemo(() => {
    const arr = [];
    const types = ['taxi', 'bus', 'scooter', 'suv', 'sedan'];
    for (let i=0; i<150; i++) {
      const isReverse = i % 2 === 0;
      const road = i % 4;
      
      const prng1 = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      
      const type = types[Math.floor(prng1 * types.length)];
      
      arr.push({
        id: i,
        type,
        duration: prng2 * (type === 'bus' ? 40 : type === 'scooter' ? 50 : 25) + 15, 
        delay: -(prng1 * 60),
        isReverse,
        path: road <= 1 ? (isReverse ? '#e11-left' : '#e11-right') : (isReverse ? '#jum-left' : '#jum-right')
      });
    }
    return arr;
  }, []);
`;
code = code.replace(/const cars = useMemo\(\(\) => \{[\s\S]*?return arr;\n  \}, \[\]\);/, carsCode);

const carRenderCode = `
                {cars.map(car => {
                  let Vehicle;
                  if (car.type === 'taxi') Vehicle = <g><rect width="12" height="6" rx="2" fill="#fef08a" /><rect width="6" height="6" rx="1" fill="#ef4444" /></g>;
                  else if (car.type === 'bus') Vehicle = <rect width="24" height="7" rx="2" fill="#16a34a" />;
                  else if (car.type === 'scooter') Vehicle = <circle cx="2" cy="2" r="2" fill="#38bdf8" />;
                  else if (car.type === 'suv') Vehicle = <rect width="14" height="7" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />;
                  else Vehicle = <rect width="10" height="5" rx="2" fill="#1f2937" />;
                  
                  return (
                  <g key={car.id} className="shadow-lg">
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
                    <g transform="translate(-6, -3)">
                      {Vehicle}
                    </g>
                  </g>
                )})}
`;
code = code.replace(/\{cars\.map\(car => \([\s\S]*?\}\)\)/, carRenderCode);

// 5. Replace JVC with Emirates Hills in venues and UI
code = code.replace(/\{ id: "jvc".*?\}/, '{ id: "emirates-hills", name: "Emirates Hills", type: "community-emirates-hills", virtualX: 1050, virtualY: 780 }');
const ehBlock = `
const EmiratesHillsBlock = () => (
  <svg viewBox="0 0 300 200" className="w-[180px] h-[120px] drop-shadow-xl z-10 relative cursor-pointer group">
     <ellipse cx="150" cy="100" rx="150" ry="100" fill="#bbf7d0" />
     <ellipse cx="150" cy="100" rx="130" ry="80" fill="none" stroke="#86efac" strokeWidth="8" />
     <ellipse cx="100" cy="100" rx="20" ry="30" fill="#38bdf8" opacity="0.8" />
     <ellipse cx="200" cy="80" rx="25" ry="15" fill="#38bdf8" opacity="0.8" />
     <text x="150" y="105" fill="#16a34a" fontSize="16" fontWeight="bold" textAnchor="middle" className="tracking-widest opacity-80">EMIRATES HILLS</text>
     {Array.from({length: 12}).map((_, i) => (
        <g key={i} transform={\`translate(150, 100) rotate(\${i * 30}) translate(0, -60)\`}>
           <GreenVilla x={-12} y={-12} />
        </g>
     ))}
  </svg>
);
`;
code = code.replace(/const JVCBlock = \(\) => \([\s\S]*?<\/svg>\n\);/, ehBlock);
code = code.replace(/if \(type === 'community-jvc'\) return <JVCBlock \/>;/, "if (type === 'community-emirates-hills') return <EmiratesHillsBlock />;");
code = code.replace(/"community-jvc": \[[\s\S]*?\],/, '"community-emirates-hills": [\n    { label: "Buy Lake Mansion", amount: -25000000, color: "bg-emerald-600" },\n    { label: "Play Golf", amount: -1500, color: "bg-blue-600" }\n  ],');

// 6. Add Deira Community
const deiraBlock = `
const DeiraBlock = () => (
  <svg viewBox="0 0 300 200" className="w-[200px] h-[130px] drop-shadow-xl z-10 relative cursor-pointer group">
     <path d="M 0 50 Q 150 0 300 50 L 300 200 L 0 200 Z" fill="#d6d3d1" stroke="#a8a29e" strokeWidth="4" />
     <text x="150" y="100" fill="#78716c" fontSize="20" fontWeight="bold" textAnchor="middle" className="tracking-widest opacity-80">DEIRA & SOUKS</text>
     {Array.from({length: 24}).map((_, i) => (
        <rect key={i} x={30 + (i%8)*30} y={120 + Math.floor(i/8)*25} width="20" height="15" fill="#a8a29e" rx="2" />
     ))}
     <rect x="30" y="50" width="240" height="15" fill="#fbbf24" rx="2" />
     <text x="150" y="61" fill="#b45309" fontSize="10" fontWeight="bold" textAnchor="middle">GOLD SOUK</text>
  </svg>
);
`;
code = code.replace('const MotorCityBlock', deiraBlock + '\nconst MotorCityBlock');
code = code.replace("if (type === 'community-dubai-hills') return <DubaiHillsBlock />;", "if (type === 'community-dubai-hills') return <DubaiHillsBlock />;\n  if (type === 'community-deira') return <DeiraBlock />;");
code = code.replace(/"community-dubai-hills": \[[\s\S]*?\],/, '"community-dubai-hills": [\n    { label: "Buy Golf Villa", amount: -8000000, color: "bg-emerald-600" },\n    { label: "Play 18 Holes", amount: -1200, color: "bg-green-600" }\n  ],\n  "community-deira": [\n    { label: "Buy Gold Shop", amount: -1500000, color: "bg-yellow-600" },\n    { label: "Ride Abra", amount: -20, color: "bg-cyan-600" }\n  ],');

// Add Deira to venues list
code = code.replace(/\{ id: "dxb".*?\}/, '{ id: "deira", name: "Deira & Old Dubai", type: "community-deira", virtualX: 2800, virtualY: 350 },\n        $&');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Rewrite successful!");
