const fs = require('fs');

// First, run my revert_flat to get the full original file
const execSync = require('child_process').execSync;
execSync('node revert_flat.js');

let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const injection = `
export const IsoBox = ({ x=0, y=0, w=40, d=40, h=40, color="#3b82f6", label="", onClick }: any) => {
  const leftColor = "#94a3b8";
  const rightColor = color;
  const topColor = "#e2e8f0";

  return (
    <g transform={\`translate(\${x}, \${y})\`} className={onClick ? "cursor-pointer" : ""} onClick={onClick}>
      <polygon points={\`0,0 -\${w},-\${w/2} 0,-\${w/2+d/2-4} \${d},-\${d/2}\`} fill="rgba(0,0,0,0.2)" transform="translate(0, 5)" />
      <polygon points={\`0,0 -\${w},-\${w/2} -\${w},-\${w/2+h} 0,-\${h}\`} fill={leftColor} stroke="#64748b" strokeWidth="0.5" />
      <polygon points={\`0,0 \${d},-\${d/2} \${d},-\${d/2+h} 0,-\${h}\`} fill={rightColor} stroke="#1e40af" strokeWidth="0.5" />
      <polygon points={\`0,-\${h} -\${w},-\${w/2+h} 0,-\${w/2+d/2+h} \${d},-\${d/2+h}\`} fill={topColor} stroke="#cbd5e1" strokeWidth="0.5" />
      
      <polygon points={\`-4,-\${w/2+4} -\${w-4},-\${w/2+4} -\${w-4},-\${w/2+h-8} -4,-\${h-8}\`} fill="#1e293b" opacity="0.4" />
      <polygon points={\`4,-\${d/2+4} \${d-4},-\${d/2+4} \${d-4},-\${d/2+h-8} 4,-\${h-8}\`} fill="#bae6fd" opacity="0.7" />

      {label && (
        <g transform={\`translate(0, -\${h + 15})\`}>
          <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#334155" strokeWidth="1" />
          <text x="0" y="3" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">{label}</text>
        </g>
      )}
    </g>
  );
};

export const IsoGround = ({ w=100, d=100, color="#84cc6d", edge="#4ade80", thickness=10 }: any) => (
  <g>
    <polygon points={\`0,0 -\${w},-\${w/2} 0,-\${w/2+d/2} \${d},-\${d/2}\`} fill={color} />
    <polygon points={\`-\${w},-\${w/2} 0,0 0,\${thickness} -\${w},-\${w/2+thickness}\`} fill={edge} />
    <polygon points={\`0,0 \${d},-\${d/2} \${d},-\${d/2+thickness} 0,\${thickness}\`} fill={edge} />
  </g>
);
`;

