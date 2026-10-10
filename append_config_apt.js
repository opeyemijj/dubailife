const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

if (!code.includes('export const ConfigurableApartmentBlock')) {
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
    const row = Math.floor(i / 3);
    const col = i % 3;
    const gx = -20 + col * 40;
    const gy = -20 + row * 40;
    const h = 40 + (Math.sin(i * 45) * 20);
    return { id: \`unit-\${i+1}\`, name: \`Unit \${i+1}\`, gx, gy, w: 15, d: 15, h };
  });

  buildings.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  const floorCenter = { x: 150, y: 120 };
  
  return (
    <svg viewBox="0 0 300 300" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30">
      
      <g transform={\`translate(\${floorCenter.x}, \${floorCenter.y})\`}>
        <polygon points="-120,0 0,60 0,70 -120,10" fill="#166534" />
        <polygon points="0,60 120,0 120,10 0,70" fill="#14532d" />
        <polygon points="0,-60 -120,0 0,60 120,0" fill="#22c55e" stroke="#86efac" strokeWidth="2" />
        
        <text x="0" y="45" fill="#14532d" fontSize="16" fontWeight="900" textAnchor="middle" transform="scale(1, 0.5) rotate(0)">{name.toUpperCase()}</text>
      </g>

      {hasPool && (
        <g transform={\`translate(\${floorCenter.x - 40}, \${floorCenter.y + 10})\`}>
           <polygon points="0,-15 -30,0 0,15 30,0" fill="#94a3b8" />
           <polygon points="0,-12 -25,0 0,12 25,0" fill="#0ea5e9" />
        </g>
      )}

      {hasCourt && (
        <g transform={\`translate(\${floorCenter.x + 40}, \${floorCenter.y - 10})\`}>
           <polygon points="0,-20 -30,-5 0,10 30,-5" fill="#ea580c" />
           <polygon points="0,-18 -28,-4 0,8 28,-4" fill="#22c55e" />
           <path d="M -14,-6 L 14,8 M 0,-18 L 0,8" stroke="#ffffff" strokeWidth="0.5" />
        </g>
      )}

      {buildings.map((b) => {
        const {x, y} = isoToScreen(b.gx, b.gy);
        return (
          <IsoBuilding 
            key={b.id} 
            x={x} y={y - 20} 
            w={b.w} d={b.d} h={b.h} 
            color={color} 
            name={b.name} 
            onClick={(e) => handleUnitClick(e, b.id, b.name)} 
          />
        );
      })}

    </svg>
  );
};
`;
  fs.writeFileSync('src/components/map/Icons.tsx', code + '\n' + configAptCode);
  console.log("Restored ConfigurableApartmentBlock");
} else {
  console.log("Already present");
}
