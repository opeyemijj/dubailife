"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getVenues } from "@/app/actions/venue";
import { saveMapSeed } from "@/app/actions/saveSeed";
import { MapBackground } from './MapBackground';
import { mapSeed, mapConfig } from '@/data/mapSeed';
import { 
  Pencil, RotateCw, ZoomIn, ZoomOut, Save, Copy, Trash2, X, Move, Plus, 
  Check, Sliders, Eye, Sparkles, ChevronRight, Layers, ArrowUpRight, Train
} from 'lucide-react';

import { WORLD_WIDTH, WORLD_HEIGHT, EstateBase, ClickableHouseNew, ApartmentBuildingIconNew, RooftopIconNew, NightclubIconNew, RestaurantIconNew, EstateCommunityBlock, SmallHouseIcon, StadiumIcon, HospitalIcon, SchoolIcon, CasinoIcon, ParkIcon, BurjKhalifaIcon, BulgariIslandIcon, AtlantisTheRoyalIcon, BeachClubIconNew, JumeirahBeachHotelIcon, BurjAlArabIcon, MuseumOfTheFutureIcon, DubaiFrameIcon, AtlantisIcon, EmiratesTowersIcon, GevoraIcon, RoseRayhaanIcon, DWTCIcon, SalikGate, RoadSign, SkylineTower, AirportBlock, VillaHouse, ApartmentHouse, TycoonBlock, BluewatersBlock, ArabianRanchesBlock, JBRBlock, EmiratesHillsBlock, BusinessBayBlock, DeiraBlock, MotorCityBlock, PalmCommunityBlock, GenericNeighborhood, BillboardSpace, IsometricBillboard, DubaiMetroStation, MetroStationBlock, categoryColors, BridgeBlock, AdPlacement, initialAds, getBuildingSprite, ActionDef, venueActions } from './Icons';

