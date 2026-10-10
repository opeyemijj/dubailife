const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const roadRegex = /\{\/\* Marine Traffic \*\/\}/;
const newRoad = `{/* Mainland Estate Road */}
                <path d="M 400 450 L 2600 450" fill="none" stroke="#64748b" strokeWidth="20" strokeLinecap="round" />
                <path d="M 400 450 L 2600 450" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="10,10" />
                <text x="500" y="430" fill="#475569" fontSize="24" fontWeight="black" className="tracking-[0.2em]" transform="scale(1, -1) translate(0, -860)">MAINLAND ESTATE</text>
                
                {/* Marine Traffic */}`;

code = code.replace(roadRegex, newRoad);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Added estate road and label.");
