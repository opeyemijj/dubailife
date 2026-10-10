const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// The original one I added was:
// const isoToScreen = (gx, gy) => ({
// export const isoToScreen = (gx: number, gy: number, originX = 150, originY = 80) => ({

// Let's remove the first instance
const match1 = code.indexOf('const isoToScreen');
const match2 = code.indexOf('export const isoToScreen');

if (match1 !== -1 && match2 !== -1) {
  // Just delete the first block until the second block
  // Wait, let's just do a regex replace to remove the old unexported isoToScreen
  code = code.replace(/const isoToScreen = \(gx, gy\) => \(\{\n  x: 150 \+ \(gx \- gy\) \* 0\.866,\n  y: 80 \+ \(gx \+ gy\) \* 0\.5\n\}\);/g, '');
}

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed duplicate isoToScreen");
