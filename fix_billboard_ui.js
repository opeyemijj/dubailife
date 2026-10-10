const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

const bbInputs = `
{sel.type === 'giant-billboard' && (
    <div className="mt-4 p-3 bg-slate-100 rounded-md border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-700 text-xs uppercase mb-2">Billboard Ad Settings</h4>
        <div className="flex space-x-3">
            <div className="flex-1">
                <label className={labelClass}>Text Part 1</label>
                <input type="text" className={inputClass} value={sel.text1 || ''} placeholder="yad" onChange={e => updateSelected('text1', e.target.value)} />
            </div>
            <div className="flex-1">
                <label className={labelClass}>Color 1</label>
                <div className="flex space-x-2">
                    <input type="color" className="w-10 h-8 p-0 border-0 rounded cursor-pointer" value={sel.color1 || '#064e3b'} onChange={e => updateSelected('color1', e.target.value)} />
                </div>
            </div>
        </div>
        <div className="flex space-x-3">
            <div className="flex-1">
                <label className={labelClass}>Text Part 2</label>
                <input type="text" className={inputClass} value={sel.text2 || ''} placeholder="sale" onChange={e => updateSelected('text2', e.target.value)} />
            </div>
            <div className="flex-1">
                <label className={labelClass}>Color 2</label>
                <div className="flex space-x-2">
                    <input type="color" className="w-10 h-8 p-0 border-0 rounded cursor-pointer" value={sel.color2 || '#16a34a'} onChange={e => updateSelected('color2', e.target.value)} />
                </div>
            </div>
        </div>
    </div>
)}
`;

code = code.replace(/<Button variant="destructive" className="w-full mt-4 font-bold" onClick=\{deleteSelected\}>Delete Component<\/Button>/, bbInputs + '\n                                        <Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>');

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Added billboard inputs to builder!");
