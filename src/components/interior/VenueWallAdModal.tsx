"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Megaphone, ExternalLink, Sparkles, Check, Copy, Crown, 
  Edit3, ShieldCheck, Tag, ArrowRight 
} from "lucide-react";
import { 
  getVenueWallAd, saveVenueWallAd, isUserVenueOwner, 
  type VenueWallAd 
} from "@/lib/venueAds";
import { useCitizen } from "@/lib/citizenStore";

interface VenueWallAdModalProps {
  venueId: string;
  venueName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VenueWallAdModal({
  venueId,
  venueName,
  open,
  onOpenChange,
}: VenueWallAdModalProps) {
  const { citizen } = useCitizen();
  const [ad, setAd] = useState<VenueWallAd>(() => getVenueWallAd(venueId));
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states for editing
  const [headline, setHeadline] = useState(ad.headline);
  const [subtext, setSubtext] = useState(ad.subtext);
  const [sponsorName, setSponsorName] = useState(ad.sponsorName);
  const [imageUrl, setImageUrl] = useState(ad.imageUrl || "");
  const [ctaLabel, setCtaLabel] = useState(ad.ctaLabel || "Learn More");
  const [ctaUrl, setCtaUrl] = useState(ad.ctaUrl || "");
  const [promoCode, setPromoCode] = useState(ad.promoCode || "");

  const isOwner = isUserVenueOwner(venueId, citizen);

  useEffect(() => {
    if (open) {
      const current = getVenueWallAd(venueId);
      setAd(current);
      setHeadline(current.headline);
      setSubtext(current.subtext);
      setSponsorName(current.sponsorName);
      setImageUrl(current.imageUrl || "");
      setCtaLabel(current.ctaLabel || "Learn More");
      setCtaUrl(current.ctaUrl || "");
      setPromoCode(current.promoCode || "");
      setIsEditing(false);
    }
  }, [open, venueId]);

  const handleCopyCode = () => {
    if (!ad.promoCode) return;
    navigator.clipboard?.writeText(ad.promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAd = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: VenueWallAd = {
      ...ad,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-slate-900 border-none shadow-2xl w-[92vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] p-6 sm:p-7">
        
        {/* Header Badge */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm">
              <Megaphone className="w-4 h-4" />
            </span>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                In-Venue Wall Advertisement
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 truncate max-w-[240px]">
                {venueName}
              </h3>
            </div>
          </div>

          {/* Owner status pill */}
          {isOwner && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wide">
              <Crown className="w-3 h-3 text-emerald-600" />
              <span>Owner Access</span>
            </span>
          )}
        </div>

        {isEditing ? (
          /* ======================================================== */
          /* OWNER EDIT FORM (Free with Venue Owner Subscription)     */
          /* ======================================================== */
          <form onSubmit={handleSaveAd} className="space-y-4 text-left">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-emerald-900 text-xs font-bold flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                As the verified venue subscriber, you can customize your in-venue wall advertisement for <strong>FREE</strong> at any time.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Campaign Headline</label>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Weekend Champagne Special"
                className="w-full h-11 px-4 bg-slate-100 rounded-xl text-sm font-bold text-slate-900 outline-none border border-slate-200 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Description / Details</label>
              <textarea
                rows={3}
                required
                value={subtext}
                onChange={(e) => setSubtext(e.target.value)}
                placeholder="Describe your promotion, event or product..."
                className="w-full p-3 bg-slate-100 rounded-xl text-xs font-medium text-slate-900 outline-none border border-slate-200 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Sponsor / Brand Name</label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="e.g. Armani Privé"
                  className="w-full h-10 px-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none border border-slate-200 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Promo Code (Optional)</label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. VIP2026"
                  className="w-full h-10 px-3 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none border border-slate-200 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Banner Image URL (16:9 recommended)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full h-10 px-3 bg-slate-100 rounded-xl text-xs font-medium text-slate-900 outline-none border border-slate-200 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Button Label</label>
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="e.g. Book VIP Table"
                  className="w-full h-10 px-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none border border-slate-200 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Link URL</label>
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-10 px-3 bg-slate-100 rounded-xl text-xs font-medium text-slate-900 outline-none border border-slate-200 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm rounded-xl transition-all shadow-md"
              >
                Save & Publish Wall Ad
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* ======================================================== */
          /* AD VIEW DISPLAY                                          */
          /* ======================================================== */
          <div className="space-y-4 text-left">
            {/* Ad Banner Image */}
            {ad.imageUrl && (
              <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden shadow-md bg-slate-900">
                <img
                  src={ad.imageUrl}
                  alt={ad.headline}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{ad.badge || "Venue Ad"}</span>
                </div>
              </div>
            )}

            {/* Campaign Title & Copy */}
            <div>
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider block mb-0.5">
                {ad.sponsorName}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {ad.headline}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5 leading-relaxed">
                {ad.subtext}
              </p>
            </div>

            {/* Promo Code Box (If applicable) */}
            {ad.promoCode && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block leading-none">Special Promo Code</span>
                    <span className="text-sm font-black font-mono text-slate-900">{ad.promoCode}</span>
                  </div>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 text-xs font-bold transition-all flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            {ad.ctaUrl ? (
              <a
                href={ad.ctaUrl}
                target={ad.ctaUrl.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm sm:text-base transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                <span>{ad.ctaLabel || "Learn More"}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={() => onOpenChange(false)}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm sm:text-base transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                <span>{ad.ctaLabel || "Acknowledge"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Owner Edit Action or External Advertiser Promotion */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
              {isOwner ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center gap-2 transition-colors font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Venue Wall Ad (Included with your Subscription)</span>
                </button>
              ) : (
                <div className="w-full text-center text-[11px] text-slate-400 font-medium">
                  Official wall advertisement for {venueName}.
                </div>
              )}
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
