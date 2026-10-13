"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MapBackground } from '../map/MapBackground';
import { mapSeed, mapConfig as initialConfig } from '@/data/mapSeed';
import { saveMapSeed } from '@/app/actions/saveSeed';
import * as Icons from '../map/Icons';
import { Button } from '@/components/ui/button';

export default function BuilderClient() {
    const [venues, setVenues] = useState<any[]>(mapSeed);
  const [config, setConfig] = useState(initialConfig || { pitch: 45, yaw: 0, startX: -120, startY: -140, startScale: 0.35 });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const selectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
    const setSelectedId = (id: string | null) => {
        setSelectedIds(id ? [id] : []);
    };
    const [isDragging, setIsDragging] = useState(false);
    
    // Drag state
    const dragRef = useRef<{
        activeIds: string[];
        startX: number;
        startY: number;
        initialPositions: Map<string, { x: number; y: number }>;
        hasMoved: boolean;
        wasMulti: boolean;
        wasAlreadySelected: boolean;
        clickedId: string | null;
    }>({ 
        activeIds: [], 
        startX: 0, 
        startY: 0, 
        initialPositions: new Map(), 
        hasMoved: false, 
        wasMulti: false, 
        wasAlreadySelected: false, 
        clickedId: null 
    });

    const handlePointerDown = (e: React.PointerEvent, id: string) => {
        e.stopPropagation();
        const venue = venues.find(v => v.id === id);
        if (!venue) return;

        // Shift or Command/Control multi-select
        const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
        const wasAlreadySelected = selectedIds.includes(id);
        let newActiveIds: string[];

        if (isMulti) {
            if (wasAlreadySelected) {
                // Keep selected for potential drag; will toggle off on pointerUp if no drag
                newActiveIds = selectedIds;
            } else {
                newActiveIds = [...selectedIds, id];
                setSelectedIds(newActiveIds);
            }
        } else {
            // Single click without modifier
            if (wasAlreadySelected) {
                newActiveIds = selectedIds;
            } else {
                newActiveIds = [id];
                setSelectedIds(newActiveIds);
            }
        }

        setIsDragging(true);
        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch (err) {}

        const positions = new Map<string, { x: number; y: number }>();
        venues.forEach(v => {
            if (newActiveIds.includes(v.id)) {
                positions.set(v.id, { x: v.virtualX, y: v.virtualY });
            }
        });

        dragRef.current = {
            activeIds: newActiveIds,
            startX: e.clientX,
            startY: e.clientY,
            initialPositions: positions,
            hasMoved: false,
            wasMulti: isMulti,
            wasAlreadySelected,
            clickedId: id,
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !dragRef.current.activeIds || dragRef.current.activeIds.length === 0) return;
        
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            dragRef.current.hasMoved = true;
        }
        
        setVenues(prev => prev.map(v => {
            const initPos = dragRef.current.initialPositions.get(v.id);
            if (initPos) {
                return {
                    ...v,
                    virtualX: Math.round(initPos.x + dx),
                    virtualY: Math.round(initPos.y - dy)
                };
            }
            return v;
        }));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);

        // If it was a Shift/Cmd click and no drag happened, and it was already selected beforehand, toggle it off
        if (dragRef.current.wasMulti && !dragRef.current.hasMoved && dragRef.current.wasAlreadySelected && dragRef.current.clickedId) {
            const cid = dragRef.current.clickedId;
            setSelectedIds(prev => prev.filter(x => x !== cid));
        }

        dragRef.current.activeIds = [];
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (err) {}
    };

    const handleSave = async () => {
        const res = await saveMapSeed(venues, config);
        if (res.success) alert("Saved successfully!");
        else alert("Failed to save: " + res.error);
    };
    
    const addNew = () => {
        const newId = `custom-${Date.now()}`;
        setVenues([...venues, {
            id: newId,
            name: "New Venue",
            type: "dynamic-community",
            width: 400,
            height: 300,
            color: "#bbf7d0",
            rows: 4,
            cols: 6,
            buildingType: "small-house",
            virtualX: 2000,
            virtualY: 1300,
            interactive: true
        }]);
        setSelectedId(newId as any);
    };

    const updateSelected = (field: string, value: any) => {
        if (!selectedId) return;
        setVenues(prev => prev.map(v => v.id === selectedId ? { ...v, [field]: value } : v));
    };

    const deleteSelected = () => {
        const idsToDelete = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
        if (idsToDelete.length === 0) return;
        setVenues(prev => prev.filter(v => !idsToDelete.includes(v.id)));
        setSelectedIds([]);
    };

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(id as any);
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            id,
        });
    };

    const handleDuplicateOne = (targetId?: string) => {
        const idsToDup = targetId ? [targetId] : (selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []));
        if (idsToDup.length === 0) return;
        const newItems: any[] = [];
        const newIds: string[] = [];
        idsToDup.forEach((id, idx) => {
            const item = venues.find(v => v.id === id);
            if (!item) return;
            const newId = `${item.type || 'item'}-${Date.now()}-${idx}`;
            newIds.push(newId);
            newItems.push({
                ...item,
                id: newId,
                name: `${item.name} (Copy)`,
                virtualX: item.virtualX + 40,
                virtualY: item.virtualY - 20,
            });
        });
        setVenues(prev => [...prev, ...newItems]);
        setSelectedIds(newIds);
    };

    const [dupCount, setDupCount] = useState<number>(3);
    const [dupDirection, setDupDirection] = useState<'horizontal' | 'vertical'>('horizontal');
    const [dupGap, setDupGap] = useState<number>(20);

    const handleBatchDuplicate = (targetId?: string) => {
        const idToDup = targetId || selectedId;
        if (!idToDup) return;
        const sel = venues.find(v => v.id === idToDup);
        if (!sel) return;

        const count = Math.max(1, Math.min(50, dupCount || 1));
        const scale = sel.scale || 1;
        const itemW = (sel.width || 200) * scale;
        const itemH = (sel.height || 180) * scale;
        const gap = Number(dupGap) || 0;

        const newItems: any[] = [];
        const timestamp = Date.now();

        for (let i = 1; i <= count; i++) {
            const newId = `${sel.type || 'item'}-${timestamp}-${i}`;
            let nextX = sel.virtualX;
            let nextY = sel.virtualY;

            if (dupDirection === 'horizontal') {
                nextX = Math.round(sel.virtualX + i * (itemW + gap));
            } else {
                nextY = Math.round(sel.virtualY - i * (itemH + gap));
            }

            newItems.push({
                ...sel,
                id: newId,
                name: `${sel.name} (${i})`,
                virtualX: nextX,
                virtualY: nextY,
            });
        }

        setVenues(prev => [...prev, ...newItems]);
        if (newItems.length > 0) {
            setSelectedId(newItems[newItems.length - 1].id as any);
        }
    };

    const renderIcon = (type: string, name: string, loc: any) => {
        if (type === 'burj-al-arab') return <Icons.BurjAlArabIcon />;
        if (type === 'museum-of-future' || type === 'museum-future') return <Icons.MuseumOfFutureIcon width={loc.width} height={loc.height} />;
        if (type === 'dubai-frame') return <Icons.DubaiFrameIcon width={loc.width} height={loc.height} />;
        if (type === 'atlantis') return <Icons.AtlantisIcon />;
        if (type === 'emirates-towers') return <Icons.EmiratesTowersIcon />;
        if (type === 'gevora') return <Icons.GevoraIcon />;
        if (type === 'rose-rayhaan') return <Icons.RoseRayhaanIcon />;
        if (type === 'dwtc') return <Icons.DWTCIcon />;
        if (type === 'airport') return <Icons.AirportBlock width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'salik') return <Icons.SalikGate width={loc.width} height={loc.height} />;
        if (type === 'road-sign') return <Icons.RoadSign text={name} />;
        if (type === 'skyline') return <Icons.SkylineTower seed={1} />;
        if (type === 'atlantis-the-royal') return <Icons.AtlantisTheRoyalIcon />;
        if (type === 'bulgari') return <Icons.BulgariIslandIcon />;
        if (type === 'bridge') return <Icons.BridgeBlock width={loc.width} height={loc.height} />;
        if (type === 'dubai-opera') return <Icons.DubaiOpera width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'souk-al-bahar') return <Icons.SoukAlBahar width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'burj-park') return <Icons.BurjPark width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'address-downtown') return <Icons.AddressDowntown width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'address-skyview') return <Icons.AddressSkyView width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'palace-downtown') return <Icons.PalaceDowntown width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'dubai-fountain') return <Icons.DubaiFountain width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'timeout-market') return <Icons.TimeOutMarket width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'the-guild') return <Icons.TheGuild width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'armani-prive') return <Icons.ArmaniPrive width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'dubai-aquarium') return <Icons.DubaiAquarium width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'blu-dubai') return <Icons.BluDubaiClub width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'one-oak') return <Icons.OneOakClub width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'ting-irie') return <Icons.TingIrie width={loc.width} height={loc.height} name={name || loc.name} />;
        if (type === 'beach-club') return <Icons.BeachClubIconNew />;
        if (type === 'community-palm') return <Icons.PalmCommunityBlock width={loc.width} height={loc.height} />;
        if (type === 'community-bluewaters') return <Icons.BluewatersBlock />;
        if (type === 'community-jbr') return <Icons.JBRBlock />;
        if (type === 'road-path') return <Icons.RoadPathBlock pathData={loc.pathData} color={loc.color} width={loc.width} isDashed={loc.isDashed} />;
        if (type === 'giant-billboard' || type === 'billboard' || type === 'ad-billboard') return (
            <Icons.IsometricBillboard 
                id={loc.id}
                width={loc.width} 
                height={loc.height} 
                billboardStyle={loc.billboardStyle || 'mega-led'}
                imageUrl={loc.imageUrl || loc.image || loc.img}
                isRented={loc.isRented}
                rentedBy={loc.rentedBy}
                rentalPrice={loc.rentalPrice}
                adTitle={loc.adTitle || name || loc.name}
                adSubtitle={loc.adSubtitle}
                text1={loc.text1} 
                text2={loc.text2} 
                color1={loc.color1} 
                color2={loc.color2} 
                brandColor={loc.brandColor}
                seed={loc.seed || 1}
            />
        );
        if (type === 'apartment-complex') return <Icons.ApartmentComplexBlock width={loc.width} height={loc.height} />;
        if (type === 'configurable-apartment') return <Icons.ConfigurableApartmentBlock width={loc.width} height={loc.height} hasPool={loc.hasPool} hasParking={loc.hasParking} hasCourt={loc.hasCourt} />;
        if (type === 'tall-building' || type === 'skyscraper') return (
            <Icons.TallBuilding 
                width={loc.width} 
                height={loc.height} 
                floors={loc.floors || 24} 
                shape={loc.shape || 'rectangular'} 
                color={loc.color || '#38bdf8'} 
                roofType={loc.roofType || 'helipad'} 
                hasPlot={loc.hasPlot !== false}
                plotTheme={loc.plotTheme}
                plotColor={loc.plotColor}
                plotPadding={loc.plotPadding}
                name={name || loc.name} 
            />
        );
        if (type === 'plot' || type === 'building-plot' || type === 'base-plot') return (
            <Icons.Plot 
                width={loc.width} 
                height={loc.height} 
                name={name || loc.name} 
                color={loc.color} 
                theme={loc.theme || 'lawn'} 
                hasPlaza={loc.hasPlaza !== false} 
                hasPool={!!loc.hasPool} 
                hasBorder={loc.hasBorder !== false} 
                borderColor={loc.borderColor} 
            />
        );
        if (type === 'floor-tile' || type === 'island-plain' || type === 'two-plains-tile') return <Icons.FloorTile width={loc.width} height={loc.height} name={name || loc.name || "Island"} color={loc.color || loc.upperColor} showGrid={loc.showGrid !== false} showLabel={loc.showLabel !== false} />;
        if (type === 'burj-khalifa' || type === 'burj') return <Icons.BurjKhalifa width={loc.width} height={loc.height} name={name || loc.name || "Burj Khalifa"} />;
        if (type === 'hotel') return <Icons.HotelBlock width={loc.width} height={loc.height} name={name || loc.name || "Luxury Resort & Hotel"} />;
        if (type === 'mall') return <Icons.MallBlock width={loc.width} height={loc.height} name={name || loc.name || "Dubai Mall"} />;
        if (type === 'museum-future') return <Icons.MuseumOfFutureIcon width={loc.width} height={loc.height} />;
        if (type === 'marina' || type === 'marina-harbour') return <Icons.MarinaBlock name={name || loc.name} width={loc.width} height={loc.height} />;
        if (type === 'metro-station' || type === 'metro' || type === 'dubai-metro') return (
            <Icons.DubaiMetroStation 
                id={loc.id} 
                name={name || loc.name} 
                stationCode={loc.stationCode || '25'} 
                line={loc.line || 'red'} 
                width={loc.width} 
                height={loc.height} 
            />
        );
        if (type === 'dynamic-community') return <Icons.DynamicCommunityBlock name={name} width={loc.width} height={loc.height} color={loc.color} rows={loc.rows} cols={loc.cols} buildingType={loc.buildingType} />;
        if (type === 'estate-base') return <Icons.EstateBase name={name} />;
        if (type === 'small-house' || type === 'house' || type === 'isometric-house') {
            return (
                <Icons.IsometricHouse 
                    id={loc.id}
                    width={loc.width || 80} 
                    height={loc.height || 70} 
                    roofColor={loc.roofColor || loc.color}
                    wallColor={loc.wallColor}
                    plotColor={loc.plotColor}
                    showToken={loc.showToken}
                    name={name || loc.name}
                    price={loc.price}
                    rent={loc.rent}
                />
            );
        }
        if (type === 'dubai-villa' || type === 'villa' || type === 'luxury-villa') {
            return (
                <Icons.IsometricDubaiVilla 
                    id={loc.id}
                    width={loc.width || 120} 
                    height={loc.height || 95} 
                    wallColor={loc.wallColor || loc.color}
                    accentColor={loc.accentColor}
                    hasPool={loc.hasPool !== false}
                    hasPalm={loc.hasPalm !== false}
                    plotColor={loc.plotColor}
                    name={name || loc.name}
                    price={loc.price}
                    rent={loc.rent}
                />
            );
        }
        if (type === 'hospital' || type === 'medical' || type === 'isometric-hospital') {
            return (
                <Icons.IsometricHospital 
                    id={loc.id}
                    width={loc.width || 150} 
                    height={loc.height || 120} 
                    name={name || loc.name}
                    wallColor={loc.wallColor || loc.color}
                    glassColor={loc.glassColor}
                    accentColor={loc.accentColor}
                    plotColor={loc.plotColor}
                    hasHelipad={loc.hasHelipad !== false}
                    hasAmbulance={loc.hasAmbulance !== false}
                />
            );
        }
        if (type === 'beach' || type === 'beach-club' || type === 'isometric-beach') {
            return (
                <Icons.IsometricBeach 
                    id={loc.id}
                    width={loc.width || 160} 
                    height={loc.height || 120} 
                    name={name || loc.name}
                    sandColor={loc.sandColor}
                    waterColor={loc.waterColor}
                    plotColor={loc.plotColor}
                    hasBar={loc.hasBar !== false}
                    hasVolleyball={loc.hasVolleyball !== false}
                    hasJetSki={loc.hasJetSki !== false}
                    hasUmbrellas={loc.hasUmbrellas !== false}
                    price={loc.price}
                />
            );
        }
        if (type === 'apartment-building') return <Icons.ApartmentBuildingIconNew />;
        if (type === 'rooftop') return <Icons.RooftopIconNew />;
        if (type === 'club') return <Icons.NightclubIconNew />;
        if (type === 'restaurant') return <Icons.RestaurantIconNew />;
        if (type === 'ad-land' || type === 'billboard') return <Icons.BillboardSpace seed={loc.seed || 1} />;
        
        return <Icons.GenericNeighborhood name={name} seed={loc.seed || 1} />;
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-white">
            
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
                                            <select className={inputClass} value={sel.type} onChange={e => updateSelected('type', e.target.value)}>
                                                <option value="plot">📐 Building Plot (Hotel/Burj Base)</option>
                                                <option value="tall-building">🏢 Tall Building (Skyscraper)</option>
                                                <option value="floor-tile">Floor Tile (Single Plain)</option>
                                                <option value="burj-khalifa">Burj Khalifa</option>
                                                <option value="configurable-apartment">Configurable Apartment</option>
                                                <option value="giant-billboard">🪧 Billboard (Isometric Highway)</option>
                                                <option value="ad-billboard">🪧 Ad Billboard (Custom Creative)</option>
                                                <option value="dynamic-community">Dynamic Community Grid</option>
                                                <option value="road-path">Road Path (SVG Spline)</option>
                                                <option value="bridge">Bridge</option>
                                                <option value="marina">Marina (Yachts)</option>
                                                <option value="hotel">Hotel Resort</option>
                                                <option value="mall">Shopping Mall</option>
                                                <option value="museum-future">Museum of the Future</option>
                                                <option value="apartment-complex">Apartment Complex</option>
                                                <option value="generic-district">Generic District</option>
                                                <option value="estate-base">Estate Base</option>
                                                <option value="small-house">🏡 House (Isometric Plot Base)</option>
                                                <option value="dubai-villa">🏰 Dubai Luxury Villa (Pool & Palm)</option>
                                                <option value="hospital">🏥 Dubai Hospital (Helipad & ER)</option>
                                                <option value="beach">🏖️ Dubai Beach & Beach Club (Plot)</option>
                                                <option value="apartment-building">Apartment Building</option>
                                                <option value="rooftop">Rooftop Lounge</option>
                                                <option value="club">Nightclub</option>
                                                <option value="beach-club">🏖️ Beach Club (Legacy)</option>
                                                <option value="restaurant">Restaurant</option>
                                                <option value="billboard">Billboard</option>
                                                <option value="airport">Airport</option>
                                                <option value="community-emirates-hills">Emirates Hills</option>
                                                <option value="community-jbr">JBR</option>
                                                <option value="community-bluewaters">Bluewaters</option>
                                                <option value="community-ranches">Arabian Ranches</option>
                                                <option value="community-palm">Palm Community</option>
                                                <option value="community-motor-city">Motor City</option>
                                                <option value="community-deira">Deira</option>
                                                <option value="community-business-bay">Business Bay</option>
                                                <option value="metro-station">🚆 Dubai Metro Station (Red Line)</option>
                                                <option value="salik">Salik Gate</option>
                                            </select>
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
                                        
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            <div>
                                                <label className={labelClass}>Width</label>
                                                <input type="number" className={inputClass} value={sel.width || ''} placeholder="Auto" onChange={e => updateSelected('width', parseInt(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Height</label>
                                                <input type="number" className={inputClass} value={sel.height || ''} placeholder="Auto" onChange={e => updateSelected('height', parseInt(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Rotate (°)</label>
                                                <input type="number" className={inputClass} value={sel.rotate || 0} onChange={e => updateSelected('rotate', parseInt(e.target.value)||0)} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Scale</label>
                                                <input type="number" step="0.05" min="0.1" max="5" className={inputClass} value={sel.scale || 1} onChange={e => updateSelected('scale', parseFloat(e.target.value)||1)} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Skew X (°)</label>
                                                <input type="number" className={inputClass} value={sel.skewX || sel.skew || 0} onChange={e => {
                                                    const val = parseInt(e.target.value)||0;
                                                    updateSelected('skewX', val);
                                                    updateSelected('skew', val);
                                                }} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Skew Y (°)</label>
                                                <input type="number" className={inputClass} value={sel.skewY || 0} onChange={e => updateSelected('skewY', parseInt(e.target.value)||0)} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>3D Turn / Yaw (°)</label>
                                                <input type="number" className={inputClass} value={sel.yaw || 0} onChange={e => updateSelected('yaw', parseInt(e.target.value)||0)} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>3D Tilt / Pitch (°)</label>
                                                <input type="number" className={inputClass} value={sel.tilt || 0} onChange={e => updateSelected('tilt', parseInt(e.target.value)||0)} />
                                            </div>
                                        </div>

                                        {/* 1-Click Isometric Presets */}
                                        <div className="mt-3 p-2.5 bg-purple-50/70 rounded-lg border border-purple-200/60 space-y-1.5">
                                            <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center justify-between">
                                                <span>Isometric Angle Presets</span>
                                                <span className="text-[9px] font-mono">{sel.yaw || 0}° Y / {sel.tilt || 0}° X</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <button type="button" onClick={() => { updateSelected('yaw', -30); updateSelected('tilt', 15); updateSelected('skewX', -10); updateSelected('skewY', 0); updateSelected('skew', -10); }} className="px-2 py-1 text-[11px] font-bold bg-purple-200/80 hover:bg-purple-300 text-purple-900 rounded shadow-sm">📐 3D Iso L</button>
                                                <button type="button" onClick={() => { updateSelected('yaw', 30); updateSelected('tilt', 15); updateSelected('skewX', 10); updateSelected('skewY', 0); updateSelected('skew', 10); }} className="px-2 py-1 text-[11px] font-bold bg-purple-200/80 hover:bg-purple-300 text-purple-900 rounded shadow-sm">📐 3D Iso R</button>
                                                <button type="button" onClick={() => { updateSelected('yaw', 0); updateSelected('tilt', 0); updateSelected('skewX', -26); updateSelected('skewY', 0); updateSelected('skew', -26); }} className="px-2 py-1 text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded">📐 Wall -26°</button>
                                                <button type="button" onClick={() => { updateSelected('yaw', 0); updateSelected('tilt', 0); updateSelected('skewX', 26); updateSelected('skewY', 0); updateSelected('skew', 26); }} className="px-2 py-1 text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded">📐 Wall +26°</button>
                                                <button type="button" onClick={() => { updateSelected('rotate', 14); updateSelected('yaw', 0); updateSelected('tilt', 0); updateSelected('skewX', 0); updateSelected('skewY', 0); updateSelected('skew', 0); }} className="px-2 py-1 text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded">🛣️ SZR (+14°)</button>
                                                <button type="button" onClick={() => { updateSelected('rotate', 0); updateSelected('yaw', 0); updateSelected('tilt', 0); updateSelected('skewX', 0); updateSelected('skewY', 0); updateSelected('skew', 0); }} className="px-2 py-1 text-[11px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 rounded">🔄 Reset Flat</button>
                                            </div>
                                        </div>

                                        
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
                <option value="small-house">🏡 Houses (Isometric Plot)</option>
                <option value="dubai-villa">🏰 Dubai Luxury Villas</option>
                <option value="apartment">🏢 Apartments (apartment)</option>
            </select>
        </div>
    </div>
)}

                                        
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

{sel.type === 'tall-building' && (
    <div className="mt-4 p-3 bg-sky-50 rounded-md border border-sky-200 space-y-3">
        <div className="flex items-center justify-between">
            <h4 className="font-bold text-sky-900 text-xs uppercase">🏢 Tall Building (Dubai Skyscraper)</h4>
            <span className="text-[10px] font-bold bg-sky-200 text-sky-800 px-2 py-0.5 rounded">2.5D Facade Priority</span>
        </div>

        {/* Floors Slider & Input */}
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className={labelClass}>Number of Floors</label>
                <span className="text-xs font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-sky-300 font-mono">{sel.floors || 24} Floors</span>
            </div>
            <input 
                type="range" 
                min="6" 
                max="60" 
                step="1" 
                value={sel.floors || 24} 
                onChange={e => updateSelected('floors', parseInt(e.target.value) || 24)} 
                className="w-full accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
                <span>6 (Low-rise)</span>
                <span>24 (Standard)</span>
                <span>40 (High-rise)</span>
                <span>60 (Super-tall)</span>
            </div>
        </div>

        {/* Building Shape / Architectural Style */}
        <div>
            <label className={labelClass}>Architectural Shape</label>
            <select 
                className={inputClass} 
                value={sel.shape || 'rectangular'} 
                onChange={e => updateSelected('shape', e.target.value)}
            >
                <option value="rectangular">🏙️ Rectangular Modern Monolith</option>
                <option value="stepped">🏛️ Stepped Tiered Setbacks (Dubai Classic)</option>
                <option value="curved">🌊 Aerodynamic Curved Glass Tower</option>
                <option value="tapered">📐 Tapered Obelisk / Needle</option>
                <option value="twin">🏢🏢 Twin Towers + Skybridge</option>
                <option value="spire">🗼 Architectural Crown & Needle Spire</option>
                <option value="gate">⛩️ Monumental Gate / Portal Arch</option>
            </select>
        </div>

        {/* Rooftop Feature */}
        <div>
            <label className={labelClass}>Rooftop Feature</label>
            <select 
                className={inputClass} 
                value={sel.roofType || 'helipad'} 
                onChange={e => updateSelected('roofType', e.target.value)}
            >
                <option value="helipad">🚁 VIP Helipad with "H"</option>
                <option value="spire">⚡ Architectural Spire Needle</option>
                <option value="crown">👑 Illuminated Architectural Crown</option>
                <option value="garden">🌴 Sky Garden, Pool & Terraces</option>
                <option value="simple">📦 Clean Mechanical Penthouse</option>
            </select>
        </div>

        {/* Glass Theme & Color */}
        <div>
            <label className={labelClass}>Glass Palette & Theme</label>
            <div className="flex items-center space-x-2 mb-2">
                <input 
                    type="color" 
                    className="w-10 h-8 p-0 border-0 rounded cursor-pointer" 
                    value={sel.color || '#38bdf8'} 
                    onChange={e => updateSelected('color', e.target.value)} 
                />
                <span className="text-xs text-slate-600 font-mono">{sel.color || '#38bdf8'}</span>
            </div>
            {/* Quick 1-click Dubai Theme Presets */}
            <div className="grid grid-cols-2 gap-1.5">
                {[
                    { label: '💎 Marina Azure', c: '#38bdf8' },
                    { label: '👑 Luxury Gold', c: '#f59e0b' },
                    { label: '🏢 DIFC Steel Silver', c: '#94a3b8' },
                    { label: '🌿 Sustainable Emerald', c: '#10b981' },
                    { label: '🕶️ Obsidian Dark', c: '#18181b' },
                ].map(p => (
                    <button 
                        key={p.c} 
                        type="button" 
                        onClick={() => updateSelected('color', p.c)}
                        className="text-[10px] font-bold px-2 py-1.5 rounded bg-white hover:bg-sky-100 border border-sky-300 text-sky-900 shadow-sm text-left flex items-center justify-between"
                    >
                        <span>{p.label}</span>
                        <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: p.c }} />
                    </button>
                ))}
            </div>
        </div>

        {/* Quick Size Presets */}
        <div>
            <label className={labelClass}>Quick Size Presets</label>
            <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => { updateSelected('width', 150); updateSelected('height', 280); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Compact (150x280)</button>
                <button type="button" onClick={() => { updateSelected('width', 180); updateSelected('height', 340); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Medium (180x340)</button>
                <button type="button" onClick={() => { updateSelected('width', 220); updateSelected('height', 420); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Grand (220x420)</button>
            </div>
        </div>

        {/* Base Plot Foundation */}
        <div className="pt-2 border-t border-sky-200 space-y-2">
            <label className="flex items-center space-x-2 text-xs font-bold text-sky-900 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={sel.hasPlot !== false} 
                    onChange={e => updateSelected('hasPlot', e.target.checked)} 
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" 
                />
                <span>Base Plot Foundation (Hotel/Burj Plain)</span>
            </label>

            {sel.hasPlot !== false && (
                <div className="space-y-3 pl-3 border-l-2 border-sky-200">
                    {/* Plot Space / Margin around Building */}
                    <div>
                        <div className="flex justify-between items-center text-[10px] text-sky-800 font-bold mb-1">
                            <span>Space Around Building</span>
                            <span className="font-mono bg-sky-200 px-1.5 py-0.5 rounded text-sky-950 font-black">{sel.plotPadding ?? 50}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="15" 
                            max="100" 
                            step="5"
                            value={sel.plotPadding ?? 50} 
                            onChange={e => updateSelected('plotPadding', parseInt(e.target.value) || 50)} 
                            className="w-full h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                        />
                        <div className="grid grid-cols-3 gap-1 mt-1.5">
                            <button type="button" onClick={() => updateSelected('plotPadding', 25)} className="text-[9px] font-bold py-0.5 rounded bg-white hover:bg-sky-50 border border-sky-300 text-sky-800">Compact (25px)</button>
                            <button type="button" onClick={() => updateSelected('plotPadding', 50)} className="text-[9px] font-bold py-0.5 rounded bg-white hover:bg-sky-50 border border-sky-300 text-sky-800">Spacious (50px)</button>
                            <button type="button" onClick={() => updateSelected('plotPadding', 75)} className="text-[9px] font-bold py-0.5 rounded bg-white hover:bg-sky-50 border border-sky-300 text-sky-800">Grand (75px)</button>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-sky-800 block mb-1">Plot Foundation Theme (One Clean Color)</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                { label: '🌿 Green Lawn', val: 'lawn', c: '#84cc6d' },
                                { label: '🏛️ Luxury Plaza', val: 'plaza', c: '#f1f5f9' },
                                { label: '🏖️ Golden Sand', val: 'sand', c: '#dfce9d' },
                                { label: '🛣️ Urban Asphalt', val: 'asphalt', c: '#334155' },
                            ].map(p => (
                                <button
                                    key={p.val}
                                    type="button"
                                    onClick={() => { updateSelected('plotTheme', p.val); updateSelected('plotColor', p.c); }}
                                    className={`text-[10px] font-bold px-2 py-1 rounded border text-left flex items-center justify-between ${
                                        (sel.plotTheme || 'lawn') === p.val 
                                            ? 'bg-sky-200 border-sky-400 text-sky-900 font-black' 
                                            : 'bg-white hover:bg-sky-50 border-slate-300 text-slate-700'
                                    }`}
                                >
                                    <span>{p.label}</span>
                                    <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: p.c }} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
)}

{sel.type === 'plot' && (
    <div className="mt-4 p-3 bg-emerald-50 rounded-md border border-emerald-200 space-y-3">
        <div className="flex items-center justify-between">
            <h4 className="font-bold text-emerald-900 text-xs uppercase">📐 Building Plot (Base Plain)</h4>
            <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">Base Layer</span>
        </div>

        {/* Exact Dimensions: Width and Height */}
        <div>
            <label className={labelClass}>Exact Dimensions (px)</label>
            <div className="flex space-x-3 mb-2">
                <div className="flex-1">
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Width</span>
                    <input 
                        type="number" 
                        className={inputClass} 
                        value={sel.width || 300} 
                        onChange={e => updateSelected('width', parseInt(e.target.value) || 100)} 
                    />
                </div>
                <div className="flex-1">
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Height</span>
                    <input 
                        type="number" 
                        className={inputClass} 
                        value={sel.height || 300} 
                        onChange={e => updateSelected('height', parseInt(e.target.value) || 50)} 
                    />
                </div>
            </div>
            {/* Quick Square Dimension Presets */}
            <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => { updateSelected('width', 260); updateSelected('height', 260); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Compact (260×260)</button>
                <button type="button" onClick={() => { updateSelected('width', 340); updateSelected('height', 340); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Standard (340×340)</button>
                <button type="button" onClick={() => { updateSelected('width', 450); updateSelected('height', 450); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Grand (450×450)</button>
            </div>
        </div>

        {/* Theme Style */}
        <div>
            <label className={labelClass}>Plot Theme</label>
            <div className="grid grid-cols-2 gap-1.5">
                {[
                    { label: '🌿 Green Lawn', val: 'lawn', c: '#84cc6d' },
                    { label: '🏛️ Luxury Plaza', val: 'plaza', c: '#f1f5f9' },
                    { label: '🏖️ Golden Sand', val: 'sand', c: '#dfce9d' },
                    { label: '🛥️ Waterfront Canal', val: 'waterfront', c: '#84cc6d' },
                    { label: '🛣️ Urban Asphalt', val: 'asphalt', c: '#334155' },
                ].map(p => (
                    <button
                        key={p.val}
                        type="button"
                        onClick={() => { updateSelected('theme', p.val); updateSelected('color', p.c); }}
                        className={`text-[10px] font-bold px-2 py-1.5 rounded border text-left flex items-center justify-between ${
                            (sel.theme || 'lawn') === p.val 
                                ? 'bg-emerald-200 border-emerald-400 text-emerald-900 font-black' 
                                : 'bg-white hover:bg-emerald-50 border-slate-300 text-slate-700'
                        }`}
                    >
                        <span>{p.label}</span>
                        <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: p.c }} />
                    </button>
                ))}
            </div>
        </div>

        {/* Custom Color Override */}
        <div>
            <label className={labelClass}>Custom Surface Color</label>
            <div className="flex items-center space-x-2">
                <input 
                    type="color" 
                    className="w-10 h-8 p-0 border-0 rounded cursor-pointer" 
                    value={sel.color || '#84cc6d'} 
                    onChange={e => updateSelected('color', e.target.value)} 
                />
                <span className="text-xs text-slate-600 font-mono">{sel.color || '#84cc6d'}</span>
            </div>
        </div>

        {/* Plot Amenities & Feature Toggles */}
        <div className="space-y-2 pt-1 border-t border-emerald-200">
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={sel.hasPlaza !== false} 
                    onChange={e => updateSelected('hasPlaza', e.target.checked)} 
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                />
                <span>Travertine Plaza Promenade (Center Walkway)</span>
            </label>
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={!!sel.hasPool} 
                    onChange={e => updateSelected('hasPool', e.target.checked)} 
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                />
                <span>Resort Pool / Fountain Basin</span>
            </label>
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={sel.hasBorder !== false} 
                    onChange={e => updateSelected('hasBorder', e.target.checked)} 
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                />
                <span>Crisp White Border (Hotel/Burj Style)</span>
            </label>
        </div>
    </div>
)}

{sel.type === 'floor-tile' && (
    <div className="mt-4 p-3 bg-slate-100 rounded-md border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-700 text-xs uppercase mb-2">Floor Tile Settings</h4>
        
        {/* Exact Dimensions: Width and Height */}
        <div>
            <label className={labelClass}>Exact Dimensions (px)</label>
            <div className="flex space-x-3 mb-2">
                <div className="flex-1">
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Width</span>
                    <input 
                        type="number" 
                        className={inputClass} 
                        value={sel.width || 600} 
                        onChange={e => updateSelected('width', parseInt(e.target.value) || 100)} 
                    />
                </div>
                <div className="flex-1">
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Height</span>
                    <input 
                        type="number" 
                        className={inputClass} 
                        value={sel.height || 280} 
                        onChange={e => updateSelected('height', parseInt(e.target.value) || 50)} 
                    />
                </div>
            </div>
            {/* Quick Dimension Presets */}
            <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => { updateSelected('width', 400); updateSelected('height', 200); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Small (400×200)</button>
                <button type="button" onClick={() => { updateSelected('width', 600); updateSelected('height', 280); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Standard (600×280)</button>
                <button type="button" onClick={() => { updateSelected('width', 900); updateSelected('height', 420); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Wide (900×420)</button>
                <button type="button" onClick={() => { updateSelected('width', 600); updateSelected('height', 450); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Deep (600×450)</button>
                <button type="button" onClick={() => { updateSelected('width', 800); updateSelected('height', 600); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Large (800×600)</button>
                <button type="button" onClick={() => { updateSelected('width', 1200); updateSelected('height', 560); }} className="text-[10px] font-bold px-1.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700">Mega (1200×560)</button>
            </div>
        </div>

        <div>
            <label className={labelClass}>Plain Color</label>
            <div className="flex items-center space-x-2 mb-2">
                <input type="color" className="w-10 h-8 p-0 border-0 rounded cursor-pointer" value={sel.color || sel.upperColor || '#b8cf9e'} onChange={e => { updateSelected('color', e.target.value); updateSelected('upperColor', e.target.value); }} />
                <span className="text-xs text-slate-600 font-mono">{sel.color || sel.upperColor || '#b8cf9e'}</span>
            </div>
            {/* Quick Palette */}
            <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                    { label: '🌿 Green Island', c: '#b8cf9e' },
                    { label: '🏖️ Golden Sand', c: '#dfce9d' },
                    { label: '🏭 Industrial Tan', c: '#d5cbb2' },
                    { label: '🏙️ Concrete Plaza', c: '#e2e8f0' },
                ].map(p => (
                    <button 
                        key={p.c} 
                        type="button" 
                        onClick={() => { updateSelected('color', p.c); updateSelected('upperColor', p.c); }}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-sm"
                    >
                        {p.label}
                    </button>
                ))}
            </div>
        </div>
        <div className="flex space-x-4 pt-1">
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={sel.showGrid !== false} onChange={e => updateSelected('showGrid', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>Show Grid Lines</span>
            </label>
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={sel.showLabel !== false} onChange={e => updateSelected('showLabel', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>Show Label</span>
            </label>
        </div>
    </div>
)}

{(sel.type === 'giant-billboard' || sel.type === 'billboard' || sel.type === 'ad-billboard') && (
    <div className="mt-4 p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
            <h4 className="font-black text-amber-950 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <span>🪧</span>
                <span>Billboard Ad & Style Settings</span>
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                {sel.billboardStyle || 'mega-led'}
            </span>
        </div>

        {/* Billboard Architectural Style Selector */}
        <div>
            <label className={labelClass}>Architectural Design Style</label>
            <div className="grid grid-cols-2 gap-1.5">
                {[
                    { id: 'mega-led', label: '⚡ Mega LED Unipole', desc: 'Single steel pylon with 8K digital screen' },
                    { id: 'classic-highway', label: '🛣️ Highway Gantry', desc: 'Twin lattice towers, catwalk & floodlights' },
                    { id: 'luxury-curved', label: '👑 Luxury Curved', desc: 'Champagne-gold chamfered 3D monolith' },
                    { id: 'hoarding-banner', label: '🏗️ Real Estate Hoarding', desc: 'Architectural street-level lightbox' },
                ].map(st => {
                    const active = (sel.billboardStyle || 'mega-led') === st.id;
                    return (
                        <button
                            key={st.id}
                            type="button"
                            onClick={() => updateSelected('billboardStyle', st.id)}
                            className={`p-2 rounded-lg text-left border text-xs font-bold transition-all ${
                                active 
                                    ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400/50' 
                                    : 'bg-white hover:bg-amber-100/60 text-amber-950 border-amber-200'
                            }`}
                        >
                            <p className="font-black leading-tight">{st.label}</p>
                            <p className={`text-[9px] mt-0.5 line-clamp-1 ${active ? 'text-amber-100' : 'text-slate-500'}`}>{st.desc}</p>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Rental Status Toggle */}
        <div className="p-2.5 rounded-lg bg-white border border-amber-200 flex items-center justify-between">
            <div>
                <p className="text-xs font-black text-slate-800">Rental Status</p>
                <p className="text-[10px] text-slate-500">{sel.isRented ? 'Currently rented & actively showing ad' : 'Available for public rental'}</p>
            </div>
            <button
                type="button"
                onClick={() => updateSelected('isRented', !sel.isRented)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    sel.isRented 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' 
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                }`}
            >
                {sel.isRented ? '● RENTED' : '○ FOR RENT'}
            </button>
        </div>

        {/* Ad Image URL Input & Presets */}
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className={labelClass}>Ad Image Creative URL</label>
                {sel.imageUrl && (
                    <button 
                        type="button" 
                        onClick={() => updateSelected('imageUrl', '')}
                        className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                        Clear Image
                    </button>
                )}
            </div>
            <input 
                type="text" 
                className={inputClass} 
                value={sel.imageUrl || ''} 
                placeholder="https://example.com/ad-banner.jpg" 
                onChange={e => updateSelected('imageUrl', e.target.value)} 
            />
            {/* Quick Sample Creatives */}
            <div className="mt-1.5">
                <span className="text-[10px] font-bold text-amber-900 block mb-1">Quick Sample Creatives:</span>
                <div className="grid grid-cols-2 gap-1">
                    {[
                        { label: '🏙️ Luxury Penthouse', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80' },
                        { label: '🏎️ Exotic Supercar', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80' },
                        { label: '⌚ Luxury Watch', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80' },
                        { label: '✈️ Emirates Airlines', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80' },
                    ].map(sample => (
                        <button
                            key={sample.label}
                            type="button"
                            onClick={() => {
                                updateSelected('imageUrl', sample.url);
                                updateSelected('isRented', true);
                            }}
                            className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 rounded border border-amber-200 text-left truncate"
                        >
                            {sample.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Advertiser / Campaign Details */}
        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className={labelClass}>Advertiser / Brand</label>
                <input 
                    type="text" 
                    className={inputClass} 
                    value={sel.rentedBy || ''} 
                    placeholder="Emaar Properties" 
                    onChange={e => updateSelected('rentedBy', e.target.value)} 
                />
            </div>
            <div>
                <label className={labelClass}>Rental Price</label>
                <input 
                    type="text" 
                    className={inputClass} 
                    value={sel.rentalPrice || 'AED 500 / wk'} 
                    placeholder="AED 500 / wk" 
                    onChange={e => updateSelected('rentalPrice', e.target.value)} 
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className={labelClass}>Campaign Headline</label>
                <input 
                    type="text" 
                    className={inputClass} 
                    value={sel.adTitle || sel.text1 || ''} 
                    placeholder="EXCLUSIVE VILLAS" 
                    onChange={e => {
                        updateSelected('adTitle', e.target.value);
                        updateSelected('text1', e.target.value);
                    }} 
                />
            </div>
            <div>
                <label className={labelClass}>Campaign Subtitle</label>
                <input 
                    type="text" 
                    className={inputClass} 
                    value={sel.adSubtitle || sel.text2 || ''} 
                    placeholder="Starting 2.5M AED" 
                    onChange={e => {
                        updateSelected('adSubtitle', e.target.value);
                        updateSelected('text2', e.target.value);
                    }} 
                />
            </div>
        </div>

        {/* Quick Size Presets */}
        <div>
            <label className={labelClass}>Billboard Dimensions</label>
            <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => { updateSelected('width', 220); updateSelected('height', 165); }} className="text-[10px] font-bold py-1 px-2 rounded bg-white hover:bg-amber-50 border border-amber-300 text-amber-900">Compact (220×165)</button>
                <button type="button" onClick={() => { updateSelected('width', 280); updateSelected('height', 210); }} className="text-[10px] font-bold py-1 px-2 rounded bg-white hover:bg-amber-50 border border-amber-300 text-amber-900">Standard (280×210)</button>
                <button type="button" onClick={() => { updateSelected('width', 340); updateSelected('height', 245); }} className="text-[10px] font-bold py-1 px-2 rounded bg-white hover:bg-amber-50 border border-amber-300 text-amber-900">Highway Gantry (340×245)</button>
                <button type="button" onClick={() => { updateSelected('width', 400); updateSelected('height', 285); }} className="text-[10px] font-bold py-1 px-2 rounded bg-white hover:bg-amber-50 border border-amber-300 text-amber-900">Grand Monolith (400×285)</button>
            </div>
        </div>
    </div>
)}

{(sel.type === 'metro-station' || sel.type === 'metro' || sel.type === 'dubai-metro') && (
    <div className="mt-4 p-3 bg-red-50/80 rounded-xl border border-red-200 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-red-200/80 pb-2">
            <h4 className="font-black text-red-950 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <span>🚆</span>
                <span>Dubai Metro Station (Red Line)</span>
            </h4>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white font-mono">
                M {sel.stationCode || '25'}
            </span>
        </div>

        {/* Station Name & Code */}
        <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
                <label className={labelClass}>Station Name</label>
                <input 
                    type="text" 
                    className={inputClass} 
                    value={sel.name || ''} 
                    placeholder="Burj Khalifa / Dubai Mall" 
                    onChange={e => updateSelected('name', e.target.value)} 
                />
            </div>
            <div>
                <label className={labelClass}>Station #</label>
                <input 
                    type="text" 
                    className={inputClass} 
                    value={sel.stationCode || '25'} 
                    placeholder="25" 
                    onChange={e => updateSelected('stationCode', e.target.value)} 
                />
            </div>
        </div>

        {/* Iconic Dubai Red Line Presets */}
        <div>
            <span className="text-[10px] font-bold text-red-950 block mb-1">Iconic Metro Station Presets:</span>
            <div className="grid grid-cols-1 gap-1.5">
                {[
                    { name: 'Burj Khalifa / Dubai Mall', code: '25', x: 1100, y: 1615, desc: 'Downtown Dubai • Access to Dubai Mall & Burj' },
                    { name: 'Mall of the Emirates', code: '32', x: 2200, y: 1752, desc: 'Al Barsha • Direct link to MOE & Ski Dubai' },
                    { name: 'DMCC / Dubai Marina', code: '37', x: 3250, y: 1883, desc: 'Dubai Marina & JLT • Direct link to Dubai Tram' },
                ].map(pst => (
                    <button
                        key={pst.code}
                        type="button"
                        onClick={() => {
                            updateSelected('name', pst.name);
                            updateSelected('stationCode', pst.code);
                            updateSelected('virtualX', pst.x);
                            updateSelected('virtualY', pst.y);
                        }}
                        className="p-2 bg-white hover:bg-red-100/60 rounded-lg border border-red-200 text-left flex items-center justify-between text-xs font-bold text-red-950 transition-colors"
                    >
                        <div>
                            <p className="font-black flex items-center gap-1.5">
                                <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.2 rounded font-mono font-black">{pst.code}</span>
                                <span>{pst.name}</span>
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{pst.desc}</p>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">({pst.x}, {pst.y})</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Station Dimensions */}
        <div>
            <label className={labelClass}>Station Dimensions</label>
            <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => { updateSelected('width', 300); updateSelected('height', 180); }} className="text-[10px] font-bold py-1 px-2 rounded bg-white hover:bg-red-50 border border-red-300 text-red-900">Standard (300×180)</button>
                <button type="button" onClick={() => { updateSelected('width', 360); updateSelected('height', 215); }} className="text-[10px] font-bold py-1 px-2 rounded bg-white hover:bg-red-50 border border-red-300 text-red-900">Grand Shell (360×215)</button>
            </div>
        </div>
    </div>
)}

                                        
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

{/* Isometric House Settings Panel */}
{(sel.type === 'small-house' || sel.type === 'house') && (
    <div className="mt-4 p-3.5 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>🏡 Isometric House</span>
            </h4>
            <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Plot Base Aligned</span>
        </div>

        {/* Roof Color & Quick Swatches */}
        <div>
            <label className={labelClass}>Roof Color</label>
            <div className="flex items-center gap-2">
                <input 
                    type="color" 
                    className="w-10 h-8 p-0 border border-slate-300 rounded cursor-pointer" 
                    value={sel.roofColor || sel.color || '#22c55e'} 
                    onChange={e => updateSelected('roofColor', e.target.value)} 
                />
                <input 
                    type="text" 
                    className={inputClass} 
                    value={sel.roofColor || sel.color || '#22c55e'} 
                    onChange={e => updateSelected('roofColor', e.target.value)} 
                />
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
                {[
                    { label: 'Emerald', hex: '#22c55e' },
                    { label: 'Terracotta', hex: '#ea580c' },
                    { label: 'Sand', hex: '#eab308' },
                    { label: 'Slate', hex: '#475569' },
                    { label: 'Navy', hex: '#1e3a8a' },
                ].map(swatch => (
                    <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => updateSelected('roofColor', swatch.hex)}
                        className="text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-300/60 bg-white hover:bg-emerald-100/70 text-emerald-900 flex items-center gap-1"
                    >
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: swatch.hex }} />
                        {swatch.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Wall & Plot Colors */}
        <div className="grid grid-cols-2 gap-2.5">
            <div>
                <label className={labelClass}>Wall Color</label>
                <div className="flex items-center gap-1.5">
                    <input 
                        type="color" 
                        className="w-8 h-7 p-0 border border-slate-300 rounded cursor-pointer shrink-0" 
                        value={sel.wallColor || '#ffffff'} 
                        onChange={e => updateSelected('wallColor', e.target.value)} 
                    />
                    <input 
                        type="text" 
                        className={inputClass} 
                        value={sel.wallColor || '#ffffff'} 
                        onChange={e => updateSelected('wallColor', e.target.value)} 
                    />
                </div>
            </div>
            <div>
                <label className={labelClass}>Plot Base Color</label>
                <div className="flex items-center gap-1.5">
                    <input 
                        type="color" 
                        className="w-8 h-7 p-0 border border-slate-300 rounded cursor-pointer shrink-0" 
                        value={sel.plotColor || '#f8fafc'} 
                        onChange={e => updateSelected('plotColor', e.target.value)} 
                    />
                    <input 
                        type="text" 
                        className={inputClass} 
                        value={sel.plotColor || '#f8fafc'} 
                        onChange={e => updateSelected('plotColor', e.target.value)} 
                    />
                </div>
            </div>
        </div>

        {/* Floating Green Status Orb / Token */}
        <label className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-emerald-200 cursor-pointer">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] inline-block animate-pulse" />
                <span className="text-xs font-bold text-emerald-950">Show Floating Status Orb</span>
            </div>
            <input 
                type="checkbox" 
                checked={!!sel.showToken} 
                onChange={e => updateSelected('showToken', e.target.checked)} 
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" 
            />
        </label>

        {/* Real Estate Pricing */}
        <div className="grid grid-cols-2 gap-2.5">
            <div>
                <label className={labelClass}>Buy Price (AED)</label>
                <input 
                    type="number" 
                    className={inputClass} 
                    value={sel.price || 1500000} 
                    onChange={e => updateSelected('price', parseInt(e.target.value) || 0)} 
                />
            </div>
            <div>
                <label className={labelClass}>Rent / Mo (AED)</label>
                <input 
                    type="number" 
                    className={inputClass} 
                    value={sel.rent || 10000} 
                    onChange={e => updateSelected('rent', parseInt(e.target.value) || 0)} 
                />
            </div>
        </div>

        {/* Quick Size Presets */}
        <div>
            <label className="text-[10px] text-emerald-900 font-bold block mb-1">Scale Preset</label>
            <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => { updateSelected('width', 60); updateSelected('height', 52); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900">Compact (60×52)</button>
                <button type="button" onClick={() => { updateSelected('width', 80); updateSelected('height', 70); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-emerald-600 text-white shadow-sm">Standard (80×70)</button>
                <button type="button" onClick={() => { updateSelected('width', 100); updateSelected('height', 87); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900">Large (100×87)</button>
            </div>
        </div>
    </div>
)}

{/* Dubai Luxury Villa Settings Panel */}
{(sel.type === 'dubai-villa' || sel.type === 'villa' || sel.type === 'luxury-villa') && (
    <div className="mt-4 p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>🏰 Dubai Luxury Villa</span>
            </h4>
            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">Palm & Hills Style</span>
        </div>

        {/* Facade Wall & Accent Color */}
        <div className="grid grid-cols-2 gap-2.5">
            <div>
                <label className={labelClass}>Villa Wall Color</label>
                <div className="flex items-center gap-1.5">
                    <input 
                        type="color" 
                        className="w-8 h-7 p-0 border border-slate-300 rounded cursor-pointer shrink-0" 
                        value={sel.wallColor || sel.color || '#f8fafc'} 
                        onChange={e => updateSelected('wallColor', e.target.value)} 
                    />
                    <input 
                        type="text" 
                        className={inputClass} 
                        value={sel.wallColor || sel.color || '#f8fafc'} 
                        onChange={e => updateSelected('wallColor', e.target.value)} 
                    />
                </div>
            </div>
            <div>
                <label className={labelClass}>Sandstone Accent</label>
                <div className="flex items-center gap-1.5">
                    <input 
                        type="color" 
                        className="w-8 h-7 p-0 border border-slate-300 rounded cursor-pointer shrink-0" 
                        value={sel.accentColor || '#fef3c7'} 
                        onChange={e => updateSelected('accentColor', e.target.value)} 
                    />
                    <input 
                        type="text" 
                        className={inputClass} 
                        value={sel.accentColor || '#fef3c7'} 
                        onChange={e => updateSelected('accentColor', e.target.value)} 
                    />
                </div>
            </div>
        </div>

        {/* Plot Lawn Base Color */}
        <div>
            <label className={labelClass}>Estate Plot Lawn Color</label>
            <div className="flex items-center gap-2">
                <input 
                    type="color" 
                    className="w-10 h-8 p-0 border border-slate-300 rounded cursor-pointer" 
                    value={sel.plotColor || '#bbf7d0'} 
                    onChange={e => updateSelected('plotColor', e.target.value)} 
                />
                <input 
                    type="text" 
                    className={inputClass} 
                    value={sel.plotColor || '#bbf7d0'} 
                    onChange={e => updateSelected('plotColor', e.target.value)} 
                />
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
                {[
                    { label: 'Lawn Green', hex: '#bbf7d0' },
                    { label: 'Emerald Grass', hex: '#86efac' },
                    { label: 'Desert Sand', hex: '#fef08a' },
                    { label: 'Travertine Stone', hex: '#e2e8f0' },
                ].map(swatch => (
                    <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => updateSelected('plotColor', swatch.hex)}
                        className="text-[9px] font-bold px-2 py-0.5 rounded border border-amber-300/60 bg-white hover:bg-amber-100/70 text-amber-900 flex items-center gap-1"
                    >
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: swatch.hex }} />
                        {swatch.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Feature Amenities Toggles */}
        <div className="space-y-2">
            <label className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-amber-200 cursor-pointer">
                <div className="flex items-center gap-2">
                    <span className="text-base">🏊</span>
                    <span className="text-xs font-bold text-amber-950">Private Azure Swimming Pool</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={sel.hasPool !== false} 
                    onChange={e => updateSelected('hasPool', e.target.checked)} 
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500" 
                />
            </label>
            <label className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-amber-200 cursor-pointer">
                <div className="flex items-center gap-2">
                    <span className="text-base">🌴</span>
                    <span className="text-xs font-bold text-amber-950">Dubai Date Palm Tree</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={sel.hasPalm !== false} 
                    onChange={e => updateSelected('hasPalm', e.target.checked)} 
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500" 
                />
            </label>
        </div>

        {/* Real Estate Pricing */}
        <div className="grid grid-cols-2 gap-2.5">
            <div>
                <label className={labelClass}>Buy Price (AED)</label>
                <input 
                    type="number" 
                    className={inputClass} 
                    value={sel.price || 8500000} 
                    onChange={e => updateSelected('price', parseInt(e.target.value) || 0)} 
                />
            </div>
            <div>
                <label className={labelClass}>Rent / Mo (AED)</label>
                <input 
                    type="number" 
                    className={inputClass} 
                    value={sel.rent || 45000} 
                    onChange={e => updateSelected('rent', parseInt(e.target.value) || 0)} 
                />
            </div>
        </div>

        {/* Scale Presets */}
        <div>
            <label className="text-[10px] text-amber-900 font-bold block mb-1">Scale Preset</label>
            <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => { updateSelected('width', 95); updateSelected('height', 75); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900">Compact (95×75)</button>
                <button type="button" onClick={() => { updateSelected('width', 120); updateSelected('height', 95); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-amber-600 text-white shadow-sm">Standard (120×95)</button>
                <button type="button" onClick={() => { updateSelected('width', 160); updateSelected('height', 126); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900">Mansion (160×126)</button>
            </div>
        </div>
    </div>
)}

{/* Dubai Hospital Settings Panel */}
{(sel.type === 'hospital' || sel.type === 'medical' || sel.type === 'isometric-hospital') && (
    <div className="mt-4 p-3.5 bg-gradient-to-br from-red-50 to-sky-50 rounded-xl border border-red-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-red-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>🏥 Dubai Hospital</span>
            </h4>
            <span className="text-[10px] font-bold bg-red-200 text-red-900 px-2 py-0.5 rounded">Helipad & ER Plot</span>
        </div>

        {/* Facade Wall & Glass Tint Colors */}
        <div className="grid grid-cols-2 gap-2.5">
            <div>
                <label className={labelClass}>Hospital Facade</label>
                <div className="flex items-center gap-1.5">
                    <input 
                        type="color" 
                        className="w-8 h-7 p-0 border border-slate-300 rounded cursor-pointer shrink-0" 
                        value={sel.wallColor || sel.color || '#f8fafc'} 
                        onChange={e => updateSelected('wallColor', e.target.value)} 
                    />
                    <input 
                        type="text" 
                        className={inputClass} 
                        value={sel.wallColor || sel.color || '#f8fafc'} 
                        onChange={e => updateSelected('wallColor', e.target.value)} 
                    />
                </div>
            </div>
            <div>
                <label className={labelClass}>Glass Tint</label>
                <div className="flex items-center gap-1.5">
                    <input 
                        type="color" 
                        className="w-8 h-7 p-0 border border-slate-300 rounded cursor-pointer shrink-0" 
                        value={sel.glassColor || '#38bdf8'} 
                        onChange={e => updateSelected('glassColor', e.target.value)} 
                    />
                    <input 
                        type="text" 
                        className={inputClass} 
                        value={sel.glassColor || '#38bdf8'} 
                        onChange={e => updateSelected('glassColor', e.target.value)} 
                    />
                </div>
            </div>
        </div>

        {/* Plot Base Color */}
        <div>
            <label className={labelClass}>Plot Pavement Color</label>
            <div className="flex items-center gap-2">
                <input 
                    type="color" 
                    className="w-10 h-8 p-0 border border-slate-300 rounded cursor-pointer" 
                    value={sel.plotColor || '#cbd5e1'} 
                    onChange={e => updateSelected('plotColor', e.target.value)} 
                />
                <input 
                    type="text" 
                    className={inputClass} 
                    value={sel.plotColor || '#cbd5e1'} 
                    onChange={e => updateSelected('plotColor', e.target.value)} 
                />
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
                {[
                    { label: 'Clinical Slate', hex: '#cbd5e1' },
                    { label: 'Clean White', hex: '#f8fafc' },
                    { label: 'Dark Pavement', hex: '#94a3b8' },
                    { label: 'Desert Sand', hex: '#fef3c7' },
                ].map(swatch => (
                    <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => updateSelected('plotColor', swatch.hex)}
                        className="text-[9px] font-bold px-2 py-0.5 rounded border border-red-300/60 bg-white hover:bg-red-100/70 text-red-900 flex items-center gap-1"
                    >
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: swatch.hex }} />
                        {swatch.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Medical Amenities Toggles */}
        <div className="space-y-2">
            <label className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-red-200 cursor-pointer">
                <div className="flex items-center gap-2">
                    <span className="text-base">🚁</span>
                    <span className="text-xs font-bold text-slate-800">Rooftop Medevac Helipad (H)</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={sel.hasHelipad !== false} 
                    onChange={e => updateSelected('hasHelipad', e.target.checked)} 
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500" 
                />
            </label>
            <label className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-red-200 cursor-pointer">
                <div className="flex items-center gap-2">
                    <span className="text-base">🚑</span>
                    <span className="text-xs font-bold text-slate-800">Emergency Ambulance Bay Vehicle</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={sel.hasAmbulance !== false} 
                    onChange={e => updateSelected('hasAmbulance', e.target.checked)} 
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500" 
                />
            </label>
        </div>

        {/* Quick Size Presets */}
        <div>
            <label className="text-[10px] text-red-900 font-bold block mb-1">Scale Preset</label>
            <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => { updateSelected('width', 120); updateSelected('height', 96); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-white hover:bg-red-100 border border-red-300 text-red-900">Compact (120×96)</button>
                <button type="button" onClick={() => { updateSelected('width', 150); updateSelected('height', 120); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-red-600 text-white shadow-sm">Standard (150×120)</button>
                <button type="button" onClick={() => { updateSelected('width', 190); updateSelected('height', 152); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-white hover:bg-red-100 border border-red-300 text-red-900">Medical City (190×152)</button>
            </div>
        </div>
    </div>
)}

{/* Dubai Beach & Beach Club Settings Panel */}
{(sel.type === 'beach' || sel.type === 'beach-club' || sel.type === 'isometric-beach') && (
    <div className="mt-4 p-3.5 bg-gradient-to-br from-amber-50 to-cyan-50 rounded-xl border border-amber-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>🏖️ Dubai Beach & Club</span>
            </h4>
            <span className="text-[10px] font-bold bg-cyan-200 text-cyan-900 px-2 py-0.5 rounded">Shoreline & Plot</span>
        </div>

        {/* Sand & Water Colors */}
        <div className="grid grid-cols-2 gap-2.5">
            <div>
                <label className={labelClass}>Golden Sand Color</label>
                <div className="flex items-center gap-1.5">
                    <input 
                        type="color" 
                        className="w-8 h-7 p-0 border border-slate-300 rounded cursor-pointer shrink-0" 
                        value={sel.sandColor || '#fde68a'} 
                        onChange={e => updateSelected('sandColor', e.target.value)} 
                    />
                    <input 
                        type="text" 
                        className={inputClass} 
                        value={sel.sandColor || '#fde68a'} 
                        onChange={e => updateSelected('sandColor', e.target.value)} 
                    />
                </div>
            </div>
            <div>
                <label className={labelClass}>Sea Water Color</label>
                <div className="flex items-center gap-1.5">
                    <input 
                        type="color" 
                        className="w-8 h-7 p-0 border border-slate-300 rounded cursor-pointer shrink-0" 
                        value={sel.waterColor || '#38bdf8'} 
                        onChange={e => updateSelected('waterColor', e.target.value)} 
                    />
                    <input 
                        type="text" 
                        className={inputClass} 
                        value={sel.waterColor || '#38bdf8'} 
                        onChange={e => updateSelected('waterColor', e.target.value)} 
                    />
                </div>
            </div>
        </div>

        {/* Sand Color Presets */}
        <div>
            <label className="text-[10px] text-amber-900 font-bold block mb-1">Sand Tone Presets</label>
            <div className="flex items-center gap-1.5">
                {[
                    { label: 'Golden Sand', hex: '#fde68a' },
                    { label: 'White Dune', hex: '#fef08a' },
                    { label: 'Desert Gold', hex: '#f59e0b' },
                ].map(swatch => (
                    <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => updateSelected('sandColor', swatch.hex)}
                        className="text-[9px] font-bold px-2 py-0.5 rounded border border-amber-300/60 bg-white hover:bg-amber-100/70 text-amber-900 flex items-center gap-1"
                    >
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: swatch.hex }} />
                        {swatch.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Beach Amenities Toggles */}
        <div className="space-y-2">
            <label className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-amber-200 cursor-pointer">
                <div className="flex items-center gap-2">
                    <span className="text-base">🍹</span>
                    <span className="text-xs font-bold text-slate-800">Thatched Tiki Cabana Bar</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={sel.hasBar !== false} 
                    onChange={e => updateSelected('hasBar', e.target.checked)} 
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500" 
                />
            </label>
            <label className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-amber-200 cursor-pointer">
                <div className="flex items-center gap-2">
                    <span className="text-base">🏐</span>
                    <span className="text-xs font-bold text-slate-800">Beach Volleyball Court</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={sel.hasVolleyball !== false} 
                    onChange={e => updateSelected('hasVolleyball', e.target.checked)} 
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500" 
                />
            </label>
            <label className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-cyan-200 cursor-pointer">
                <div className="flex items-center gap-2">
                    <span className="text-base">🌊</span>
                    <span className="text-xs font-bold text-slate-800">Water Sports Jet Ski & Surfboards</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={sel.hasJetSki !== false} 
                    onChange={e => updateSelected('hasJetSki', e.target.checked)} 
                    className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" 
                />
            </label>
            <label className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-amber-200 cursor-pointer">
                <div className="flex items-center gap-2">
                    <span className="text-base">🏖️</span>
                    <span className="text-xs font-bold text-slate-800">Luxury Sun Daybeds & Parasols</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={sel.hasUmbrellas !== false} 
                    onChange={e => updateSelected('hasUmbrellas', e.target.checked)} 
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500" 
                />
            </label>
        </div>

        {/* Quick Size Presets */}
        <div>
            <label className="text-[10px] text-amber-900 font-bold block mb-1">Scale Preset</label>
            <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => { updateSelected('width', 130); updateSelected('height', 98); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900">Compact (130×98)</button>
                <button type="button" onClick={() => { updateSelected('width', 160); updateSelected('height', 120); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-amber-600 text-white shadow-sm">Standard (160×120)</button>
                <button type="button" onClick={() => { updateSelected('width', 200); updateSelected('height', 150); }} className="text-[10px] font-bold py-1 px-1.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900">Beach Resort (200×150)</button>
            </div>
        </div>
    </div>
)}

{/* Batch Duplicate & Auto-Tile Section */}
<div className="mt-5 p-3.5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 shadow-sm space-y-3">
    <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span>👯 Batch Duplicate & Auto-Tile</span>
        </h4>
        <span className="text-[10px] font-bold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded">Smart Grid</span>
    </div>

    {/* Duplicate Count & Spacing */}
    <div className="grid grid-cols-2 gap-2.5">
        <div>
            <label className="text-[10px] text-indigo-800 font-bold block mb-1"># of Copies</label>
            <input 
                type="number" 
                min="1" 
                max="50" 
                value={dupCount} 
                onChange={e => setDupCount(Math.max(1, parseInt(e.target.value) || 1))}
                className={inputClass}
            />
        </div>
        <div>
            <label className="text-[10px] text-indigo-800 font-bold block mb-1">Spacing / Gap (px)</label>
            <input 
                type="number" 
                min="0" 
                max="500" 
                value={dupGap} 
                onChange={e => setDupGap(parseInt(e.target.value) || 0)}
                placeholder="20"
                className={inputClass}
            />
        </div>
    </div>

    {/* Quick Count Presets */}
    <div className="flex items-center gap-1">
        <span className="text-[10px] text-indigo-700 font-semibold mr-1">Copies:</span>
        {[1, 2, 3, 5, 8, 10].map(cnt => (
            <button
                key={cnt}
                type="button"
                onClick={() => setDupCount(cnt)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                    dupCount === cnt 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                }`}
            >
                {cnt}x
            </button>
        ))}
    </div>

    {/* Direction Selection */}
    <div>
        <label className="text-[10px] text-indigo-800 font-bold block mb-1">Tiling Arrangement</label>
        <div className="grid grid-cols-2 gap-2">
            <button
                type="button"
                onClick={() => setDupDirection('horizontal')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    dupDirection === 'horizontal'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm font-black'
                        : 'bg-white hover:bg-indigo-50 text-indigo-900 border-indigo-200'
                }`}
            >
                <span>➡️ Horizontal Row</span>
            </button>
            <button
                type="button"
                onClick={() => setDupDirection('vertical')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    dupDirection === 'vertical'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm font-black'
                        : 'bg-white hover:bg-indigo-50 text-indigo-900 border-indigo-200'
                }`}
            >
                <span>⬇️ Vertical Column</span>
            </button>
        </div>
    </div>

    {/* Primary Duplicate Action Button */}
    <Button 
        type="button"
        onClick={() => handleBatchDuplicate()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
    >
        <span>Duplicate & Tile ({dupCount}x {dupDirection})</span>
    </Button>
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
                                className={`text-sm p-3 rounded-md cursor-pointer flex justify-between items-center transition-all ${selectedIds.includes(v.id) ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400' : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'}`}
                                onClick={(e) => {
                                    if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                        setSelectedIds(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]);
                                    } else {
                                        setSelectedIds([v.id]);
                                    }
                                }}
                            >
                                <div className="truncate flex-1 pr-2">
                                    <strong className="block truncate">{v.name}</strong> 
                                    <span className={`text-xs block truncate ${selectedId === v.id ? 'text-blue-200' : 'text-slate-400'}`}>{v.type}</span>
                                </div>
                                <button 
                                    className={`p-1.5 rounded-md font-bold text-lg leading-none transition-colors ${selectedId === v.id ? 'text-white hover:bg-blue-700' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
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
            {/* Map Area */}
            <div className="flex-1 overflow-auto relative bg-[#d6bc8a] p-[1000px]">
                <div 
                    style={{ width: Icons.WORLD_WIDTH, height: Icons.WORLD_HEIGHT }}
                    className="relative bg-[#d6bc8a]"
                    onClick={() => setSelectedIds([])}
                >
                    <MapBackground />
                    
                    {venues.map((loc) => {
                        const isFloorTile = loc.type === 'floor-tile' || loc.type === 'island-plain' || loc.type === 'two-plains-tile' || loc.type === 'plot' || loc.type === 'building-plot' || loc.type === 'base-plot';
                        const isOverlay = isFloorTile || loc.type === 'bridge' || loc.type.startsWith('community') || loc.type === 'generic-district' || loc.type === 'salik' || loc.type === 'road-sign' || loc.type === 'airport' || loc.type === 'marina' || loc.type === 'marina-harbour' || loc.type === "ad-land" || loc.type === "estate-base";
                        const baseTransform = isOverlay ? 'translate(-50%, -50%)' : 'translate(-50%, -90%)';
                        const domY = Icons.WORLD_HEIGHT - loc.virtualY;
                        const isSelected = selectedIds.includes(loc.id);
                        
                        return (
                            <div
                                key={loc.id}
                                className={`absolute select-none`}
                                style={{
                                    left: `${loc.virtualX}px`,
                                    top: `${domY}px`,
                                    transform: `${baseTransform} scale(${loc.scale || 1}) rotate(${loc.rotate || 0}deg)`.trim(),
                                    transformStyle: 'preserve-3d',
                                    zIndex: isSelected ? 1000 : (isFloorTile ? 1 : Math.floor(domY)),
                                    outline: isSelected ? '3px solid #3b82f6' : 'none',
                                    outlineOffset: '2px',
                                    cursor: isDragging && isSelected ? 'grabbing' : 'grab'
                                }}
                                onPointerDown={(e) => handlePointerDown(e, loc.id)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                                onContextMenu={(e) => handleContextMenu(e, loc.id)}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {isSelected && (
                                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-1 z-50 border border-blue-400">
                                        <span>{loc.name}</span>
                                        {selectedIds.length > 1 && (
                                            <span className="bg-amber-400 text-slate-950 px-1 rounded font-black">
                                                {selectedIds.indexOf(loc.id) + 1}/{selectedIds.length}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {renderIcon(loc.type, loc.name, loc)}
                            </div>
                        );
                    })}
                </div>
            </div>

            
            {/* Multi-Selection Floating Action Bar in Admin */}
            {selectedIds.length > 1 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/95 backdrop-blur-2xl border border-blue-500/60 rounded-2xl shadow-2xl p-3 px-5 text-white flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                        <span className="font-black text-sm text-blue-300">{selectedIds.length} Items Selected</span>
                        <span className="text-xs text-slate-400 font-medium">(Drag any to move all together)</span>
                    </div>

                    <div className="h-5 w-px bg-white/20" />

                    {/* Batch Nudge Buttons */}
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 mr-1 font-bold">NUDGE:</span>
                        <button 
                            type="button"
                            onClick={() => setVenues(prev => prev.map(v => selectedIds.includes(v.id) ? { ...v, virtualX: v.virtualX - 20 } : v))} 
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold font-mono"
                        >
                            X-20
                        </button>
                        <button 
                            type="button"
                            onClick={() => setVenues(prev => prev.map(v => selectedIds.includes(v.id) ? { ...v, virtualX: v.virtualX + 20 } : v))} 
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold font-mono"
                        >
                            X+20
                        </button>
                        <button 
                            type="button"
                            onClick={() => setVenues(prev => prev.map(v => selectedIds.includes(v.id) ? { ...v, virtualY: v.virtualY - 20 } : v))} 
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold font-mono"
                        >
                            Y-20
                        </button>
                        <button 
                            type="button"
                            onClick={() => setVenues(prev => prev.map(v => selectedIds.includes(v.id) ? { ...v, virtualY: v.virtualY + 20 } : v))} 
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold font-mono"
                        >
                            Y+20
                        </button>
                    </div>

                    <div className="h-5 w-px bg-white/20" />

                    <button 
                        type="button"
                        onClick={() => handleDuplicateOne()} 
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                    >
                        <span>Duplicate All ({selectedIds.length})</span>
                    </button>

                    <button 
                        type="button"
                        onClick={() => deleteSelected()} 
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30"
                    >
                        <span>Delete All ({selectedIds.length})</span>
                    </button>

                    <button 
                        type="button"
                        onClick={() => setSelectedIds([])} 
                        className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors ml-1"
                        title="Clear Selection"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Right-Click Context Menu for any component */}
            {contextMenu && (() => {
                const target = venues.find(v => v.id === contextMenu.id);
                if (!target) return null;

                return (
                    <div 
                        className="fixed inset-0 z-[9999]"
                        onClick={() => setContextMenu(null)}
                        onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
                    >
                        <div 
                            className="absolute bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 min-w-[220px] text-white animate-in fade-in zoom-in-95 duration-150"
                            style={{ 
                                left: Math.min(typeof window !== 'undefined' ? window.innerWidth - 240 : 800, contextMenu.x), 
                                top: Math.min(typeof window !== 'undefined' ? window.innerHeight - 200 : 600, contextMenu.y) 
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-3 py-2 border-b border-slate-800 mb-1">
                                <p className="font-black text-xs text-white truncate">{target.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{target.type}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    handleDuplicateOne(target.id);
                                    setContextMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <span>📋</span>
                                <span>Duplicate</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    handleBatchDuplicate(target.id);
                                    setContextMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <span>👯</span>
                                <span>Duplicate & Tile ({dupCount}x)</span>
                            </button>

                            <div className="my-1 border-t border-slate-800" />

                            <button
                                type="button"
                                onClick={() => {
                                    setVenues(prev => prev.filter(x => x.id !== target.id));
                                    if (selectedId === target.id) setSelectedId(null);
                                    setContextMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <span>🗑️</span>
                                <span>Delete Component</span>
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
