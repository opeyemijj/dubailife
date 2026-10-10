const fs = require('fs');

// 1. Fix InteractiveMap.tsx (One Yellow Sand, Extend Palm Bridge)
let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Change sand color back to one yellow
mapCode = mapCode.replace(/stroke="#E3CDA4" strokeWidth="120"/g, 'stroke="#fde047" strokeWidth="120"');

// Extend Palm Bridge from SVG 1420 to SVG 1600
mapCode = mapCode.replace(/<path d="M 750 1239 L 750 1420"/g, '<path d="M 750 1239 L 750 1600"');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);

// 2. Fix run_seed.js (Move Palm Jumeirah further into the water)
let seedCode = fs.readFileSync('run_seed.js', 'utf8');

// Palm was at 1564. We move it to 1744 so its trunk base is at DOM 1000 (SVG 1600).
seedCode = seedCode.replace(/\{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: 1564 \},/, '{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: 1744 },');

fs.writeFileSync('run_seed.js', seedCode);

console.log("Fixed yellow and Palm Jumeirah!");
