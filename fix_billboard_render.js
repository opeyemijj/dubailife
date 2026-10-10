const fs = require('fs');

const updateRenderIcon = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Add giant-billboard to renderIcon
  code = code.replace(
    /if \(type === 'apartment-complex'\)/,
    "if (type === 'giant-billboard') return <Icons.GiantBillboardBlock width={loc.width} height={loc.height} text1={loc.text1} text2={loc.text2} color1={loc.color1} color2={loc.color2} />;\n        if (type === 'apartment-complex')"
  );
  
  if (file.includes('InteractiveMap')) {
     code = code.replace(
       /if \(type === 'giant-billboard'\) return <Icons\.GiantBillboardBlock/g,
       "if (type === 'giant-billboard') return <GiantBillboardBlock"
     );
     code = code.replace(
       /ApartmentComplexBlock \} from '\.\/Icons';/g,
       "ApartmentComplexBlock, GiantBillboardBlock } from './Icons';"
     );
  }
  
  // Also add 'giant-billboard' to isOverlay
  code = code.replace(
    /loc\.type === 'apartment-complex'/g,
    "loc.type === 'apartment-complex' || loc.type === 'giant-billboard'"
  );
  
  fs.writeFileSync(file, code);
}

updateRenderIcon('src/components/admin/BuilderClient.tsx');
updateRenderIcon('src/components/map/InteractiveMap.tsx');
console.log("Registered giant-billboard!");
