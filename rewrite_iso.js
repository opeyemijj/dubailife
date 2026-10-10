const fs = require('fs');

const isoHelpers = `
// --- Isometric Helpers ---
const isoToScreen = (gx, gy) => ({
  x: 150 + (gx - gy) * 0.866,
  y: 80 + (gx + gy) * 0.5
});

const IsoBuilding = ({ x, y, w, d, h, color, name, onClick }: any) => {
  // Lighten/darken for 3D effect
  const leftColor = "#94a3b8";
  const rightColor = color || "#3b82f6";
  const roofColor = "#e2e8f0";

  return (
    <g transform={\`translate(\${x}, \${y})\`} className={onClick ? "cursor-pointer hover:scale-105 transition-transform" : ""} onClick={onClick}>
      {/* Left Wall */}
      <polygon points={\`0,0 -\${w},-\${w/2} -\${w},-\${w/2+h} 0,-\${h}\`} fill={leftColor} stroke="#64748b" strokeWidth="0.5" />
      {/* Right Wall */}
      <polygon points={\`0,0 \${d},-\${d/2} \${d},-\${d/2+h} 0,-\${h}\`} fill={rightColor} stroke="#1e40af" strokeWidth="0.5" />
      {/* Roof */}
      <polygon points={\`0,-\${h} -\${w},-\${w/2+h} 0,-\${w/2+d/2+h} \${d},-\${d/2+h}\`} fill={roofColor} stroke="#cbd5e1" strokeWidth="0.5" />
      
      {/* Windows Left */}
      <polygon points={\`-2,-\${w/2+2} -\${w-2},-\${w/2+2} -\${w-2},-\${w/2+h-4} -2,-\${h-4}\`} fill="#1e293b" opacity="0.3" />
      {/* Windows Right */}
      <polygon points={\`2,-\${d/2+2} \${d-2},-\${d/2+2} \${d-2},-\${d/2+h-4} 2,-\${h-4}\`} fill="#bae6fd" opacity="0.6" />

      {/* Interactive Badge */}
      {name && (
        <g transform={\`translate(0, -\${h + 20})\`}>
          <circle cx="0" cy="0" r="8" fill="#ffffff" stroke="#334155" strokeWidth="1" />
          <text x="0" y="3" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">{name.charAt(0)}</text>
        </g>
      )}
    </g>
  );
};
`;

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

  // Generate buildings along a grid
  const buildings = Array.from({length: Math.min(numBuildings, 12)}).map((_, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    // Base grid coordinates
    const gx = -20 + col * 40;
    const gy = -20 + row * 40;
    const h = 40 + (Math.sin(i * 45) * 20); // random-ish height 20-60
    return { id: \`unit-\${i+1}\`, name: \`Unit \${i+1}\`, gx, gy, w: 15, d: 15, h };
  });

  // Sort by depth (gx + gy) so back buildings render first
  buildings.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  // Isometric floor points based on -60 to 80 grid
  const floorCenter = { x: 150, y: 120 };
  
  return (
    <svg viewBox="0 0 300 300" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30">
      
      {/* 3D Base Platform */}
      <g transform={\`translate(\${floorCenter.x}, \${floorCenter.y})\`}>
        {/* Thickness */}
        <polygon points="-120,0 0,60 0,70 -120,10" fill="#166534" />
        <polygon points="0,60 120,0 120,10 0,70" fill="#14532d" />
        {/* Top Face */}
        <polygon points="0,-60 -120,0 0,60 120,0" fill="#22c55e" stroke="#86efac" strokeWidth="2" />
        
        {/* Name on the grass */}
        <text x="0" y="45" fill="#14532d" fontSize="16" fontWeight="900" textAnchor="middle" transform="scale(1, 0.5) rotate(0)">{name.toUpperCase()}</text>
      </g>

      {/* Pool */}
      {hasPool && (
        <g transform={\`translate(\${floorCenter.x - 40}, \${floorCenter.y + 10})\`}>
           <polygon points="0,-15 -30,0 0,15 30,0" fill="#94a3b8" />
           <polygon points="0,-12 -25,0 0,12 25,0" fill="#0ea5e9" />
        </g>
      )}

      {/* Court */}
      {hasCourt && (
        <g transform={\`translate(\${floorCenter.x + 40}, \${floorCenter.y - 10})\`}>
           <polygon points="0,-20 -30,-5 0,10 30,-5" fill="#ea580c" />
           <polygon points="0,-18 -28,-4 0,8 28,-4" fill="#22c55e" />
           <path d="M -14,-6 L 14,8 M 0,-18 L 0,8" stroke="#ffffff" strokeWidth="0.5" />
        </g>
      )}

      {/* Render 3D Buildings */}
      {buildings.map((b) => {
        const {x, y} = isoToScreen(b.gx, b.gy);
        // adjust y for floor center
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

const mallCode = `
export const MallBlock = ({ width = 250, height = 200 }: any) => {
  const roofColors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa'];
  return (
    <svg viewBox="0 0 300 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
      <g transform="translate(150, 120)">
        {/* Base Thickness */}
        <polygon points="-100,0 0,50 0,60 -100,10" fill="#94a3b8" />
        <polygon points="0,50 100,0 100,10 0,60" fill="#64748b" />
        {/* Base Top */}
        <polygon points="0,-50 -100,0 0,50 100,0" fill="#e2e8f0" stroke="#ffffff" strokeWidth="2" />
        
        {/* Main 3D Structure */}
        <polygon points="-60,-10 -60,20 0,50 0,20" fill="#64748b" /> {/* Left wall */}
        <polygon points="0,50 60,20 60,-10 0,20" fill="#cbd5e1" />   {/* Right wall */}
        <polygon points="0,-40 -60,-10 0,20 60,-10" fill="#f1f5f9" /> {/* Roof */}
        
        {/* Glass Dome */}
        <ellipse cx="0" cy="-10" rx="40" ry="20" fill="#7dd3fc" opacity="0.8" />
        <path d="M -40,-10 A 40 20 0 0 1 40,-10" fill="none" stroke="#bae6fd" strokeWidth="2" />
        <path d="M 0,-30 L 0,10 M -20,-27 L -20,7 M 20,-27 L 20,7" stroke="#bae6fd" strokeWidth="1" />

        {/* 3D Awnings */}
        {[0, 1, 2].map(row => 
          [0, 1, 2, 3].map(col => {
             const cx = -30 + col * 20 - row * 10;
             const cy = 10 + row * 10 + col * 5;
             const color = roofColors[(row + col) % roofColors.length];
             return (
               <polygon key={\`\${row}-\${col}\`} points={\`\${cx},\${cy} \${cx-10},\${cy+5} \${cx},\${cy+10} \${cx+10},\${cy+5}\`} fill={color} />
             );
          })
        )}

        {/* Brand Text */}
        <text x="0" y="40" fill="#0f172a" fontSize="12" fontWeight="900" textAnchor="middle" transform="scale(1, 0.5) skewX(20)">MALL</text>
      </g>
    </svg>
  );
};
`;

const aptComplexCode = `
export const ApartmentComplexBlock = ({ width = 250, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 300 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
      <g transform="translate(150, 120)">
        {/* Base */}
        <polygon points="-110,0 0,55 0,65 -110,10" fill="#166534" />
        <polygon points="0,55 110,0 110,10 0,65" fill="#14532d" />
        <polygon points="0,-55 -110,0 0,55 110,0" fill="#22c55e" stroke="#86efac" strokeWidth="2" />
        
        {/* Isometric Running Track */}
        <ellipse cx="0" cy="15" rx="50" ry="25" fill="none" stroke="#ea580c" strokeWidth="4" />
        <ellipse cx="0" cy="15" rx="46" ry="23" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="2,2" />

        {/* Central Fountain */}
        <ellipse cx="0" cy="15" rx="10" ry="5" fill="#0ea5e9" />
        <circle cx="0" cy="10" r="3" fill="#ffffff" />

        {/* Dorm Buildings (3D) */}
        {[
           {x: -40, y: -20, h: 40}, 
           {x: 40, y: -20, h: 40}, 
           {x: -60, y: 10, h: 30},
           {x: 60, y: 10, h: 30}
        ].map((b, i) => (
           <g key={i} transform={\`translate(\${b.x}, \${b.y})\`}>
             <polygon points="0,0 -20,-10 -20,-\${b.h+10} 0,-\${b.h}" fill="#94a3b8" />
             <polygon points="0,0 20,-10 20,-\${b.h+10} 0,-\${b.h}" fill="#f8fafc" />
             <polygon points="0,-\${b.h} -20,-\${b.h+10} 0,-\${b.h+20} 20,-\${b.h+10}" fill="#ef4444" />
           </g>
        ))}

        {/* Text */}
        <text x="0" y="45" fill="#14532d" fontSize="14" fontWeight="900" textAnchor="middle" transform="scale(1, 0.5)">UNIVERSITY APTS</text>

        {/* Grad Cap Badge */}
        <g transform="translate(0, -60)">
           <polygon points="0,0 -15,-5 0,-10 15,-5" fill="#1e293b" />
           <polygon points="-10,-4 -10,5 0,10 10,5 10,-4" fill="#334155" />
           <circle cx="15" cy="-5" r="2" fill="#eab308" />
           <path d="M 15,-5 L 15,5" stroke="#eab308" strokeWidth="1" />
        </g>
      </g>
    </svg>
  );
};
`;

let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Inject isoHelpers at the top after imports
if (!code.includes('isoToScreen')) {
  code = code.replace(/export const WORLD_WIDTH/, isoHelpers + '\nexport const WORLD_WIDTH');
}

// Replace ConfigurableApartmentBlock
code = code.replace(/export const ConfigurableApartmentBlock = \(\{[\s\S]*?\n\};\n/, configAptCode);

// Replace MallBlock
code = code.replace(/export const MallBlock = \(\{[\s\S]*?\n\};\n/, mallCode);

// Replace ApartmentComplexBlock
code = code.replace(/export const ApartmentComplexBlock = \(\{[\s\S]*?\n\};\n/, aptComplexCode);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Rewrote components to Isometric 3D!");
