const fs = require('fs');

let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const isoEngine = `
// --- Core Isometric 3D Engine ---
export const isoToScreen = (gx: number, gy: number, originX = 150, originY = 80) => ({
  x: originX + (gx - gy) * 0.866,
  y: originY + (gx + gy) * 0.5
});

export const IsoBase = ({ width, height, color = "#22c55e", edgeLeft = "#166534", edgeRight = "#14532d", name = "" }: any) => {
  const hW = width / 2;
  const hH = height / 2;
  return (
    <g>
      <polygon points={\`-\${hW},0 0,\${hH} 0,\${hH+15} -\${hW},15\`} fill={edgeLeft} />
      <polygon points={\`0,\${hH} \${hW},0 \${hW},15 0,\${hH+15}\`} fill={edgeRight} />
      <polygon points={\`0,-\${hH} -\${hW},0 0,\${hH} \${hW},0\`} fill={color} stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
      {name && (
        <text x="0" y={hH - 20} fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="900" textAnchor="middle" transform="scale(1, 0.5)">
          {name.toUpperCase()}
        </text>
      )}
    </g>
  );
};

export const IsoBox = ({ x=0, y=0, w, d, h, colorLeft="#94a3b8", colorRight="#cbd5e1", colorTop="#e2e8f0", onClick }: any) => (
  <g transform={\`translate(\${x}, \${y})\`} className={onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} onClick={onClick}>
    <polygon points={\`0,0 -\${w},-\${w/2} -\${w},-\${w/2+h} 0,-\${h}\`} fill={colorLeft} />
    <polygon points={\`0,0 \${d},-\${d/2} \${d},-\${d/2+h} 0,-\${h}\`} fill={colorRight} />
    <polygon points={\`0,-\${h} -\${w},-\${w/2+h} 0,-\${w/2+d/2+h} \${d},-\${d/2+h}\`} fill={colorTop} />
  </g>
);

export const IsoCylinder = ({ x=0, y=0, r, h, colorLeft="#94a3b8", colorRight="#cbd5e1", colorTop="#e2e8f0" }: any) => (
  <g transform={\`translate(\${x}, \${y})\`}>
    <path d={\`M -\${r},0 A \${r} \${r/2} 0 0 0 \${r},0 L \${r},-\${h} A \${r} \${r/2} 0 0 1 -\${r},-\${h} Z\`} fill={colorRight} />
    <ellipse cx="0" cy={\`-\${h}\`} rx={r} ry={r/2} fill={colorTop} />
  </g>
);
`;

// Insert engine if not there
if (!code.includes('IsoBase')) {
  code = code.replace(/export const WORLD_WIDTH/, isoEngine + '\nexport const WORLD_WIDTH');
}

// Rewrite SmallHouseIcon
const smallHouse = `
export const SmallHouseIcon = () => (
  <svg viewBox="0 0 40 40" width="100%" height="100%">
    <g transform="translate(20, 30)">
       <IsoBox w={10} d={12} h={10} colorLeft="#d6d3d1" colorRight="#f5f5f4" colorTop="#a8a29e" />
       {/* Sloped Roof */}
       <polygon points="0,-10 -10,-15 0,-25 12,-16" fill="#ef4444" />
       <polygon points="0,-10 12,-16 12,-16 0,-10" fill="#dc2626" />
    </g>
  </svg>
);
`;
code = code.replace(/export const SmallHouseIcon = \(\) => \([\s\S]*?\n\);\n/, smallHouse);

