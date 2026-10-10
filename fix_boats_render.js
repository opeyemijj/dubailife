const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /\{cars\.map/;

const boatsRenderCode = `
                {/* Marine Traffic */}
                {boats.map(boat => (
                  <g key={\`boat-\${boat.id}\`}>
                    <animateMotion dur={\`\${boat.duration}s\`} begin={\`\${boat.delay}s\`} repeatCount="indefinite" rotate="auto">
                      <mpath href={boat.path} />
                    </animateMotion>
                    <g transform={\`translate(0, \${boat.offset})\`}>
                      {boat.type === 'yacht' ? (
                        <g>
                          <path d="M -15 -6 L 10 -6 L 22 0 L 10 6 L -15 6 Z" fill={boat.color} className="drop-shadow-md" />
                          <rect x="-5" y="-3" width="12" height="6" fill="#cbd5e1" rx="1" />
                          <rect x="0" y="-2" width="5" height="4" fill="#0ea5e9" opacity="0.6" />
                          <path d="M -15 -6 L -35 -12 M -15 6 L -35 12" stroke="#bae6fd" strokeWidth="2" fill="none" opacity="0.5" />
                          <path d="M -15 0 L -40 0" stroke="#bae6fd" strokeWidth="3" fill="none" opacity="0.3" />
                        </g>
                      ) : (
                        <g>
                          <ellipse cx="0" cy="0" rx="5" ry="2.5" fill={boat.color} className="drop-shadow-sm" />
                          <circle cx="1" cy="0" r="1.5" fill="#0f172a" opacity="0.7" />
                          <path d="M -5 -2 L -15 -5 M -5 2 L -15 5" stroke="#e0f2fe" strokeWidth="1" fill="none" opacity="0.6" />
                          <path d="M -5 0 L -20 0" stroke="#e0f2fe" strokeWidth="1.5" fill="none" opacity="0.4" />
                        </g>
                      )}
                    </g>
                  </g>
                ))}

                {cars.map`;

code = code.replace(regex, boatsRenderCode);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed boats render");
