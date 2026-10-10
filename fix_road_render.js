const fs = require('fs');

const updateRenderIcon = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Add road-path to renderIcon
  code = code.replace(
    /if \(type === 'marina'\)/,
    "if (type === 'road-path') return <Icons.RoadPathBlock pathData={loc.pathData} color={loc.color} width={loc.width} isDashed={loc.isDashed} />;\n        if (type === 'marina')"
  );
  
  // Fix InteractiveMap.tsx where it might not have 'Icons.' prefix
  if (file.includes('InteractiveMap')) {
     code = code.replace(
       /if \(type === 'road-path'\) return <Icons\.RoadPathBlock/g,
       "if (type === 'road-path') return <RoadPathBlock"
     );
     code = code.replace(
       /DynamicCommunityBlock, MarinaBlock \} from '\.\/Icons';/g,
       "DynamicCommunityBlock, MarinaBlock, RoadPathBlock } from './Icons';"
     );
  }
  
  // also add 'road-path' to isOverlay
  code = code.replace(
    /loc\.type === 'marina'/g,
    "loc.type === 'marina' || loc.type === 'road-path'"
  );
  
  fs.writeFileSync(file, code);
}

updateRenderIcon('src/components/admin/BuilderClient.tsx');
updateRenderIcon('src/components/map/InteractiveMap.tsx');
console.log("Registered road-path!");
