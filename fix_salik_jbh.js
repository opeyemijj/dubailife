const fs = require('fs');

let icons = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Replace SalikGate
const realSalik = `export const SalikGate = () => (
  <svg viewBox="0 0 100 40" className="w-[100px] h-[40px] drop-shadow-xl z-20 relative pointer-events-none">
    <rect x="0" y="0" width="8" height="40" fill="#94a3b8" />
    <rect x="92" y="0" width="8" height="40" fill="#94a3b8" />
    <rect x="0" y="10" width="100" height="10" fill="#e2e8f0" />
    <rect x="25" y="5" width="50" height="20" fill="#ef4444" rx="4" />
    <text x="50" y="19" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">SALIK</text>
  </svg>
);`;
icons = icons.replace(/export const SalikGate = \(\) => <rect width="100" height="50" fill="#ef4444" rx="10" \/>;/, realSalik);

// Add handlers to getBuildingSprite
icons = icons.replace(
  /if \(type === 'burj-al-arab'\) return <BurjAlArabIcon \/>;/,
  "if (type === 'burj-al-arab') return <BurjAlArabIcon />;\n  if (type === 'jbh') return <JumeirahBeachHotelIcon />;\n  if (type === 'salik') return <SalikGate />;"
);

fs.writeFileSync('src/components/map/Icons.tsx', icons);
console.log("Updated SalikGate and registered jbh & salik!");
