const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const isoHelpers = `
export const IsoBase = ({ width, height, color = "#22c55e", edgeLeft = "#166534", edgeRight = "#14532d", name = "" }: any) => {
  const hW = width / 2;
  const hH = height / 2;
  return (
    <g>
      <polygon points={\`-\${hW},0 0,\${hH} 0,\${hH+10} -\${hW},10\`} fill={edgeLeft} />
      <polygon points={\`0,\${hH} \${hW},0 \${hW},10 0,\${hH+10}\`} fill={edgeRight} />
      <polygon points={\`0,-\${hH} -\${hW},0 0,\${hH} \${hW},0\`} fill={color} stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
      {name && (
        <text x="0" y={hH - 15} fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle" transform="scale(1, 0.5)">
          {name.toUpperCase()}
        </text>
      )}
    </g>
  );
};

export const IsoBox = ({ x=0, y=0, w, d, h, colorLeft="#94a3b8", colorRight="#cbd5e1", colorTop="#e2e8f0" }: any) => (
  <g transform={\`translate(\${x}, \${y})\`}>
    <polygon points={\`0,0 -\${w},-\${w/2} -\${w},-\${w/2+h} 0,-\${h}\`} fill={colorLeft} />
    <polygon points={\`0,0 \${d},-\${d/2} \${d},-\${d/2+h} 0,-\${h}\`} fill={colorRight} />
    <polygon points={\`0,-\${h} -\${w},-\${w/2+h} 0,-\${w/2+d/2+h} \${d},-\${d/2+h}\`} fill={colorTop} />
  </g>
);
`;

const aptComplexTarget = /export const ApartmentComplexBlock = \(\{[\s\S]*?<\/svg>\n  \);\n\};\n/;
const aptComplexIso = `
export const ApartmentComplexBlock = ({ width = 250, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 300 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
      <g transform="translate(150, 120)">
        <IsoBase width={220} height={220} color="#22c55e" edgeLeft="#166534" edgeRight="#14532d" name="UNIVERSITY APTS" />
        <ellipse cx="0" cy="15" rx="50" ry="25" fill="none" stroke="#ea580c" strokeWidth="4" />
        <ellipse cx="0" cy="15" rx="46" ry="23" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="2,2" />
        
        <IsoBox x={-40} y={-20} w={20} d={20} h={40} colorLeft="#94a3b8" colorRight="#f8fafc" colorTop="#ef4444" />
        <IsoBox x={40} y={-20} w={20} d={20} h={40} colorLeft="#94a3b8" colorRight="#f8fafc" colorTop="#ef4444" />
        <IsoBox x={-60} y={10} w={15} d={15} h={30} colorLeft="#94a3b8" colorRight="#f8fafc" colorTop="#ef4444" />
        <IsoBox x={60} y={10} w={15} d={15} h={30} colorLeft="#94a3b8" colorRight="#f8fafc" colorTop="#ef4444" />
      </g>
    </svg>
  );
};
`;

const giantBillboardTarget = /export const GiantBillboardBlock = \(\{[\s\S]*?<\/svg>\n\);\n/;
const giantBillboardIso = `
export const GiantBillboardBlock = ({ width = 150, height = 100, text1 = "yad", text2 = "sale", color1 = "#064e3b", color2 = "#16a34a" }: any) => {
  return (
    <svg viewBox="0 0 150 100" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl z-30">
      <g transform="translate(75, 80)">
         <rect x="-4" y="-30" width="8" height="30" fill="#475569" />
         <rect x="-6" y="0" width="12" height="5" fill="#1e293b" />
         
         <g transform="translate(0, -30)">
           <rect x="-50" y="-40" width="100" height="40" fill="#1e293b" />
           <rect x="-48" y="-38" width="96" height="36" fill="#f8fafc" />
           
           <rect x="-48" y="-38" width="48" height="36" fill={color1} />
           <text x="-24" y="-15" fill="#ffffff" fontSize="18" fontWeight="bold" textAnchor="middle">{text1.toUpperCase()}</text>
           
           <rect x="0" y="-38" width="48" height="36" fill={color2} />
           <text x="24" y="-15" fill="#ffffff" fontSize="18" fontWeight="bold" textAnchor="middle">{text2.toUpperCase()}</text>
         </g>
      </g>
    </svg>
  );
};
`;

if (!code.includes('export const IsoBase')) {
  code = code.replace(/export const WORLD_WIDTH/, isoHelpers + '\nexport const WORLD_WIDTH');
}
code = code.replace(aptComplexTarget, aptComplexIso);
code = code.replace(giantBillboardTarget, giantBillboardIso);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Restored IsoBase, IsoBox, ApartmentComplexBlock, and GiantBillboardBlock");
