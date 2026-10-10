const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// I replaced width={ with w={ and height={ with h={ everywhere.
// I need to change it back for <svg>, <rect>, <ellipse>, etc. but SimpleBase and SimpleBuilding use w= and h=.
// Actually, let's just use regex to fix rect, svg.
code = code.replace(/<svg viewBox="0 0 ([^"]+)" style=\{\{ w: (.*?), h: (.*?) \}\}/g, '<svg viewBox="0 0 $1" style={{ width: $2, height: $3 }}');
code = code.replace(/<rect x="(.*?)" y="(.*?)" w=\{/g, '<rect x="$1" y="$2" width={');
code = code.replace(/<rect x="(.*?)" y="(.*?)" width="(.*?)" h=\{/g, '<rect x="$1" y="$2" width="$3" height={');

// Wait, the style was: style={{ width: `${w}px`, height: `${h}px` }}
// It became style={{ w: `${w}px`, h: `${h}px` }}
code = code.replace(/w: `/g, 'width: `');
code = code.replace(/h: `/g, 'height: `');

// And what about string width?
// e.g. <svg viewBox="..." w="100%" h="100%">
code = code.replace(/w="100%" h="100%"/g, 'width="100%" height="100%"');

// What about IsoBase to SimpleBase?
// <SimpleBase w={250} h={250} color="#fcd34d" thickColor="#d97706" rightColor="#b45309" />
// That looks correct.

// What about IsoBox to SimpleBuilding?
// It was: IsoBox x={...} y={...} w={...} d={...} h={...} colorLeft={...} colorRight={...} colorTop={...}
// Now it's: SimpleBuilding x={...} y={...} w={...} d={...} h={...} colorLeft={...} colorRight={...} colorTop={...}
// SimpleBuilding uses fColor, rColor, tColor, and dX, dY.
// So those old IsoBox calls are BROKEN.

fs.writeFileSync('src/components/map/Icons.tsx', code);
console.log("Restored SVG widths");
