const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Update Burj Al Arab position
code = code.replace(/\{ id: "burj-al-arab", name: "Burj Al Arab", type: "hotel", virtualX: [0-9]+, virtualY: [0-9]+ \},/, '{ id: "burj-al-arab", name: "Burj Al Arab", type: "hotel", virtualX: 1150, virtualY: 1530 },');

// 2. Add Jumeirah Beach Hotel venue
const jbhVenue = `        { id: "jumeirah-beach-hotel", name: "Jumeirah Beach Hotel", type: "jbh", virtualX: 1220, virtualY: 1380 },
        { id: "burj-al-arab"`;
code = code.replace(/        \{ id: "burj-al-arab"/, jbhVenue);

// 3. Add Jumeirah Beach Hotel icon component
const jbhIconCode = `
const JumeirahBeachHotelIcon = () => (
  <svg viewBox="0 0 160 100" className="w-[120px] h-[75px] drop-shadow-xl z-20 relative cursor-pointer">
    <ellipse cx="80" cy="90" rx="75" ry="10" fill="#E3CDA4" />
    <path d="M 10 90 C 10 40, 80 10, 150 90 Z" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" />
    <path d="M 20 90 C 20 50, 80 25, 140 90 Z" fill="#e0f2fe" />
    <path d="M 30 90 C 30 60, 80 40, 130 90 Z" fill="#f0f9ff" />
    <text x="80" y="115" fill="#16a34a" fontSize="14" fontWeight="black" textAnchor="middle" className="drop-shadow-md tracking-widest">JUMEIRAH BEACH HOTEL</text>
  </svg>
);

const BurjAlArabIcon`;
code = code.replace(/const BurjAlArabIcon/, jbhIconCode);

// 4. Register icon in getBuildingSprite
code = code.replace(/case 'burj-al-arab': return <BurjAlArabIcon \/>;/, "case 'burj-al-arab': return <BurjAlArabIcon />;\n    case 'jbh': return <JumeirahBeachHotelIcon />;");

// 5. Add bridge to the SVG background
const burjBridge = `
                {/* Burj Al Arab Bridge */}
                <path d="M 1150 1370 L 1150 1480" fill="none" stroke="#64748b" strokeWidth="6" />
                <path d="M 1150 1370 L 1150 1480" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" />
                
                {/* Bluewaters Bridge */}
`;
code = code.replace(/\{\/\* Bluewaters Bridge \*\/\}/, burjBridge);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Moved Burj Al Arab to the sea and added JBH");
