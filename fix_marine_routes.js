const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const marineRoutes = `
                {/* Marine Routes (Hidden paths for animation) */}
                <path id="route-yacht-1" d="M -100 2400 Q 1500 2200 3100 2400" fill="none" />
                <path id="route-yacht-2" d="M 3100 2100 Q 1500 2300 -100 2100" fill="none" />
                <path id="route-jetski-1" d="M -100 1800 Q 1000 1900 1400 1800 Q 2000 1700 3100 1800" fill="none" />
                <path id="route-jetski-2" d="M 900 1500 Q 600 1650 200 1500" fill="none" />
                <path id="route-jetski-3" d="M 2100 1400 Q 1600 1500 1200 1400" fill="none" />
                
                <path id="metro-path"`;

code = code.replace(/<path id="metro-path"/, marineRoutes);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Added marine routes");
