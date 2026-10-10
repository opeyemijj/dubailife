const fs = require('fs');

const updateRenderIcon = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    /if \(type === 'estate-base'\) return <Icons\.EstateBase name=\{name\} \/>;/g,
    "if (type === 'dynamic-community') return <Icons.DynamicCommunityBlock name={name} width={loc.width} height={loc.height} color={loc.color} rows={loc.rows} cols={loc.cols} buildingType={loc.buildingType} />;\n        if (type === 'estate-base') return <Icons.EstateBase name={name} />;"
  );
  
  // Also we need to import DynamicCommunityBlock if we're in InteractiveMap
  if (file.includes('InteractiveMap')) {
     code = code.replace(
       /if \(type === 'dynamic-community'\) return <Icons\.DynamicCommunityBlock/g,
       "if (type === 'dynamic-community') return <DynamicCommunityBlock"
     );
     code = code.replace(
       /AdPlacement, initialAds \} from '\.\/Icons';/g,
       "AdPlacement, initialAds, DynamicCommunityBlock } from './Icons';"
     );
  }
  
  // also add dynamic-community to isOverlay
  code = code.replace(
    /loc\.type === 'estate-base'/g,
    "loc.type === 'estate-base' || loc.type === 'dynamic-community'"
  );
  
  fs.writeFileSync(file, code);
}

updateRenderIcon('src/components/admin/BuilderClient.tsx');
updateRenderIcon('src/components/map/InteractiveMap.tsx');
console.log("Updated renderIcon and isOverlay!");
