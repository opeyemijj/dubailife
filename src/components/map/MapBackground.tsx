import React, { useMemo, useState, useEffect } from 'react';
import { WORLD_WIDTH, WORLD_HEIGHT } from './Icons';
import { PALM_CAUSEWAY } from '@/lib/city/palm';

export interface TrafficInfo {
  hour: number;
  minute: number;
  timeString: string;
  level: 'light' | 'moderate' | 'heavy' | 'peak';
  label: string;
  carCount: number;
  speedLabel: string;
  isNight: boolean;
  peakDirection: 'northbound' | 'southbound' | 'balanced';
}

export function getDubaiTimeInfo(preset: string = 'auto'): TrafficInfo {
  let hour: number;
  let minute: number;

  if (preset === 'morning-rush') {
    hour = 8;
    minute = 30;
  } else if (preset === 'midday') {
    hour = 13;
    minute = 15;
  } else if (preset === 'evening-rush') {
    hour = 18;
    minute = 30;
  } else if (preset === 'late-night') {
    hour = 23;
    minute = 45;
  } else {
    // Auto: Live Dubai GST time (UTC+4)
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dubai',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(new Date());
      hour = parseInt(parts.find(p => p.type === 'hour')?.value || '12', 10);
      minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    } catch {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const dubai = new Date(utc + 4 * 3600000);
      hour = dubai.getHours();
      minute = dubai.getMinutes();
    }
  }

  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} GST`;
  const timeFloat = hour + minute / 60;
  const isNight = hour < 6 || hour >= 19;

  // Real Dubai Sheikh Zayed Road (E11) Traffic Rhythm:
  // 1. Morning Peak: 07:00 - 10:00 (Heavy Northbound towards Downtown/DIFC/Deira)
  // 2. Midday Flow: 10:00 - 16:00 (Moderate commercial/tourist steady flow)
  // 3. Evening Peak: 16:30 - 20:30 (Severe Gridlock Southbound towards Marina/Barsha/Abu Dhabi)
  // 4. Nightlife: 20:30 - 01:00 (Brisk luxury & taxi flow)
  // 5. Deep Night / Dawn: 01:00 - 06:30 (Quiet free flow)

  if (timeFloat >= 7.0 && timeFloat < 10.0) {
    return {
      hour,
      minute,
      timeString,
      level: 'peak',
      label: 'Morning Peak Gridlock',
      carCount: 160,
      speedLabel: 'Crawling (25–40 km/h)',
      isNight,
      peakDirection: 'northbound'
    };
  } else if (timeFloat >= 16.5 && timeFloat < 20.5) {
    return {
      hour,
      minute,
      timeString,
      level: 'peak',
      label: 'Evening Peak Gridlock',
      carCount: 180,
      speedLabel: 'Bumper-to-Bumper (20–35 km/h)',
      isNight,
      peakDirection: 'southbound'
    };
  } else if ((timeFloat >= 6.5 && timeFloat < 7.0) || (timeFloat >= 15.5 && timeFloat < 16.5)) {
    return {
      hour,
      minute,
      timeString,
      level: 'heavy',
      label: 'Rush Hour Building Up',
      carCount: 120,
      speedLabel: 'Heavy Flow (45–60 km/h)',
      isNight,
      peakDirection: timeFloat < 12 ? 'northbound' : 'southbound'
    };
  } else if (timeFloat >= 10.0 && timeFloat < 15.5) {
    return {
      hour,
      minute,
      timeString,
      level: 'moderate',
      label: 'Midday Commercial & Taxi Flow',
      carCount: 85,
      speedLabel: 'Steady (65–80 km/h)',
      isNight,
      peakDirection: 'balanced'
    };
  } else if (timeFloat >= 20.5 && timeFloat < 24.0 || timeFloat < 1.0) {
    return {
      hour,
      minute,
      timeString,
      level: 'moderate',
      label: 'Evening & Nightlife Leisure',
      carCount: 95,
      speedLabel: 'Brisk (75–95 km/h)',
      isNight,
      peakDirection: 'balanced'
    };
  } else {
    // 01:00 - 06:30 (Dawn / Late Night)
    return {
      hour,
      minute,
      timeString,
      level: 'light',
      label: 'Dawn / Late Night Free Flow',
      carCount: 38,
      speedLabel: 'Fast Free-Flow (100–120 km/h)',
      isNight,
      peakDirection: 'balanced'
    };
  }
}

export interface MapBackgroundProps {
  trafficPreset?: 'auto' | 'morning-rush' | 'midday' | 'evening-rush' | 'late-night';
  onTrafficInfoChange?: (info: TrafficInfo) => void;
}

export const MapBackground: React.FC<MapBackgroundProps> = ({ 
  trafficPreset = 'auto',
  onTrafficInfoChange
}) => {
  const [trafficInfo, setTrafficInfo] = useState<TrafficInfo>(() => getDubaiTimeInfo(trafficPreset));

  useEffect(() => {
    const updated = getDubaiTimeInfo(trafficPreset);
    setTrafficInfo(updated);
    onTrafficInfoChange?.(updated);

    if (trafficPreset === 'auto') {
      const interval = setInterval(() => {
        const info = getDubaiTimeInfo('auto');
        setTrafficInfo(info);
        onTrafficInfoChange?.(info);
      }, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [trafficPreset, onTrafficInfoChange]);

  const boats = useMemo(() => {
    const arr = [];
    const yachtColors = ['#ffffff', '#f8fafc', '#e2e8f0'];
    const jetskiColors = ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
    
    // Kept light: a few yachts and jet skis (each moving thing is redrawn every frame).
    for (let i = 0; i < 14; i++) {
      const isMegaYacht = false;
      const isYacht = i >= 2 && i < 8;
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

  // Dubai Real-Time Traffic Generation
  const cars = useMemo(() => {
    const arr = [];
    // About a third of the real-time count: enough to read as traffic, light enough for phones.
    const count = Math.round(trafficInfo.carCount * 0.3);
    
    // Dubai Vehicle Types & Visual Ratios
    // Taxis: Signature cream body with 5 official RTA roof colors (Red DTC, Blue Cars, Green Arabia, Yellow Metro, Orange City)
    const taxiRoofColors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#f97316'];
    const suvColors = ['#ffffff', '#f8fafc', '#09090b', '#1e293b', '#cbd5e1', '#d4af37'];
    const supercarColors = ['#dc2626', '#06b6d4', '#eab308', '#7c3aed', '#10b981', '#f97316'];
    const scooterColors = ['#ea580c', '#0d9488', '#16a34a']; // Talabat, Deliveroo, Careem
    const sedanColors = ['#ffffff', '#0f172a', '#64748b', '#94a3b8', '#1e3a8a', '#b91c1c'];

    const isPeak = trafficInfo.level === 'peak';
    const isHeavy = trafficInfo.level === 'heavy';
    const isLight = trafficInfo.level === 'light';

    for (let i = 0; i < count; i++) {
      const prng1 = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      const prng3 = (((i+2) * 9301 + 49297) % 233280) / 233280;
      const prng4 = (((i+3) * 9301 + 49297) % 233280) / 233280;

      // Road selection: 75% on E11 (Sheikh Zayed Road), 25% on Jumeirah Coast Road
      const isE11 = prng1 < 0.75;

      // Directional Flow Bias based on Dubai Peak Commute:
      // Morning Rush: 65% heading Northbound/Rightbound (towards Downtown/DIFC/Deira)
      // Evening Rush: 65% heading Southbound/Leftbound (towards Marina/Barsha/Abu Dhabi)
      let isReverse: boolean; // isReverse = true means Southbound / Leftbound
      if (trafficInfo.peakDirection === 'northbound') {
        isReverse = prng2 < 0.35; // 65% forward (Rightbound)
      } else if (trafficInfo.peakDirection === 'southbound') {
        isReverse = prng2 < 0.65; // 65% reverse (Leftbound)
      } else {
        isReverse = prng2 < 0.50; // 50/50 balanced
      }

      // Lane offset calculation across the 60px E11 and 40px Jumeirah road
      let laneOffset: number;
      if (isE11) {
        // E11 has 3 lanes in each direction: Fast lane (inside 8), Mid lane (17), Slow lane (26)
        const laneIndex = Math.floor(prng3 * 3);
        laneOffset = 8 + laneIndex * 9;
      } else {
        // Jumeirah road has 2 lanes: Inside (6), Outside (14)
        const laneIndex = Math.floor(prng3 * 2);
        laneOffset = 6 + laneIndex * 8;
      }

      // Vehicle Type Weighted Distribution
      let type: 'taxi' | 'suv' | 'supercar' | 'scooter' | 'bus' | 'sedan';
      let color: string;
      let secondaryColor: string | undefined;

      const typeRoll = prng4;
      if (typeRoll < 0.32) {
        type = 'taxi';
        color = '#fef3c7'; // Cream taxi body
        secondaryColor = taxiRoofColors[Math.floor(prng3 * taxiRoofColors.length)];
      } else if (typeRoll < 0.62) {
        type = 'suv'; // Luxury Nissan Patrol / Land Cruiser / G-Wagon
        color = suvColors[Math.floor(prng3 * suvColors.length)];
      } else if (typeRoll < 0.74) {
        type = 'scooter'; // Delivery bike
        color = scooterColors[Math.floor(prng3 * scooterColors.length)];
      } else if (typeRoll < 0.82) {
        type = 'supercar';
        color = supercarColors[Math.floor(prng3 * supercarColors.length)];
      } else if (typeRoll < 0.90) {
        type = 'bus'; // RTA Public Bus
        color = '#ef4444';
      } else {
        type = 'sedan'; // Executive Lexus / Tesla
        color = sedanColors[Math.floor(prng3 * sedanColors.length)];
      }

      // Speed & Duration based on Congestion Level and Commute Direction:
      // In Peak Rush: Congested direction crawls (55s - 85s), reverse direction flows moderately (32s - 45s)
      // In Light Flow: Fast free flow (18s - 26s)
      let baseDuration: number;
      const isCongestedSide = 
        (trafficInfo.peakDirection === 'northbound' && !isReverse) ||
        (trafficInfo.peakDirection === 'southbound' && isReverse);

      if (isPeak) {
        baseDuration = isCongestedSide ? (55 + prng2 * 30) : (30 + prng2 * 18);
      } else if (isHeavy) {
        baseDuration = isCongestedSide ? (42 + prng2 * 22) : (26 + prng2 * 14);
      } else if (isLight) {
        baseDuration = 18 + prng2 * 8; // Fast 18-26s
      } else {
        baseDuration = 26 + prng2 * 12; // Steady 26-38s
      }

      // Scooters are agile and slightly faster in traffic; buses are slower
      if (type === 'scooter') baseDuration *= 0.85;
      if (type === 'bus') baseDuration *= 1.25;

      // Realistic wave delays (bumper-to-bumper queue clusters in rush hour)
      const clusterFactor = isPeak ? Math.floor(i / 3) * 6 : i * 2.5;
      const delay = -((clusterFactor + prng1 * 40) % 180);

      const path = isE11 
        ? (isReverse ? '#e11-left' : '#e11-right') 
        : (isReverse ? '#jum-left' : '#jum-right');

      arr.push({
        id: i,
        type,
        color,
        secondaryColor,
        duration: Math.round(baseDuration * 10) / 10,
        delay: Math.round(delay * 10) / 10,
        laneOffset,
        path,
        isNight: trafficInfo.isNight
      });
    }
    return arr;
  }, [trafficInfo]);

  return (

  <svg width={WORLD_WIDTH} height={WORLD_HEIGHT} className="map-animated absolute inset-0 pointer-events-none overflow-visible">
              <g transform={`translate(0, 2600) scale(1, -1)`}>
                
                
                {/* Original Ocean Color (with graceful curved wings closing slowly to the top) */}
                <path d="M -1500,2600 C -1100,1950 -600,1481 -200,1485 Q 2000,1505 4200,1412 C 4600,1395 5100,1950 5500,2600 L 5500,3800 L -1500,3800 Z" fill="#60BAEB" />

                {/* Thick Beach Sand Edge */}
                <path d="M -1500,2600 C -1100,1950 -600,1481 -200,1485 Q 2000,1505 4200,1412 C 4600,1395 5100,1950 5500,2600" fill="none" stroke="#fde047" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
                                
                {/* Ocean Edge Glow */}
                <path d="M -1480,2600 C -1085,1965 -590,1501 -200,1505 Q 2000,1525 4200,1432 C 4590,1415 5085,1965 5480,2600" fill="none" stroke="#87CEEB" strokeWidth="15" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
                
                
                
                
                
                
                
                
                
                
                

                <path d="M 360 1254 L 450 1636" fill="none" stroke="#64748b" strokeWidth="8" />
                <path d="M 360 1254 L 450 1636" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" />
                
                


                {/* Palm Jumeirah causeway: four lanes from the Jumeirah coast road out to the Palm's bridge, with the monorail beside it */}
                <path d={`M ${PALM_CAUSEWAY.x} ${PALM_CAUSEWAY.fromVirtualY} L ${PALM_CAUSEWAY.x} ${PALM_CAUSEWAY.toVirtualY}`} fill="none" stroke="#e2e8f0" strokeWidth="58" />
                <path d={`M ${PALM_CAUSEWAY.x} ${PALM_CAUSEWAY.fromVirtualY} L ${PALM_CAUSEWAY.x} ${PALM_CAUSEWAY.toVirtualY}`} fill="none" stroke="#334155" strokeWidth="50" />
                <path d={`M ${PALM_CAUSEWAY.x} ${PALM_CAUSEWAY.fromVirtualY} L ${PALM_CAUSEWAY.x} ${PALM_CAUSEWAY.toVirtualY}`} fill="none" stroke="#facc15" strokeWidth="2" />
                {[-12.5, 12.5].map((dx) => (
                  <path key={dx} d={`M ${PALM_CAUSEWAY.x + dx} ${PALM_CAUSEWAY.fromVirtualY} L ${PALM_CAUSEWAY.x + dx} ${PALM_CAUSEWAY.toVirtualY}`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="8 10" />
                ))}
                <path d={`M ${PALM_CAUSEWAY.x + 40} ${PALM_CAUSEWAY.fromVirtualY + 60} L ${PALM_CAUSEWAY.x + 40} ${PALM_CAUSEWAY.toVirtualY}`} fill="none" stroke="#cbd5e1" strokeWidth="9" />
                <path d={`M ${PALM_CAUSEWAY.x + 40} ${PALM_CAUSEWAY.fromVirtualY + 60} L ${PALM_CAUSEWAY.x + 40} ${PALM_CAUSEWAY.toVirtualY}`} fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 6" />
                {/* street lights */}
                {Array.from({ length: Math.floor((PALM_CAUSEWAY.toVirtualY - PALM_CAUSEWAY.fromVirtualY) / 60) }, (_, i) => (
                  <g key={i}>
                    <circle cx={PALM_CAUSEWAY.x - 30} cy={PALM_CAUSEWAY.fromVirtualY + 30 + i * 60} r="2.5" fill="#fde68a" />
                    <circle cx={PALM_CAUSEWAY.x + 30} cy={PALM_CAUSEWAY.fromVirtualY + 30 + i * 60} r="2.5" fill="#fde68a" />
                  </g>
                ))}
                
                {/* Jumeirah Coast Road - STRAIGHT, END-TO-END (-3000 to 6600) */}
                <path d="M -3000 1312 L 6600 1152" fill="none" stroke="#64748b" strokeWidth="40" strokeLinecap="round" />
                <path d="M -3000 1312 L 6600 1152" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 8" />
                
                <path id="jum-right" d="M -3000 1312 L 6600 1152" fill="none" />
                <path id="jum-left" d="M 6600 1152 L -3000 1312" fill="none" />

                {/* E11 Base Highway (Sheikh Zayed Road) - STRAIGHT, END-TO-END (-3000 to 6600) */}
                <path d="M -3000 1072 L 6600 912" fill="none" stroke="#334155" strokeWidth="60" />
                <path d="M -3000 1072 L 6600 912" fill="none" stroke="#facc15" strokeWidth="2" />
                <path d="M -3000 1072 L 6600 912" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 12.5)" />
                <path d="M -3000 1072 L 6600 912" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, 21.5)" />
                <path d="M -3000 1072 L 6600 912" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -12.5)" />
                <path d="M -3000 1072 L 6600 912" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,8" transform="translate(0, -21.5)" />
                
                <path id="e11-right" d="M -3000 1072 L 6600 912" fill="none" stroke="transparent" />
                <path id="e11-left" d="M 6600 912 L -3000 1072" fill="none" stroke="transparent" />

                <path d="M -3000 1072 L 6600 912" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="10 10" transform="translate(0, -28)" />
                <path d="M -3000 1072 L 6600 912" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="10 10" transform="translate(0, 28)" />
                
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
                
                
                {/* Dubai Metro Red Line Elevated Viaduct - Straight, parallel to E11 (-3000 to 6600) */}
                <path d="M -3000 1022 L 6600 862" fill="none" stroke="#475569" strokeWidth="10" strokeLinecap="round" opacity="0.35" />
                <path d="M -3000 1024 L 6600 864" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="16 8" />
                <path d="M -3000 1020 L 6600 860" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="16 8" />

                <path id="metro-path" d="M -3000 1024 L 6600 864" fill="none" stroke="transparent" />
                <path id="metro-path-rev" d="M 6600 860 L -3000 1020" fill="none" stroke="transparent" />

                {/* Animated Dubai Metro Trains (Forward and Reverse tracks): silver with the blue band and tinted windows */}
                <g>
                  <animateMotion dur="36s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#metro-path" />
                  </animateMotion>
                  <rect x="-40" y="-3.5" width="80" height="7" rx="3.5" fill="#c9ced4" stroke="#8a929c" strokeWidth="0.5" />
                  <rect x="-36" y="-3.5" width="72" height="1.6" fill="#0a5ea8" />
                  <rect x="-30" y="-0.8" width="60" height="2.6" rx="1" fill="#16202c" opacity="0.9" />
                </g>
                <g>
                  <animateMotion dur="34s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#metro-path-rev" />
                  </animateMotion>
                  <rect x="-40" y="-3.5" width="80" height="7" rx="3.5" fill="#c9ced4" stroke="#8a929c" strokeWidth="0.5" />
                  <rect x="-36" y="-3.5" width="72" height="1.6" fill="#0a5ea8" />
                  <rect x="-30" y="-0.8" width="60" height="2.6" rx="1" fill="#16202c" opacity="0.9" />
                </g>


                {/* Slow Luxury Cruise Paths in Deep Ocean */}
                <path id="mega-cruise-1" d="M 1500 2300 C 1500 2200, 1800 2200, 1800 2300 C 1800 2400, 1500 2400, 1500 2300 Z" fill="none" />
                <path id="mega-cruise-2" d="M 700 2400 C 700 2300, 1100 2300, 1100 2400 C 1100 2500, 700 2500, 700 2400 Z" fill="none" />

                {/* Animated Slow Mega Yachts */}
                <g>
                  <animateMotion dur="120s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#mega-cruise-1" />
                  </animateMotion>
                  <g transform="scale(1.1)">
                    <path d="M -30 -10 L 25 -10 L 45 0 L 25 10 L -30 10 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
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
                  <g transform="scale(1.3)">
                    <path d="M -30 -10 L 25 -10 L 45 0 L 25 10 L -30 10 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
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
                    <g transform={`translate(0, ${boat.offset}) scale(1.2)`}>{/* yachts and jet skis, drawn at 2x */}
                      {boat.type === 'yacht' ? (
                        <g>
                          <path d="M -15 -6 L 10 -6 L 22 0 L 10 6 L -15 6 Z" fill={boat.color} />
                          <rect x="-5" y="-3" width="12" height="6" fill="#cbd5e1" rx="1" />
                          <rect x="0" y="-2" width="5" height="4" fill="#0ea5e9" opacity="0.6" />
                          <path d="M -15 -6 L -35 -12 M -15 6 L -35 12" stroke="#bae6fd" strokeWidth="2" fill="none" opacity="0.5" />
                          <path d="M -15 0 L -40 0" stroke="#bae6fd" strokeWidth="3" fill="none" opacity="0.3" />
                        </g>
                      ) : (
                        <g>
                          <ellipse cx="0" cy="0" rx="5" ry="2.5" fill={boat.color} />
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
                  const isNight = car.isNight;

                  if (car.type === 'taxi') {
                    Vehicle = (
                      <g>
                        {/* Camry Body */}
                        <rect x="-8" y="-3.5" width="16" height="7" rx="2.5" fill="#fef9c3" stroke="#fde047" strokeWidth="0.5" />
                        {/* Windows */}
                        <rect x="-4" y="-2.5" width="3" height="5" fill="#0f172a" opacity="0.75" rx="0.5" />
                        <rect x="2" y="-2.5" width="2.5" height="5" fill="#0f172a" opacity="0.75" rx="0.5" />
                        {/* Official RTA Franchise Colored Roof */}
                        <rect x="-1" y="-3.5" width="5" height="7" fill={car.secondaryColor || '#ef4444'} rx="1" />
                        {/* Illuminated Taxi Roof Lantern */}
                        <rect x="0" y="-1.5" width="3" height="3" rx="0.5" fill="#f59e0b" />
                        {/* Night Lights: Headlights & Taillights */}
                        {isNight && (
                          <>
                            <circle cx="8" cy="-2.5" r="1.5" fill="#fef08a" />
                            <circle cx="8" cy="2.5" r="1.5" fill="#fef08a" />
                            <circle cx="-8" cy="-2.5" r="1.2" fill="#ef4444" />
                            <circle cx="-8" cy="2.5" r="1.2" fill="#ef4444" />
                          </>
                        )}
                      </g>
                    );
                  } else if (car.type === 'suv') {
                    Vehicle = (
                      <g>
                        {/* Chunky Luxury Patrol / Land Cruiser Body */}
                        <rect x="-9.5" y="-4.5" width="19" height="9" rx="3" fill={car.color} stroke="#64748b" strokeWidth="0.5" />
                        {/* Dark VIP Tint Panoramic Windows */}
                        <rect x="-6" y="-3.5" width="11" height="7" rx="1.5" fill="#020617" opacity="0.85" />
                        <rect x="-1" y="-3.5" width="1.5" height="7" fill={car.color} />
                        {/* Roof Rails */}
                        <rect x="-7" y="-4.2" width="13" height="0.8" fill="#94a3b8" />
                        <rect x="-7" y="3.4" width="13" height="0.8" fill="#94a3b8" />
                        {/* Night Lights */}
                        {isNight && (
                          <>
                            <circle cx="9.5" cy="-3" r="1.8" fill="#e0f2fe" />
                            <circle cx="9.5" cy="3" r="1.8" fill="#e0f2fe" />
                            <rect x="-10" y="-3.8" width="1" height="2" fill="#dc2626" />
                            <rect x="-10" y="1.8" width="1" height="2" fill="#dc2626" />
                          </>
                        )}
                      </g>
                    );
                  } else if (car.type === 'supercar') {
                    Vehicle = (
                      <g>
                        {/* Low-profile Aerodynamic Supercar */}
                        <path d="M -8 -3.5 L 4 -3.5 L 9 0 L 4 3.5 L -8 3.5 Z" fill={car.color} />
                        <rect x="-4" y="-2.5" width="6" height="5" rx="1" fill="#020617" opacity="0.9" />
                        {/* Carbon Rear Wing */}
                        <rect x="-9" y="-4" width="1.5" height="8" rx="0.5" fill="#0f172a" />
                        {/* Night Lights */}
                        {isNight && (
                          <>
                            <circle cx="8" cy="-2" r="1.5" fill="#fef08a" />
                            <circle cx="8" cy="2" r="1.5" fill="#fef08a" />
                            <circle cx="-8.5" cy="-2.5" r="1.5" fill="#ef4444" />
                            <circle cx="-8.5" cy="2.5" r="1.5" fill="#ef4444" />
                          </>
                        )}
                      </g>
                    );
                  } else if (car.type === 'bus') {
                    Vehicle = (
                      <g>
                        {/* RTA City Transit Bus */}
                        <rect x="-18" y="-5" width="36" height="10" rx="3" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.5" />
                        <rect x="-18" y="-1.5" width="36" height="3" fill="#ffffff" />
                        {/* Windows */}
                        <rect x="-14" y="-4" width="6" height="2" fill="#0f172a" opacity="0.8" rx="0.5" />
                        <rect x="-6" y="-4" width="6" height="2" fill="#0f172a" opacity="0.8" rx="0.5" />
                        <rect x="2" y="-4" width="6" height="2" fill="#0f172a" opacity="0.8" rx="0.5" />
                        <rect x="11" y="-4" width="5" height="8" fill="#0f172a" opacity="0.9" rx="1" />
                        {/* Night Lights */}
                        {isNight && (
                          <>
                            <circle cx="18" cy="-3.5" r="2" fill="#fef08a" />
                            <circle cx="18" cy="3.5" r="2" fill="#fef08a" />
                            <circle cx="-18" cy="-3.5" r="1.5" fill="#dc2626" />
                            <circle cx="-18" cy="3.5" r="1.5" fill="#dc2626" />
                          </>
                        )}
                      </g>
                    );
                  } else if (car.type === 'scooter') {
                    Vehicle = (
                      <g>
                        {/* Delivery Scooter (Talabat / Deliveroo / Careem) */}
                        <circle cx="0" cy="0" r="2.5" fill="#334155" />
                        {/* Courier Delivery Thermal Box */}
                        <rect x="-4.5" y="-2" width="3" height="4" rx="1" fill={car.color} />
                        {isNight && (
                          <>
                            <circle cx="2.5" cy="0" r="1.2" fill="#fef08a" />
                            <circle cx="-4.5" cy="0" r="1" fill="#ef4444" />
                          </>
                        )}
                      </g>
                    );
                  } else {
                    Vehicle = (
                      <g>
                        {/* Executive Sedan */}
                        <rect x="-7.5" y="-3.5" width="15" height="7" rx="2.5" fill={car.color} stroke="#64748b" strokeWidth="0.5" />
                        <rect x="-3" y="-2.5" width="6" height="5" rx="1" fill="#0f172a" opacity="0.65" />
                        {isNight && (
                          <>
                            <circle cx="7.5" cy="-2.5" r="1.5" fill="#fef08a" />
                            <circle cx="7.5" cy="2.5" r="1.5" fill="#fef08a" />
                            <circle cx="-7.5" cy="-2.5" r="1.2" fill="#ef4444" />
                            <circle cx="-7.5" cy="2.5" r="1.2" fill="#ef4444" />
                          </>
                        )}
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
                      <g transform={`translate(0, ${car.laneOffset}) scale(0.65)`}>
                        {Vehicle}
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>
);
};
