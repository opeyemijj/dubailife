const fs = require('fs');

const code = `
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

  return (
    <svg viewBox="0 0 300 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30">
      {/* Base Platform */}
      <path d="M 5 5 L 295 5 L 295 245 L 5 245 Z" fill="#84cc6d" stroke="#ffffff" strokeWidth="6" rx="2" />
      
      {/* Pool Amenity */}
      {hasPool && (
        <g transform="translate(190, 20)">
           <rect x="0" y="0" width="80" height="50" fill="#e2e8f0" />
           <rect x="5" y="5" width="70" height="40" fill="#38bdf8" />
           <circle cx="20" cy="55" r="5" fill="#ef4444" />
           <circle cx="35" cy="55" r="5" fill="#eab308" />
           <circle cx="50" cy="55" r="5" fill="#3b82f6" />
        </g>
      )}

      {/* Court Amenity */}
      {hasCourt && (
        <g transform="translate(180, 160)">
           <rect x="0" y="0" width="100" height="60" fill="#d94625" />
           <rect x="5" y="5" width="90" height="50" fill="#22c55e" />
           <rect x="49" y="5" width="2" height="50" fill="#ffffff" />
        </g>
      )}

      {/* Parking Amenity */}
      {hasParking && (
        <g transform="translate(20, 190)">
           <rect x="0" y="0" width="80" height="40" fill="#475569" />
           <rect x="10" y="5" width="20" height="30" fill="#f8fafc" rx="2" />
           <rect x="12" y="10" width="16" height="20" fill="#0f172a" />
           <rect x="40" y="5" width="20" height="30" fill="#2563eb" rx="2" />
           <rect x="42" y="10" width="16" height="20" fill="#0f172a" />
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
            <polygon points="0,-15 12,-8 15,5 8,15 -8,15 -15,5 -12,-8" fill="#15803d" />
         </g>
      ))}

      {/* Interactive Units */}
      
      {/* Unit A: Tower */}
      <g transform="translate(20, 20)" className={onUnitClick ? "cursor-pointer hover:opacity-80" : ""} onClick={(e) => handleUnitClick(e, 'tower-a', 'Tower A')}>
         <rect x="0" y="0" width="40" height="110" fill="#94a3b8" />
         <rect x="0" y="0" width="40" height="15" fill="#1e293b" />
         <rect x="0" y="100" width="40" height="10" fill="#1e293b" />
         {[1,2,3,4,5,6,7].map(i => <rect key={i} x="5" y={15 + i*10} width="30" height="5" fill="#38bdf8" />)}
         <text x="20" y="10" fill="#ffffff" fontSize="8" textAnchor="middle">A</text>
      </g>

      {/* Unit B: Mid-rise */}
      <g transform="translate(80, 70)" className={onUnitClick ? "cursor-pointer hover:opacity-80" : ""} onClick={(e) => handleUnitClick(e, 'midrise-b', 'Midrise B')}>
         <rect x="0" y="0" width="35" height="60" fill="#60a5fa" />
         <rect x="-2" y="-5" width="39" height="15" fill="#1e293b" transform="skewY(-10)" />
         <rect x="5" y="15" width="8" height="6" fill="#1e293b" />
         <rect x="20" y="15" width="8" height="6" fill="#1e293b" />
         <rect x="20" y="30" width="8" height="6" fill="#1e293b" />
         <rect x="5" y="45" width="8" height="6" fill="#1e293b" />
         <text x="18" y="2" fill="#ffffff" fontSize="8" textAnchor="middle">B</text>
      </g>

      {/* Unit C: Townhouse 1 */}
      <g transform="translate(90, 160)" className={onUnitClick ? "cursor-pointer hover:opacity-80" : ""} onClick={(e) => handleUnitClick(e, 'townhouse-c1', 'Townhouse C1')}>
         <rect x="0" y="15" width="35" height="30" fill="#d6d3d1" />
         <polygon points="-5,15 17,0 40,15" fill="#c2410c" />
         <text x="17" y="13" fill="#ffffff" fontSize="8" textAnchor="middle">C1</text>
      </g>

      {/* Unit C: Townhouse 2 */}
      <g transform="translate(135, 160)" className={onUnitClick ? "cursor-pointer hover:opacity-80" : ""} onClick={(e) => handleUnitClick(e, 'townhouse-c2', 'Townhouse C2')}>
         <rect x="0" y="15" width="35" height="30" fill="#d6d3d1" />
         <polygon points="-5,15 17,0 40,15" fill="#c2410c" />
         <text x="17" y="13" fill="#ffffff" fontSize="8" textAnchor="middle">C2</text>
      </g>

    </svg>
  );
};
`;

let iconsCode = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');
fs.writeFileSync('src/components/map/Icons.tsx', iconsCode + '\n' + code);
console.log("Added ConfigurableApartmentBlock");
