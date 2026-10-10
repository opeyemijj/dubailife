const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /<div className="absolute top-2 left-2 bg-white\/90 px-3 py-1 rounded-md font-black text-blue-600 shadow-sm pointer-events-none tracking-widest text-sm">\s*MILLION DIRHAM HOMEPAGE - CLICK TO ADVERTISE\s*<\/div>/g;

code = code.replace(regex, '');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Removed ad box.");
