const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Update TycoonBlock to have road connectors and be massive
const newTycoonCode = `
const TycoonBlock = ({ name, type, cols, rows, w, h }: any) => {
   const isApt = type === 'apartment';
   return (
      <svg viewBox={\`0 0 \${w} \${h}\`} className="drop-shadow-2xl z-10 relative cursor-pointer group" style={{width: w, height: h}}>
         {/* Road Connectors */}
         <rect x={w/2 - 20} y={-15} width={40} height={30} fill="#94a3b8" />
         <rect x={w/2 - 20} y={h-15} width={40} height={30} fill="#94a3b8" />
         <rect x={-15} y={h/2 - 20} width={30} height={40} fill="#94a3b8" />
         <rect x={w-15} y={h/2 - 20} width={30} height={40} fill="#94a3b8" />
         
         <rect width={w} height={h} fill="#bbf7d0" rx="8" stroke="#86efac" strokeWidth="4" />
         <text x={w/2} y="22" fill="#16a34a" fontSize="18" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-sm">{name.toUpperCase()}</text>
         {Array.from({length: rows}).map((_, r) => 
            Array.from({length: cols}).map((_, c) => {
               const x = 20 + c * 28;
               const y = 35 + r * 28;
               return isApt ? <ApartmentHouse key={\`\${r}-\${c}\`} x={x} y={y} /> : <VillaHouse key={\`\${r}-\${c}\`} x={x} y={y} />;
            })
         )}
      </svg>
   );
};

const ArabianRanchesBlock = () => <TycoonBlock name="Arabian Ranches" type="villa" cols={11} rows={8} w={340} h={270} />;
const JBRBlock = () => <TycoonBlock name="JBR" type="apartment" cols={15} rows={4} w={450} h={160} />;
const EmiratesHillsBlock = () => <TycoonBlock name="Emirates Hills" type="villa" cols={12} rows={7} w={360} h={240} />;
const BusinessBayBlock = () => <TycoonBlock name="Business Bay" type="apartment" cols={12} rows={10} w={360} h={320} />;
const DeiraBlock = () => <TycoonBlock name="Deira" type="apartment" cols={11} rows={7} w={340} h={240} />;
const MotorCityBlock = () => <TycoonBlock name="Motor City" type="apartment" cols={10} rows={6} w={310} h={210} />;
`;

code = code.replace(/const TycoonBlock = [\s\S]*?const MotorCityBlock = \(\) => <TycoonBlock name="Motor City" type="apartment" cols=\{5\} rows=\{5\} w=\{160\} h=\{160\} \/>;/m, newTycoonCode);

// 2. Update their coordinates in the venues array to slot them EXACTLY between the roads
code = code.replace(/\{ id: "jbr"[\s\S]*?\}/, '{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 750, virtualY: 1250 }');
code = code.replace(/\{ id: "emirates-hills"[\s\S]*?\}/, '{ id: "emirates-hills", name: "Emirates Hills", type: "community-emirates-hills", virtualX: 1100, virtualY: 970 }');
code = code.replace(/\{ id: "motor-city"[\s\S]*?\}/, '{ id: "motor-city", name: "Motor City", type: "community-motor-city", virtualX: 1400, virtualY: 800 }');
code = code.replace(/\{ id: "business-bay"[\s\S]*?\}/, '{ id: "business-bay", name: "Business Bay", type: "community-business-bay", virtualX: 2000, virtualY: 850 }');
code = code.replace(/\{ id: "deira"[\s\S]*?\}/, '{ id: "deira", name: "Deira & Old Dubai", type: "community-deira", virtualX: 2750, virtualY: 800 }');
code = code.replace(/\{ id: "ranches"[\s\S]*?\}/, '{ id: "ranches", name: "Arabian Ranches", type: "community-ranches", virtualX: 1600, virtualY: 450 }');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Made communities massive and connected them to roads.");
