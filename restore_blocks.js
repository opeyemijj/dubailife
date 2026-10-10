const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const palmCode = `
const PalmCommunityBlock = () => (
  <svg viewBox="0 0 400 400" className="w-[250px] h-[250px] drop-shadow-2xl z-10 relative cursor-pointer group">
     <rect x="180" y="200" width="40" height="180" fill="#E8D1A7" />
     {Array.from({ length: 5 }).map((_, i) => (
       <g key={\`left-frond-\${i}\`}>
          <path d={\`M 200 \${220 - i*30} Q 100 \${190 - i*30} 40 \${260 - i*20} Q 130 \${230 - i*30} 200 \${240 - i*30}\`} fill="#E8D1A7" />
          <VillaHouse x={100} y={220 - i*28} />
          <VillaHouse x={130} y={225 - i*28} />
          <VillaHouse x={160} y={230 - i*28} />
       </g>
     ))}
     {Array.from({ length: 5 }).map((_, i) => (
       <g key={\`right-frond-\${i}\`}>
          <path d={\`M 200 \${220 - i*30} Q 300 \${190 - i*30} 360 \${260 - i*20} Q 270 \${230 - i*30} 200 \${240 - i*30}\`} fill="#E8D1A7" />
          <VillaHouse x={220} y={235 - i*28} />
          <VillaHouse x={250} y={230 - i*28} />
          <VillaHouse x={280} y={225 - i*28} />
       </g>
     ))}
     <path d="M 20 200 Q 200 -50 380 200" fill="none" stroke="#E8D1A7" strokeWidth="30" strokeLinecap="round" />
     <text x="200" y="300" fill="#b45309" fontSize="16" fontWeight="black" textAnchor="middle" transform="rotate(-90 200 300)" className="opacity-60">PALM JUMEIRAH</text>
  </svg>
);

const MotorCityBlock = () => <TycoonBlock name="Motor City" type="apartment" cols={5} rows={5} w={160} h={160} />;
`;

code = code.replace(/const TycoonBlock = [\s\S]*?const DeiraBlock = [\s\S]*?;/, match => match + '\n' + palmCode);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Restored Palm and Motor City");
