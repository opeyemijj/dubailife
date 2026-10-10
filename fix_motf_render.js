const fs = require('fs');

const updateRenderIcon = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Add museum-future to renderIcon
  code = code.replace(
    /if \(type === 'marina'\)/,
    "if (type === 'museum-future') return <Icons.MuseumOfFutureIcon width={loc.width} height={loc.height} />;\n        if (type === 'marina')"
  );
  
  if (file.includes('InteractiveMap')) {
     code = code.replace(
       /if \(type === 'museum-future'\) return <Icons\.MuseumOfFutureIcon/g,
       "if (type === 'museum-future') return <MuseumOfFutureIcon"
     );
     code = code.replace(
       /RoadPathBlock \} from '\.\/Icons';/g,
       "RoadPathBlock, MuseumOfFutureIcon } from './Icons';"
     );
  }
  
  fs.writeFileSync(file, code);
}

updateRenderIcon('src/components/admin/BuilderClient.tsx');
updateRenderIcon('src/components/map/InteractiveMap.tsx');
console.log("Registered museum-future!");
