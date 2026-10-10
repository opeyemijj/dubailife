const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const regex = /if \(type === 'generic-district'\) return <GenericNeighborhood name=\{title \|\| ''\} seed=\{seed \|\| 0\} \/>;/;

const newIcons = `if (type === 'generic-district') return <GenericNeighborhood name={title || ''} seed={seed || 0} />;
  if (type === 'estate-community') return <EstateCommunityBlock name={title || ''} />;
  if (type === 'small-house') return <SmallHouseIcon />;
  if (type === 'stadium') return <StadiumIcon />;
  if (type === 'hospital') return <HospitalIcon />;
  if (type === 'school') return <SchoolIcon />;
  if (type === 'casino') return <CasinoIcon />;
  if (type === 'park') return <ParkIcon />;`;

code = code.replace(regex, newIcons);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Fixed getBuildingSprite to include all custom icons.");
