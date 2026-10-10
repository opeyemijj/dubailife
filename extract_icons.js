const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const splitIndex = code.indexOf('export function InteractiveMap');
if (splitIndex === -1) throw new Error("Could not find InteractiveMap");

const topPart = code.slice(0, splitIndex);
const bottomPart = code.slice(splitIndex);

// Find the last import
const lastImportIndex = topPart.lastIndexOf('import ');
const importEndIndex = topPart.indexOf('\n', lastImportIndex);

const imports = topPart.slice(0, importEndIndex + 1);
let components = topPart.slice(importEndIndex + 1);

const iconsCode = `import React from 'react';
${components}`;
fs.writeFileSync('src/components/map/Icons.tsx', iconsCode);

let modifiedIconsCode = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');
modifiedIconsCode = modifiedIconsCode.replace(/^const ([A-Z][a-zA-Z0-9_]*) =/gm, 'export const $1 =');
modifiedIconsCode = modifiedIconsCode.replace(/^const WORLD_WIDTH/gm, 'export const WORLD_WIDTH');
modifiedIconsCode = modifiedIconsCode.replace(/^const WORLD_HEIGHT/gm, 'export const WORLD_HEIGHT');
modifiedIconsCode = modifiedIconsCode.replace(/^const categoryColors/gm, 'export const categoryColors');
fs.writeFileSync('src/components/map/Icons.tsx', modifiedIconsCode);

const matches = [...modifiedIconsCode.matchAll(/export const ([A-Z][a-zA-Z0-9_]*) =/g)].map(m => m[1]);
matches.push('WORLD_WIDTH', 'WORLD_HEIGHT', 'categoryColors');

const newInteractiveMap = `${imports}
import { ${matches.join(', ')} } from './Icons';

${bottomPart}`;

fs.writeFileSync('src/components/map/InteractiveMap.tsx', newInteractiveMap);
console.log("Extracted icons!");
