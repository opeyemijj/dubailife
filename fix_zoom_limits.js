const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

code = code.replace(
  /<TransformWrapper[\s\S]*?alignmentAnimation=\{\{ animationTime: 2000, animationType: "easeOutQuad" \}\}\n\s*>/,
  '<TransformWrapper \n' +
  '        initialScale={mapConfig?.startScale || 0.6} \n' +
  '        initialPositionX={mapConfig?.startX || -200} \n' +
  '        initialPositionY={mapConfig?.startY || -1000}\n' +
  '        minScale={minScale} \n' +
  '        maxScale={1.5}\n' +
  '        limitToBounds={false}\n' +
  '        wheel={{ step: 0.05, smoothStep: 0.005 }}\n' +
  '        panning={{ velocityMultiplier: 0.3 }}\n' +
  '        alignmentAnimation={{ animationTime: 2000, animationType: "easeOutQuad" }}\n' +
  '      >'
);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed zoom limits!");
