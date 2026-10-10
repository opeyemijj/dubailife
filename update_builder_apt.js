const fs = require('fs');

let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

const newUI = `
{sel.type === 'configurable-apartment' && (
    <div className="mt-4 p-3 bg-slate-100 rounded-md border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-700 text-xs uppercase mb-2">Apartment Settings</h4>
        <div className="flex space-x-3">
            <div className="flex-1">
                <label className={labelClass}>Building Color</label>
                <div className="flex space-x-2">
                    <input type="color" className="w-10 h-8 p-0 border-0 rounded cursor-pointer" value={sel.color || '#3b82f6'} onChange={e => updateSelected('color', e.target.value)} />
                    <input type="text" className={inputClass} value={sel.color || '#3b82f6'} onChange={e => updateSelected('color', e.target.value)} />
                </div>
            </div>
            <div className="flex-1">
                <label className={labelClass}># of Buildings</label>
                <input type="number" min="1" max="12" className={inputClass} value={sel.numBuildings || 3} onChange={e => updateSelected('numBuildings', parseInt(e.target.value))} />
            </div>
        </div>
        <div className="flex space-x-3 mt-3">
            <label className="flex items-center space-x-2">
                <input type="checkbox" checked={sel.hasPool !== false} onChange={e => updateSelected('hasPool', e.target.checked)} />
                <span className="text-sm font-semibold">Pool</span>
            </label>
            <label className="flex items-center space-x-2">
                <input type="checkbox" checked={sel.hasParking !== false} onChange={e => updateSelected('hasParking', e.target.checked)} />
                <span className="text-sm font-semibold">Parking</span>
            </label>
            <label className="flex items-center space-x-2">
                <input type="checkbox" checked={sel.hasCourt !== false} onChange={e => updateSelected('hasCourt', e.target.checked)} />
                <span className="text-sm font-semibold">Court</span>
            </label>
        </div>
    </div>
)}
`;

code = code.replace(/\{sel\.type === 'configurable-apartment' && \([\s\S]*?\}\)/, newUI.trim());

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Updated Configurable Apartment UI in Builder!");
