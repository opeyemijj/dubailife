const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Remove mega yachts from the animated generator so they don't double up
const oldBoatsGen = /const isMegaYacht = i < 2;/;
const newBoatsGen = `const isMegaYacht = false; // Turned off animated mega yachts, making them static`;
code = code.replace(oldBoatsGen, newBoatsGen);

// 2. Add static Mega Yachts near Burj Al Arab (X=1100, Y=1530)
const staticYachts = `
                {/* Static Mega Yachts Anchored near Burj Al Arab */}
                <g transform="translate(900, 1580) rotate(-15) scale(2)">
                  <path d="M -30 -10 L 25 -10 L 45 0 L 25 10 L -30 10 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" className="drop-shadow-2xl" />
                  <rect x="-20" y="-7" width="35" height="14" fill="#f1f5f9" rx="2" />
                  <rect x="-10" y="-5" width="20" height="10" fill="#e2e8f0" rx="1" />
                  <rect x="0" y="-3" width="8" height="6" fill="#0284c7" opacity="0.6" />
                  <circle cx="-15" cy="0" r="4" fill="#22c55e" stroke="#ffffff" strokeWidth="1" />
                  <text x="-15" y="1.2" fill="#ffffff" fontSize="3" fontWeight="bold" textAnchor="middle" transform="scale(1, -1)">H</text>
                  <path d="M -30 -10 L -60 -15" stroke="#bae6fd" strokeWidth="1.5" fill="none" opacity="0.6" />
                  <path d="M -30 10 L -60 15" stroke="#bae6fd" strokeWidth="1.5" fill="none" opacity="0.6" />
                </g>

                <g transform="translate(1250, 1500) rotate(165) scale(2.5)">
                  <path d="M -30 -10 L 25 -10 L 45 0 L 25 10 L -30 10 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" className="drop-shadow-2xl" />
                  <rect x="-20" y="-7" width="35" height="14" fill="#f8fafc" rx="2" />
                  <rect x="-10" y="-5" width="20" height="10" fill="#cbd5e1" rx="1" />
                  <rect x="0" y="-3" width="8" height="6" fill="#0369a1" opacity="0.6" />
                  <circle cx="-15" cy="0" r="4" fill="#22c55e" stroke="#ffffff" strokeWidth="1" />
                  {/* Since it's rotated 165, flip text so it reads upright */}
                  <text x="-15" y="-1.2" fill="#ffffff" fontSize="3" fontWeight="bold" textAnchor="middle" transform="scale(-1, 1)">H</text>
                  <path d="M -30 -10 L -60 -15" stroke="#bae6fd" strokeWidth="1.5" fill="none" opacity="0.6" />
                  <path d="M -30 10 L -60 15" stroke="#bae6fd" strokeWidth="1.5" fill="none" opacity="0.6" />
                </g>

                {/* Marine Traffic */}`;

code = code.replace(/\{\/\* Marine Traffic \*\/\}/, staticYachts);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Added static mega yachts");
