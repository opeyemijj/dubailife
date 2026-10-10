const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /<path d="M 0,1300 Q 1500,1600 3000,900 L 3000,2600 L 0,2600 Z" fill="#0284c7" \/>/;
const newOcean = `
                {/* Coastal Light Blue */}
                <path d="M 0,1300 Q 1500,1600 3000,900 L 3000,2600 L 0,2600 Z" fill="#0ea5e9" opacity="0.8" />
                
                {/* Deep Ocean Blue */}
                <path d="M -100,1600 Q 1500,1900 3100,1200 L 3100,2600 L -100,2600 Z" fill="#0284c7" />
                
                {/* Abyssal Blue (Far out) */}
                <path d="M -100,2000 Q 1500,2300 3100,1600 L 3100,2600 L -100,2600 Z" fill="#0369a1" />
`;

code = code.replace(regex, newOcean);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Enhanced ocean layers");
