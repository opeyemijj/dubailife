const fs = require('fs');

const updateRenderIcon = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Add marina to renderIcon
  code = code.replace(
    /if \(type === 'dynamic-community'\)/,
    "if (type === 'marina') return <Icons.MarinaBlock name={name} width={loc.width} height={loc.height} />;\n        if (type === 'dynamic-community')"
  );
  
  // Fix InteractiveMap.tsx where it might not have 'Icons.' prefix
  if (file.includes('InteractiveMap')) {
     code = code.replace(
       /if \(type === 'marina'\) return <Icons\.MarinaBlock/g,
       "if (type === 'marina') return <MarinaBlock"
     );
     code = code.replace(
       /AdPlacement, initialAds, DynamicCommunityBlock \} from '\.\/Icons';/g,
       "AdPlacement, initialAds, DynamicCommunityBlock, MarinaBlock } from './Icons';"
     );
  }
  
  // Also add 'marina' to isOverlay
  code = code.replace(
    /loc\.type === 'dynamic-community'/g,
    "loc.type === 'dynamic-community' || loc.type === 'marina'"
  );
  
  fs.writeFileSync(file, code);
}

updateRenderIcon('src/components/admin/BuilderClient.tsx');
updateRenderIcon('src/components/map/InteractiveMap.tsx');
console.log("Registered marina!");
