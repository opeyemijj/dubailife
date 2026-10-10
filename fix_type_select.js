const fs = require('fs');

let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

const selectHTML = `
                                            <select className={inputClass} value={sel.type} onChange={e => updateSelected('type', e.target.value)}>
                                                <option value="configurable-apartment">Configurable Apartment</option>
                                                <option value="giant-billboard">Giant Billboard</option>
                                                <option value="dynamic-community">Dynamic Community Grid</option>
                                                <option value="road-path">Road Path (SVG Spline)</option>
                                                <option value="bridge">Bridge</option>
                                                <option value="marina">Marina (Yachts)</option>
                                                <option value="hotel">Hotel Resort</option>
                                                <option value="mall">Shopping Mall</option>
                                                <option value="museum-future">Museum of the Future</option>
                                                <option value="apartment-complex">Apartment Complex</option>
                                                <option value="generic-district">Generic District</option>
                                                <option value="estate-base">Estate Base</option>
                                                <option value="small-house">Small House</option>
                                                <option value="apartment-building">Apartment Building</option>
                                                <option value="rooftop">Rooftop Lounge</option>
                                                <option value="club">Nightclub</option>
                                                <option value="beach-club">Beach Club</option>
                                                <option value="restaurant">Restaurant</option>
                                                <option value="billboard">Billboard</option>
                                                <option value="airport">Airport</option>
                                                <option value="community-emirates-hills">Emirates Hills</option>
                                                <option value="community-jbr">JBR</option>
                                                <option value="community-bluewaters">Bluewaters</option>
                                                <option value="community-ranches">Arabian Ranches</option>
                                                <option value="community-palm">Palm Community</option>
                                                <option value="community-motor-city">Motor City</option>
                                                <option value="community-deira">Deira</option>
                                                <option value="community-business-bay">Business Bay</option>
                                                <option value="salik">Salik Gate</option>
                                            </select>
`;

code = code.replace(
    /<input className=\{inputClass\} value=\{sel\.type\} onChange=\{e => updateSelected\('type', e\.target\.value\)\} placeholder="e\.g\. community-jbr" \/>/,
    selectHTML.trim()
);

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Updated type input to select dropdown");
