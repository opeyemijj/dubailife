const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const updatedPalmCode = `
const PalmCommunityBlock = () => (
  <svg viewBox="0 0 500 500" className="w-[400px] h-[400px] drop-shadow-2xl z-20 relative cursor-pointer group">
     {/* 3-Part Crescent Breakwater */}
     <path d="M 110 95 A 220 220 0 0 1 390 95" fill="none" stroke="#E3CDA4" strokeWidth="35" strokeLinecap="round" />
     <path d="M 90 110 A 220 220 0 0 0 70 400" fill="none" stroke="#E3CDA4" strokeWidth="30" strokeLinecap="round" />
     <path d="M 410 110 A 220 220 0 0 1 430 400" fill="none" stroke="#E3CDA4" strokeWidth="30" strokeLinecap="round" />
     
     {/* Subsea tunnel (visual line) */}
     <line x1="250" y1="50" x2="250" y2="150" stroke="#94a3b8" strokeWidth="6" strokeDasharray="5,5" />
     
     {/* Trunk Main */}
     <rect x="210" y="140" width="80" height="280" fill="#E3CDA4" />
     {/* Trunk Base Wings */}
     <rect x="170" y="370" width="160" height="30" rx="10" fill="#E3CDA4" />
     <rect x="190" y="410" width="120" height="20" rx="6" fill="#E3CDA4" />
     
     {/* 16 Fronds */}
     {Array.from({length: 8}).map((_, i) => {
        const y = 160 + i * 27;
        return (
           <g key={i}>
              <path d={\`M 230 \${y} Q 110 \${y+10} 70 \${y - 30}\`} fill="none" stroke="#E3CDA4" strokeWidth="24" strokeLinecap="round" />
              <path d={\`M 270 \${y} Q 390 \${y+10} 430 \${y - 30}\`} fill="none" stroke="#E3CDA4" strokeWidth="24" strokeLinecap="round" />
           </g>
        )
     })}

     {/* Monorail / Road */}
     <rect x="246" y="140" width="8" height="310" fill="#94a3b8" />
     
     {/* Atlantis The Palm */}
     <g transform="translate(210, 15)">
        <rect x="10" y="15" width="60" height="35" fill="#f43f5e" rx="4" />
        <rect x="30" y="25" width="20" height="25" fill="#E3CDA4" /> 
        <rect x="0" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <rect x="65" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <polygon points="0,15 7.5,-5 15,15" fill="#9f1239" />
        <polygon points="65,15 72.5,-5 80,15" fill="#9f1239" />
        <polygon points="25,15 40,0 55,15" fill="#9f1239" />
        <text x="40" y="65" fill="#9f1239" fontSize="12" fontWeight="black" textAnchor="middle" className="drop-shadow-md">ATLANTIS</text>
     </g>

     {/* Tycoon Villas on the Fronds */}
     {Array.from({length: 8}).map((_, i) => {
        const y = 160 + i * 27;
        return (
           <g key={\`villas-\${i}\`}>
              <g transform={\`translate(170, \${y - 20}) scale(0.4)\`}><VillaHouse x={0} y={0} /></g>
              <g transform={\`translate(110, \${y - 25}) scale(0.4)\`}><VillaHouse x={0} y={0} /></g>
              
              <g transform={\`translate(330, \${y - 20}) scale(0.4)\`}><VillaHouse x={0} y={0} /></g>
              <g transform={\`translate(390, \${y - 25}) scale(0.4)\`}><VillaHouse x={0} y={0} /></g>
           </g>
        )
     })}
     
     {/* Base Trunk label */}
     <text x="250" y="340" fill="#16a34a" fontSize="20" fontWeight="black" textAnchor="middle" transform="rotate(-90 250 340)" className="tracking-widest drop-shadow-md">PALM JUMEIRAH</text>
  </svg>
);
`;

code = code.replace(/const PalmCommunityBlock = \(\) => \([\s\S]*?<\/svg>\n\);/, updatedPalmCode);
code = code.replace(/\{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: [0-9]+ \}/, '{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: 1590 }');

// Update Bridge
const newBridge = `
                {/* Palm Bridge (Over water) */}
                <path d="M 750 1280 L 750 1420" fill="none" stroke="#cbd5e1" strokeWidth="12" />
                <path d="M 750 1280 L 750 1420" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 6" />
                
                {/* Jumeirah Coast Road */}
`;
code = code.replace(/\{\/\* Palm Gateway Interlink \*\/\}[\s\S]*?\{\/\* Jumeirah Coast Road \*\/\}/, newBridge);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated Palm Jumeirah to exactly match satellite shape and made it float on water.");
