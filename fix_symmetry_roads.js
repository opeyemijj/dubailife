const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const roadsRegex = /\{\/\* Inland Road Network \[\s\S]*?\{\/\* Marine Traffic \*\/\}/;
// Try matching better
const roadsRegex2 = /\{\/\* Inland Road Network \(E44, E311, and Cross Roads\) \*\/\}[\s\S]*?\{\/\* Marine Traffic \*\/}/;

if (code.match(roadsRegex2)) {
  code = code.replace(roadsRegex2, '{/* Marine Traffic */}');
  fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
  console.log("Roads successfully removed.");
} else {
  console.log("Could not find roads to remove.");
}
