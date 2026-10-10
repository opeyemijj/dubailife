const fs = require('fs');

// 1. Update InteractiveMap.tsx to have the perfect CSS 3D camera
let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Ensure map container has the 3D perspective
mapCode = mapCode.replace(
  /className="relative cursor-crosshair[^"]*"\s*style=\{\{.*?\}\}/g,
  `className="relative cursor-crosshair shadow-2xl origin-center transition-transform duration-500" style={{ width: \`\${WORLD_WIDTH}px\`, height: \`\${WORLD_HEIGHT}px\`, backgroundColor: "#E3CDA4", transform: \`perspective(3000px) rotateX(\${mapConfig?.pitch ?? 55}deg) rotateZ(\${mapConfig?.yaw ?? 45}deg)\`, transformStyle: "preserve-3d" }}`
);

// Ensure venue containers preserve 3D
mapCode = mapCode.replace(
  /className={\`absolute flex flex-col items-center/g,
  `className={\`absolute flex flex-col items-center preserve-3d`
);
mapCode = mapCode.replace(
  /transform: \`\$\{baseTransform\} \$\{rotationTransform\}\`\.trim\(\)/g,
  `transform: \`\${baseTransform} \${rotationTransform}\`.trim(), transformStyle: 'preserve-3d'`
);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);

// 2. Update Icons.tsx to use CSS3D blocks
const iconsCode = `
import React from 'react';

export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 2600;

export const CSS3DBlock = ({ w=40, d=40, h=40, color="#3b82f6", label="" }: any) => {
  const topColor = color;
  const frontColor = "#94a3b8"; // A standard shadow color
  const rightColor = "#64748b";

  return (
    <div style={{ width: w, height: d, position: 'relative', transformStyle: 'preserve-3d' }}>
      {/* Base shadow */}
      <div style={{ position: 'absolute', width: w, height: d, background: 'rgba(0,0,0,0.3)', transform: 'translateZ(-1px)', filter: 'blur(4px)' }} />
      
      {/* Front face (Rotates up from the bottom edge) */}
      <div style={{ 
        position: 'absolute', width: w, height: h, background: frontColor, 
        transformOrigin: 'bottom', transform: \`translateY(\${d - h}px) rotateX(90deg)\`,
        border: '1px solid rgba(0,0,0,0.1)'
      }} />
      
      {/* Right face (Rotates up from the right edge) */}
      <div style={{ 
        position: 'absolute', width: h, height: d, background: rightColor, 
        transformOrigin: 'right', transform: \`translateX(\${w - h}px) rotateY(-90deg)\`,
        border: '1px solid rgba(0,0,0,0.1)'
      }} />
      
      {/* Top face (Lifted up by h) */}
      <div style={{ 
        position: 'absolute', width: w, height: d, background: topColor, 
        transform: \`translateZ(\${h}px)\`,
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {label && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', transform: 'rotateZ(-45deg)' }}>{label}</span>}
      </div>
    </div>
  );
};

export const ConfigurableApartmentBlock = ({ width=300, height=250, color="#3b82f6", name="Community", numBuildings=3 }: any) => {
  return (
    <div style={{ width, height, position: 'relative', transformStyle: 'preserve-3d' }}>
      {/* Base Ground */}
      <div style={{ position: 'absolute', width, height, background: '#84cc6d', transform: 'translateZ(0)', border: '2px solid #4ade80' }} />
      
      {/* Pool */}
      <div style={{ position: 'absolute', left: 200, top: 40, width: 80, height: 60, background: '#38bdf8', transform: 'translateZ(2px)', border: '4px solid #e2e8f0' }} />

      {/* Court */}
      <div style={{ position: 'absolute', left: 160, top: 160, width: 100, height: 60, background: '#ea580c', transform: 'translateZ(1px)', border: '2px solid #fff' }} />

      {/* Buildings */}
      <div style={{ position: 'absolute', left: 40, top: 40, transformStyle: 'preserve-3d' }}>
        <CSS3DBlock w={40} d={40} h={120} color={color} label="A" />
      </div>
      <div style={{ position: 'absolute', left: 40, top: 120, transformStyle: 'preserve-3d' }}>
        <CSS3DBlock w={40} d={60} h={80} color={color} label="B" />
      </div>
      <div style={{ position: 'absolute', left: 100, top: 40, transformStyle: 'preserve-3d' }}>
        <CSS3DBlock w={30} d={30} h={50} color={color} label="C" />
      </div>
      
      <div style={{ position: 'absolute', left: 20, top: height - 30, transform: 'translateZ(10px) rotateZ(-45deg)' }}>
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', textShadow: '1px 1px 2px #000' }}>{name}</span>
      </div>
    </div>
  );
};

export const GiantBillboardBlock = ({ text1="AD", color1="#0ea5e9" }) => {
  return (
    <div style={{ width: 150, height: 40, position: 'relative', transformStyle: 'preserve-3d' }}>
       {/* Poles */}
       <div style={{ position: 'absolute', left: 30, top: 15, width: 10, height: 10, background: '#475569', transform: 'translateZ(0)' }} />
       <div style={{ position: 'absolute', left: 110, top: 15, width: 10, height: 10, background: '#475569', transform: 'translateZ(0)' }} />
       {/* The Billboard Face (Standing Up) */}
       <div style={{ 
         position: 'absolute', left: 0, top: 20, width: 150, height: 80, background: color1,
         transformOrigin: 'bottom', transform: 'rotateX(90deg) translateZ(10px)',
         border: '4px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center'
       }}>
         <span style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{text1}</span>
       </div>
    </div>
  );
};

export const AirportBlock = () => (
  <div style={{ width: 400, height: 300, background: '#94a3b8', position: 'relative', transformStyle: 'preserve-3d' }}>
    <div style={{ position: 'absolute', left: 50, top: 50, width: 300, height: 40, background: '#334155', transform: 'translateZ(2px)' }} />
    <div style={{ position: 'absolute', left: 100, top: 120, transformStyle: 'preserve-3d' }}>
       <CSS3DBlock w={200} d={60} h={40} color="#cbd5e1" label="DXB TERMINAL" />
    </div>
  </div>
);

export const GenericNeighborhood = ({ name="DISTRICT" }) => (
  <div style={{ width: 200, height: 200, background: '#e2e8f0', position: 'relative', transformStyle: 'preserve-3d' }}>
    <div style={{ position: 'absolute', left: 20, top: 20, transformStyle: 'preserve-3d' }}>
       <CSS3DBlock w={40} d={40} h={60} color="#64748b" />
    </div>
    <div style={{ position: 'absolute', left: 100, top: 80, transformStyle: 'preserve-3d' }}>
       <CSS3DBlock w={50} d={50} h={100} color="#3b82f6" />
    </div>
  </div>
);

export const TycoonBlock = ({ w=300, h=200, color="#22c55e", name="BLOCK", type }) => {
  const isApt = type === 'apartment';
  return (
    <div style={{ width: w, height: h, background: color, position: 'relative', transformStyle: 'preserve-3d', border: '2px solid #16a34a' }}>
      <div style={{ position: 'absolute', left: 20, top: 20, transformStyle: 'preserve-3d' }}>
         <CSS3DBlock w={w/2} d={h/2} h={isApt ? 80 : 30} color={isApt ? "#3b82f6" : "#f59e0b"} label={name} />
      </div>
    </div>
  );
};

// ... Fallbacks for everything else
export const getBuildingSprite = (id, type, seed, title, loc, onUnitClick) => {
  if (type === 'configurable-apartment') return <ConfigurableApartmentBlock {...loc} name={title} onUnitClick={onUnitClick} />;
  if (type === 'giant-billboard') return <GiantBillboardBlock text1={loc?.text1} color1={loc?.color1} />;
  if (type === 'airport') return <AirportBlock />;
  if (type.startsWith('community')) return <TycoonBlock w={loc?.width||200} h={loc?.height||200} type={type.includes('apartment')?'apartment':'villa'} name={title} />;
  return <GenericNeighborhood name={title} />;
};

export const initialAds = [];
`;

fs.writeFileSync('src/components/map/Icons.tsx', iconsCode);
console.log("Deployed True CSS3D Engine!");
