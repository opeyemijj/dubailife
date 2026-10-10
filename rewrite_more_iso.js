const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const palmCode = `
export const PalmCommunityBlock = () => {
  return (
    <svg viewBox="0 0 300 300" width="100%" height="100%" className="drop-shadow-2xl z-20">
      <g transform="translate(150, 150)">
         <IsoBase width={250} height={250} color="#fcd34d" edgeLeft="#d97706" edgeRight="#b45309" />
         {/* Palm Fronds (Isometric flat approximations) */}
         <path d="M 0,-40 Q -80,0 0,100 Q 80,0 0,-40 Z" fill="#22c55e" />
         <path d="M -40,-20 Q -100,20 -20,100 Q 0,40 -40,-20 Z" fill="#16a34a" />
         <path d="M 40,-20 Q 100,20 20,100 Q 0,40 40,-20 Z" fill="#16a34a" />
         {/* 3D Villas on Fronds */}
         {[
           {x: 0, y: 0}, {x: 0, y: 30}, {x: 0, y: 60},
           {x: -25, y: 15}, {x: -40, y: 40}, {x: -15, y: 65},
           {x: 25, y: 15}, {x: 40, y: 40}, {x: 15, y: 65}
         ].map((v, i) => (
           <IsoBox key={i} x={v.x} y={v.y} w={8} d={8} h={15} colorLeft="#f8fafc" colorRight="#ffffff" colorTop="#fca5a5" />
         ))}
      </g>
    </svg>
  );
};
`;

const genericCode = `
export const GenericNeighborhood = ({ name, seed }: { name: string, seed: number }) => {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" className="drop-shadow-lg z-10">
      <g transform="translate(100, 100)">
         <IsoBase width={160} height={160} color="#e2e8f0" edgeLeft="#94a3b8" edgeRight="#64748b" name={name} />
         {/* Generic Blocks */}
         <IsoBox x={-20} y={-20} w={15} d={15} h={20 + (seed%3)*10} colorLeft="#64748b" colorRight="#94a3b8" colorTop="#cbd5e1" />
         <IsoBox x={20} y={-10} w={20} d={15} h={15 + (seed%2)*15} colorLeft="#64748b" colorRight="#94a3b8" colorTop="#cbd5e1" />
         <IsoBox x={0} y={20} w={10} d={20} h={30 + (seed%4)*5} colorLeft="#64748b" colorRight="#94a3b8" colorTop="#cbd5e1" />
      </g>
    </svg>
  );
};
`;

const airportCode = `
export const AirportBlock = () => {
  return (
    <svg viewBox="0 0 400 300" width="100%" height="100%" className="drop-shadow-2xl z-20">
      <g transform="translate(200, 150)">
         <IsoBase width={360} height={200} color="#94a3b8" edgeLeft="#475569" edgeRight="#334155" name="DXB AIRPORT" />
         {/* Runways */}
         <polygon points="-120,40 120,-60 130,-50 -110,50" fill="#1e293b" />
         <polygon points="-100,60 140,-40 150,-30 -90,70" fill="#1e293b" />
         
         {/* Terminals (3D) */}
         <IsoBox x={0} y={-30} w={80} d={20} h={20} colorLeft="#e2e8f0" colorRight="#ffffff" colorTop="#f1f5f9" />
         <IsoBox x={-40} y={20} w={60} d={15} h={15} colorLeft="#e2e8f0" colorRight="#ffffff" colorTop="#f1f5f9" />
         
         {/* Planes (3D approximations) */}
         <g transform="translate(50, -10)">
           <polygon points="-10,-5 10,-10 15,0 -5,5" fill="#ffffff" />
           <polygon points="-5,-10 5,0" stroke="#0284c7" strokeWidth="2" />
         </g>
      </g>
    </svg>
  );
};
`;

code = code.replace(/export const PalmCommunityBlock = \(\) => \([\s\S]*?\n\);\n/, palmCode);
code = code.replace(/export const GenericNeighborhood = \(\{[\s\S]*?\n\};\n/, genericCode);
code = code.replace(/export const AirportBlock = \(\) => \([\s\S]*?\n\);\n/, airportCode);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Rewrote Palm, Generic, Airport to Isometric");
