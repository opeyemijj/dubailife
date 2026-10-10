const fs = require('fs');

const updateRenderIcon = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Add hotel to renderIcon
  code = code.replace(
    /if \(type === 'mall'\)/,
    "if (type === 'hotel') return <Icons.HotelBlock width={loc.width} height={loc.height} />;\n        if (type === 'mall')"
  );
  
  if (file.includes('InteractiveMap')) {
     code = code.replace(
       /if \(type === 'hotel'\) return <Icons\.HotelBlock/g,
       "if (type === 'hotel') return <HotelBlock"
     );
     code = code.replace(
       /MuseumOfFutureIcon, MallBlock \} from '\.\/Icons';/g,
       "MuseumOfFutureIcon, MallBlock, HotelBlock } from './Icons';"
     );
  }
  
  // Also add 'hotel' to isOverlay
  code = code.replace(
    /loc\.type === 'mall'/g,
    "loc.type === 'mall' || loc.type === 'hotel'"
  );
  
  fs.writeFileSync(file, code);
}

updateRenderIcon('src/components/admin/BuilderClient.tsx');
updateRenderIcon('src/components/map/InteractiveMap.tsx');
console.log("Registered hotel!");
