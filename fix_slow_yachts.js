const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /\{\/\* Static Mega Yachts Anchored near Burj Al Arab \*\/\}[\s\S]*?\{\/\* Marine Traffic \*\/\}/;

const animatedMegaYachts = `
                {/* Slow Luxury Cruise Paths near Burj Al Arab */}
                <path id="mega-cruise-1" d="M 700 1600 C 700 1500, 1000 1500, 1000 1600 C 1000 1700, 700 1700, 700 1600 Z" fill="none" />
                <path id="mega-cruise-2" d="M 1200 1500 C 1200 1350, 1600 1350, 1600 1500 C 1600 1650, 1200 1650, 1200 1500 Z" fill="none" />

                {/* Animated Slow Mega Yachts */}
                <g>
                  <animateMotion dur="120s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#mega-cruise-1" />
                  </animateMotion>
                  <g transform="scale(2)">
                    <path d="M -30 -10 L 25 -10 L 45 0 L 25 10 L -30 10 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" className="drop-shadow-2xl" />
                    <rect x="-20" y="-7" width="35" height="14" fill="#f1f5f9" rx="2" />
                    <rect x="-10" y="-5" width="20" height="10" fill="#e2e8f0" rx="1" />
                    <rect x="0" y="-3" width="8" height="6" fill="#0284c7" opacity="0.6" />
                    <circle cx="-15" cy="0" r="4" fill="#22c55e" stroke="#ffffff" strokeWidth="1" />
                    <text x="-15" y="1.2" fill="#ffffff" fontSize="3" fontWeight="bold" textAnchor="middle" transform="scale(1, -1)">H</text>
                    <path d="M -30 -10 L -60 -15" stroke="#bae6fd" strokeWidth="1.5" fill="none" opacity="0.6" />
                    <path d="M -30 10 L -60 15" stroke="#bae6fd" strokeWidth="1.5" fill="none" opacity="0.6" />
                  </g>
                </g>

                <g>
                  <animateMotion dur="180s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#mega-cruise-2" />
                  </animateMotion>
                  <g transform="scale(2.5)">
                    <path d="M -30 -10 L 25 -10 L 45 0 L 25 10 L -30 10 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" className="drop-shadow-2xl" />
                    <rect x="-20" y="-7" width="35" height="14" fill="#f8fafc" rx="2" />
                    <rect x="-10" y="-5" width="20" height="10" fill="#cbd5e1" rx="1" />
                    <rect x="0" y="-3" width="8" height="6" fill="#0369a1" opacity="0.6" />
                    <circle cx="-15" cy="0" r="4" fill="#22c55e" stroke="#ffffff" strokeWidth="1" />
                    <text x="-15" y="1.2" fill="#ffffff" fontSize="3" fontWeight="bold" textAnchor="middle" transform="scale(1, -1)">H</text>
                    <path d="M -30 -10 L -60 -15" stroke="#bae6fd" strokeWidth="1.5" fill="none" opacity="0.6" />
                    <path d="M -30 10 L -60 15" stroke="#bae6fd" strokeWidth="1.5" fill="none" opacity="0.6" />
                  </g>
                </g>

                {/* Marine Traffic */}`;

code = code.replace(regex, animatedMegaYachts);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Made mega yachts move slowly");
