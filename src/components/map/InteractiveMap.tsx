"use client";

import { memo, useCallback, useState, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveMapSeed } from "@/app/actions/saveSeed";
import { MapBackground } from './MapBackground';
import { mapConfig } from '@/data/mapSeed';
import { CITY_ENTITIES, savableEntities } from '@/lib/city/mapEntities';
import { PALM_VIEW, WORLD_TOP } from '@/lib/city/palm';
import { isLowPower } from '@/lib/device';

const noSubscribe = () => () => {};

/** A building's drawing. Memoised on the entity object, so moving the map doesn't redraw every building. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EntitySprite = memo(function EntitySprite({ loc }: { loc: any }) {
  return getBuildingSprite(loc.id, loc.type, loc.seed, loc.name, loc);
});

/** The map's background animations (traffic, boats) pause while the map moves, and resume once it stops. */
const setMapAnimations = (on: boolean) => {
  document.querySelectorAll<SVGSVGElement>('svg.map-animated').forEach((s) => (on ? s.unpauseAnimations() : s.pauseAnimations()));
};
import { 
  Pencil, RotateCw, ZoomIn, ZoomOut, Save, Copy, Trash2, X, Move, Plus, 
  Check, Sliders, Eye, Sparkles, ChevronRight, Layers, ArrowUpRight, Train,
  Volume2, VolumeX
} from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';
import { CityNavigator, type TravelMode } from '@/components/city/CityNavigator';
import { getPlace, placeForEntity } from '@/lib/city/places';
import { entranceOf, HOME_SPOT } from '@/lib/city/geo';
import type { Place } from '@/lib/city/types';
import { useCitizen, adjustBalance, updateCitizen } from '@/lib/citizenStore';
import { useIsAdmin } from '@/lib/admin/client';
import { BillboardAds, useLiveAds } from '@/components/commerce/BillboardAds';

import { WORLD_WIDTH, WORLD_HEIGHT, EstateBase, ClickableHouseNew, ApartmentBuildingIconNew, RooftopIconNew, NightclubIconNew, RestaurantIconNew, EstateCommunityBlock, SmallHouseIcon, StadiumIcon, HospitalIcon, SchoolIcon, CasinoIcon, ParkIcon, BurjKhalifaIcon, BulgariIslandIcon, AtlantisTheRoyalIcon, BeachClubIconNew, JumeirahBeachHotelIcon, BurjAlArabIcon, MuseumOfTheFutureIcon, DubaiFrameIcon, AtlantisIcon, EmiratesTowersIcon, IndexTowerIcon, AlYaqoubTowerIcon, GevoraIcon, RoseRayhaanIcon, DWTCIcon, SalikGate, RoadSign, SkylineTower, AirportBlock, VillaHouse, ApartmentHouse, TycoonBlock, BluewatersBlock, ArabianRanchesBlock, JBRBlock, EmiratesHillsBlock, BusinessBayBlock, DeiraBlock, MotorCityBlock, PalmCommunityBlock, GenericNeighborhood, BillboardSpace, IsometricBillboard, DubaiMetroStation, MetroStationBlock, categoryColors, BridgeBlock, AdPlacement, initialAds, getBuildingSprite, ActionDef, venueActions } from './Icons';

// Default zoom: close enough that billboards and building names read well on phones too.
const DEFAULT_SCALE = 0.6;
/** How far down the map can be dragged: the open sea above the Palm reaches up to WORLD_TOP. */
const maxPanY = (scale: number) => -WORLD_TOP * scale;

// The default view: Burj Khalifa in the middle of the screen (the middle of the tower, not its base).
const BURJ_VIEW = { x: 1871, y: WORLD_HEIGHT - 743 - 140 };

// Ground-level tiles: drawn beneath everything and never clickable
const isFloorTileType = (type?: string) =>
  !!type && (type === 'island-plain' || type === 'two-plains-tile' || type.includes('floor-tile') || type.includes('plot'));

const OVERLAY_TYPES = new Set([
  'bridge',
  'generic-district',
  'salik',
  'road-sign',
  'airport',
  'ad-land',
  'hotel',
  'mall',
  'museum-future',
  'apartment-complex',
  'giant-billboard',
  'billboard',
  'ad-billboard',
  'metro-station',
  'metro',
  'dubai-metro',
  'marina',
  'marina-harbour',
  'configurable-apartment',
  'small-house',
  'house',
  'dubai-villa',
  'villa',
  'hospital',
  'medical',
  'isometric-hospital',
  'beach',
  'beach-club',
  'isometric-beach',
]);

// Overlays are centred on their position; other sprites are anchored at their base
const isOverlayType = (type?: string) =>
  !!type && (isFloorTileType(type) || type.startsWith('community') || OVERLAY_TYPES.has(type));

