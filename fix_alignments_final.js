const fs = require('fs');

let seedCode = fs.readFileSync('run_seed.js', 'utf8');

// The ACTUAL original coordinates based on the SVG bridges in the background
seedCode = seedCode.replace(/\{ id: "jbr"[\s\S]*?\},/, `{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 450, virtualY: 1370 },`);
seedCode = seedCode.replace(/\{ id: "bluewaters"[\s\S]*?\},/, `{ id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 350, virtualY: 1530 },`);
seedCode = seedCode.replace(/\{ id: "palm"[\s\S]*?\},/, `{ id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: 1420 },`);
seedCode = seedCode.replace(/\{ id: "burj-al-arab"[\s\S]*?\},/, `{ id: "burj-al-arab", name: "Burj Al Arab", type: "burj-al-arab", virtualX: 1150, virtualY: 1480 },`);

// Also Marina should probably be near JBR
seedCode = seedCode.replace(/\{ id: "marina"[\s\S]*?\},/, `{ id: "marina", name: "Dubai Marina", type: "generic-district", virtualX: 550, virtualY: 1250, seed: 3 },`);

fs.writeFileSync('run_seed.js', seedCode);
console.log("Fixed run_seed.js to use the ORIGINAL bridge coordinates!");