// Replace TycoonBlock
code = code.replace(
  /export const TycoonBlock = \(\{[\s\S]*?<\/svg>\n\};\n/,
  `export const TycoonBlock = ({ name, type, cols, rows, w=300, h=200 }: any) => (
    <svg viewBox="-200 -200 400 400" style={{ width: \`\${w}px\`, height: \`\${h}px\` }} className="drop-shadow-2xl z-20 hover:scale-105 transition-transform overflow-visible">
      <IsoGround w={120} d={120} color="#22c55e" edge="#16a34a" />
      <IsoBox x={0} y={0} w={50} d={50} h={type === 'apartment' ? 100 : 50} color={type === 'apartment' ? '#3b82f6' : '#f59e0b'} label={name?.charAt(0) || "B"} />
    </svg>
  );\n`
);

// Replace GenericNeighborhood
code = code.replace(
  /export const GenericNeighborhood = \(\{[\s\S]*?<\/svg>\n\);\n/,
  `export const GenericNeighborhood = ({ name="DISTRICT" }: any) => (
    <svg viewBox="-150 -150 300 300" width="200" height="200" className="drop-shadow-lg z-10 hover:scale-105 transition-transform overflow-visible">
      <IsoGround w={100} d={100} color="#e2e8f0" edge="#cbd5e1" />
      <IsoBox x={-20} y={10} w={30} d={30} h={50} color="#64748b" />
      <IsoBox x={20} y={-20} w={40} d={40} h={80} color="#3b82f6" />
      <text x="0" y="80" fill="#475569" fontSize="14" fontWeight="bold" textAnchor="middle">{name}</text>
    </svg>
  );\n`
);

// Replace ConfigurableApartmentBlock
code = code.replace(
  /export const ConfigurableApartmentBlock = \(\{[\s\S]*?<\/svg>\n  \);\n\};\n/,
  `export const ConfigurableApartmentBlock = ({ width=300, height=250, color="#3b82f6", name="Community", numBuildings=3, hasPool=true, onUnitClick }: any) => (
    <svg viewBox="-200 -200 400 400" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30 hover:scale-105 transition-transform overflow-visible">
      <IsoGround w={160} d={160} color="#84cc6d" edge="#4ade80" />
      {hasPool && <polygon points="0,-40 -40,-60 0,-80 40,-60" fill="#38bdf8" stroke="#e2e8f0" strokeWidth="4" />}
      <IsoBox x={-40} y={20} w={30} d={30} h={100} color={color} label="A" onClick={onUnitClick ? (e)=>onUnitClick(e, 'A', 'Tower A') : undefined} />
      {numBuildings >= 2 && <IsoBox x={40} y={20} w={30} d={40} h={70} color={color} label="B" onClick={onUnitClick ? (e)=>onUnitClick(e, 'B', 'Midrise B') : undefined} />}
      {numBuildings >= 3 && <IsoBox x={0} y={80} w={20} d={20} h={50} color={color} label="C" onClick={onUnitClick ? (e)=>onUnitClick(e, 'C', 'Townhouse C') : undefined} />}
      <text x="0" y="140" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle" stroke="#000" strokeWidth="4" paintOrder="stroke">{name.toUpperCase()}</text>
    </svg>
  );\n`
);

// Replace AirportBlock
code = code.replace(
  /export const AirportBlock = \(\) => \([\s\S]*?<\/svg>\n\);\n/,
  `export const AirportBlock = () => (
    <svg viewBox="-300 -200 600 400" width="400" height="300" className="drop-shadow-2xl z-20 hover:scale-105 transition-transform overflow-visible">
      <IsoGround w={250} d={150} color="#94a3b8" edge="#475569" />
      <polygon points="-100,50 -250,-25 -100,-100 50,-25" fill="#334155" />
      <IsoBox x={0} y={-50} w={150} d={40} h={30} color="#cbd5e1" label="DXB AIRPORT" />
    </svg>
  );\n`
);

// Replace GiantBillboardBlock
code = code.replace(
  /export const GiantBillboardBlock = \(\{[\s\S]*?<\/svg>\n\);\n/,
  `export const GiantBillboardBlock = ({ width=150, height=100, text1="AD", color1="#064e3b" }: any) => (
    <svg viewBox="-100 -100 200 200" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30 overflow-visible">
       <IsoGround w={60} d={20} color="#334155" edge="#1e293b" />
       <IsoBox x={-20} y={-10} w={5} d={5} h={60} color="#94a3b8" />
       <IsoBox x={20} y={-10} w={5} d={5} h={60} color="#94a3b8" />
       <polygon points="-40,-70 40,-70 40,-120 -40,-120" fill={color1} stroke="#1e293b" strokeWidth="4" />
       <text x="0" y="-85" fill="#ffffff" fontSize="20" fontWeight="bold" textAnchor="middle">{text1.toUpperCase()}</text>
    </svg>
  );\n`
);

// Inject helpers at the top
code = code.replace(/export const WORLD_WIDTH = 4000;/, injection + '\nexport const WORLD_WIDTH = 4000;');

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Patched Icons.tsx with clean IsoBlocks while preserving other exports!");
