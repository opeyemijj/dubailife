const fs = require('fs');
let code = fs.readFileSync('src/components/map/Icons.tsx', 'utf8');

// Replace IsoBox and IsoGround with standard rectangular Oblique projections
const isoBoxRegex = /export const IsoBox = \(\{[\s\S]*?<\/g>\n  \);\n\};/;
const obliqueBox = `export const IsoBox = ({ x=0, y=0, w=40, d=40, h=40, color="#3b82f6", label="", onClick }: any) => {
  const frontColor = color;
  const topColor = "#e2e8f0";
  const sideColor = "#94a3b8";

  // In an oblique or top-down 3D perspective without Z rotation, 
  // the front is a flat rectangle facing the camera.
  // The roof is above it.
  
  return (
    <g transform={\`translate(\${x}, \${y})\`} className={onClick ? "cursor-pointer" : ""} onClick={onClick}>
      {/* Front Face */}
      <rect x={-w/2} y={-h} width={w} height={h} fill={frontColor} stroke="#1e40af" strokeWidth="0.5" />
      {/* Top Face */}
      <polygon points={\`-\${w/2},-\${h} \${w/2},-\${h} \${w/2+d/4},-\${h+d/2} -\${w/2-d/4},-\${h+d/2}\`} fill={topColor} stroke="#cbd5e1" strokeWidth="0.5" />
      {/* Side Face (if needed, but usually front+top is enough for 2.5D top-down) */}
      <polygon points={\`\${w/2},0 \${w/2},-\${h} \${w/2+d/4},-\${h+d/2} \${w/2+d/4},-\${d/2}\`} fill={sideColor} stroke="#64748b" strokeWidth="0.5" />
      
      {/* Windows Front */}
      <rect x={-w/2+4} y={-h+4} width={w-8} height={h-8} fill="#bae6fd" opacity="0.6" />

      {label && (
        <g transform={\`translate(0, -\${h + d/2 + 15})\`}>
          <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#334155" strokeWidth="1" />
          <text x="0" y="3" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">{label}</text>
        </g>
      )}
    </g>
  );
};`;

const isoGroundRegex = /export const IsoGround = \(\{[\s\S]*?<\/g>\n\);/;
const obliqueGround = `export const IsoGround = ({ w=100, d=100, color="#84cc6d", edge="#4ade80", thickness=10 }: any) => (
  <g>
    <rect x={-w/2} y={-d/2} width={w} height={d} fill={color} />
    <rect x={-w/2} y={d/2} width={w} height={thickness} fill={edge} />
    <polygon points={\`\${w/2},-\${d/2} \${w/2+thickness},-\${d/2-thickness} \${w/2+thickness},\${d/2-thickness} \${w/2},\${d/2}\`} fill={edge} opacity="0.8" />
  </g>
);`;

if (isoBoxRegex.test(code)) {
  code = code.replace(isoBoxRegex, obliqueBox);
  code = code.replace(isoGroundRegex, obliqueGround);
  fs.writeFileSync('src/components/map/Icons.tsx', code);
  console.log("Successfully replaced IsoBox with top-down Oblique Box!");
} else {
  console.log("Could not find IsoBox regex");
}
