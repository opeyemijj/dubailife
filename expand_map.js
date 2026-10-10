const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Expand constant
code = code.replace(/const WORLD_WIDTH = 3000;/, 'const WORLD_WIDTH = 4000;');

// 2. Expand SVG path coordinates (Ocean, Coast, Roads, Grid lines)
// Ocean
code = code.replace(/3000,900 L 3000,2600 L 0,2600 Z/g, '4000,900 L 4000,2600 L 0,2600 Z');
// Beach edges & ocean glow
code = code.replace(/3000 900/g, '4000 900');
code = code.replace(/3000,920/g, '4000,920');
code = code.replace(/1500,1600/g, '2000,1600');
code = code.replace(/1500 1600/g, '2000 1600');
code = code.replace(/1500,1620/g, '2000,1620');

// Grid lines limit
code = code.replace(/Array.from\(\{ length: 31 \}\)/, 'Array.from({ length: 41 })'); // X grid lines every 100px up to 4000
code = code.replace(/x2=\{3000\}/g, 'x2={4000}'); // Y grid lines width

// Main Roads
code = code.replace(/3000 600/g, '4000 600');
code = code.replace(/3000,600/g, '4000,600');
code = code.replace(/1500 1300/g, '2000 1300');
code = code.replace(/1500,1300/g, '2000,1300');

// Beach road
code = code.replace(/3000 750/g, '4000 750');
code = code.replace(/1500 1450/g, '2000 1450');

// Palm islands and marine paths - just let them float where they are, they are absolute coords.
// Make DXB Airport Huge!
const airportRegex = /const AirportBlock = \(\) => \([\s\S]*?<\/svg>\n\);/;
const bigAirport = \`const AirportBlock = () => (
  <svg viewBox="0 0 600 300" className="w-[600px] h-[300px] drop-shadow-2xl z-10 relative cursor-pointer group hover:scale-105 transition-transform">
    <defs>
      <g id="airplane">
        <path d="M 20 10 L 10 -15 L 15 -15 L 25 10 Z" fill="#e2e8f0" />
        <path d="M 20 10 L 10 35 L 15 35 L 25 10 Z" fill="#e2e8f0" />
        <rect x="0" y="5" width="40" height="10" rx="5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        <path d="M 5 10 L 0 0 L 5 0 L 10 10 Z" fill="#e2e8f0" />
        <path d="M 5 10 L 0 20 L 5 20 L 10 10 Z" fill="#e2e8f0" />
        <rect x="15" y="0" width="8" height="4" rx="2" fill="#94a3b8" />
        <rect x="15" y="16" width="8" height="4" rx="2" fill="#94a3b8" />
      </g>
    </defs>
    <rect x="0" y="0" width="600" height="300" fill="#f8fafc" rx="10" stroke="#cbd5e1" strokeWidth="6" />
    
    {/* Runways */}
    <rect x="50" y="80" width="500" height="40" fill="#334155" />
    <rect x="50" y="180" width="500" height="40" fill="#334155" />
    <line x1="70" y1="100" x2="530" y2="100" stroke="#fef08a" strokeWidth="4" strokeDasharray="20,20" />
    <line x1="70" y1="200" x2="530" y2="200" stroke="#fef08a" strokeWidth="4" strokeDasharray="20,20" />
    
    {/* Terminals */}
    <path d="M 200 130 C 250 110, 350 110, 400 130 L 400 170 C 350 190, 250 190, 200 170 Z" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="2" />
    <circle cx="300" cy="150" r="30" fill="#38bdf8" opacity="0.3" />
    
    {/* Airplanes parked */}
    <use href="#airplane" x="220" y="130" transform="rotate(45 230 140)" />
    <use href="#airplane" x="350" y="130" transform="rotate(-45 360 140)" />
    <use href="#airplane" x="290" y="90" transform="rotate(90 300 100)" />
    <use href="#airplane" x="290" y="210" transform="rotate(-90 300 220)" />
    
    <text x="300" y="50" fill="#0f172a" fontSize="32" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-md">DXB AIRPORT</text>
  </svg>
);\`;

code = code.replace(airportRegex, bigAirport);

// Move the airport further right so it doesn't overlap the new communities
code = code.replace(/\{ id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: 2700, virtualY: 300 \}/, 
                    '{ id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: 3300, virtualY: 350 }');
                    
// Move Deira right so it doesn't overlap with Silicon Oasis or Airport, spread the Row 2 grid more.
// Currently row 1 ends at Silicon Oasis X=2400.
// Currently row 2 ends at Deira X=2400.
// Since DXB is at 3300, it's far away and very safe!

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Expanded WORLD_WIDTH to 4000, fixed SVGs, and made DXB huge at 3300!");
