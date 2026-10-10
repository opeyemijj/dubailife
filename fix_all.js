const fs = require('fs');

let intCode = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');
if (!intCode.includes('mapConfig')) {
  intCode = intCode.replace(/import \{ mapSeedVenues \} from "@\/data\/mapSeed";/, "import { mapSeedVenues, mapConfig } from '@/data/mapSeed';");
  intCode = intCode.replace(
    /<TransformWrapper[\s\S]*?limitToBounds=\{false\}>/,
    `<TransformWrapper 
          initialScale={mapConfig?.startScale || 0.8} 
          initialPositionX={mapConfig?.startX || -1000} 
          initialPositionY={mapConfig?.startY || -500} 
          minScale={minScale} 
          maxScale={3} 
          limitToBounds={false}
        >`
  );
  intCode = intCode.replace(
    /<div className="w-\[4000px\] h-\[2600px\] bg-\[#60BAEB\] relative pointer-events-auto">/,
    `<div className="w-[4000px] h-[2600px] bg-[#60BAEB] relative pointer-events-auto origin-center transition-transform duration-500" style={{ transform: \`perspective(2500px) rotateX(\${mapConfig?.pitch || 0}deg) rotateZ(\${mapConfig?.yaw || 0}deg)\`, transformStyle: 'preserve-3d' }}>`
  );
  fs.writeFileSync('src/components/map/InteractiveMap.tsx', intCode);
}

let bldCode = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');
if (!bldCode.includes('mapConfig')) {
  bldCode = bldCode.replace(/import \{ mapSeedVenues \} from '@\/data\/mapSeed';/, "import { mapSeedVenues, mapConfig as initialConfig } from '@/data/mapSeed';");
  
  bldCode = bldCode.replace(/const \[venues, setVenues\] = useState\(mapSeedVenues\);/, `const [venues, setVenues] = useState(mapSeedVenues);
  const [config, setConfig] = useState(initialConfig || { pitch: 45, yaw: 0, startX: -1000, startY: -500, startScale: 0.8 });`);

  bldCode = bldCode.replace(/const res = await saveMapSeed\(venues\);/, "const res = await saveMapSeed(venues, config);");

  bldCode = bldCode.replace(
    /<div className="w-\[4000px\] h-\[2600px\] bg-\[#60BAEB\] relative overflow-hidden" onPointerMove=\{handlePointerMove\} onPointerUp=\{handlePointerUp\}>/,
    `<div 
        className="w-[4000px] h-[2600px] bg-[#60BAEB] relative overflow-hidden transition-transform duration-300 origin-center" 
        style={{ transform: \`perspective(2000px) rotateX(\${config?.pitch || 0}deg) rotateZ(\${config?.yaw || 0}deg)\`, transformStyle: 'preserve-3d' }}
        onPointerMove={handlePointerMove} 
        onPointerUp={handlePointerUp}
      >`
  );

  const cameraUI = `
                <div className="mb-6 p-4 bg-slate-800 rounded-lg shadow-inner">
                    <h3 className="text-white font-bold mb-3 flex justify-between items-center">
                        <span>Camera Settings</span>
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className={labelClass + " text-slate-300"}>Pitch (Angle)</label>
                            <input type="range" min="0" max="80" value={config?.pitch || 0} onChange={e => setConfig({...config, pitch: parseInt(e.target.value)})} className="w-full" />
                        </div>
                        <div>
                            <label className={labelClass + " text-slate-300"}>Yaw (Rotation)</label>
                            <input type="range" min="-180" max="180" value={config?.yaw || 0} onChange={e => setConfig({...config, yaw: parseInt(e.target.value)})} className="w-full" />
                        </div>
                        <div>
                            <label className={labelClass + " text-slate-300"}>Default Scale (Explore)</label>
                            <input type="number" step="0.1" value={config?.startScale || 1} onChange={e => setConfig({...config, startScale: parseFloat(e.target.value)})} className={inputClass} />
                        </div>
                        <div className="flex space-x-2">
                            <div className="flex-1">
                                <label className={labelClass + " text-slate-300"}>Start X</label>
                                <input type="number" value={config?.startX || 0} onChange={e => setConfig({...config, startX: parseInt(e.target.value)})} className={inputClass} />
                            </div>
                            <div className="flex-1">
                                <label className={labelClass + " text-slate-300"}>Start Y</label>
                                <input type="number" value={config?.startY || 0} onChange={e => setConfig({...config, startY: parseInt(e.target.value)})} className={inputClass} />
                            </div>
                        </div>
                    </div>
                </div>
`;
  bldCode = bldCode.replace(/<div className="mb-6">/, cameraUI + '\n                <div className="mb-6">');
  
  fs.writeFileSync('src/components/admin/BuilderClient.tsx', bldCode);
}
console.log("Fixed UI config references");
