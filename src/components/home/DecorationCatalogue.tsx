"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CATALOG,
  DECOR_CATEGORIES,
  CURATED_STYLES,
  WALL_PAINTS,
  FLOOR_FINISHES,
  FLOOR_SWATCH,
  PANELS_PRICE,
  BEDDING,
  type CatalogItem,
  type OwnedFurniture,
  type HomeStyle,
  type CuratedStyle,
  type SavedLook,
  type ShopCategory,
} from "@/lib/furniture";
import { CeilingPicker } from "./CeilingPicker";
import { Search, X, Check, Sparkles, Box, LayoutGrid, Palette, Wand2, ChevronDown, Save, Trash2 } from "lucide-react";

export interface DecorationCatalogueProps {
  open: boolean;
  onClose: () => void;
  walletBalance: number;
  storedItems: OwnedFurniture[];
  homeStyle: HomeStyle;
  onRestyle: (change: Partial<HomeStyle>, price: number, label: string) => void;
  onSelectItem: (item: CatalogItem) => void;
  onPlaceMultiple?: (items: CatalogItem[]) => void;
  onPlaceStored?: (owned: OwnedFurniture) => void;
  initialCategory?: string;
  currencySymbol?: string;
}

export function DecorationCatalogue({
  open,
  onClose,
  walletBalance,
  storedItems,
  homeStyle,
  onRestyle,
  onSelectItem,
  onPlaceMultiple,
  onPlaceStored,
  initialCategory = "all",
  currencySymbol = "AED ",
}: DecorationCatalogueProps) {
  const [activeTab, setActiveTab] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [priceFilter, setPriceFilter] = useState<string>("any");
  const [pickSeveral, setPickSeveral] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [savedLookName, setSavedLookName] = useState("");
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);

  // Load saved looks from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("cometodubai_saved_looks");
      if (raw) setSavedLooks(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const saveCurrentLook = () => {
    const name = savedLookName.trim() || `Look ${savedLooks.length + 1}`;
    const newLook: SavedLook = {
      id: `look_${Date.now()}`,
      name,
      date: new Date().toLocaleDateString(),
      wall: homeStyle.wall || "#f4efe6",
      floor: homeStyle.floor || "oak",
      bedding: homeStyle.bedding,
      panels: homeStyle.panels,
      ceiling: homeStyle.ceiling,
      ceilingColor: homeStyle.ceilingColor,
    };
    const updated = [newLook, ...savedLooks.slice(0, 9)];
    setSavedLooks(updated);
    setSavedLookName("");
    try {
      localStorage.setItem("cometodubai_saved_looks", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const deleteLook = (id: string) => {
    const updated = savedLooks.filter((l) => l.id !== id);
    setSavedLooks(updated);
    try {
      localStorage.setItem("cometodubai_saved_looks", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  // Filter items according to active tab, search, and price
  const filteredItems = useMemo(() => {
    let list = CATALOG;

    if (activeTab === "new") {
      list = list.filter((i) => i.isNew);
    } else if (activeTab === "all") {
      // all items
    } else if (activeTab === "storage") {
      return []; // handled separately
    } else if (activeTab === "design" || activeTab === "styles") {
      return []; // special tabs
    } else {
      list = list.filter((i) => {
        if (i.category === activeTab) return true;
        if (activeTab === "comfort" && (i.category === "living" || i.category === "comfort")) return true;
        if (activeTab === "sleep" && (i.category === "bedroom" || i.category === "sleep")) return true;
        if (activeTab === "kitchen" && (i.category === "dining" || i.category === "kitchen")) return true;
        if (activeTab === "bath" && i.category === "bath") return true;
        if (activeTab === "pets" && i.category === "pets") return true;
        if (activeTab === "fun" && (i.category === "fun" || i.id === "tv" || i.id === "media-wall" || i.id === "grand-piano" || i.id === "aquarium" || i.id === "audio-speaker" || i.id === "tv-32" || i.id === "party-speakers")) return true;
        if (activeTab === "skills" && (i.category === "skills" || i.id === "desk" || i.id === "desk-chair" || i.id === "bookcase" || i.id === "shelf-tall")) return true;
        if (activeTab === "lighting" && i.category === "lighting") return true;
        if (activeTab === "decor" && (i.category === "decor" || i.category === "wall")) return true;
        if (activeTab === "luxury" && (i.category === "luxury" || i.price >= 8000 || i.id.startsWith("royal-") || i.id.startsWith("diamond-") || i.id.startsWith("gold-") || i.id.startsWith("pool-") || i.id === "grand-piano" || i.id === "fireplace" || i.id === "aquarium")) return true;
        if (activeTab === "nursery" && i.category === "nursery") return true;
        return false;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.desc.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }

    if (priceFilter === "under2k") {
      list = list.filter((i) => i.price < 2000);
    } else if (priceFilter === "2k-10k") {
      list = list.filter((i) => i.price >= 2000 && i.price <= 10000);
    } else if (priceFilter === "10k-50k") {
      list = list.filter((i) => i.price > 10000 && i.price <= 50000);
    } else if (priceFilter === "50k+") {
      list = list.filter((i) => i.price > 50000);
    }

    // Sort by price ascending
    return [...list].sort((a, b) => a.price - b.price);
  }, [activeTab, searchQuery, priceFilter]);

  const toggleSelectItem = (item: CatalogItem) => {
    if (!pickSeveral) {
      onSelectItem(item);
      onClose();
      return;
    }
    setSelectedItems((prev) => {
      const cur = prev[item.id] || 0;
      const next = { ...prev };
      if (cur > 0) {
        delete next[item.id];
      } else {
        next[item.id] = 1;
      }
      return next;
    });
  };

  const selectedList = useMemo(() => {
    return Object.keys(selectedItems)
      .map((id) => CATALOG.find((c) => c.id === id))
      .filter((i): i is CatalogItem => !!i);
  }, [selectedItems]);

  const selectedTotalPrice = useMemo(() => {
    return selectedList.reduce((sum, item) => sum + item.price * (selectedItems[item.id] || 1), 0);
  }, [selectedList, selectedItems]);

  const handleBatchPlace = () => {
    if (onPlaceMultiple && selectedList.length > 0) {
      onPlaceMultiple(selectedList);
    } else if (selectedList.length > 0) {
      onSelectItem(selectedList[0]);
    }
    setSelectedItems({});
    onClose();
  };

  // Format currency
  const formatPrice = (p: number) => {
    const symbol = currencySymbol || "AED ";
    if (p >= 1_000_000) {
      const m = p / 1_000_000;
      return `${symbol}${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}m`;
    }
    return `${symbol}${p.toLocaleString()}`;
  };

  const formatStylePrice = (p: number) => {
    const symbol = currencySymbol || "AED ";
    if (p >= 1_000_000) {
      const m = p / 1_000_000;
      return `about ${symbol}${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}m`;
    }
    if (p >= 1_000) {
      const k = Math.round(p / 1_000);
      return `about ${symbol}${k}k`;
    }
    return `about ${symbol}${p.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-xl max-h-[92dvh] flex flex-col bg-white text-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-t-[2.2rem] sm:rounded-3xl z-50">
        <DialogTitle className="sr-only">Decoration Catalogue</DialogTitle>

        {/* Top Handle for mobile drag visual */}
        <div className="sm:hidden w-full pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Header Bar */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Catalogue</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSearch((s) => !s)}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95"
              aria-label="Search items"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95"
              aria-label="Close Catalogue"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Input Bar (when opened) */}
        {showSearch && (
          <div className="px-5 pt-2 pb-1 bg-slate-50 border-b border-slate-100">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search furniture, plants, pools, beds..."
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Horizontal Category Pill Bar */}
        <div className="px-4 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2 border-b border-slate-100 shrink-0">
          {DECOR_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat.id;
            const badgeCount = cat.id === "storage" ? storedItems.length : 0;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab(cat.id);
                  if (cat.id === "design" || cat.id === "styles") {
                    setPickSeveral(false);
                  }
                }}
                className={`h-9 px-3.5 rounded-full font-black text-xs whitespace-nowrap flex items-center gap-1.5 transition-all active:scale-95 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {badgeCount > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white text-slate-900" : "bg-slate-300 text-slate-800"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Toolbar (Filters & Pick Several) - Hidden on Design and Styles tabs */}
        {activeTab !== "design" && activeTab !== "styles" && (
          <div className="px-5 py-2 flex items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-100 text-xs">
            {/* Price Filter Dropdown */}
            <div className="relative">
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                aria-label="Filter items by price"
                className="appearance-none bg-white border border-slate-200 text-slate-700 font-bold text-xs pl-3 pr-8 py-1.5 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
              >
                <option value="any">Any price</option>
                <option value="under2k">Under {currencySymbol}2,000</option>
                <option value="2k-10k">{currencySymbol}2,000 – 10,000</option>
                <option value="10k-50k">{currencySymbol}10,000 – 50,000</option>
                <option value="50k+">{currencySymbol}50,000+</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Pick Several Multi-Select Toggle */}
            <button
              onClick={() => {
                setPickSeveral((p) => !p);
                if (pickSeveral) setSelectedItems({});
              }}
              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-colors border ${
                pickSeveral
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${pickSeveral ? "text-white" : "text-slate-400"}`} />
              <span>Pick several</span>
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* TAB: DESIGN (WALL PAINTS, MIX COLOUR, FLOORING, SAVED LOOKS) */}
          {activeTab === "design" && (
            <div className="space-y-5">
              <p className="text-xs text-slate-600 font-medium">
                Tap a paint or floor to try it on first. You only pay when you tap Buy, and ones you&apos;ve bought stay yours.
              </p>

              {/* SAVED LOOKS */}
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">SAVED LOOKS</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={savedLookName}
                    onChange={(e) => setSavedLookName(e.target.value)}
                    placeholder="Name this look"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={saveCurrentLook}
                    className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Saved on this phone. A look goes in any home the same size: your own pieces move first, and only the ones you don&apos;t have are bought.
                </p>

                {savedLooks.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                    {savedLooks.map((look) => (
                      <div
                        key={look.id}
                        className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-1 shadow-sm"
                      >
                        <button
                          onClick={() => {
                            onRestyle(
                              { wall: look.wall, floor: look.floor, bedding: look.bedding, panels: look.panels, ...(look.ceiling ? { ceiling: look.ceiling } : {}), ...(look.ceilingColor ? { ceilingColor: look.ceilingColor } : {}) },
                              0,
                              `Applied "${look.name}"`
                            );
                          }}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left"
                        >
                          <div
                            className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                            style={{ background: look.wall }}
                          />
                          <span className="text-xs font-black text-slate-800 truncate">{look.name}</span>
                        </button>
                        <button
                          onClick={() => deleteLook(look.id)}
                          className="w-6 h-6 rounded-lg text-slate-400 hover:text-red-500 flex items-center justify-center shrink-0"
                          title="Delete look"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* WALL PAINT SWATCHES */}
              <div className="space-y-3">
                <div className="text-xs font-black text-slate-800">Wall paint</div>
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                  {WALL_PAINTS.slice(0, 8).map((wp) => {
                    const current = homeStyle.wall?.toLowerCase() === wp.color.toLowerCase();
                    return (
                      <button
                        key={wp.id}
                        type="button"
                        onClick={() => onRestyle({ wall: wp.color }, wp.price, `Walls painted ${wp.label}`)}
                        className={`p-1.5 rounded-2xl text-center transition-all flex flex-col items-center ${
                          current
                            ? "bg-slate-100 ring-2 ring-emerald-500 scale-[1.02]"
                            : "hover:bg-slate-50 active:scale-95"
                        }`}
                      >
                        {/* Two-tone split pill capsule */}
                        <div
                          className="w-14 h-10 sm:w-16 sm:h-12 rounded-2xl shadow-sm mb-1.5 overflow-hidden flex border border-black/5"
                        >
                          <div
                            className="w-1/2 h-full"
                            style={{ background: wp.color, filter: "brightness(1.08)" }}
                          />
                          <div
                            className="w-1/2 h-full"
                            style={{ background: wp.color, filter: "brightness(0.92)" }}
                          />
                        </div>
                        <span className="block text-[11px] font-black text-slate-800 truncate w-full text-center leading-tight">
                          {wp.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-900 mt-0.5">
                          {formatPrice(wp.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MIX YOUR OWN COLOUR */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span>Mix your own colour</span>
                  <span className="text-slate-900 font-bold">{formatPrice(6000)} a colour</span>
                </div>
                <label className="flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-transform">
                  {/* Conic Rainbow Spectrum Color Wheel */}
                  <div
                    className="w-14 h-14 rounded-full shadow-md shrink-0 border-2 border-white ring-1 ring-slate-200"
                    style={{
                      background:
                        "conic-gradient(from 180deg, #ff0055, #ff5500, #ffcc00, #00cc66, #0099ff, #6600ff, #ff00cc, #ff0055)",
                    }}
                  />
                  {/* Two-tone capsule preview of chosen mixed color */}
                  <div className="flex-1 h-14 rounded-2xl border border-black/5 shadow-sm overflow-hidden flex">
                    <div
                      className="w-1/2 h-full"
                      style={{ background: homeStyle.wall || "#e6b08a", filter: "brightness(1.08)" }}
                    />
                    <div
                      className="w-1/2 h-full"
                      style={{ background: homeStyle.wall || "#e6b08a", filter: "brightness(0.92)" }}
                    />
                  </div>
                  <input
                    type="color"
                    value={homeStyle.wall || "#e6b08a"}
                    onChange={(e) => onRestyle({ wall: e.target.value }, 6000, `Walls painted custom ${e.target.value.toUpperCase()}`)}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* FLOOR FINISHES */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-800">Flooring</div>
                <div className="grid grid-cols-2 gap-2">
                  {FLOOR_FINISHES.map((f) => {
                    const current = homeStyle.floor === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onRestyle({ floor: f.id }, f.price, `Floor: ${f.label}`)}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          current
                            ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-200"
                            : "border-slate-200 hover:bg-slate-50 active:scale-95"
                        }`}
                      >
                        <span
                          className="block h-8 rounded-lg mb-1.5 shadow-inner"
                          style={{ background: FLOOR_SWATCH[f.id] }}
                        />
                        <span className="block text-xs font-black text-slate-900 leading-tight truncate">
                          {f.label}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-600">
                          {current ? "In room" : formatPrice(f.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CEILING (the roof seen from inside) */}
              <CeilingPicker style={homeStyle} onChange={onRestyle} formatPrice={formatPrice} />
            </div>
          )}

          {/* TAB: STYLES (CURATED PRESETS / BUNDLES) */}
          {activeTab === "styles" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Used where they fit, and only what&apos;s missing is bought.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CURATED_STYLES.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    {/* Visual split swatch banner */}
                    <div
                      className="h-16 w-full flex items-center justify-between px-4 relative overflow-hidden"
                      style={{
                        background: `linear-gradient(to right, ${st.wallColor} 50%, ${FLOOR_SWATCH[st.floorFinish] || "#e5e7eb"} 50%)`,
                      }}
                    >
                      <span className="text-2xl drop-shadow">{st.icon}</span>
                      <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-xs">
                        <span>🛋️</span>
                        <span>🛏️</span>
                        <span>🪴</span>
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">{st.name}</h4>
                        <p className="text-[11px] text-slate-600 font-medium line-clamp-2 mt-0.5">{st.desc}</p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-xs font-mono font-black text-slate-900">
                          {formatStylePrice(st.price)}
                        </span>
                        <button
                          onClick={() => {
                            onRestyle(
                              { wall: st.wallColor, floor: st.floorFinish },
                              0,
                              `Applied ${st.name} style theme`
                            );
                            onClose();
                          }}
                          className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs active:scale-95 transition-transform"
                        >
                          Apply Look
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: STORAGE */}
          {activeTab === "storage" && (
            <div className="space-y-4">
              {storedItems.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-3xl flex items-center justify-center mx-auto">
                    📦
                  </div>
                  <h3 className="text-sm font-black text-slate-800">Your storage is empty</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Pieces you move to storage appear here so you can place them back into your home anytime for free.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {storedItems.map((st) => {
                    const item = CATALOG.find((c) => c.id === st.itemId);
                    if (!item) return null;
                    return (
                      <div
                        key={st.uid}
                        className="rounded-2xl border border-slate-200 p-2.5 bg-white flex flex-col justify-between shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.placementTag || `${item.size[0]}×${item.size[1]}`}
                          </span>
                          <span className="text-emerald-600 font-bold">Stored</span>
                        </div>
                        <div className="h-16 flex items-center justify-center text-3xl">
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800 truncate">{item.name}</div>
                          <button
                            onClick={() => {
                              onPlaceStored?.(st);
                              onClose();
                            }}
                            className="w-full mt-2 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs active:scale-95 transition-transform"
                          >
                            Place in Room
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* REGULAR ITEM GRID (ALL, NEW, SLEEP, KITCHEN, BATH, COMFORT, FUN, SKILLS, LIGHT, DECO, PETS, LUXURY) */}
          {activeTab !== "design" && activeTab !== "styles" && activeTab !== "storage" && (
            <div className="space-y-4">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <div className="text-3xl">🔍</div>
                  <h3 className="text-sm font-black text-slate-800">No matching items found</h3>
                  <p className="text-xs text-slate-500">Try adjusting your search or price filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredItems.map((item) => {
                    const isSelected = !!selectedItems[item.id];
                    const tag = item.placementTag || (item.kind === "wall" ? "wall" : `${item.size[0]}×${item.size[1]}`);

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSelectItem(item)}
                        className={`rounded-2xl border p-2.5 bg-white flex flex-col justify-between shadow-sm cursor-pointer transition-all active:scale-[0.98] select-none ${
                          isSelected
                            ? "border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50/30"
                            : "border-slate-200/90 hover:border-slate-300 hover:shadow-md"
                        }`}
                      >
                        {/* Top Badges Row */}
                        <div className="flex items-center justify-between text-[10px] font-black mb-1">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {tag}
                          </span>
                          <div className="flex items-center gap-1">
                            {item.isNew && (
                              <span className="px-1.5 py-0.2 rounded-md bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider">
                                NEW
                              </span>
                            )}
                            {item.stars && (
                              <span className="text-amber-400 font-bold tracking-tighter">
                                {"★".repeat(item.stars)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Thumbnail / 3D Preview Box */}
                        <div className="relative h-20 w-full rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center text-4xl shadow-inner my-1">
                          <span>{item.icon}</span>

                          {/* Palette Count Badge (if customisable) */}
                          {item.paletteCount && (
                            <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[9px] font-black text-slate-700 shadow-sm flex items-center gap-0.5 border border-slate-200">
                              <span>🎨</span>
                              <span>{item.paletteCount}</span>
                            </span>
                          )}

                          {/* Checkmark in Pick Several mode */}
                          {pickSeveral && isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="space-y-1 mt-1">
                          <h4 className="text-xs font-black text-slate-900 truncate leading-tight">
                            {item.name}
                          </h4>

                          <div className="text-xs font-mono font-bold text-rose-500">
                            {formatPrice(item.price)}
                          </div>

                          {/* Green Stat Boost Pill */}
                          {item.statBadge ? (
                            <span className="inline-block px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[9px]">
                              {item.statBadge}
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.2 rounded-md bg-slate-50 text-slate-400 font-bold text-[9px]">
                              Decor
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Batch Placement Footer in "Pick Several" mode */}
        {pickSeveral && selectedList.length > 0 && (
          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shadow-xl">
            <div>
              <div className="text-xs font-black text-slate-900">
                {selectedList.length} item{selectedList.length > 1 ? "s" : ""} selected
              </div>
              <div className="text-[11px] font-mono font-bold text-emerald-600">
                Total: {formatPrice(selectedTotalPrice)}
              </div>
            </div>
            <button
              onClick={handleBatchPlace}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <span>Place Selected</span>
              <span>›</span>
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
