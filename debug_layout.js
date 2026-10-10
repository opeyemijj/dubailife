function getCoast(x) {
    let t = x / 4000;
    return Math.pow(1 - t, 2) * 1300 + 2 * (1 - t) * t * 1600 + Math.pow(t, 2) * 900;
}
function getRoad(x) {
    let t = x / 4000;
    return Math.pow(1 - t, 2) * 1150 + 2 * (1 - t) * t * 1450 + Math.pow(t, 2) * 750;
}
function getDOM(y_svg) {
    return 2600 - y_svg;
}

const locations = [
  {name: "JBR", x: 550, virtualY: 1300, h: 90},
  {name: "Palm", x: 1000, virtualY: 1600, h: 400},
  {name: "Bluewaters", x: 400, virtualY: 1550, h: 200},
  {name: "Burj Al Arab", x: 1400, virtualY: 1450, h: 100}
];

locations.forEach(loc => {
    let coastSvg = getCoast(loc.x);
    let roadSvg = getRoad(loc.x);
    let coastDom = getDOM(coastSvg);
    let roadDom = getDOM(roadSvg);
    let centerDom = getDOM(loc.virtualY);
    let topDom = centerDom - (loc.h * 0.9);
    let bottomDom = centerDom + (loc.h * 0.1);
    
    console.log("--- " + loc.name + " at X=" + loc.x + " ---");
    console.log("Coast DOM: " + coastDom.toFixed(1) + ", Road DOM: " + roadDom.toFixed(1));
    console.log("Item DOM spans: " + topDom.toFixed(1) + " to " + bottomDom.toFixed(1) + " (Anchor " + centerDom + ")");
});
