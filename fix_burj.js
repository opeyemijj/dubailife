const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const oldBurjRegex = /const BurjAlArabIcon = \(\) => \([\s\S]*?<\/svg>\n\);/;
const newBurjCode = `const BurjAlArabIcon = () => (
  <svg viewBox="0 0 160 320" className="w-[120px] h-[240px] drop-shadow-2xl z-40 relative cursor-pointer hover:scale-110 transition-transform origin-bottom">
    {/* Island Base */}
    <ellipse cx="80" cy="285" rx="70" ry="15" fill="#E3CDA4" />
    <path d="M 20 280 L 140 280 L 130 290 L 30 290 Z" fill="#94a3b8" />
    
    {/* Back Spine / Mast */}
    <rect x="55" y="40" width="12" height="240" fill="#f8fafc" />
    <rect x="61" y="40" width="6" height="240" fill="#cbd5e1" />
    
    {/* Sky Spire */}
    <polygon points="55,40 67,40 61,0" fill="#f8fafc" />
    <polygon points="61,40 67,40 61,0" fill="#cbd5e1" />
    
    {/* Al Muntaha Restaurant (Left cantilever) */}
    <path d="M 55 75 L 15 75 L 15 88 L 55 98 Z" fill="#0ea5e9" opacity="0.9" stroke="#0284c7" strokeWidth="1" />
    <path d="M 55 70 L 15 70 L 15 75 L 55 75 Z" fill="#f8fafc" />
    <polygon points="55,98 15,88 55,110" fill="#cbd5e1" opacity="0.5" />
    
    {/* The Main Sail (Right) */}
    <path d="M 67 60 Q 180 180 67 280 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
    
    {/* Glass Atrium (Inner sail curve) */}
    <path d="M 67 60 Q 120 180 67 280 Z" fill="#bae6fd" opacity="0.6" stroke="#7dd3fc" strokeWidth="2" />
    
    {/* Structural Exoskeleton lines (The V shapes) */}
    <path d="M 67 60 L 105 130 L 67 170" fill="none" stroke="#f8fafc" strokeWidth="4" strokeLinejoin="round" />
    <path d="M 67 170 L 120 220 L 67 280" fill="none" stroke="#f8fafc" strokeWidth="5" strokeLinejoin="round" />
    <path d="M 67 60 L 105 130 L 67 170" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinejoin="round" />
    <path d="M 67 170 L 120 220 L 67 280" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinejoin="round" />

    {/* Horizontal Ribs */}
    <path d="M 67 100 Q 125 150 67 200" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.5" />
    <path d="M 67 130 Q 140 180 67 240" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.5" />
    
    {/* Helipad (Right cantilever) */}
    <path d="M 67 90 L 110 80" fill="none" stroke="#64748b" strokeWidth="4" />
    <ellipse cx="120" cy="78" rx="22" ry="6" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
    <ellipse cx="120" cy="78" rx="14" ry="4" fill="none" stroke="#ffffff" strokeWidth="1" />
    <text x="120" y="80.5" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">H</text>

    {/* Label */}
    <text x="80" y="315" fill="#1d4ed8" fontSize="16" fontWeight="black" textAnchor="middle" className="drop-shadow-md tracking-wider">BURJ AL ARAB</text>
  </svg>
);`;

code = code.replace(oldBurjRegex, newBurjCode);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated Burj Al Arab icon");
