const fs = require('fs');

const updateRenderIcon = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(
    /if \(type === 'hotel'\)/,
    "if (type === 'apartment-complex') return <Icons.ApartmentComplexBlock width={loc.width} height={loc.height} />;\n        if (type === 'hotel')"
  );
  
  if (file.includes('InteractiveMap')) {
     code = code.replace(
       /if \(type === 'apartment-complex'\) return <Icons\.ApartmentComplexBlock/g,
       "if (type === 'apartment-complex') return <ApartmentComplexBlock"
     );
     code = code.replace(
       /MallBlock, HotelBlock \} from '\.\/Icons';/g,
       "MallBlock, HotelBlock, ApartmentComplexBlock } from './Icons';"
     );
  }
  
  code = code.replace(
    /loc\.type === 'hotel'/g,
    "loc.type === 'hotel' || loc.type === 'apartment-complex'"
  );
  
  fs.writeFileSync(file, code);
}

updateRenderIcon('src/components/admin/BuilderClient.tsx');
updateRenderIcon('src/components/map/InteractiveMap.tsx');
console.log("Registered apartment-complex!");