// Rewrite VillaHouse
const villaHouse = `
export const VillaHouse = ({ x, y }: { x: number, y: number }) => (
  <IsoBox x={x} y={y} w={12} d={15} h={12} colorLeft="#fcd34d" colorRight="#fef3c7" colorTop="#f59e0b" />
);
`;
code = code.replace(/export const VillaHouse = \(\{[\s\S]*?\n\);\n/, villaHouse);

// Rewrite ApartmentHouse
const aptHouse = `
export const ApartmentHouse = ({ x, y }: { x: number, y: number }) => (
  <IsoBox x={x} y={y} w={15} d={15} h={40} colorLeft="#60a5fa" colorRight="#bfdbfe" colorTop="#3b82f6" />
);
`;
code = code.replace(/export const ApartmentHouse = \(\{[\s\S]*?\n\);\n/, aptHouse);

// Rewrite TycoonBlock
const tycoonBlock = `
export const TycoonBlock = ({ name, type, cols, rows, w, h }: any) => {
  const units = [];
  for(let r=0; r<rows; r++) {
    for(let c=0; c<cols; c++) {
      // 0 to 1 grid mapping
      const gx = (c / Math.max(1, cols - 1)) * 200;
      const gy = (r / Math.max(1, rows - 1)) * 200;
      units.push({ c, r, gx, gy });
    }
  }
  
  units.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  return (
    <svg viewBox="0 0 300 250" style={{ width: \`\${w}px\`, height: \`\${h}px\` }} className="drop-shadow-xl hover:scale-105 transition-transform z-20">
      <g transform="translate(150, 125)">
         <IsoBase width={240} height={200} color="#16a34a" edgeLeft="#14532d" edgeRight="#166534" name={name} />
         
         <g transform="translate(-150, -80)">
         {units.map((u, i) => {
           const {x, y} = isoToScreen(u.gx, u.gy);
           // Add a slight variance to heights
           const hRand = type === 'apartment' ? 30 + (i % 3)*15 : 12;
           if (type === 'apartment') {
             return <IsoBox key={i} x={x} y={y-30} w={15} d={15} h={hRand} colorLeft="#60a5fa" colorRight="#bfdbfe" colorTop="#3b82f6" />;
           } else {
             return (
               <g key={i} transform={\`translate(\${x}, \${y-30})\`}>
                 <IsoBox w={12} d={15} h={hRand} colorLeft="#fcd34d" colorRight="#fef3c7" colorTop="#f59e0b" />
                 {/* 3D Roof */}
                 <polygon points={\`0,-\${hRand} -12,-\${hRand+6} 0,-\${hRand+15} 15,-\${hRand+7}\`} fill="#dc2626" />
               </g>
             );
           }
         })}
         </g>
      </g>
    </svg>
  );
};
`;
code = code.replace(/export const TycoonBlock = \(\{[\s\S]*?\n\};\n/, tycoonBlock);

// Rewrite DynamicCommunityBlock
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
  const units = [];
  for(let r=0; r<rows; r++) {
    for(let c=0; c<cols; c++) {
      const gx = (c / Math.max(1, cols - 1)) * 240;
      const gy = (r / Math.max(1, rows - 1)) * 240;
      units.push({ c, r, gx, gy });
    }
  }
  units.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  return (
    <svg viewBox="0 0 350 300" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-xl hover:scale-105 transition-transform z-20">
      <g transform="translate(175, 150)">
         <IsoBase width={280} height={280} color={color} edgeLeft="#64748b" edgeRight="#94a3b8" name={name} />
         
         <g transform="translate(-150, -80)">
           {units.map((u, i) => {
             const {x, y} = isoToScreen(u.gx, u.gy, 150, 80);
             if (buildingType === 'apartment') {
               return <IsoBox key={i} x={x} y={y-50} w={15} d={15} h={50 + (i%4)*10} colorLeft="#64748b" colorRight="#94a3b8" colorTop="#cbd5e1" />;
             } else if (buildingType === 'skyscraper') {
               return <IsoBox key={i} x={x} y={y-50} w={15} d={15} h={100 + (i%5)*20} colorLeft="#0284c7" colorRight="#38bdf8" colorTop="#bae6fd" />;
             } else {
               return (
                 <g key={i} transform={\`translate(\${x}, \${y-50})\`}>
                   <IsoBox w={12} d={12} h={15} colorLeft="#d6d3d1" colorRight="#f5f5f4" colorTop="#a8a29e" />
                   <polygon points="0,-15 -12,-21 0,-30 12,-21" fill="#ef4444" />
                 </g>
               );
             }
           })}
         </g>
      </g>
    </svg>
  );
};
`;
code = code.replace(/export const DynamicCommunityBlock = \(\{[\s\S]*?\n\};\n/, dynamicCommunity);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Rewrote bulk Tycoon and Dynamic communities to Isometric!");
