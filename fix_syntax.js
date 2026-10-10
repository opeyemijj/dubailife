const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Replace \` with `
code = code.replace(/\\`/g, '`');

// Replace \${ with ${
code = code.replace(/\\\$\{/g, '${');

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed syntax errors in Icons.tsx");
