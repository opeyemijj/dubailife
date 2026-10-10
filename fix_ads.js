const fs = require('fs');

let iconsCode = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');
iconsCode = iconsCode.replace('type AdPlacement =', 'export type AdPlacement =');
iconsCode = iconsCode.replace('const initialAds:', 'export const initialAds:');
fs.writeFileSync('src/components/map/Icons.tsx', iconsCode);

let mapCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');
mapCode = mapCode.replace(/BridgeBlock \} from '\.\/Icons';/, 'BridgeBlock, AdPlacement, initialAds } from \'./Icons\';');
fs.writeFileSync('src/components/map/InteractiveMap.tsx', mapCode);

console.log("Fixed initialAds exports!");
