const fs = require('fs');

let iconsCode = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');
iconsCode = iconsCode.replace('const getBuildingSprite =', 'export const getBuildingSprite =');
fs.writeFileSync('src/components/map/Icons.tsx', iconsCode);

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');
mapCode = mapCode.replace(/initialAds \} from '\.\/Icons';/, 'initialAds, getBuildingSprite } from \'./Icons\';');
fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);

console.log("Fixed getBuildingSprite export!");
