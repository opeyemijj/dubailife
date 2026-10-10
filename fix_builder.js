const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BuilderClient.tsx', 'utf8');

if (!code.includes('ConfigurableApartmentBlock')) {
  code = code.replace(
    /if \(type === 'apartment-complex'\) return <Icons\.ApartmentComplexBlock width=\{loc\.width\} height=\{loc\.height\} \/>;/,
    "if (type === 'apartment-complex') return <Icons.ApartmentComplexBlock width={loc.width} height={loc.height} />;\n        if (type === 'configurable-apartment') return <Icons.ConfigurableApartmentBlock width={loc.width} height={loc.height} hasPool={loc.hasPool} hasParking={loc.hasParking} hasCourt={loc.hasCourt} />;"
  );
  
  // Also add it to isOverlay list
  code = code.replace(
    /loc\.type === 'giant-billboard'/,
    "loc.type === 'giant-billboard' || loc.type === 'configurable-apartment'"
  );
}

// Add configuration inputs for 'configurable-apartment' in Builder
const uiInputs = `
{sel.type === 'configurable-apartment' && (
    <div className="mt-4 p-3 bg-slate-100 rounded-md border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-700 text-xs uppercase mb-2">Amenities Settings</h4>
        <div className="flex space-x-3">
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

code = code.replace(/<Button variant="destructive" className="w-full mt-4 font-bold" onClick=\{deleteSelected\}>Delete Component<\/Button>/, uiInputs + '\n                                        <Button variant="destructive" className="w-full mt-4 font-bold" onClick={deleteSelected}>Delete Component</Button>');

fs.writeFileSync('src/components/admin/BuilderClient.tsx', code);
console.log("Updated BuilderClient for configurable apartment");
