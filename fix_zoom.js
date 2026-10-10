const fs = require('fs');

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const oldWrapper = /<TransformWrapper[\s\S]*?panning=\{\{ velocityMultiplier: 0\.8 \}\}\n\s*>/;

const newWrapper = `<TransformWrapper 
        initialScale={mapConfig?.startScale || 0.6} 
        initialPositionX={mapConfig?.startX || -1000} 
        initialPositionY={mapConfig?.startY || -500}
        minScale={0.1} 
        maxScale={4}
        limitToBounds={false}
        wheel={{ step: 0.05, smoothStep: 0.005 }}
        panning={{ velocityMultiplier: 0.3 }}
        alignmentAnimation={{ animationTime: 2000, animationType: "easeOutQuad" }}
      >`;

if (oldWrapper.test(mapCode)) {
  mapCode = mapCode.replace(oldWrapper, newWrapper);
  fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);
  console.log("Successfully updated TransformWrapper props!");
} else {
  console.log("Regex did not match!");
}
