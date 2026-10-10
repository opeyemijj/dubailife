const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const newJum = `
                {/* Jumeirah Coast Road */}
                <path d="M -100 1210 Q 1500 1510 3100 810" fill="none" stroke="#64748b" strokeWidth="24" strokeLinecap="round" />
                <path d="M -100 1210 Q 1500 1510 3100 810" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 8" />
                
                <path id="jum-right" d="M -100 1210 Q 1500 1510 3100 810" fill="none" />
                <path id="jum-left" d="M -100 1210 Q 1500 1510 3100 810" fill="none" />
`;

code = code.replace(/\{\/\* Jumeirah Coast Road \*\/\}\n\s*<path id="jum-right" d="M -100,1200 Q 1500,1500 3100,800" fill="none" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" \/>\n\s*<path id="jum-left" d="M -100,1220 Q 1500,1520 3100,820" fill="none" \/>\n\s*<path d="M -100,1210 Q 1500,1510 3100,810" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="15 15" \/>/m, newJum);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed Jumeirah paths");
