const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// There's a 2nd MotorCityBlock definition
code = code.replace(/const MotorCityBlock = \(\) => \([\s\S]*?<\/svg>\n\);/, '');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Wiped Motor City duplicate");
