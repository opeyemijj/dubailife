const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const adDefinitions = `
type AdPlacement = { id: string; gridX: number; gridY: number; w: number; h: number; img: string; };
const initialAds: AdPlacement[] = [
  { id: 'ad-init-1', gridX: 2, gridY: 2, w: 4, h: 4, img: 'https://placehold.co/80x80/ef4444/white?text=HOT+SALE' },
  { id: 'ad-init-2', gridX: 8, gridY: 1, w: 10, h: 3, img: 'https://placehold.co/200x60/3b82f6/white?text=YOUR+AD+HERE' },
  { id: 'ad-init-3', gridX: 25, gridY: 8, w: 6, h: 6, img: 'https://placehold.co/120x120/10b981/white?text=BUY+LAND' },
];
`;

if (!code.includes('type AdPlacement')) {
  code = code.replace('export function InteractiveMap() {', adDefinitions + '\nexport function InteractiveMap() {');
}

const stateInjections = `
  const [ads, setAds] = useState<AdPlacement[]>(initialAds);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [adTargetCell, setAdTargetCell] = useState<{x: number, y: number} | null>(null);
  const [adForm, setAdForm] = useState({ w: 2, h: 2, imgBase64: '' });
  
  const handleAdGridClick = (e: React.MouseEvent<SVGRectElement>) => {
    e.stopPropagation();
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    const gridX = Math.floor(x / 20);
    const gridY = Math.floor(y / 20);
    
    const clickedAd = ads.find(a => gridX >= a.gridX && gridX < a.gridX + a.w && gridY >= a.gridY && gridY < a.gridY + a.h);
    if (clickedAd) {
       showToast('Ad space already rented!', 'debit');
    } else {
       setAdTargetCell({ x: gridX, y: gridY });
       setAdForm({ w: 4, h: 4, imgBase64: '' });
       setAdModalOpen(true);
    }
  };
  
  const handleAdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onload = (ev) => setAdForm(prev => ({ ...prev, imgBase64: ev.target?.result as string }));
     reader.readAsDataURL(file);
  };
  
  const purchaseAdSpace = () => {
     if (!adTargetCell || !adForm.imgBase64) return;
     const cost = adForm.w * adForm.h * 500;
     if (walletBalance < cost) {
        showToast('Not enough D-Coins!', 'debit');
        return;
     }
     
     const isOverlap = ads.some(a => {
        return adTargetCell.x < a.gridX + a.w && adTargetCell.x + adForm.w > a.gridX &&
               adTargetCell.y < a.gridY + a.h && adTargetCell.y + adForm.h > a.gridY;
     });
     
     if (isOverlap) {
        showToast('Ad overlaps with another!', 'debit');
        return;
     }
     if (adTargetCell.x + adForm.w > 40 || adTargetCell.y + adForm.h > 20) {
        showToast('Ad exceeds grid bounds!', 'debit');
        return;
     }
     
     setWalletBalance(prev => prev - cost);
     setAds(prev => [...prev, {
        id: 'ad-' + Date.now(),
        gridX: adTargetCell.x,
        gridY: adTargetCell.y,
        w: adForm.w,
        h: adForm.h,
        img: adForm.imgBase64
     }]);
     showToast('Ad Space Purchased!', 'credit');
     setAdModalOpen(false);
  };
`;

if (!code.includes('const [ads, setAds]')) {
  code = code.replace(/const \[toastMsg, setToastMsg\].*?;/, match => match + '\n' + stateInjections);
}

// Add the venue
if (!code.includes('id: "ad-land"')) {
  code = code.replace('// Master Communities', '// Master Communities\n        { id: "ad-land", name: "Million Dirham Homepage", type: "ad-land", virtualX: 400, virtualY: 400, interactive: false },');
}

// Update allRenderedEntities checking for ad-land
code = code.replace(
  /const isOverlay = (.*?);/, 
  'const isOverlay = $1 || loc.type === "ad-land";'
);
code = code.replace(
  /const zClass = loc\.type === 'generic-district' \? 'z-10' : \(isOverlay \? 'z-20' : 'z-30'\);/,
  "const zClass = (loc.type === 'generic-district' || loc.type === 'ad-land') ? 'z-10' : (isOverlay ? 'z-20' : 'z-30');"
);

