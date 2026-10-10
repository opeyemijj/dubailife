const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Imports
code = code.replace(/import \{ getVenues \} from "@\/app\/actions\/venue";/, 
`import { getVenues } from "@/app/actions/venue";
import { mapSeedVenues } from "@/data/mapSeed";`);

// 2. Map Dimensions
code = code.replace(/const WORLD_WIDTH = 4000;/, 'const WORLD_WIDTH = 8000;');
code = code.replace(/const WORLD_HEIGHT = 2600;/, 'const WORLD_HEIGHT = 5000;');

// 3. SVG Transform and ViewBox
code = code.replace(/<svg width=\{WORLD_WIDTH\} height=\{WORLD_HEIGHT\} className="absolute inset-0 pointer-events-none">/,
'<svg width={WORLD_WIDTH} height={WORLD_HEIGHT} className="absolute inset-0 pointer-events-none">');
code = code.replace(/<g transform=\{\`translate\(0, 2600\) scale\(1, -1\)\`\}>/, '<g transform={`translate(0, 5000) scale(1, -1)`}>');

// 4. Update Ocean paths to span 8000x5000
// M 0,1300 Q 2000,1600 4000,900 L 4000,2600 L 0,2600 Z
code = code.replace(/M 0,1300 Q 2000,1600 4000,900 L 4000,2600 L 0,2600 Z/, 'M 0,2500 Q 4000,3000 8000,1800 L 8000,5000 L 0,5000 Z');

// Thick Beach Sand Edge
code = code.replace(/M 0 1300 Q 2000 1600 4000 900/g, 'M 0 2500 Q 4000 3000 8000 1800');

// Ocean Edge Glow
code = code.replace(/M 0,1320 Q 2000,1620 4000,920/, 'M 0,2540 Q 4000,3040 8000,1840');

// Main Highway E11 (approx)
code = code.replace(/M 0 1000 Q 2000 1300 4000 600/g, 'M 0 1500 Q 4000 2000 8000 1000');

// Beach road (approx)
code = code.replace(/M 0 1150 Q 2000 1450 4000 750/g, 'M 0 2300 Q 4000 2800 8000 1600');

// Grid Lines limit limit
code = code.replace(/Array.from\(\{ length: 41 \}\)/, 'Array.from({ length: 81 })');
code = code.replace(/x2=\{4000\}/g, 'x2={8000}');
code = code.replace(/y2=\{2600\}/g, 'y2={5000}');

// Remove the hardcoded estate-community logic and fallbackvenues
const venuesRegex = /setVenues\(\[\s*([\s\S]*?)\s*\]\);/;
code = code.replace(venuesRegex, 'setVenues(mapSeedVenues);');

// 5. Update custom icons
const iconsRegex = /\/\/ --- CUSTOM SVG ICONS FOR ICONIC DUBAI LANDMARKS ---/;
const newIcons = `// --- CUSTOM SVG ICONS FOR ICONIC DUBAI LANDMARKS ---
const ClickableHouse = () => (
  <svg viewBox="0 0 40 40" className="w-[40px] h-[40px] drop-shadow-md cursor-pointer hover:scale-125 transition-transform z-10">
    <rect x="0" y="0" width="40" height="40" fill="#f8fafc" rx="4" />
    <rect x="0" y="0" width="40" height="40" fill="none" stroke="#e2e8f0" strokeWidth="2" rx="4" />
    <g transform="translate(4, 4) scale(0.8)">
        <rect x="0" y="16" width="32" height="20" fill="#e2e8f0" />
        <polygon points="-4,16 16,0 36,16" fill="#22c55e" />
        <rect x="12" y="22" width="8" height="14" fill="#94a3b8" />
    </g>
  </svg>
);

const ApartmentBuildingIcon = () => (
  <svg viewBox="0 0 50 120" className="w-[50px] h-[120px] drop-shadow-2xl cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="10" width="30" height="110" fill="#cbd5e1" rx="2" />
    <rect x="15" y="0" width="20" height="10" fill="#94a3b8" rx="1" />
    {Array.from({length: 8}).map((_, i) => (
       <g key={i}>
         <rect x="15" y={20 + i*10} width="8" height="6" fill="#38bdf8" opacity="0.6" />
         <rect x="27" y={20 + i*10} width="8" height="6" fill="#38bdf8" opacity="0.6" />
       </g>
    ))}
  </svg>
);

const RooftopIcon = () => (
  <svg viewBox="0 0 60 60" className="w-[50px] h-[50px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform z-20">
    <circle cx="30" cy="30" r="28" fill="#1e293b" />
    <path d="M 20 40 L 30 20 L 40 40" fill="none" stroke="#facc15" strokeWidth="3" />
    <circle cx="30" cy="15" r="5" fill="#facc15" />
    <text x="30" y="52" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">SKY</text>
  </svg>
);

const NightclubIcon = () => (
  <svg viewBox="0 0 60 60" className="w-[50px] h-[50px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform z-20">
    <circle cx="30" cy="30" r="28" fill="#9333ea" />
    <circle cx="30" cy="30" r="20" fill="none" stroke="#f472b6" strokeWidth="2" strokeDasharray="4 4" />
    <path d="M 25 20 L 25 40 L 40 30 Z" fill="#ffffff" />
  </svg>
);

const BeachClubIcon = () => (
  <svg viewBox="0 0 60 60" className="w-[50px] h-[50px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform z-20">
    <circle cx="30" cy="30" r="28" fill="#fde047" />
    <circle cx="30" cy="30" r="24" fill="#38bdf8" />
    <path d="M 15 30 Q 30 15 45 30 Q 30 45 15 30" fill="#fef08a" />
    <circle cx="30" cy="30" r="6" fill="#fbbf24" />
  </svg>
);

const RestaurantIcon = () => (
  <svg viewBox="0 0 60 60" className="w-[50px] h-[50px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform z-20">
    <circle cx="30" cy="30" r="28" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
    <path d="M 20 15 L 20 45 M 15 20 L 25 20 M 15 25 L 25 25" stroke="#64748b" strokeWidth="2" />
    <path d="M 40 15 Q 35 25 40 45 Q 45 25 40 15" fill="none" stroke="#64748b" strokeWidth="2" />
  </svg>
);
`;
code = code.replace(iconsRegex, newIcons);

// Update getBuildingSprite to use new types
const spriteRegex = /if \(type === 'estate-community'\) return <EstateCommunityBlock name=\{title \|\| ''\} \/>;[\s\S]*?if \(type === 'park'\) return <ParkIcon \/>;/;
const newSprite = `if (type === 'small-house') return <ClickableHouse />;
    if (type === 'apartment-building') return <ApartmentBuildingIcon />;
    if (type === 'rooftop') return <RooftopIcon />;
    if (type === 'club') return <NightclubIcon />;
    if (type === 'beach-club') return <BeachClubIcon />;
    if (type === 'restaurant') return <RestaurantIcon />;
`;
code = code.replace(spriteRegex, newSprite);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated InteractiveMap.tsx with massive scale and new icons");