export const getEntityCategoryInfo = (entity: any) => {
  const type = (entity?.type || '').toLowerCase();
  const id = (entity?.id || '').toLowerCase();
  const name = (entity?.name || '').toLowerCase();

  // 1. Small Houses / Residential Homes (Checked FIRST to avoid any substring overlap)
  if (type === 'small-house' || type === 'house' || type === 'townhouse' || id.includes('mews') || id.includes('small-house') || name.includes('mews') || name.includes('smart home') || (name.includes('house') && !name.includes('opera'))) {
    return { icon: '🏡', category: 'Residential Homes', key: 'houses', color: 'from-emerald-500 to-teal-600', badgeBg: 'bg-green-900/60 border-green-500/40 text-green-200' };
  }

  // 2. Luxury Villas
  if (type === 'dubai-villa' || type === 'villa' || id.includes('villa') || name.includes('villa')) {
    return { icon: '🏰', category: 'Luxury Villas', key: 'villas', color: 'from-amber-500 to-orange-500', badgeBg: 'bg-amber-900/60 border-amber-500/40 text-amber-200' };
  }

  // 3. High-Rise Living & Skyscraper Towers
  if (type === 'tall-building' || type === 'skyscraper' || type === 'emirates-towers' || type === 'the-index' || type === 'al-yaqoub' || type === 'gevora' || type === 'dwtc' || id.includes('tower') || name.includes('residences') || name.includes('tower') || name.includes('heights') || name.includes('views') || name.includes('standpoint') || name.includes('boulevard point') || name.includes('act one') || name.includes('act two') || name.includes('crown')) {
    return { icon: '🏢', category: 'High-Rise Living', key: 'towers', color: 'from-sky-500 to-blue-600', badgeBg: 'bg-sky-900/60 border-sky-500/40 text-sky-200' };
  }

  // 4. Shopping Malls & Retail (Guaranteed not to match small houses)
  if (type === 'mall' || type === 'shopping-mall' || id === 'dubai-mall' || type === 'souk-al-bahar' || id === 'souk-al-bahar' || name.includes('souk') || (name.includes('mall') && !name.includes('small'))) {
    return { icon: '🛍️', category: 'Shopping Malls', key: 'malls', color: 'from-purple-500 to-pink-600', badgeBg: 'bg-purple-900/60 border-purple-500/40 text-purple-200' };
  }

  // 5. Nightlife & Clubs
  if (type === 'kiza-difc' || id === 'kiza-difc' || name.includes('kiza') || type === 'armani-prive' || id === 'armani-prive' || type === 'blu-dubai' || id === 'blu-dubai' || type === 'one-oak' || id === 'one-oak' || type === 'ting-irie' || id === 'ting-irie' || type === 'dubai-opera' || id === 'dubai-opera' || type === 'babylon-difc' || id === 'babylon-difc' || type === 'sphere-zaabeel' || id === 'sphere-zaabeel' || type === 'club' || name.includes('privé') || name.includes('prive') || name.includes('nightclub') || name.includes('ting irie') || name.includes('opera') || (name.includes('club') && !name.includes('beach club')) || name.includes('lounge') || name.includes('babylon')) {
    return { icon: '🪩', category: 'Nightlife & Clubs', key: 'clubs', color: 'from-purple-600 to-pink-600', badgeBg: 'bg-purple-900/60 border-purple-500/40 text-purple-200' };
  }

  // 6. Restaurants & Dining
  if (type === 'the-guild' || id === 'the-guild' || type === 'timeout-market' || id === 'timeout-market' || type === 'zuma-difc' || id === 'zuma-difc' || type === 'amazonico-difc' || id === 'amazonico-difc' || type === 'lpm-difc' || id === 'lpm-difc' || type === 'restaurant' || name.includes('dining') || name.includes('market') || name.includes('restaurant') || name.includes('cÉ la vi') || name.includes('ce la vi') || name.includes('at.mosphere') || name.includes('cafe') || name.includes('zuma') || name.includes('amazónico') || name.includes('lpm')) {
    return { icon: '🍽️', category: 'Dining & Cafes', key: 'food', color: 'from-orange-500 to-amber-600', badgeBg: 'bg-amber-900/60 border-amber-500/40 text-amber-200' };
  }

  // 7. Tourist Attractions & Landmarks (Includes Mosques)
  if (type === 'burj-khalifa' || id === 'burj-khalifa' || type === 'dubai-fountain' || id === 'dubai-fountain' || type === 'dubai-aquarium' || id === 'dubai-aquarium' || type === 'museum-future' || id === 'motf' || type === 'dubai-frame' || id === 'dubai-frame' || type === 'difc-mosque' || id === 'difc-mosque' || type === 'zabeel-mosque' || id === 'zabeel-mosque' || name.includes('burj khalifa') || name.includes('fountain') || name.includes('aquarium') || name.includes('museum') || name.includes('frame') || name.includes('mosque')) {
    return { icon: '🕌', category: 'Attractions & Mosques', key: 'attractions', color: 'from-blue-500 to-indigo-600', badgeBg: 'bg-blue-900/60 border-blue-500/40 text-blue-200' };
  }

  // 8. Hotels & Luxury Resorts
  if (type === 'hotel' || type.includes('hotel') || type === 'address-skyview' || type === 'palace-downtown' || type === 'address-downtown' || type === 'ritz-carlton-difc' || id === 'ritz-carlton-difc' || type === 'one-zaabeel' || id === 'one-zaabeel' || id.includes('address') || id.includes('palace') || name.includes('address') || name.includes('palace') || name.includes('hotel') || name.includes('resort') || name.includes('ritz') || name.includes('za\'abeel') || name.includes('zaabeel')) {
    return { icon: '🏨', category: 'Hotels & Resorts', key: 'hotels', color: 'from-amber-400 to-yellow-600', badgeBg: 'bg-yellow-900/60 border-yellow-500/40 text-yellow-200' };
  }

  // 9. Parks & Gardens
  if (type === 'park' || id === 'burj-park' || name.includes('park') || name.includes('garden')) {
    return { icon: '🌿', category: 'Parks & Gardens', key: 'parks', color: 'from-emerald-500 to-green-600', badgeBg: 'bg-emerald-900/60 border-emerald-500/40 text-emerald-200' };
  }

  // 10. Beaches & Beach Clubs
  if (type === 'beach' || type === 'beach-club' || name.includes('beach')) {
    return { icon: '🏖️', category: 'Beaches & Beach Clubs', key: 'beaches', color: 'from-cyan-400 to-blue-500', badgeBg: 'bg-cyan-900/60 border-cyan-500/40 text-cyan-200' };
  }

  // 11. Billboards
  if (type === 'giant-billboard' || type === 'billboard' || type === 'ad-billboard') {
    return { icon: '📺', category: 'Digital LED Billboard', key: 'media', color: 'from-yellow-500 to-amber-600', badgeBg: 'bg-amber-900/60 border-amber-500/40 text-amber-200' };
  }

  // 12. Healthcare
  if (type === 'hospital' || name.includes('hospital')) {
    return { icon: '🏥', category: 'Healthcare', key: 'healthcare', color: 'from-red-500 to-rose-600', badgeBg: 'bg-rose-900/60 border-rose-500/40 text-rose-200' };
  }

  // 13. Infrastructure / Transit
  if (type === 'salik' || type === 'marina' || type === 'airport' || type === 'metro-station' || type === 'dubai-metro') {
    return { icon: type === 'airport' ? '✈️' : (type === 'marina' ? '⛵' : '🚧'), category: 'Transit & Infrastructure', key: 'infrastructure', color: 'from-slate-600 to-blue-700', badgeBg: 'bg-slate-900/60 border-slate-500/40 text-slate-200' };
  }

  return { icon: '📍', category: 'Downtown Dubai', key: 'other', color: 'from-blue-500 to-slate-700', badgeBg: 'bg-slate-900/60 border-slate-500/40 text-slate-200' };
};

export const isSpecialPlaceVenue = (loc: any, catInfo: any) => {
  const isFloorTile = isFloorTileType(loc.type);
  if (isFloorTile) return false;

  const isCategoryMatch = (
    catInfo.key === 'attractions' ||
    catInfo.key === 'clubs' ||
    catInfo.key === 'food' ||
    catInfo.key === 'malls' ||
    catInfo.key === 'hotels' ||
    catInfo.key === 'parks' ||
    catInfo.key === 'beaches'
  );

  return isCategoryMatch &&
    loc.type !== 'small-house' &&
    loc.type !== 'house' &&
    loc.type !== 'dubai-villa' &&
    loc.type !== 'villa' &&
    loc.type !== 'tall-building' &&
    loc.type !== 'skyscraper' &&
    loc.type !== 'giant-billboard' &&
    loc.type !== 'billboard' &&
    loc.type !== 'ad-billboard' &&
    !loc.type.startsWith('community') &&
    loc.type !== 'generic-district' &&
    loc.type !== 'ad-land' &&
    loc.type !== 'salik' &&
    !loc.type.includes('floor-tile') &&
    !loc.type.includes('plot');
};

export interface InteractiveMapProps {
  hideTopHUD?: boolean;
  activeFilter?: string;
  searchQuery?: string;
  interactionDisabled?: boolean;
  /** Guests (not signed in) can look around; tapping a place calls this with it. */
  onAttemptInteract?: (loc?: { id: string; type: string; name?: string }) => void;
  /** Open this place's directory on load (e.g. back from an interior). */
  openPlaceId?: string;
  /** Start a journey to this place (and venue) on load. */
  journeyTo?: { placeId: string; venueId?: string };
  /** Put the citizen outside this place and centre the camera there. */
  atPlaceId?: string;
}

