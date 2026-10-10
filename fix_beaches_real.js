const fs = require('fs');

// 1. Fix the sand thickness in InteractiveMap.tsx
let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

mapCode = mapCode.replace(/stroke="#fde047" strokeWidth="20"/g, 'stroke="#fde047" strokeWidth="120"');
mapCode = mapCode.replace(/stroke="#fef08a" strokeWidth="8"/g, 'stroke="#fef08a" strokeWidth="40"');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);

// 2. Fix the math in run_seed.js and manually arrange the clubs
let seedCode = fs.readFileSync('run_seed.js', 'utf8');

const newLogic = `
let beachClubs = [];
let otherClubs = [];

lines.forEach(line => {
    let [name, desc] = line.split(' — ');
    if (!desc) desc = "Nightlife & Entertainment";
    name = name.trim();
    
    let type = 'club';
    if (name.toLowerCase().includes('beach') || desc.toLowerCase().includes('beach')) type = 'beach-club';
    else if (name.toLowerCase().includes('rooftop') || desc.toLowerCase().includes('sky')) type = 'rooftop';
    else if (desc.toLowerCase().includes('restaurant')) type = 'restaurant';

    let isBeach = type === 'beach-club';

    let venue = {
        id: \`venue-\${idCounter++}\`,
        name,
        type,
        interactive: true,
        description: desc
    };

    if (isBeach) {
        beachClubs.push(venue);
    } else {
        venue.virtualX = Math.floor(500 + Math.random() * 2500);
        venue.virtualY = Math.floor(200 + Math.random() * 600); // Inland nightlife
        otherClubs.push(venue);
    }
});

// Custom mapping for realism
const beachXMap = {
    "Cove Beach": 350,       // Bluewaters
    "Bla Bla Dubai": 480,    // JBR
    "Zero Gravity Dubai": 580, // Marina / Skydive
    "Barasti Beach": 620,    // Marina edge
    "Drift Beach Dubai": 660, // One&Only
    "WHITE Beach": 730,      // Palm
    "SAN Beach": 770,        // Palm
    "Playa Beach Club": 810, // Palm
    "African Queen": 850,    // Palm
    "Nammos Dubai": 1800,    // Four Seasons
    "Twiggy by La Cantine": 2400, // Creek / North
    "Nikki Beach Restaurant & Beach Club": 2800 // Pearl Jumeira
};

let unmappedBeachClubs = [];

beachClubs.forEach((venue) => {
    let exactX = beachXMap[venue.name];
    if (exactX) {
        venue.virtualX = exactX;
        let t = exactX / 4000;
        let curveY = Math.pow(1 - t, 2) * 1300 + 2 * (1 - t) * t * 1600 + Math.pow(t, 2) * 900;
        venue.virtualY = Math.floor(curveY);
        venues.push(venue);
    } else {
        unmappedBeachClubs.push(venue);
    }
});

// Distribute remaining evenly in the empty space (X=2000 to X=3500)
let startX = 2000;
let stepX = 1200 / (unmappedBeachClubs.length || 1);
unmappedBeachClubs.forEach((venue, i) => {
    let x = startX + i * stepX;
    venue.virtualX = Math.floor(x);
    let t = x / 4000;
    let curveY = Math.pow(1 - t, 2) * 1300 + 2 * (1 - t) * t * 1600 + Math.pow(t, 2) * 900;
    venue.virtualY = Math.floor(curveY);
    venues.push(venue);
});

otherClubs.forEach(v => venues.push(v));
`;

const oldLoopRegex = /let beachClubs = \[\];[\s\S]*?otherClubs\.forEach\(v => venues\.push\(v\)\);\n\n/g;
seedCode = seedCode.replace(oldLoopRegex, newLogic);

fs.writeFileSync('run_seed.js', seedCode);

console.log("Fixed beach sand and club placement!");
