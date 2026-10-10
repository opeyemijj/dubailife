const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

code = code.replace(
  /<path fill="none" stroke=\{color\} strokeWidth=\{width\} strokeLinecap="round"/g,
  '<path d={pathData} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round"'
);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed 732");
