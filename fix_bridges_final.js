const fs = require('fs');

let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /\{\/\* Burj Al Arab Bridge \*\/\}(.|\n)*?\{\/\* Highway \*\/\}/m;
const originalBridges = `{/* Burj Al Arab Bridge */}
                <path d="M 1150 1370 L 1150 1480" fill="none" stroke="#64748b" strokeWidth="6" />
                <path d="M 1150 1370 L 1150 1480" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" />
                
                {/* Bluewaters Bridge */}
                <path d="M 450 1370 L 350 1530" fill="none" stroke="#64748b" strokeWidth="8" />
                <path d="M 450 1370 L 350 1530" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" />
                
                {/* Palm Bridge (Over water) */}
                <path d="M 750 1280 L 750 1420" fill="none" stroke="#cbd5e1" strokeWidth="12" />
                <path d="M 750 1280 L 750 1420" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 6" />
                
                {/* Jumeirah Coast Road */}`;

code = code.replace(regex, originalBridges);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Restored original bridges");
