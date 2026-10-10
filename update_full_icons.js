const fs = require('fs');

let icons = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Replace Burj Al Arab with the iconic detailed sail
const burjAlArabCode = `export const BurjAlArabIcon = () => (
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
    
    {/* Structural Exoskeleton lines */}
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
icons = icons.replace(/export const BurjAlArabIcon = \(\) => \([\s\S]*?<\/svg>\n\);/, burjAlArabCode);

// Replace Palm with the real Palm Jumeirah
const palmCode = `export const PalmCommunityBlock = () => (
  <svg viewBox="0 0 500 500" className="w-[350px] h-[350px] drop-shadow-2xl z-20 relative cursor-pointer group">
     {/* 3-Part Crescent Breakwater */}
     <path d="M 110 95 A 220 220 0 0 1 390 95" fill="none" stroke="#E3CDA4" strokeWidth="35" strokeLinecap="round" />
     <path d="M 90 110 A 220 220 0 0 0 70 400" fill="none" stroke="#E3CDA4" strokeWidth="30" strokeLinecap="round" />
     <path d="M 410 110 A 220 220 0 0 1 430 400" fill="none" stroke="#E3CDA4" strokeWidth="30" strokeLinecap="round" />
     
     {/* Subsea tunnel (visual line) */}
     <line x1="250" y1="50" x2="250" y2="150" stroke="#94a3b8" strokeWidth="6" strokeDasharray="5,5" />
     
     {/* Trunk Main */}
     <rect x="210" y="140" width="80" height="280" fill="#E3CDA4" />
     {/* Trunk Base Wings */}
     <rect x="170" y="370" width="160" height="30" rx="10" fill="#E3CDA4" />
     <rect x="190" y="410" width="120" height="20" rx="6" fill="#E3CDA4" />
     
     {/* 16 Fronds */}
     {Array.from({length: 8}).map((_, i) => {
        const y = 160 + i * 27;
        return (
           <g key={i}>
              <path d={\`M 230 \${y} Q 110 \${y+10} 70 \${y - 30}\`} fill="none" stroke="#E3CDA4" strokeWidth="24" strokeLinecap="round" />
              <path d={\`M 270 \${y} Q 390 \${y+10} 430 \${y - 30}\`} fill="none" stroke="#E3CDA4" strokeWidth="24" strokeLinecap="round" />
           </g>
        )
     })}

     {/* Monorail / Road */}
     <rect x="246" y="140" width="8" height="310" fill="#94a3b8" />
     
     {/* Atlantis The Palm */}
     <g transform="translate(210, 15)">
        <rect x="10" y="15" width="60" height="35" fill="#f43f5e" rx="4" />
        <rect x="30" y="25" width="20" height="25" fill="#E3CDA4" /> 
        <rect x="0" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <rect x="65" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <polygon points="0,15 7.5,-5 15,15" fill="#9f1239" />
        <polygon points="65,15 72.5,-5 80,15" fill="#9f1239" />
        <polygon points="25,15 40,0 55,15" fill="#9f1239" />
        <text x="40" y="65" fill="#9f1239" fontSize="12" fontWeight="black" textAnchor="middle" className="drop-shadow-md">ATLANTIS</text>
     </g>

     {/* Base Trunk label */}
     <text x="250" y="340" fill="#16a34a" fontSize="20" fontWeight="black" textAnchor="middle" transform="rotate(-90 250 340)" className="tracking-widest drop-shadow-md">PALM JUMEIRAH</text>
  </svg>
);`;
icons = icons.replace(/export const PalmCommunityBlock = \(\) => \([\s\S]*?<\/svg>\n\);/, palmCode);

// Replace Burj Khalifa with tiered icon
const burjKhalifaCode = `export const BurjKhalifaIcon = () => (
  <svg viewBox="0 0 100 250" width="100%" height="100%" className="drop-shadow-2xl z-40 relative cursor-pointer hover:scale-110 transition-transform origin-bottom">
     <rect x="42" y="230" width="16" height="20" fill="#64748b" rx="2" />
     <polygon points="30,230 70,230 65,170 35,170" fill="#94a3b8" />
     <polygon points="35,170 65,170 60,110 40,110" fill="#cbd5e1" />
     <polygon points="40,110 60,110 56,50 44,50" fill="#e2e8f0" />
     <polygon points="45,50 55,50 51,10 49,10" fill="#f8fafc" />
     <line x1="50" y1="10" x2="50" y2="0" stroke="#ffffff" strokeWidth="2" />
     <text x="50" y="245" fill="#0284c7" fontSize="10" fontWeight="black" textAnchor="middle">BURJ KHALIFA</text>
  </svg>
);`;
icons = icons.replace(/export const BurjKhalifaIcon = \(\) => \([\s\S]*?<\/svg>\n\);/, burjKhalifaCode);

// Replace Jumeirah Beach Hotel
const jbhCode = `export const JumeirahBeachHotelIcon = () => (
  <svg viewBox="0 0 160 100" className="w-[120px] h-[75px] drop-shadow-xl z-20 relative cursor-pointer">
    <ellipse cx="80" cy="90" rx="75" ry="10" fill="#E3CDA4" />
    <path d="M 10 90 C 10 40, 80 10, 150 90 Z" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" />
    <path d="M 20 90 C 20 50, 80 25, 140 90 Z" fill="#e0f2fe" />
    <path d="M 30 90 C 30 60, 80 40, 130 90 Z" fill="#f0f9ff" />
    <text x="80" y="115" fill="#16a34a" fontSize="14" fontWeight="black" textAnchor="middle" className="drop-shadow-md tracking-widest">JUMEIRAH BEACH HOTEL</text>
  </svg>
);`;
icons = icons.replace(/export const JumeirahBeachHotelIcon = \(\) => \([\s\S]*?<\/svg>\n\);/, jbhCode);

// Replace Museum of the Future
const motfCode = `export const MuseumOfTheFutureIcon = () => (
  <svg viewBox="0 0 120 100" className="w-[100px] h-[80px] drop-shadow-xl z-30 cursor-pointer hover:scale-110 transition-transform">
     <ellipse cx="60" cy="50" rx="55" ry="35" fill="#94a3b8" />
     <ellipse cx="60" cy="50" rx="48" ry="28" fill="#e2e8f0" />
     <ellipse cx="60" cy="50" rx="25" ry="15" fill="#E3CDA4" />
     <path d="M 20 50 Q 60 30 100 50" stroke="#0f172a" strokeWidth="1.5" fill="none" opacity="0.6" />
     <text x="60" y="95" fill="#334155" fontSize="10" fontWeight="black" textAnchor="middle">MUSEUM OF FUTURE</text>
  </svg>
);
export const MuseumOfFutureIcon = MuseumOfTheFutureIcon;`;
icons = icons.replace(/export const MuseumOfTheFutureIcon = \(\) => \([\s\S]*?export const MuseumOfFutureIcon = MuseumOfTheFutureIcon;/, motfCode);

// Replace Dubai Frame
const frameCode = `export const DubaiFrameIcon = () => (
  <svg viewBox="0 0 100 140" className="w-[80px] h-[110px] drop-shadow-xl z-30 cursor-pointer hover:scale-110 transition-transform">
     <rect x="15" y="15" width="70" height="110" fill="none" stroke="#eab308" strokeWidth="14" rx="4" />
     <rect x="18" y="18" width="64" height="104" fill="none" stroke="#fef08a" strokeWidth="4" rx="2" />
     <text x="50" y="138" fill="#ca8a04" fontSize="10" fontWeight="black" textAnchor="middle">DUBAI FRAME</text>
  </svg>
);`;
icons = icons.replace(/export const DubaiFrameIcon = \(\) => \([\s\S]*?<\/svg>\n\);/, frameCode);

fs.writeFileSync('src/components/map/Icons.tsx', icons);
console.log("Updated full detailed icons in Icons.tsx!");
