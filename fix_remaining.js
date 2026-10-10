const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const palmCode = `
export const PalmCommunityBlock = () => {
  return (
    <svg viewBox="0 0 300 300" width="100%" height="100%" className="drop-shadow-2xl z-20">
       <SimpleBase w={250} h={250} color="#fcd34d" thickColor="#d97706" rightColor="#b45309" name="PALM" />
       
       <path d="M 125,50 Q 0,125 125,250 Q 250,125 125,50 Z" fill="#22c55e" />
       <path d="M 50,80 Q -25,125 75,220 Q 125,140 50,80 Z" fill="#16a34a" />
       <path d="M 200,80 Q 275,125 175,220 Q 125,140 200,80 Z" fill="#16a34a" />
       
       {[
         {x: 125, y: 150}, {x: 125, y: 180}, {x: 125, y: 210},
         {x: 80, y: 140}, {x: 60, y: 170}, {x: 100, y: 190},
         {x: 170, y: 140}, {x: 190, y: 170}, {x: 150, y: 190}
       ].map((v, i) => (
         <SimpleBuilding key={i} x={v.x} y={v.y - 20} w={15} h={20} dX={10} dY={-10} fColor="#f8fafc" rColor="#e2e8f0" tColor="#fca5a5" />
       ))}
    </svg>
  );
};
`;

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

const mallCode = `
export const MallBlock = ({ width = 250, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 300 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform z-30">
       <SimpleBase w={280} h={230} color="#e2e8f0" thickColor="#94a3b8" rightColor="#64748b" name="MALL" />
       
       <SimpleBuilding x={20} y={150-80} w={240} h={80} fColor="#cbd5e1" rColor="#94a3b8" tColor="#f1f5f9" />
       
       {/* Glass Dome */}
       <ellipse cx="140" cy="50" rx="60" ry="30" fill="#7dd3fc" opacity="0.8" />
       
       {/* Awnings */}
       <g transform="translate(40, 150)">
         <rect x="0" y="0" width="40" height="20" fill="#f87171" />
         <rect x="50" y="0" width="40" height="20" fill="#fbbf24" />
         <rect x="100" y="0" width="40" height="20" fill="#34d399" />
         <rect x="150" y="0" width="40" height="20" fill="#60a5fa" />
       </g>
    </svg>
  );
};
`;

code = code.replace(/export const PalmCommunityBlock = \(\) => \([\s\S]*?\n\};\n/, palmCode);
code = code.replace(/export const GenericNeighborhood = \(\{[\s\S]*?\n\};\n/, genericCode);
code = code.replace(/export const MallBlock = \(\{[\s\S]*?\n\};\n/, mallCode);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed remaining blocks");
