import React from 'react';

export interface MuseumOfFutureProps {
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const MuseumOfFutureIcon: React.FC<MuseumOfFutureProps> = ({
  width = 150,
  height = 110,
  className = "drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform origin-bottom z-30",
  onClick,
  style
}) => {
  return (
    <svg 
      viewBox="0 0 220 160" 
      style={{ width: `${width}px`, height: `${height}px`, ...style }} 
      className={className}
      onClick={onClick}
    >
      <defs>
        {/* Volumetric Round Stainless Steel Gradient */}
        <radialGradient id="motf-round-metal" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="75%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </radialGradient>

        {/* Outer Torus Rim Shading */}
        <linearGradient id="motf-body-rim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#334155" stopOpacity="0.8" />
        </linearGradient>

        {/* Void Inner Tunnel Depth */}
        <linearGradient id="motf-inner-tunnel" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="35%" stopColor="#475569" />
          <stop offset="70%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Soft Radial Base Shadow */}
        <radialGradient id="motf-soft-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#0f172a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground Soft Oval Shadow */}
      <ellipse cx="112" cy="150" rx="85" ry="8" fill="url(#motf-soft-shadow)" />

      {/* Ground Base Mound / Plinth */}
      <ellipse cx="112" cy="144" rx="55" ry="5" fill="#94a3b8" opacity="0.6" />

      {/* Inner Void Ceiling (visible through the aperture) */}
      <path 
        d="
          M 82 82 
          C 90 56, 126 48, 156 50 
          C 176 52, 188 66, 188 80 
          C 176 68, 148 60, 124 62 
          C 98 64, 86 75, 82 82 Z
        " 
        fill="url(#motf-inner-tunnel)" 
      />
      {/* Interior Rib Lines */}
      <path d="M 120 62 C 122 68, 124 74, 126 80" stroke="#64748b" strokeWidth="0.8" opacity="0.5" fill="none" />
      <path d="M 145 56 C 147 64, 150 72, 152 78" stroke="#64748b" strokeWidth="0.8" opacity="0.5" fill="none" />
      <path d="M 168 54 C 170 62, 172 70, 174 76" stroke="#64748b" strokeWidth="0.8" opacity="0.5" fill="none" />

      {/* MAIN ROUND TORUS BODY (Asymmetrical round toroid with smooth organic curves) */}
      <path 
        d="
          M 105 18 
          C 160 18, 206 44, 206 82 
          C 206 118, 166 142, 112 142 
          C 58 142, 18 116, 18 78 
          C 18 42, 54 18, 105 18 Z 
          M 82 82 
          C 92 60, 125 52, 154 55 
          C 178 58, 188 70, 188 80 
          C 188 92, 172 104, 148 106 
          C 120 108, 92 98, 82 82 Z
        " 
        fill="url(#motf-round-metal)" 
        fillRule="evenodd" 
        stroke="url(#motf-body-rim)" 
        strokeWidth="1.5" 
      />

      {/* Round Top Reflection Glint */}
      <path 
        d="M 38 42 C 58 24, 85 18, 112 18 C 145 18, 182 28, 198 48" 
        fill="none" 
        stroke="#ffffff" 
        strokeWidth="2.2" 
        strokeLinecap="round" 
        opacity="0.85" 
      />

      {/* Rounded Underbelly Shadow Accent */}
      <path 
        d="M 32 104 C 52 130, 85 142, 115 142 C 148 142, 180 130, 198 106" 
        fill="none" 
        stroke="#334155" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        opacity="0.35" 
      />

      {/* Inner Void Soft Highlight Rim */}
      <path 
        d="M 82 82 C 92 60, 125 52, 154 55 C 178 58, 188 70, 188 80" 
        fill="none" 
        stroke="#ffffff" 
        strokeWidth="1.2" 
        opacity="0.75" 
      />

      {/* ========================================================= */}
      {/* CLEAN, ELEGANT ARABIC CALLIGRAPHY (Spaced out & Authentic) */}
      {/* ========================================================= */}
      <g fill="#0f172a" stroke="#0f172a" strokeLinecap="round" strokeLinejoin="round">
        
        {/* --- 1. LEFT FLANK (Spacious, elegant Arabic phrases) --- */}
        
        {/* Phrase: المستقبل (Al Mustaqbal = The Future) */}
        {/* Tall vertical Alef and Lam */}
        <path d="M 38 68 Q 36 50 40 38" strokeWidth="2.2" fill="none" />
        <path d="M 44 70 Q 42 50 48 38" strokeWidth="2.2" fill="none" />
        {/* Meem loop, Seen teeth, Ta, Qaf, Ba, Lam */}
        <ellipse cx="52" cy="56" rx="3.5" ry="2.2" fill="#0f172a" />
        <path d="M 48 58 Q 54 55 58 58 Q 62 55 66 58" strokeWidth="2" fill="none" />
        <path d="M 66 58 Q 72 56 76 60" strokeWidth="2" fill="none" />
        {/* Qaf loop and dots */}
        <circle cx="72" cy="53" r="2.5" fill="#0f172a" />
        <circle cx="70" cy="48" r="1.3" />
        <circle cx="74" cy="48" r="1.3" />
        {/* Sweeping final Lam tail */}
        <path d="M 76 60 Q 82 62 82 68 Q 80 74 72 74" strokeWidth="2" fill="none" />

        {/* Phrase: الأمل (Al-Amal = Hope) */}
        {/* Alef-Lam with high Diwani slant */}
        <path d="M 32 88 Q 30 76 34 66" strokeWidth="2" fill="none" />
        <path d="M 38 90 Q 36 78 42 66" strokeWidth="2" fill="none" />
        {/* Hamza above Alef */}
        <path d="M 35 63 Q 37 60 39 63 L 36 65" strokeWidth="1.2" fill="none" />
        {/* Meem and Lam graceful ligature */}
        <ellipse cx="46" cy="80" rx="3" ry="2" fill="#0f172a" />
        <path d="M 44 82 Q 54 80 60 84 Q 64 88 58 92" strokeWidth="2" fill="none" />

        {/* Phrase: دبي والإمارات (Dubai & UAE) - Lower Left */}
        {/* Dal, Ba, Ya curve */}
        <path d="M 36 108 Q 42 100 48 108" strokeWidth="2.2" fill="none" />
        <circle cx="48" cy="113" r="1.4" />
        {/* Waw loop */}
        <ellipse cx="56" cy="106" rx="2.8" ry="2" fill="#0f172a" />
        <path d="M 58 107 Q 56 114 52 118" strokeWidth="1.8" fill="none" />
        {/* Alef and Lam for Al-Emarat */}
        <path d="M 64 116 Q 62 104 66 94" strokeWidth="1.8" fill="none" />
        <path d="M 70 116 Q 68 104 72 94" strokeWidth="1.8" fill="none" />
        {/* Meem and Ta Marbuta */}
        <path d="M 70 114 Q 80 112 86 116" strokeWidth="1.8" fill="none" />

        {/* Traditional Nuqtas (Calligraphic accent dots) */}
        <circle cx="44" cy="34" r="1.4" />
        <circle cx="56" cy="46" r="1.4" />
        <circle cx="62" cy="72" r="1.4" />
        <circle cx="76" cy="82" r="1.4" />

        {/* --- 2. TOP CREST (Above the Void, x=95 to x=175) --- */}
        {/* Clean flowing Kasheeda with upright Alifs */}
        <path d="M 98 42 Q 102 32 106 24" strokeWidth="1.8" fill="none" />
        <path d="M 112 42 Q 116 30 122 22" strokeWidth="1.8" fill="none" />
        <path d="M 128 42 Q 132 30 138 22" strokeWidth="1.8" fill="none" />
        <path d="M 144 43 Q 148 32 154 24" strokeWidth="1.8" fill="none" />
        {/* Smooth horizontal arch ligature */}
        <path d="M 94 38 Q 125 28 160 32 Q 172 35 180 42" strokeWidth="2.2" fill="none" />
        {/* Dot accents */}
        <circle cx="118" cy="36" r="1.3" />
        <circle cx="134" cy="35" r="1.3" />
        <circle cx="150" cy="37" r="1.3" />
        <circle cx="166" cy="39" r="1.3" />

        {/* --- 3. BOTTOM SILL (Below the Void, x=85 to x=175) --- */}
        {/* Elegant horizontal baseline ligature */}
        <path d="M 86 122 Q 120 126 155 125 Q 172 122 182 116" strokeWidth="2.4" fill="none" />
        {/* Vertical strokes and teeth */}
        <path d="M 98 116 L 96 124" strokeWidth="1.8" fill="none" />
        <path d="M 116 116 L 114 125" strokeWidth="1.8" fill="none" />
        <path d="M 134 116 L 132 125" strokeWidth="1.8" fill="none" />
        <path d="M 152 116 L 150 124" strokeWidth="1.8" fill="none" />
        {/* Letter loops and dots */}
        <ellipse cx="106" cy="120" rx="3.5" ry="2" fill="#0f172a" />
        <ellipse cx="142" cy="119" rx="3.5" ry="2" fill="#0f172a" />
        <circle cx="106" cy="128" r="1.3" />
        <circle cx="125" cy="128" r="1.3" />
        <circle cx="144" cy="127" r="1.3" />

        {/* --- 4. RIGHT FLANK (Wrapping the eye apex, x=178 to x=202) --- */}
        {/* Single graceful curved Arabic ligature hugging the outer edge */}
        <path d="M 184 50 Q 198 58 202 72 Q 204 84 196 96 Q 190 104 180 110" strokeWidth="2" fill="none" />
        <circle cx="198" cy="62" r="1.3" />
        <circle cx="202" cy="80" r="1.3" />
        <circle cx="192" cy="100" r="1.3" />
      </g>
    </svg>
  );
};

export const MuseumOfTheFutureComponent = MuseumOfFutureIcon;
export default MuseumOfFutureIcon;
