const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Fix ConfigurableApartmentBlock Pool
code = code.replace(
  /\{hasPool && <polygon points="0,-40 -40,-60 0,-80 40,-60" fill="#38bdf8" stroke="#e2e8f0" strokeWidth="4" \/>\}/,
  '{hasPool && <rect x={-60} y={-60} width={40} height={40} fill="#38bdf8" stroke="#e2e8f0" strokeWidth="4" />}'
);

// Fix Billboard points
code = code.replace(
  /<polygon points="-40,-70 40,-70 40,-120 -40,-120" fill=\{color1\} stroke="#1e293b" strokeWidth="4" \/>/,
  '<rect x={-50} y={-100} width={100} height={50} fill={color1} stroke="#1e293b" strokeWidth="4" />'
);

// Fix Airport Polygon
code = code.replace(
  /<polygon points="-100,50 -250,-25 -100,-100 50,-25" fill="#334155" \/>/,
  '<rect x={-150} y={-50} width={300} height={50} fill="#334155" />'
);

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed component hardcoded diamonds!");