// Inject the rendering block
const adLandRender = `
                  {loc.type === 'ad-land' ? (
                     <div className="relative">
                        <svg viewBox="0 0 800 400" className="w-[800px] h-[400px] drop-shadow-2xl z-10 cursor-pointer rounded-xl bg-[#3b82f6]">
                           <defs>
                              <pattern id="adGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                 <rect width="20" height="20" fill="transparent" stroke="#60a5fa" strokeWidth="1" />
                              </pattern>
                           </defs>
                           <rect width="800" height="400" fill="url(#adGrid)" />
                           {ads.map(ad => (
                              <image key={ad.id} href={ad.img} x={ad.gridX * 20} y={ad.gridY * 20} width={ad.w * 20} height={ad.h * 20} preserveAspectRatio="none" className="pointer-events-none" />
                           ))}
                           <rect width="800" height="400" fill="transparent" onClick={handleAdGridClick} />
                        </svg>
                        <div className="absolute top-2 left-2 bg-white/90 px-3 py-1 rounded-md font-black text-blue-600 shadow-sm pointer-events-none tracking-widest text-sm">
                           MILLION DIRHAM HOMEPAGE - CLICK TO ADVERTISE
                        </div>
                     </div>
                  ) : (
                     <>
                        <div className={\`\${loc.size || ''} transition-transform \${loc.interactive !== false && !isOverlay ? 'group-hover:-translate-y-2' : ''} flex justify-center items-end\`}>
                           {getBuildingSprite(loc.id, loc.type, loc.seed, loc.name)}
                        </div>

                        {loc.interactive !== false && !loc.type.startsWith('community') && loc.type !== 'generic-district' && loc.type !== 'airport' && (
                           <div className="absolute top-0 -translate-y-[50%] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                              <div className="bg-white px-3 py-1.5 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.3)] font-black text-gray-800 text-[13px] tracking-wide whitespace-nowrap border-2 border-gray-100">
                                 {loc.name}
                              </div>
                           </div>
                        )}
                     </>
                  )}
`;

code = code.replace(/<div className={`\$\{loc\.size \|\| ''\}[\s\S]*?\{\/\* Hover label \*\/\}/, '/* REPLACED */');
// Wait, regex might fail here. Let's do a precise string replacement.
const stringToReplace = `<div className={\`\${loc.size || ''} transition-transform \${loc.interactive !== false && !isOverlay ? 'group-hover:-translate-y-2' : ''} flex justify-center items-end\`}>
                     {getBuildingSprite(loc.id, loc.type, loc.seed, loc.name)}
                  </div>

                  {loc.interactive !== false && !loc.type.startsWith('community') && loc.type !== 'generic-district' && loc.type !== 'airport' && (
                    <div className="absolute top-0 -translate-y-[50%] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                      <div className="bg-white px-3 py-1.5 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.3)] font-black text-gray-800 text-[13px] tracking-wide whitespace-nowrap border-2 border-gray-100">
                         {loc.name}
                      </div>
                    </div>
                  )}`;

if (code.includes(stringToReplace)) {
  code = code.replace(stringToReplace, adLandRender);
} else {
  console.log("Could not find render block to replace.");
}

// Inject Modal
const modalJSX = `
      <Dialog open={adModalOpen} onOpenChange={setAdModalOpen}>
        <DialogContent className="bg-white text-gray-900 border-none shadow-2xl sm:max-w-md z-[100] rounded-3xl">
           <DialogHeader><DialogTitle className="text-2xl font-black">Rent Ad Space</DialogTitle></DialogHeader>
           <div className="flex flex-col gap-4 py-4">
              <p className="text-sm text-gray-500 font-bold">Selected Cell: {adTargetCell?.x}, {adTargetCell?.y}</p>
              
              <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Width (Blocks)</label>
                    <input type="number" min="1" max={40 - (adTargetCell?.x || 0)} value={adForm.w} onChange={e => setAdForm({...adForm, w: parseInt(e.target.value)||1})} className="w-full border rounded-lg p-2 font-bold" />
                 </div>
                 <div className="flex-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Height (Blocks)</label>
                    <input type="number" min="1" max={20 - (adTargetCell?.y || 0)} value={adForm.h} onChange={e => setAdForm({...adForm, h: parseInt(e.target.value)||1})} className="w-full border rounded-lg p-2 font-bold" />
                 </div>
              </div>
              
              <div>
                 <label className="text-xs font-bold text-gray-400 uppercase">Upload Image</label>
                 <input type="file" accept="image/*" onChange={handleAdUpload} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              
              {adForm.imgBase64 && (
                 <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={adForm.imgBase64} alt="Preview" className="max-h-full object-contain" />
                 </div>
              )}
              
              <div className="mt-4 pt-4 border-t">
                 <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-gray-600">Total Cost:</span>
                    <span className="text-xl font-black text-green-600">{(adForm.w * adForm.h * 500).toLocaleString()} AED</span>
                 </div>
                 <Button onClick={purchaseAdSpace} className="w-full h-12 rounded-xl text-lg font-black bg-blue-600 hover:bg-blue-700 text-white">
                    Purchase Space
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>
`;

if (!code.includes('Rent Ad Space')) {
  code = code.replace('</TransformWrapper>', '</TransformWrapper>\n' + modalJSX);
}

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Done");
