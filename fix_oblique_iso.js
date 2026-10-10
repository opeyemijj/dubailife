const fs = require('fs');

const obliqueEngine = `
// --- Simple Isometric/Oblique Engine ---
export const SimpleBase = ({ w, h, color = "#84cc6d", thickColor = "#4ade80", rightColor = "#22c55e", name = "" }: any) => (
  <g>
    {/* Bottom shadow */}
    <polygon points={\`0,\${h} \${w},\${h} \${w+10},\${h+10} 10,\${h+10}\`} fill={thickColor} />
    {/* Right shadow */}
    <polygon points={\`\${w},0 \${w+10},10 \${w+10},\${h+10} \${w},\${h}\`} fill={rightColor} />
    {/* Top Face */}
    <rect x="0" y="0" width={w} height={h} fill={color} stroke="#ffffff" strokeWidth="2" />
    {name && (
      <text x={w/2} y={h - 15} fill="rgba(0,0,0,0.5)" fontSize="14" fontWeight="bold" textAnchor="middle">{name.toUpperCase()}</text>
    )}
  </g>
);

export const SimpleBuilding = ({ x=0, y=0, w, h, dX = 15, dY = -20, fColor = "#94a3b8", rColor = "#64748b", tColor = "#cbd5e1" }: any) => (
  <g transform={\`translate(\${x}, \${y})\`}>
    {/* Right Wall */}
    <polygon points={\`\${w},0 \${w+dX},\${dY} \${w+dX},\${dY+h} \${w},\${h}\`} fill={rColor} stroke="#475569" strokeWidth="0.5" />
    {/* Roof */}
    <polygon points={\`0,0 \${dX},\${dY} \${w+dX},\${dY} \${w},0\`} fill={tColor} stroke="#94a3b8" strokeWidth="0.5" />
    {/* Front Wall */}
    <rect x="0" y="0" width={w} height={h} fill={fColor} stroke="#64748b" strokeWidth="0.5" />
    
    {/* Windows Approximation */}
    {h > 20 && w > 10 && (
      <g>
        <rect x="2" y="5" width={w-4} height={h-10} fill="#1e293b" opacity="0.3" />
        <polygon points={\`\${w+2},5 \${w+dX-2},\${dY+5} \${w+dX-2},\${dY+h-5} \${w+2},\${h-5}\`} fill="#38bdf8" opacity="0.4" />
      </g>
    )}
  </g>
);
`;

let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Wipe the old IsoBase and IsoBox
code = code.replace(/\/\/ --- Core Isometric 3D Engine ---[\s\S]*?export const IsoCylinder = \(\{[\s\S]*?\n\);\n/, obliqueEngine);

// Fix TycoonBlock
const tycoonBlock = `
export const TycoonBlock = ({ name, type, cols, rows, w, h }: any) => {
  const cellW = (w - 20) / cols;
  const cellH = (h - 20) / rows;
  
  const units = [];
  for(let r=0; r<rows; r++) {
    for(let c=0; c<cols; c++) {
      units.push({ c, r, x: 10 + c*cellW, y: 10 + r*cellH });
    }
  }

  return (
    <svg viewBox={\`0 0 \${w+20} \${h+20}\`} style={{ width: \`\${w}px\`, height: \`\${h}px\` }} className="drop-shadow-xl hover:scale-105 transition-transform z-20">
       <SimpleBase w={w} h={h} color="#16a34a" thickColor="#15803d" rightColor="#14532d" name={name} />
       
       {units.map((u, i) => {
         const isApt = type === 'apartment';
         const bW = cellW * 0.6;
         const bH = isApt ? 30 + (i % 3)*15 : 15;
         const dX = isApt ? 10 : 8;
         const dY = isApt ? -15 : -10;
         
         return (
           <g key={i}>
             <SimpleBuilding 
               x={u.x} y={u.y - bH} 
               w={bW} h={bH} dX={dX} dY={dY}
               fColor={isApt ? "#60a5fa" : "#fcd34d"}
               rColor={isApt ? "#3b82f6" : "#fbbf24"}
               tColor={isApt ? "#93c5fd" : "#fde68a"}
             />
             {!isApt && (
               <polygon points={\`\${u.x},\${u.y-bH} \${u.x+bW/2},\${u.y-bH-10} \${u.x+bW},\${u.y-bH}\`} fill="#ef4444" />
             )}
           </g>
         );
       })}
    </svg>
  );
};
`;
code = code.replace(/export const TycoonBlock = \(\{[\s\S]*?\n\};\n/, tycoonBlock);

// Fix DynamicCommunityBlock
const dynamicCommunity = `
export const DynamicCommunityBlock = ({ 
  name = "Dynamic Community", 
  width = 400, 
  height = 300, 
  color = "#bbf7d0",
  rows = 4,
  cols = 6,
  buildingType = "small-house"
}: any) => {
  const cellW = (width - 20) / cols;
  const cellH = (height - 20) / rows;
  const units = [];
  for(let r=0; r<rows; r++) {
    for(let c=0; c<cols; c++) {
      units.push({ c, r, x: 10 + c*cellW, y: 10 + r*cellH });
    }
  }

  return (
    <svg viewBox={\`0 0 \${width+20} \${height+20}\`} style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-xl hover:scale-105 transition-transform z-20">
       <SimpleBase w={width} h={height} color={color} thickColor="#86efac" rightColor="#4ade80" name={name} />
       
       {units.map((u, i) => {
         const isApt = buildingType === 'apartment';
         const isSky = buildingType === 'skyscraper';
         const bW = cellW * 0.5;
         let bH = 15;
         if (isApt) bH = 40 + (i%3)*10;
         if (isSky) bH = 80 + (i%5)*20;
         
         const dX = isSky ? 15 : 10;
         const dY = isSky ? -20 : -15;

         return (
           <SimpleBuilding 
             key={i} x={u.x} y={u.y - bH} 
             w={bW} h={bH} dX={dX} dY={dY}
             fColor={isSky ? "#0284c7" : (isApt ? "#94a3b8" : "#d6d3d1")}
             rColor={isSky ? "#0369a1" : (isApt ? "#64748b" : "#a8a29e")}
             tColor={isSky ? "#7dd3fc" : (isApt ? "#cbd5e1" : "#f5f5f4")}
           />
         );
       })}
    </svg>
  );
};
`;
code = code.replace(/export const DynamicCommunityBlock = \(\{[\s\S]*?\n\};\n/, dynamicCommunity);

// Fix GenericNeighborhood
const genericCode = `
export const GenericNeighborhood = ({ name, seed }: { name: string, seed: number }) => {
  return (
    <svg viewBox="0 0 220 220" width="100%" height="100%" className="drop-shadow-lg z-10">
       <SimpleBase w={200} h={200} color="#e2e8f0" thickColor="#cbd5e1" rightColor="#94a3b8" name={name} />
       <SimpleBuilding x={20} y={150-50} w={40} h={50} fColor="#94a3b8" rColor="#64748b" tColor="#cbd5e1" />
       <SimpleBuilding x={80} y={120-80} w={50} h={80} fColor="#60a5fa" rColor="#3b82f6" tColor="#93c5fd" />
       <SimpleBuilding x={150} y={160-60} w={30} h={60} fColor="#94a3b8" rColor="#64748b" tColor="#cbd5e1" />
    </svg>
  );
};
`;
code = code.replace(/export const GenericNeighborhood = \(\{[\s\S]*?\n\};\n/, genericCode);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Rewrote mass renderers to clean Oblique 3D");
