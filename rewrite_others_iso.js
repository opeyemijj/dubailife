const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const hotelCode = `
export const HotelBlock = ({ width = 200, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 250 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform z-30">
      <g transform="translate(125, 125)">
         <IsoBase width={200} height={200} color="#84cc6d" edgeLeft="#166534" edgeRight="#14532d" />
         
         {/* Pool */}
         <g transform="translate(0, 20)">
           <polygon points="-40,0 0,-20 40,0 0,20" fill="#bae6fd" />
           <polygon points="-35,0 0,-15 35,0 0,15" fill="#38bdf8" />
         </g>

         {/* Hotel Towers */}
         <IsoBox x={-40} y={-20} w={20} d={30} h={80} colorLeft="#fcd34d" colorRight="#fef3c7" colorTop="#f59e0b" />
         <IsoBox x={0} y={-40} w={20} d={20} h={100} colorLeft="#fbbf24" colorRight="#fef3c7" colorTop="#f59e0b" />
         <IsoBox x={40} y={-20} w={30} d={20} h={70} colorLeft="#fcd34d" colorRight="#fef3c7" colorTop="#f59e0b" />
         
         <text x="0" y="45" fill="#14532d" fontSize="12" fontWeight="900" textAnchor="middle" transform="scale(1, 0.5)">RESORT</text>
      </g>
    </svg>
  );
};
`;

const marinaCode = `
export const MarinaBlock = ({ name = "Marina", width = 400, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 400 300" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl hover:scale-105 transition-transform z-20">
      <g transform="translate(200, 150)">
         <IsoBase width={350} height={250} color="#0284c7" edgeLeft="#075985" edgeRight="#0369a1" name={name} />
         
         {/* Docks (Wooden) */}
         <polygon points="-120,0 120,-60 130,-55 -110,5" fill="#d97706" />
         <polygon points="0,-30 0,40 10,45 10,-25" fill="#d97706" />
         <polygon points="-60,-15 -60,50 -50,55 -50,-10" fill="#d97706" />
         <polygon points="60,-45 60,20 70,25 70,-40" fill="#d97706" />
         
         {/* 3D Yachts */}
         {[
            {x: -40, y: 10}, {x: -80, y: -10}, {x: 20, y: 20}, 
            {x: 80, y: -20}, {x: -20, y: -40}, {x: 40, y: -50}
         ].map((b, i) => (
            <g key={i} transform={\`translate(\${b.x}, \${b.y})\`}>
              <polygon points="-15,0 15,-10 15,-5 -15,5" fill="#cbd5e1" />
              <polygon points="-15,0 -15,-5 15,-15 15,-10" fill="#f8fafc" />
              <IsoBox x={0} y={-5} w={8} d={12} h={10} colorLeft="#94a3b8" colorRight="#e2e8f0" colorTop="#ffffff" />
            </g>
         ))}
      </g>
    </svg>
  );
};
`;

code = code.replace(/export const HotelBlock = \(\{[\s\S]*?\n\};\n/, hotelCode);
code = code.replace(/export const MarinaBlock = \(\{[\s\S]*?\n\};\n/, marinaCode);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Rewrote Hotel and Marina to Isometric");
