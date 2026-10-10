const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /const EstateCommunityBlock = \(\{ name \}: \{ name: string \}\) => \([\s\S]*?<\/svg>\n\);/;

const newComponent = `const EstateCommunityBlock = ({ name }: { name: string }) => (
  <svg viewBox="0 0 440 320" className="w-[350px] h-[260px] drop-shadow-md cursor-pointer hover:scale-105 transition-transform z-10">
    {/* Ground Base */}
    <rect x="0" y="0" width="440" height="320" fill="#bbf7d0" rx="12" opacity="0.6" />
    <rect x="0" y="0" width="440" height="320" fill="none" stroke="#86efac" strokeWidth="4" rx="12" />
    
    {/* Grid of 60 Houses (10 columns x 6 rows) */}
    {Array.from({ length: 60 }).map((_, i) => {
       const row = Math.floor(i / 10);
       const col = i % 10;
       const x = 20 + col * 40;
       const y = 20 + row * 40;
       return (
          <g key={i} transform={\`translate(\${x}, \${y})\`}>
            {/* White Plot Foundation */}
            <rect x="0" y="0" width="36" height="36" fill="#f8fafc" rx="4" />
            <rect x="0" y="0" width="36" height="36" fill="none" stroke="#e2e8f0" strokeWidth="1" rx="4" />
            
            {/* House Structure */}
            <g transform="translate(6, 4) scale(0.75)">
              <rect x="0" y="16" width="32" height="20" fill="#e2e8f0" />
              <polygon points="-4,16 16,0 36,16" fill="#22c55e" />
              <rect x="12" y="22" width="8" height="14" fill="#94a3b8" />
              <circle cx="26" cy="22" r="3" fill="#94a3b8" />
              <circle cx="6" cy="22" r="3" fill="#94a3b8" />
            </g>
          </g>
       );
    })}
    
    {/* Text Written Directly on Ground */}
    <text x="220" y="300" fill="#15803d" fontSize="24" fontWeight="black" textAnchor="middle" className="tracking-[0.2em]" opacity="0.8">
      {name.toUpperCase()}
    </text>
  </svg>
);`;

code = code.replace(regex, newComponent);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated EstateCommunityBlock");
