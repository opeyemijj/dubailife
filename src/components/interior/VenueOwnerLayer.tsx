"use client";

// Business layer inside a venue. While the 3D room loads (and for a moment after), visitors see
// either an invitation for the real owner to claim the venue, or the owner's own promotion. It never
// blocks the room and can always be dismissed. Claimed venues also get an "About" sheet.

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Phone, Clock, Globe, X, CalendarCheck } from "lucide-react";
import type { VenuePublic } from "@/lib/venueContent";
import { formatAED, useSettings } from "@/lib/commerce";

const dismissedKey = (key: string) => `promo-dismissed:${key}`;

export function VenueLoadingCard({ venueKey, venueName, pub, paused = false }: { venueKey: string; venueName: string; pub: VenuePublic | null; paused?: boolean }) {
  const settings = useSettings();
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(dismissedKey(venueKey)) === "1"; } catch { return false; }
  });
  // Shown while the room loads, then gets out of the way 10 seconds after it's ready.
  const { active } = useProgress();
  useEffect(() => {
    if (active) return;
    const t = setTimeout(() => setHidden(true), 10000);
    return () => clearTimeout(t);
  }, [active]);
  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem(dismissedKey(venueKey), "1"); } catch { /* storage blocked */ }
  };
  // Paused while another card (a Local's offer, an open panel) is showing, so they never stack.
  if (hidden || paused || !pub || !settings) return null;

  const promo = pub.content?.promo;
  if (pub.claimed) {
    if (!promo?.headline && !promo?.image_url) return null;
    return (
      <Card onClose={dismiss} label="From the venue">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {promo.image_url && <img src={promo.image_url} alt="" className="w-full aspect-[16/9] object-cover rounded-xl mb-2" />}
        {promo.headline && <h3 className="font-black text-slate-900 leading-tight">{promo.headline}</h3>}
        {promo.text && <p className="text-xs text-slate-600 mt-0.5">{promo.text}</p>}
        {promo.cta_url && (
          <a href={promo.cta_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-black">
            {promo.cta_label || "Find out more"} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </Card>
    );
  }

  if (!settings.features.venue_claims) return null;
  const plan = settings.venue_subscription;
  return (
    <Card onClose={dismiss} label="For business owners">
      <h3 className="font-black text-slate-900 leading-tight">Is {venueName} your business?</h3>
      <p className="hidden sm:block text-xs text-slate-600 mt-0.5">Claim it to manage how it looks here: your details, menu and prices, offers, reservations and the promotion visitors see on arrival.</p>
      <ul className="hidden sm:block mt-2 space-y-0.5 text-[11px] text-slate-600">
        {plan.benefits.slice(0, 3).map((b) => <li key={b}>✓ {b}</li>)}
      </ul>
      <div className="mt-2 sm:mt-3 flex items-center gap-2">
        <Link href={`/business?claim=${encodeURIComponent(venueKey)}`} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center">Claim this venue</Link>
        <span className="text-[11px] text-slate-500">{formatAED(plan.price_aed)} / {plan.interval}</span>
      </div>
    </Card>
  );
}

function Card({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute z-[35] left-3 right-3 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+6.5rem)] sm:left-auto sm:right-4 sm:bottom-24 sm:w-[320px] pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white p-3">
        <div className="flex items-center mb-1.5">
          <span className="flex-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
          <button onClick={onClose} className="w-8 h-8 -my-1 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** The owner's details, offers and booking link. */
export function VenueAbout({ venueName, pub, onClose }: { venueName: string; pub: VenuePublic; onClose: () => void }) {
  const c = pub.content ?? {};
  return (
    <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:top-20 sm:w-[380px] z-40 pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[62vh] sm:max-h-[80vh] overflow-y-auto p-4 space-y-3 text-slate-900">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.logo_url && <img src={c.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-slate-100" />}
          <div className="flex-1 min-w-0">
            <h3 className="font-black leading-tight flex items-center gap-1">{venueName} {pub.claimed && <BadgeCheck className="w-4 h-4 text-sky-500" aria-label="Partner venue" />}</h3>
            {c.tagline && <p className="text-xs text-slate-500">{c.tagline}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        {c.description && <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.description}</p>}
        <div className="space-y-1.5 text-sm">
          {c.hours && <p className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 text-slate-400" /> <span className="whitespace-pre-wrap">{c.hours}</span></p>}
          {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sky-700"><Phone className="w-4 h-4 text-slate-400" /> {c.phone}</a>}
          {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sky-700"><Globe className="w-4 h-4 text-slate-400" /> {c.website.replace(/^https?:\/\//, "")}</a>}
        </div>
        {(c.offers ?? []).length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Offers</h4>
            {c.offers!.map((o, i) => <div key={i} className="p-2.5 rounded-xl bg-amber-50 border border-amber-100"><div className="text-sm font-black">{o.title}</div>{o.detail && <div className="text-xs text-slate-600">{o.detail}</div>}</div>)}
          </div>
        )}
        {c.reservation_url && (
          <a href={c.reservation_url} target="_blank" rel="noopener noreferrer" className="w-full h-11 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2">
            <CalendarCheck className="w-4 h-4" /> Book a real table / visit <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        {c.reservation_url && <p className="text-[11px] text-slate-400 text-center">Opens the venue&apos;s own booking page outside Come To Dubai.</p>}
      </div>
    </div>
  );
}
