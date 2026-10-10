
const fs = require('fs');

const venues = [
  // THE CLASSIC MONUMENTS
  { id: "burj-khalifa", name: "Burj Khalifa", type: "burj-khalifa", virtualX: 1800, virtualY: 1050, seed: 1 },
  { id: "marina", name: "Dubai Marina", type: "generic-district", virtualX: 550, virtualY: 1180, seed: 3 },
  { id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 450, virtualY: 1320 },
  { id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 350, virtualY: 1610 },
  { id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: 1744 },
  { id: "burj-al-arab", name: "Burj Al Arab", type: "burj-al-arab", virtualX: 1150, virtualY: 1480 },
  { id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: 3300, virtualY: 350 },
  
  // BILLBOARDS
  { id: "ad-1", name: "Coastal Billboard 1", type: "billboard", virtualX: 200, virtualY: 1050, seed: 1 },
  { id: "ad-2", name: "Coastal Billboard 2", type: "billboard", virtualX: 700, virtualY: 950, seed: 2 },
  { id: "ad-3", name: "Coastal Billboard 3", type: "billboard", virtualX: 1100, virtualY: 980, seed: 3 },
  { id: "ad-4", name: "Coastal Billboard 4", type: "billboard", virtualX: 1600, virtualY: 1020, seed: 4 },
  { id: "ad-5", name: "Coastal Billboard 5", type: "billboard", virtualX: 2100, virtualY: 920, seed: 5 },
  { id: "ad-6", name: "Inland Billboard 1", type: "billboard", virtualX: 1300, virtualY: 350, seed: 6 },
  { id: "ad-7", name: "Inland Billboard 2", type: "billboard", virtualX: 2500, virtualY: 650, seed: 7 },
  { id: "ad-8", name: "Inland Billboard 3", type: "billboard", virtualX: 2300, virtualY: 250, seed: 8 },
  
  // SKYLINE ALONG E11 ROAD (virtualY around 800 - 1000)
  { id: "skyline-1", name: "Downtown Skyscraper", type: "skyline", virtualX: 1900, virtualY: 1000, seed: 1 },
  { id: "skyline-2", name: "SZR Tower", type: "skyline", virtualX: 2000, virtualY: 950, seed: 2 },
  { id: "skyline-3", name: "Financial Centre Tower", type: "skyline", virtualX: 2100, virtualY: 900, seed: 3 },
  { id: "skyline-4", name: "Business Bay Tower", type: "skyline", virtualX: 1700, virtualY: 1050, seed: 4 },
];

const communityNames = ["Emirates Hills", "Motor City", "Jumeirah Village", "Dubai Hills", "Arabian Ranches", "Silicon Oasis"];
let plotCounter = 1;

communityNames.forEach((commName, index) => {
    // 3 per row
    const startX = 400 + (index % 3) * 1000;
    const startY = 150 + Math.floor(index / 3) * 300;
    
    // Add the base label
    venues.push({
        id: `base-${index}`,
        name: commName,
        type: 'estate-base',
        virtualX: startX + 130, 
        virtualY: startY + 170,
        interactive: false
    });
    
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 6; c++) {
            venues.push({
                id: `house-${plotCounter++}`,
                name: `${commName} Plot ${r}-${c}`,
                type: 'small-house',
                virtualX: startX + (c * 50), 
                virtualY: startY + (r * 50),
                interactive: true,
                price: 1500000 + Math.floor(Math.random() * 500000),
                rent: 10000 + Math.floor(Math.random() * 5000),
                community: commName
            });
        }
    }
});

