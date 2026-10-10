const fs = require('fs');

let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /\{\/\* Bridge to Palm \*\/\}(.|\n)*?\{\/\* Highway \*\/\}/m;
const newBridges = `{/* Bridge to Burj Al Arab */}
        <path d="M 1400,1235 Q 1400,1450 1400,1450" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
        <path d="M 1400,1235 Q 1400,1450 1400,1450" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />

        {/* Bridge to Bluewaters */}
        <path d="M 550,1250 L 400,1420" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
        <path d="M 550,1250 L 400,1420" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />
        
        {/* Highway */}`;

code = code.replace(regex, newBridges);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed bridges in InteractiveMap");
