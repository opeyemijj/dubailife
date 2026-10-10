const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

const replacement = `
                <div className="p-4 border-b shrink-0">
                    <Button variant="outline" className="w-full" onClick={addNew}>+ Add Component</Button>
                </div>
                
                {selectedId && (
                    <div className="p-4 border-b shrink-0 bg-white max-h-[55%] overflow-y-auto">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-700 border-b pb-2">Selected Component</h3>
                            {(() => {
                                const sel = venues.find(v => v.id === selectedId);
                                if (!sel) return null;
                                return (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                                            <input className="w-full border rounded px-2 py-1 text-sm bg-gray-100" value={sel.id} readOnly />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                            <input className="w-full border rounded px-2 py-1 text-sm" value={sel.name} onChange={e => updateSelected('name', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                            <input className="w-full border rounded px-2 py-1 text-sm" value={sel.type} onChange={e => updateSelected('type', e.target.value)} />
                                        </div>
                                        <div className="flex space-x-2">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">X</label>
                                                <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={sel.virtualX} onChange={e => updateSelected('virtualX', parseInt(e.target.value)||0)} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Y</label>
                                                <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={sel.virtualY} onChange={e => updateSelected('virtualY', parseInt(e.target.value)||0)} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex space-x-2 mt-2">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Width</label>
                                                <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={sel.width || ''} onChange={e => updateSelected('width', parseInt(e.target.value))} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Height</label>
                                                <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={sel.height || ''} onChange={e => updateSelected('height', parseInt(e.target.value))} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Rotate</label>
                                                <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={sel.rotate || 0} onChange={e => updateSelected('rotate', parseInt(e.target.value)||0)} />
                                            </div>
                                        </div>

                                        <Button variant="destructive" className="w-full mt-4" onClick={deleteSelected}>Delete</Button>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 relative">
                    <h3 className="font-semibold text-gray-700 border-b pb-2 mb-2 sticky top-0 bg-gray-50 z-10">
                        All Components ({venues.length})
                    </h3>
                    <div className="space-y-1">
                        {venues.map(v => (
                            <div 
                                key={v.id}
                                className={\`text-sm p-2 rounded cursor-pointer flex justify-between items-center \${selectedId === v.id ? 'bg-blue-100 border-blue-300 border' : 'hover:bg-gray-100 border border-transparent'}\`}
                                onClick={() => setSelectedId(v.id as any)}
                            >
                                <div className="truncate flex-1">
                                    <strong>{v.name}</strong> <span className="text-xs text-gray-500 block">{v.type}</span>
                                </div>
                                <button 
                                    className="text-red-500 hover:text-red-700 p-1 font-bold text-lg leading-none"
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setVenues(prev => prev.filter(x => x.id !== v.id));
                                        if (selectedId === v.id) setSelectedId(null);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
`;

// Extract from <div className="p-4 border-b"> down to </div>\n            </div>\n            \n            {/* Map Area */}
const regex = /<div className="p-4 border-b">[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* Map Area \*\/\}/;
code = code.replace(regex, replacement + '\n            {/* Map Area */}');

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Fixed sidebar layout!");
