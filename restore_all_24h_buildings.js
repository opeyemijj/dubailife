const fs = require('fs');

const fileContent = `import React from 'react';

export const isoToScreen = (gx: number, gy: number, originX = 150, originY = 80) => ({
  x: originX + (gx - gy) * 0.866,
  y: originY + (gx + gy) * 0.5
});

export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 2600;

export const EstateBase = ({ name }: { name: string }) => (
  <svg viewBox="0 0 320 220" className="w-[320px] h-[220px] drop-shadow-sm pointer-events-none z-0">
    <rect x="0" y="0" width="320" height="220" fill="#bbf7d0" rx="8" opacity="0.5" />
    <rect x="0" y="0" width="320" height="220" fill="none" stroke="#86efac" strokeWidth="2" rx="8" />
    <text x="160" y="210" fill="#15803d" fontSize="16" fontWeight="black" textAnchor="middle" className="tracking-widest opacity-70">{name.toUpperCase()}</text>
  </svg>
);

export const ClickableHouseNew = () => (
  <svg viewBox="0 0 40 40" className="w-[40px] h-[40px] drop-shadow-md cursor-pointer hover:scale-125 transition-transform z-10">
    <rect x="0" y="0" width="40" height="40" fill="#f8fafc" rx="4" />
    <rect x="0" y="0" width="40" height="40" fill="none" stroke="#e2e8f0" strokeWidth="2" rx="4" />
    <g transform="translate(4, 4) scale(0.8)">
        <rect x="0" y="16" width="32" height="20" fill="#e2e8f0" />
        <polygon points="-4,16 16,0 36,16" fill="#22c55e" />
        <rect x="12" y="22" width="8" height="14" fill="#94a3b8" />
    </g>
  </svg>
);

export const ApartmentBuildingIconNew = () => (
  <svg viewBox="0 0 50 120" className="w-[50px] h-[120px] drop-shadow-2xl cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="10" width="30" height="110" fill="#cbd5e1" rx="2" />
    <rect x="15" y="0" width="20" height="10" fill="#94a3b8" rx="1" />
    {Array.from({length: 8}).map((_, i) => (
       <g key={i}>
         <rect x="15" y={20 + i*10} width="8" height="6" fill="#38bdf8" opacity="0.6" />
         <rect x="27" y={20 + i*10} width="8" height="6" fill="#38bdf8" opacity="0.6" />
       </g>
    ))}
  </svg>
);

export const RooftopIconNew = () => (
  <svg viewBox="0 0 60 100" className="w-[50px] h-[80px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="40" width="40" height="60" fill="#334155" rx="2" />
    <rect x="15" y="45" width="10" height="50" fill="#94a3b8" />
    <rect x="35" y="45" width="10" height="50" fill="#94a3b8" />
    <circle cx="30" cy="20" r="18" fill="#1e293b" />
    <path d="M 23 28 L 30 15 L 37 28" fill="none" stroke="#facc15" strokeWidth="2" />
    <circle cx="30" cy="11" r="3" fill="#facc15" />
    <text x="30" y="36" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">SKY</text>
  </svg>
);

export const NightclubIconNew = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="30" width="60" height="40" fill="#1e293b" rx="4" />
    <rect x="15" y="35" width="50" height="30" fill="#0f172a" rx="2" />
    <rect x="35" y="50" width="10" height="20" fill="#ef4444" opacity="0.8" />
    <circle cx="40" cy="18" r="16" fill="#9333ea" />
    <circle cx="40" cy="18" r="12" fill="none" stroke="#f472b6" strokeWidth="2" strokeDasharray="2 2" />
    <path d="M 35 12 L 35 24 L 47 18 Z" fill="#ffffff" />
  </svg>
);

export const BeachClubIconNew = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <rect x="10" y="40" width="60" height="30" fill="#fef08a" rx="2" />
    <rect x="15" y="45" width="20" height="15" fill="#38bdf8" opacity="0.8" />
    <rect x="45" y="45" width="20" height="15" fill="#38bdf8" opacity="0.8" />
    <circle cx="40" cy="20" r="18" fill="#fde047" />
    <circle cx="40" cy="20" r="15" fill="#38bdf8" />
    <path d="M 30 20 Q 40 10 50 20 Q 40 30 30 20" fill="#fef08a" />
  </svg>
);

export const RestaurantIconNew = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-lg cursor-pointer hover:scale-110 transition-transform origin-bottom z-20">
    <polygon points="10,40 40,25 70,40" fill="#b91c1c" />
    <rect x="15" y="40" width="50" height="35" fill="#f8fafc" />
    <rect x="25" y="50" width="10" height="15" fill="#cbd5e1" />
    <rect x="45" y="50" width="10" height="15" fill="#cbd5e1" />
    <circle cx="40" cy="15" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
    <path d="M 35 10 L 35 20 M 32 12 L 38 12 M 32 15 L 38 15" stroke="#64748b" strokeWidth="1" />
    <path d="M 45 8 Q 42 15 45 22 Q 48 15 45 8" fill="none" stroke="#64748b" strokeWidth="1" />
  </svg>
);

export const EstateCommunityBlock = ({ name }: { name: string }) => <EstateBase name={name} />;

export const SmallHouseIcon = () => (
  <svg viewBox="0 0 40 40" className="w-[35px] h-[35px] drop-shadow-sm cursor-pointer hover:scale-110 transition-transform">
     <rect x="8" y="20" width="24" height="16" fill="#e2e8f0" />
     <polygon points="4,20 20,8 36,20" fill="#22c55e" />
     <rect x="16" y="26" width="8" height="10" fill="#94a3b8" />
  </svg>
);

export const StadiumIcon = () => (
  <svg viewBox="0 0 100 80" className="w-[80px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <ellipse cx="50" cy="40" rx="45" ry="30" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="4" />
     <ellipse cx="50" cy="40" rx="35" ry="20" fill="#22c55e" />
     <rect x="48" y="25" width="4" height="30" fill="#ffffff" opacity="0.6" />
     <circle cx="50" cy="40" r="5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
  </svg>
);

export const HospitalIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <rect x="15" y="20" width="50" height="50" fill="#f8fafc" rx="4" />
     <rect x="30" y="10" width="20" height="60" fill="#f1f5f9" rx="2" />
     <rect x="35" y="30" width="10" height="10" fill="#ef4444" />
     <rect x="30" y="35" width="20" height="10" fill="#ef4444" />
  </svg>
);

export const SchoolIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <rect x="10" y="40" width="60" height="30" fill="#fbbf24" rx="2" />
     <polygon points="10,40 40,20 70,40" fill="#b45309" />
     <rect x="35" y="50" width="10" height="20" fill="#78350f" />
  </svg>
);

export const CasinoIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[60px] h-[60px] drop-shadow-xl cursor-pointer hover:scale-110 transition-transform">
     <rect x="20" y="20" width="40" height="50" fill="#0f172a" rx="4" />
     <circle cx="40" cy="40" r="10" fill="#eab308" />
     <text x="40" y="44" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">$</text>
     <rect x="10" y="70" width="60" height="10" fill="#1e293b" />
  </svg>
);

export const ParkIcon = () => (
  <svg viewBox="0 0 80 80" className="w-[70px] h-[70px] drop-shadow-md cursor-pointer hover:scale-110 transition-transform">
     <rect x="5" y="5" width="70" height="70" fill="#4ade80" rx="8" />
     <circle cx="25" cy="25" r="12" fill="#16a34a" />
     <circle cx="55" cy="55" r="15" fill="#15803d" />
     <circle cx="60" cy="20" r="10" fill="#16a34a" />
     <path d="M 20 60 Q 40 40 60 20" fill="none" stroke="#d4d4d8" strokeWidth="4" />
  </svg>
);

export const BurjKhalifaIcon = () => (
  <svg viewBox="0 0 100 250" width="100%" height="100%" className="drop-shadow-2xl z-40 relative cursor-pointer hover:scale-110 transition-transform origin-bottom">
     <rect x="42" y="230" width="16" height="20" fill="#64748b" rx="2" />
     <polygon points="30,230 70,230 65,170 35,170" fill="#94a3b8" />
     <polygon points="35,170 65,170 60,110 40,110" fill="#cbd5e1" />
     <polygon points="40,110 60,110 56,50 44,50" fill="#e2e8f0" />
     <polygon points="45,50 55,50 51,10 49,10" fill="#f8fafc" />
     <line x1="50" y1="10" x2="50" y2="0" stroke="#ffffff" strokeWidth="2" />
     <text x="50" y="245" fill="#0284c7" fontSize="10" fontWeight="black" textAnchor="middle">BURJ KHALIFA</text>
  </svg>
);

export const BulgariIslandIcon = () => (
  <svg viewBox="0 0 120 120" className="w-[120px] h-[120px] drop-shadow-xl z-20 relative cursor-pointer group">
    {/* Seahorse Island */}
    <path d="M 60 100 C 20 100, 20 60, 40 40 C 60 20, 80 20, 90 40 C 100 60, 80 70, 70 70 C 60 70, 50 60, 50 50" fill="none" stroke="#E3CDA4" strokeWidth="25" strokeLinecap="round" />
    {/* Resort Buildings */}
    <rect x="35" y="45" width="20" height="10" fill="#f8fafc" rx="2" transform="rotate(-30 45 50)" />
    <rect x="65" y="30" width="15" height="15" fill="#f8fafc" rx="2" />
    <text x="60" y="115" fill="#16a34a" fontSize="12" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-md">BULGARI RESORT</text>
  </svg>
);

export const AtlantisTheRoyalIcon = () => (
  <svg viewBox="0 0 160 80" className="w-[140px] h-[70px] drop-shadow-2xl z-20 relative cursor-pointer group">
    {/* Base structure */}
    <rect x="10" y="50" width="140" height="10" fill="#f1f5f9" rx="2" />
    {/* Jenga blocks left */}
    <rect x="20" y="30" width="30" height="20" fill="#e2e8f0" rx="1" />
    <rect x="30" y="10" width="30" height="20" fill="#cbd5e1" rx="1" />
    {/* Jenga blocks right */}
    <rect x="110" y="30" width="30" height="20" fill="#e2e8f0" rx="1" />
    <rect x="100" y="10" width="30" height="20" fill="#cbd5e1" rx="1" />
    {/* Sky bridge */}
    <rect x="50" y="15" width="60" height="8" fill="#f8fafc" />
    <text x="80" y="75" fill="#e11d48" fontSize="12" fontWeight="black" textAnchor="middle" className="tracking-widest drop-shadow-md">ATLANTIS THE ROYAL</text>
  </svg>
);

export const JumeirahBeachHotelIcon = () => (
  <svg viewBox="0 0 160 100" className="w-[120px] h-[75px] drop-shadow-xl z-20 relative cursor-pointer">
    <ellipse cx="80" cy="90" rx="75" ry="10" fill="#E3CDA4" />
    <path d="M 10 90 C 10 40, 80 10, 150 90 Z" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" />
    <path d="M 20 90 C 20 50, 80 25, 140 90 Z" fill="#e0f2fe" />
    <path d="M 30 90 C 30 60, 80 40, 130 90 Z" fill="#f0f9ff" />
    <text x="80" y="115" fill="#16a34a" fontSize="14" fontWeight="black" textAnchor="middle" className="drop-shadow-md tracking-widest">JUMEIRAH BEACH HOTEL</text>
  </svg>
);

export const BurjAlArabIcon = () => (
  <svg viewBox="0 0 160 320" className="w-[120px] h-[240px] drop-shadow-2xl z-40 relative cursor-pointer hover:scale-110 transition-transform origin-bottom">
    <ellipse cx="80" cy="285" rx="70" ry="15" fill="#E3CDA4" />
    <path d="M 20 280 L 140 280 L 130 290 L 30 290 Z" fill="#94a3b8" />
    
    <rect x="55" y="40" width="12" height="240" fill="#f8fafc" />
    <rect x="61" y="40" width="6" height="240" fill="#cbd5e1" />
    
    <polygon points="55,40 67,40 61,0" fill="#f8fafc" />
    <polygon points="61,40 67,40 61,0" fill="#cbd5e1" />
    
    <path d="M 55 75 L 15 75 L 15 88 L 55 98 Z" fill="#0ea5e9" opacity="0.9" stroke="#0284c7" strokeWidth="1" />
    <path d="M 55 70 L 15 70 L 15 75 L 55 75 Z" fill="#f8fafc" />
    <polygon points="55,98 15,88 55,110" fill="#cbd5e1" opacity="0.5" />
    
    <path d="M 67 60 Q 180 180 67 280 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
    <path d="M 67 60 Q 120 180 67 280 Z" fill="#bae6fd" opacity="0.6" stroke="#7dd3fc" strokeWidth="2" />
    
    <path d="M 67 60 L 105 130 L 67 170" fill="none" stroke="#f8fafc" strokeWidth="4" strokeLinejoin="round" />
    <path d="M 67 170 L 120 220 L 67 280" fill="none" stroke="#f8fafc" strokeWidth="5" strokeLinejoin="round" />
    <path d="M 67 60 L 105 130 L 67 170" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinejoin="round" />
    <path d="M 67 170 L 120 220 L 67 280" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinejoin="round" />

    <path d="M 67 100 Q 125 150 67 200" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.5" />
    <path d="M 67 130 Q 140 180 67 240" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.5" />
    
    <path d="M 67 90 L 110 80" fill="none" stroke="#64748b" strokeWidth="4" />
    <ellipse cx="120" cy="78" rx="22" ry="6" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
    <ellipse cx="120" cy="78" rx="14" ry="4" fill="none" stroke="#ffffff" strokeWidth="1" />
    <text x="120" y="80.5" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">H</text>

    <text x="80" y="315" fill="#1d4ed8" fontSize="16" fontWeight="black" textAnchor="middle" className="drop-shadow-md tracking-wider">BURJ AL ARAB</text>
  </svg>
);

export const MuseumOfFutureIcon = ({ width = 80, height = 100 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 100 100" style={{ width: `${width}px`, height: `${height}px` }} className="drop-shadow-2xl cursor-pointer hover:scale-110 transition-transform origin-bottom z-30">
    <defs>
      <linearGradient id="motf-metal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="30%" stopColor="#94a3b8" />
        <stop offset="70%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="95" rx="35" ry="5" fill="#0f172a" opacity="0.4" />
    <path 
      d="M 50 5 A 40 45 0 1 1 49.9 5 M 50 30 A 15 20 0 1 0 49.9 30" 
      fill="url(#motf-metal)" 
      fillRule="evenodd"
      stroke="#cbd5e1"
      strokeWidth="1.5"
    />
    <g stroke="#334155" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5">
        <path d="M 25 35 Q 35 40 30 50" />
        <path d="M 40 20 Q 50 30 45 40" />
        <path d="M 60 15 Q 70 20 65 30" />
        <path d="M 75 40 Q 80 50 70 60" />
        <path d="M 85 65 Q 75 75 80 85" />
        <path d="M 50 85 Q 40 85 45 92" />
        <path d="M 20 70 Q 30 80 25 85" />
        <path d="M 15 50 Q 20 60 15 65" />
        <path d="M 40 40 Q 45 45 40 50" />
        <path d="M 60 55 Q 55 60 60 65" />
        <path d="M 48 68 Q 50 65 52 68" />
        <path d="M 48 32 Q 50 35 52 32" />
    </g>
  </svg>
);
export const MuseumOfTheFutureIcon = MuseumOfFutureIcon;

export const DubaiFrameIcon = () => (
  <svg viewBox="0 0 100 140" className="w-[80px] h-[110px] drop-shadow-xl z-30 cursor-pointer hover:scale-110 transition-transform">
     <rect x="15" y="15" width="70" height="110" fill="none" stroke="#eab308" strokeWidth="14" rx="4" />
     <rect x="18" y="18" width="64" height="104" fill="none" stroke="#fef08a" strokeWidth="4" rx="2" />
     <text x="50" y="138" fill="#ca8a04" fontSize="10" fontWeight="black" textAnchor="middle">DUBAI FRAME</text>
  </svg>
);

export const AtlantisIcon = () => (
  <svg viewBox="0 0 150 120" className="w-[140px] h-[110px] drop-shadow-2xl">
    <path d="M 0 120 L 150 120 L 125 40 L 105 40 L 105 0 L 45 0 L 45 40 L 25 40 Z" fill="#fda4af" stroke="#fb7185" strokeWidth="1" />
    <path d="M 75 40 Q 75 80 50 120 L 100 120 Q 75 80 75 40 Z" fill="#A6D59A" />
    <rect x="45" y="0" width="60" height="20" fill="#fca5a5" />
    <rect x="45" y="20" width="60" height="5" fill="#e11d48" />
  </svg>
);

export const EmiratesTowersIcon = () => (
  <svg viewBox="0 0 150 350" className="w-[120px] h-[280px] drop-shadow-2xl">
    <path d="M 10 350 L 50 350 L 50 50 L 10 100 Z" fill="#94a3b8" />
    <path d="M 50 350 L 70 350 L 70 150 L 50 50 Z" fill="#cbd5e1" opacity="0.8" />
    <path d="M 80 350 L 120 350 L 120 120 L 80 170 Z" fill="#94a3b8" />
    <path d="M 120 350 L 140 350 L 140 220 L 120 120 Z" fill="#cbd5e1" opacity="0.8" />
  </svg>
);

export const GevoraIcon = () => (
  <svg viewBox="0 0 100 450" className="w-[60px] h-[350px] drop-shadow-2xl">
    <rect x="30" y="100" width="40" height="350" fill="#d97706" />
    <rect x="35" y="100" width="30" height="350" fill="#f59e0b" />
    <path d="M 30 100 L 70 100 L 60 40 L 40 40 Z" fill="#fbbf24" />
    <path d="M 40 40 L 60 40 L 50 0 Z" fill="#fef3c7" />
  </svg>
);

export const RoseRayhaanIcon = () => (
  <svg viewBox="0 0 100 400" className="w-[70px] h-[300px] drop-shadow-2xl">
    <rect x="25" y="100" width="50" height="300" fill="#0284c7" />
    <rect x="35" y="100" width="30" height="300" fill="#38bdf8" />
    <path d="M 25 100 Q 50 0 75 100 Z" fill="#7dd3fc" />
    <circle cx="50" cy="50" r="8" fill="#e0f2fe" />
    <path d="M 48 50 L 52 50 L 50 10 Z" fill="#e0f2fe" />
  </svg>
);

export const DWTCIcon = () => (
  <svg viewBox="0 0 150 300" className="w-[90px] h-[180px] drop-shadow-2xl">
    <rect x="15" y="250" width="120" height="50" fill="#f8fafc" />
    <rect x="25" y="200" width="100" height="50" fill="#e2e8f0" />
    <rect x="35" y="150" width="80" height="50" fill="#f8fafc" />
    <rect x="45" y="100" width="60" height="50" fill="#e2e8f0" />
    <rect x="55" y="50" width="40" height="50" fill="#f8fafc" />
    <rect x="25" y="260" width="100" height="20" fill="#1e293b" opacity="0.1" />
    <rect x="35" y="210" width="80" height="20" fill="#1e293b" opacity="0.1" />
    <rect x="45" y="160" width="60" height="20" fill="#1e293b" opacity="0.1" />
    <rect x="55" y="110" width="40" height="20" fill="#1e293b" opacity="0.1" />
    <rect x="65" y="60" width="20" height="20" fill="#1e293b" opacity="0.1" />
  </svg>
);

export const SalikGate = () => (
  <svg viewBox="0 0 100 40" className="w-[100px] h-[40px] drop-shadow-xl z-20 relative pointer-events-none">
    <rect x="0" y="0" width="8" height="40" fill="#94a3b8" />
    <rect x="92" y="0" width="8" height="40" fill="#94a3b8" />
    <rect x="0" y="10" width="100" height="10" fill="#e2e8f0" />
    <rect x="25" y="5" width="50" height="20" fill="#ef4444" rx="4" />
    <text x="50" y="19" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">SALIK</text>
  </svg>
);

export const RoadSign = ({ text }: { text: string }) => (
  <svg viewBox="0 0 120 60" width="100%" height="100%">
    <rect width="120" height="60" fill="#166534" rx="5" />
    <text x="60" y="35" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">{text}</text>
  </svg>
);

export const SkylineTower = ({ seed }: { seed: number }) => (
  <svg viewBox="0 0 100 300" width="100%" height="100%" className="drop-shadow-xl z-30 hover:scale-105 transition-transform">
    <rect x="20" y="50" width="60" height="250" fill="#64748b" rx="4" />
    <rect x="30" y="60" width="40" height="240" fill="#94a3b8" />
  </svg>
);

export const AirportBlock = () => (
  <svg viewBox="0 0 400 300" width="100%" height="100%" className="drop-shadow-2xl z-20 hover:scale-105 transition-transform">
    <rect width="400" height="300" fill="#94a3b8" rx="20" />
    <rect x="50" y="50" width="300" height="40" fill="#334155" />
    <rect x="50" y="150" width="300" height="40" fill="#334155" />
    <text x="200" y="130" fill="#ffffff" fontSize="30" fontWeight="bold" textAnchor="middle">DXB AIRPORT</text>
  </svg>
);

export const TycoonBlock = ({ name, type, cols, rows, w, h }: any) => {
  const cellW = (w - 20) / cols;
  const cellH = (h - 40) / rows;
  const units = [];
  for(let r=0; r<rows; r++) {
    for(let c=0; c<cols; c++) {
      units.push({ c, r, x: 10 + c*cellW, y: 30 + r*cellH });
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: `${w}px`, height: `${h}px` }} className="drop-shadow-xl hover:scale-105 transition-transform z-20">
      <rect x="0" y="0" width={w} height={h} fill="#22c55e" rx="10" stroke="#16a34a" strokeWidth="4" />
      <rect x="0" y="0" width={w} height="25" fill="#16a34a" rx="10" />
      {name && <text x={w/2} y={17} fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">{name.toUpperCase()}</text>}
      
      {units.map((u, i) => (
        <rect 
          key={i} x={u.x + cellW*0.1} y={u.y + cellH*0.1} 
          width={cellW*0.8} height={cellH*0.8} 
          fill={type === 'apartment' ? "#3b82f6" : "#f59e0b"} 
          rx="2" 
        />
      ))}
    </svg>
  );
};

export const BluewatersBlock = () => <TycoonBlock name="Bluewaters" type="apartment" cols={8} rows={4} w={200} h={120} />;
export const ArabianRanchesBlock = () => <TycoonBlock name="Arabian Ranches" type="villa" cols={11} rows={8} w={340} h={270} />;
export const JBRBlock = () => <TycoonBlock name="JBR" type="apartment" cols={12} rows={2} w={350} h={90} />;
export const EmiratesHillsBlock = () => <TycoonBlock name="Emirates Hills" type="villa" cols={12} rows={7} w={360} h={240} />;
export const BusinessBayBlock = () => <TycoonBlock name="Business Bay" type="apartment" cols={12} rows={10} w={360} h={320} />;
export const DeiraBlock = () => <TycoonBlock name="Deira" type="apartment" cols={11} rows={7} w={340} h={240} />;
export const MotorCityBlock = () => <TycoonBlock name="Motor City" type="apartment" cols={10} rows={6} w={310} h={210} />;

export const PalmCommunityBlock = () => (
  <svg viewBox="0 0 500 500" className="w-[350px] h-[350px] drop-shadow-2xl z-20 relative cursor-pointer group">
     {/* 3-Part Crescent Breakwater */}
     <path d="M 110 95 A 220 220 0 0 1 390 95" fill="none" stroke="#E3CDA4" strokeWidth="35" strokeLinecap="round" />
     <path d="M 90 110 A 220 220 0 0 0 70 400" fill="none" stroke="#E3CDA4" strokeWidth="30" strokeLinecap="round" />
     <path d="M 410 110 A 220 220 0 0 1 430 400" fill="none" stroke="#E3CDA4" strokeWidth="30" strokeLinecap="round" />
     
     {/* Subsea tunnel */}
     <line x1="250" y1="50" x2="250" y2="150" stroke="#94a3b8" strokeWidth="6" strokeDasharray="5,5" />
     
     {/* Trunk Main */}
     <rect x="210" y="140" width="80" height="280" fill="#E3CDA4" />
     <rect x="170" y="370" width="160" height="30" rx="10" fill="#E3CDA4" />
     <rect x="190" y="410" width="120" height="20" rx="6" fill="#E3CDA4" />
     
     {/* 16 Fronds */}
     {Array.from({length: 8}).map((_, i) => {
        const y = 160 + i * 27;
        return (
           <g key={i}>
              <path d={`M 230 ${y} Q 110 ${y+10} 70 ${y - 30}`} fill="none" stroke="#E3CDA4" strokeWidth="24" strokeLinecap="round" />
              <path d={`M 270 ${y} Q 390 ${y+10} 430 ${y - 30}`} fill="none" stroke="#E3CDA4" strokeWidth="24" strokeLinecap="round" />
           </g>
        )
     })}

     {/* Monorail / Road */}
     <rect x="246" y="140" width="8" height="310" fill="#94a3b8" />
     
     {/* Atlantis The Palm */}
     <g transform="translate(210, 15)">
        <rect x="10" y="15" width="60" height="35" fill="#f43f5e" rx="4" />
        <rect x="30" y="25" width="20" height="25" fill="#E3CDA4" /> 
        <rect x="0" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <rect x="65" y="15" width="15" height="45" fill="#e11d48" rx="2" />
        <polygon points="0,15 7.5,-5 15,15" fill="#9f1239" />
        <polygon points="65,15 72.5,-5 80,15" fill="#9f1239" />
        <polygon points="25,15 40,0 55,15" fill="#9f1239" />
        <text x="40" y="65" fill="#9f1239" fontSize="12" fontWeight="black" textAnchor="middle" className="drop-shadow-md">ATLANTIS</text>
     </g>

     <text x="250" y="340" fill="#16a34a" fontSize="20" fontWeight="black" textAnchor="middle" transform="rotate(-90 250 340)" className="tracking-widest drop-shadow-md">PALM JUMEIRAH</text>
  </svg>
);

export const GenericNeighborhood = ({ name, seed }: { name: string, seed: number }) => (
  <svg viewBox="0 0 200 200" width="100%" height="100%" className="drop-shadow-lg z-10 hover:scale-105 transition-transform">
    <rect width="200" height="200" fill="#e2e8f0" rx="10" stroke="#cbd5e1" strokeWidth="4" />
    <rect width="200" height="30" fill="#cbd5e1" rx="10" />
    <text x="100" y="20" fill="#475569" fontSize="14" fontWeight="bold" textAnchor="middle">{name.toUpperCase()}</text>
    <rect x="20" y="50" width="60" height="60" fill="#94a3b8" rx="4" />
    <rect x="100" y="50" width="80" height="120" fill="#64748b" rx="4" />
    <rect x="20" y="130" width="60" height="40" fill="#cbd5e1" rx="4" />
  </svg>
);

export const initialAds: any[] = [];

export const BridgeBlock = ({ width = 10, height = 100 }: any) => (
  <svg viewBox="0 0 100 100" style={{ width: `${width}px`, height: `${height}px` }} className="z-10" preserveAspectRatio="none">
    <rect x="20" y="0" width="60" height="100" fill="#334155" />
    <line x1="50" y1="0" x2="50" y2="100" stroke="#facc15" strokeWidth="4" strokeDasharray="10 10" />
  </svg>
);

export const DynamicCommunityBlock = ({ name = "Community", width = 400, height = 300, color = "#bbf7d0", rows = 4, cols = 6, buildingType = "small-house" }: any) => {
  const cellW = (width - 40) / cols;
  const cellH = (height - 60) / rows;
  const units = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      units.push({ c, r, x: 20 + c * cellW, y: 40 + r * cellH });
    }
  }

  return (
    <div 
      className="relative rounded-xl border-4 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-sm z-20 cursor-pointer hover:scale-105 transition-transform"
      style={{ width: `${width}px`, height: `${height}px`, backgroundColor: `${color}40`, borderColor: color }}
    >
      <div className="w-full py-1 text-center font-black tracking-widest text-xs uppercase shadow-sm" style={{ backgroundColor: color, color: '#0f172a' }}>
        {name}
      </div>

      <div className="absolute inset-0 top-6 p-2 flex flex-wrap gap-2 items-center justify-center pointer-events-none">
        {units.map((u, i) => (
          <div key={i} style={{ width: `${cellW * 0.8}px`, height: `${cellH * 0.8}px` }} className="flex items-center justify-center">
            {buildingType === 'small-house' ? (
              <SmallHouseIcon />
            ) : (
              <ApartmentBuildingIconNew />
            )}
          </div>
        ))}
      </div>

      <div className="w-full py-0.5 text-center text-[10px] font-bold text-gray-500 opacity-60">
        MASTER COMMUNITY
      </div>
    </div>
  );
};

export const MarinaBlock = ({ name = "Marina", width = 400, height = 200 }: any) => {
   return (
       <div 
          className="relative rounded-lg flex flex-col justify-end overflow-hidden shadow-lg backdrop-blur-sm z-20 cursor-pointer hover:scale-105 transition-transform"
          style={{ width: `${width}px`, height: `${height}px`, backgroundColor: 'rgba(14, 165, 233, 0.3)', border: '2px solid rgba(255,255,255,0.4)' }}
       >
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-[85%] h-[12px] bg-[#94a3b8] rounded-sm shadow-md relative">
                 {Array.from({ length: 6 }).map((_, i) => (
                    <div key={`t-${i}`} className="absolute top-[-50px] w-[50px] h-[50px]" style={{ left: `${5 + i * 16}%` }}>
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
                    <div key={`b-${i}`} className="absolute bottom-[-50px] w-[50px] h-[50px]" style={{ left: `${5 + i * 16}%` }}>
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
};

export const MallBlock = ({ width = 200, height = 180 }: { width?: number, height?: number }) => {
   const colors = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
      '#8b5cf6', '#14b8a6', '#ef4444', '#3b82f6',
      '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6'
   ];
   
   return (
     <svg viewBox="0 0 200 180" style={{ width: `${width}px`, height: `${height}px` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
       <path d="M 5 30 L 195 30 L 195 175 L 5 175 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="4" rx="4" />
       
       <g transform="translate(25, 5)">
          <rect x="0" y="15" width="45" height="45" fill="#94a3b8" rx="2" />
          <rect x="0" y="5" width="45" height="25" fill="#e2e8f0" rx="2" />
          <polygon points="0,5 45,5 55,-5 10,-5" fill="#64748b" />
          <rect x="8" y="12" width="12" height="8" fill="#1e293b" rx="1" />
          <rect x="8" y="38" width="12" height="8" fill="#1e293b" rx="1" />
       </g>

       <g transform="translate(100, 35)">
          <ellipse cx="0" cy="0" rx="22" ry="16" fill="#10b981" />
          <ellipse cx="-4" cy="-4" rx="10" ry="8" fill="#34d399" opacity="0.7" />
       </g>

       <g transform="translate(125, 5)">
          <rect x="0" y="15" width="50" height="45" fill="#78350f" rx="2" />
          <rect x="0" y="5" width="50" height="25" fill="#d97706" rx="2" />
          <polygon points="0,5 50,5 60,-5 10,-5" fill="#451a03" />
          <rect x="10" y="12" width="10" height="8" fill="#fef3c7" rx="1" />
          <rect x="10" y="38" width="10" height="8" fill="#fef3c7" rx="1" />
       </g>

       {Array.from({ length: 12 }).map((_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const x = 20 + col * 42;
          const y = 65 + row * 34;
          const color = colors[i % colors.length];

          return (
             <g key={i} transform={`translate(${x}, ${y})`}>
                <rect x="2" y="2" width="34" height="26" fill="#78350f" opacity="0.2" rx="2" />
                <rect x="4" y="0" width="30" height="24" fill="#d97706" rx="2" />
                <rect x="6" y="2" width="26" height="20" fill={color} rx="1" />
                <rect x="6" y="2" width="26" height="5" fill="#ffffff" opacity="0.3" />
                <circle cx="19" cy="12" r="3" fill="#ffffff" opacity="0.5" />
             </g>
          );
       })}

       <g transform="translate(170, 40)" className="drop-shadow-lg">
          <circle cx="0" cy="0" r="16" fill="#ffffff" />
          <circle cx="0" cy="0" r="14" fill="#3b82f6" />
          <text x="0" y="5" fill="#ffffff" fontSize="12" textAnchor="middle" fontWeight="bold">🛒</text>
       </g>
     </svg>
   );
};

export const HotelBlock = ({ width = 200, height = 200 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 200 200" style={{ width: `${width}px`, height: `${height}px` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
    <path d="M 5 5 L 195 5 L 195 195 L 5 195 Z" fill="#84cc6d" stroke="#ffffff" strokeWidth="6" rx="2" />
    
    <rect x="5" y="145" width="55" height="40" fill="#475569" />
    <rect x="5" y="185" width="55" height="5" fill="#334155" />
    <g transform="translate(10, 150)">
       <rect x="0" y="0" width="12" height="24" fill="#0f172a" rx="2" />
       <rect x="2" y="4" width="8" height="6" fill="#1e293b" />
       
       <rect x="16" y="0" width="12" height="24" fill="#f8fafc" rx="2" />
       <rect x="18" y="4" width="8" height="6" fill="#cbd5e1" />
       
       <rect x="32" y="0" width="12" height="24" fill="#0f172a" rx="2" />
       <rect x="34" y="4" width="8" height="6" fill="#1e293b" />
    </g>

    <rect x="80" y="105" width="95" height="45" fill="#e2e8f0" />
    <rect x="90" y="112" width="75" height="30" fill="#22d3ee" />
    <rect x="90" y="112" width="75" height="4" fill="#67e8f9" opacity="0.5" />

    <g transform="translate(90, 160)">
       <circle cx="0" cy="0" r="8" fill="#ef4444" />
       <polygon points="0,-8 4,0 0,8 -4,0" fill="#dc2626" opacity="0.3" />
       
       <circle cx="22" cy="0" r="8" fill="#facc15" />
       <polygon points="22,-8 26,0 22,8 18,0" fill="#eab308" opacity="0.3" />
       
       <circle cx="44" cy="0" r="8" fill="#3b82f6" />
       <polygon points="44,-8 48,0 44,8 40,0" fill="#2563eb" opacity="0.3" />
    </g>

    <g transform="translate(60, 175) scale(0.8)">
       <polygon points="0,-15 12,-8 15,5 8,15 -8,15 -15,5 -12,-8" fill="#15803d" />
       <polygon points="-4,-12 4,-12 8,-2 4,8 -4,8 -8,-2" fill="#16a34a" />
    </g>
    <g transform="translate(180, 175) scale(0.8)">
       <polygon points="0,-15 12,-8 15,5 8,15 -8,15 -15,5 -12,-8" fill="#15803d" />
       <polygon points="-4,-12 4,-12 8,-2 4,8 -4,8 -8,-2" fill="#16a34a" />
    </g>

    <g transform="translate(10, 100)">
       <rect x="0" y="0" width="55" height="35" fill="#cbd5e1" opacity="0.5" rx="2" />
       <rect x="0" y="0" width="55" height="4" fill="#15803d" />
       <rect x="0" y="10" width="55" height="4" fill="#ffffff" />
       <rect x="0" y="20" width="55" height="4" fill="#15803d" />
       <rect x="0" y="30" width="55" height="4" fill="#ffffff" />
    </g>

    <g transform="translate(10, 20)">
       <rect x="0" y="15" width="45" height="60" fill="#64748b" />
       <rect x="0" y="15" width="45" height="5" fill="#1e293b" />
       <rect x="5" y="25" width="12" height="6" fill="#38bdf8" />
       <rect x="25" y="25" width="12" height="6" fill="#38bdf8" />
       <rect x="5" y="40" width="12" height="6" fill="#38bdf8" />
       <rect x="25" y="40" width="12" height="6" fill="#38bdf8" />
       <rect x="5" y="55" width="12" height="6" fill="#38bdf8" />
       <rect x="25" y="55" width="12" height="6" fill="#38bdf8" />
    </g>

    <g transform="translate(60, 10)">
       <rect x="0" y="10" width="45" height="80" fill="#94a3b8" />
       <rect x="0" y="10" width="45" height="8" fill="#334155" />
       <rect x="10" y="2" width="25" height="8" fill="#475569" />
       {[1,2,3,4,5,6].map(i => (
          <rect key={i} x="5" y={15 + i*10} width="35" height="4" fill="#0284c7" />
       ))}
    </g>

    <g transform="translate(110, 5)">
       <rect x="0" y="5" width="45" height="95" fill="#cbd5e1" />
       <rect x="0" y="5" width="45" height="6" fill="#1e293b" />
       <rect x="15" y="0" width="15" height="5" fill="#475569" />
       {[1,2,3,4,5,6,7].map(i => (
          <g key={i}>
            <rect x="6" y={10 + i*10} width="14" height="5" fill="#0284c7" />
            <rect x="25" y={10 + i*10} width="14" height="5" fill="#0284c7" />
          </g>
       ))}
    </g>

    <g transform="translate(100, 45)" className="drop-shadow-lg">
       <circle cx="0" cy="0" r="16" fill="#ffffff" />
       <circle cx="0" cy="0" r="14" fill="#f97316" />
       <text x="0" y="5" fill="#ffffff" fontSize="14" textAnchor="middle" fontWeight="bold">H</text>
    </g>
  </svg>
);

export const ApartmentComplexBlock = ({ width = 300, height = 250 }: { width?: number, height?: number }) => (
  <svg viewBox="0 0 300 250" style={{ width: `${width}px`, height: `${height}px` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
    <path d="M 5 5 L 295 5 L 295 245 L 5 245 Z" fill="#84cc6d" stroke="#ffffff" strokeWidth="6" rx="2" />
    
    <g transform="translate(100, 20)">
       <path d="M 0,20 Q -5,35 -10,45" stroke="#78350f" strokeWidth="4" fill="none" />
       <path d="M 0,20 Q -15,10 -20,20 Q -10,5 0,20" fill="#15803d" />
       <path d="M 0,20 Q 5,0 15,5 Q 5,10 0,20" fill="#15803d" />
       <path d="M 0,20 Q 20,15 25,25 Q 10,20 0,20" fill="#15803d" />
       <path d="M 0,20 Q -10,25 -15,35 Q -5,25 0,20" fill="#15803d" />
    </g>

    <rect x="250" y="80" width="45" height="60" fill="#38bdf8" />
    <rect x="5" y="125" width="290" height="15" fill="#cbd5e1" />
    <rect x="40" y="140" width="15" height="105" fill="#cbd5e1" />
    
    <g transform="translate(30, 20)">
       <rect x="0" y="0" width="35" height="105" fill="#94a3b8" />
       <rect x="0" y="95" width="35" height="10" fill="#1e293b" />
       <rect x="0" y="0" width="35" height="15" fill="#1e293b" />
       <rect x="5" y="3" width="8" height="4" fill="#64748b" />
       <rect x="22" y="3" width="8" height="4" fill="#64748b" />
       <rect x="5" y="9" width="8" height="4" fill="#64748b" />
       <rect x="22" y="9" width="8" height="4" fill="#64748b" />
       {[1,2,3,4,5,6,7].map(i => <rect key={i} x="5" y={15 + i*10} width="25" height="5" fill="#38bdf8" />)}
    </g>

    <g transform="translate(75, 45)">
       <rect x="0" y="15" width="45" height="65" fill="#60a5fa" />
       <polygon points="0,15 45,5 45,15" fill="#1d4ed8" />
       <rect x="0" y="15" width="45" height="5" fill="#1e293b" />
       <rect x="6" y="25" width="12" height="15" fill="#1e293b" />
       <rect x="24" y="25" width="15" height="15" fill="#1e293b" />
       <rect x="6" y="45" width="12" height="15" fill="#1e293b" />
       <rect x="24" y="45" width="15" height="15" fill="#1e293b" />
       <rect x="6" y="65" width="12" height="10" fill="#1e293b" />
       <rect x="24" y="65" width="15" height="10" fill="#1e293b" />
    </g>

    <g transform="translate(130, 45)">
       <rect x="0" y="0" width="45" height="80" fill="#4ade80" />
       <rect x="0" y="0" width="45" height="8" fill="#15803d" />
       {[1,2,3,4].map(i => (
          <g key={i}>
             <rect x="5" y={8 + i*15} width="14" height="8" fill="#f8fafc" />
             <rect x="24" y={8 + i*15} width="14" height="8" fill="#f8fafc" />
          </g>
       ))}
    </g>

    <g transform="translate(185, 30)">
       <rect x="0" y="0" width="55" height="95" fill="#475569" />
       <rect x="0" y="0" width="55" height="12" fill="#0f172a" />
       <rect x="8" y="4" width="10" height="4" fill="#94a3b8" />
       <rect x="35" y="4" width="10" height="4" fill="#94a3b8" />
       {[1,2,3,4,5].map(i => <rect key={i} x="6" y={15 + i*14} width="43" height="6" fill="#f8fafc" />)}
    </g>

    <ellipse cx="260" cy="50" rx="16" ry="12" fill="#15803d" />
    <ellipse cx="275" cy="65" rx="18" ry="14" fill="#16a34a" />

    <g transform="translate(180, 150)">
       <rect x="0" y="0" width="100" height="80" fill="#ea580c" rx="4" />
       <rect x="5" y="5" width="90" height="70" fill="#22c55e" />
       <rect x="49" y="5" width="2" height="70" fill="#ffffff" />
       <ellipse cx="50" cy="40" rx="14" ry="14" fill="none" stroke="#ffffff" strokeWidth="2" />
    </g>

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

    <g transform="translate(10, 160)">
       <rect x="15" y="70" width="10" height="15" fill="#3b82f6" />
       <rect x="50" y="70" width="10" height="15" fill="#3b82f6" />
       <rect x="15" y="65" width="45" height="5" fill="#10b981" />
       <rect x="0" y="0" width="25" height="50" fill="#475569" />
       <rect x="4" y="5" width="17" height="18" fill="#ffffff" rx="2" />
       <rect x="4" y="26" width="17" height="18" fill="#3b82f6" rx="2" />
    </g>

    <g transform="translate(150, 40)" className="drop-shadow-lg">
       <circle cx="0" cy="0" r="16" fill="#ffffff" />
       <circle cx="0" cy="0" r="14" fill="#0f172a" />
       <polygon points="0,-6 10,-1 0,4 -10,-1" fill="#ffffff" />
       <polygon points="-6,1 6,1 4,5 -4,5" fill="#ffffff" />
       <line x1="8" y1="0" x2="8" y2="6" stroke="#f59e0b" strokeWidth="1.5" />
       <circle cx="8" cy="6" r="1" fill="#f59e0b" />
    </g>
  </svg>
);

export const GiantBillboardBlock = ({ 
   width = 250, height = 200, 
   text1 = "yad", text2 = "sale", 
   color1 = "#064e3b", color2 = "#16a34a" 
}: any) => (
  <svg viewBox="0 0 200 180" style={{ width: `${width}px`, height: `${height}px` }} className="drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30">
     <polygon points="100,100 115,95 90,170 75,175" fill="#0f172a" />
     <polygon points="108,98 115,95 90,170 83,173" fill="#1e293b" />

     <g transform="translate(15, 35) rotate(-5) skewX(10)">
        <rect x="135" y="-12" width="25" height="12" fill="#ffffff" />
        <text x="147.5" y="-3" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">AD</text>
        <rect x="0" y="0" width="160" height="80" fill="#0f172a" rx="2" />
        <rect x="5" y="5" width="150" height="70" fill="#ffffff" />
        
        <g transform="translate(80, 48)">
           <text textAnchor="middle" fontSize="30" fontWeight="900" fontFamily="sans-serif" letterSpacing="-1">
              <tspan fill={color1}>{text1}</tspan>
              <tspan fill={color2}>{text2}</tspan>
           </text>
           <path d="M 12 8 Q 28 20 48 2" fill="none" stroke={color2} strokeWidth="4" strokeLinecap="round" />
        </g>

        <rect x="-2" y="80" width="164" height="6" fill="#1e293b" rx="1" />
        <rect x="-2" y="80" width="164" height="2" fill="#334155" />
        <rect x="20" y="80" width="8" height="4" fill="#fef3c7" />
        <rect x="76" y="80" width="8" height="4" fill="#fef3c7" />
        <rect x="132" y="80" width="8" height="4" fill="#fef3c7" />
     </g>
  </svg>
);

export const ConfigurableApartmentBlock = ({ 
  width = 300, 
  height = 250,
  hasPool = true,
  hasParking = true,
  hasCourt = true,
  numBuildings = 3,
  color = "#3b82f6",
  name = "Community",
  onUnitClick = undefined
}: any) => {
  return (
    <ApartmentComplexBlock width={width} height={height} />
  );
};

export const RoadPathBlock = ({ pathData, color = "#64748b", width = 20, isDashed = false }: any) => (
  <svg viewBox="0 0 4000 2600" width="100%" height="100%" className="absolute inset-0 pointer-events-none z-10">
    <path 
      d={pathData} 
      fill="none" 
      stroke={color} 
      strokeWidth={width} 
      strokeDasharray={isDashed ? "20 20" : undefined} 
      strokeLinecap="round" 
    />
  </svg>
);

export const BillboardSpace = ({ seed }: { seed: number }) => {
  const isRed = seed % 2 === 0;
  return (
    <svg viewBox="0 0 100 50" width="100%" height="100%" className="drop-shadow-lg">
      <rect x="0" y="0" width="100" height="50" fill="#334155" rx="4" />
      <rect x="2" y="2" width="96" height="46" fill={isRed ? "#ef4444" : "#3b82f6"} rx="2" />
      <text x="50" y="30" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">YOUR AD</text>
    </svg>
  );
};

export const getBuildingSprite = (id: string, type: string, seed?: number, title?: string, loc?: any, onUnitClick?: any) => {
  if (type === 'hotel') return <HotelBlock width={loc?.width} height={loc?.height} />;
  if (type === 'mall') return <MallBlock width={loc?.width} height={loc?.height} />;
  if (type === 'museum-future' || id === 'motf') return <MuseumOfFutureIcon />;
  if (type === 'apartment-complex') return <ApartmentComplexBlock width={loc?.width} height={loc?.height} />;
  if (type === 'configurable-apartment') return <ConfigurableApartmentBlock width={loc?.width} height={loc?.height} hasPool={loc?.hasPool} hasParking={loc?.hasParking} hasCourt={loc?.hasCourt} numBuildings={loc?.numBuildings} color={loc?.color} name={loc?.name} onUnitClick={onUnitClick} />;
  if (type === 'giant-billboard') return <GiantBillboardBlock width={loc?.width} height={loc?.height} text1={loc?.text1} text2={loc?.text2} color1={loc?.color1} color2={loc?.color2} />;
  if (type === 'marina') return <MarinaBlock name={title} width={loc?.width} height={loc?.height} />;
  if (type === 'road-path') return <RoadPathBlock pathData={loc?.pathData} color={loc?.color} width={loc?.width} isDashed={loc?.isDashed} />;
  if (type === 'bridge') return <BridgeBlock width={loc?.width} height={loc?.height} />;
  if (type === 'dynamic-community') return <DynamicCommunityBlock name={title} width={loc?.width} height={loc?.height} color={loc?.color} rows={loc?.rows} cols={loc?.cols} buildingType={loc?.buildingType} />;
  if (type === 'billboard') return <BillboardSpace seed={seed || 0} />;
  if (type === 'airport') return <AirportBlock />;
  if (type === 'community-emirates-hills') return <EmiratesHillsBlock />;
  if (type === 'community-jbr') return <JBRBlock />;
  if (type === 'community-bluewaters') return <BluewatersBlock />;
  if (type === 'community-ranches') return <ArabianRanchesBlock />;
  if (type === 'community-palm') return <PalmCommunityBlock />;
  if (type === 'community-motor-city') return <MotorCityBlock />;
  if (type === 'community-deira') return <DeiraBlock />;
  if (type === 'community-business-bay') return <BusinessBayBlock />;
  if (type === 'skyline' && seed !== undefined) return <SkylineTower seed={seed} />;
  if (type === 'salik') return <SalikGate />;
  if (type === 'road-sign' && title) return <RoadSign text={title} />;
  if (type === 'small-house') return <ClickableHouseNew />;
  if (type === 'apartment-building') return <ApartmentBuildingIconNew />;
  if (type === 'rooftop') return <RooftopIconNew />;
  if (type === 'club') return <NightclubIconNew />;
  if (type === 'beach-club') return <BeachClubIconNew />;
  if (type === 'restaurant') return <RestaurantIconNew />;
  if (type === 'stadium') return <StadiumIcon />;
  if (type === 'hospital') return <HospitalIcon />;
  if (type === 'school') return <SchoolIcon />;
  if (type === 'casino') return <CasinoIcon />;
  if (type === 'park') return <ParkIcon />;

  switch(id) {
    case 'burj-khalifa': return <BurjKhalifaIcon />;
    case 'burj-al-arab': return <BurjAlArabIcon />;
    case 'jbh': return <JumeirahBeachHotelIcon />;
    case 'beach-club': return <BeachClubIconNew />;
    case 'bulgari': return <BulgariIslandIcon />;
    case 'atlantis-royal': return <AtlantisTheRoyalIcon />;
    case 'motf': return <MuseumOfFutureIcon />;
    case 'dubai-frame': return <DubaiFrameIcon />;
    case 'atlantis': return <AtlantisIcon />;
    case 'emirates-towers': return <EmiratesTowersIcon />;
    case 'gevora': return <GevoraIcon />;
    case 'rose-rayhaan': return <RoseRayhaanIcon />;
    case 'dwtc': return <DWTCIcon />;
  }
  return <GenericNeighborhood name={title || "District"} seed={seed || 0} />;
};
`;

fs.writeFileSync('src/components/map/Icons.tsx', fileContent);
console.log("Successfully restored all authentic 24-hour-ago SVGs into src/components/map/Icons.tsx!");
