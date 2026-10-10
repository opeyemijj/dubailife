const fs = require('fs');
let code = fs.readFileSync('src/components/map/InteractiveMap.tsx', 'utf8');

// 1. Add Edit Mode state
const stateRegex = /const \[venues, setVenues\] = useState<Venue\[\]>\(\[\]\);/;
const stateInjection = `const [venues, setVenues] = useState<Venue[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    e.preventDefault();
    setActiveDragId(id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isEditMode || !activeDragId) return;
    const wrapper = document.getElementById('map-content-wrapper');
    if (!wrapper) return;
    
    const rect = wrapper.getBoundingClientRect();
    const scale = rect.width / 3000;
    
    // Calculate new X, Y based on mouse position relative to scaled map
    const rawX = (e.clientX - rect.left) / scale;
    const rawY = (e.clientY - rect.top) / scale;
    
    // Grid snapping (optional, but good for neatness)
    const newX = Math.round(rawX / 10) * 10;
    const newY = Math.round((WORLD_HEIGHT - rawY) / 10) * 10;
    
    setVenues(prev => prev.map(v => v.id === activeDragId ? { ...v, virtualX: newX, virtualY: newY } : v));
  };

  const handlePointerUp = () => {
    setActiveDragId(null);
  };`;

code = code.replace(stateRegex, stateInjection);

// 2. Attach handlers to wrapper
const wrapperRegex = /<div className="relative w-\[3000px\] h-\[2600px\]/;
const wrapperInjection = `<div id="map-content-wrapper" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} className="relative w-[3000px] h-[2600px]`;
code = code.replace(wrapperRegex, wrapperInjection);

// 3. Attach pointer events to venue divs
const venueDivRegex = /<div\s+key=\{loc\.id\}\s+className="absolute flex items-center justify-center transform -translate-x-1\/2 -translate-y-1\/2 group"/g;
const venueDivInjection = `<div
                key={loc.id}
                onPointerDown={(e) => handlePointerDown(e, loc.id)}
                className={\`absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group \${isEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-4 ring-yellow-400' : ''}\`}`;
code = code.replace(venueDivRegex, venueDivInjection);

// 4. Disable panning during drag
const panRegex = /<TransformWrapper\s+initialScale=\{/;
const panInjection = `<TransformWrapper panning={{ disabled: activeDragId !== null }} initialScale={`;
code = code.replace(panRegex, panInjection);

// 5. Add UI toggle for Edit Mode
const hudRegex = /\{toastMsg && \(/;
const hudInjection = `
      {/* Editor HUD */}
      <div className="absolute top-4 left-4 z-50 flex gap-4">
        <Button variant={isEditMode ? "destructive" : "default"} onClick={() => setIsEditMode(!isEditMode)}>
          {isEditMode ? "Exit Edit Mode" : "Enable Map Editor"}
        </Button>
        {isEditMode && (
          <Button variant="outline" onClick={() => console.log(JSON.stringify(venues, null, 2))}>
            Log Map Coordinates
          </Button>
        )}
      </div>
      
      {toastMsg && (`;
code = code.replace(hudRegex, hudInjection);

fs.writeFileSync('src/components/map/InteractiveMap.tsx', code);
console.log("Drag-and-Drop Edit Mode injected.");
