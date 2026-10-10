const fs = require('fs');

// 1. Fix JBR virtualY and update Beach Clubs generation logic
let seedCode = fs.readFileSync('run_seed.js', 'utf8');

// Move JBR closer to the sea
seedCode = seedCode.replace(/\{ id: "jbr"[\s\S]*?\},/, `{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 450, virtualY: 1320 },`);

// Rewrite the nightlife loop
const newNightlifeLogic = `
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

// Spread beach clubs evenly along the right side of the coast (X=1600 to 2900)
let beachStartX = 1600;
let beachEndX = 2900;
let beachStep = (beachEndX - beachStartX) / (beachClubs.length > 1 ? beachClubs.length - 1 : 1);

beachClubs.forEach((venue, i) => {
    let x = beachStartX + i * beachStep;
    let t = (x + 100) / 3200;
    // Coastline equation: M -100 1250 Q 1500 1550 3100 850
    let curveY = Math.pow(1 - t, 2) * 1250 + 2 * (1 - t) * t * 1550 + Math.pow(t, 2) * 850;
    
    venue.virtualX = Math.floor(x);
    venue.virtualY = Math.floor(curveY); // Sit perfectly centered on the coastline edge
    venues.push(venue);
});

otherClubs.forEach(v => venues.push(v));
`;

// Replace the old nightlife parsing loop
const oldLoopRegex = /lines\.forEach\(line => \{[\s\S]*?\}\);/g;
seedCode = seedCode.replace(oldLoopRegex, newNightlifeLogic);

fs.writeFileSync('run_seed.js', seedCode);

// 2. Make the beach thicker in InteractiveMap.tsx
let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Thick Beach Sand Edge
// <path d="M -100 1250 Q 1500 1550 3100 850" fill="none" stroke="#E3CDA4" strokeWidth="40" strokeLinecap="round" />
mapCode = mapCode.replace(/stroke="#E3CDA4" strokeWidth="40"/g, 'stroke="#E3CDA4" strokeWidth="120"');

// We might want to move the Ocean Edge glow slightly to match the new thick beach?
// <path d="M 0,1320 Q 2000,1620 4000,920" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" />
// Actually the glow is fine.

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);

console.log("Fixed JBR, Beach Thickness, and Beach Clubs overlap!");
