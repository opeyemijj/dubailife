const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Replace RooftopIconNew
const rooftopRegex = /const RooftopIconNew = \(\) => \([\s\S]*?<\/svg>\n\);/;
const newRooftop = `const RooftopIconNew = () => (
  <svg viewBox="0 0 60 100" className="w-[50px] h-[80px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="40" width="40" height="60" fill="#334155" rx="2" />
    <rect x="15" y="45" width="10" height="50" fill="#94a3b8" />
    <rect x="35" y="45" width="10" height="50" fill="#94a3b8" />
    <circle cx="30" cy="20" r="18" fill="#1e293b" />
    <path d="M 23 28 L 30 15 L 37 28" fill="none" stroke="#facc15" strokeWidth="2" />
    <circle cx="30" cy="11" r="3" fill="#facc15" />
    <text x="30" y="36" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">SKY</text>
  </svg>
);`;
code = code.replace(rooftopRegex, newRooftop);

// Replace NightclubIconNew
const clubRegex = /const NightclubIconNew = \(\) => \([\s\S]*?<\/svg>\n\);/;
const newClub = `const NightclubIconNew = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="30" width="60" height="40" fill="#1e293b" rx="4" />
    <rect x="15" y="35" width="50" height="30" fill="#0f172a" rx="2" />
    <rect x="35" y="50" width="10" height="20" fill="#ef4444" opacity="0.8" />
    <circle cx="40" cy="18" r="16" fill="#9333ea" />
    <circle cx="40" cy="18" r="12" fill="none" stroke="#f472b6" strokeWidth="2" strokeDasharray="2 2" />
    <path d="M 35 12 L 35 24 L 47 18 Z" fill="#ffffff" />
  </svg>
);`;
code = code.replace(clubRegex, newClub);

// Replace BeachClubIconNew
const beachClubRegex = /const BeachClubIconNew = \(\) => \([\s\S]*?<\/svg>\n\);/;
const newBeachClub = `const BeachClubIconNew = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="40" width="60" height="30" fill="#fef08a" rx="2" />
    <rect x="15" y="45" width="20" height="15" fill="#38bdf8" opacity="0.8" />
    <rect x="45" y="45" width="20" height="15" fill="#38bdf8" opacity="0.8" />
    <circle cx="40" cy="20" r="18" fill="#fde047" />
    <circle cx="40" cy="20" r="15" fill="#38bdf8" />
    <path d="M 30 20 Q 40 10 50 20 Q 40 30 30 20" fill="#fef08a" />
  </svg>
);`;
code = code.replace(beachClubRegex, newBeachClub);

// Replace RestaurantIconNew
const restaurantRegex = /const RestaurantIconNew = \(\) => \([\s\S]*?<\/svg>\n\);/;
const newRestaurant = `const RestaurantIconNew = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <polygon points="10,40 40,25 70,40" fill="#b91c1c" />
    <rect x="15" y="40" width="50" height="35" fill="#f8fafc" />
    <rect x="25" y="50" width="10" height="15" fill="#cbd5e1" />
    <rect x="45" y="50" width="10" height="15" fill="#cbd5e1" />
    <circle cx="40" cy="15" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
    <path d="M 35 10 L 35 20 M 32 12 L 38 12 M 32 15 L 38 15" stroke="#64748b" strokeWidth="1" />
    <path d="M 45 8 Q 42 15 45 22 Q 48 15 45 8" fill="none" stroke="#64748b" strokeWidth="1" />
  </svg>
);`;
code = code.replace(restaurantRegex, newRestaurant);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated SVG icons to have buildings as bases!");
