const https = require('https');
const fs = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  try {
    const html = await fetch('https://lagoslife.app');
    fs.writeFileSync('lagos.html', html);
    
    // Find all JS chunks
    const chunks = html.match(/src="(\/_next\/static\/chunks\/[^"]+)"/g) || [];
    console.log(`Found ${chunks.length} chunks.`);
    
    for (let chunk of chunks) {
      const url = 'https://lagoslife.app' + chunk.replace('src="', '').replace('"', '');
      const js = await fetch(url);
      
      // Look for SVGs, canvas, or specific transforms
      if (js.includes('rotateX') || js.includes('perspective') || js.includes('svg') || js.includes('transform:')) {
        console.log(`Found interesting stuff in ${url}`);
        // Dump the context around rotateX
        const rxMatch = js.match(/.{0,50}rotateX.{0,50}/g);
        if (rxMatch) console.log("rotateX contexts:", rxMatch.slice(0, 3));
        
        const svgMatch = js.match(/.{0,50}createElement\("svg".{0,50}/g);
        if (svgMatch) console.log("SVG contexts:", svgMatch.slice(0, 3));
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
