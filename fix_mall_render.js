const fs = require('fs');

const updateRenderIcon = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Add mall to renderIcon
  code = code.replace(
    /if \(type === 'museum-future'\)/,
    "if (type === 'mall') return <Icons.MallBlock width={loc.width} height={loc.height} />;\n        if (type === 'museum-future')"
  );
  
  if (file.includes('InteractiveMap')) {
     code = code.replace(
       /if \(type === 'mall'\) return <Icons\.MallBlock/g,
       "if (type === 'mall') return <MallBlock"
     );
     code = code.replace(
       /MuseumOfFutureIcon \} from '\.\/Icons';/g,
       "MuseumOfFutureIcon, MallBlock } from './Icons';"
     );
  }
  
  // Also add 'mall' to isOverlay
  code = code.replace(
    /loc\.type === 'road-path'/g,
    "loc.type === 'road-path' || loc.type === 'mall'"
  );
  
  fs.writeFileSync(file, code);
}

updateRenderIcon('src/components/admin/BuilderClient.tsx');
updateRenderIcon('src/components/map/InteractiveMap.tsx');
console.log("Registered mall!");
