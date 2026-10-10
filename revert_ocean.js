const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /\{\/\* Coastal Light Blue \*\/\}\s*<path d="M 0,1300 Q 1500,1600 3000,900 L 3000,2600 L 0,2600 Z" fill="#0ea5e9" opacity="0\.8" \/>\s*\{\/\* Deep Ocean Blue \*\/\}\s*<path d="M -100,1600 Q 1500,1900 3100,1200 L 3100,2600 L -100,2600 Z" fill="#0284c7" \/>\s*\{\/\* Abyssal Blue \(Far out\) \*\/\}\s*<path d="M -100,2000 Q 1500,2300 3100,1600 L 3100,2600 L -100,2600 Z" fill="#0369a1" \/>/;

const restoredOcean = `
                {/* Original Ocean Color */}
                <path d="M 0,1300 Q 1500,1600 3000,900 L 3000,2600 L 0,2600 Z" fill="#60BAEB" />
`;

code = code.replace(regex, restoredOcean);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Restored original ocean color");
