const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

code = code.replace(
  /<div \n\s*className="relative cursor-crosshair overflow-hidden shadow-2xl" \n\s*style=\{\{ width: \`\$\{WORLD_WIDTH\}px\`, height: \`\$\{WORLD_HEIGHT\}px\`, backgroundColor: '#E3CDA4' \}\}\n\s*onClick=\{handleMapClick\}\n\s*>/,
  '<div className="relative cursor-crosshair shadow-2xl origin-center transition-transform duration-500" style={{ width: `${WORLD_WIDTH}px`, height: `${WORLD_HEIGHT}px`, backgroundColor: "#E3CDA4", transform: `perspective(2500px) rotateX(${mapConfig?.pitch || 45}deg) rotateZ(${mapConfig?.yaw || 45}deg)`, transformStyle: "preserve-3d" }} onClick={handleMapClick}>'
);

// We need to also undo the inverse rotation on venues because the components themselves are pre-rendered isometric, meaning they shouldn't be counter-rotated. Or should they?
// Wait, if the map is rotated 45deg, flat items should be counter rotated so they stand up?
// The user said "the camera angle from top that is how everything should be designed" - they wanted isometric drawn elements, so the map tilt actually ruins them if they are already drawn isometric. Wait!
// "it doesnt have to be flat . it must have a camera angle from th top that is how every thing should be designed" -> THIS meant they wanted the UI to look 3D. But if the SVG is drawn in 3D, and the map is tilted, it double-tilts!
// That is EXACTLY what happened in `rewrite_all_iso.js`! It double tilted!

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Added map tilt!");
