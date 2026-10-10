const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Add Bluewaters component
const bluewatersCode = `
const BluewatersBlock = () => (
  <svg viewBox="0 0 200 200" className="w-[180px] h-[180px] drop-shadow-xl z-20 relative cursor-pointer group">
     {/* Island Base */}
     <ellipse cx="100" cy="110" rx="90" ry="60" fill="#E3CDA4" />
     
     {/* Apartments/Retail */}
     <g transform="translate(40, 130) scale(0.3)"><ApartmentHouse x={0} y={0} /></g>
     <g transform="translate(80, 140) scale(0.3)"><ApartmentHouse x={0} y={0} /></g>
     <g transform="translate(120, 130) scale(0.3)"><ApartmentHouse x={0} y={0} /></g>

     {/* Ain Dubai */}
     {/* A-Frame Legs */}
     <path d="M 60 140 L 100 70 L 140 140" fill="none" stroke="#64748b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
     <path d="M 70 140 L 100 70 L 130 140" fill="none" stroke="#94a3b8" strokeWidth="4" />
     
     {/* Wheel Rim */}
     <circle cx="100" cy="70" r="55" fill="none" stroke="#cbd5e1" strokeWidth="5" />
     
     {/* Spokes & Pods */}
     {Array.from({length: 16}).map((_, i) => {
        const angle = i * Math.PI / 8;
        const cx = 100 + 55 * Math.cos(angle);
        const cy = 70 + 55 * Math.sin(angle);
        return (
           <g key={\`spoke-\${i}\`}>
              <line x1="100" y1="70" x2={cx} y2={cy} stroke="#e2e8f0" strokeWidth="1" />
              <circle cx={cx} cy={cy} r="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.5" />
           </g>
        )
     })}
     <circle cx="100" cy="70" r="4" fill="#64748b" />
     
     <text x="100" y="190" fill="#16a34a" fontSize="12" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-md">BLUEWATERS</text>
  </svg>
);
`;

code = code.replace(/const ArabianRanchesBlock = [\s\S]*?;/, match => bluewatersCode + '\n' + match);

// 2. Add Apartments to Palm Jumeirah trunk
const palmApts = `
     {/* Shoreline Apartments on Trunk */}
     {Array.from({length: 6}).map((_, i) => (
        <g key={\`apt-l-\${i}\`}>
           <g transform={\`translate(214, \${150 + i * 35}) scale(0.5)\`}><ApartmentHouse x={0} y={0} /></g>
        </g>
     ))}
     {Array.from({length: 6}).map((_, i) => (
        <g key={\`apt-r-\${i}\`}>
           <g transform={\`translate(262, \${150 + i * 35}) scale(0.5)\`}><ApartmentHouse x={0} y={0} /></g>
        </g>
     ))}
     
     {/* Base Trunk label */}
`;
code = code.replace(/\{\/\* Base Trunk label \*\/\}/, palmApts);

// 3. Add to venues
code = code.replace(/\{ id: "jbr"[\s\S]*?\}/, '{ id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 350, virtualY: 1470 },\n        { id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 450, virtualY: 1315 }');

// 4. Add to getBuildingSprite
code = code.replace(/if \(type === 'community-jbr'\) return <JBRBlock \/>;/, "if (type === 'community-jbr') return <JBRBlock />;\n  if (type === 'community-bluewaters') return <BluewatersBlock />;\n");

// 5. Add Bridge to SVG background
const bridgeCode = `
                {/* Bluewaters Bridge */}
                <path d="M 450 1315 L 350 1470" fill="none" stroke="#64748b" strokeWidth="8" />
                <path d="M 450 1315 L 350 1470" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" />
                
                {/* Palm Bridge (Over water) */}
`;
code = code.replace(/\{\/\* Palm Bridge \(Over water\) \*\/\}/, bridgeCode);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Added Bluewaters and Palm apartments");