// Nightlife
const nightlifeData = `
Zuma Dubai — Japanese / Restaurant & Lounge
COYA Dubai — Peruvian / Restaurant & Lounge
Gaia Dubai — Mediterranean / Greek
Amazónico Dubai — Latin American / Restaurant & Lounge
CÉ LA VI Dubai — Asian / Restaurant & Lounge
Billionaire Dubai — Italian / Restaurant & Nightlife
ROKA Dubai — Japanese / Restaurant & Lounge
LPM Restaurant & Bar Dubai — French Mediterranean
Bagatelle Dubai — French / Restaurant & Nightlife
Clap Dubai — Japanese / Restaurant & Lounge
Nammos Dubai — Mediterranean / Beach Restaurant
Nikki Beach Restaurant & Beach Club — Mediterranean / Beach Club
Toro Toro Dubai — Latin American / Restaurant & Lounge
Hutong Dubai — Northern Chinese / Restaurant & Lounge
Asia Asia Dubai — Asian / Restaurant & Lounge
Level 43 Sky Lounge — Rooftop Lounge
Atelier M — Rooftop Restaurant & Lounge
Mercury Rooftop — Rooftop Restaurant & Lounge
The Penthouse — Rooftop Lounge
Iris Dubai — Rooftop Lounge
Treehouse Dubai — Rooftop Lounge
Pure Sky Lounge — Rooftop Lounge
Vault — Sky Lounge
Luna Dubai — Rooftop Lounge
BLING — Nightclub
WHITE Dubai — Nightclub
SKY 2.0 — Nightclub
1 OAK Dubai — Nightclub
Drai's Dubai — Nightclub
The MYTH Nightclub — Nightclub
Club One Dubai — Nightclub
Armani/Privé — Nightclub
BOA Lounge — Nightclub
Toy Room Dubai — Nightclub
Billionaire Mansion — Nightclub
CODE 8 — Nightclub
Base Dubai — Nightclub
WHITE Beach — Beach Club
Zero Gravity Dubai — Beach Club
Cove Beach — Beach Club
Drift Beach Dubai — Beach Club
Playa Beach Club — Beach Club
SAN Beach — Beach Club
Twiggy by La Cantine — Beach Club
Bla Bla Dubai — Beach Club & Entertainment
Soho Garden — Lounge / Bar
Barasti Beach — Bar / Entertainment
Lock, Stock & Barrel — Bar / Live Entertainment
McGettigan's — Irish Pub / Live Entertainment
The Irish Village — Irish Pub / Live Entertainment
The Maine Oyster Bar & Grill — Restaurant / Bar
Publique — Bar / Lounge
Scandal Dubai — Lounge Bar
Estrellas Rooftop Lounge — Rooftop Lounge
Alma Music & Art Lounge — Music & Art Lounge
Lío Dubai — Dinner & Show
The Theater Dubai — Dinner & Show
Seven Sisters Dubai — Restaurant & Lounge
African Queen — Restaurant & Beach Club
VIbe Nation
Vibz Dubai — Nightclub
Club Blu Dubai — Nightclub
PAPA Dubai — Nightclub / Bar
Enish Dubai — Nightclub / Dinner
`;

const lines = nightlifeData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
let idCounter = 1;



let beachClubs = [];
let otherClubs = [];

lines.forEach(line => {
    let [name, desc] = line.split(' — ');
    if (!desc) desc = "Nightlife & Entertainment";
    name = name.trim();
    
    let type = 'club';
    if (name.toLowerCase().includes('beach') || desc.toLowerCase().includes('beach')) type = 'beach-club';
    else if (name.toLowerCase().includes('rooftop') || desc.toLowerCase().includes('sky')) type = 'rooftop';
    else if (desc.toLowerCase().includes('restaurant')) type = 'restaurant';

    let isBeach = type === 'beach-club';

    let venue = {
        id: `venue-${idCounter++}`,
        name,
        type,
        interactive: true,
        description: desc
    };

    if (isBeach) {
        beachClubs.push(venue);
    } else {
        venue.virtualX = Math.floor(500 + Math.random() * 2500);
        venue.virtualY = Math.floor(200 + Math.random() * 600); // Inland nightlife
        otherClubs.push(venue);
    }
});

// Custom mapping for realism
const beachXMap = {
    "Cove Beach": 350,       // Bluewaters
    "Bla Bla Dubai": 480,    // JBR
    "Zero Gravity Dubai": 580, // Marina / Skydive
    "Barasti Beach": 620,    // Marina edge
    "Drift Beach Dubai": 660, // One&Only
    "WHITE Beach": 730,      // Palm
    "SAN Beach": 770,        // Palm
    "Playa Beach Club": 810, // Palm
    "African Queen": 850,    // Palm
    "Nammos Dubai": 1800,    // Four Seasons
    "Twiggy by La Cantine": 2400, // Creek / North
    "Nikki Beach Restaurant & Beach Club": 2800 // Pearl Jumeira
};

let unmappedBeachClubs = [];

beachClubs.forEach((venue) => {
    let exactX = beachXMap[venue.name];
    if (exactX) {
        venue.virtualX = exactX;
        let t = exactX / 4000;
        let curveY = Math.pow(1 - t, 2) * 1300 + 2 * (1 - t) * t * 1600 + Math.pow(t, 2) * 900;
        venue.virtualY = Math.floor(curveY);
        venues.push(venue);
    } else {
        unmappedBeachClubs.push(venue);
    }
});

// Distribute remaining evenly in the empty space (X=2000 to X=3500)
let startX = 2000;
let stepX = 1200 / (unmappedBeachClubs.length || 1);
unmappedBeachClubs.forEach((venue, i) => {
    let x = startX + i * stepX;
    venue.virtualX = Math.floor(x);
    let t = x / 4000;
    let curveY = Math.pow(1 - t, 2) * 1300 + 2 * (1 - t) * t * 1600 + Math.pow(t, 2) * 900;
    venue.virtualY = Math.floor(curveY);
    venues.push(venue);
});

otherClubs.forEach(v => venues.push(v));

for (let i = 0; i < 15; i++) {
    venues.push({
        id: `apt-bldg-${i}`,
        name: `Tower ${i + 1}`,
        type: 'apartment-building',
        virtualX: 800 + Math.random() * 2500,
        virtualY: 800 + Math.random() * 300,
        interactive: true,
        floors: 5 + Math.floor(Math.random() * 15)
    });
}


