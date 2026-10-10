const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

// Replace the entire sidebar with a cleaner UI
const newSidebar = `
            {/* Sidebar */}
            <div className="w-96 border-r bg-gray-50 flex flex-col z-50 shadow-xl">
                <div className="p-4 border-b flex justify-between items-center bg-slate-900 text-white shrink-0">
                    <h2 className="font-bold text-lg tracking-tight">Admin Builder</h2>
                    <Button size="sm" variant="secondary" onClick={handleSave} className="font-bold">Save Map</Button>
                </div>
                
                <div className="p-4 border-b shrink-0 bg-white">
                    <Button variant="default" className="w-full font-bold bg-blue-600 hover:bg-blue-700" onClick={addNew}>+ Create New Component</Button>
                </div>
                
                {selectedId && (
                    <div className="p-5 border-b shrink-0 bg-white max-h-[55%] overflow-y-auto shadow-inner">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h3 className="font-bold text-slate-800">Edit Selected</h3>
                                <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">ID: {selectedId}</span>
                            </div>
                            {(() => {
                                const sel = venues.find(v => v.id === selectedId);
                                if (!sel) return null;
                                
                                const inputClass = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm";
                                const labelClass = "block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide";
                                
                                return (
                                    <>
                                        <div>
                                            <label className={labelClass}>Name</label>
                                            <input className={inputClass} value={sel.name} onChange={e => updateSelected('name', e.target.value)} placeholder="e.g. Marina Block" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Component Type</label>
                                            <input className={inputClass} value={sel.type} onChange={e => updateSelected('type', e.target.value)} placeholder="e.g. community-jbr" />
                                        </div>
                                        <div className="flex space-x-3">
                                            <div className="flex-1">
                                                <label className={labelClass}>X Position</label>
                                                <input type="number" className={inputClass} value={sel.virtualX} onChange={e => updateSelected('virtualX', parseInt(e.target.value)||0)} />
                                            </div>
                                            <div className="flex-1">
                                                <label className={labelClass}>Y Position</label>
                                                <input type="number" className={inputClass} value={sel.virtualY} onChange={e => updateSelected('virtualY', parseInt(e.target.value)||0)} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex space-x-3 mt-2">
                                            <div className="flex-1">
                                                <label className={labelClass}>Width</label>
                                                <input type="number" className={inputClass} value={sel.width || ''} placeholder="Auto" onChange={e => updateSelected('width', parseInt(e.target.value))} />
                                            </div>
                                            <div className="flex-1">
                                                <label className={labelClass}>Height</label>
                                                <input type="number" className={inputClass} value={sel.height || ''} placeholder="Auto" onChange={e => updateSelected('height', parseInt(e.target.value))} />
                                            </div>
                                            <div className="flex-1">
                                                <label className={labelClass}>Rotate</label>
                                                <input type="number" className={inputClass} value={sel.rotate || 0} onChange={e => updateSelected('rotate', parseInt(e.target.value)||0)} />
                                            </div>
                                        </div>

                                        <Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 relative">
                    <div className="sticky top-0 bg-slate-50 z-10 pb-2 mb-3 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800">Map Directory</h3>
                        <p className="text-xs text-slate-500">{venues.length} components placed</p>
                    </div>
                    <div className="space-y-1.5">
                        {venues.map(v => (
                            <div 
                                key={v.id}
                                className={\`text-sm p-3 rounded-md cursor-pointer flex justify-between items-center transition-all \${selectedId === v.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'}\`}
                                onClick={() => setSelectedId(v.id as any)}
                            >
                                <div className="truncate flex-1 pr-2">
                                    <strong className="block truncate">{v.name}</strong> 
                                    <span className={\`text-xs block truncate \${selectedId === v.id ? 'text-blue-200' : 'text-slate-400'}\`}>{v.type}</span>
                                </div>
                                <button 
                                    className={\`p-1.5 rounded-md font-bold text-lg leading-none transition-colors \${selectedId === v.id ? 'text-white hover:bg-blue-700' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}\`}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setVenues(prev => prev.filter(x => x.id !== v.id));
                                        if (selectedId === v.id) setSelectedId(null);
                                    }}
                                    title="Delete"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
`;

const regex = /\{\/\* Sidebar \*\/\}.*?(?=\{\/\* Map Area \*\/\})/s;
code = code.replace(regex, newSidebar + '            ');

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Upgraded admin UI!");
