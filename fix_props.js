const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

code = code.replace(/colorLeft/g, 'fColor');
code = code.replace(/colorRight/g, 'rColor');
code = code.replace(/colorTop/g, 'tColor');
code = code.replace(/ d=\{([^}]+)\}/g, '');

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed props");
