const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

code = code.replace(/<path L 40 300 M 60 \$\{300 \- height \+ 10\} L 60 300\`} stroke="#ffffff" strokeWidth="2" opacity="0\.3" \/>/, 
  '<path d={`M 40 ${300 - height + 10} L 40 300 M 60 ${300 - height + 10} L 60 300`} stroke="#ffffff" strokeWidth="2" opacity="0.3" />'
);

code = code.replace(/widtheight: /g, 'width: ');

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed 428");
