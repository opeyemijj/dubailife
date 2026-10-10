"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { MapPin, PlusCircle, AlertCircle } from "lucide-react";
import { getVenues, createVenue } from "@/app/actions/venue";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminMapEditor() {
  const [venues, setVenues] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPinCoords, setNewPinCoords] = useState<{x: number, y: number} | null>(null);
  const [formData, setFormData] = useState({ name: "", desc: "", type: "hotel" });

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const data = await getVenues();
      setVenues(data);
    } catch (e) {
      console.error(e);
      // Fallback for demo if DB is unreachable
      setVenues([
        { id: "1", name: "DB Offline Mode", type: "hotel", virtualX: 960, virtualY: 540 }
      ]);
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdding) return;
    
    // Get coordinates relative to the map container image
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setNewPinCoords({ x, y });
  };

  const handleSaveVenue = async () => {
    if (!newPinCoords) return;
    try {
      await createVenue({
        name: formData.name,
        description: formData.desc,
        type: formData.type,
        virtualX: newPinCoords.x,
        virtualY: newPinCoords.y
      });
      alert("Venue created!");
      setNewPinCoords(null);
      setIsAdding(false);
      loadVenues();
    } catch (e) {
      alert("Failed to save venue. Added locally for preview.");
      setVenues([...venues, { id: Date.now().toString(), name: formData.name, type: formData.type, virtualX: newPinCoords.x, virtualY: newPinCoords.y }]);
      setNewPinCoords(null);
      setIsAdding(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col font-sans">
      {/* Top Bar */}
      <div className="h-16 bg-zinc-900 border-b border-white/10 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-bold text-xl">Map Editor</h1>
          <div className="text-sm text-zinc-400 bg-zinc-800 px-3 py-1 rounded-full">
            {venues.length} venues mapped
          </div>
        </div>
        <Button 
          variant={isAdding ? "default" : "outline"}
          className={isAdding ? "bg-green-600 hover:bg-green-700" : "bg-zinc-800 text-white border-zinc-700"}
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? "Cancel Adding" : <><PlusCircle className="w-4 h-4 mr-2" /> Add Venue</>}
        </Button>
      </div>

      {isAdding && (
        <div className="bg-blue-600/20 border-b border-blue-500/50 p-2 text-center text-blue-200 text-sm font-bold flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Click anywhere on the map to place a new venue
        </div>
      )}

      {/* Editor Map Area */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950">
        <TransformWrapper
          initialScale={1}
          minScale={0.3}
          maxScale={4}
          centerOnInit
          smooth={false}
          wheel={{ step: 0.04 }}
          doubleClick={{ disabled: true }}
          disabled={isAdding}
        >
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
            <div 
              className={`relative ${isAdding ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`} 
              style={{ width: "1920px", height: "1080px" }}
              onClick={handleMapClick}
            >
              
              <div className="absolute inset-0 pointer-events-none">
                <Image 
                  src="/dubai-map-v2.jpg" 
                  alt="Dubai Editor Map" 
                  fill 
                  className="object-cover opacity-60"
                  draggable={false}
                />
              </div>

              {/* Render Existing Venues */}
              {venues.map((loc) => (loc.virtualX) && (
                <div 
                  key={loc.id}
                  className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: loc.virtualX, top: loc.virtualY }}
                >
                  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                  <span className="mt-1 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white whitespace-nowrap">
                    {loc.name}
                  </span>
                </div>
              ))}

              {/* Render New Pin Preview */}
              {newPinCoords && (
                <div 
                  className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-bounce"
                  style={{ left: newPinCoords.x, top: newPinCoords.y }}
                >
                  <MapPin className="w-8 h-8 text-green-500 drop-shadow-xl" />
                </div>
              )}

            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* New Venue Modal */}
      <Dialog open={!!newPinCoords} onOpenChange={(open) => !open && setNewPinCoords(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Add New Venue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Venue Name</Label>
              <Input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="bg-black/50 border-white/10"
                placeholder="e.g. Marina Mall"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={formData.desc}
                onChange={e => setFormData({...formData, desc: e.target.value})}
                className="bg-black/50 border-white/10"
                placeholder="What is this place?"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select 
                className="w-full bg-black/50 border border-white/10 rounded-md h-10 px-3 text-white"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="hotel">Hotel</option>
                <option value="club">Nightclub</option>
                <option value="mall">Shopping Mall</option>
                <option value="beach">Beach</option>
              </select>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setNewPinCoords(null)}>Cancel</Button>
              <Button onClick={handleSaveVenue} className="bg-blue-600 hover:bg-blue-700 text-white">Save Venue</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

