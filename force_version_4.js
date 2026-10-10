const fs = require('fs');

let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Replace the pseudo-3D ConfigurableApartmentBlock with the true isometric one.
const pseudoStr = /export const ConfigurableApartmentBlock = \(\{[\s\S]*?<\/svg>\n  \);\n\};\n/;

const trueIsoCode = `
const IsoBuilding = ({ x, y, w, d, h, color, name, onClick }: any) => {
  const leftColor = "#94a3b8";
  const rightColor = color || "#3b82f6";
  const roofColor = "#e2e8f0";

  return (
    <g transform={\`translate(\${x}, \${y})\`} className={onClick ? "cursor-pointer hover:scale-105 transition-transform" : ""} onClick={onClick}>
      <polygon points={\`0,0 -\${w},-\${w/2} -\${w},-\${w/2+h} 0,-\${h}\`} fill={leftColor} stroke="#64748b" strokeWidth="0.5" />
      <polygon points={\`0,0 \${d},-\${d/2} \${d},-\${d/2+h} 0,-\${h}\`} fill={rightColor} stroke="#1e40af" strokeWidth="0.5" />
      <polygon points={\`0,-\${h} -\${w},-\${w/2+h} 0,-\${w/2+d/2+h} \${d},-\${d/2+h}\`} fill={roofColor} stroke="#cbd5e1" strokeWidth="0.5" />
      
      <polygon points={\`-2,-\${w/2+2} -\${w-2},-\${w/2+2} -\${w-2},-\${w/2+h-4} -2,-\${h-4}\`} fill="#1e293b" opacity="0.3" />
      <polygon points={\`2,-\${d/2+2} \${d-2},-\${d/2+2} \${d-2},-\${d/2+h-4} 2,-\${h-4}\`} fill="#bae6fd" opacity="0.6" />

      {name && (
        <g transform={\`translate(0, -\${h + 20})\`}>
          <circle cx="0" cy="0" r="8" fill="#ffffff" stroke="#334155" strokeWidth="1" />
          <text x="0" y="3" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">{name.charAt(0)}</text>
        </g>
      )}
    </g>
  );
};

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

code = code.replace(pseudoStr, trueIsoCode);
fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Restored true isometric ConfigurableApartmentBlock");
