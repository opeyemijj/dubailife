const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

code = code.replace(/const WORLD_WIDTH = 3000;/, 'const WORLD_WIDTH = 4000;');
code = code.replace(/3000,900 L 3000,2600 L 0,2600 Z/g, '4000,900 L 4000,2600 L 0,2600 Z');
code = code.replace(/3000 900/g, '4000 900');
code = code.replace(/3000,920/g, '4000,920');
code = code.replace(/1500,1600/g, '2000,1600');
code = code.replace(/1500 1600/g, '2000 1600');
code = code.replace(/1500,1620/g, '2000,1620');
code = code.replace(/Array.from\(\{ length: 31 \}\)/, 'Array.from({ length: 41 })'); 
code = code.replace(/x2=\{3000\}/g, 'x2={4000}'); 
code = code.replace(/3000 600/g, '4000 600');
code = code.replace(/3000,600/g, '4000,600');
code = code.replace(/1500 1300/g, '2000 1300');
code = code.replace(/1500,1300/g, '2000,1300');
code = code.replace(/3000 750/g, '4000 750');
code = code.replace(/1500 1450/g, '2000 1450');

const airportRegex = /const AirportBlock = \(\) => \([\s\S]*?<\/svg>\s*\);/;
const bigAirport = "const AirportBlock = () => (\n" +
"  <svg viewBox=\"0 0 600 300\" className=\"w-[600px] h-[300px] drop-shadow-2xl z-10 relative cursor-pointer group hover:scale-105 transition-transform\">\n" +
"    <defs>\n" +
"      <g id=\"airplane\">\n" +
"        <path d=\"M 20 10 L 10 -15 L 15 -15 L 25 10 Z\" fill=\"#e2e8f0\" />\n" +
"        <path d=\"M 20 10 L 10 35 L 15 35 L 25 10 Z\" fill=\"#e2e8f0\" />\n" +
"        <rect x=\"0\" y=\"5\" width=\"40\" height=\"10\" rx=\"5\" fill=\"#ffffff\" stroke=\"#cbd5e1\" strokeWidth=\"1\" />\n" +
"        <path d=\"M 5 10 L 0 0 L 5 0 L 10 10 Z\" fill=\"#e2e8f0\" />\n" +
"        <path d=\"M 5 10 L 0 20 L 5 20 L 10 10 Z\" fill=\"#e2e8f0\" />\n" +
"        <rect x=\"15\" y=\"0\" width=\"8\" height=\"4\" rx=\"2\" fill=\"#94a3b8\" />\n" +
"        <rect x=\"15\" y=\"16\" width=\"8\" height=\"4\" rx=\"2\" fill=\"#94a3b8\" />\n" +
"      </g>\n" +
"    </defs>\n" +
"    <rect x=\"0\" y=\"0\" width=\"600\" height=\"300\" fill=\"#f8fafc\" rx=\"10\" stroke=\"#cbd5e1\" strokeWidth=\"6\" />\n" +
"    \n" +
"    <rect x=\"50\" y=\"80\" width=\"500\" height=\"40\" fill=\"#334155\" />\n" +
"    <rect x=\"50\" y=\"180\" width=\"500\" height=\"40\" fill=\"#334155\" />\n" +
"    <line x1=\"70\" y1=\"100\" x2=\"530\" y2=\"100\" stroke=\"#fef08a\" strokeWidth=\"4\" strokeDasharray=\"20,20\" />\n" +
"    <line x1=\"70\" y1=\"200\" x2=\"530\" y2=\"200\" stroke=\"#fef08a\" strokeWidth=\"4\" strokeDasharray=\"20,20\" />\n" +
"    \n" +
"    <path d=\"M 200 130 C 250 110, 350 110, 400 130 L 400 170 C 350 190, 250 190, 200 170 Z\" fill=\"#94a3b8\" stroke=\"#cbd5e1\" strokeWidth=\"2\" />\n" +
"    <circle cx=\"300\" cy=\"150\" r=\"30\" fill=\"#38bdf8\" opacity=\"0.3\" />\n" +
"    \n" +
"    <use href=\"#airplane\" x=\"220\" y=\"130\" transform=\"rotate(45 230 140)\" />\n" +
"    <use href=\"#airplane\" x=\"350\" y=\"130\" transform=\"rotate(-45 360 140)\" />\n" +
"    <use href=\"#airplane\" x=\"290\" y=\"90\" transform=\"rotate(90 300 100)\" />\n" +
"    <use href=\"#airplane\" x=\"290\" y=\"210\" transform=\"rotate(-90 300 220)\" />\n" +
"    \n" +
"    <text x=\"300\" y=\"50\" fill=\"#0f172a\" fontSize=\"32\" fontWeight=\"black\" textAnchor=\"middle\" className=\"tracking-widest drop-shadow-md\">DXB AIRPORT</text>\n" +
"  </svg>\n" +
");";

code = code.replace(airportRegex, bigAirport);

code = code.replace(/\{ id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: 2700, virtualY: 300 \}/, 
                    '{ id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: 3300, virtualY: 350 }');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Expanded WORLD_WIDTH to 4000, fixed SVGs, and made DXB huge at 3300!");
