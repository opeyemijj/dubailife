const https = require('https');

https.get('https://lagoslife.app', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // Extract everything between <svg> and </svg>
    const svgMatches = data.match(/<svg[\s\S]*?<\/svg>/g) || [];
    console.log(`Found ${svgMatches.length} SVGs inline.`);
    if (svgMatches.length > 0) {
      console.log("Sample SVG:", svgMatches[0].substring(0, 300));
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
