const fs = require('fs');

function getRoadY(x) {
    let t = (x + 100) / 3200;
    return Math.pow(1 - t, 2) * 1150 + 2 * (1 - t) * t * 1450 + Math.pow(t, 2) * 750;
}

const burjStart = getRoadY(1150);
const palmStart = getRoadY(750);
const bwStart = getRoadY(450);

console.log(`Burj Bridge Start: M 1150 ${burjStart.toFixed(1)}`);
console.log(`Palm Bridge Start: M 750 ${palmStart.toFixed(1)}`);
console.log(`BW Bridge Start: M 450 ${bwStart.toFixed(1)}`);
