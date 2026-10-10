const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const targetStr = /export const ConfigurableApartmentBlock = \(\{[\s\S]*?<\/svg>\n  \);\n\};\n/;

const isoSVG = `
export const ConfigurableApartmentBlock = ({ 
  width = 300, 
  height = 250,
  hasPool = true,
  hasParking = true,
  hasCourt = true,
  onUnitClick = undefined
}: any) => {
  const handleUnitClick = (e: any, unitId: string, unitName: string) => {
    if (onUnitClick) {
      e.stopPropagation();
      onUnitClick(unitId, unitName);
    }
  };

  const ox = 25;
  const oy = 35;

  return (
    <svg viewBox="0 0 320 280" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30 hover:scale-105 transition-transform">
      
      {/* 3D Base Platform */}
      <polygon points="5,245 295,245 305,255 15,255" fill="#4ade80" />
      <polygon points="295,5 305,15 305,255 295,245" fill="#22c55e" />
      <polygon points="5,5 295,5 295,245 5,245" fill="#84cc6d" stroke="#ffffff" strokeWidth="2" />
      
      {/* Pool Amenity */}
      {hasPool && (
        <g transform="translate(190, 40)">
           <rect x="0" y="0" width="80" height="50" fill="#e2e8f0" />
           <polygon points="5,5 75,5 75,45 5,45" fill="#0284c7" />
           <polygon points="5,45 75,45 70,40 10,40" fill="#0369a1" />
           <polygon points="5,5 10,10 10,40 5,45" fill="#0ea5e9" />
           <polygon points="10,10 75,10 75,40 10,40" fill="#38bdf8" />
           
           <g transform="translate(20, 55)">
             <path d="M -5 5 L 0 0 L 5 5 Z" fill="#ef4444" />
             <rect x="-1" y="5" width="2" height="4" fill="#64748b" />
           </g>
           <g transform="translate(35, 55)">
             <path d="M -5 5 L 0 0 L 5 5 Z" fill="#eab308" />
             <rect x="-1" y="5" width="2" height="4" fill="#64748b" />
           </g>
           <g transform="translate(50, 55)">
             <path d="M -5 5 L 0 0 L 5 5 Z" fill="#3b82f6" />
             <rect x="-1" y="5" width="2" height="4" fill="#64748b" />
           </g>
        </g>
      )}

      {/* Court Amenity */}
      {hasCourt && (
        <g transform="translate(180, 160)">
           <polygon points="0,0 100,0 105,5 5,5" fill="#c2410c" />
           <polygon points="100,0 105,5 105,65 100,60" fill="#a33a0c" />
           <polygon points="0,0 100,0 100,60 0,60" fill="#d94625" />
           
           <rect x="5" y="5" width="90" height="50" fill="#22c55e" />
           <rect x="49" y="5" width="2" height="50" fill="#ffffff" />
        </g>
      )}

      {/* Parking Amenity */}
      {hasParking && (
        <g transform="translate(20, 190)">
           <polygon points="0,0 80,0 85,5 5,5" fill="#334155" />
           <polygon points="80,0 85,5 85,45 80,40" fill="#1e293b" />
           <rect x="0" y="0" width="80" height="40" fill="#475569" />
           
           <g transform="translate(10, 5)">
              <rect x="0" y="0" width="20" height="30" fill="#f8fafc" />
              <polygon points="20,0 24,-4 24,26 20,30" fill="#cbd5e1" />
              <polygon points="0,0 20,0 24,-4 4,-4" fill="#e2e8f0" />
              <rect x="2" y="5" width="16" height="20" fill="#0f172a" />
           </g>
           <g transform="translate(40, 5)">
              <rect x="0" y="0" width="20" height="30" fill="#2563eb" />
              <polygon points="20,0 24,-4 24,26 20,30" fill="#1d4ed8" />
              <polygon points="0,0 20,0 24,-4 4,-4" fill="#3b82f6" />
              <rect x="2" y="5" width="16" height="20" fill="#0f172a" />
           </g>
        </g>
      )}

      {/* Pathways */}
      <rect x="5" y="130" width="290" height="15" fill="#cbd5e1" />
      <rect x="50" y="145" width="15" height="100" fill="#cbd5e1" />

      {/* Trees */}
      {[
         [15, 120], [80, 120], [130, 120], [180, 120], [240, 120],
         [20, 160], [20, 200]
      ].map((pos, i) => (
         <g key={i} transform={\`translate(\${pos[0]}, \${pos[1]}) scale(0.65)\`}>
            <rect x="-2" y="0" width="4" height="15" fill="#78350f" />
            <polygon points="2,0 5,-3 5,12 2,15" fill="#451a03" />
            <polygon points="-10,-10 0,-15 10,-10 10,0 0,5 -10,0" fill="#16a34a" />
            <polygon points="10,-10 10,0 15,-5 15,-15" fill="#15803d" />
            <polygon points="0,-15 10,-10 15,-15 5,-20" fill="#22c55e" />
         </g>
      ))}

      {/* Unit A: Tower */}
      <g transform="translate(30, 90)" className={onUnitClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} onClick={(e) => handleUnitClick(e, 'tower-a', 'Tower A')}>
         <polygon points="40,0 60,-30 60,80 40,110" fill="#64748b" />
         <polygon points="0,0 40,0 60,-30 20,-30" fill="#cbd5e1" />
         <polygon points="10,-5 25,-5 35,-15 20,-15" fill="#475569" />
         <rect x="0" y="0" width="40" height="110" fill="#94a3b8" />
         
         <rect x="0" y="0" width="40" height="15" fill="#1e293b" />
         <rect x="0" y="100" width="40" height="10" fill="#1e293b" />
         {[1,2,3,4,5,6,7].map(i => <rect key={i} x="5" y={15 + i*10} width="30" height="5" fill="#38bdf8" />)}
         
         {[1,2,3,4,5,6,7].map(i => (
           <polygon key={i} points={\`45,\${12 + i*10 - 7.5} 55,\${12 + i*10 - 15} 55,\${17 + i*10 - 15} 45,\${17 + i*10 - 7.5}\`} fill="#0ea5e9" />
         ))}

         <g transform="translate(20, -50)">
            <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#334155" strokeWidth="2" />
            <text x="0" y="3" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">A</text>
         </g>
      </g>

      {/* Unit B: Mid-rise */}
      <g transform="translate(110, 100)" className={onUnitClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} onClick={(e) => handleUnitClick(e, 'midrise-b', 'Midrise B')}>
         <polygon points="45,0 65,-25 65,55 45,80" fill="#2563eb" />
         <polygon points="0,0 45,0 65,-25 20,-25" fill="#93c5fd" />
         <polygon points="15,-5 30,-5 40,-15 25,-15" fill="#1e40af" />
         <rect x="0" y="0" width="45" height="80" fill="#3b82f6" />
         
         <rect x="0" y="0" width="45" height="15" fill="#1e293b" />
         <rect x="6" y="25" width="12" height="10" fill="#1e293b" />
         <rect x="27" y="25" width="12" height="10" fill="#1e293b" />
         <rect x="6" y="45" width="12" height="10" fill="#1e293b" />
         <rect x="27" y="45" width="12" height="10" fill="#1e293b" />

         <g transform="translate(22, -40)">
            <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#334155" strokeWidth="2" />
            <text x="0" y="3" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">B</text>
         </g>
      </g>

      {/* Unit C: Townhouses */}
      <g transform="translate(170, 160)" className={onUnitClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} onClick={(e) => handleUnitClick(e, 'townhouse-c1', 'Townhouse C1')}>
         <polygon points="35,15 50,0 50,30 35,45" fill="#a8a29e" />
         <polygon points="-5,15 20,-10 50,0 35,15" fill="#ea580c" />
         <polygon points="-5,15 17,0 40,15" fill="#c2410c" />
         <rect x="0" y="15" width="35" height="30" fill="#d6d3d1" />
         
         <g transform="translate(17, -15)">
            <circle cx="0" cy="0" r="8" fill="#ffffff" stroke="#334155" strokeWidth="1" />
            <text x="0" y="3" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">C1</text>
         </g>
      </g>

      <g transform="translate(230, 160)" className={onUnitClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} onClick={(e) => handleUnitClick(e, 'townhouse-c2', 'Townhouse C2')}>
         <polygon points="35,15 50,0 50,30 35,45" fill="#a8a29e" />
         <polygon points="-5,15 20,-10 50,0 35,15" fill="#ea580c" />
         <polygon points="-5,15 17,0 40,15" fill="#c2410c" />
         <rect x="0" y="15" width="35" height="30" fill="#d6d3d1" />
         
         <g transform="translate(17, -15)">
            <circle cx="0" cy="0" r="8" fill="#ffffff" stroke="#334155" strokeWidth="1" />
            <text x="0" y="3" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">C2</text>
         </g>
      </g>

    </svg>
  );
};
`

if (targetStr.test(code)) {
  code = code.replace(targetStr, isoSVG);
  fs.writeFileSync('src/components/map/Icons.tsx', code);
  console.log("Restored exact isometric ConfigurableApartmentBlock!");
} else {
  console.log("Could not find target block to replace.");
}
