const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Add the EstateCommunityBlock component
const iconsRegex = /\/\/ --- CUSTOM SVG ICONS FOR ICONIC DUBAI LANDMARKS ---/;
const newIcons = `// --- CUSTOM SVG ICONS FOR ICONIC DUBAI LANDMARKS ---
const EstateCommunityBlock = ({ name }: { name: string }) => (
  <svg viewBox="0 0 240 160" className="w-[200px] h-[130px] drop-shadow-md cursor-pointer hover:scale-105 transition-transform z-10">
    <rect x="0" y="0" width="240" height="130" fill="#a3e635" rx="8" opacity="0.4" />
    {Array.from({ length: 24 }).map((_, i) => {
       const row = Math.floor(i / 6);
       const col = i % 6;
       const x = 10 + col * 36;
       const y = 10 + row * 28;
       return (
          <g key={i} transform={\`translate(\${x}, \${y}) scale(0.65)\`}>
            <rect x="8" y="20" width="24" height="16" fill="#f8fafc" />
            <polygon points="4,20 20,8 36,20" fill="#22c55e" />
            <rect x="16" y="26" width="8" height="10" fill="#94a3b8" />
          </g>
       );
    })}
    <rect x="0" y="135" width="240" height="25" fill="#475569" rx="4" />
    <text x="120" y="152" fill="#ffffff" fontSize="14" fontWeight="black" textAnchor="middle" className="tracking-widest">{name.toUpperCase()}</text>
  </svg>
);
`;
code = code.replace(iconsRegex, newIcons);

// 2. Add to getBuildingSprite
const spriteRegex = /if \(type === 'small-house'\) return <SmallHouseIcon \/>;/;
const newSprite = `if (type === 'estate-community') return <EstateCommunityBlock name={loc.name} />;
    if (type === 'small-house') return <SmallHouseIcon />;`;
code = code.replace(spriteRegex, newSprite);

// 3. Replace fallbackVenues block
// We want to replace the massive Array.from({ length: 150 }) and utilities with our spaced out communities.
const arrayRegex = /\/\/ MAINLAND ESTATE \(Massive Grid\)[\s\S]*?\{ id: "main-school-2", name: "West Academy", type: "school", virtualX: 500, virtualY: 350, interactive: true \},/m;

const restoredCommunities = `
        // ROW 1: Massive horizontal spacing (Y=450)
        { id: "discovery-gardens", name: "Discovery Gdns", type: "estate-community", virtualX: 400, virtualY: 450, seed: 104 },
        { id: "motor-city", name: "Motor City", type: "estate-community", virtualX: 900, virtualY: 450 },
        { id: "ranches", name: "Arabian Ranches", type: "estate-community", virtualX: 1400, virtualY: 450 },
        { id: "dubai-hills", name: "Dubai Hills", type: "estate-community", virtualX: 1900, virtualY: 450 },
        { id: "silicon-oasis", name: "Silicon Oasis", type: "estate-community", virtualX: 2400, virtualY: 450, seed: 105 },

        // ROW 2: Massive horizontal spacing (Y=150)
        { id: "emirates-hills", name: "Emirates Hills", type: "estate-community", virtualX: 400, virtualY: 150 },
        { id: "al-barsha", name: "Al Barsha", type: "estate-community", virtualX: 900, virtualY: 150, seed: 103 },
        { id: "al-quoz", name: "Al Quoz", type: "estate-community", virtualX: 1400, virtualY: 150, seed: 101 },
        { id: "business-bay", name: "Business Bay", type: "estate-community", virtualX: 1900, virtualY: 150 },
        { id: "deira", name: "Deira & Old Dubai", type: "estate-community", virtualX: 2400, virtualY: 150 },
`;

code = code.replace(arrayRegex, restoredCommunities);

// 4. Remove the extra road and label I added manually in add_estate_road.js
const extraRoadRegex = /\{\/\* Mainland Estate Road \*\/\}[\s\S]*?\{\/\* Marine Traffic \*\/\}/;
code = code.replace(extraRoadRegex, '{/* Marine Traffic */}');

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Converted communities into self-contained Estate grids and restored layout.");
