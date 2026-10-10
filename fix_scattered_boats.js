const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Update Marine Routes in SVG
const oldRoutesRegex = /\{\/\* Marine Routes \(Hidden paths for animation\) \*\/\}[\s\S]*?<path id="metro-path"/;

const newRoutes = `{/* Marine Routes (Hidden paths for animation) */}
                {/* Mega Yacht Routes near Burj Al Arab (X=1100, Y=1530) */}
                <path id="route-mega-1" d="M -200 1700 C 500 1600, 1100 1480, 2000 1650" fill="none" />
                <path id="route-mega-2" d="M 2200 1600 C 1500 1450, 800 1650, -200 1750" fill="none" />
                
                {/* Scattered Yacht Routes */}
                <path id="route-yacht-1" d="M -100 1900 C 600 2200, 1200 1700, 2400 2000" fill="none" />
                <path id="route-yacht-2" d="M 2600 2300 C 1800 1900, 900 2500, -100 2100" fill="none" />
                <path id="route-yacht-3" d="M 300 2600 Q 1200 1850 2000 2600" fill="none" />
                <path id="route-yacht-4" d="M 3100 1800 Q 1500 2400 -100 1850" fill="none" />
                
                {/* Scattered Jet Ski Routes */}
                <path id="route-jetski-1" d="M 100 1600 Q 400 1850 700 1600 T 1300 1600" fill="none" />
                <path id="route-jetski-2" d="M 1600 1700 Q 1200 1550 900 1700 T 300 1700" fill="none" />
                <path id="route-jetski-3" d="M 1100 1900 C 1300 2000, 1400 1750, 1700 1850" fill="none" />
                <path id="route-jetski-4" d="M 2800 1800 Q 2300 1950 2500 1600" fill="none" />
                <path id="route-jetski-5" d="M 2000 1500 Q 1600 1700 1400 1550" fill="none" />
                
                <path id="metro-path"`;

code = code.replace(oldRoutesRegex, newRoutes);

// 2. Update boats generator to use these new scattered paths
const oldBoatsGen = /const boats = useMemo\(\(\) => \{[\s\S]*?return arr;\n  \}, \[\]\);/;

const newBoatsGen = `const boats = useMemo(() => {
    const arr = [];
    const yachtColors = ['#ffffff', '#f8fafc', '#e2e8f0'];
    const jetskiColors = ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
    
    for (let i = 0; i < 40; i++) {
      const isMegaYacht = i < 2;
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
        // Add random scatter offset even to mega yachts slightly to avoid overlapping perfectly if paths cross
        offset: isMegaYacht ? (prng2 - 0.5) * 40 : (prng2 - 0.5) * 160,
        path: pathId
      });
    }
    return arr;
  }, []);`;

code = code.replace(oldBoatsGen, newBoatsGen);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated boats to scatter randomly and placed mega yachts near Burj Al Arab");
