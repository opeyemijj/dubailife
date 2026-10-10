const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const updatedPalmCode = `
const PalmCommunityBlock = () => (
  <svg viewBox="0 0 400 400" className="w-[350px] h-[350px] drop-shadow-2xl z-20 relative cursor-pointer group">
     <path d="M 30 200 A 170 170 0 1 1 370 200" fill="none" stroke="#E3CDA4" strokeWidth="35" strokeLinecap="round" />
     <line x1="200" y1="30" x2="200" y2="150" stroke="#94a3b8" strokeWidth="6" strokeDasharray="5,5" />
     <rect x="175" y="140" width="50" height="260" fill="#E3CDA4" />
     {Array.from({length: 8}).map((_, i) => {
        const y = 160 + i * 26;
        return (
           <g key={i}>
              <path d={\`M 200 \${y} Q 110 \${y} 50 \${y - 45}\`} fill="none" stroke="#E3CDA4" strokeWidth="18" strokeLinecap="round" />
              <path d={\`M 200 \${y} Q 290 \${y} 350 \${y - 45}\`} fill="none" stroke="#E3CDA4" strokeWidth="18" strokeLinecap="round" />
           </g>
        )
     })}
     <rect x="196" y="140" width="8" height="260" fill="#94a3b8" />
     <g transform="translate(160, -5)">
        <rect x="10" y="15" width="60" height="35" fill="#f43f5e" rx="4" />
        <rect x="30" y="25" width="20" height="25" fill="#E3CDA4" /> 
        <rect x="0" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <rect x="65" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <polygon points="0,15 7.5,-5 15,15" fill="#9f1239" />
        <polygon points="65,15 72.5,-5 80,15" fill="#9f1239" />
        <polygon points="25,15 40,0 55,15" fill="#9f1239" />
        <text x="40" y="65" fill="#9f1239" fontSize="12" fontWeight="black" textAnchor="middle" className="drop-shadow-md">ATLANTIS</text>
     </g>
     {Array.from({length: 6}).map((_, i) => {
        const y = 160 + i * 26;
        return (
           <g key={\`villas-\${i}\`}>
              <g transform={\`translate(130, \${y - 30}) scale(0.4)\`}><VillaHouse x={0} y={0} /></g>
              <g transform={\`translate(90, \${y - 40}) scale(0.4)\`}><VillaHouse x={0} y={0} /></g>
              <g transform={\`translate(250, \${y - 30}) scale(0.4)\`}><VillaHouse x={0} y={0} /></g>
              <g transform={\`translate(290, \${y - 40}) scale(0.4)\`}><VillaHouse x={0} y={0} /></g>
           </g>
        )
     })}
     <text x="200" y="320" fill="#16a34a" fontSize="16" fontWeight="black" textAnchor="middle" transform="rotate(-90 200 320)" className="tracking-widest drop-shadow-md">PALM JUMEIRAH</text>
  </svg>
);
`;

code = code.replace(/const MotorCityBlock = [\s\S]*?;/, match => match + '\n' + updatedPalmCode);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Restored Palm again");
