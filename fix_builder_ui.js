const fs = require('fs');

let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

const dynamicInputs = `
{sel.type === 'dynamic-community' && (
    <div className="mt-4 p-3 bg-slate-100 rounded-md border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-700 text-xs uppercase mb-2">Community Settings</h4>
        <div>
            <label className={labelClass}>Background Color</label>
            <div className="flex space-x-2">
                <input type="color" className="w-10 h-8 p-0 border-0 rounded cursor-pointer" value={sel.color || '#bbf7d0'} onChange={e => updateSelected('color', e.target.value)} />
                <input type="text" className={inputClass} value={sel.color || '#bbf7d0'} onChange={e => updateSelected('color', e.target.value)} />
            </div>
        </div>
        <div className="flex space-x-3">
            <div className="flex-1">
                <label className={labelClass}>Rows</label>
                <input type="number" className={inputClass} value={sel.rows || 4} onChange={e => updateSelected('rows', parseInt(e.target.value)||1)} />
            </div>
            <div className="flex-1">
                <label className={labelClass}>Columns</label>
                <input type="number" className={inputClass} value={sel.cols || 6} onChange={e => updateSelected('cols', parseInt(e.target.value)||1)} />
            </div>
        </div>
        <div>
            <label className={labelClass}>Building Type</label>
            <select className={inputClass} value={sel.buildingType || 'small-house'} onChange={e => updateSelected('buildingType', e.target.value)}>
                <option value="small-house">Villas (small-house)</option>
                <option value="apartment">Apartments (apartment)</option>
            </select>
        </div>
    </div>
)}
`;

code = code.replace(/<Button variant="destructive" className="w-full mt-4 font-bold" onClick=\{deleteSelected\}>Delete Component<\/Button>/, dynamicInputs + '\n                                        <Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>');

// When clicking "+ Create New Component", let's default to a dynamic-community instead of generic-district since it's the new hotness, or maybe just leave it generic-district. The user can just type 'dynamic-community' in the type field.
// Actually, let's change the default "Add New" to 'dynamic-community' to make it instantly visible!
code = code.replace(/type: "generic-district",/, 'type: "dynamic-community",\n            width: 400,\n            height: 300,\n            color: "#bbf7d0",\n            rows: 4,\n            cols: 6,\n            buildingType: "small-house",');

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Added dynamic inputs to UI!");
