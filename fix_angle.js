const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Update map container transform to a straight tilt (no Z rotation diamond)
mapCode = mapCode.replace(
  /transform: "scaleY\(0\.5\) rotate\(-45deg\)"/g,
  'transform: "perspective(2000px) rotateX(45deg)", transformStyle: "preserve-3d"'
);

// Update the venue wrapper to counter-rotate the X tilt
mapCode = mapCode.replace(
  /transform: \`\$\{baseTransform\} \$\{rotationTransform\} rotate\(45deg\) scaleY\(2\)\`\.trim\(\)/g,
  'transform: `${baseTransform} ${rotationTransform} rotateX(-45deg)`.trim(), transformOrigin: "bottom center"'
);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Deployed Top-Down Oblique Camera Angle!");
