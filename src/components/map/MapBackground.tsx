import React, { useMemo } from 'react';
import { WORLD_WIDTH, WORLD_HEIGHT } from './Icons';

export const MapBackground = () => {
  const boats = useMemo(() => {
    const arr = [];
    const yachtColors = ['#ffffff', '#f8fafc', '#e2e8f0'];
    const jetskiColors = ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
    
    for (let i = 0; i < 40; i++) {
      const isMegaYacht = false;
      const isYacht = i >= 2 && i < 15;
      const isBoat = isMegaYacht || isYacht;
      
      const prng = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      
      let pathId = '';
      if (isMegaYacht) {
        pathId = i === 0 ? '#route-mega-1' : '#route-mega-2';
      } else if (isYacht) {
        const routes = ['#route-yacht-1', '#route-yacht-2', '#route-yacht-3', '#route-yacht-4'];
        pathId = routes[i % routes.length];
      } else {
        const routes = ['#route-jetski-1', '#route-jetski-2', '#route-jetski-3', '#route-jetski-4', '#route-jetski-5'];
        pathId = routes[i % routes.length];
      }
      
      arr.push({
        id: i,
        type: isMegaYacht ? 'mega-yacht' : (isYacht ? 'yacht' : 'jetski'),
        color: isBoat ? yachtColors[Math.floor(prng * yachtColors.length)] : jetskiColors[Math.floor(prng * jetskiColors.length)],
        duration: isMegaYacht ? 90 : (prng * (isYacht ? 100 : 40) + (isYacht ? 80 : 30)),
        delay: isMegaYacht ? -(i * 45) : -(prng * 200),
        offset: isMegaYacht ? (prng2 - 0.5) * 40 : (prng2 - 0.5) * 160,
        path: pathId
      });
    }
    return arr;
  }, []);

  const cars = useMemo(() => {
    const arr = [];
    const types = ['taxi', 'bus', 'scooter', 'suv', 'sedan'];
    const taxiColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
    const carColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ec4899', '#ffffff', '#cbd5e1', '#8b5cf6'];
    
    for (let i=0; i<60; i++) {
      const isReverse = i % 2 === 0;
      const road = i % 4; 
      
      const prng1 = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      const prng3 = (((i+2) * 9301 + 49297) % 233280) / 233280;
      
      const type = types[Math.floor(prng1 * types.length)];
      
      const isE11 = road <= 1;
      const laneIndex = isE11 ? Math.floor(prng2 * 3) : Math.floor(prng2 * 2);
      
      const laneOffset = isE11 ? (8 + laneIndex * 9) : (7 + laneIndex * 8);
      
      arr.push({
        id: i,
        type,
        color: type === 'taxi' ? taxiColors[Math.floor(prng3 * taxiColors.length)] : carColors[Math.floor(prng3 * carColors.length)],
        duration: prng2 * (type === 'bus' ? 40 : type === 'scooter' ? 50 : 25) + 20, 
        delay: -(prng1 * 100),
        laneOffset,
        path: isE11 ? (isReverse ? '#e11-left' : '#e11-right') : (isReverse ? '#jum-left' : '#jum-right')
      });
    }
    return arr;
  }, []);

  return (

  <svg width={WORLD_WIDTH} height={WORLD_HEIGHT} className="absolute inset-0 pointer-events-none overflow-visible">
              <g transform={`translate(0, 2600) scale(1, -1)`}>
                
                
                {/* Original Ocean Color (End-to-End matching road length) */}
                <path d="M -200,1560 Q 2000,1750 4200,1050 L 4200,2600 L -200,2600 Z" fill="#60BAEB" />

                {/* Thick Beach Sand Edge */}
                <path d="M -200 1560 Q 2000 1750 4200 1050" fill="none" stroke="#fde047" strokeWidth="25" />
                                
                {/* Ocean Edge Glow */}
                <path d="M -200,1580 Q 2000,1770 4200,1070" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" />
                
                
                
                
                
                
                
                
                
                
                

                <path d="M 450 1315 L 350 1600" fill="none" stroke="#64748b" strokeWidth="8" />
                <path d="M 450 1315 L 350 1600" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" />
                
                


                <path d="M 750 1278 L 750 1770" fill="none" stroke="#cbd5e1" strokeWidth="12" />
                <path d="M 750 1278 L 750 1770" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 6" />
                
                {/* Jumeirah Coast Road - STRAIGHT, END-TO-END (-200 to 4200) */}
                <path d="M -200 1396 L 4200 846" fill="none" stroke="#64748b" strokeWidth="40" strokeLinecap="round" />
                <path d="M -200 1396 L 4200 846" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 8" />
                
                <path id="jum-right" d="M -200 1396 L 4200 846" fill="none" />
                <path id="jum-left" d="M 4200 846 L -200 1396" fill="none" />

                {/* E11 Base Highway (Sheikh Zayed Road) - STRAIGHT, END-TO-END (-200 to 4200) */}
                <path d="M -200 1196 L 4200 646" fill="none" stroke="#334155" strokeWidth="60" />
                <path d="M -200 1196 L 4200 646" fill="none" stroke="#facc15" strokeWidth="2" />
                <path d="M -200 1196 L 4200 646" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 12.5)" />
                <path d="M -200 1196 L 4200 646" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 21.5)" />
                <path d="M -200 1196 L 4200 646" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -12.5)" />
                <path d="M -200 1196 L 4200 646" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -21.5)" />
                
                <path id="e11-right" d="M -200 1196 L 4200 646" fill="none" stroke="transparent" />
                <path id="e11-left" d="M 4200 646 L -200 1196" fill="none" stroke="transparent" />

                <path d="M -200 1196 L 4200 646" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="10 10" transform="translate(0, -28)" />
                <path d="M -200 1196 L 4200 646" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="10 10" transform="translate(0, 28)" />
                
                {/* Marine Routes (Hidden paths for animation) */}
                {/* Mega Yacht Routes near Burj Al Arab (X=1100, Y=1530) */}
                <path id="route-mega-1" d="M -200 1880 C 500 1780, 1100 1660, 2000 1830" fill="none" />
                <path id="route-mega-2" d="M 2200 1780 C 2000 1630, 800 1830, -200 1930" fill="none" />
                
                {/* Scattered Yacht Routes */}
                <path id="route-yacht-1" d="M -100 2000 C 600 2300, 1200 1800, 2400 2100" fill="none" />
                <path id="route-yacht-2" d="M 2600 2300 C 1800 1900, 900 2500, -100 2100" fill="none" />
                <path id="route-yacht-3" d="M 300 2600 Q 1200 1950 2000 2600" fill="none" />
                <path id="route-yacht-4" d="M 3100 1950 Q 1500 2450 -100 1950" fill="none" />
                
                {/* Scattered Jet Ski Routes */}
                <path id="route-jetski-1" d="M 100 1780 Q 400 2030 700 1780 T 1300 1780" fill="none" />
                <path id="route-jetski-2" d="M 1600 1880 Q 1200 1730 900 1880 T 300 1880" fill="none" />
                <path id="route-jetski-3" d="M 1100 2000 C 1300 2100, 1400 1850, 1700 1950" fill="none" />
                <path id="route-jetski-4" d="M 2800 1980 Q 2300 2130 2500 1780" fill="none" />
                <path id="route-jetski-5" d="M 2000 1680 Q 1600 1880 1400 1730" fill="none" />
                
                
                {/* Dubai Metro Red Line Elevated Viaduct - Straight, parallel to E11 (-200 to 4200) */}
                <path d="M -200 1148 L 4200 598" fill="none" stroke="#475569" strokeWidth="10" strokeLinecap="round" opacity="0.35" />
                <path d="M -200 1151 L 4200 601" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="16 8" />
                <path d="M -200 1145 L 4200 595" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="16 8" />

                <path id="metro-path" d="M -200 1151 L 4200 601" fill="none" stroke="transparent" />
                <path id="metro-path-rev" d="M 4200 595 L -200 1145" fill="none" stroke="transparent" />

                {/* Animated Dubai Metro Trains (Forward and Reverse tracks) */}
                <g className="shadow-lg">
                  <animateMotion dur="32s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#metro-path" />
                  </animateMotion>
                  <rect x="-40" y="-3.5" width="80" height="7" rx="3.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.5" />
                  <rect x="-30" y="-1.5" width="60" height="3" rx="1" fill="#f8fafc" opacity="0.85" />
                </g>
                <g className="shadow-lg">
                  <animateMotion dur="30s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#metro-path-rev" />
                  </animateMotion>
                  <rect x="-40" y="-3.5" width="80" height="7" rx="3.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.5" />
                  <rect x="-30" y="-1.5" width="60" height="3" rx="1" fill="#f8fafc" opacity="0.85" />
                </g>

                
                
                
                
                {/* Slow Luxury Cruise Paths in Deep Ocean */}
                <path id="mega-cruise-1" d="M 1500 2300 C 1500 2200, 1800 2200, 1800 2300 C 1800 2400, 1500 2400, 1500 2300 Z" fill="none" />
                <path id="mega-cruise-2" d="M 700 2400 C 700 2300, 1100 2300, 1100 2400 C 1100 2500, 700 2500, 700 2400 Z" fill="none" />

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

                {/* Marine Traffic */}
                {boats.map(boat => (
                  <g key={`boat-${boat.id}`}>
                    <animateMotion dur={`${boat.duration}s`} begin={`${boat.delay}s`} repeatCount="indefinite" rotate="auto">
                      <mpath href={boat.path} />
                    </animateMotion>
                    <g transform={`translate(0, ${boat.offset})`}>
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
                        dur={`${car.duration}s`} 
                        begin={`${car.delay}s`} 
                        repeatCount="indefinite" 
                        rotate="auto"
                      >
                        <mpath href={car.path} />
                      </animateMotion>
                      <g transform={`translate(0, ${car.laneOffset})`}>
                        {Vehicle}
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>
);
};
