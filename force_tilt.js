const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const targetStr = /<div className="relative cursor-crosshair overflow-hidden shadow-2xl" style=\{\{ width: \`\$\{WORLD_WIDTH\}px\`, height: \`\$\{WORLD_HEIGHT\}px\`, backgroundColor: "#E3CDA4" \}\} onClick=\{handleMapClick\}>/;

const replacement = `<div 
  className="relative cursor-crosshair shadow-2xl origin-center transition-transform duration-500" 
  style={{ 
    width: \`\${WORLD_WIDTH}px\`, 
    height: \`\${WORLD_HEIGHT}px\`, 
    backgroundColor: "#E3CDA4",
    transform: \`perspective(2500px) rotateX(\${mapConfig?.pitch || 45}deg) rotateZ(\${mapConfig?.yaw || 45}deg)\`,
    transformStyle: "preserve-3d"
  }} 
  onClick={handleMapClick}
>`;

if (targetStr.test(code)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
  console.log("Successfully forced map tilt!");
} else {
  console.log("Failed to find target string in InteractiveMap.tsx");
}
