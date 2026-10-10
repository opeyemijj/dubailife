const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

mapCode = mapCode.replace(
  /className="relative cursor-crosshair overflow-hidden shadow-2xl" style=\{\{ width: \`\$\{WORLD_WIDTH\}px\`, height: \`\$\{WORLD_HEIGHT\}px\`, backgroundColor: "#E3CDA4" \}\}/,
  'className="relative cursor-crosshair overflow-hidden shadow-2xl" style={{ width: `${WORLD_WIDTH}px`, height: `${WORLD_HEIGHT}px`, backgroundColor: "#E3CDA4", transform: "scaleY(0.5) rotate(-45deg)", transformOrigin: "center" }}'
);

mapCode = mapCode.replace(
  /transform: \`\$\{baseTransform\} \$\{rotationTransform\}\`\.trim\(\)/g,
  'transform: `${baseTransform} ${rotationTransform} rotate(45deg) scaleY(2)`.trim()'
);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Deployed Ultimate Isometric Coordinate System!");
