const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /\/\/ Master Communities/;
const newAds = `// Coastal Ad Plots
        { id: "coast-ad-1", name: "Marina Beach Ad", type: "billboard", virtualX: 250, virtualY: 1320, seed: 10, interactive: true },
        { id: "coast-ad-2", name: "JBR Coast Ad", type: "billboard", virtualX: 600, virtualY: 1350, seed: 11, interactive: true },
        { id: "coast-ad-3", name: "Jumeirah Bay Ad", type: "billboard", virtualX: 950, virtualY: 1360, seed: 12, interactive: true },
        { id: "coast-ad-4", name: "Sunset Beach Ad", type: "billboard", virtualX: 1300, virtualY: 1365, seed: 13, interactive: true },
        { id: "coast-ad-5", name: "Kite Beach Ad", type: "billboard", virtualX: 1800, virtualY: 1370, seed: 14, interactive: true },
        { id: "coast-ad-6", name: "La Mer Ad", type: "billboard", virtualX: 2350, virtualY: 1375, seed: 15, interactive: true },
        
        // Master Communities`;

code = code.replace(regex, newAds);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Added coastal ad billboards");
