const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Update venueActions
const venueActionsRegex = /const venueActions: Record<string, ActionDef\[\]> = \{[\s\S]*?\};/;
const newVenueActions = `const venueActions: Record<string, ActionDef[]> = {
  club: [{ label: "Book VIP Table", amount: -2500, color: "bg-purple-600" }, { label: "General Entry", amount: -200, color: "bg-pink-500" }],
  'beach-club': [{ label: "Rent Cabana", amount: -1500, color: "bg-sky-500" }, { label: "Day Pass", amount: -300, color: "bg-cyan-600" }],
  rooftop: [{ label: "Sunset Drinks", amount: -400, color: "bg-indigo-500" }],
  restaurant: [{ label: "Dinner for Two", amount: -800, color: "bg-orange-500" }],
  mall: [{ label: "Go Shopping", amount: -300, color: "bg-blue-500" }],
  hotel: [{ label: "Check-in", amount: -500, color: "bg-yellow-500" }],
  beach: [{ label: "Relax", amount: -50, color: "bg-cyan-500" }],
  office: [{ label: "Work Shift", amount: +800, color: "bg-purple-500" }],
  school: [{ label: "Pay Tuition", amount: -2000, color: "bg-green-600" }],
  hospital: [{ label: "Medical Checkup", amount: -600, color: "bg-red-500" }],
  casino: [{ label: "Play Slots", amount: -1000, color: "bg-yellow-400" }, { label: "VIP Poker", amount: -5000, color: "bg-red-600" }],
  stadium: [{ label: "Watch Match", amount: -400, color: "bg-blue-600" }],
  park: [{ label: "Picnic", amount: -20, color: "bg-green-500" }],
  airport: [{ label: "Book Flight", amount: -3500, color: "bg-slate-700" }],
  salik: [{ label: "Pay Toll", amount: -4, color: "bg-red-500" }],
  billboard: [{ label: "View Advertisement", amount: 50, color: "bg-gray-600" }]
};`;
code = code.replace(venueActionsRegex, newVenueActions);

// 2. Inject Real Estate UI
const dialogContentRegex = /<p className="text-gray-500 font-medium mb-6 px-4">\s*You have arrived at \{selectedVenue.name\}. What would you like to do\?\s*<\/p>/;
const realEstateUI = `<p className="text-gray-500 font-medium mb-6 px-4">
                  {selectedVenue.description || \`You have arrived at \${selectedVenue.name}.\`} What would you like to do?
                </p>

                {selectedVenue.type === 'small-house' && (
                  <div className="w-full mb-6 p-4 bg-slate-50 rounded-2xl border-2 border-slate-200">
                    <h4 className="font-black text-slate-800 mb-3 text-lg">Real Estate Options</h4>
                    <div className="flex gap-3">
                      <button onClick={() => showToast('House purchased for AED ' + (selectedVenue.price || 1500000).toLocaleString(), 'debit')} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2">
                        <span>BUY</span>
                        <span className="text-xs bg-green-700 px-2 py-1 rounded">{(selectedVenue.price || 1500000).toLocaleString()} AED</span>
                      </button>
                      <button onClick={() => showToast('House rented for AED ' + (selectedVenue.rent || 10000).toLocaleString(), 'debit')} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2">
                        <span>RENT</span>
                        <span className="text-xs bg-blue-700 px-2 py-1 rounded">{(selectedVenue.rent || 10000).toLocaleString()}/mo</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {selectedVenue.type === 'apartment-building' && (
                  <div className="w-full mb-6 text-left">
                    <h4 className="font-black text-slate-800 mb-3 ml-1 text-lg">Available Units</h4>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 rounded-xl">
                      {Array.from({length: selectedVenue.floors || 5}).map((_, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div>
                            <span className="font-bold text-slate-700 block">Unit {(i+1)*101}</span>
                            <span className="text-xs text-slate-500">{i%2===0 ? '2 Bed, 1 Bath' : 'Studio'}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => showToast('Bought unit for AED 800,000', 'debit')} className="bg-green-500 font-bold text-white px-3 py-2 text-xs rounded-lg hover:bg-green-600">BUY</button>
                            <button onClick={() => showToast('Rented unit for AED 4,500/mo', 'debit')} className="bg-blue-500 font-bold text-white px-3 py-2 text-xs rounded-lg hover:bg-blue-600">RENT</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}`;
code = code.replace(dialogContentRegex, realEstateUI);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Updated InteractiveMap.tsx with UI logic");