export function InteractiveMap() {
  const router = useRouter();
  const [venues, setVenues] = useState<any[]>(mapSeed);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const dragRef = useRef<{
    id: string | null;
    startX: number;
    startY: number;
    initialVx: number;
    initialVy: number;
  }>({ id: null, startX: 0, startY: 0, initialVx: 0, initialVy: 0 });

  const [playerPos, setPlayerPos] = useState({ x: 1500, y: 750 });
  const [isTraveling, setIsTraveling] = useState(false);
  const [walletBalance, setWalletBalance] = useState(50000);
  const [toastMsg, setToastMsg] = useState<{ text: string, type: 'credit' | 'debit' } | null>(null);

  const [ads, setAds] = useState<any[]>(initialAds);
  const [minScale, setMinScale] = useState(0.3);

  useEffect(() => {
    const handleResize = () => {
      const scale = window.innerWidth / WORLD_WIDTH;
      setMinScale(Math.min(scale * 0.5, 0.15));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [adModalOpen, setAdModalOpen] = useState(false);
  const [adTargetCell, setAdTargetCell] = useState<{x: number, y: number} | null>(null);
  const [adForm, setAdForm] = useState({ w: 2, h: 2, imgBase64: '' });
  
  const handleAdGridClick = (e: React.MouseEvent<SVGRectElement>) => {
    e.stopPropagation();
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    const gridX = Math.floor(x / 20);
    const gridY = Math.floor(y / 20);
    
    const clickedAd = ads.find(a => gridX >= a.gridX && gridX < a.gridX + a.w && gridY >= a.gridY && gridY < a.gridY + a.h);
    if (clickedAd) {
       showToast('Ad space already rented!', 'debit');
    } else {
       setAdTargetCell({ x: gridX, y: gridY });
       setAdForm({ w: 4, h: 4, imgBase64: '' });
       setAdModalOpen(true);
    }
  };
  
  const handleAdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onload = (ev) => setAdForm(prev => ({ ...prev, imgBase64: ev.target?.result as string }));
     reader.readAsDataURL(file);
  };
  
  const purchaseAdSpace = () => {
     if (!adTargetCell || !adForm.imgBase64) return;
     const cost = adForm.w * adForm.h * 500;
     if (walletBalance < cost) {
        showToast('Not enough D-Coins!', 'debit');
        return;
     }
     
     const isOverlap = ads.some(a => {
        return adTargetCell.x < a.gridX + a.w && adTargetCell.x + adForm.w > a.gridX &&
               adTargetCell.y < a.gridY + a.h && adTargetCell.y + adForm.h > a.gridY;
     });
     
     if (isOverlap) {
        showToast('Ad overlaps with another!', 'debit');
        return;
     }
     if (adTargetCell.x + adForm.w > 40 || adTargetCell.y + adForm.h > 20) {
        showToast('Ad exceeds grid bounds!', 'debit');
        return;
     }
     
     setWalletBalance(prev => prev - cost);
     setAds(prev => [...prev, {
        id: 'ad-' + Date.now(),
        gridX: adTargetCell.x,
        gridY: adTargetCell.y,
        w: adForm.w,
        h: adForm.h,
        img: adForm.imgBase64
     }]);
     showToast('Ad Space Purchased!', 'credit');
     setAdModalOpen(false);
  };

  

  const [billboardModalOpen, setBillboardModalOpen] = useState(false);
  const [selectedBillboard, setSelectedBillboard] = useState<any>(null);
  const [billboardForm, setBillboardForm] = useState({
    imageUrl: '',
    rentedBy: '',
    adTitle: '',
    adSubtitle: '',
    cost: 500,
    durationWeeks: 1
  });

  const handleBillboardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBillboardForm(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRentBillboard = () => {
    if (!selectedBillboard) return;
    if (!billboardForm.imageUrl && !billboardForm.adTitle) {
      showToast('Please upload an image or provide a campaign title!', 'debit');
      return;
    }
    const cost = billboardForm.cost || 500;
    if (walletBalance < cost) {
      showToast('Not enough D-Coins!', 'debit');
      return;
    }

    setWalletBalance(prev => prev - cost);
    setVenues(prev => prev.map(v => {
      if (v.id === selectedBillboard.id) {
        return {
          ...v,
          isRented: true,
          imageUrl: billboardForm.imageUrl,
          rentedBy: billboardForm.rentedBy || 'Your Brand',
          adTitle: billboardForm.adTitle || 'PREMIUM CAMPAIGN',
          adSubtitle: billboardForm.adSubtitle || 'Verified Ad',
          rentalPrice: `${cost} D-Coins / wk`,
        };
      }
      return v;
    }));

    showToast('🎉 Billboard Rented & Ad Live on Map!', 'credit');
    setBillboardModalOpen(false);
  };

  const handleClearBillboard = () => {
    if (!selectedBillboard) return;
    setVenues(prev => prev.map(v => {
      if (v.id === selectedBillboard.id) {
        return {
          ...v,
          isRented: false,
          imageUrl: '',
          rentedBy: '',
          adTitle: '',
          adSubtitle: '',
        };
      }
      return v;
    }));
    showToast('Billboard cleared & available for rent!', 'debit');
    setBillboardModalOpen(false);
  };

  // Dubai Metro Red Line Station & Transit States
  const [metroModalOpen, setMetroModalOpen] = useState(false);
  const [selectedMetroStation, setSelectedMetroStation] = useState<any>(null);
  const [selectedDestination, setSelectedDestination] = useState<string>('metro-station-moe');
  const [selectedCabinClass, setSelectedCabinClass] = useState<'silver' | 'gold'>('silver');

  const metroStationsList = [
    {
      id: 'metro-station-burj',
      name: 'Burj Khalifa / Dubai Mall',
      code: '25',
      virtualX: 1100,
      virtualY: 1615,
      landmarks: 'Downtown Dubai • Dubai Mall • Burj Khalifa • Dubai Opera',
      platform1: 'Towards Expo 2020 / UAE Exchange (in 2 min)',
      platform2: 'Towards Centrepoint / DXB Airport (in 4 min)'
    },
    {
      id: 'metro-station-moe',
      name: 'Mall of the Emirates',
      code: '32',
      virtualX: 2200,
      virtualY: 1752,
      landmarks: 'Al Barsha • Ski Dubai • Kempinski • VOX Cinemas',
      platform1: 'Towards Expo 2020 / UAE Exchange (in 1 min)',
      platform2: 'Towards Centrepoint / DXB Airport (in 3 min)'
    },
    {
      id: 'metro-station-marina',
      name: 'DMCC / Dubai Marina',
      code: '37',
      virtualX: 3250,
      virtualY: 1883,
      landmarks: 'Dubai Marina • JLT • Dubai Tram Interchange • Marina Promenade',
      platform1: 'Towards UAE Exchange (in 3 min)',
      platform2: 'Towards Centrepoint / DXB Airport (in 2 min)'
    }
  ];

  const handleBoardMetro = () => {
    if (!selectedMetroStation) return;
    const dest = metroStationsList.find(s => s.id === selectedDestination) || metroStationsList[0];
    const fare = selectedCabinClass === 'gold' ? 10 : 5;
    if (walletBalance < fare) {
      showToast('Insufficient Nol Card balance! Please recharge.', 'debit');
      return;
    }

    setWalletBalance(prev => prev - fare);
    setMetroModalOpen(false);

    showToast(`🚆 Boarded Dubai Metro Red Line! Fare: ${fare} AED (${selectedCabinClass.toUpperCase()} Class). Doors closing...`, 'credit');

    // Smooth transit animation along the metro viaduct
    setIsTraveling(true);
    setPlayerPos({ x: dest.virtualX, y: WORLD_HEIGHT - dest.virtualY });

    setTimeout(() => {
      setIsTraveling(false);
      showToast(`📍 Arrived at ${dest.name}! Welcome to Dubai.`, 'credit');
    }, 1800);
  };

  const handleTopUpNol = (amount: number) => {
    setWalletBalance(prev => prev + amount);
    showToast(`💳 Nol Card topped up with ${amount} AED!`, 'credit');
  };

  useEffect(() => {
    loadVenues();
  }, []);
  const loadVenues = async () => {
    setVenues(mapSeed);
  };

  const showToast = (text: string, type: 'credit' | 'debit') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSubUnitClick = (unitId: string, unitName: string) => {
    setSelectedVenue({
      id: unitId,
      name: unitName,
      type: 'sub-unit',
      description: 'A privately owned unit within the complex.',
      interactive: true,
      options: [
        { label: "Purchase Unit (500k AED)", amount: -500000, color: "bg-blue-600" }
      ]
    });
  };

  const handleVenueClick = (loc: any) => {
    const isFloor = loc.type === 'floor-tile' || loc.type === 'island-plain' || loc.type === 'two-plains-tile' || loc.type === 'plot' || loc.type === 'building-plot' || loc.type === 'base-plot' || loc.type?.includes('floor-tile') || loc.type?.includes('plot');
    if (isFloor) return;

    if (loc.type === 'metro-station' || loc.type === 'metro' || loc.type === 'dubai-metro') {
      setSelectedMetroStation(loc);
      const defaultDest = loc.id === 'metro-station-burj' ? 'metro-station-moe' : 'metro-station-burj';
      setSelectedDestination(defaultDest);
      setSelectedCabinClass('silver');
      setMetroModalOpen(true);
      return;
    }
    if (loc.type === 'giant-billboard' || loc.type === 'billboard' || loc.type === 'ad-billboard') {
      setSelectedBillboard(loc);
      setBillboardForm({
        imageUrl: loc.imageUrl || loc.image || loc.img || '',
        rentedBy: loc.rentedBy || '',
        adTitle: loc.adTitle || loc.text1 || '',
        adSubtitle: loc.adSubtitle || loc.text2 || '',
        cost: 500,
        durationWeeks: 1
      });
      setBillboardModalOpen(true);
      return;
    }
    if (isTraveling) return;
    setIsTraveling(true);
    setPlayerPos({ x: loc.virtualX, y: WORLD_HEIGHT - loc.virtualY });
    setTimeout(() => {
      setIsTraveling(false);
      if(loc.interactive !== false) setSelectedVenue(loc);
    }, 1500);
  };

  const executeAction = (loc: any, action: ActionDef) => {
    setWalletBalance(prev => prev + action.amount);
    if (action.amount > 0) showToast(`Earned ${action.amount} AED!`, 'credit');
    else if (action.amount < 0) showToast(`Paid ${Math.abs(action.amount).toLocaleString()} AED.`, 'debit');
    
    setSelectedVenue(null);
    setTimeout(() => router.push(`/venue/${loc.id}`), 1000);
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    const venue = venues.find(v => v.id === id);
    if (!venue) return;
    setSelectedEditId(id);
    setIsDraggingItem(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialVx: venue.virtualX,
      initialVy: venue.virtualY
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingItem || !dragRef.current.id) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    setVenues(prev => prev.map(v => {
      if (v.id === dragRef.current.id) {
        return {
          ...v,
          virtualX: Math.round(dragRef.current.initialVx + dx),
          virtualY: Math.round(dragRef.current.initialVy - dy)
        };
      }
      return v;
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingItem) return;
    setIsDraggingItem(false);
    dragRef.current.id = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const updateSelectedField = (field: string, value: any) => {
    if (!selectedEditId) return;
    setVenues(prev => prev.map(v => v.id === selectedEditId ? { ...v, [field]: value } : v));
  };

  const handleSaveMap = async () => {
    setIsSaving(true);
    try {
      const res = await saveMapSeed(venues, mapConfig);
      if (res.success) {
        showToast('Map changes saved successfully!', 'credit');
      } else {
        showToast('Failed to save: ' + res.error, 'debit');
      }
    } catch (err: any) {
      showToast('Error saving map', 'debit');
    } finally {
      setIsSaving(false);
    }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const handleDeleteSelected = (targetId?: string) => {
    const idToDelete = targetId || selectedEditId;
    if (!idToDelete) return;
    const toDelete = venues.find(v => v.id === idToDelete);
    setVenues(prev => prev.filter(v => v.id !== idToDelete));
    if (selectedEditId === idToDelete) setSelectedEditId(null);
    showToast(`Removed ${toDelete?.name || 'landmark'}`, 'debit');
  };

  const [dupCount, setDupCount] = useState<number>(3);
  const [dupDirection, setDupDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [dupGap, setDupGap] = useState<number>(20);

  const handleDuplicateSelected = (targetId?: string) => {
    const idToDup = targetId || selectedEditId;
    if (!idToDup) return;
    const item = venues.find(v => v.id === idToDup);
    if (!item) return;
    const newId = `${item.type}-${Date.now().toString().slice(-4)}`;
    const newItem = {
      ...item,
      id: newId,
      name: `${item.name} (Copy)`,
      virtualX: item.virtualX + 60,
      virtualY: item.virtualY - 60
    };
    setVenues(prev => [...prev, newItem]);
    setSelectedEditId(newId);
    showToast('Landmark duplicated', 'credit');
  };

  const handleBatchDuplicate = (targetId?: string) => {
    const idToDup = targetId || selectedEditId;
    if (!idToDup) return;
    const item = venues.find(v => v.id === idToDup);
    if (!item) return;

    const count = Math.max(1, Math.min(50, dupCount || 1));
    const scale = item.scale || 1;
    const itemW = (item.width || 200) * scale;
    const itemH = (item.height || 180) * scale;
    const gap = Number(dupGap) || 0;

    const newItems: any[] = [];
    const timestamp = Date.now();

    for (let i = 1; i <= count; i++) {
      const newId = `${item.type}-${timestamp.toString().slice(-4)}-${i}`;
      let nextX = item.virtualX;
      let nextY = item.virtualY;

      if (dupDirection === 'horizontal') {
        nextX = Math.round(item.virtualX + i * (itemW + gap));
      } else {
        nextY = Math.round(item.virtualY - i * (itemH + gap));
      }

      newItems.push({
        ...item,
        id: newId,
        name: `${item.name} (${i})`,
        virtualX: nextX,
        virtualY: nextY,
      });
    }

    setVenues(prev => [...prev, ...newItems]);
    if (newItems.length > 0) {
      setSelectedEditId(newItems[newItems.length - 1].id);
    }
    showToast(`Tiled ${count} duplicates ${dupDirection}ly!`, 'credit');
  };

  const handleAddNewItem = (type: string, name: string) => {
    const newId = `${type}-${Date.now().toString().slice(-4)}`;
    const newItem: any = {
      id: newId,
      name,
      type,
      virtualX: 1800,
      virtualY: 1000,
      rotate: 0,
      scale: 1
    };
    if (type === 'plot' || type === 'building-plot' || type === 'base-plot') {
      newItem.width = 320;
      newItem.height = 320;
    }
    if (type === 'salik') {
      newItem.virtualX = 1500;
      newItem.virtualY = 984; // On E11 straight line (1171.5 - 0.125 * 1500)
      newItem.rotate = 97;
    }
    setVenues(prev => [...prev, newItem]);
    setSelectedEditId(newId);
    setShowAddMenu(false);
    showToast(`Added ${name}!`, 'credit');
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode) {
      setSelectedEditId(null);
      return;
    }
    if (isTraveling || e.target !== e.currentTarget) return;
    setIsTraveling(true);
    setPlayerPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    setTimeout(() => setIsTraveling(false), 1500);
  };

  
  
  
  
  
  const boats = useMemo(() => {
    const arr = [];
    const yachtColors = ['#ffffff', '#f8fafc', '#e2e8f0'];
    const jetskiColors = ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
    
    for (let i = 0; i < 40; i++) {
      const isMegaYacht = false; // Turned off animated mega yachts, making them static
      const isYacht = i >= 2 && i < 15;
      const isBoat = isMegaYacht || isYacht;
      
      const prng = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      
      let pathId = '';
      if (isMegaYacht) {
        pathId = i === 0 ? '#route-mega-1' : '#route-mega-2';
      } else if (isYacht) {
        const routes = ['#route-yacht-1', '#route-yacht-2', '#route-yacht-3', '#route-yacht-4'];
        pathId = routes[i % routes.length];
      } else {
        const routes = ['#route-jetski-1', '#route-jetski-2', '#route-jetski-3', '#route-jetski-4', '#route-jetski-5'];
        pathId = routes[i % routes.length];
      }
      
      arr.push({
        id: i,
        type: isMegaYacht ? 'mega-yacht' : (isYacht ? 'yacht' : 'jetski'),
        color: isBoat ? yachtColors[Math.floor(prng * yachtColors.length)] : jetskiColors[Math.floor(prng * jetskiColors.length)],
        duration: isMegaYacht ? 90 : (prng * (isYacht ? 100 : 40) + (isYacht ? 80 : 30)),
        delay: isMegaYacht ? -(i * 45) : -(prng * 200),
        // Add random scatter offset even to mega yachts slightly to avoid overlapping perfectly if paths cross
        offset: isMegaYacht ? (prng2 - 0.5) * 40 : (prng2 - 0.5) * 160,
        path: pathId
      });
    }
    return arr;
  }, []);

  const cars = useMemo(() => {
    const arr = [];
    const types = ['taxi', 'bus', 'scooter', 'suv', 'sedan'];
    const taxiColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
    const carColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ec4899', '#ffffff', '#cbd5e1', '#8b5cf6'];
    
    for (let i=0; i<60; i++) { // Reduced count from 200 to 60
      const isReverse = i % 2 === 0;
      const road = i % 4; 
      
      const prng1 = ((i * 9301 + 49297) % 233280) / 233280;
      const prng2 = (((i+1) * 9301 + 49297) % 233280) / 233280;
      const prng3 = (((i+2) * 9301 + 49297) % 233280) / 233280;
      
      const type = types[Math.floor(prng1 * types.length)];
      
      const isE11 = road <= 1;
      const laneIndex = isE11 ? Math.floor(prng2 * 3) : Math.floor(prng2 * 2);
      
      // Increased base offset significantly to ensure massive visual separation between directions
      const laneOffset = isE11 ? (8 + laneIndex * 9) : (7 + laneIndex * 8);
      
      arr.push({
        id: i,
        type,
        color: type === 'taxi' ? taxiColors[Math.floor(prng3 * taxiColors.length)] : carColors[Math.floor(prng3 * carColors.length)],
        duration: prng2 * (type === 'bus' ? 40 : type === 'scooter' ? 50 : 25) + 20, 
        delay: -(prng1 * 100),
        laneOffset,
        path: isE11 ? (isReverse ? '#e11-left' : '#e11-right') : (isReverse ? '#jum-left' : '#jum-right')
      });
    }
    return arr;
  }, []);





  const allRenderedEntities = useMemo(() => {
    return venues.map(loc => ({
      ...loc,
      renderedX: loc.virtualX,
      renderedY: WORLD_HEIGHT - loc.virtualY
    })).sort((a, b) => a.renderedY - b.renderedY);
  }, [venues]);

  return (
    <div className="absolute inset-0 w-screen h-[100dvh] z-0 bg-[#d6bc8a] overflow-hidden">
      
      {/* Top Left: Edit Mode Controls */}
      <div className="absolute top-6 left-6 z-50 flex items-center gap-3 pointer-events-auto">
        <button
          onClick={() => {
            setIsEditMode(!isEditMode);
            if (isEditMode) setSelectedEditId(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold shadow-xl transition-all ${
            isEditMode 
              ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 font-black ring-2 ring-amber-300' 
              : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border border-white/20 backdrop-blur-md'
          }`}
        >
          <Pencil className="w-4 h-4" />
          <span>{isEditMode ? 'Exit Edit Mode' : 'Edit Map'}</span>
        </button>

        {isEditMode && (
          <>
            <button
              onClick={handleSaveMap}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Map'}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>

              {showAddMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl py-2 z-50 text-white text-xs font-semibold">
                  <div className="px-3 py-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Presets</div>
                  <button onClick={() => handleAddNewItem('plot', 'Building Plot')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">📐 Building Plot (Base Plain)</button>
                  <button onClick={() => handleAddNewItem('tall-building', 'Dubai Skyscraper')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🏢 Tall Skyscraper (2.5D)</button>
                  <button onClick={() => handleAddNewItem('floor-tile', 'Island Floor Tile')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🏝️ Floor Tile (Single Plain)</button>
                  <button onClick={() => handleAddNewItem('burj-khalifa', 'Burj Khalifa')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🗼 Burj Khalifa</button>
                  <button onClick={() => handleAddNewItem('mall', 'Shopping Mall')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🛍️ Shopping Mall</button>
                  <button onClick={() => handleAddNewItem('museum-future', 'Museum of the Future')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🏛️ Museum of Future</button>
                  <button onClick={() => handleAddNewItem('dubai-frame', 'Dubai Frame')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🖼️ Dubai Frame</button>
                  <button onClick={() => handleAddNewItem('salik', 'Salik Toll Gate')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🚧 Salik Gate</button>
                  <button onClick={() => handleAddNewItem('community-palm', 'Palm Island')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🌴 Palm Community</button>
                  <button onClick={() => handleAddNewItem('hotel', 'Luxury Hotel')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🏨 Hotel Resort</button>
                  <button onClick={() => handleAddNewItem('small-house', 'Modern House')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🏡 House (Isometric Plot)</button>
                  <button onClick={() => handleAddNewItem('dubai-villa', 'Dubai Luxury Villa')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🏰 Dubai Luxury Villa (Pool & Palm)</button>
                  <button onClick={() => handleAddNewItem('hospital', 'Dubai Hospital')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🏥 Dubai Hospital (Helipad & ER)</button>
                  <button onClick={() => handleAddNewItem('beach', 'Dubai Beach Club')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🏖️ Dubai Beach & Beach Club</button>
                  <button onClick={() => handleAddNewItem('configurable-apartment', 'Apartment Complex')} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">🏢 Apartment Complex</button>
                </div>
              )}
            </div>

            <a
              href="/admin"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-2 rounded-2xl text-xs font-bold text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 transition-colors"
            >
              <span>Studio</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </>
        )}
      </div>

      {isEditMode && (
        <div className="absolute top-20 left-6 z-40 bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 text-xs px-3.5 py-1.5 rounded-full pointer-events-none flex items-center gap-2 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Click any landmark to drag, rotate, or resize</span>
        </div>
      )}

      {/* Top Right: Economy */}
      <div className="absolute top-6 right-6 z-50 bg-white border border-gray-200 p-4 rounded-2xl shadow-xl pointer-events-auto">
        <p className="text-xs text-gray-500 font-extrabold uppercase tracking-widest mb-1">D-Coins</p>
        <p className="text-2xl font-black text-green-600">{walletBalance.toLocaleString()} AED</p>
      </div>

      {toastMsg && (
        <div className="absolute top-24 right-6 z-50 animate-in slide-in-from-right fade-in duration-300 pointer-events-none">
          <div className={`px-4 py-3 rounded-xl font-bold border shadow-xl bg-white ${toastMsg.type === 'credit' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}>
            {toastMsg.text}
          </div>
        </div>
      )}

      <TransformWrapper 
        initialScale={mapConfig?.startScale || 0.8} 
        initialPositionX={mapConfig?.startX || -1000} 
        initialPositionY={mapConfig?.startY || -500}
        minScale={0.3} 
        maxScale={4}
        smooth={false}
        wheel={{ step: 0.04 }}
        doubleClick={{ disabled: true }}
        limitToBounds={false}
        centerZoomedOut={false}
        panning={{ velocityDisabled: false, disabled: isDraggingItem }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <div 
            className="relative cursor-crosshair origin-center" 
            style={{ 
              width: `${WORLD_WIDTH}px`, 
              height: `${WORLD_HEIGHT}px`, 
              backgroundColor: "#d6bc8a"
            }} 
            onClick={handleMapClick}
          >
            
            <MapBackground />

            <div 
              className="absolute z-50 -translate-x-1/2 -translate-y-1/2 transition-all ease-in-out pointer-events-none"
              style={{ left: playerPos.x, top: playerPos.y, transitionDuration: '1500ms' }}
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full border-4 border-white flex items-center justify-center shadow-2xl">
                 <div className="w-3 h-3 bg-white rounded-full" />
              </div>
            </div>

            {allRenderedEntities.map((loc) => {
              const isFloorTile = loc.type === 'floor-tile' || loc.type === 'island-plain' || loc.type === 'two-plains-tile' || loc.type === 'plot' || loc.type === 'building-plot' || loc.type === 'base-plot' || loc.type?.includes('floor-tile') || loc.type?.includes('plot');
              const isOverlay = isFloorTile || loc.type === 'bridge' || loc.type.startsWith('community') || loc.type === 'generic-district' || loc.type === 'salik' || loc.type === 'road-sign' || loc.type === 'airport' || loc.type === "ad-land" || loc.type === "hotel" || loc.type === "mall" || loc.type === "museum-future" || loc.type === "apartment-complex" || loc.type === "giant-billboard" || loc.type === "billboard" || loc.type === "ad-billboard" || loc.type === "metro-station" || loc.type === "metro" || loc.type === "dubai-metro" || loc.type === "marina" || loc.type === "marina-harbour" || loc.type === "configurable-apartment" || loc.type === "small-house" || loc.type === "house" || loc.type === "dubai-villa" || loc.type === "villa" || loc.type === "hospital" || loc.type === "medical" || loc.type === "isometric-hospital" || loc.type === "beach" || loc.type === "beach-club" || loc.type === "isometric-beach";
              const baseTransform = isOverlay ? 'translate(-50%, -50%)' : 'translate(-50%, -90%)';
              const rotationTransform = loc.rotate !== undefined ? `rotate(${loc.rotate}deg)` : '';
              const scaleTransform = loc.scale !== undefined ? `scale(${loc.scale})` : '';
              const skewTransform = (loc.skewX || loc.skewY) ? `skew(${loc.skewX || 0}deg, ${loc.skewY || 0}deg)` : (loc.skew !== undefined ? `skewX(${loc.skew}deg)` : '');
              const perspectiveTransform = (loc.tilt || loc.yaw) ? 'perspective(1000px)' : '';
              const tiltTransform = loc.tilt !== undefined && loc.tilt !== 0 ? `rotateX(${loc.tilt}deg)` : '';
              const yawTransform = loc.yaw !== undefined && loc.yaw !== 0 ? `rotateY(${loc.yaw}deg)` : '';
              
              const isSelectedInEdit = isEditMode && selectedEditId === loc.id;
              const zClass = isSelectedInEdit ? 'z-50' : (isFloorTile ? 'z-0' : ((loc.type === 'generic-district' || loc.type === 'ad-land') ? 'z-10' : (isOverlay ? 'z-20' : 'z-30')));

              return (
                <div 
                  key={loc.id} 
                  className={`absolute flex flex-col items-center preserve-3d select-none transition-shadow
                    ${isEditMode 
                      ? `cursor-grab active:cursor-grabbing ${isSelectedInEdit ? 'ring-4 ring-blue-500 ring-offset-4 ring-offset-amber-900/30 rounded-xl shadow-[0_0_35px_rgba(59,130,246,0.8)]' : 'hover:ring-2 hover:ring-amber-400/80 rounded-xl'}` 
                      : (isFloorTile
                          ? 'cursor-default pointer-events-auto'
                          : (loc.interactive !== false ? 'group cursor-pointer hover:scale-105' : 'pointer-events-none'))} 
                    ${zClass}`
                  }
                  style={{ 
                    left: loc.renderedX, 
                    top: loc.renderedY,
                    transform: `${baseTransform} ${perspectiveTransform} ${yawTransform} ${tiltTransform} ${rotationTransform} ${scaleTransform} ${skewTransform}`.trim(), 
                    transformOrigin: isOverlay ? "center" : "bottom center",
                    transformStyle: 'preserve-3d'
                  }}
                  onPointerDown={(e) => isEditMode ? handlePointerDown(e, loc.id) : undefined}
                  onPointerMove={isEditMode ? handlePointerMove : undefined}
                  onPointerUp={isEditMode ? handlePointerUp : undefined}
                  onPointerCancel={isEditMode ? handlePointerUp : undefined}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditMode(true);
                    setSelectedEditId(loc.id);
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      id: loc.id,
                    });
                  }}
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      setSelectedEditId(loc.id);
                    } else if (!isFloorTile && loc.interactive !== false) {
                      handleVenueClick(loc);
                    }
                  }}
                >
                  {isSelectedInEdit && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full shadow-2xl whitespace-nowrap pointer-events-none flex items-center gap-2 border border-blue-400 z-50">
                      <Move className="w-3 h-3 animate-pulse" />
                      <span>{loc.name}</span>
                      <span className="text-blue-200">({loc.virtualX}, {loc.virtualY})</span>
                      <span className="bg-blue-800/80 px-1.5 py-0.5 rounded text-[10px]">{loc.rotate || 0}°</span>
                      <span className="bg-blue-800/80 px-1.5 py-0.5 rounded text-[10px]">{loc.scale || 1}x</span>
                      {(loc.skewX || loc.skewY || loc.skew) ? (
                        <span className="bg-purple-800/80 px-1.5 py-0.5 rounded text-[10px]">{loc.skewX || loc.skew || 0}°</span>
                      ) : null}
                    </div>
                  )}
                  
                  {loc.type === 'ad-land' ? (
                     <div className="relative">
                        <svg viewBox="0 0 800 400" className="w-[800px] h-[400px] drop-shadow-2xl z-10 cursor-pointer rounded-xl bg-[#3b82f6]">
                           <defs>
                              <pattern id="adGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                 <rect width="20" height="20" fill="transparent" stroke="#60a5fa" strokeWidth="1" />
                              </pattern>
                           </defs>
                           <rect width="800" height="400" fill="url(#adGrid)" />
                           {ads.map(ad => (
                              <image key={ad.id} href={ad.img} x={ad.gridX * 20} y={ad.gridY * 20} width={ad.w * 20} height={ad.h * 20} preserveAspectRatio="none" className="pointer-events-none" />
                           ))}
                           <rect width="800" height="400" fill="transparent" onClick={handleAdGridClick} />
                        </svg>
                        
                     </div>
                  ) : (
                     <>
                        <div className={`${loc.size || ''} transition-transform ${loc.interactive !== false && !isOverlay ? '' : ''} flex justify-center items-end`}>
                           {getBuildingSprite(loc.id, loc.type, loc.seed, loc.name, loc, handleSubUnitClick)}
                        </div>

                        {loc.interactive !== false && !isFloorTile && !loc.type.startsWith('community') && loc.type !== 'generic-district' && loc.type !== 'airport' && (
                           <div className="absolute top-0 -translate-y-[50%] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                              <div className="bg-white px-3 py-1.5 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.3)] font-black text-gray-800 text-[13px] tracking-wide whitespace-nowrap border-2 border-gray-100">
                                 {loc.name}
                              </div>
                           </div>
                        )}
                     </>
                  )}

                </div>
              );
            })}

          </div>
        </TransformComponent>
      </TransformWrapper>

      <Dialog open={adModalOpen} onOpenChange={setAdModalOpen}>
        <DialogContent className="bg-white text-gray-900 border-none shadow-2xl sm:max-w-md z-[100] rounded-3xl">
           <DialogHeader><DialogTitle className="text-2xl font-black">Purchase Land Ad Space</DialogTitle></DialogHeader>
           <div className="flex flex-col gap-4 py-4">
              <p className="text-sm text-gray-500 font-bold">Selected Cell: {adTargetCell?.x}, {adTargetCell?.y}</p>
              
              <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Width (Blocks)</label>
                    <input type="number" min="1" max={40 - (adTargetCell?.x || 0)} value={adForm.w} onChange={e => setAdForm({...adForm, w: parseInt(e.target.value)||1})} className="w-full border rounded-lg p-2 font-bold" />
                 </div>
                 <div className="flex-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Height (Blocks)</label>
                    <input type="number" min="1" max={20 - (adTargetCell?.y || 0)} value={adForm.h} onChange={e => setAdForm({...adForm, h: parseInt(e.target.value)||1})} className="w-full border rounded-lg p-2 font-bold" />
                 </div>
              </div>
              
              <div>
                 <label className="text-xs font-bold text-gray-400 uppercase">Upload Image</label>
                 <input type="file" accept="image/*" onChange={handleAdUpload} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              
              {adForm.imgBase64 && (
                 <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={adForm.imgBase64} alt="Preview" className="max-h-full object-contain" />
                 </div>
              )}
              
              <div className="mt-4 pt-4 border-t">
                 <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-gray-600">Total Cost:</span>
                    <span className="text-xl font-black text-green-600">{(adForm.w * adForm.h * 500).toLocaleString()} AED</span>
                 </div>
                 <Button onClick={purchaseAdSpace} className="w-full h-12 rounded-xl text-lg font-black bg-blue-600 hover:bg-blue-700 text-white">
                    Purchase Space
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* BILLBOARD AD RENTAL & MANAGEMENT MODAL                               */}
      {/* ==================================================================== */}
      <Dialog open={billboardModalOpen} onOpenChange={setBillboardModalOpen}>
        <DialogContent className="bg-slate-900 text-white border border-slate-700/80 shadow-2xl sm:max-w-xl z-[100] rounded-3xl max-h-[90vh] overflow-y-auto">
          {selectedBillboard && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                      <span>🪧</span>
                      <span>{selectedBillboard.name || 'Dubai Highway Billboard'}</span>
                    </DialogTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Style: <span className="text-amber-400 font-bold uppercase">{selectedBillboard.billboardStyle || 'mega-led'}</span> • Direction: <span className="text-sky-400 font-semibold">Isometric Floor Tile Aligned</span>
                    </p>
                  </div>
                  <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    selectedBillboard.isRented 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {selectedBillboard.isRented ? '● RENTED' : '○ FOR RENT'}
                  </span>
                </div>
              </DialogHeader>

              {/* LIVE ISOMETRIC PREVIEW */}
              <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Live Screen Preview
                </div>
                <div className="w-[280px] h-[210px] flex items-center justify-center">
                  <IsometricBillboard 
                    id={`preview-${selectedBillboard.id}`}
                    width={280}
                    height={210}
                    billboardStyle={selectedBillboard.billboardStyle || 'mega-led'}
                    imageUrl={billboardForm.imageUrl}
                    isRented={!!(billboardForm.imageUrl || billboardForm.adTitle || selectedBillboard.isRented)}
                    rentedBy={billboardForm.rentedBy || selectedBillboard.rentedBy || 'Your Brand'}
                    rentalPrice={selectedBillboard.rentalPrice || `${billboardForm.cost} D-Coins / wk`}
                    adTitle={billboardForm.adTitle || selectedBillboard.adTitle}
                    adSubtitle={billboardForm.adSubtitle || selectedBillboard.adSubtitle}
                  />
                </div>
              </div>

              {/* AD CREATIVE IMAGE CONFIGURATION */}
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    1. Upload Ad Creative Image
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Upload File (PNG / JPG / WebP)</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleBillboardImageUpload} 
                        className="w-full text-xs text-slate-300 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer border border-slate-700 bg-slate-800/80 rounded-xl p-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Or Paste Image URL</label>
                      <input 
                        type="text" 
                        placeholder="https://..." 
                        value={billboardForm.imageUrl} 
                        onChange={e => setBillboardForm({ ...billboardForm, imageUrl: e.target.value })} 
                        className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Sample Creative Presets */}
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Quick Sample Ad Creatives:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { label: '🏙️ Luxury Penthouse', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80', title: 'EMAAR RESIDENCES', sub: 'Starting 4.2M AED' },
                        { label: '🏎️ Exotic Supercar', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80', title: 'FERRARI DUBAI', sub: 'Drive The Legend' },
                        { label: '⌚ Luxury Watch', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80', title: 'ROLEX BOUTIQUE', sub: 'Dubai Mall Flagship' },
                        { label: '✈️ Emirates Airlines', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80', title: 'FLY EMIRATES', sub: 'Fly Better to 140+ Cities' },
                      ].map(sample => (
                        <button
                          key={sample.label}
                          type="button"
                          onClick={() => {
                            setBillboardForm({
                              ...billboardForm,
                              imageUrl: sample.url,
                              adTitle: sample.title,
                              adSubtitle: sample.sub,
                              rentedBy: sample.title.split(' ')[0]
                            });
                          }}
                          className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-left truncate transition-colors"
                        >
                          {sample.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CAMPAIGN METADATA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Advertiser / Brand</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Emaar Properties" 
                      value={billboardForm.rentedBy} 
                      onChange={e => setBillboardForm({ ...billboardForm, rentedBy: e.target.value })} 
                      className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Campaign Headline</label>
                    <input 
                      type="text" 
                      placeholder="e.g. PALM VILLA SALE" 
                      value={billboardForm.adTitle} 
                      onChange={e => setBillboardForm({ ...billboardForm, adTitle: e.target.value })} 
                      className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Tagline / Subtitle</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Starting from 3.5M AED" 
                      value={billboardForm.adSubtitle} 
                      onChange={e => setBillboardForm({ ...billboardForm, adSubtitle: e.target.value })} 
                      className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* PRICING & PAYMENT */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
                      🪙
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold">Rental Fee (1 Week)</p>
                      <p className="text-base font-black text-amber-400">{billboardForm.cost} D-Coins</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {selectedBillboard.isRented && (
                      <Button 
                        variant="destructive" 
                        onClick={handleClearBillboard}
                        className="font-bold text-xs rounded-xl h-11 px-4"
                      >
                        Clear / Relinquish
                      </Button>
                    )}
                    <Button 
                      onClick={handleRentBillboard}
                      className="flex-1 sm:flex-initial h-11 px-6 rounded-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 text-sm"
                    >
                      {selectedBillboard.isRented ? '💾 Save & Update Creative' : '🚀 Rent & Launch Ad Campaign'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* DUBAI METRO RED LINE BOARDING & TRANSIT MODAL                        */}
      {/* ==================================================================== */}
      <Dialog open={metroModalOpen} onOpenChange={setMetroModalOpen}>
        <DialogContent className="bg-slate-900 text-white border border-red-500/30 shadow-2xl sm:max-w-xl z-[100] rounded-3xl max-h-[92vh] overflow-y-auto">
          {selectedMetroStation && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-red-600/40">
                      M
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                        <span>{selectedMetroStation.name || 'Dubai Metro Station'}</span>
                      </DialogTitle>
                      <p className="text-xs text-red-400 font-bold mt-0.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span>RED LINE • STATION {selectedMetroStation.stationCode || '25'} • محطة مترو دبي</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider">
                    ● ACTIVE SERVICE
                  </span>
                </div>
              </DialogHeader>

              {/* LIVE STATION VISUAL / CANOPY PREVIEW */}
              <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Train className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span>Autonomous Driverless Fleet • Aedas Armadillo Shell</span>
                </div>
                <div className="w-[320px] h-[180px] flex items-center justify-center scale-95">
                  <DubaiMetroStation 
                    name={selectedMetroStation.name || "Burj Khalifa / Dubai Mall"}
                    stationCode={selectedMetroStation.stationCode || "25"}
                    line="red"
                    width={320}
                    height={180}
                  />
                </div>
              </div>

              {/* LIVE PLATFORM STATUS */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Platform 1 (Southbound)</p>
                  <p className="font-bold text-white mt-0.5">Towards Expo 2020 / UAE Exchange</p>
                  <p className="text-emerald-400 font-mono text-[11px] font-bold mt-1">● Arriving in 1 min</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Platform 2 (Northbound)</p>
                  <p className="font-bold text-white mt-0.5">Towards Centrepoint / DXB Airport</p>
                  <p className="text-emerald-400 font-mono text-[11px] font-bold mt-1">● Arriving in 3 min</p>
                </div>
              </div>

              {/* DESTINATION STATION SELECTOR */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                  Select Destination Metro Station
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {metroStationsList.map(stn => {
                    const isCurrent = selectedMetroStation.id === stn.id;
                    const isSelected = selectedDestination === stn.id;
                    return (
                      <button
                        key={stn.id}
                        type="button"
                        disabled={isCurrent}
                        onClick={() => setSelectedDestination(stn.id)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isCurrent 
                            ? 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-60' 
                            : isSelected 
                              ? 'bg-gradient-to-r from-red-950/80 to-slate-900 border-red-500 ring-2 ring-red-500/50 text-white shadow-lg' 
                              : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black font-mono ${
                            isSelected ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {stn.code}
                          </span>
                          <div>
                            <p className="font-black text-xs flex items-center gap-2">
                              <span>{stn.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">You are here</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{stn.landmarks}</p>
                          </div>
                        </div>
                        {isSelected && !isCurrent && (
                          <span className="text-red-400 text-xs font-black flex items-center gap-1">
                            <span>Selected</span>
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CABIN CLASS SELECTION */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                  Choose Cabin Class
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCabinClass('silver')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedCabinClass === 'silver'
                        ? 'bg-slate-800 border-sky-400 ring-2 ring-sky-400/40 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">🥈 Silver Class</span>
                      <span className="text-xs font-bold text-sky-400 font-mono">5 AED</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Standard modern air-conditioned carriage with Wi-Fi</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCabinClass('gold')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedCabinClass === 'gold'
                        ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-300">🥇 Gold Class VIP</span>
                      <span className="text-xs font-bold text-amber-400 font-mono">10 AED</span>
                    </div>
                    <p className="text-[10px] text-amber-200/70 mt-1">Panoramic front cabin, wide leather seats & skyline views</p>
                  </button>
                </div>
              </div>

              {/* NOL CARD BALANCE & TOP UP */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-sm">
                    💳
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Nol Card Balance</p>
                    <p className="text-sm font-black text-white">{walletBalance.toLocaleString()} AED / D-Coins</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 mr-1">Recharge:</span>
                  <button
                    type="button"
                    onClick={() => handleTopUpNol(50)}
                    className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 transition-colors"
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTopUpNol(100)}
                    className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 transition-colors"
                  >
                    +100
                  </button>
                </div>
              </div>

              {/* BOARDING BUTTON */}
              <div className="pt-2">
                <Button
                  onClick={handleBoardMetro}
                  className="w-full h-12 rounded-xl text-sm font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xl shadow-red-600/30 flex items-center justify-center gap-2"
                >
                  <Train className="w-4 h-4 animate-bounce" />
                  <span>
                    Tap Nol Card & Board Metro ({selectedCabinClass === 'gold' ? '10' : '5'} AED)
                  </span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={!!selectedVenue} onOpenChange={(open) => !open && setSelectedVenue(null)}>
        <DialogContent className="bg-white text-gray-900 border-none shadow-2xl sm:max-w-md z-[100] rounded-3xl">
          {selectedVenue && (
            <>
              <DialogHeader>
                <DialogTitle className="text-3xl font-black text-center">{selectedVenue.name}</DialogTitle>
              </DialogHeader>
              
              <div className="py-6 flex flex-col items-center text-center">
                <div className="mb-6 flex justify-center w-full scale-125">
                   {getBuildingSprite(selectedVenue.id, selectedVenue.type, selectedVenue.seed, selectedVenue.name)}
                </div>
                <p className="text-gray-500 font-medium mb-6 px-4">
                  {selectedVenue.description || `You have arrived at ${selectedVenue.name}.`} What would you like to do?
                </p>

                {(selectedVenue.type === 'small-house' || selectedVenue.type === 'house' || selectedVenue.type === 'dubai-villa' || selectedVenue.type === 'villa') && (
                  <div className="w-full mb-6 p-4 bg-slate-50 rounded-2xl border-2 border-slate-200">
                    <h4 className="font-black text-slate-800 mb-3 text-lg">
                      {selectedVenue.type.includes('villa') ? '🏰 Luxury Estate Real Estate' : '🏡 Residential Real Estate Options'}
                    </h4>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => showToast((selectedVenue.type.includes('villa') ? 'Dubai Luxury Villa' : 'House') + ' purchased for AED ' + (selectedVenue.price || (selectedVenue.type.includes('villa') ? 8500000 : 1500000)).toLocaleString(), 'debit')} 
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                      >
                        <span>BUY</span>
                        <span className="text-xs bg-green-700 px-2 py-1 rounded">{(selectedVenue.price || (selectedVenue.type.includes('villa') ? 8500000 : 1500000)).toLocaleString()} AED</span>
                      </button>
                      <button 
                        onClick={() => showToast((selectedVenue.type.includes('villa') ? 'Dubai Luxury Villa' : 'House') + ' rented for AED ' + (selectedVenue.rent || (selectedVenue.type.includes('villa') ? 45000 : 10000)).toLocaleString(), 'debit')} 
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                      >
                        <span>RENT</span>
                        <span className="text-xs bg-blue-700 px-2 py-1 rounded">{(selectedVenue.rent || (selectedVenue.type.includes('villa') ? 45000 : 10000)).toLocaleString()}/mo</span>
                      </button>
                    </div>
                  </div>
                )}

                {(selectedVenue.type === 'hospital' || selectedVenue.type === 'medical' || selectedVenue.type === 'isometric-hospital') && (
                  <div className="w-full mb-6 p-4 bg-red-50/80 rounded-2xl border-2 border-red-200 text-left">
                    <h4 className="font-black text-red-950 mb-2 text-lg flex items-center gap-2">
                      <span>🏥 Healthcare & Emergency Medical</span>
                    </h4>
                    <p className="text-xs text-red-800 font-medium mb-3">
                      International hospital facility featuring 24/7 Trauma Emergency Unit, Rooftop Medevac Helipad, and VIP concierge wellness screening.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button 
                        onClick={() => showToast('Executive Health Screening booked at ' + (selectedVenue.name || 'Dubai Hospital'), 'credit')} 
                        className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"
                      >
                        <span>🩺 Book Screening</span>
                        <span className="text-[10px] bg-red-800/80 px-2 py-0.5 rounded">2,500 AED</span>
                      </button>
                      <button 
                        onClick={() => showToast('Emergency Medical Dispatch alerted to ' + (selectedVenue.name || 'Dubai Hospital'), 'debit')} 
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"
                      >
                        <span>🚑 24/7 Ambulance</span>
                        <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded">Dispatch</span>
                      </button>
                    </div>
                  </div>
                )}

                {(selectedVenue.type === 'beach' || selectedVenue.type === 'beach-club' || selectedVenue.type === 'isometric-beach') && (
                  <div className="w-full mb-6 p-4 bg-amber-50/80 rounded-2xl border-2 border-amber-200 text-left">
                    <h4 className="font-black text-amber-950 mb-2 text-lg flex items-center gap-2">
                      <span>🏖️ Coastal Beach & Beach Club Experience</span>
                    </h4>
                    <p className="text-xs text-amber-800 font-medium mb-3">
                      Pristine Arabian Gulf shoreline featuring thatched tiki cabana bar, sand volleyball court, water sports jet skis, and luxury shaded daybeds.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button 
                        onClick={() => showToast('Full Day Beach & Pool Pass booked at ' + (selectedVenue.name || 'Jumeirah Beach Club'), 'credit')} 
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"
                      >
                        <span>🍹 Beach Day Pass</span>
                        <span className="text-[10px] bg-amber-800/80 px-2 py-0.5 rounded">350 AED</span>
                      </button>
                      <button 
                        onClick={() => showToast('VIP Luxury Beach Cabana reserved at ' + (selectedVenue.name || 'Jumeirah Beach Club'), 'credit')} 
                        className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"
                      >
                        <span>🛖 VIP Cabana</span>
                        <span className="text-[10px] bg-cyan-900/80 px-2 py-0.5 rounded">1,800 AED</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {selectedVenue.type === 'apartment-building' && (
                  <div className="w-full mb-6 text-left">
                    <h4 className="font-black text-slate-800 mb-3 ml-1 text-lg">Available Units</h4>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 rounded-xl">
                      {Array.from({length: selectedVenue.floors || 5}).map((_, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div>
                            <span className="font-bold text-slate-700 block">Unit {(i+1)*101}</span>
                            <span className="text-xs text-slate-500">{i%2===0 ? '2 Bed, 1 Bath' : 'Studio'}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => showToast('Bought unit for AED 800,000', 'debit')} className="bg-green-500 font-bold text-white px-3 py-2 text-xs rounded-lg hover:bg-green-600">BUY</button>
                            <button onClick={() => showToast('Rented unit for AED 4,500/mo', 'debit')} className="bg-blue-500 font-bold text-white px-3 py-2 text-xs rounded-lg hover:bg-blue-600">RENT</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-3 w-full">
                  {venueActions[selectedVenue.type]?.map((action, idx) => (
                    <Button 
                      key={idx}
                      onClick={() => executeAction(selectedVenue, action)}
                      className={`w-full h-14 rounded-2xl text-lg font-black shadow-lg hover:opacity-90 ${action.color} text-white`}
                    >
                      {action.label} 
                      {action.amount !== 0 && 
                        ` (${action.amount > 0 ? '+' : ''}${action.amount.toLocaleString()} AED)`
                      }
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Inspector Panel for Selected Landmark in Edit Mode */}
      {isEditMode && (() => {
        const sel = venues.find(v => v.id === selectedEditId);
        if (!sel) return null;

        return (
          <div className="absolute bottom-8 right-8 z-[100] w-96 max-h-[82vh] overflow-y-auto bg-zinc-950/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-5 text-white animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white leading-tight">{sel.name}</h3>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{sel.type}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEditId(null)}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name input */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  value={sel.name}
                  onChange={(e) => updateSelectedField('name', e.target.value)}
                  className="w-full bg-zinc-900 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tall Building Architecture Controls */}
              {(sel.type === 'tall-building' || sel.type === 'skyscraper') && (
                <div className="p-3 bg-sky-950/40 rounded-2xl border border-sky-500/30 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                    <span>🏢 Skyscraper Architecture</span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono">{sel.floors || 24} Floors</span>
                  </div>

                  {/* Floors Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Floors:</span>
                      <span className="font-mono text-sky-300 font-bold">{sel.floors || 24} Floors</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="60"
                      value={sel.floors || 24}
                      onChange={(e) => updateSelectedField('floors', parseInt(e.target.value) || 24)}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                  </div>

                  {/* Shape Selector */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1 font-bold">Architectural Shape</label>
                    <select
                      value={sel.shape || 'rectangular'}
                      onChange={(e) => updateSelectedField('shape', e.target.value)}
                      className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="rectangular">🏙️ Rectangular Modern Monolith</option>
                      <option value="stepped">🏛️ Stepped Tiered Setbacks</option>
                      <option value="curved">🌊 Aerodynamic Curved Glass</option>
                      <option value="tapered">📐 Tapered Obelisk / Needle</option>
                      <option value="twin">🏢🏢 Twin Towers + Skybridge</option>
                      <option value="spire">🗼 Architectural Crown & Spire</option>
                      <option value="gate">⛩️ Monumental Gate / Portal</option>
                    </select>
                  </div>

                  {/* Rooftop Feature */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1 font-bold">Rooftop Feature</label>
                    <select
                      value={sel.roofType || 'helipad'}
                      onChange={(e) => updateSelectedField('roofType', e.target.value)}
                      className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="helipad">🚁 VIP Helipad with "H"</option>
                      <option value="spire">⚡ Architectural Spire Needle</option>
                      <option value="crown">👑 Illuminated Crown</option>
                      <option value="garden">🌴 Sky Garden & Terraces</option>
                      <option value="simple">📦 Clean Mechanical Penthouse</option>
                    </select>
                  </div>

                  {/* Glass Color Theme */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1 font-bold">Glass Palette</label>
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
                          onClick={() => updateSelectedField('color', p.c)}
                          className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center justify-between ${
                            (sel.color || '#38bdf8') === p.c 
                              ? 'bg-sky-500/30 border-sky-400 text-white' 
                              : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span>{p.label}</span>
                          <span className="w-2 h-2 rounded-full border border-white/20" style={{ backgroundColor: p.c }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Base Plot Foundation */}
                  <div className="pt-2 border-t border-sky-500/20 space-y-2">
                    <label className="flex items-center space-x-2 text-xs font-bold text-sky-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={sel.hasPlot !== false} 
                        onChange={(e) => updateSelectedField('hasPlot', e.target.checked)} 
                        className="rounded border-white/20 text-sky-500 focus:ring-sky-400 bg-zinc-900" 
                      />
                      <span>Base Plot Foundation (Hotel/Burj Plain)</span>
                    </label>

                    {sel.hasPlot !== false && (
                      <div className="space-y-2.5 pl-3 border-l-2 border-sky-500/30">
                        {/* Space Around Building / Padding */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold mb-1">
                            <span>Space Around Building</span>
                            <span className="font-mono bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-black">{sel.plotPadding ?? 50}px</span>
                          </div>
                          <input 
                            type="range" 
                            min="15" 
                            max="100" 
                            step="5"
                            value={sel.plotPadding ?? 50} 
                            onChange={(e) => updateSelectedField('plotPadding', parseInt(e.target.value) || 50)} 
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                          />
                          <div className="grid grid-cols-3 gap-1 mt-1">
                            <button type="button" onClick={() => updateSelectedField('plotPadding', 25)} className="text-[9px] font-bold py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300">Compact (25px)</button>
                            <button type="button" onClick={() => updateSelectedField('plotPadding', 50)} className="text-[9px] font-bold py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300">Spacious (50px)</button>
                            <button type="button" onClick={() => updateSelectedField('plotPadding', 75)} className="text-[9px] font-bold py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300">Grand (75px)</button>
                          </div>
                        </div>

                        <div className="text-[10px] font-bold text-zinc-400">Plot Theme (One Clean Color)</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { label: '🌿 Lawn', val: 'lawn', c: '#84cc6d' },
                            { label: '🏛️ Plaza', val: 'plaza', c: '#f1f5f9' },
                            { label: '🏖️ Sand', val: 'sand', c: '#dfce9d' },
                            { label: '🛣️ Asphalt', val: 'asphalt', c: '#334155' },
                          ].map(p => (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => { updateSelectedField('plotTheme', p.val); updateSelectedField('plotColor', p.c); }}
                              className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center justify-between ${
                                (sel.plotTheme || 'lawn') === p.val 
                                  ? 'bg-sky-500/30 border-sky-400 text-white font-black' 
                                  : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                              }`}
                            >
                              <span>{p.label}</span>
                              <span className="w-2 h-2 rounded-full border border-white/20" style={{ backgroundColor: p.c }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Building Plot Controls */}
              {(sel.type === 'plot' || sel.type === 'building-plot' || sel.type === 'base-plot') && (
                <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    <span>📐 Building Plot (Base Plain)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">Base Layer</span>
                  </div>

                  {/* Theme Selector */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1 font-bold">Plot Theme</label>
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
                          onClick={() => { updateSelectedField('theme', p.val); updateSelectedField('color', p.c); }}
                          className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center justify-between ${
                            (sel.theme || 'lawn') === p.val 
                              ? 'bg-emerald-500/30 border-emerald-400 text-white' 
                              : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span>{p.label}</span>
                          <span className="w-2 h-2 rounded-full border border-white/20" style={{ backgroundColor: p.c }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Square Size Presets */}
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Square Size Presets</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => { updateSelectedField('width', 260); updateSelectedField('height', 260); }} 
                        className="text-[10px] font-bold py-1 px-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-center"
                      >
                        260×260
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { updateSelectedField('width', 340); updateSelectedField('height', 340); }} 
                        className="text-[10px] font-bold py-1 px-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-center"
                      >
                        340×340
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { updateSelectedField('width', 450); updateSelectedField('height', 450); }} 
                        className="text-[10px] font-bold py-1 px-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-center"
                      >
                        450×450
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Position: X & Y */}
              <div className="p-3 bg-zinc-900/60 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Move className="w-3.5 h-3.5 text-blue-400" /> Position (X, Y)</span>
                  <span className="text-zinc-500 font-mono text-[10px]">{sel.virtualX}, {sel.virtualY}</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-0.5">X Coordinate</label>
                    <input
                      type="number"
                      value={sel.virtualX}
                      onChange={(e) => updateSelectedField('virtualX', parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-0.5">Y Coordinate</label>
                    <input
                      type="number"
                      value={sel.virtualY}
                      onChange={(e) => updateSelectedField('virtualY', parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {/* Nudge Buttons */}
                <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-white/5">
                  <span className="text-[10px] text-zinc-500">Nudge:</span>
                  <div className="flex gap-1">
                    <button onClick={() => updateSelectedField('virtualX', sel.virtualX - 20)} className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold">X-20</button>
                    <button onClick={() => updateSelectedField('virtualX', sel.virtualX + 20)} className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold">X+20</button>
                    <button onClick={() => updateSelectedField('virtualY', sel.virtualY - 20)} className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold">Y-20</button>
                    <button onClick={() => updateSelectedField('virtualY', sel.virtualY + 20)} className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold">Y+20</button>
                  </div>
                </div>
              </div>

              {/* Rotate & Grid Angle Control */}
              <div className="p-3 bg-zinc-900/60 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><RotateCw className="w-3.5 h-3.5 text-amber-400" /> Angle / Rotation</span>
                  <span className="text-amber-400 font-mono font-black">{sel.rotate || 0}°</span>
                </div>
                
                {/* Continuous Slider (-180° to +180°) */}
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={sel.rotate || 0}
                  onChange={(e) => updateSelectedField('rotate', parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                {/* Quick Presets for Angles */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[-30, -14, 0, 14, 30, 90].map(angle => (
                    <button
                      key={angle}
                      onClick={() => updateSelectedField('rotate', angle)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                        (sel.rotate || 0) === angle 
                          ? 'bg-amber-500 text-black font-black' 
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {angle > 0 ? `+${angle}°` : `${angle}°`}
                    </button>
                  ))}
                  <button onClick={() => updateSelectedField('rotate', (sel.rotate || 0) - 5)} className="px-2 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300">-5°</button>
                  <button onClick={() => updateSelectedField('rotate', (sel.rotate || 0) + 5)} className="px-2 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300">+5°</button>
                </div>
              </div>

              {/* Resize & Scale Control */}
              <div className="p-3 bg-zinc-900/60 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><ZoomIn className="w-3.5 h-3.5 text-emerald-400" /> Resize / Scale</span>
                  <span className="text-emerald-400 font-mono font-black">{Number(sel.scale || 1).toFixed(2)}x</span>
                </div>

                {/* Continuous Scale Slider */}
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={sel.scale || 1}
                  onChange={(e) => updateSelectedField('scale', parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />

                {/* Quick Scale Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(s => (
                    <button
                      key={s}
                      onClick={() => updateSelectedField('scale', s)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                        Number(sel.scale || 1) === s 
                          ? 'bg-emerald-500 text-black font-black' 
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Optional Width & Height (pixels) */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-0.5">Width (px)</label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={sel.width || ''}
                      onChange={(e) => updateSelectedField('width', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-0.5">Height (px)</label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={sel.height || ''}
                      onChange={(e) => updateSelectedField('height', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3D Isometric Perspective & Angle Tuning */}
              <div className="p-3 bg-zinc-900/60 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-purple-400" /> Isometric 3D Angle & Skew</span>
                  <span className="text-purple-400 font-mono font-black">{sel.yaw || 0}° Y / {sel.tilt || 0}° X</span>
                </div>

                {/* 1-Click Isometric Presets */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">1-Click Isometric Presets</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button 
                      onClick={() => {
                        updateSelectedField('yaw', -30);
                        updateSelectedField('tilt', 15);
                        updateSelectedField('skewX', -10);
                        updateSelectedField('skewY', 0);
                        updateSelectedField('skew', -10);
                      }} 
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/30 text-left flex items-center justify-between"
                    >
                      <span>📐 Iso 3D Left</span>
                      <span className="text-[10px] opacity-70">-30°</span>
                    </button>
                    <button 
                      onClick={() => {
                        updateSelectedField('yaw', 30);
                        updateSelectedField('tilt', 15);
                        updateSelectedField('skewX', 10);
                        updateSelectedField('skewY', 0);
                        updateSelectedField('skew', 10);
                      }} 
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/30 text-left flex items-center justify-between"
                    >
                      <span>📐 Iso 3D Right</span>
                      <span className="text-[10px] opacity-70">+30°</span>
                    </button>
                    <button 
                      onClick={() => {
                        updateSelectedField('yaw', 0);
                        updateSelectedField('tilt', 0);
                        updateSelectedField('skewX', -26);
                        updateSelectedField('skewY', 0);
                        updateSelectedField('skew', -26);
                      }} 
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-left flex items-center justify-between"
                    >
                      <span>📐 Iso Wall L</span>
                      <span className="text-[10px] opacity-70">-26°</span>
                    </button>
                    <button 
                      onClick={() => {
                        updateSelectedField('yaw', 0);
                        updateSelectedField('tilt', 0);
                        updateSelectedField('skewX', 26);
                        updateSelectedField('skewY', 0);
                        updateSelectedField('skew', 26);
                      }} 
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-left flex items-center justify-between"
                    >
                      <span>📐 Iso Wall R</span>
                      <span className="text-[10px] opacity-70">+26°</span>
                    </button>
                    <button 
                      onClick={() => {
                        updateSelectedField('rotate', 14);
                        updateSelectedField('yaw', 0);
                        updateSelectedField('tilt', 0);
                        updateSelectedField('skewX', 0);
                        updateSelectedField('skewY', 0);
                        updateSelectedField('skew', 0);
                      }} 
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-left flex items-center justify-between"
                    >
                      <span>🛣️ Road Align</span>
                      <span className="text-[10px] opacity-70">+14°</span>
                    </button>
                    <button 
                      onClick={() => {
                        updateSelectedField('rotate', 0);
                        updateSelectedField('yaw', 0);
                        updateSelectedField('tilt', 0);
                        updateSelectedField('skewX', 0);
                        updateSelectedField('skewY', 0);
                        updateSelectedField('skew', 0);
                      }} 
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/20 text-left flex items-center justify-between"
                    >
                      <span>🔄 Reset</span>
                      <span className="text-[10px] opacity-70">Flat</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  {/* 3D Yaw / Turn */}
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                      <span>3D Turn / Yaw (Y-axis):</span>
                      <span className="font-mono text-purple-300">{sel.yaw || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={sel.yaw || 0}
                      onChange={(e) => updateSelectedField('yaw', parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* 3D Tilt / Pitch */}
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                      <span>3D Tilt / Pitch (X-axis):</span>
                      <span className="font-mono text-purple-300">{sel.tilt || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={sel.tilt || 0}
                      onChange={(e) => updateSelectedField('tilt', parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* Skew X */}
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Perspective Skew X:</span>
                      <span className="font-mono text-purple-300">{sel.skewX || sel.skew || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={sel.skewX || sel.skew || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updateSelectedField('skewX', val);
                        updateSelectedField('skew', val);
                      }}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* Skew Y */}
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Perspective Skew Y:</span>
                      <span className="font-mono text-purple-300">{sel.skewY || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={sel.skewY || 0}
                      onChange={(e) => updateSelectedField('skewY', parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Batch Duplicate & Auto-Tile Panel */}
              <div className="p-3 bg-indigo-950/40 rounded-2xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Copy className="w-3.5 h-3.5 text-indigo-400" /> Batch Duplicate & Auto-Tile</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">Auto Grid</span>
                </div>

                {/* Copies & Gap Input */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-0.5 font-bold"># of Copies</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={dupCount}
                      onChange={(e) => setDupCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-0.5 font-bold">Gap / Spacing (px)</label>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={dupGap}
                      onChange={(e) => setDupGap(parseInt(e.target.value) || 0)}
                      placeholder="20"
                      className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 font-bold mr-1">Count:</span>
                  {[1, 2, 3, 5, 8, 10].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setDupCount(cnt)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        dupCount === cnt
                          ? 'bg-indigo-600 text-white font-black'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {cnt}x
                    </button>
                  ))}
                </div>

                {/* Direction Buttons */}
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1 font-bold">Tiling Arrangement</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDupDirection('horizontal')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        dupDirection === 'horizontal'
                          ? 'bg-indigo-600 text-white border-indigo-500 font-black shadow-lg shadow-indigo-600/30'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-white/10'
                      }`}
                    >
                      ➡️ Horizontal Row
                    </button>
                    <button
                      type="button"
                      onClick={() => setDupDirection('vertical')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        dupDirection === 'vertical'
                          ? 'bg-indigo-600 text-white border-indigo-500 font-black shadow-lg shadow-indigo-600/30'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-white/10'
                      }`}
                    >
                      ⬇️ Vertical Column
                    </button>
                  </div>
                </div>

                {/* Primary Batch Action */}
                <button
                  type="button"
                  onClick={() => handleBatchDuplicate()}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate & Tile ({dupCount}x {dupDirection})</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleSaveMap}
                  disabled={isSaving}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes to Map'}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDuplicateSelected()}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSelected()}
                    className="flex-1 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
              className="absolute bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl shadow-2xl p-2 min-w-[220px] text-white animate-in fade-in zoom-in-95 duration-150"
              style={{ 
                left: Math.min(typeof window !== 'undefined' ? window.innerWidth - 240 : 800, contextMenu.x), 
                top: Math.min(typeof window !== 'undefined' ? window.innerHeight - 200 : 600, contextMenu.y) 
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                <p className="font-black text-xs text-white truncate">{target.name}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{target.type}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleDuplicateSelected(target.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
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
                <span>Duplicate & Tile ({dupCount}x {dupDirection})</span>
              </button>

              <div className="my-1 border-t border-zinc-800" />

              <button
                type="button"
                onClick={() => {
                  handleDeleteSelected(target.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Delete Component</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
