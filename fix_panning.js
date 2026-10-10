const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /<TransformWrapper panning=\{\{ disabled: activeDragId !== null \}\} initialScale=\{Math\.max\(0\.8, minScale\)\}\s*initialPositionX=\{-500\}\s*initialPositionY=\{-200\}\s*minScale=\{minScale\}\s*maxScale=\{3\}\s*limitToBounds=\{true\}\s*wheel=\{\{ step: 0\.1 \}\}\s*panning=\{\{ velocityMultiplier: 0\.8 \}\}/m;
const replacement = `<TransformWrapper 
        initialScale={Math.max(0.8, minScale)} 
        initialPositionX={-500} 
        initialPositionY={-200}
        minScale={minScale} 
        maxScale={3}
        limitToBounds={true}
        wheel={{ step: 0.1 }}
        panning={{ disabled: activeDragId !== null, velocityMultiplier: 0.8 }}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed duplicate panning prop");
