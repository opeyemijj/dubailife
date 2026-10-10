const fs = require('fs');
let code = fs.readFileSync('run_seed.js', 'utf8');
code = code.replace(/otherClubs\.forEach\(v => venues\.push\(v\)\);\n\n\}\);\n/g, 'otherClubs.forEach(v => venues.push(v));\n\n');
fs.writeFileSync('run_seed.js', code);
console.log("Fixed syntax error!");
