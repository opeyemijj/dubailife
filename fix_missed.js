const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// The reason it didn't match might be the regex matching the OLD version before I replaced it.
// Let's just blindly replace IsoBase with SimpleBase everywhere just in case. But wait, IsoBase takes width/height, SimpleBase takes w/h.

code = code.replace(/IsoBase/g, 'SimpleBase');
code = code.replace(/width=\{/g, 'w={');
code = code.replace(/height=\{/g, 'h={');
code = code.replace(/edgeLeft/g, 'thickColor');
code = code.replace(/edgeRight/g, 'rightColor');

// And remove any remaining IsoBox
code = code.replace(/IsoBox/g, 'SimpleBuilding');

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Fixed missed IsoBase/IsoBox");
