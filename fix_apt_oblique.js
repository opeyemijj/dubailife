const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const configAptCode = `
export const ConfigurableApartmentBlock = ({ 
  width = 300, 
  height = 250,
  hasPool = true,
  hasParking = true,
  hasCourt = true,
  numBuildings = 3,
  color = "#3b82f6",
  name = "Community",
  onUnitClick = undefined
}: any) => {
  const handleUnitClick = (e: any, unitId: string, unitName: string) => {
    if (onUnitClick) {
      e.stopPropagation();
      onUnitClick(unitId, unitName);
    }
  };

  const buildings = Array.from({length: Math.min(numBuildings, 12)}).map((_, i) => {
    const bW = 45;
    const spacing = 20;
    const totalW = (bW + spacing) * numBuildings;
    const startX = (300 - totalW) / 2;
    const x = startX + i * (bW + spacing);
    const h = 50 + (i % 3) * 30; // 50, 80, 110...
    return { id: \`unit-\${i+1}\`, name: \`Unit \${i+1}\`, x, y: 100, w: bW, h };
  });

  return (
    <svg viewBox="0 0 300 300" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30">
      <SimpleBase w={290} h={260} color="#84cc6d" thickColor="#4ade80" rightColor="#22c55e" name={name} />
      
      {hasPool && (
        <g transform="translate(150, 150)">
           <rect x="0" y="0" width="120" height="70" fill="#e2e8f0" />
           <rect x="10" y="10" width="100" height="50" fill="#38bdf8" />
           <circle cx="30" cy="80" r="12" fill="#ef4444" />
           <circle cx="60" cy="80" r="12" fill="#eab308" />
           <circle cx="90" cy="80" r="12" fill="#3b82f6" />
        </g>
      )}

      {hasParking && (
        <g transform="translate(10, 180)">
           <rect x="0" y="0" width="80" height="70" fill="#475569" />
           <rect x="5" y="10" width="20" height="40" fill="#f8fafc" />
           <rect x="30" y="10" width="20" height="40" fill="#0f172a" />
           <rect x="55" y="10" width="20" height="40" fill="#3b82f6" />
        </g>
      )}

      {hasCourt && (
        <g transform="translate(160, 20)">
           <rect x="0" y="0" width="100" height="60" fill="#c2410c" />
           <rect x="5" y="5" width="90" height="50" fill="#22c55e" />
           <rect x="49" y="5" width="2" height="50" fill="#ffffff" />
        </g>
      )}

      {/* Trees */}
      <polygon points="120,180 140,150 160,180" fill="#15803d" />
      <polygon points="125,185 140,160 155,185" fill="#16a34a" />
      
      <polygon points="250,180 270,150 290,180" fill="#15803d" />
      <polygon points="255,185 270,160 285,185" fill="#16a34a" />

      {buildings.map((b) => (
        <g key={b.id} onClick={(e) => handleUnitClick(e, b.id, b.name)} className={onUnitClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}>
          <SimpleBuilding 
            x={b.x} y={b.y - b.h} 
            w={b.w} h={b.h} dX={15} dY={-15} 
            fColor={color} rColor="#64748b" tColor="#1e293b" 
          />
        </g>
      ))}
    </svg>
  );
};
`;

const aptComplexCode = `
export const ApartmentComplexBlock = ({ width = 250, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 300 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform z-30">
      <SimpleBase w={280} h={230} color="#22c55e" thickColor="#166534" rightColor="#15803d" name="UNIVERSITY APTS" />
      <ellipse cx="140" cy="150" rx="80" ry="40" fill="none" stroke="#ea580c" strokeWidth="6" />
      <ellipse cx="140" cy="150" rx="76" ry="36" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="4,4" />
      
      <SimpleBuilding x={40} y={100-60} w={40} h={60} fColor="#94a3b8" rColor="#64748b" tColor="#ef4444" />
      <SimpleBuilding x={110} y={100-60} w={40} h={60} fColor="#94a3b8" rColor="#64748b" tColor="#ef4444" />
      <SimpleBuilding x={180} y={100-60} w={40} h={60} fColor="#94a3b8" rColor="#64748b" tColor="#ef4444" />
      
      <SimpleBuilding x={70} y={200-30} w={30} h={30} fColor="#cbd5e1" rColor="#94a3b8" tColor="#ef4444" />
      <SimpleBuilding x={130} y={200-30} w={30} h={30} fColor="#cbd5e1" rColor="#94a3b8" tColor="#ef4444" />
    </svg>
  );
};
`;

code = code.replace(/export const ConfigurableApartmentBlock = \(\{[\s\S]*?\n\};\n/, configAptCode);
code = code.replace(/export const ApartmentComplexBlock = \(\{[\s\S]*?\n\};\n/, aptComplexCode);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Rewrote Apartments to Simple Oblique");
