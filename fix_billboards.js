const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Update BillboardSpace Component to have varying sizes
const oldBillboard = /const BillboardSpace = \(\{ seed \}: \{ seed: number \}\) => \{[\s\S]*?return \(\s*<svg viewBox="0 0 120 100" className="w-\[100px\] h-\[85px\] drop-shadow-2xl z-30 relative cursor-pointer group hover:scale-110 transition-transform">/;

const newBillboard = `const BillboardSpace = ({ seed }: { seed: number }) => {
  const color1 = seed % 2 === 0 ? "#ef4444" : "#8b5cf6";
  const color2 = seed % 3 === 0 ? "#f59e0b" : "#3b82f6";
  const scales = [0.6, 0.9, 1.2, 1.6];
  const scale = scales[seed % scales.length];
  const w = 100 * scale;
  const h = 85 * scale;
  return (
     <svg viewBox="0 0 120 100" style={{ width: \`\${w}px\`, height: \`\${h}px\` }} className="drop-shadow-2xl z-30 relative cursor-pointer group hover:scale-110 transition-transform origin-bottom">`;

code = code.replace(oldBillboard, newBillboard);

// 2. Fix the coordinates and seeds for variety
const oldAds = /\/\/ Coastal Ad Plots[\s\S]*?\/\/ Master Communities/;
const newAds = `// Coastal Ad Plots
        { id: "coast-ad-1", name: "Marina Beach Ad", type: "billboard", virtualX: 250, virtualY: 1320, seed: 15, interactive: true },
        { id: "coast-ad-2", name: "Sufouh Beach Ad", type: "billboard", virtualX: 720, virtualY: 1350, seed: 10, interactive: true },
        { id: "coast-ad-3", name: "Jumeirah Bay Ad", type: "billboard", virtualX: 950, virtualY: 1360, seed: 12, interactive: true },
        { id: "coast-ad-4", name: "Sunset Beach Ad", type: "billboard", virtualX: 1500, virtualY: 1340, seed: 14, interactive: true },
        { id: "coast-ad-5", name: "Kite Beach Ad", type: "billboard", virtualX: 1800, virtualY: 1370, seed: 13, interactive: true },
        { id: "coast-ad-6", name: "Mercato Ad", type: "billboard", virtualX: 2050, virtualY: 1360, seed: 11, interactive: true },
        { id: "coast-ad-7", name: "La Mer Ad", type: "billboard", virtualX: 2350, virtualY: 1375, seed: 16, interactive: true },
        { id: "coast-ad-8", name: "Port Rashid Ad", type: "billboard", virtualX: 2700, virtualY: 1385, seed: 17, interactive: true },
        
        // Master Communities`;

code = code.replace(oldAds, newAds);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated billboards with sizes and spacing");
