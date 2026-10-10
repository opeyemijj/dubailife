const fs = require('fs');
let code = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');

const wipeRegex = /\{\/\* (Bluewaters|Palm|Bulgari|Burj) Bridge.*?\{\/\* (Marine|Burj Al Arab|Animated)/gs;
// Actually, it's easier to just match `<path d="M ... L ..."` if it has stroke="#64748b" and the dashed one.
code = code.replace(/<path d="M \d+ \d+ L \d+ \d+" fill="none" stroke="#64748b" strokeWidth="6" \/>/g, '');
code = code.replace(/<path d="M \d+ \d+ L \d+ \d+" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" \/>/g, '');

// Also remove empty comments
code = code.replace(/\{\/\* Bluewaters Bridge \*\/\}/g, '');
code = code.replace(/\{\/\* Palm Bridge \(Over water\) \*\/\}/g, '');
code = code.replace(/\{\/\* Bulgari Bridge \*\/\}/g, '');
code = code.replace(/\{\/\* Burj Al Arab Bridge \*\/\}/g, '');

fs.writeFileSync('src/components/map/MapBackground.tsx', code);
console.log("Wiped old bridges");