export function InteractiveMap({
  hideTopHUD = false,
  activeFilter,
  searchQuery,
  interactionDisabled = false,
  onAttemptInteract,
  openPlaceId,
  journeyTo,
  atPlaceId,
}: InteractiveMapProps = {}) {
  const router = useRouter();
  const { citizen } = useCitizen();
  // Destination picking and travel (see components/city/CityNavigator).
  const [navPlace, setNavPlace] = useState<Place | null>(null);
  const [navVenueId, setNavVenueId] = useState<string | undefined>(undefined);
  const [travel, setTravel] = useState<{ mode: TravelMode; ms: number } | null>(null);
  const [venues, setVenues] = useState<any[]>(CITY_ENTITIES);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  // Map editing is for admins only (saving is also checked on the server).
  const isAdmin = useIsAdmin();
  const [selectedEditIds, setSelectedEditIds] = useState<string[]>([]);
  const selectedEditId = selectedEditIds.length > 0 ? selectedEditIds[selectedEditIds.length - 1] : null;
  const setSelectedEditId = (id: string | null) => {
    setSelectedEditIds(id ? [id] : []);
  };
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  // The part of the world on screen (world px). Only buildings near it are drawn, which keeps the
  // page light enough to stay responsive on phones. Updated when the view moves a fair way.
  const [view, setView] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateView = useCallback((st: { positionX: number; positionY: number; scale: number }) => {
    if (typeof window === 'undefined') return;
    const x = -st.positionX / st.scale, y = -st.positionY / st.scale;
    const w = window.innerWidth / st.scale, h = window.innerHeight / st.scale;
    // Panning updates as you go (the drawn area has a margin around the screen). Zooming waits until
    // the pinch ends: adding hundreds of buildings mid-gesture can run a phone out of memory, and
    // mobile browsers then reload the page.
    setView((v) => {
      if (!v) return { x, y, w, h };
      const zooming = Math.abs(v.w - w) > v.w * 0.03;
      if (zooming) return v;
      return Math.abs(v.x - x) < v.w * 0.2 && Math.abs(v.y - y) < v.h * 0.2 ? v : { x, y, w, h };
    });
    // Once the map stops moving (a pinch, a jump), measure exactly where it ended up.
    if (settle.current) clearTimeout(settle.current);
    else setMapAnimations(false);
    settle.current = setTimeout(() => { settle.current = null; setView({ x, y, w, h }); setMapAnimations(true); }, 150);
  }, []);

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

  const [playerPos, setPlayerPos] = useState(() => (atPlaceId && entranceOf(atPlaceId)) || citizen?.location || HOME_SPOT);
  const [isTraveling, setIsTraveling] = useState(false);
  const walletBalance = useCitizen().citizen?.balance ?? 0;
  const [toastMsg, setToastMsg] = useState<{ text: string, type: 'credit' | 'debit' } | null>(null);

  const [ads, setAds] = useState<any[]>(initialAds);
  const [minScale, setMinScale] = useState(0.28);

  useEffect(() => {
    const handleResize = () => {
      const scale = window.innerWidth / WORLD_WIDTH;
      setMinScale(Math.max(scale, 0.28));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    // Start ambient sound on the first tap, not on load: creating the audio engine blocks the page
    // for a moment, and browsers only allow sound after a tap anyway.
    setIsAudioMuted(gameAudio.getIsMuted());
    const startOnce = () => gameAudio.start();
    window.addEventListener('pointerdown', startOnce, { once: true });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        gameAudio.stop();
      } else {
        gameAudio.start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Stop game sound as soon as the user leaves the map screen
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', startOnce);
      gameAudio.stop();
    };
  }, []);

  const [adModalOpen, setAdModalOpen] = useState(false);
  const [adTargetCell, setAdTargetCell] = useState<{x: number, y: number} | null>(null);
  const [adForm, setAdForm] = useState({ w: 2, h: 2, imgBase64: '' });
  
  const handleAdGridClick = (e: React.MouseEvent<SVGRectElement>) => {
    e.stopPropagation();
    if (interactionDisabled) {
      onAttemptInteract?.();
      return;
    }
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
     
     if (!adjustBalance(-cost)) {
        showToast('Not enough AED!', 'debit');
        return;
     }
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
  // Paid ads currently running, by billboard.
  const liveAds = useLiveAds();


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
    if (!adjustBalance(-fare)) {
      showToast('Insufficient Nol Card balance! Please recharge.', 'debit');
      return;
    }

    setMetroModalOpen(false);

    showToast(`🚆 Boarded Dubai Metro Red Line! Fare: AED ${fare} (${selectedCabinClass.toUpperCase()} Class). Doors closing...`, 'credit');

    // Smooth transit animation along the metro viaduct
    setIsTraveling(true);
    setPlayerPos({ x: dest.virtualX, y: WORLD_HEIGHT - dest.virtualY });

    setTimeout(() => {
      setIsTraveling(false);
      showToast(`📍 Arrived at ${dest.name}! Welcome to Dubai!`, 'credit');
    }, 1800);
  };


  const showToast = (text: string, type: 'credit' | 'debit') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleVenueClick = (loc: any) => {
    if (interactionDisabled) {
      onAttemptInteract?.(loc);
      return;
    }

    const isFloor = isFloorTileType(loc.type);
    if (isFloor) return;

    gameAudio.playClickSound();

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

      setBillboardModalOpen(true);
      return;
    }
    // Buildings you can go into open their own destination picker and journey planner.
    const place = placeForEntity(loc);
    if (place) {
      setNavVenueId(undefined);
      setNavPlace(place);
      return;
    }
    // Everything else on the map is scenery: say what it is rather than offering made-up actions.
    if (loc.type === 'salik') {
      showToast(`🚦 ${loc.name ?? 'Salik gate'}: AED 4 toll, charged automatically on taxi trips through it.`, 'debit');
      return;
    }
    if (loc.interactive !== false) showToast(`📍 ${loc.name ?? 'This area'} isn't open to visit yet — Downtown Dubai is open now.`, 'debit');
  };

  const jumpToDistrict = (virtualX: number, virtualY: number, districtName?: string) => {
    gameAudio.playClickSound();
    const renderedX = virtualX;
    const renderedY = WORLD_HEIGHT - virtualY;
    const scale = DEFAULT_SCALE;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

    const targetX = screenW / 2 - renderedX * scale;
    const targetY = screenH / 2 - renderedY * scale;

    setPlayerPos({ x: renderedX, y: renderedY });
    transformRef.current?.setTransform(targetX, Math.min(targetY, maxPanY(scale)), scale, 650);
    if (districtName) showToast(`📍 Arrived at ${districtName}!`, 'credit');
  };

  /** Centres the camera on a rendered map point. */
  const centreOn = (pt: { x: number; y: number }, ms = 650) => {
    const scale = Math.max(DEFAULT_SCALE, transformRef.current?.state.scale ?? DEFAULT_SCALE);
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    transformRef.current?.setTransform(w / 2 - pt.x * scale, Math.min(h / 2 - pt.y * scale, maxPanY(scale)), scale, ms);
  };

  /** Moves the citizen across the map; resolves on arrival. */
  const travelTo = (to: { x: number; y: number }, mode: TravelMode, ms: number) =>
    new Promise<void>((resolve) => {
      if (ms <= 0) { setPlayerPos(to); resolve(); return; }
      setTravel({ mode, ms });
      centreOn({ x: (playerPos.x + to.x) / 2, y: (playerPos.y + to.y) / 2 }, 500);
      // Let the transition style apply before moving.
      requestAnimationFrame(() => requestAnimationFrame(() => setPlayerPos(to)));
      setTimeout(() => { setTravel(null); resolve(); }, ms + 150);
    });

  // Links into the map: ?open=<place> reopens a directory, ?to=<place> plans a journey, ?at=<place> puts you outside.
  useEffect(() => {
    // Guests start over Downtown, where the venues are.
    if (interactionDisabled) { setTimeout(() => centreOn(BURJ_VIEW, 0), 50); return; }
    const id = journeyTo?.placeId ?? openPlaceId;
    const place = id ? getPlace(id) ?? (id ? placeForEntity(venues.find((v) => v.id === id) ?? { id, type: '' }) : null) : null;
    if (place) {
      setNavVenueId(journeyTo?.venueId);
      setNavPlace(place);
    }
    const at = atPlaceId ? entranceOf(atPlaceId) : null;
    if (at) {
      setPlayerPos(at);
      updateCitizen((c) => ({ ...c, location: { ...at, placeId: undefined } }));
    }
    // Arriving from a venue shows that place; otherwise the city opens on Burj Khalifa.
    const focus = at ?? BURJ_VIEW;
    setTimeout(() => centreOn(focus, 0), 50);
    // Only on arrival at the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPlaceId, journeyTo?.placeId, journeyTo?.venueId, atPlaceId, interactionDisabled]);

  const executeAction = (loc: any, action: ActionDef) => {
    if (!adjustBalance(action.amount)) {
      showToast('Not enough AED!', 'debit');
      return;
    }
    gameAudio.playCoinSound();
    if (action.amount > 0) showToast(`Earned AED ${action.amount}!`, 'credit');
    else if (action.amount < 0) showToast(`Paid AED ${Math.abs(action.amount).toLocaleString()}.`, 'debit');
    
    setSelectedVenue(null);
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (!isEditMode) return;
    e.stopPropagation();

    // Shift or Command/Control multi-select
    const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
    const wasAlreadySelected = selectedEditIds.includes(id);
    let newActiveIds: string[];

    if (isMulti) {
      if (wasAlreadySelected) {
        newActiveIds = selectedEditIds;
      } else {
        newActiveIds = [...selectedEditIds, id];
        setSelectedEditIds(newActiveIds);
      }
    } else {
      if (wasAlreadySelected) {
        newActiveIds = selectedEditIds;
      } else {
        newActiveIds = [id];
        setSelectedEditIds(newActiveIds);
      }
    }

    setIsDraggingItem(true);
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
    if (!isDraggingItem || !dragRef.current.activeIds || dragRef.current.activeIds.length === 0) return;
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
    if (!isDraggingItem) return;
    setIsDraggingItem(false);

    if (dragRef.current.wasMulti && !dragRef.current.hasMoved && dragRef.current.wasAlreadySelected && dragRef.current.clickedId) {
      const cid = dragRef.current.clickedId;
      setSelectedEditIds(prev => prev.filter(x => x !== cid));
    }

    dragRef.current.activeIds = [];
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
      const res = await saveMapSeed(savableEntities(venues), mapConfig);
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
    const idsToDelete = targetId ? [targetId] : (selectedEditIds.length > 0 ? selectedEditIds : (selectedEditId ? [selectedEditId] : []));
    if (idsToDelete.length === 0) return;
    setVenues(prev => prev.filter(v => !idsToDelete.includes(v.id)));
    setSelectedEditIds([]);
    showToast(`Removed ${idsToDelete.length} landmark(s)`, 'debit');
  };

  const [dupCount, setDupCount] = useState<number>(3);
  const [dupDirection, setDupDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [dupGap, setDupGap] = useState<number>(20);

  const handleDuplicateSelected = (targetId?: string) => {
    const idsToDup = targetId ? [targetId] : (selectedEditIds.length > 0 ? selectedEditIds : (selectedEditId ? [selectedEditId] : []));
    if (idsToDup.length === 0) return;
    const newItems: any[] = [];
    const newIds: string[] = [];
    idsToDup.forEach((id, idx) => {
      const item = venues.find(v => v.id === id);
      if (!item) return;
      const newId = `${item.type}-${Date.now().toString().slice(-4)}-${idx}`;
      newIds.push(newId);
      newItems.push({
        ...item,
        id: newId,
        name: `${item.name} (Copy)`,
        virtualX: item.virtualX + 60,
        virtualY: item.virtualY - 60
      });
    });
    setVenues(prev => [...prev, ...newItems]);
    setSelectedEditIds(newIds);
    showToast(`Duplicated ${newItems.length} landmark(s)`, 'credit');
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
    // Guests can look around freely; empty ground does nothing.
    if (interactionDisabled) return;
    if (isEditMode) {
      setSelectedEditIds([]);
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

  const [trafficPreset, setTrafficPreset] = useState<'auto' | 'morning-rush' | 'midday' | 'evening-rush' | 'late-night'>('auto');
  const [trafficInfo, setTrafficInfo] = useState<any>(null);
  const [trafficMenuOpen, setTrafficMenuOpen] = useState(false);





  const allRenderedEntities = useMemo(() => {
    return venues.map(loc => ({
      ...loc,
      campaigns: liveAds[loc.id],
      renderedX: loc.virtualX,
      renderedY: WORLD_HEIGHT - loc.virtualY
    // Ground layers (the Palm island) first, then back-to-front so nearer buildings overlap farther ones.
    })).sort((a, b) => (b.layer === 'ground' ? 1 : 0) - (a.layer === 'ground' ? 1 : 0) || a.renderedY - b.renderedY);
  }, [venues, liveAds]);

  // Buildings within (or near) the visible area; everything while editing the map.
  // Read on the client only (the server can't know the device), without a mismatch on hydration.
  const lite = useSyncExternalStore(noSubscribe, isLowPower, () => false);
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const canHover = useSyncExternalStore(noSubscribe, () => window.matchMedia('(hover: hover) and (pointer: fine)').matches, () => false);
  const visibleEntities = useMemo(() => {
    if (isEditMode) return allRenderedEntities;
    // Before the map reports where it is, assume the opening view (and draw nothing on the server):
    // drawing the whole city on the first frame is a big memory spike on phones.
    if (!view && !hydrated) return [];
    const v = view ?? {
      x: -(mapConfig?.startX ?? -120) / DEFAULT_SCALE, y: -(mapConfig?.startY ?? -140) / DEFAULT_SCALE,
      w: window.innerWidth / DEFAULT_SCALE, h: window.innerHeight / DEFAULT_SCALE,
    };
    return allRenderedEntities.filter((loc) => {
      const r = Math.max(Number(loc.width) || 400, Number(loc.height) || 400);
      return loc.renderedX > v.x - v.w * 0.5 - r && loc.renderedX < v.x + v.w * 1.5 + r
        && loc.renderedY > v.y - v.h * 0.5 - r && loc.renderedY < v.y + v.h * 1.5 + r * 1.5;
    });
  }, [allRenderedEntities, view, isEditMode, hydrated]);

  return (
    <div className={`absolute inset-0 w-screen h-[100dvh] z-0 bg-[#d6bc8a] overflow-hidden touch-none select-none overscroll-none ${lite ? 'map-lite' : ''}`}>
      
      {/* Top Left: Edit Mode Controls (admins only; safe position below TopBar) */}
      {isAdmin && <div className="absolute top-20 sm:top-24 left-3 sm:left-6 z-30 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => {
            setIsEditMode(!isEditMode);
            if (isEditMode) setSelectedEditId(null);
          }}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-xl transition-all ${
            isEditMode 
              ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 font-black ring-2 ring-amber-300' 
              : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border border-white/20 backdrop-blur-md'
          }`}
        >
          <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{isEditMode ? 'Exit Edit' : 'Edit Map'}</span>
        </button>

        {isEditMode && (
          <>
            <button
              onClick={handleSaveMap}
              disabled={isSaving}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 transition-all text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>

              {showAddMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 max-h-72 overflow-y-auto bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl py-2 z-50 text-white text-xs font-semibold">
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
              href="/admin/studio"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-2xl text-xs font-bold text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 transition-colors"
            >
              <span>Studio</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </>
        )}
      </div>}

      {isEditMode && (
        <div className="absolute top-32 sm:top-36 left-3 sm:left-6 z-30 bg-black/75 backdrop-blur-md border border-white/10 text-zinc-300 text-[11px] sm:text-xs px-3 py-1.5 rounded-full pointer-events-none flex items-center gap-1.5 font-medium shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Tap to select, drag to reposition</span>
        </div>
      )}

      {/* Top Right: Dubai Live Traffic HUD (larger screens; phones keep that corner for search) */}
      <div className="hidden sm:block absolute top-20 sm:top-24 right-3 sm:right-6 z-30 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setTrafficMenuOpen(!trafficMenuOpen)}
            className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white/95 hover:bg-white backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl transition-all text-left group"
          >
            <div className="relative flex items-center justify-center">
              <span className={`w-2.5 h-2.5 rounded-full ${
                trafficInfo?.level === 'peak' ? 'bg-red-500 animate-ping' :
                trafficInfo?.level === 'heavy' ? 'bg-orange-500' :
                trafficInfo?.level === 'moderate' ? 'bg-amber-400' : 'bg-emerald-500'
              } opacity-75 absolute inline-flex`} />
              <span className={`relative inline-flex rounded-full w-2 h-2 ${
                trafficInfo?.level === 'peak' ? 'bg-red-600' :
                trafficInfo?.level === 'heavy' ? 'bg-orange-500' :
                trafficInfo?.level === 'moderate' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-800 tracking-tight flex items-center gap-0.5">
                  🇦🇪 {trafficInfo?.timeString || 'Dubai GST'}
                </span>
                <span className="text-[8px] sm:text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                  {trafficPreset === 'auto' ? 'Live' : 'Sim'}
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 truncate max-w-[90px] sm:max-w-[120px]">
                {trafficInfo?.label || 'Sheikh Zayed Rd'}
              </p>
            </div>
          </button>

          {trafficMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-60 max-w-[85vw] bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-2 z-50 text-white text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 border-b border-white/10 mb-1">
                <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">Sheikh Zayed Rd Traffic</div>
                <div className="text-xs text-amber-300 font-bold mt-0.5">{trafficInfo?.speedLabel || 'Flowing'}</div>
              </div>
              
              <button
                onClick={() => { setTrafficPreset('auto'); setTrafficMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  trafficPreset === 'auto' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'hover:bg-white/10'
                }`}
              >
                <span>🟢 Live Dubai Time (Auto GST)</span>
                {trafficPreset === 'auto' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => { setTrafficPreset('morning-rush'); setTrafficMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  trafficPreset === 'morning-rush' ? 'bg-red-600/30 text-red-300 border border-red-500/40' : 'hover:bg-white/10'
                }`}
              >
                <span>🔴 Morning Rush (08:30 Peak)</span>
                {trafficPreset === 'morning-rush' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => { setTrafficPreset('midday'); setTrafficMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  trafficPreset === 'midday' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'hover:bg-white/10'
                }`}
              >
                <span>🟡 Midday Flow (13:15 Steady)</span>
                {trafficPreset === 'midday' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => { setTrafficPreset('evening-rush'); setTrafficMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  trafficPreset === 'evening-rush' ? 'bg-red-600/30 text-red-300 border border-red-500/40' : 'hover:bg-white/10'
                }`}
              >
                <span>🔴 Evening Rush (18:30 Gridlock)</span>
                {trafficPreset === 'evening-rush' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => { setTrafficPreset('late-night'); setTrafficMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  trafficPreset === 'late-night' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'hover:bg-white/10'
                }`}
              >
                <span>🌙 Late Night (23:45 Free Flow)</span>
                {trafficPreset === 'late-night' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Standalone virtual AED (Hidden when TopBar handles it) */}
      {!hideTopHUD && (
        <div className="hidden sm:block absolute top-6 right-6 z-50 bg-white border border-gray-200 p-4 rounded-2xl shadow-xl pointer-events-auto">
          <p className="text-xs text-gray-500 font-extrabold uppercase tracking-widest mb-1">virtual AED</p>
          <p className="text-2xl font-black text-green-600">AED {walletBalance.toLocaleString()}</p>
        </div>
      )}

      {/* Dynamic Island Style Toast */}
      {toastMsg && (
        <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-300 pointer-events-none max-w-[92vw]">
          <div className={`px-4 py-2.5 rounded-2xl font-bold border shadow-2xl backdrop-blur-xl text-xs sm:text-sm flex items-center gap-2 ${
            toastMsg.type === 'credit' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40' : 'bg-red-950/90 text-red-300 border-red-500/40'
          }`}>
            <span>{toastMsg.type === 'credit' ? '✨' : '⚠️'}</span>
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Mobile-Friendly District Quick-Jumper Bar (Safely above BottomNav) */}
      {!interactionDisabled && (
        <div className="hidden sm:flex absolute bottom-24 sm:bottom-28 left-3 sm:left-6 z-30 items-center gap-1.5 pointer-events-auto overflow-x-auto max-w-[calc(100vw-130px)] sm:max-w-none scrollbar-hide py-1">
          <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-xl border border-white/20 p-1 rounded-2xl shadow-2xl">
            <button
              onClick={() => jumpToDistrict(1871, 743, 'Downtown Dubai')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-xs whitespace-nowrap transition-all"
            >
              <span>🗼</span>
              <span className="hidden xs:inline sm:inline">Downtown</span>
            </button>
            <button
              onClick={() => jumpToDistrict(PALM_VIEW.x, PALM_VIEW.y, 'Palm Jumeirah')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-xs whitespace-nowrap transition-all"
            >
              <span>🌴</span>
              <span className="hidden xs:inline sm:inline">Palm</span>
            </button>
            <button
              onClick={() => jumpToDistrict(720, 2280, 'Dubai Marina')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-xs whitespace-nowrap transition-all"
            >
              <span>⛵</span>
              <span className="hidden xs:inline sm:inline">Marina</span>
            </button>
            <button
              onClick={() => jumpToDistrict(1980, 1180, 'Business Bay')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-xs whitespace-nowrap transition-all"
            >
              <span>🏢</span>
              <span className="hidden xs:inline sm:inline">Bay</span>
            </button>
            <button
              onClick={() => jumpToDistrict(3200, 600, 'Dubai Int Airport (DXB)')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-xs whitespace-nowrap transition-all"
            >
              <span>✈️</span>
              <span className="hidden xs:inline sm:inline">DXB</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Zoom Navigation & Ambient Audio Controls (Safely above BottomNav on right side) */}
      {!interactionDisabled && (
        <div className="absolute z-30 hidden sm:flex items-center gap-1 bg-slate-950/85 hover:bg-slate-950/95 backdrop-blur-xl border border-white/20 p-1 sm:p-1.5 rounded-2xl shadow-2xl transition-all pointer-events-auto bottom-24 sm:bottom-28 right-3 sm:right-6">
          <button
            onClick={() => {
              const nextMuted = gameAudio.toggleMute();
              setIsAudioMuted(nextMuted);
              showToast(nextMuted ? '🔇 Ambient Sound Muted' : '🔊 Ambient Sound Playing', 'credit');
            }}
            title={isAudioMuted ? "Unmute Ambient Sound" : "Mute Ambient Sound"}
            aria-label={isAudioMuted ? "Unmute Ambient Sound" : "Mute Ambient Sound"}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-black transition-all"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
          <button
            onClick={() => transformRef.current?.zoomIn(0.06)}
            title="Zoom In"
            aria-label="Zoom In"
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-black transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => transformRef.current?.resetTransform()}
            title="Reset to Overview"
            aria-label="Reset to Overview"
            className="px-2 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white font-mono font-bold text-[11px] sm:text-xs tracking-wider transition-all"
          >
            Reset
          </button>
          <button
            onClick={() => transformRef.current?.zoomOut(0.06)}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white font-black transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {navPlace && (
        <CityNavigator
          key={`${navPlace.id}:${navVenueId ?? ''}`}
          place={navPlace}
          journeyVenueId={navVenueId}
          playerPos={playerPos}
          onTravel={travelTo}
          onClose={() => { setNavPlace(null); setNavVenueId(undefined); }}
        />
      )}

      <TransformWrapper 
        ref={transformRef}
        initialScale={DEFAULT_SCALE} 
        initialPositionX={mapConfig?.startX ?? -120} 
        initialPositionY={mapConfig?.startY ?? -140}
        // Phones stop zooming out a little earlier (the whole world on screen at once is a lot of
        // graphics memory); zoom in goes up to buildings at full size and beyond.
        minScale={lite ? 0.36 : 0.28}
        maxScale={1.8}
        smooth={true}
        wheel={{ step: 0.02 }}
        // Zoom exactly as far as the gesture goes: no overshoot past the limits and spring back.
        zoomAnimation={{ size: 0 }}
        doubleClick={{ disabled: true }}
        pinch={{ disabled: false }}
        limitToBounds={false}
        centerZoomedOut={false}
        panning={{ velocityDisabled: false, disabled: isDraggingItem }}
        onPanning={(ref) => {
          if (ref.state.positionY > maxPanY(ref.state.scale)) {
            ref.setTransform(ref.state.positionX, maxPanY(ref.state.scale), ref.state.scale, 0);
          }
        }}
        onPanningStop={(ref) => {
          if (ref.state.positionY > maxPanY(ref.state.scale)) {
            ref.setTransform(ref.state.positionX, maxPanY(ref.state.scale), ref.state.scale, 0);
          }
        }}
        onZoom={(ref) => {
          if (ref.state.positionY > maxPanY(ref.state.scale)) {
            ref.setTransform(ref.state.positionX, maxPanY(ref.state.scale), ref.state.scale, 0);
          }
        }}
        onInit={(ref) => updateView(ref.state)}
        onTransform={(_ref, st) => updateView(st)}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <div 
            className={`relative origin-center ${interactionDisabled ? 'cursor-default' : 'cursor-crosshair'}`} 
            style={{ 
              width: `${WORLD_WIDTH}px`, 
              height: `${WORLD_HEIGHT}px`, 
              backgroundColor: "#d6bc8a"
            }} 
            onClick={handleMapClick}
          >
            
            <MapBackground trafficPreset={trafficPreset} onTrafficInfoChange={setTrafficInfo} />

            <div 
              className="absolute z-50 -translate-x-1/2 -translate-y-1/2 transition-all ease-in-out pointer-events-none"
              style={{ left: playerPos.x, top: playerPos.y, transitionDuration: travel ? `${travel.ms}ms` : '1500ms', transitionTimingFunction: travel ? 'linear' : undefined }}
            >
              {/* The citizen on the map: a pin with their initial, a taxi while riding one. */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-2xl text-white font-black text-sm ${travel?.mode === "taxi" ? "bg-amber-400 text-2xl" : "bg-blue-600"}`}>
                  {travel?.mode === "taxi" ? "🚕" : travel?.mode === "walk" ? "🚶" : (citizen?.name?.[0] ?? "•")}
                </div>
                {citizen && <div className="mt-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-black shadow whitespace-nowrap">{citizen.name.split(" ")[0]}</div>}
              </div>
            </div>

            {visibleEntities.map((loc) => {
              const isFloorTile = isFloorTileType(loc.type);
              const isOverlay = isOverlayType(loc.type);
              const baseTransform = isOverlay ? 'translate(-50%, -50%)' : 'translate(-50%, -90%)';
              const rotationTransform = (loc.rotate !== undefined && loc.rotate !== 0) ? `rotate(${loc.rotate}deg)` : '';
              const scaleTransform = loc.scale !== undefined ? `scale(${loc.scale})` : '';
              
              const isSelectedInEdit = isEditMode && selectedEditIds.includes(loc.id);
              const zClass = isSelectedInEdit ? 'z-50' : (isFloorTile ? 'z-0' : ((loc.type === 'generic-district' || loc.type === 'ad-land') ? 'z-10' : (isOverlay ? 'z-20' : 'z-30')));

              // Category info and Search / Filter Highlighting
              const catInfo = getEntityCategoryInfo(loc);
              const locCategory = (catInfo.category || '').toLowerCase();
              const locType = (loc.type || '').toLowerCase();
              const locName = (loc.name || '').toLowerCase();

              const normFilter = (activeFilter || '').toLowerCase().trim();
              const isFilterActive = normFilter && normFilter !== 'all' && normFilter !== 'near me';
              const matchesFilter = !isFilterActive || (
                normFilter === catInfo.key ||
                (normFilter === 'malls' && catInfo.key === 'malls') ||
                (normFilter === 'clubs' && catInfo.key === 'clubs') ||
                (normFilter === 'food' && catInfo.key === 'food') ||
                (normFilter === 'attractions' && catInfo.key === 'attractions') ||
                (normFilter === 'hotels' && catInfo.key === 'hotels') ||
                (normFilter === 'towers' && catInfo.key === 'towers') ||
                (normFilter === 'villas' && catInfo.key === 'villas') ||
                (normFilter === 'houses' && catInfo.key === 'houses') ||
                (normFilter === 'parks' && catInfo.key === 'parks') ||
                (normFilter === 'quests' && catInfo.key === 'attractions')
              );

              const hasSearch = !!(searchQuery && searchQuery.trim().length > 0);
              const q = (searchQuery || '').toLowerCase().trim();
              const matchesSearch = !hasSearch || (() => {
                if (q === 'mall' || q === 'malls' || q === 'shopping') {
                  return catInfo.key === 'malls';
                }
                if (q === 'club' || q === 'clubs' || q === 'nightlife') {
                  return catInfo.key === 'clubs';
                }
                if (q === 'villa' || q === 'villas') {
                  return catInfo.key === 'villas';
                }
                if (q === 'house' || q === 'houses' || q === 'home' || q === 'homes') {
                  return catInfo.key === 'houses';
                }
                return (
                  locName.includes(q) ||
                  (locType.includes(q) && !(q === 'mall' && locType.includes('small'))) ||
                  catInfo.category.toLowerCase().includes(q)
                );
              })();

              const isHighlighted = (hasSearch && matchesSearch) || (isFilterActive && matchesFilter);
              const isDimmed = (hasSearch && !matchesSearch) || (isFilterActive && !matchesFilter);

              // Only tourist sites, attractions, and special event / nightlife / dining / mall venues get the persistent icon badge
              // Villas, highrises, houses, and billboards are excluded
              const isSpecialPlace = isSpecialPlaceVenue(loc, catInfo);

              return (
                <div 
                  key={loc.id} 
                  className={`absolute flex flex-col items-center ${lite ? '' : 'preserve-3d'} select-none transition-[opacity,scale] duration-300
                    ${isDimmed ? 'opacity-30 grayscale-[50%]' : ''}
                    ${isHighlighted && !isFloorTile ? 'scale-105 z-40' : ''}
                    ${isEditMode 
                      ? `cursor-grab active:cursor-grabbing ${isSelectedInEdit ? 'ring-4 ring-blue-500 ring-offset-4 ring-offset-amber-900/30 rounded-xl shadow-[0_0_35px_rgba(59,130,246,0.8)]' : 'hover:ring-2 hover:ring-amber-400/80 rounded-xl'}` 
                      : (isFloorTile
                          ? 'cursor-default pointer-events-auto'
                          // Hovered: above every other building, so its label is never hidden behind one.
                          : (loc.interactive !== false ? 'group cursor-pointer hover:scale-105 hover:!z-[350]' : 'pointer-events-none'))} 
                    ${zClass}`
                  }
                  style={{ 
                    left: loc.renderedX, 
                    top: loc.renderedY,
                    transform: `${baseTransform} ${scaleTransform} ${rotationTransform}`.trim(), 
                    transformOrigin: isOverlay ? "center" : "bottom center",
                    // Desktop: each building as its own 3D context measured ~2× smoother panning. Phones: flat,
                    // which needs about a quarter of the compositing layers (fewer memory crashes).
                    transformStyle: lite ? undefined : 'preserve-3d'
                  }}
                  onMouseEnter={() => {
                    if (isSpecialPlace) setHoveredVenueId(loc.id);
                  }}
                  onMouseLeave={() => {
                    if (isSpecialPlace) setHoveredVenueId(prev => prev === loc.id ? null : prev);
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
                    if (interactionDisabled) {
                      e.stopPropagation();
                      onAttemptInteract?.(loc);
                      return;
                    }
                    if (isEditMode) {
                      e.stopPropagation();
                      if (e.shiftKey || e.metaKey || e.ctrlKey) {
                        setSelectedEditIds(prev => prev.includes(loc.id) ? prev.filter(x => x !== loc.id) : [...prev, loc.id]);
                      } else if (!selectedEditIds.includes(loc.id)) {
                        setSelectedEditIds([loc.id]);
                      }
                    } else if (!isFloorTile && loc.interactive !== false) {
                      handleVenueClick(loc);
                    }
                  }}
                >
                  {/* Highlight Beacon for Search / Filter */}
                  {isHighlighted && !isFloorTile && !isEditMode && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.8)] border border-amber-200 animate-bounce z-[110] whitespace-nowrap pointer-events-none">
                      <span>{catInfo.icon}</span>
                      <span>{loc.name}</span>
                    </div>
                  )}

                  {isSelectedInEdit && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full shadow-2xl whitespace-nowrap pointer-events-none flex items-center gap-2 border border-blue-400 z-50">
                      <Move className="w-3 h-3 animate-pulse" />
                      <span>{loc.name}</span>
                      <span className="text-blue-200">({loc.virtualX}, {loc.virtualY})</span>
                      {selectedEditIds.length > 1 && (
                        <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px]">
                          {selectedEditIds.indexOf(loc.id) + 1}/{selectedEditIds.length}
                        </span>
                      )}
                      <span className="bg-blue-800/80 px-1.5 py-0.5 rounded text-[10px]">{loc.rotate || 0}°</span>
                      <span className="bg-blue-800/80 px-1.5 py-0.5 rounded text-[10px]">{loc.scale || 1}x</span>

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
                           <EntitySprite loc={loc} />
                        </div>

                        {/* 2. HOUSES & RESIDENTIAL (Not special places) */}
                        {/* No icon on top; keeps residential grid clean. Subtle hover tooltip only, on devices with a
                            mouse (touch screens can't hover, and each hidden tooltip cost a phone a compositing layer). */}
                        {canHover && !isSpecialPlace && loc.interactive !== false && !isFloorTile && !loc.type.startsWith('community') && loc.type !== 'generic-district' && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 group-hover:-translate-y-[115%] transition-all duration-300 pointer-events-none z-[100]">
                            <div className="flex items-center gap-1.5 bg-slate-950/95 text-white border border-white/20 shadow-xl px-2.5 py-1 rounded-full whitespace-nowrap text-xs">
                              <span>{catInfo.icon}</span>
                              <span className="font-bold text-[11px]">{loc.name}</span>
                            </div>
                          </div>
                        )}
                     </>
                  )}

                </div>
              );
            })}

            {/* TOPMOST SPECIAL VENUES BADGE OVERLAY LAYER */}
            {/* Rendered physically after all building sprites with z-[400] to guarantee badges NEVER render under any building, billboard, or villa */}
            {!isEditMode && (
              <div className="absolute inset-0 pointer-events-none z-[400]">
                {visibleEntities
                  .filter((loc) => {
                    const cat = getEntityCategoryInfo(loc);
                    return isSpecialPlaceVenue(loc, cat);
                  })
                  .map((loc) => {
                    const isOverlay = isOverlayType(loc.type);
                    const baseTransform = isOverlay ? 'translate(-50%, -50%)' : 'translate(-50%, -90%)';
                    const rotationTransform = (loc.rotate !== undefined && loc.rotate !== 0) ? `rotate(${loc.rotate}deg)` : '';
                    const scaleTransform = loc.scale !== undefined ? `scale(${loc.scale})` : '';
                    const catInfo = getEntityCategoryInfo(loc);
                    const isHovered = hoveredVenueId === loc.id;

                    return (
                      <div
                        key={`badge-top-${loc.id}`}
                        className="absolute flex flex-col items-center pointer-events-none"
                        style={{
                          left: loc.renderedX,
                          top: loc.renderedY,
                          transform: `${baseTransform} ${scaleTransform} ${rotationTransform}`.trim(),
                          transformOrigin: isOverlay ? "center" : "bottom center",
                        }}
                      >
                        {/* Invisible sizing ghost: perfectly matches height & rooftop crest of the sprite */}
                        <div className={`${loc.size || ''} flex justify-center items-end opacity-0 pointer-events-none select-none invisible`} aria-hidden="true">
                          <EntitySprite loc={loc} />
                        </div>

                        {/* Topmost Interactive Badge Pin */}
                        <div
                          className="absolute top-1 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform duration-200 hover:scale-115 active:scale-95 cursor-pointer z-50"
                          onMouseEnter={() => {
                            if (!interactionDisabled) setHoveredVenueId(loc.id);
                          }}
                          onMouseLeave={() => {
                            if (!interactionDisabled) setHoveredVenueId((prev) => prev === loc.id ? null : prev);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (interactionDisabled) {
                              onAttemptInteract?.(loc);
                              return;
                            }
                            handleVenueClick(loc);
                          }}
                        >
                          <div className={`group/pin flex items-center bg-white hover:bg-white text-slate-900 border-2 border-white shadow-[0_4px_16px_rgba(0,0,0,0.35),0_0_12px_rgba(255,255,255,0.85)] rounded-full p-0.5 sm:p-1 transition-all duration-300 ring-2 ring-black/10 ${isHovered ? 'ring-amber-400' : ''}`}>
                            {/* Category Icon: Crisp White Circular Outline */}
                            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm bg-gradient-to-tr ${catInfo.color} shadow-sm shrink-0 border-2 border-white text-white`}>
                              {catInfo.icon}
                            </div>

                            {/* Venue Name & Category Subtitle: Expands alongside on hover */}
                            <div className={`overflow-hidden transition-all duration-300 ease-out whitespace-nowrap flex flex-col text-left ${
                              isHovered 
                                ? 'max-w-[260px] opacity-100 pl-2 pr-3' 
                                : 'max-w-0 group-hover/pin:max-w-[260px] opacity-0 group-hover/pin:opacity-100 pl-0 group-hover/pin:pl-2 pr-0 group-hover/pin:pr-3'
                            }`}>
                              <span className="font-black text-[12px] leading-tight text-slate-900 truncate max-w-[210px]">
                                {loc.name}
                              </span>
                              <span className="text-[9px] font-extrabold tracking-wider text-slate-500 uppercase leading-none mt-0.5">
                                {catInfo.category}
                              </span>
                            </div>

                            {/* Downward anchor caret in crisp white */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white pointer-events-none drop-shadow-sm" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

          </div>
        </TransformComponent>
      </TransformWrapper>

      <Dialog open={adModalOpen} onOpenChange={setAdModalOpen}>
        <DialogContent className="bg-white text-gray-900 border-none shadow-2xl w-[94vw] max-w-md max-h-[85dvh] overflow-y-auto z-[100] rounded-3xl p-5 sm:p-6 pb-6">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
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
                    <span className="text-xl font-black text-green-600">AED {(adForm.w * adForm.h * 500).toLocaleString()}</span>
                 </div>
                 <Button onClick={purchaseAdSpace} className="w-full h-12 rounded-xl text-lg font-black bg-blue-600 hover:bg-blue-700 text-white">
                    Purchase Space
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {billboardModalOpen && selectedBillboard && (
        <BillboardAds
          billboard={{ id: selectedBillboard.id, name: selectedBillboard.name, style: selectedBillboard.billboardStyle }}
          live={liveAds[selectedBillboard.id] ?? []}
          onClose={() => setBillboardModalOpen(false)}
        />
      )}

      {/* ==================================================================== */}
      {/* DUBAI METRO RED LINE BOARDING & TRANSIT MODAL                        */}
      {/* ==================================================================== */}
      <Dialog open={metroModalOpen} onOpenChange={setMetroModalOpen}>
        <DialogContent className="bg-slate-900 text-white border border-red-500/30 shadow-2xl w-[94vw] max-w-xl z-[100] rounded-3xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6 pb-6">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
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
                      <span className="text-xs font-bold text-sky-400 font-mono">AED 5</span>
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
                      <span className="text-xs font-bold text-amber-400 font-mono">AED 10</span>
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
                    <p className="text-sm font-black text-white">AED {walletBalance.toLocaleString()}</p>
                  </div>
                </div>
                <a href="/wallet" className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                  Get virtual AED
                </a>
              </div>

              {/* BOARDING BUTTON */}
              <div className="pt-2">
                <Button
                  onClick={handleBoardMetro}
                  className="w-full h-12 rounded-xl text-sm font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xl shadow-red-600/30 flex items-center justify-center gap-2"
                >
                  <Train className="w-4 h-4 animate-bounce" />
                  <span>
                    Tap Nol Card & Board Metro (AED {selectedCabinClass === 'gold' ? '10' : '5'})
                  </span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>




      
      {/* Floating Multi-Selection Action Bar */}
      {isEditMode && selectedEditIds.length > 1 && (
        <div className="absolute bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-zinc-950/95 backdrop-blur-2xl border border-blue-500/60 rounded-2xl shadow-2xl p-3 px-5 text-white flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="font-black text-sm text-blue-300">{selectedEditIds.length} Selected</span>
            <span className="text-xs text-zinc-400 font-medium">(Drag any to move all together)</span>
          </div>

          <div className="h-5 w-px bg-white/20" />

          {/* Batch Nudge Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-400 mr-1 font-bold">NUDGE:</span>
            <button 
              onClick={() => setVenues(prev => prev.map(v => selectedEditIds.includes(v.id) ? { ...v, virtualX: v.virtualX - 20 } : v))} 
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold font-mono"
            >
              X-20
            </button>
            <button 
              onClick={() => setVenues(prev => prev.map(v => selectedEditIds.includes(v.id) ? { ...v, virtualX: v.virtualX + 20 } : v))} 
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold font-mono"
            >
              X+20
            </button>
            <button 
              onClick={() => setVenues(prev => prev.map(v => selectedEditIds.includes(v.id) ? { ...v, virtualY: v.virtualY - 20 } : v))} 
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold font-mono"
            >
              Y-20
            </button>
            <button 
              onClick={() => setVenues(prev => prev.map(v => selectedEditIds.includes(v.id) ? { ...v, virtualY: v.virtualY + 20 } : v))} 
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold font-mono"
            >
              Y+20
            </button>
          </div>

          <div className="h-5 w-px bg-white/20" />

          {/* Batch Duplicate */}
          <button 
            onClick={() => handleDuplicateSelected()} 
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate All</span>
          </button>

          {/* Batch Delete */}
          <button 
            onClick={() => handleDeleteSelected()} 
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All</span>
          </button>

          <button 
            onClick={() => setSelectedEditIds([])} 
            className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors ml-1"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Inspector Panel for Selected Landmark in Edit Mode */}
      {isEditMode && (() => {
        const sel = venues.find(v => v.id === selectedEditId);
        if (!sel) return null;

        return (
          <div className="absolute bottom-24 inset-x-2 sm:inset-x-auto sm:bottom-8 sm:right-8 z-[100] sm:w-96 max-h-[calc(100dvh-170px)] sm:max-h-[82vh] overflow-y-auto bg-zinc-950/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-5 text-white animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
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
