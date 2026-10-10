const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /\{\s*id:\s*"deira",\s*name:\s*"Deira & Old Dubai",\s*type:\s*"estate-community",\s*virtualX:\s*2400,\s*virtualY:\s*150\s*\}/;

const injection = '{ id: "deira", name: "Deira & Old Dubai", type: "estate-community", virtualX: 2400, virtualY: 150 },\n' +
'        { id: "ad-1", name: "Coastal Billboard 1", type: "billboard", virtualX: 200, virtualY: 1050, seed: 1 },\n' +
'        { id: "ad-2", name: "Coastal Billboard 2", type: "billboard", virtualX: 700, virtualY: 950, seed: 2 },\n' +
'        { id: "ad-3", name: "Coastal Billboard 3", type: "billboard", virtualX: 1100, virtualY: 980, seed: 3 },\n' +
'        { id: "ad-4", name: "Coastal Billboard 4", type: "billboard", virtualX: 1600, virtualY: 1020, seed: 4 },\n' +
'        { id: "ad-5", name: "Coastal Billboard 5", type: "billboard", virtualX: 2100, virtualY: 920, seed: 5 },\n' +
'        { id: "ad-6", name: "Inland Billboard 1", type: "billboard", virtualX: 1300, virtualY: 350, seed: 6 },\n' +
'        { id: "ad-7", name: "Inland Billboard 2", type: "billboard", virtualX: 2500, virtualY: 650, seed: 7 },\n' +
'        { id: "ad-8", name: "Inland Billboard 3", type: "billboard", virtualX: 2300, virtualY: 250, seed: 8 }';

code = code.replace(regex, injection);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Restored billboards.");
