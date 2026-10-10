const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Replace the entire complex 3D container with a clean top-down perspective tilt.
const containerRegex = /className="relative cursor-crosshair shadow-2xl origin-center transition-transform duration-500"\s*style=\{\{[\s\S]*?onClick=\{handleMapClick\}/;

const cleanContainer = `className="relative cursor-crosshair shadow-2xl origin-center transition-transform duration-500" 
  style={{ 
    width: \`\${WORLD_WIDTH}px\`, 
    height: \`\${WORLD_HEIGHT}px\`, 
    backgroundColor: "#E3CDA4",
    transform: \`perspective(2500px) rotateX(45deg)\`,
    transformStyle: "preserve-3d"
  }} 
  onClick={handleMapClick}`;

if (containerRegex.test(mapCode)) {
  mapCode = mapCode.replace(containerRegex, cleanContainer);
  console.log("Successfully replaced map container transform!");
} else {
  console.log("Could not find map container regex!");
}

// Ensure the venues stand up perfectly by counter-rotating the 45deg X tilt
const venueRegex = /transform: \`\\\$\\{baseTransform\\} \\\$\\{rotationTransform\\}.*?transformStyle: 'preserve-3d'/;

const cleanVenue = `transform: \`\${baseTransform} \${rotationTransform} rotateX(-45deg)\`.trim(), transformOrigin: "bottom center", transformStyle: 'preserve-3d'`;

if (venueRegex.test(mapCode)) {
  mapCode = mapCode.replace(venueRegex, cleanVenue);
  console.log("Successfully replaced venue wrapper transform!");
} else {
  console.log("Could not find venue wrapper regex!");
}

fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
