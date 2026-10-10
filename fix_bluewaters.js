const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const bluewatersCode = `
const BluewatersBlock = () => (
  <svg viewBox="0 0 200 200" className="w-[200px] h-[200px] drop-shadow-xl z-20 relative cursor-pointer group">
     {/* Island Base */}
     <ellipse cx="100" cy="110" rx="90" ry="70" fill="#E3CDA4" />
     
     {/* Banyan Tree / Caesars Palace Hotel */}
     <g transform="translate(60, 120)">
        <rect x="0" y="0" width="80" height="25" fill="#f8fafc" rx="4" />
        <rect x="10" y="-15" width="15" height="40" fill="#e2e8f0" rx="2" />
        <rect x="32.5" y="-20" width="15" height="45" fill="#cbd5e1" rx="2" />
        <rect x="55" y="-15" width="15" height="40" fill="#e2e8f0" rx="2" />
        <text x="40" y="18" fill="#475569" fontSize="9" fontWeight="black" textAnchor="middle" className="drop-shadow-sm">HOTEL</text>
     </g>
     
     {/* Bluewaters Residences */}
     <g transform="translate(20, 150) scale(0.4)"><ApartmentHouse x={0} y={0} /></g>
     <g transform="translate(55, 160) scale(0.4)"><ApartmentHouse x={0} y={0} /></g>
     <g transform="translate(90, 165) scale(0.4)"><ApartmentHouse x={0} y={0} /></g>
     <g transform="translate(125, 160) scale(0.4)"><ApartmentHouse x={0} y={0} /></g>
     <g transform="translate(160, 150) scale(0.4)"><ApartmentHouse x={0} y={0} /></g>

     {/* Ain Dubai */}
     {/* A-Frame Legs */}
     <path d="M 60 110 L 100 50 L 140 110" fill="none" stroke="#64748b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
     <path d="M 70 110 L 100 50 L 130 110" fill="none" stroke="#94a3b8" strokeWidth="4" />
     
     {/* Wheel Rim */}
     <circle cx="100" cy="50" r="45" fill="none" stroke="#cbd5e1" strokeWidth="5" />
     
     {/* Spokes & Pods */}
     {Array.from({length: 16}).map((_, i) => {
        const angle = i * Math.PI / 8;
        const cx = 100 + 45 * Math.cos(angle);
        const cy = 50 + 45 * Math.sin(angle);
        return (
           <g key={\`spoke-\${i}\`}>
              <line x1="100" y1="50" x2={cx} y2={cy} stroke="#e2e8f0" strokeWidth="1" />
              <circle cx={cx} cy={cy} r="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.5" />
           </g>
        )
     })}
     <circle cx="100" cy="50" r="4" fill="#64748b" />
     
     <text x="100" y="195" fill="#16a34a" fontSize="14" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-md">BLUEWATERS</text>
  </svg>
);
`;

code = code.replace(/const BluewatersBlock = \(\) => \([\s\S]*?<\/svg>\n\);/, bluewatersCode);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated Bluewaters with distinct Hotel and Residences.");
