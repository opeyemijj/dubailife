// Map sprites for the race days (lib/city/racing.ts): Meydan Racecourse (the turf oval, the crescent grandstand with
// its white roof and gold trim, horses on the home straight) and the Al Marmoom camel racetrack (a sand oval, a
// shaded stand, camels running with the owners' 4x4s on the road alongside).

import React from 'react';

const label = 'drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom select-none';

export const MeydanSprite: React.FC<{ width?: number; height?: number; name?: string }> = ({ width = 380, height = 190, name = 'Meydan Racecourse' }) => (
  <svg viewBox="0 0 380 190" preserveAspectRatio="none" style={{ width, height }} className={label} aria-label={name}>
    <defs>
      <linearGradient id="mey-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#cbd5e1" /></linearGradient>
      <linearGradient id="mey-turf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4d8b31" /><stop offset="100%" stopColor="#3a7024" /></linearGradient>
    </defs>
    <ellipse cx="190" cy="182" rx="186" ry="8" fill="#000" opacity="0.18" />
    {/* The oval: dirt outside, turf inside, the infield lake. */}
    <ellipse cx="190" cy="128" rx="182" ry="52" fill="#8a6a4b" />
    <ellipse cx="190" cy="128" rx="170" ry="45" fill="url(#mey-turf)" />
    <ellipse cx="190" cy="128" rx="140" ry="30" fill="#6aa84f" />
    {Array.from({ length: 9 }, (_, i) => <rect key={i} x={60 + i * 30} y="100" width="14" height="56" fill="#ffffff" opacity="0.05" />)}
    <ellipse cx="200" cy="130" rx="40" ry="9" fill="#38bdf8" opacity="0.85" />
    <ellipse cx="190" cy="128" rx="170" ry="45" fill="none" stroke="#ffffff" strokeWidth="1.2" />
    <ellipse cx="190" cy="128" rx="140" ry="30" fill="none" stroke="#ffffff" strokeWidth="1" />
    {/* The crescent grandstand behind the home straight. */}
    <rect x="30" y="58" width="320" height="30" fill="#e5e7eb" />
    {Array.from({ length: 3 }, (_, i) => <rect key={i} x="34" y={62 + i * 8} width="312" height="4" fill={['#f43f5e', '#facc15', '#38bdf8'][i]} opacity="0.55" />)}
    <rect x="30" y="54" width="320" height="6" fill="#1e3a5f" />
    <path d="M14,58 Q190,-8 366,58 L360,62 Q190,4 20,62 Z" fill="url(#mey-roof)" stroke="#94a3b8" strokeWidth="0.8" />
    <path d="M20,62 Q190,4 360,62" fill="none" stroke="#d4af37" strokeWidth="2.2" />
    {Array.from({ length: 11 }, (_, i) => <line key={i} x1={44 + i * 29} y1={44 - Math.sin((i / 10) * Math.PI) * 26} x2={44 + i * 29} y2="58" stroke="#94a3b8" strokeWidth="1" />)}
    <rect x="140" y="64" width="100" height="14" rx="2" fill="#0f3b2e" />
    <text x="190" y="74.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#d4af37" fontFamily="system-ui, sans-serif" letterSpacing="2">MEYDAN</text>
    {/* Horses and jockeys on the home straight. */}
    {[0, 1, 2, 3].map((i) => (
      <g key={i} transform={`translate(${120 + i * 26 - (i % 2) * 6}, ${92 + (i % 2) * 4})`}>
        <ellipse cx="0" cy="0" rx="7" ry="3" fill={['#5b3018', '#9a4a1c', '#bdbab2', '#1c1714'][i]} />
        <path d="M5,-1 L10,-6 L11,-4 L7,1 Z" fill={['#5b3018', '#9a4a1c', '#bdbab2', '#1c1714'][i]} />
        <line x1="-5" y1="2" x2="-8" y2="7" stroke="#2b1a0e" strokeWidth="1.3" /><line x1="4" y1="2" x2="7" y2="7" stroke="#2b1a0e" strokeWidth="1.3" />
        <circle cx="1" cy="-5" r="2.4" fill={['#dc2626', '#2563eb', '#facc15', '#16a34a'][i]} />
      </g>
    ))}
    <rect x="42" y="118" width="2" height="20" fill="#fff" /><circle cx="43" cy="117" r="3.5" fill="#dc2626" stroke="#fff" />
  </svg>
);

