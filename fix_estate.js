const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Remove Drag Logic
code = code.replace(/const \[isEditMode, setIsEditMode\] = useState\(false\);[\s\S]*?const handlePointerUp = \(\) => \{\n\s*setActiveDragId\(null\);\n\s*\};/, '');
code = code.replace(/id="map-content-wrapper" onPointerMove=\{handlePointerMove\} onPointerUp=\{handlePointerUp\} onPointerLeave=\{handlePointerUp\}/, 'id="map-content-wrapper"');
code = code.replace(/onPointerDown=\{\(e\) => handlePointerDown\(e, loc\.id\)\}/g, '');
code = code.replace(/\$\{isEditMode \? 'cursor-grab active:cursor-grabbing hover:ring-4 ring-yellow-400' : ''\}/g, '');
code = code.replace(/panning=\{\{ disabled: activeDragId !== null, velocityMultiplier: 0\.8 \}\}/, 'panning={{ velocityMultiplier: 0.8 }}');
code = code.replace(/\{toastMsg && \(/, '{toastMsg && (');
// Also remove the Edit Map button HUD
code = code.replace(/\{\/\* Editor HUD \*\/\}[\s\S]*?<\/div>\s*\{toastMsg && \(/, '{toastMsg && (');

// 2. Add New Icons for Town layout
const iconsRegex = /\/\/ --- CUSTOM SVG ICONS FOR ICONIC DUBAI LANDMARKS ---/;
const newIcons = `// --- CUSTOM SVG ICONS FOR ICONIC DUBAI LANDMARKS ---
const SmallHouseIcon = () => (
  <svg viewBox="0 0 40 40" className="w-[35px] h-[35px] drop-shadow-sm cursor-pointer hover:scale-110 transition-transform">
     <rect x="8" y="20" width="24" height="16" fill="#e2e8f0" />
     <polygon points="4,20 20,8 36,20" fill="#22c55e" />
     <rect x="16" y="26" width="8" height="10" fill="#94a3b8" />
  </svg>
);

const StadiumIcon = () => (
  <svg viewBox="0 0 100 80" className="w-[80px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <ellipse cx="50" cy="40" rx="45" ry="30" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="4" />
     <ellipse cx="50" cy="40" rx="35" ry="20" fill="#22c55e" />
     <rect x="48" y="25" width="4" height="30" fill="#ffffff" opacity="0.6" />
     <circle cx="50" cy="40" r="5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
  </svg>
);

const HospitalIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <rect x="15" y="20" width="50" height="50" fill="#f8fafc" rx="4" />
     <rect x="30" y="10" width="20" height="60" fill="#f1f5f9" rx="2" />
     <rect x="35" y="30" width="10" height="10" fill="#ef4444" />
     <rect x="30" y="35" width="20" height="10" fill="#ef4444" />
  </svg>
);

const SchoolIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <rect x="10" y="40" width="60" height="30" fill="#fbbf24" rx="2" />
     <polygon points="10,40 40,20 70,40" fill="#b45309" />
     <rect x="35" y="50" width="10" height="20" fill="#78350f" />
  </svg>
);

const CasinoIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <rect x="20" y="20" width="40" height="50" fill="#0f172a" rx="4" />
     <circle cx="40" cy="40" r="10" fill="#eab308" />
     <text x="40" y="44" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">$</text>
     <rect x="10" y="70" width="60" height="10" fill="#1e293b" />
  </svg>
);

const ParkIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[70px] h-[70px] drop-shadow-md cursor-pointer hover:scale-110 transition-transform">
     <rect x="5" y="5" width="70" height="70" fill="#4ade80" rx="8" />
     <circle cx="25" cy="25" r="12" fill="#16a34a" />
     <circle cx="55" cy="55" r="15" fill="#15803d" />
     <circle cx="60" cy="20" r="10" fill="#16a34a" />
     <path d="M 20 60 Q 40 40 60 20" fill="none" stroke="#d4d4d8" strokeWidth="4" />
  </svg>
);`;

code = code.replace(iconsRegex, newIcons);

// 3. Update getBuildingSprite to include new types
const spriteRegex = /if \(type === 'community-dubai-hills'\) return <GenericCommunityIcon name="Dubai Hills" \/>;/;
const newSprite = `if (type === 'community-dubai-hills') return <GenericCommunityIcon name="Dubai Hills" />;
    if (type === 'small-house') return <SmallHouseIcon />;
    if (type === 'stadium') return <StadiumIcon />;
    if (type === 'hospital') return <HospitalIcon />;
    if (type === 'school') return <SchoolIcon />;
    if (type === 'casino') return <CasinoIcon />;
    if (type === 'park') return <ParkIcon />;`;
code = code.replace(spriteRegex, newSprite);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Cleaned up drag, added icons");
