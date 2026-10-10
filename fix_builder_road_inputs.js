const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

const roadInputs = `
{sel.type === 'road-path' && (
    <div className="mt-4 p-3 bg-slate-100 rounded-md border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-700 text-xs uppercase mb-2">Road Settings</h4>
        <div>
            <label className={labelClass}>Path Data (SVG d=)</label>
            <textarea className={inputClass + " h-20 font-mono text-[10px] leading-tight"} value={sel.pathData || ''} onChange={e => updateSelected('pathData', e.target.value)} />
        </div>
        <div className="flex space-x-3">
            <div className="flex-1">
                <label className={labelClass}>Color</label>
                <div className="flex space-x-2">
                    <input type="color" className="w-10 h-8 p-0 border-0 rounded cursor-pointer" value={sel.color || '#64748b'} onChange={e => updateSelected('color', e.target.value)} />
                </div>
            </div>
            <div className="flex-1">
                <label className={labelClass}>Width</label>
                <input type="number" className={inputClass} value={sel.width || 10} onChange={e => updateSelected('width', parseInt(e.target.value)||1)} />
            </div>
        </div>
        <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 mt-2 cursor-pointer">
            <input type="checkbox" checked={!!sel.isDashed} onChange={e => updateSelected('isDashed', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span>Is Dashed Line?</span>
        </label>
    </div>
)}
`;

code = code.replace(/<Button variant="destructive" className="w-full mt-4 font-bold" onClick=\{deleteSelected\}>Delete Component<\/Button>/, roadInputs + '\n                                        <Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>');

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Added road inputs to builder!");
