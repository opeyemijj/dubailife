const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const marinaCode = `
export const MarinaBlock = ({ name = "Marina", width = 400, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 400 300" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl hover:scale-105 transition-transform z-20">
       <SimpleBase w={380} h={280} color="#0284c7" thickColor="#0369a1" rightColor="#075985" name={name} />
       
       {/* Docks */}
       <rect x="20" y="100" width="300" height="20" fill="#d97706" />
       <rect x="100" y="120" width="20" height="100" fill="#d97706" />
       <rect x="200" y="120" width="20" height="100" fill="#d97706" />
       
       {/* Yachts */}
       {[
         {x: 60, y: 150}, {x: 150, y: 150}, {x: 250, y: 150}
       ].map((b, i) => (
         <g key={i} transform={\`translate(\${b.x}, \${b.y})\`}>
            <SimpleBuilding w={30} h={15} dX={10} dY={-10} fColor="#ffffff" rColor="#e2e8f0" tColor="#f8fafc" />
         </g>
       ))}
    </svg>
  );
};
`;

const motfCode = `
export const MuseumOfFutureIcon = ({ width = 80, height = 100 }: any) => (
  <svg viewBox="0 0 100 120" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-xl z-30">
     <SimpleBase w={80} h={80} color="#22c55e" thickColor="#166534" rightColor="#14532d" />
     <ellipse cx="40" cy="30" rx="30" ry="40" fill="#94a3b8" />
     <ellipse cx="40" cy="30" rx="26" ry="36" fill="#cbd5e1" />
     <ellipse cx="40" cy="30" rx="10" ry="15" fill="#22c55e" />
  </svg>
);
`;

code = code.replace(/export const MarinaBlock = \(\{[\s\S]*?\n\};\n/, marinaCode);
code = code.replace(/export const MuseumOfFutureIcon = \(\{[\s\S]*?\n\);\n/, motfCode);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed Marina and MOTF");
