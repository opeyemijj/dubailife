const fs = require('fs');

let code = fs.readFileSync('run_seed.js', 'utf8');

// The line is: virtualY: startY + 100,
code = code.replace(/virtualY: startY \+ 100,/g, 'virtualY: startY + 170,');

fs.writeFileSync('run_seed.js', code);
console.log("Fixed Y offset for EstateBase");
