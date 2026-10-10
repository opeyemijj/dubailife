const fs = require('fs');

let seedCode = fs.readFileSync('run_seed.js', 'utf8');

seedCode = seedCode.replace(/\{ id: "jbr"[\s\S]*?\},/, `{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 450, virtualY: 1260 },`);

fs.writeFileSync('run_seed.js', seedCode);

console.log("Fixed JBR virtualY!");
