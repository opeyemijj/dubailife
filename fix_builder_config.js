const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

// 1. Add mapConfig to imports
code = code.replace(/import \{ mapSeed \} from '@\/data\/mapSeed';/, "import { mapSeed, mapConfig as initialConfig } from '@/data/mapSeed';");

// 2. Add state
code = code.replace(/const \[venues, setVenues\] = useState<any\[\]>\(mapSeed\);/, `const [venues, setVenues] = useState<any[]>(mapSeed);
  const [config, setConfig] = useState(initialConfig || { pitch: 45, yaw: 0, startX: -1000, startY: -500, startScale: 0.8 });`);

// 3. Update save button action
code = code.replace(/const res = await saveMapSeed\(venues\);/, "const res = await saveMapSeed(venues, config);");

// 4. Wrap MapBackground in 3D transform container
code = code.replace(
  /<div className="w-\[4000px\] h-\[2600px\] bg-\[#60BAEB\] relative overflow-hidden" onPointerMove=\{handlePointerMove\} onPointerUp=\{handlePointerUp\}>/,
  `<div 
        className="w-[4000px] h-[2600px] bg-[#60BAEB] relative overflow-hidden transition-transform duration-300 origin-center" 
        style={{ transform: \`perspective(2000px) rotateX(\${config.pitch}deg) rotateZ(\${config.yaw}deg)\`, transformStyle: 'preserve-3d' }}
        onPointerMove={handlePointerMove} 
        onPointerUp={handlePointerUp}
      >`
);

// 5. Add Sidebar UI for Camera
const cameraUI = `
                <div className="mb-6 p-4 bg-slate-800 rounded-lg shadow-inner">
                    <h3 className="text-white font-bold mb-3 flex justify-between items-center">
                        <span>Camera Settings</span>
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className={labelClass + " text-slate-300"}>Pitch (Angle)</label>
                            <input type="range" min="0" max="80" value={config.pitch} onChange={e => setConfig({...config, pitch: parseInt(e.target.value)})} className="w-full" />
                        </div>
                        <div>
                            <label className={labelClass + " text-slate-300"}>Yaw (Rotation)</label>
                            <input type="range" min="-180" max="180" value={config.yaw} onChange={e => setConfig({...config, yaw: parseInt(e.target.value)})} className="w-full" />
                        </div>
                        <div>
                            <label className={labelClass + " text-slate-300"}>Default Scale (Explore)</label>
                            <input type="number" step="0.1" value={config.startScale} onChange={e => setConfig({...config, startScale: parseFloat(e.target.value)})} className={inputClass} />
                        </div>
                        <div className="flex space-x-2">
                            <div className="flex-1">
                                <label className={labelClass + " text-slate-300"}>Start X</label>
                                <input type="number" value={config.startX} onChange={e => setConfig({...config, startX: parseInt(e.target.value)})} className={inputClass} />
                            </div>
                            <div className="flex-1">
                                <label className={labelClass + " text-slate-300"}>Start Y</label>
                                <input type="number" value={config.startY} onChange={e => setConfig({...config, startY: parseInt(e.target.value)})} className={inputClass} />
                            </div>
                        </div>
                    </div>
                </div>
`;
code = code.replace(/<div className="mb-6">/, cameraUI + '\n                <div className="mb-6">');

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Updated BuilderClient with Camera Config!");
