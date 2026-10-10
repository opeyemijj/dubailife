const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Add Inland Road Network (E44, E311, and Cross Roads) right below the E11 Base Highway
const e11Regex = /\{\/\* Marine Traffic \*\/\}/;
const newRoads = `{/* Inland Road Network (E44, E311, and Cross Roads) */}
                {/* E44 Al Khail Road */}
                <path d="M -100 750 Q 1500 1050 3100 350" fill="none" stroke="#475569" strokeWidth="32" strokeLinecap="round" />
                <path d="M -100 750 Q 1500 1050 3100 350" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="10,10" />
                
                {/* E311 Sheikh Mohammed Bin Zayed Road */}
                <path d="M -100 500 Q 1500 800 3100 100" fill="none" stroke="#475569" strokeWidth="24" strokeLinecap="round" />
                <path d="M -100 500 Q 1500 800 3100 100" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="10,10" />

                {/* E611 Emirates Road */}
                <path d="M -100 300 Q 1500 600 3100 -100" fill="none" stroke="#475569" strokeWidth="16" strokeLinecap="round" />
                
                {/* Cross Roads (Vertical-ish) */}
                <path d="M 600 300 L 800 1000" fill="none" stroke="#64748b" strokeWidth="16" strokeLinecap="round" /> {/* Garn Al Sabkha */}
                <path d="M 600 300 L 800 1000" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="6,8" />
                
                <path d="M 1100 350 L 1300 1100" fill="none" stroke="#64748b" strokeWidth="20" strokeLinecap="round" /> {/* Hessa St */}
                <path d="M 1100 350 L 1300 1100" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="6,8" />
                
                <path d="M 1600 250 L 1800 950" fill="none" stroke="#64748b" strokeWidth="20" strokeLinecap="round" /> {/* Umm Suqeim */}
                <path d="M 1600 250 L 1800 950" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="6,8" />
                
                <path d="M 2100 150 L 2300 850" fill="none" stroke="#64748b" strokeWidth="16" strokeLinecap="round" /> {/* Al Safa / Meydan */}
                <path d="M 2100 150 L 2300 850" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="6,8" />
                
                <path d="M 2600 50 L 2800 750" fill="none" stroke="#64748b" strokeWidth="16" strokeLinecap="round" /> {/* Airport Road */}
                <path d="M 2600 50 L 2800 750" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="6,8" />

                {/* Marine Traffic */}`;

code = code.replace(e11Regex, newRoads);

// 2. Re-map all inland communities into these distinct blocks
const communityUpdates = [
  // Block 1 (E11 to E44, Left of Hessa)
  [/\{ id: "emirates-hills"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "emirates-hills", name: "Emirates Hills", type: "community-emirates-hills", virtualX: 950, virtualY: 880 },'],
  
  // Block 2 (E11 to E44, Hessa to Umm Suqeim)
  [/\{ id: "al-barsha"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+, seed: 103 \},/, 
   '{ id: "al-barsha", name: "Al Barsha", type: "generic-district", virtualX: 1450, virtualY: 900, seed: 103 },'],
   
  // Block 2.5 (E11 to E44, Umm Suqeim to Meydan)
  [/\{ id: "al-quoz"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+, seed: 101 \},/, 
   '{ id: "al-quoz", name: "Al Quoz", type: "generic-district", virtualX: 1900, virtualY: 820, seed: 101 },'],

  // Block 3 (E11 to E44, Meydan to Airport)
  [/\{ id: "business-bay"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "business-bay", name: "Business Bay", type: "community-business-bay", virtualX: 2350, virtualY: 700 },'],
   
  [/\{ id: "burj-khalifa"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "burj-khalifa", name: "Burj Khalifa", type: "hotel", virtualX: 2150, virtualY: 780 },'],
  [/\{ id: "dubai-mall"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "dubai-mall", name: "The Dubai Mall", type: "mall", size: "text-8xl", virtualX: 2250, virtualY: 760 },'],

  // Block 4 (E44 to E311, Left of Hessa)
  [/\{ id: "discovery-gardens"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+, seed: 104 \},/, 
   '{ id: "discovery-gardens", name: "Discovery Gdns", type: "generic-district", virtualX: 950, virtualY: 650, seed: 104 },'],

  // Block 5 (E44 to E311, Hessa to Umm Suqeim)
  [/\{ id: "motor-city"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "motor-city", name: "Motor City", type: "community-motor-city", virtualX: 1400, virtualY: 720 },'],

  // Block 6 (E44 to E311, Umm Suqeim to Meydan)
  [/\{ id: "dubai-hills"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "dubai-hills", name: "Dubai Hills", type: "community-dubai-hills", virtualX: 1950, virtualY: 600 },'],

  // Block 7 (Below E311, Hessa to Umm Suqeim)
  [/\{ id: "ranches"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "ranches", name: "Arabian Ranches", type: "community-ranches", virtualX: 1350, virtualY: 500 },'],

  // Block 8 (Far Right Inland)
  [/\{ id: "silicon-oasis"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+, seed: 105 \},/, 
   '{ id: "silicon-oasis", name: "Silicon Oasis", type: "generic-district", virtualX: 2450, virtualY: 450, seed: 105 },'],
   
  // Fix Deira & Airport so they are cleanly separated
  [/\{ id: "deira"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "deira", name: "Deira & Old Dubai", type: "community-deira", virtualX: 2750, virtualY: 720 },'],
  [/\{ id: "dxb"[\s\S]*?virtualX: [0-9]+, virtualY: [0-9]+ \},/, 
   '{ id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: 2850, virtualY: 550 },']
];

for (const [regex, replacement] of communityUpdates) {
  if (!code.match(regex)) {
     console.log("Warning: Could not find match for:", regex);
  }
  code = code.replace(regex, replacement);
}

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Grid layout created and communities mapped perfectly into blocks");
