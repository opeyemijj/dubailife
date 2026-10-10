const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

const modalJSX = `
      <Dialog open={adModalOpen} onOpenChange={setAdModalOpen}>
        <DialogContent className="bg-white text-gray-900 border-none shadow-2xl sm:max-w-md z-[100] rounded-3xl">
           <DialogHeader><DialogTitle className="text-2xl font-black">Purchase Land Ad Space</DialogTitle></DialogHeader>
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

if (!code.includes('Purchase Land Ad Space')) {
  code = code.replace('</TransformWrapper>', '</TransformWrapper>\n' + modalJSX);
  fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
  console.log("Patched modal successfully!");
}
