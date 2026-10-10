const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Flip X and Y map logic
code = code.replace(
  /renderedX: WORLD_WIDTH - loc\.virtualX,\n\s*renderedY: WORLD_HEIGHT - loc\.virtualY/,
  'renderedX: loc.virtualX,\n      renderedY: WORLD_HEIGHT - loc.virtualY'
);

code = code.replace(
  /<g transform=\{`rotate\(180 \$\{WORLD_WIDTH\/2\} \$\{WORLD_HEIGHT\/2\}\)`\}>/,
  '<g transform={`translate(0, 1500) scale(1, -1)`}>'
);

// Flip player start position 
code = code.replace(
  /setPlayerPos\(\{ x: WORLD_WIDTH - loc\.virtualX, y: WORLD_HEIGHT - loc\.virtualY \}\);/,
  'setPlayerPos({ x: loc.virtualX, y: WORLD_HEIGHT - loc.virtualY });'
);

// 2. Replace the Community Blocks with the Tycoon style
const tycoonCode = `
const VillaHouse = ({ x, y }: { x: number, y: number }) => (
  <g transform={\`translate(\${x}, \${y})\`}>
     <rect x="0" y="10" width="24" height="20" fill="#f8fafc" /> 
     <rect x="0" y="28" width="24" height="2" fill="#cbd5e1" />
     <rect x="3" y="12" width="18" height="14" fill="#22c55e" /> 
     <path d="M 1 12 L 12 4 L 23 12 Z" fill="#15803d" /> 
     <rect x="6" y="16" width="4" height="4" fill="#0f172a" opacity="0.6" /> 
     <rect x="14" y="16" width="4" height="4" fill="#0f172a" opacity="0.6" /> 
  </g>
);

const ApartmentHouse = ({ x, y }: { x: number, y: number }) => (
  <g transform={\`translate(\${x}, \${y})\`}>
     <rect x="0" y="5" width="24" height="25" fill="#f8fafc" />
     <rect x="0" y="28" width="24" height="2" fill="#cbd5e1" />
     <rect x="3" y="0" width="18" height="26" fill="#38bdf8" />
     <rect x="3" y="0" width="18" height="4" fill="#1d4ed8" />
     <rect x="6" y="8" width="4" height="4" fill="#0f172a" opacity="0.6" />
     <rect x="14" y="8" width="4" height="4" fill="#0f172a" opacity="0.6" />
     <rect x="6" y="16" width="4" height="4" fill="#0f172a" opacity="0.6" />
     <rect x="14" y="16" width="4" height="4" fill="#0f172a" opacity="0.6" />
  </g>
);

const TycoonBlock = ({ name, type, cols, rows, w, h }: any) => {
   const isApt = type === 'apartment';
   return (
      <svg viewBox={\`0 0 \${w} \${h}\`} className="drop-shadow-xl z-10 relative cursor-pointer group" style={{width: w, height: h}}>
         <rect width={w} height={h} fill="#bbf7d0" rx="4" />
         <text x={w/2} y="22" fill="#16a34a" fontSize="16" fontWeight="black" textAnchor="middle" className="tracking-widest">{name.toUpperCase()}</text>
         {Array.from({length: rows}).map((_, r) => 
            Array.from({length: cols}).map((_, c) => {
               const x = 15 + c * 28;
               const y = 30 + r * 28;
               return isApt ? <ApartmentHouse key={\`\${r}-\${c}\`} x={x} y={y} /> : <VillaHouse key={\`\${r}-\${c}\`} x={x} y={y} />;
            })
         )}
      </svg>
   );
};

const ArabianRanchesBlock = () => <TycoonBlock name="Arabian Ranches" type="villa" cols={5} rows={3} w={170} h={130} />;
const JBRBlock = () => <TycoonBlock name="JBR" type="apartment" cols={8} rows={2} w={250} h={100} />;
const EmiratesHillsBlock = () => <TycoonBlock name="Emirates Hills" type="villa" cols={7} rows={3} w={220} h={130} />;
const BusinessBayBlock = () => <TycoonBlock name="Business Bay" type="apartment" cols={6} rows={3} w={200} h={130} />;
const DeiraBlock = () => <TycoonBlock name="Deira" type="apartment" cols={7} rows={4} w={220} h={160} />;
`;

// Replace everything from GreenVilla to DeiraBlock
const regexReplaceBlocks = /const GreenVilla = [\s\S]*?const DeiraBlock = \(\) => \([\s\S]*?<\/svg>\n\);/m;
code = code.replace(regexReplaceBlocks, tycoonCode);

// 3. Fix SalikGate
const salikCode = `
const SalikGate = () => (
  <svg viewBox="0 0 100 40" className="w-[100px] h-[40px] drop-shadow-xl z-20 relative">
    <rect x="0" y="0" width="8" height="40" fill="#94a3b8" />
    <rect x="92" y="0" width="8" height="40" fill="#94a3b8" />
    <rect x="0" y="10" width="100" height="10" fill="#e2e8f0" />
    <rect x="25" y="5" width="50" height="20" fill="#ef4444" rx="4" />
    <text x="50" y="19" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">SALIK</text>
  </svg>
);
`;
code = code.replace(/const SalikGate = \(\) => \([\s\S]*?<\/svg>\n\);/, salikCode);

// 4. Update the salik rotations in the venue array due to flip
code = code.replace(/rotate: 15/g, 'rotate: -15');
code = code.replace(/rotate: -30/g, 'rotate: 30');

// 5. Add more billboards
const moreBillboards = `
        { id: "ad-1", name: "Billboard Marina", type: "billboard", virtualX: 700, virtualY: 1050, seed: 201 },
        { id: "ad-2", name: "Billboard E11", type: "billboard", virtualX: 1300, virtualY: 1050, seed: 202 },
        { id: "ad-3", name: "Billboard E44", type: "billboard", virtualX: 1750, virtualY: 750, seed: 203 },
        { id: "ad-4", name: "Billboard Downtown", type: "billboard", virtualX: 2150, virtualY: 850, seed: 204 },
        { id: "ad-5", name: "Billboard Jumeirah", type: "billboard", virtualX: 1100, virtualY: 1150, seed: 205 },
        { id: "ad-6", name: "Billboard Desert", type: "billboard", virtualX: 1500, virtualY: 350, seed: 206 },
        { id: "ad-7", name: "Billboard Deira", type: "billboard", virtualX: 2500, virtualY: 650, seed: 207 },
        { id: "ad-8", name: "Billboard Airport", type: "billboard", virtualX: 2300, virtualY: 250, seed: 208 },
`;
code = code.replace(/\{ id: "ad-1"[\s\S]*?seed: 204 \},/, moreBillboards);

// Write changes
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated tycoon layout and swapped map X axis.");
