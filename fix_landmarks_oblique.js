const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const burjKhalifa = `
export const BurjKhalifaIcon = () => (
  <svg viewBox="0 0 100 250" width="100%" height="100%" className="drop-shadow-2xl">
     <SimpleBase w={80} h={80} color="#cbd5e1" thickColor="#94a3b8" rightColor="#64748b" />
     <SimpleBuilding x={30} y={40-60} w={20} h={60} dX={10} dY={-10} fColor="#64748b" rColor="#475569" tColor="#94a3b8" />
     <SimpleBuilding x={32} y={40-120} w={16} h={60} dX={8} dY={-8} fColor="#94a3b8" rColor="#64748b" tColor="#cbd5e1" />
     <SimpleBuilding x={35} y={40-170} w={10} h={50} dX={5} dY={-5} fColor="#cbd5e1" rColor="#94a3b8" tColor="#f1f5f9" />
     <polygon points="40,-130 38,-190 42,-190" fill="#ffffff" />
  </svg>
);
`;

const dubaiFrame = `
export const DubaiFrameIcon = () => (
  <svg viewBox="0 0 100 150" width="100%" height="100%" className="drop-shadow-xl">
     <SimpleBase w={80} h={40} color="#fcd34d" thickColor="#f59e0b" rightColor="#d97706" />
     <SimpleBuilding x={10} y={20-80} w={10} h={80} fColor="#fcd34d" rColor="#fbbf24" tColor="#fde68a" />
     <SimpleBuilding x={60} y={20-80} w={10} h={80} fColor="#fcd34d" rColor="#fbbf24" tColor="#fde68a" />
     <SimpleBuilding x={10} y={20-90} w={60} h={10} dY={-10} dX={10} fColor="#fbbf24" rColor="#f59e0b" tColor="#fde68a" />
  </svg>
);
`;

const hotelCode = `
export const HotelBlock = ({ width = 200, height = 200 }: any) => {
  return (
    <svg viewBox="0 0 250 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform z-30">
       <SimpleBase w={200} h={200} color="#84cc6d" thickColor="#4ade80" rightColor="#22c55e" name="RESORT" />
       
       <rect x="60" y="120" width="80" height="40" fill="#bae6fd" />
       <rect x="65" y="125" width="70" height="30" fill="#38bdf8" />

       <SimpleBuilding x={20} y={100-60} w={40} h={60} fColor="#fcd34d" rColor="#fbbf24" tColor="#fde68a" />
       <SimpleBuilding x={80} y={90-100} w={40} h={100} fColor="#fbbf24" rColor="#f59e0b" tColor="#fde68a" />
       <SimpleBuilding x={140} y={100-70} w={40} h={70} fColor="#fcd34d" rColor="#fbbf24" tColor="#fde68a" />
    </svg>
  );
};
`;

const airportCode = `
export const AirportBlock = () => {
  return (
    <svg viewBox="0 0 400 300" width="100%" height="100%" className="drop-shadow-2xl z-20">
       <SimpleBase w={360} h={200} color="#94a3b8" thickColor="#64748b" rightColor="#475569" name="DXB AIRPORT" />
       <rect x="20" y="50" width="320" height="20" fill="#1e293b" />
       <rect x="20" y="130" width="320" height="20" fill="#1e293b" />
       
       <SimpleBuilding x={100} y={100-30} w={160} h={30} dX={40} dY={-40} fColor="#e2e8f0" rColor="#cbd5e1" tColor="#ffffff" />
    </svg>
  );
};
`;

code = code.replace(/export const BurjKhalifaIcon = \(\) => \([\s\S]*?\n\);\n/, burjKhalifa);
code = code.replace(/export const DubaiFrameIcon = \(\) => \([\s\S]*?\n\);\n/, dubaiFrame);
code = code.replace(/export const HotelBlock = \(\{[\s\S]*?\n\};\n/, hotelCode);
code = code.replace(/export const AirportBlock = \(\) => \([\s\S]*?\n\);\n/, airportCode);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Rewrote Landmarks to Simple Oblique");
