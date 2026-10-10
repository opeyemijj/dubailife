const fs = require('fs');
let code = fs.readFileSync('src/components/map/MapBackground.tsx', 'utf8');

if (!code.includes('id="metro-path"')) {
  // Add it back invisibly so the animation works
  code = code.replace('{/* E44 Al Khail Road */}', '<path id="metro-path" d="M -100,900 Q 1500,1200 3100,500" fill="none" stroke="transparent" />\n                {/* E44 Al Khail Road */}');
  fs.writeFileSync('src/components/map/MapBackground.tsx', code);
  console.log("Restored metro-path as invisible anchor");
}
