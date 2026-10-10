const fs = require('fs');

let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /\{\/\* Highway \*\/\}/;
const newRoads = `{/* Bridge to Palm */}
        <path d="M 1000,1235 L 1000,1600" fill="none" stroke="#64748b" strokeWidth="12" strokeLinecap="round" />
        <path d="M 1000,1235 L 1000,1600" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" strokeDasharray="10 10" />

        {/* Bridge to Burj Al Arab */}
        <path d="M 1400,1235 Q 1400,1450 1400,1450" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
        <path d="M 1400,1235 Q 1400,1450 1400,1450" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />

        {/* Bridge to Bluewaters */}
        <path d="M 550,1320 L 400,1550" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
        <path d="M 550,1320 L 400,1550" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />
        
        {/* Highway */}`;
code = code.replace(regex, newRoads);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Added bridges for Palm, Burj Al Arab, and Bluewaters");
