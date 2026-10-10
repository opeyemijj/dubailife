const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

code = code.replace(/const DubaiHillsBlock = \(\) => \([\s\S]*?<\/svg>\n\);/, '');
code = code.replace(/const BusinessBayBlock = \(\) => \([\s\S]*?<\/svg>\n\);/, '');

code = code.replace(/if \(type === 'community-dubai-hills'\) return <DubaiHillsBlock \/>;/, '');
// Note: EmiratesHillsBlock was already injected earlier! 
// Let's ensure BusinessBayBlock duplicate is gone.
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Wiped old blocks");
