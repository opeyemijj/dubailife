const fs = require('fs');

let icons = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// 1. MarinaBlock (Step 2103)
const marinaBlock = `export const MarinaBlock = ({ name = "Marina", width = 400, height = 200 }: any) => {
   return (
       <div 
          className="relative rounded-lg flex flex-col justify-end overflow-hidden shadow-lg backdrop-blur-sm z-20 cursor-pointer hover:scale-105 transition-transform"
          style={{ width: \`\${width}px\`, height: \`\${height}px\`, backgroundColor: 'rgba(14, 165, 233, 0.3)', border: '2px solid rgba(255,255,255,0.4)' }}
       >
          <div className="absolute inset-0 flex items-center justify-center">
             {/* Main dock line */}
             <div className="w-[85%] h-[12px] bg-[#94a3b8] rounded-sm shadow-md relative">
                 {/* 6 yachts top, 6 yachts bottom */}
                 {Array.from({ length: 6 }).map((_, i) => (
                    <div key={\`t-\${i}\`} className="absolute top-[-50px] w-[50px] h-[50px]" style={{ left: \`\${5 + i * 16}%\` }}>
                        <svg viewBox="0 0 60 60" className="w-full h-full transform -rotate-90 drop-shadow-md">
                           <g transform="translate(30, 30)">
                              <path d="M -15 -6 L 10 -6 L 22 0 L 10 6 L -15 6 Z" fill="#ffffff" />
                              <rect x="-5" y="-3" width="12" height="6" fill="#cbd5e1" rx="1" />
                              <rect x="0" y="-2" width="5" height="4" fill="#0ea5e9" opacity="0.6" />
                           </g>
                        </svg>
                    </div>
                 ))}
                 {Array.from({ length: 6 }).map((_, i) => (
                    <div key={\`b-\${i}\`} className="absolute bottom-[-50px] w-[50px] h-[50px]" style={{ left: \`\${5 + i * 16}%\` }}>
                        <svg viewBox="0 0 60 60" className="w-full h-full transform -rotate-90 drop-shadow-md">
                           <g transform="translate(30, 30)">
                              <path d="M -15 -6 L 10 -6 L 22 0 L 10 6 L -15 6 Z" fill="#f8fafc" />
                              <rect x="-5" y="-3" width="12" height="6" fill="#cbd5e1" rx="1" />
                              <rect x="0" y="-2" width="5" height="4" fill="#0ea5e9" opacity="0.6" />
                           </g>
                        </svg>
                    </div>
                 ))}
             </div>
          </div>
          <div className="text-center font-bold tracking-widest text-white pb-2 text-sm drop-shadow-md z-10">
              {name.toUpperCase()}
          </div>
       </div>
   );
};`;
icons = icons.replace(/export const MarinaBlock = \(\{[\s\S]*?\n\};\n/, marinaBlock + '\n');

// 2. MuseumOfFutureIcon (Step 2144)
const motfBlock = `export const MuseumOfFutureIcon = ({ width = 80, height = 100 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 100 100" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-110 transition-transform origin-bottom z-30">
    <defs>
      <linearGradient id="motf-metal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="30%" stopColor="#94a3b8" />
        <stop offset="70%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>
    {/* Base shadow */}
    <ellipse cx="50" cy="95" rx="35" ry="5" fill="#0f172a" opacity="0.4" />
    
    {/* Torus Body */}
    <path 
      d="M 50 5 
         A 40 45 0 1 1 49.9 5 
         M 50 30 
         A 15 20 0 1 0 49.9 30" 
      fill="url(#motf-metal)" 
      fillRule="evenodd"
      stroke="#cbd5e1"
      strokeWidth="1.5"
    />
    
    {/* Abstract Calligraphy Decoration */}
    <g stroke="#334155" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5">
        <path d="M 25 35 Q 35 40 30 50" />
        <path d="M 40 20 Q 50 30 45 40" />
        <path d="M 60 15 Q 70 20 65 30" />
        <path d="M 75 40 Q 80 50 70 60" />
        <path d="M 85 65 Q 75 75 80 85" />
        <path d="M 50 85 Q 40 85 45 92" />
        <path d="M 20 70 Q 30 80 25 85" />
        <path d="M 15 50 Q 20 60 15 65" />
        
        {/* Inner ring calligraphy */}
        <path d="M 40 40 Q 45 45 40 50" />
        <path d="M 60 55 Q 55 60 60 65" />
        <path d="M 48 68 Q 50 65 52 68" />
        <path d="M 48 32 Q 50 35 52 32" />
    </g>
  </svg>
);
export const MuseumOfTheFutureIcon = MuseumOfFutureIcon;`;
icons = icons.replace(/export const MuseumOfTheFutureIcon = \(\) => \([\s\S]*?export const MuseumOfFutureIcon = MuseumOfTheFutureIcon;/, motfBlock);

// 3. MallBlock (Step 2162)
const mallBlock = `export const MallBlock = ({ width = 200, height = 180 }: { width?: number, height?: number }) => {
   const colors = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
      '#8b5cf6', '#14b8a6', '#ef4444', '#3b82f6',
      '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6'
   ];
   
   return (
     <svg viewBox="0 0 200 180" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
       {/* Base Platform */}
       <path d="M 5 30 L 195 30 L 195 175 L 5 175 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="4" rx="4" />
       
       {/* Back Left Building (Gray/Blue) */}
       <g transform="translate(25, 5)">
          <rect x="0" y="15" width="45" height="45" fill="#94a3b8" rx="2" />
          <rect x="0" y="5" width="45" height="25" fill="#e2e8f0" rx="2" />
          <polygon points="0,5 45,5 55,-5 10,-5" fill="#64748b" />
          {/* Windows */}
          <rect x="8" y="12" width="12" height="8" fill="#1e293b" rx="1" />
          <rect x="8" y="38" width="12" height="8" fill="#1e293b" rx="1" />
       </g>

       {/* Back Middle Green Tree/Dome */}
       <g transform="translate(100, 35)">
          <ellipse cx="0" cy="0" rx="22" ry="16" fill="#10b981" />
          <ellipse cx="-4" cy="-4" rx="10" ry="8" fill="#34d399" opacity="0.7" />
       </g>

       {/* Back Right Building (Brown/Tan) */}
       <g transform="translate(125, 5)">
          <rect x="0" y="15" width="50" height="45" fill="#78350f" rx="2" />
          <rect x="0" y="5" width="50" height="25" fill="#d97706" rx="2" />
          <polygon points="0,5 50,5 60,-5 10,-5" fill="#451a03" />
          {/* Windows */}
          <rect x="10" y="12" width="10" height="8" fill="#fef3c7" rx="1" />
          <rect x="10" y="38" width="10" height="8" fill="#fef3c7" rx="1" />
       </g>

       {/* Market Stalls (4 cols x 3 rows) */}
       {Array.from({ length: 12 }).map((_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const x = 20 + col * 42;
          const y = 65 + row * 34;
          const color = colors[i % colors.length];

          return (
             <g key={i} transform={\`translate(\${x}, \${y})\`}>
                <rect x="2" y="2" width="34" height="26" fill="#78350f" opacity="0.2" rx="2" />
                <rect x="4" y="0" width="30" height="24" fill="#d97706" rx="2" />
                <rect x="6" y="2" width="26" height="20" fill={color} rx="1" />
                <rect x="6" y="2" width="26" height="5" fill="#ffffff" opacity="0.3" />
                <circle cx="19" cy="12" r="3" fill="#ffffff" opacity="0.5" />
             </g>
          );
       })}

       {/* Floating Shopping Basket Icon */}
       <g transform="translate(170, 40)" className="drop-shadow-lg">
          <circle cx="0" cy="0" r="16" fill="#ffffff" />
          <circle cx="0" cy="0" r="14" fill="#3b82f6" />
          <text x="0" y="5" fill="#ffffff" fontSize="12" textAnchor="middle" fontWeight="bold">🛒</text>
       </g>
     </svg>
   );
};`;
icons = icons.replace(/export const MallBlock = \(\{[\s\S]*?\n\};\n/, mallBlock + '\n');

// 4. HotelBlock (Step 2174)
const hotelBlock = `export const HotelBlock = ({ width = 200, height = 200 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 200 200" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
    {/* Base Grass Platform */}
    <path d="M 5 5 L 195 5 L 195 195 L 5 195 Z" fill="#84cc6d" stroke="#ffffff" strokeWidth="6" rx="2" />
    
    {/* Parking Lot */}
    <rect x="5" y="145" width="55" height="40" fill="#475569" />
    <rect x="5" y="185" width="55" height="5" fill="#334155" />
    {/* Cars */}
    <g transform="translate(10, 150)">
       <rect x="0" y="0" width="12" height="24" fill="#0f172a" rx="2" />
       <rect x="2" y="4" width="8" height="6" fill="#1e293b" />
       
       <rect x="16" y="0" width="12" height="24" fill="#f8fafc" rx="2" />
       <rect x="18" y="4" width="8" height="6" fill="#cbd5e1" />
       
       <rect x="32" y="0" width="12" height="24" fill="#0f172a" rx="2" />
       <rect x="34" y="4" width="8" height="6" fill="#1e293b" />
    </g>

    {/* Pool Area */}
    <rect x="80" y="105" width="95" height="45" fill="#e2e8f0" />
    <rect x="90" y="112" width="75" height="30" fill="#22d3ee" />
    <rect x="90" y="112" width="75" height="4" fill="#67e8f9" opacity="0.5" />

    {/* Umbrellas */}
    <g transform="translate(90, 160)">
       <circle cx="0" cy="0" r="8" fill="#ef4444" />
       <polygon points="0,-8 4,0 0,8 -4,0" fill="#dc2626" opacity="0.3" />
       
       <circle cx="22" cy="0" r="8" fill="#facc15" />
       <polygon points="22,-8 26,0 22,8 18,0" fill="#eab308" opacity="0.3" />
       
       <circle cx="44" cy="0" r="8" fill="#3b82f6" />
       <polygon points="44,-8 48,0 44,8 40,0" fill="#2563eb" opacity="0.3" />
    </g>

    {/* Trees */}
    <g transform="translate(60, 175) scale(0.8)">
       <polygon points="0,-15 12,-8 15,5 8,15 -8,15 -15,5 -12,-8" fill="#15803d" />
       <polygon points="-4,-12 4,-12 8,-2 4,8 -4,8 -8,-2" fill="#16a34a" />
    </g>
    <g transform="translate(180, 175) scale(0.8)">
       <polygon points="0,-15 12,-8 15,5 8,15 -8,15 -15,5 -12,-8" fill="#15803d" />
       <polygon points="-4,-12 4,-12 8,-2 4,8 -4,8 -8,-2" fill="#16a34a" />
    </g>

    {/* Walkway Canopy */}
    <g transform="translate(10, 100)">
       <rect x="0" y="0" width="55" height="35" fill="#cbd5e1" opacity="0.5" rx="2" />
       <rect x="0" y="0" width="55" height="4" fill="#15803d" />
       <rect x="0" y="10" width="55" height="4" fill="#ffffff" />
       <rect x="0" y="20" width="55" height="4" fill="#15803d" />
       <rect x="0" y="30" width="55" height="4" fill="#ffffff" />
    </g>

    {/* Buildings Back Row */}
    
    {/* Left Low building (L-shape look) */}
    <g transform="translate(10, 20)">
       <rect x="0" y="15" width="45" height="60" fill="#64748b" />
       <rect x="0" y="15" width="45" height="5" fill="#1e293b" />
       {/* Windows */}
       <rect x="5" y="25" width="12" height="6" fill="#38bdf8" />
       <rect x="25" y="25" width="12" height="6" fill="#38bdf8" />
       <rect x="5" y="40" width="12" height="6" fill="#38bdf8" />
       <rect x="25" y="40" width="12" height="6" fill="#38bdf8" />
       <rect x="5" y="55" width="12" height="6" fill="#38bdf8" />
       <rect x="25" y="55" width="12" height="6" fill="#38bdf8" />
    </g>

    {/* Middle medium tower */}
    <g transform="translate(60, 10)">
       <rect x="0" y="10" width="45" height="80" fill="#94a3b8" />
       <rect x="0" y="10" width="45" height="8" fill="#334155" />
       {/* Roof structure */}
       <rect x="10" y="2" width="25" height="8" fill="#475569" />
       {/* Horizontal slit windows */}
       {[1,2,3,4,5,6].map(i => (
          <rect key={i} x="5" y={15 + i*10} width="35" height="4" fill="#0284c7" />
       ))}
    </g>

    {/* Right tall skyscraper */}
    <g transform="translate(110, 5)">
       <rect x="0" y="5" width="45" height="95" fill="#cbd5e1" />
       <rect x="0" y="5" width="45" height="6" fill="#1e293b" />
       {/* Roof cap */}
       <rect x="15" y="0" width="15" height="5" fill="#475569" />
       {/* Windows */}
       {[1,2,3,4,5,6,7].map(i => (
          <g key={i}>
            <rect x="6" y={10 + i*10} width="14" height="5" fill="#0284c7" />
            <rect x="25" y={10 + i*10} width="14" height="5" fill="#0284c7" />
          </g>
       ))}
    </g>

    {/* Floating Hotel Icon */}
    <g transform="translate(100, 45)" className="drop-shadow-lg">
       <circle cx="0" cy="0" r="16" fill="#ffffff" />
       <circle cx="0" cy="0" r="14" fill="#f97316" />
       <text x="0" y="5" fill="#ffffff" fontSize="14" textAnchor="middle" fontWeight="bold">H</text>
    </g>
  </svg>
);`;
icons = icons.replace(/export const HotelBlock = \(\{[\s\S]*?\n\};\n/, hotelBlock + '\n');

// 5. ApartmentComplexBlock (Step 2186)
const aptComplexBlock = `export const ApartmentComplexBlock = ({ width = 300, height = 250 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 300 250" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
    {/* Base Platform */}
    <path d="M 5 5 L 295 5 L 295 245 L 5 245 Z" fill="#84cc6d" stroke="#ffffff" strokeWidth="6" rx="2" />
    
    {/* Palm tree (far back) */}
    <g transform="translate(100, 20)">
       <path d="M 0,20 Q -5,35 -10,45" stroke="#78350f" strokeWidth="4" fill="none" />
       <path d="M 0,20 Q -15,10 -20,20 Q -10,5 0,20" fill="#15803d" />
       <path d="M 0,20 Q 5,0 15,5 Q 5,10 0,20" fill="#15803d" />
       <path d="M 0,20 Q 20,15 25,25 Q 10,20 0,20" fill="#15803d" />
       <path d="M 0,20 Q -10,25 -15,35 Q -5,25 0,20" fill="#15803d" />
    </g>

    {/* River on right edge */}
    <rect x="250" y="80" width="45" height="60" fill="#38bdf8" />

    {/* Pathways */}
    <rect x="5" y="125" width="290" height="15" fill="#cbd5e1" />
    <rect x="40" y="140" width="15" height="105" fill="#cbd5e1" />

    {/* Back Row Buildings */}
    
    {/* Skyscraper */}
    <g transform="translate(30, 20)">
       <rect x="0" y="0" width="35" height="105" fill="#94a3b8" />
       <rect x="0" y="95" width="35" height="10" fill="#1e293b" />
       <rect x="0" y="0" width="35" height="15" fill="#1e293b" />
       {/* Roof AC units */}
       <rect x="5" y="3" width="8" height="4" fill="#64748b" />
       <rect x="22" y="3" width="8" height="4" fill="#64748b" />
       <rect x="5" y="9" width="8" height="4" fill="#64748b" />
       <rect x="22" y="9" width="8" height="4" fill="#64748b" />
       {/* Windows */}
       {[1,2,3,4,5,6,7].map(i => <rect key={i} x="5" y={15 + i*10} width="25" height="5" fill="#38bdf8" />)}
    </g>

    {/* Blue Angled Building */}
    <g transform="translate(75, 45)">
       <rect x="0" y="15" width="45" height="65" fill="#60a5fa" />
       {/* Angled Roof */}
       <polygon points="0,15 45,5 45,15" fill="#1d4ed8" />
       <rect x="0" y="15" width="45" height="5" fill="#1e293b" />
       {/* Large Window Panes */}
       <rect x="6" y="25" width="12" height="15" fill="#1e293b" />
       <rect x="24" y="25" width="15" height="15" fill="#1e293b" />
       <rect x="6" y="45" width="12" height="15" fill="#1e293b" />
       <rect x="24" y="45" width="15" height="15" fill="#1e293b" />
       <rect x="6" y="65" width="12" height="10" fill="#1e293b" />
       <rect x="24" y="65" width="15" height="10" fill="#1e293b" />
    </g>

    {/* Green Mid-rise */}
    <g transform="translate(130, 45)">
       <rect x="0" y="0" width="45" height="80" fill="#4ade80" />
       <rect x="0" y="0" width="45" height="8" fill="#15803d" />
       {/* Windows */}
       {[1,2,3,4].map(i => (
          <g key={i}>
             <rect x="5" y={8 + i*15} width="14" height="8" fill="#f8fafc" />
             <rect x="24" y={8 + i*15} width="14" height="8" fill="#f8fafc" />
          </g>
       ))}
    </g>

    {/* Dark Gray Block */}
    <g transform="translate(185, 30)">
       <rect x="0" y="0" width="55" height="95" fill="#475569" />
       <rect x="0" y="0" width="55" height="12" fill="#0f172a" />
       <rect x="8" y="4" width="10" height="4" fill="#94a3b8" />
       <rect x="35" y="4" width="10" height="4" fill="#94a3b8" />
       {/* Strip Windows */}
       {[1,2,3,4,5].map(i => <rect key={i} x="6" y={15 + i*14} width="43" height="6" fill="#f8fafc" />)}
    </g>

    {/* Far Right Foliage */}
    <ellipse cx="260" cy="50" rx="16" ry="12" fill="#15803d" />
    <ellipse cx="275" cy="65" rx="18" ry="14" fill="#16a34a" />

    {/* Bottom Features */}

    {/* Sports Court */}
    <g transform="translate(180, 150)">
       <rect x="0" y="0" width="100" height="80" fill="#ea580c" rx="4" />
       <rect x="5" y="5" width="90" height="70" fill="#22c55e" />
       <rect x="49" y="5" width="2" height="70" fill="#ffffff" />
       <ellipse cx="50" cy="40" rx="14" ry="14" fill="none" stroke="#ffffff" strokeWidth="2" />
    </g>

    {/* Beige Townhouses */}
    <g transform="translate(70, 160)">
       <rect x="0" y="15" width="40" height="35" fill="#e7e5e4" />
       <polygon points="-5,15 20,-2 45,15" fill="#c2410c" />
       <rect x="6" y="20" width="10" height="12" fill="#1e293b" />
       <rect x="24" y="20" width="10" height="12" fill="#1e293b" />
       <rect x="15" y="38" width="10" height="12" fill="#78350f" />
    </g>
    <g transform="translate(120, 160)">
       <rect x="0" y="15" width="40" height="35" fill="#e7e5e4" />
       <polygon points="-5,15 20,-2 45,15" fill="#c2410c" />
       <rect x="6" y="20" width="10" height="12" fill="#1e293b" />
       <rect x="24" y="20" width="10" height="12" fill="#1e293b" />
       <rect x="15" y="38" width="10" height="12" fill="#78350f" />
    </g>

    {/* Bottom Left Gate & Parking */}
    <g transform="translate(10, 160)">
       {/* Entrance Columns */}
       <rect x="15" y="70" width="10" height="15" fill="#3b82f6" />
       <rect x="50" y="70" width="10" height="15" fill="#3b82f6" />
       <rect x="15" y="65" width="45" height="5" fill="#10b981" />
       
       {/* Parking */}
       <rect x="0" y="0" width="25" height="50" fill="#475569" />
       <rect x="4" y="5" width="17" height="18" fill="#ffffff" rx="2" />
       <rect x="4" y="26" width="17" height="18" fill="#3b82f6" rx="2" />
    </g>

    {/* Floating Graduation Cap Icon */}
    <g transform="translate(150, 40)" className="drop-shadow-lg">
       <circle cx="0" cy="0" r="16" fill="#ffffff" />
       <circle cx="0" cy="0" r="14" fill="#0f172a" />
       {/* Graduation Cap */}
       <polygon points="0,-6 10,-1 0,4 -10,-1" fill="#ffffff" />
       <polygon points="-6,1 6,1 4,5 -4,5" fill="#ffffff" />
       <line x1="8" y1="0" x2="8" y2="6" stroke="#f59e0b" strokeWidth="1.5" />
       <circle cx="8" cy="6" r="1" fill="#f59e0b" />
    </g>
  </svg>
);`;
icons = icons.replace(/export const ApartmentComplexBlock = \(\{[\s\S]*?\n\};\n/, aptComplexBlock + '\n');

// 6. GiantBillboardBlock (Step 2198)
const giantBillboardBlock = `export const GiantBillboardBlock = ({ 
   width = 250, height = 200, 
   text1 = "yad", text2 = "sale", 
   color1 = "#064e3b", color2 = "#16a34a" 
}: any) => (
  <svg viewBox="0 0 200 180" style={{ width: \`\${width}px\`, height: \`\${height}px\` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
     {/* Pole */}
     <polygon points="100,100 115,95 90,170 75,175" fill="#0f172a" />
     <polygon points="108,98 115,95 90,170 83,173" fill="#1e293b" />

     {/* The Billboard Frame */}
     <g transform="translate(15, 35) rotate(-5) skewX(10)">
        {/* AD Badge */}
        <rect x="135" y="-12" width="25" height="12" fill="#ffffff" />
        <text x="147.5" y="-3" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">AD</text>
        
        {/* Outer Frame */}
        <rect x="0" y="0" width="160" height="80" fill="#0f172a" rx="2" />
        
        {/* White Canvas */}
        <rect x="5" y="5" width="150" height="70" fill="#ffffff" />
        
        {/* Text */}
        <g transform="translate(80, 48)">
           <text textAnchor="middle" fontSize="30" fontWeight="900" fontFamily="sans-serif" letterSpacing="-1">
              <tspan fill={color1}>{text1}</tspan>
              <tspan fill={color2}>{text2}</tspan>
           </text>
           {/* Smile under the second part */}
           <path d="M 12 8 Q 28 20 48 2" fill="none" stroke={color2} strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Bottom Shelf */}
        <rect x="-2" y="80" width="164" height="6" fill="#1e293b" rx="1" />
        <rect x="-2" y="80" width="164" height="2" fill="#334155" />

        {/* Lights */}
        <rect x="20" y="80" width="8" height="4" fill="#fef3c7" />
        <rect x="76" y="80" width="8" height="4" fill="#fef3c7" />
        <rect x="132" y="80" width="8" height="4" fill="#fef3c7" />
     </g>
  </svg>
);`;
icons = icons.replace(/export const GiantBillboardBlock = \(\{[\s\S]*?\n\};\n/, giantBillboardBlock + '\n');

fs.writeFileSync('src/components/map/Icons.tsx', icons);
console.log("Restored all 6 exact building components from 24h ago!");
