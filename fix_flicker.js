const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Replace the inline perspective with a safer combination
mapCode = mapCode.replace(
  /transform: \`perspective\(2500px\) rotateX\(45deg\)\`,/g,
  'transform: `rotateX(45deg)`, perspective: 2500, WebkitBackfaceVisibility: "hidden",'
);

// We should also make sure the React Zoom Pan Pinch component has a perspective set on its wrapper,
// but the TransformComponent itself is out of our control. 
// Adding backfaceVisibility usually solves the flickering.

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
console.log("Applied anti-flicker CSS fixes!");
