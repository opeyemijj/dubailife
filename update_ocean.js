const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Expand World Height
code = code.replace(/const WORLD_HEIGHT = 1500;/g, 'const WORLD_HEIGHT = 1800;');
code = code.replace(/h-\[1500px\]/g, 'h-[1800px]');
code = code.replace(/translate\(0, 1500\)/g, 'translate(0, 1800)');

// 2. Expand Ocean Path
code = code.replace(/L 3000,1500 L 0,1500 Z/g, 'L 3000,1800 L 0,1800 Z');

// 3. Move Palm Jumeirah and set its new gateway link
code = code.replace(/\{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: [0-9]+ \}/, '{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: 1470 }');

const gatewayLink = `
                {/* Palm Gateway Interlink */}
                <path d="M 750 1210 L 750 1310" fill="none" stroke="#64748b" strokeWidth="16" strokeLinecap="round" />
                <path d="M 750 1210 L 750 1310" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 8" />
                
                {/* Jumeirah Coast Road */}
`;
code = code.replace(/\{\/\* Jumeirah Coast Road \*\/\}/, gatewayLink);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Ocean made deeper and Palm connected to Jumeirah road.");
