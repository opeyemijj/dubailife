const fs = require('fs');
let seedCode = fs.readFileSync('run_seed.js', 'utf8');

// Palm needs to be at virtualY 1564 so its drawn trunk (DOM Y + 144) hits DOM 1180 (SVG 1420)
seedCode = seedCode.replace(/\{ id: "palm"[\s\S]*?\},/, `{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: 1564 },`);

// Bluewaters needs to be at virtualY 1610 so its drawn bottom (DOM Y + 80) hits DOM 1070 (SVG 1530)
seedCode = seedCode.replace(/\{ id: "bluewaters"[\s\S]*?\},/, `{ id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 350, virtualY: 1610 },`);

// Burj Al Arab is already at virtualY 1480, which with translate(-50%, -90%) hits the end exactly.
// It doesn't need to change.

fs.writeFileSync('run_seed.js', seedCode);
console.log("Fixed block alignments!");
