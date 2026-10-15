"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Megaphone, ExternalLink, Sparkles, Check, Copy, Crown, 
  Edit3, ShieldCheck, Tag, ArrowRight, Upload, Layers, Image as ImageIcon 
} from "lucide-react";
import { 
  getVenueWallAd, saveVenueWallAd, isUserVenueOwner, 
  WALL_PANELS, type VenueWallAd, type WallPanelId 
} from "@/lib/venueAds";
import { useCitizen } from "@/lib/citizenStore";

interface VenueWallAdModalProps {
  venueId: string;
  venueName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPanelId?: WallPanelId;
}

export function VenueWallAdModal({
  venueId,
  venueName,
  open,
  onOpenChange,
  initialPanelId = "panel_main",
}: VenueWallAdModalProps) {
  const { citizen } = useCitizen();
  const [selectedPanel, setSelectedPanel] = useState<WallPanelId>(initialPanelId);
  const [ad, setAd] = useState<VenueWallAd>(() => getVenueWallAd(venueId, initialPanelId));
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for editing
  const [headline, setHeadline] = useState(ad.headline);
  const [subtext, setSubtext] = useState(ad.subtext);
  const [sponsorName, setSponsorName] = useState(ad.sponsorName);
  const [imageUrl, setImageUrl] = useState(ad.imageUrl || "");
  const [ctaLabel, setCtaLabel] = useState(ad.ctaLabel || "Learn More");
  const [ctaUrl, setCtaUrl] = useState(ad.ctaUrl || "");
  const [promoCode, setPromoCode] = useState(ad.promoCode || "");

  const isOwner = isUserVenueOwner(venueId, citizen);

  const loadPanelData = (panelId: WallPanelId) => {
    const current = getVenueWallAd(venueId, panelId);
    setAd(current);
    setHeadline(current.headline);
    setSubtext(current.subtext);
    setSponsorName(current.sponsorName);
    setImageUrl(current.imageUrl || "");
    setCtaLabel(current.ctaLabel || "Learn More");
    setCtaUrl(current.ctaUrl || "");
    setPromoCode(current.promoCode || "");
    setIsEditing(false);
  };

  useEffect(() => {
    if (open) {
      loadPanelData(selectedPanel);
    }
  }, [open, venueId, selectedPanel]);

  const handlePanelChange = (panelId: WallPanelId) => {
    setSelectedPanel(panelId);
    loadPanelData(panelId);
  };

  const handleCopyCode = () => {
    if (!ad.promoCode) return;
    navigator.clipboard?.writeText(ad.promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAd = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: VenueWallAd = {
      ...ad,
      panelId: selectedPanel,
      headline: headline.trim(),
      subtext: subtext.trim(),
      sponsorName: sponsorName.trim() || venueName,
      imageUrl: imageUrl.trim() || undefined,
      ctaLabel: ctaLabel.trim() || "Learn More",
      ctaUrl: ctaUrl.trim() || undefined,
      promoCode: promoCode.trim() || undefined,
      isOwnerAd: true,
      ownerUsername: citizen?.username,
    };
    saveVenueWallAd(updated);
    setAd(updated);
    setIsEditing(false);
  };

  const currentPanelDef = WALL_PANELS.find((p) => p.id === selectedPanel) ?? WALL_PANELS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[92vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] p-6 sm:p-7">
        
        {/* Header Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm">
              <Megaphone className="w-4 h-4" />
            </span>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                In-Venue Digital Wall Network
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 truncate max-w-[240px]">
                {venueName}
              </h3>
            </div>
          </div>

          {isOwner && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition-all active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Panel</span>
            </button>
          )}
        </div>

        {/* Multi-Panel Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 mb-4 scrollbar-none">
          {WALL_PANELS.map((p) => {
            const active = selectedPanel === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handlePanelChange(p.id)}
                className={`py-1.5 px-3 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  active
                    ? "bg-slate-900 text-white shadow-md font-black"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>{p.name.split(" ")[0]}</span>
                <span className="text-[10px] opacity-70">({p.wall})</span>
              </button>
            );
          })}
        </div>

        {/* Panel Location Info */}
        <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl flex items-center justify-between mb-4 border border-slate-100">
          <span>Active View: <b>{currentPanelDef.name}</b></span>
          <span className="uppercase text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
            Wall: {currentPanelDef.wall}
          </span>
        </div>

        {isEditing ? (
          /* OWNER EDIT FORM */
          <form onSubmit={handleSaveAd} className="space-y-4 text-left">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5">
              <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-snug">
                <b>Venue Owner Access:</b> Customise what appears on this digital screen for all visitors. Free of charge.
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Headline (Catchphrase)
              </label>
              <input
                type="text"
                required
                maxLength={70}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. VIP Champagne Weekend Showcase"
                className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Description / Promo Details
              </label>
              <textarea
                required
                rows={3}
                maxLength={200}
                value={subtext}
                onChange={(e) => setSubtext(e.target.value)}
                placeholder="Describe your offer, event, or product..."
                className="w-full p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Sponsor / Brand Name
                </label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder={venueName}
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Promo Code (Optional)
                </label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. VIP50"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Image upload / URL */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Screen Poster Graphic (Upload or URL)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Button Label
                </label>
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Book VIP Table"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Target Link (URL)
                </label>
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://... or #booking"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Save to {currentPanelDef.name.split(" ")[0]}</span>
              </button>
            </div>
          </form>
        ) : (
          /* VISITOR AD DISPLAY VIEW */
          <div className="space-y-4 text-left">
            {/* Banner Poster */}
            {ad.imageUrl && (
              <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-slate-950 shadow-inner group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ad.imageUrl}
                  alt={ad.headline}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />
                
                {ad.badge && (
                  <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                    {ad.badge}
                  </span>
                )}
                
                <span className="absolute bottom-3 left-3 text-white font-extrabold text-xs drop-shadow">
                  {ad.sponsorName}
                </span>
              </div>
            )}

            {/* Headline and Description */}
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {ad.headline}
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {ad.subtext}
              </p>
            </div>

            {/* Promo Code Box */}
            {ad.promoCode && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Exclusive In-Game Promo</span>
                    <span className="font-mono font-black text-slate-900 text-sm tracking-wide">{ad.promoCode}</span>
                  </div>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-2">
              {ad.ctaUrl ? (
                <a
                  href={ad.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
                >
                  <span>{ad.ctaLabel || "Learn More"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