export const CamelTrackSprite: React.FC<{ width?: number; height?: number; name?: string }> = ({ width = 380, height = 190, name = 'Al Marmoom Camel Racetrack' }) => (
  <svg viewBox="0 0 380 190" preserveAspectRatio="none" style={{ width, height }} className={label} aria-label={name}>
    <ellipse cx="190" cy="182" rx="186" ry="8" fill="#000" opacity="0.16" />
    {/* Dunes behind. */}
    <path d="M0,70 Q60,30 120,62 Q180,24 250,60 Q310,30 380,66 L380,90 L0,90 Z" fill="#e2c590" />
    <path d="M0,80 Q80,52 160,78 Q240,50 380,80 L380,96 L0,96 Z" fill="#d4ae6c" />
    {/* The 4x4 road, the sand oval and its white rails. */}
    <ellipse cx="190" cy="132" rx="184" ry="52" fill="#52525b" />
    <ellipse cx="190" cy="132" rx="172" ry="45" fill="#d9b37a" />
    <ellipse cx="190" cy="132" rx="140" ry="29" fill="#e8cf9f" />
    <ellipse cx="190" cy="132" rx="172" ry="45" fill="none" stroke="#ffffff" strokeWidth="1.2" />
    <ellipse cx="190" cy="132" rx="140" ry="29" fill="none" stroke="#ffffff" strokeWidth="1" />
    {/* The shaded stand. */}
    <rect x="110" y="70" width="160" height="22" fill="#e7e5e4" />
    {Array.from({ length: 3 }, (_, i) => <rect key={i} x="114" y={74 + i * 6} width="152" height="3" fill={['#f8fafc', '#fde68a', '#f8fafc'][i]} opacity="0.7" />)}
    <polygon points="100,70 280,70 272,60 108,60" fill="#b45309" />
    {[115, 150, 190, 230, 265].map((x) => <rect key={x} x={x} y="68" width="2" height="24" fill="#a8a29e" />)}
    <rect x="148" y="78" width="84" height="12" rx="2" fill="#7c2d12" />
    <text x="190" y="87.2" textAnchor="middle" fontSize="8" fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif" letterSpacing="1.4">AL MARMOOM</text>
    {/* Camels with their robot jockeys, and the 4x4s alongside. */}
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(${130 + i * 40}, ${100 + (i % 2) * 5})`}>
        <path d="M-9,0 Q-6,-9 0,-7 Q4,-11 7,-5 L12,-12 L14,-11 L10,-2 Q4,2 -9,0 Z" fill={['#c9a066', '#e3cfa2', '#3a2a1e'][i]} />
        <line x1="-6" y1="0" x2="-8" y2="8" stroke="#6b4a2f" strokeWidth="1.2" /><line x1="5" y1="0" x2="7" y2="8" stroke="#6b4a2f" strokeWidth="1.2" />
        <rect x="-4" y="-13" width="3" height="5" fill={['#dc2626', '#2563eb', '#16a34a'][i]} />
      </g>
    ))}
    {[0, 1].map((i) => (
      <g key={`c${i}`} transform={`translate(${170 + i * 46}, 178)`}>
        <rect x="-8" y="-4" width="16" height="6" rx="1.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.6" />
        <rect x="-5" y="-7" width="9" height="4" rx="1" fill="#e2e8f0" />
        <circle cx="-5" cy="2.5" r="1.8" fill="#111827" /><circle cx="5" cy="2.5" r="1.8" fill="#111827" />
      </g>
    ))}
  </svg>
);
