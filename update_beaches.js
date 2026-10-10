const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Add thick beach sand edge to ocean
const beachEdge = `
                {/* Thick Beach Sand Edge */}
                <path d="M 0 1300 Q 1500 1600 3000 900" fill="none" stroke="#fde047" strokeWidth="20" opacity="0.8" />
                <path d="M 0 1300 Q 1500 1600 3000 900" fill="none" stroke="#fef08a" strokeWidth="8" opacity="0.9" />
                
                {/* Ocean Edge Glow */}`;
code = code.replace(/<path d="M 0,1320 Q 1500,1620 3000,920" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" \/>/, match => beachEdge + '\n                ' + match);

// 2. Add New Icons (Bulgari Island & Atlantis The Royal)
const newIcons = `
const BulgariIslandIcon = () => (
  <svg viewBox="0 0 120 120" className="w-[120px] h-[120px] drop-shadow-xl z-20 relative cursor-pointer group">
    {/* Seahorse Island */}
    <path d="M 60 100 C 20 100, 20 60, 40 40 C 60 20, 80 20, 90 40 C 100 60, 80 70, 70 70 C 60 70, 50 60, 50 50" fill="none" stroke="#E3CDA4" strokeWidth="25" strokeLinecap="round" />
    {/* Resort Buildings */}
    <rect x="35" y="45" width="20" height="10" fill="#f8fafc" rx="2" transform="rotate(-30 45 50)" />
    <rect x="65" y="30" width="15" height="15" fill="#f8fafc" rx="2" />
    <text x="60" y="115" fill="#16a34a" fontSize="12" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-md">BULGARI RESORT</text>
  </svg>
);

const AtlantisTheRoyalIcon = () => (
  <svg viewBox="0 0 160 80" className="w-[140px] h-[70px] drop-shadow-2xl z-20 relative cursor-pointer group">
    {/* Base structure */}
    <rect x="10" y="50" width="140" height="10" fill="#f1f5f9" rx="2" />
    {/* Jenga blocks left */}
    <rect x="20" y="30" width="30" height="20" fill="#e2e8f0" rx="1" />
    <rect x="30" y="10" width="30" height="20" fill="#cbd5e1" rx="1" />
    {/* Jenga blocks right */}
    <rect x="110" y="30" width="30" height="20" fill="#e2e8f0" rx="1" />
    <rect x="100" y="10" width="30" height="20" fill="#cbd5e1" rx="1" />
    {/* Sky bridge */}
    <rect x="50" y="15" width="60" height="8" fill="#f8fafc" />
    <text x="80" y="75" fill="#e11d48" fontSize="12" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-md">ATLANTIS THE ROYAL</text>
  </svg>
);

const BeachClubIcon`;
code = code.replace(/const BeachClubIcon/, newIcons);

// 3. Register icons
code = code.replace(/case 'beach-club': return <BeachClubIcon \/>;/, "case 'beach-club': return <BeachClubIcon />;\n    case 'bulgari': return <BulgariIslandIcon />;\n    case 'atlantis-royal': return <AtlantisTheRoyalIcon />;");

// 4. Update coordinates to be strictly ON THE SAND (lower virtualY) and Add new venues
// Old JBH: 1380 -> 1350
code = code.replace(/\{ id: "jumeirah-beach-hotel", name: "Jumeirah Beach Hotel", type: "jbh", virtualX: 1220, virtualY: [0-9]+ \}/, '{ id: "jumeirah-beach-hotel", name: "Jumeirah Beach Hotel", type: "jbh", virtualX: 1220, virtualY: 1350 }');

// Update other beach clubs to be properly on sand
code = code.replace(/\{ id: "bla-bla", name: "Bla Bla Dubai", type: "beach-club", virtualX: 420, virtualY: [0-9]+ \}/, '{ id: "bla-bla", name: "Bla Bla Dubai", type: "beach-club", virtualX: 420, virtualY: 1340 }');
code = code.replace(/\{ id: "zero-gravity", name: "Zero Gravity", type: "beach-club", virtualX: 560, virtualY: [0-9]+ \}/, '{ id: "zero-gravity", name: "Zero Gravity", type: "beach-club", virtualX: 560, virtualY: 1345 }');
code = code.replace(/\{ id: "barasti", name: "Barasti Beach", type: "beach-club", virtualX: 640, virtualY: [0-9]+ \}/, '{ id: "barasti", name: "Barasti Beach", type: "beach-club", virtualX: 640, virtualY: 1355 }');
code = code.replace(/\{ id: "shimmers", name: "Shimmers", type: "beach-club", virtualX: 1080, virtualY: [0-9]+ \}/, '{ id: "shimmers", name: "Shimmers", type: "beach-club", virtualX: 1080, virtualY: 1355 }');
code = code.replace(/\{ id: "nammos", name: "Nammos Dubai", type: "beach-club", virtualX: 1400, virtualY: [0-9]+ \}/, '{ id: "nammos", name: "Nammos Dubai", type: "beach-club", virtualX: 1400, virtualY: 1335 }');
code = code.replace(/\{ id: "nikki-beach", name: "Nikki Beach", type: "beach-club", virtualX: 1800, virtualY: [0-9]+ \}/, '{ id: "nikki-beach", name: "Nikki Beach", type: "beach-club", virtualX: 1800, virtualY: 1275 }');

// Add new resorts
const newResorts = `        { id: "atlantis-royal", name: "Atlantis The Royal", type: "atlantis-royal", virtualX: 920, virtualY: 1530 },
        { id: "one-and-only", name: "One&Only Royal Mirage", type: "hotel", size: "text-7xl", virtualX: 650, virtualY: 1335 },
        { id: "sunset-beach", name: "Sunset Beach", type: "beach", size: "text-7xl", virtualX: 1150, virtualY: 1350 },
        { id: "kite-beach", name: "Kite Beach", type: "beach", size: "text-7xl", virtualX: 1300, virtualY: 1345 },
        { id: "bulgari", name: "Bulgari Resort", type: "bulgari", virtualX: 1600, virtualY: 1450 },
        { id: "la-mer", name: "La Mer Beach", type: "beach", size: "text-7xl", virtualX: 1700, virtualY: 1290 },
        { id: "mandarin", name: "Mandarin Oriental", type: "hotel", size: "text-7xl", virtualX: 1750, virtualY: 1275 },
        { id: "mamzar", name: "Al Mamzar Beach Park", type: "beach", size: "text-7xl", virtualX: 2500, virtualY: 1130 },
        
        // Famous Beach Clubs & Lounges`;
code = code.replace(/\/\/ Famous Beach Clubs & Lounges/, newResorts);

// 5. Add Bridge for Bulgari
const bulgariBridge = `
                {/* Bulgari Bridge */}
                <path d="M 1600 1335 L 1600 1450" fill="none" stroke="#64748b" strokeWidth="6" />
                <path d="M 1600 1335 L 1600 1450" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" />
                
                {/* Burj Al Arab Bridge */}`;
code = code.replace(/\{\/\* Burj Al Arab Bridge \*\/\}/, bulgariBridge);


fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed beach placements and added new resorts.");
