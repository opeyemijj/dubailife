const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const multiLaneE11 = `
                {/* E11 Base Highway */}
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#334155" strokeWidth="48" />
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#facc15" strokeWidth="2" />
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 8)" />
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 16)" />
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -8)" />
                <path d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -16)" />
                
                <path id="e11-right" d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="transparent" />
                <path id="e11-left" d="M -100 550 Q 1500 250 3100 950" fill="none" stroke="transparent" />
`;

const regex = /\{\/\* E11 SZR \*\/\}\n\s*<path d="M -100,950 Q 1500,1250 3100,550" fill="none" stroke="#64748b" strokeWidth="24" strokeLinecap="round" \/>\n\s*<path id="e11-right" d="M -100,935 Q 1500,1235 3100,535" fill="none" \/>\n\s*<path id="e11-left" d="M -100,965 Q 1500,1265 3100,565" fill="none" \/>\n\s*<path d="M -100,950 Q 1500,1250 3100,550" fill="none" stroke="#fbbf24" strokeWidth="4" strokeDasharray="20 20" \/>/m;

code = code.replace(regex, multiLaneE11);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Road upgraded!");
