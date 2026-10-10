const fs = require('fs');
const content = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

// Quick and dirty extraction of types
const types = content.match(/type:\s*['"]([^'"]+)['"]/g) || [];
const uniqueTypes = [...new Set(types.map(t => t.split(/['"]/)[1]))];
console.log("Types found:", uniqueTypes);
