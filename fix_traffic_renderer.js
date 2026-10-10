const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /\{cars\.map\(car => \([\s\S]*?<\/rect>\n\s*\)\)\}/;
const newRenderer = `
                {cars.map(car => {
                  let Vehicle;
                  if (car.type === 'taxi') {
                     Vehicle = (
                     <g>
                        <rect x="-7" y="-3.5" width="14" height="7" rx="2" fill="#fef3c7" />
                        <rect x="2" y="-3.5" width="4" height="7" fill={car.color} />
                        <rect x="-4" y="-2.5" width="3" height="5" fill="#0f172a" opacity="0.6" />
                        <rect x="3" y="-2.5" width="2" height="5" fill="#0f172a" opacity="0.6" />
                     </g>
                     );
                  } else if (car.type === 'bus') {
                     Vehicle = (
                     <g>
                        <rect x="-16" y="-4.5" width="32" height="9" rx="2" fill="#ef4444" />
                        <rect x="-16" y="-1" width="32" height="2" fill="#ffffff" />
                        <rect x="10" y="-3.5" width="4" height="7" fill="#0f172a" opacity="0.8" />
                     </g>
                     );
                  } else if (car.type === 'scooter') {
                     Vehicle = <circle cx="0" cy="0" r="2.5" fill={car.color} />;
                  } else if (car.type === 'suv') {
                     Vehicle = (
                     <g>
                        <rect x="-8" y="-4" width="16" height="8" rx="2.5" fill={car.color} stroke="#cbd5e1" strokeWidth="1" />
                        <rect x="-3" y="-3" width="8" height="6" fill="#0f172a" opacity="0.5" />
                     </g>
                     );
                  } else {
                     Vehicle = (
                     <g>
                        <rect x="-7" y="-3" width="14" height="6" rx="2" fill={car.color} />
                        <rect x="-2" y="-2" width="6" height="4" fill="#0f172a" opacity="0.5" />
                     </g>
                     );
                  }
                  
                  return (
                    <g key={car.id}>
                      <animateMotion 
                        dur={\`\${car.duration}s\`} 
                        begin={\`\${car.delay}s\`} 
                        repeatCount="indefinite" 
                        rotate="auto"
                      >
                        <mpath href={car.path} />
                      </animateMotion>
                      <g transform={\`translate(0, \${car.laneOffset})\`}>
                        {Vehicle}
                      </g>
                    </g>
                  );
                })}`;

code = code.replace(regex, newRenderer);
fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Successfully replaced car renderer.");