// Bridges
venues.push({
  id: 'bridge-palm', name: 'Palm Bridge', type: 'bridge',
  virtualX: 750, virtualY: 1419, // Center Y_svg = (1239+1600)/2 = 1419.5
  width: 14, height: 361, rotate: 0, interactive: true
});
venues.push({
  id: 'bridge-burj', name: 'Burj Bridge', type: 'bridge',
  virtualX: 1150, virtualY: 1356, // (1232+1480)/2 = 1356
  width: 8, height: 248, rotate: 0, interactive: true
});
venues.push({
  id: 'bridge-bluewaters', name: 'Bluewaters Bridge', type: 'bridge',
  virtualX: 400, virtualY: 1377, 
  width: 10, height: 322, rotate: 18, interactive: true // wait! 18 or -18?
  // Top point needs to be X=350, Bottom X=450.
  // Unrotated: Top=400, Bottom=400.
  // Rotated by positive 18 degrees (clockwise): Top goes right (X>400), Bottom goes left (X<400).
  // We want Top X=350 (left), Bottom X=450 (right).
  // So we need counter-clockwise rotation: -18.
});
venues.push({
  id: 'bridge-bulgari', name: 'Bulgari Bridge', type: 'bridge',
  virtualX: 1600, virtualY: 1392, // (1335+1450)/2 = 1392.5
  width: 8, height: 115, rotate: 0, interactive: true
});


// Extra Editable Roads
venues.push({
  id: 'road-cross-1', name: 'Cross Road 1', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 4, color: '#94a3b8', isDashed: false,
  pathData: 'M 800,1300 Q 900,750 1500,200', interactive: true
});
venues.push({
  id: 'road-cross-2', name: 'Cross Road 2', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 4, color: '#94a3b8', isDashed: false,
  pathData: 'M 1200,1300 Q 1300,750 1900,200', interactive: true
});
venues.push({
  id: 'road-e44', name: 'E44 Al Khail Road', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 16, color: '#64748b', isDashed: false,
  pathData: 'M -100,650 Q 1500,950 3100,250', interactive: true
});
venues.push({
  id: 'road-e44-dashed', name: 'E44 Centerline', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 2, color: '#fbbf24', isDashed: true,
  pathData: 'M -100,650 Q 1500,950 3100,250', interactive: true
});
venues.push({
  id: 'road-e311', name: 'E311 SMBZ Road', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 16, color: '#64748b', isDashed: false,
  pathData: 'M -100,350 Q 1500,650 3100,-50', interactive: true
});
venues.push({
  id: 'road-e311-dashed', name: 'E311 Centerline', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 2, color: '#fbbf24', isDashed: true,
  pathData: 'M -100,350 Q 1500,650 3100,-50', interactive: true
});
venues.push({
  id: 'metro-line', name: 'Metro Line', type: 'road-path',
  virtualX: 2000, virtualY: 1300, width: 4, color: '#cbd5e1', isDashed: false,
  pathData: 'M -100,900 Q 1500,1200 3100,500', interactive: true
});


// Museum of the Future
venues.push({
  id: 'motf-1', name: 'Museum of the Future', type: 'museum-future',
  virtualX: 2300, virtualY: 1000, width: 100, height: 120, interactive: true
});


// Sample Mall
venues.push({
  id: 'mall-1', name: 'Dubai Mall', type: 'mall',
  virtualX: 2000, virtualY: 1000, width: 250, height: 220, interactive: true
});


// Sample Hotel
venues.push({
  id: 'hotel-1', name: 'Grand Resort Hotel', type: 'hotel',
  virtualX: 1900, virtualY: 1000, width: 250, height: 250, interactive: true
});


// Sample Apartment Complex
venues.push({
  id: 'apartment-complex-1', name: 'University Apartments', type: 'apartment-complex',
  virtualX: 1800, virtualY: 900, width: 300, height: 250, interactive: true
});


// Sample Giant Billboard
venues.push({
  id: 'giant-billboard-1', name: 'Yadsale Ad', type: 'giant-billboard',
  virtualX: 2000, virtualY: 1500, width: 250, height: 200, 
  text1: 'yad', text2: 'sale', color1: '#064e3b', color2: '#16a34a',
  interactive: true
});


// Sample Configurable Apartment
venues.push({
  id: 'luxury-apts-1', name: 'Luxury Residences', type: 'configurable-apartment',
  virtualX: 1800, virtualY: 1500, width: 300, height: 250, 
  hasPool: true, hasParking: true, hasCourt: true, numBuildings: 4, color: '#38bdf8',
  interactive: true // Allow wrapper so the wrapper doesn't block the children from being clicked in InteractiveMap!
});

fs.writeFileSync('src/data/mapSeed.ts', `export const mapConfig = { pitch: 45, yaw: 0, startX: -1000, startY: -500, startScale: 0.8 };\nexport const mapSeed = ${JSON.stringify(venues, null, 2)};`);
