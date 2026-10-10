const fs = require('fs');
let code = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');

// Replace export const MapBackground = () => ( with export const MapBackground = () => { useMemos... return (
const hookCode = `
import { useMemo } from 'react';
`;

const bodyCode = `
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
`;

code = code.replace("import React from 'react';", "import React, { useMemo } from 'react';");
code = code.replace("export const MapBackground = () => (", "export const MapBackground = () => {" + bodyCode);

// The end of the file is just ");" and we need to replace it with "); };"
code = code.replace(/\);\n$/, ");\n};\n");

fs.writeFileSync('src/components/map/MapBackground.tsx', code);
console.log("Fixed MapBackground!");
