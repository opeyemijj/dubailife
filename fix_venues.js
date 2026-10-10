const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// Find the setVenues call and replace the generic communities with our Estate and Utilities
const regex = /\{\s*id:\s*"discovery-gardens"[\s\S]*?id:\s*"deira"[\s\S]*?\},/m;

const newVenues = `
        // MAINLAND ESTATE (Massive Grid)
        ...Array.from({ length: 150 }).map((_, i) => ({
          id: \`estate-house-\${i}\`,
          name: \`Mainland Plot \${i + 1}\`,
          type: 'small-house',
          virtualX: 500 + ((i % 25) * 80),
          virtualY: 500 + (Math.floor(i / 25) * 70),
          interactive: true
        })),

        // UTILITY BUILDINGS (Scattered below the estate)
        { id: "main-hospital", name: "Mainland Hospital", type: "hospital", virtualX: 700, virtualY: 300, interactive: true },
        { id: "main-stadium", name: "National Stadium", type: "stadium", virtualX: 1100, virtualY: 350, interactive: true },
        { id: "main-school", name: "City High School", type: "school", virtualX: 1500, virtualY: 300, interactive: true },
        { id: "main-park", name: "Central Park", type: "park", virtualX: 1900, virtualY: 350, interactive: true },
        { id: "main-casino", name: "Grand Casino", type: "casino", virtualX: 2300, virtualY: 300, interactive: true },
        
        { id: "main-hospital-2", name: "East Clinic", type: "hospital", virtualX: 2500, virtualY: 350, interactive: true },
        { id: "main-school-2", name: "West Academy", type: "school", virtualX: 500, virtualY: 350, interactive: true },`;

code = code.replace(regex, newVenues);

// Make sure to remove the OTHER generic communities (Motor city, etc) that I might have missed in the regex
const otherCommRegex = /\{\s*id:\s*"emirates-hills"[\s\S]*?id:\s*"silicon-oasis"[\s\S]*?\},/g;
code = code.replace(otherCommRegex, '');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated fallback venues to Estate Grid and Utilities.");
