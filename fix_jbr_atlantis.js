const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Remove Standalone Atlantis venue
code = code.replace(/\{ id: "atlantis"[\s\S]*?\},\n\s*/, '');

// 2. Resize JBR to fit perfectly on the beach
const newJBR = `const JBRBlock = () => <TycoonBlock name="JBR" type="apartment" cols={12} rows={2} w={350} h={90} />;`;
code = code.replace(/const JBRBlock = \(\) => <TycoonBlock name="JBR".*?\/>;/, newJBR);

// 3. Move JBR to the left of Palm (X=350) and center it on the beach (Y=1310)
code = code.replace(/\{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: [0-9]+, virtualY: [0-9]+ \}/, '{ id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 350, virtualY: 1310 }');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed JBR and removed standalone Atlantis");
