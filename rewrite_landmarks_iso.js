const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

const burjKhalifa = `
export const BurjKhalifaIcon = () => (
  <svg viewBox="0 0 100 250" width="100%" height="100%" className="drop-shadow-2xl">
    <g transform="translate(50, 220)">
       <IsoBase width={80} height={80} color="#cbd5e1" edgeLeft="#64748b" edgeRight="#94a3b8" />
       
       {/* 3D Tiered Skyscraper */}
       <IsoBox x={0} y={-10} w={20} d={20} h={60} colorLeft="#64748b" colorRight="#94a3b8" colorTop="#cbd5e1" />
       <IsoBox x={0} y={-70} w={15} d={15} h={50} colorLeft="#94a3b8" colorRight="#cbd5e1" colorTop="#f1f5f9" />
       <IsoBox x={0} y={-120} w={10} d={10} h={40} colorLeft="#cbd5e1" colorRight="#e2e8f0" colorTop="#f8fafc" />
       <IsoBox x={0} y={-160} w={5} d={5} h={30} colorLeft="#e2e8f0" colorRight="#f1f5f9" colorTop="#ffffff" />
       {/* Spire */}
       <polygon points="0,-190 -2,-210 0,-215 2,-210" fill="#ffffff" />
    </g>
  </svg>
);
`;

const dubaiFrame = `
export const DubaiFrameIcon = () => (
  <svg viewBox="0 0 100 150" width="100%" height="100%" className="drop-shadow-xl">
    <g transform="translate(50, 120)">
       <IsoBase width={80} height={40} color="#fcd34d" edgeLeft="#d97706" edgeRight="#f59e0b" />
       
       {/* Left Pillar */}
       <IsoBox x={-20} y={0} w={8} d={8} h={80} colorLeft="#fcd34d" colorRight="#fde68a" colorTop="#fef3c7" />
       {/* Right Pillar */}
       <IsoBox x={20} y={0} w={8} d={8} h={80} colorLeft="#fcd34d" colorRight="#fde68a" colorTop="#fef3c7" />
       {/* Top Bridge */}
       <g transform="translate(0, -80)">
          <IsoBox x={0} y={0} w={30} d={12} h={15} colorLeft="#fbbf24" colorRight="#fcd34d" colorTop="#fde68a" />
       </g>
    </g>
  </svg>
);
`;

const burjAlArab = `
export const BurjAlArabIcon = () => (
  <svg viewBox="0 0 100 150" width="100%" height="100%" className="drop-shadow-xl">
    <g transform="translate(50, 120)">
       {/* Island Base */}
       <ellipse cx="0" cy="0" rx="30" ry="15" fill="#38bdf8" />
       <ellipse cx="0" cy="-5" rx="30" ry="15" fill="#e2e8f0" />
       
       {/* Sail shape 3D approximation */}
       <path d="M 0,-5 Q -30,-50 0,-100 Q 15,-50 15,-5 Z" fill="#ffffff" />
       <path d="M 0,-5 Q -30,-50 0,-100 L 0,-5 Z" fill="#f1f5f9" />
       
       {/* Spine */}
       <polygon points="12,-5 15,-5 0,-100 -2,-100" fill="#94a3b8" />
       
       {/* Helipad */}
       <ellipse cx="-15" cy="-70" rx="10" ry="5" fill="#22c55e" stroke="#ffffff" />
    </g>
  </svg>
);
`;

const motf = `
export const MuseumOfFutureIcon = ({ width = 80, height = 100 }: any) => (
  <svg viewBox="0 0 100 120" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-xl z-30">
    <g transform="translate(50, 90)">
       <IsoBase width={100} height={60} color="#22c55e" edgeLeft="#166534" edgeRight="#14532d" />
       
       {/* 3D Torus Approximation */}
       <ellipse cx="0" cy="-40" rx="40" ry="30" fill="#94a3b8" />
       <ellipse cx="-2" cy="-42" rx="38" ry="28" fill="#cbd5e1" />
       <ellipse cx="-5" cy="-45" rx="32" ry="22" fill="#f1f5f9" />
       
       {/* Hole */}
       <ellipse cx="0" cy="-40" rx="15" ry="10" fill="#22c55e" />
       
       {/* Calligraphy strokes */}
       <path d="M -20,-50 Q -10,-60 0,-50 T 20,-50" fill="none" stroke="#64748b" strokeWidth="2" />
       <path d="M -15,-30 Q -5,-20 10,-30 T 25,-30" fill="none" stroke="#64748b" strokeWidth="2" />
    </g>
  </svg>
);
`;

code = code.replace(/export const BurjKhalifaIcon = \(\) => \([\s\S]*?\n\);\n/, burjKhalifa);
code = code.replace(/export const DubaiFrameIcon = \(\) => \([\s\S]*?\n\);\n/, dubaiFrame);
code = code.replace(/export const BurjAlArabIcon = \(\) => \([\s\S]*?\n\);\n/, burjAlArab);
code = code.replace(/export const MuseumOfFutureIcon = \(\{[\s\S]*?\n\);\n/, motf);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Rewrote Landmarks to Isometric");
