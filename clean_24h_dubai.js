const fs = require('fs');

const venues = [
  // COASTAL LANDMARKS
  { id: "palm", name: "Palm Jumeirah", type: "community-palm", virtualX: 750, virtualY: 1590 },
  { id: "bluewaters", name: "Bluewaters Island", type: "community-bluewaters", virtualX: 350, virtualY: 1530 },
  { id: "jbr", name: "Jumeirah Beach Residence", type: "community-jbr", virtualX: 450, virtualY: 1300 },
  { id: "marina", name: "Dubai Marina", type: "generic-district", virtualX: 550, virtualY: 1180, seed: 3 },
  { id: "burj-al-arab", name: "Burj Al Arab", type: "burj-al-arab", virtualX: 1150, virtualY: 1480 },
  { id: "jumeirah-beach-hotel", name: "Jumeirah Beach Hotel", type: "jbh", virtualX: 1220, virtualY: 1380 },
  
  // COASTAL ADS & BILLBOARDS
  { id: "coast-ad-1", name: "Marina Beach Ad", type: "billboard", virtualX: 250, virtualY: 1320, seed: 10, interactive: true },
  { id: "coast-ad-2", name: "JBR Coast Ad", type: "billboard", virtualX: 600, virtualY: 1350, seed: 11, interactive: true },
  { id: "coast-ad-3", name: "Jumeirah Bay Ad", type: "billboard", virtualX: 950, virtualY: 1360, seed: 12, interactive: true },
  { id: "coast-ad-4", name: "Sunset Beach Ad", type: "billboard", virtualX: 1300, virtualY: 1365, seed: 13, interactive: true },
  { id: "coast-ad-5", name: "Kite Beach Ad", type: "billboard", virtualX: 1800, virtualY: 1370, seed: 14, interactive: true },
  { id: "coast-ad-6", name: "La Mer Ad", type: "billboard", virtualX: 2350, virtualY: 1375, seed: 15, interactive: true },

  // SZR HIGHWAY & DOWNTOWN SKYLINE
  { id: "burj-khalifa", name: "Burj Khalifa", type: "burj-khalifa", virtualX: 2050, virtualY: 820 },
  { id: "dubai-mall", name: "The Dubai Mall", type: "mall", virtualX: 2200, virtualY: 820 },
  { id: "motf", name: "Museum of the Future", type: "museum-future", virtualX: 2300, virtualY: 950 },
  { id: "dubai-frame", name: "Dubai Frame", type: "dubai-frame", virtualX: 2500, virtualY: 950 },
  { id: "media-city", name: "Dubai Media City", type: "generic-district", virtualX: 950, virtualY: 1000, seed: 102 },
  { id: "dxb", name: "Dubai International Airport", type: "airport", virtualX: 2750, virtualY: 450 },

  // HIGHWAY TOLLS & SIGNS
  { id: "salik-1", name: "Barsha Salik Gate", type: "salik", virtualX: 1100, virtualY: 1240, rotate: -15 },
  { id: "salik-2", name: "Safi Salik Gate", type: "salik", virtualX: 1900, virtualY: 1040, rotate: -15 },

  // INLAND MASTER COMMUNITIES (Row 1 & Row 2)
  { id: "emirates-hills", name: "Emirates Hills", type: "community-emirates-hills", virtualX: 1050, virtualY: 700 },
  { id: "discovery-gardens", name: "Discovery Gardens", type: "generic-district", virtualX: 750, virtualY: 600, seed: 104 },
  { id: "motor-city", name: "Motor City", type: "community-motor-city", virtualX: 1250, virtualY: 550 },
  { id: "ranches", name: "Arabian Ranches", type: "community-ranches", virtualX: 1450, virtualY: 400 },
  { id: "dubai-hills", name: "Dubai Hills", type: "generic-district", virtualX: 1700, virtualY: 500, seed: 108 },
  { id: "silicon-oasis", name: "Silicon Oasis", type: "generic-district", virtualX: 2400, virtualY: 400, seed: 105 },

  { id: "al-barsha", name: "Al Barsha", type: "generic-district", virtualX: 1350, virtualY: 750, seed: 103 },
  { id: "al-quoz", name: "Al Quoz", type: "generic-district", virtualX: 1700, virtualY: 800, seed: 101 },
  { id: "business-bay", name: "Business Bay", type: "community-business-bay", virtualX: 1900, virtualY: 700 },
  { id: "deira", name: "Deira & Old Dubai", type: "community-deira", virtualX: 2400, virtualY: 600 },

  // INLAND BILLBOARDS
  { id: "ad-desert", name: "Billboard Desert", type: "billboard", virtualX: 1500, virtualY: 350, seed: 206 },
  { id: "ad-airport", name: "Billboard Airport", type: "billboard", virtualX: 2300, virtualY: 250, seed: 208 },

  // CONFIGURABLE APARTMENT COMMUNITY
  {
    id: "luxury-apts-1",
    name: "Luxury Residences",
    type: "configurable-apartment",
    virtualX: 1600,
    virtualY: 1050,
    width: 300,
    height: 250,
    hasPool: true,
    hasParking: true,
    hasCourt: true,
    numBuildings: 4,
    color: "#38bdf8",
    interactive: true
  }
];

const fileContent = `export const mapConfig = { pitch: 45, yaw: 0, startX: -600, startY: -400, startScale: 0.8 };\nexport const mapSeed = ${JSON.stringify(venues, null, 2)};\n`;

fs.writeFileSync('src/data/mapSeed.ts', fileContent);
console.log("Wrote 24-hours-ago clean Dubai mapSeed with", venues.length, "iconic places!");

