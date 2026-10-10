const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// The string currently looks like: style={{ width: \`\${width}px\`, height: \`\${height}px\` }}
// We need it to be: style={{ width: `${width}px`, height: `${height}px` }}

code = code.replace(/width: \\`\\\$\{width\}px\\`/g, 'width: `${width}px`');
code = code.replace(/height: \\`\\\$\{height\}px\\`/g, 'height: `${height}px`');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed backslashes");
