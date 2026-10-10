const fs = require('fs');

let seedCode = fs.readFileSync('src/data/mapSeed.ts', 'utf8');

// I will re-run the generate logic to perfectly align the base and the houses
const script = `
const fs = require('fs');

const venues = [
  // THE CLASSIC MONUMENTS
  { id: "burj-khalifa", name: "Burj Khalifa", type: "burj-khalifa", virtualX: 1800, virtualY: 1050, seed: 1 },
  { id: "marina", name: "Dubai Marina", type: "generic-district", virtualX: 700, virtualY: 1300, seed: 3 },
  { id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 550, virtualY: 1450 },
  { id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 400, virtualY: 1550 },
  { id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 1000, virtualY: 1600 },
  { id: "burj-al-arab", name: "Burj Al Arab", type: "burj-al-arab", virtualX: 1400, virtualY: 1400 },
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
        id: \`base-\${index}\`,
        name: commName,
        type: 'estate-base',
        virtualX: startX + 130, 
        virtualY: startY + 100,
        interactive: false
    });
    
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 6; c++) {
            venues.push({
                id: \`house-\${plotCounter++}\`,
                name: \`\${commName} Plot \${r}-\${c}\`,
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
const nightlifeData = \`
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
\`;

const lines = nightlifeData.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
let idCounter = 1;

lines.forEach(line => {
    let [name, desc] = line.split(' — ');
    if (!desc) desc = "Nightlife & Entertainment";
    name = name.trim();
    
    let type = 'club';
    if (name.toLowerCase().includes('beach') || desc.toLowerCase().includes('beach')) type = 'beach-club';
    else if (name.toLowerCase().includes('rooftop') || desc.toLowerCase().includes('sky')) type = 'rooftop';
    else if (desc.toLowerCase().includes('restaurant')) type = 'restaurant';

    let isBeach = type === 'beach-club';
    let x = 500 + Math.random() * 3000;
    let y = isBeach ? (1300 + Math.random() * 200) : (600 + Math.random() * 500);

    venues.push({
        id: \`venue-\${idCounter++}\`,
        name,
        type,
        virtualX: Math.floor(x),
        virtualY: Math.floor(y),
        interactive: true,
        description: desc
    });
});

for (let i = 0; i < 15; i++) {
    venues.push({
        id: \`apt-bldg-\${i}\`,
        name: \`Tower \${i + 1}\`,
        type: 'apartment-building',
        virtualX: 800 + Math.random() * 2500,
        virtualY: 800 + Math.random() * 300,
        interactive: true,
        floors: 5 + Math.floor(Math.random() * 15)
    });
}

fs.writeFileSync('src/data/mapSeed.ts', \`export const mapSeedVenues = \${JSON.stringify(venues, null, 2)};\`);
`;

fs.writeFileSync('run_seed.js', script);
