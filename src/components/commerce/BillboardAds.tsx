"use client";

// Billboard advertising. Each billboard rotates up to 10 paid ads as a carousel. Anyone signed in
// can book a slot: upload a creative, pick the weeks, preview it on the billboard, and check out in
// real money (AED). Paid ads are reviewed by an admin before they go live.

import { ModalPortal } from "@/components/ui/modal-portal";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, Megaphone, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { FloorAdTile } from "@/components/map/FloorAds";
import { blockCells, houseAdFor, type HouseAd } from "@/lib/city/floorMosaic";
import { IsometricBillboard, type LiveBillboardAd } from "@/components/map/Icons";
import { Checkout } from "@/components/commerce/Checkout";
import { commerceError, formatAED, uploadImage, useSettings } from "@/lib/commerce";

export interface LiveAd extends LiveBillboardAd { link_url: string | null }

interface MyCampaign { id: string; title: string; status: string; weeks: number; price_aed: number; impressions: number; clicks: number; ends_at: string | null; review_note: string | null; creative_url: string }

const entityOf = (placement: string) => placement.replace(/^(billboard|floor):/, "");

/** Live billboard and floor ads, grouped by map entity id. Each ad's view is counted once per visit. */
export function useLiveAds(): Record<string, LiveAd[]> {
  const [ads, setAds] = useState<Record<string, LiveAd[]>>({});
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase()
        .from("ad_campaigns")
        .select("id, placement, title, subtitle, link_url, creative_url, status, ends_at, starts_at")
        .eq("status", "active")
        .or("placement.like.billboard:%,placement.like.floor:%")
        .gt("ends_at", new Date().toISOString())
        .order("starts_at");
      if (!alive) return;
      const grouped: Record<string, LiveAd[]> = {};
      for (const c of data ?? []) (grouped[entityOf(c.placement)] ??= []).push(c);
      setAds(grouped);
      // Count one view per campaign per browser session.
      for (const c of data ?? []) {
        const key = `ad-seen:${c.id}`;
        let seen = false;
        try { seen = sessionStorage.getItem(key) === "1"; sessionStorage.setItem(key, "1"); } catch { /* storage blocked */ }
        if (!seen) void supabase().rpc("track_ad", { p_campaign: c.id, p_click: false });
      }
    };
    void load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return ads;
}

export function BillboardAds({ billboard, live, onClose, floor = false }: { billboard: { id: string; name?: string; style?: string }; live: LiveAd[]; onClose: () => void; floor?: boolean }) {
  const settings = useSettings();
  // Floor ads: one ad per panel, 7 days at a time.
  // Mosaic blocks are priced per cell (the id carries the size).
  const floorPlan = settings?.floor_ad ?? { slots: 1, price_aed_per_week: 25, max_weeks: 1, rotation_seconds: 6 };
  const plan = floor ? { ...floorPlan, price_aed_per_week: floorPlan.price_aed_per_week * blockCells(billboard.id) } : settings?.billboard;
  const placement = `${floor ? "floor" : "billboard"}:${billboard.id}`;
  const [taken, setTaken] = useState<number | null>(null);
  const [mode, setMode] = useState<"view" | "book">("view");
  const [mine, setMine] = useState<MyCampaign[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    supabase().rpc("ad_slots_taken", { p_placement: placement }).then(({ data }) => setTaken(Number(data ?? 0)));
    supabase().auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase().from("ad_campaigns").select("id, title, status, weeks, price_aed, impressions, clicks, ends_at, review_note, creative_url")
        .eq("placement", placement).eq("owner_id", user.id).order("created_at", { ascending: false })
        .then(({ data }) => setMine((data as MyCampaign[]) ?? []));
    });
  }, [placement, mode]);

  // Rotate the carousel.
  useEffect(() => {
    if (live.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % live.length), (plan?.rotation_seconds ?? 6) * 1000);
    return () => clearInterval(t);
  }, [live.length, plan?.rotation_seconds]);

  const slots = plan?.slots ?? 10;
  const free = taken === null ? null : Math.max(0, slots - taken);
  const current = live[index % Math.max(1, live.length)];
  const house = floor && !current ? houseAdFor(billboard.id) : null;
  // A floor ad that's showing something opens as a sponsored post; free blocks go straight to booking.
  if (floor && mode === "view" && (current || house)) {
    return <SponsoredSheet ad={current} house={house} onClose={onClose} onAdvertise={() => setMode("book")} free={free !== 0 && !current} onOpen={() => current && open(current)} />;
  }
  const open = (ad: LiveAd) => {
    void supabase().rpc("track_ad", { p_campaign: ad.id, p_click: true });
    if (ad.link_url) window.open(ad.link_url, "_blank", "noopener,noreferrer");
  };

  return (
<ModalPortal>
    <div className="fixed inset-0 z-[190] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[88dvh] flex flex-col overflow-hidden text-slate-900">
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <span className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center"><Megaphone className="w-5 h-5" /></span>
          <div className="flex-1 min-w-0">
            <h2 className="font-black leading-tight truncate">{billboard.name || "City billboard"}</h2>
            <p className="text-xs text-slate-500">
              {floor
                ? `${plan ? `${formatAED(plan.price_aed_per_week)} for 7 days · ` : ""}${free === null ? "…" : free > 0 ? "Available" : "Booked"}`
                : `${plan ? `${formatAED(plan.price_aed_per_week)} / week · ` : ""}${free === null ? "…" : `${free} of ${slots} ad slots free`}`}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {mode === "view" ? (
            <>
              {current ? (
                <button onClick={() => open(current)} className="block w-full text-left rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={current.creative_url} alt={current.title} className="w-full aspect-[16/9] object-cover" />
                  <span className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-wider bg-black/70 text-white px-2 py-0.5 rounded-full">Sponsored</span>
                  <span className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
                    <span className="block font-black">{current.title}</span>
                    {current.subtitle && <span className="block text-xs text-white/80">{current.subtitle}</span>}
                    {current.link_url && <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-sky-300">Visit <ExternalLink className="w-3 h-3" /></span>}
                  </span>
                </button>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
                  <p className="font-black">{floor ? "This floor ad is free" : "This billboard is free"}</p>
                  <p className="text-sm text-slate-500">{floor ? "Put your image on the ground here for 7 days — everyone passing between the roads sees it." : "Be the first brand on it — everyone exploring this part of Dubai sees it."}</p>
                </div>
              )}
              {live.length > 1 && (
                <div className="flex justify-center gap-1.5">
                  {live.map((ad, i) => <button key={ad.id} onClick={() => setIndex(i)} aria-label={`Show ad ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === index % live.length ? "w-6 bg-slate-900" : "w-1.5 bg-slate-300"}`} />)}
                </div>
              )}
              <button onClick={() => setMode("book")} disabled={free === 0 || settings?.features.billboard_ads === false}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black">
                {free === 0 ? (floor ? "Booked — try a free panel nearby" : "Fully booked") : "Advertise here"}
              </button>
              {mine.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Your ads here</h3>
                  {mine.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 border border-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.creative_url} alt="" className="w-16 h-10 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-bold text-sm truncate">{c.title}</div>
                        <div className="text-slate-500">{STATUS[c.status] ?? c.status}{c.review_note && c.status === "rejected" ? ` — ${c.review_note}` : ""}</div>
                      </div>
                      <div className="text-right text-[11px] text-slate-500">{c.impressions.toLocaleString()} views<br />{c.clicks.toLocaleString()} clicks</div>
                    </div>
                  ))}
                </section>
              )}
            </>
          ) : (
            <BookAd floor={floor} placement={placement} billboardStyle={billboard.style} plan={plan} onBack={() => setMode("view")} onBooked={() => setMode("view")} />
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

const STATUS: Record<string, string> = {
  pending_payment: "Waiting for payment", pending_review: "Paid · in review", active: "Live", paused: "Paused",
  rejected: "Not approved", ended: "Finished", cancelled: "Cancelled",
};

function BookAd({ placement, billboardStyle, plan, onBack, onBooked, floor = false }: {
  floor?: boolean; placement: string; billboardStyle?: string; plan?: { price_aed_per_week: number; max_weeks: number; slots: number };
  onBack: () => void; onBooked: () => void;
}) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [link, setLink] = useState("");
  const [weeks, setWeeks] = useState(1);
  const [creative, setCreative] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState(false);
  const price = (plan?.price_aed_per_week ?? 0) * weeks;
  const preview = useMemo(() => (creative ? [{ id: "preview", title: title || "Your brand", subtitle, creative_url: creative }] : undefined), [creative, title, subtitle]);
  const linkOk = !link || /^https:\/\/[^\s]+\.[^\s]+$/.test(link);
  const ready = !!creative && title.trim().length > 0 && linkOk && !!plan;

  const onFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const res = await uploadImage("ad-creatives", file);
    setUploading(false);
    if ("error" in res) setError(res.error);
    else setCreative(res.url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-900 p-3 flex justify-center">
        <div className="w-full max-w-[320px]">
          {floor
            ? <FloorAdTile campaigns={preview} width={300} height={150} />
            : <IsometricBillboard id="preview" billboardStyle={(billboardStyle as "mega-led") || "mega-led"} campaigns={preview} />}
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-bold text-slate-600">Ad image (landscape works best · PNG, JPG, WebP · up to 5 MB)</span>
        <span className="mt-1 flex items-center gap-3 h-14 rounded-xl border-2 border-dashed border-slate-200 px-3 cursor-pointer hover:bg-slate-50">
          {uploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
          <span className="text-sm text-slate-600 truncate">{creative ? "Image uploaded — tap to replace" : "Choose an image"}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </span>
      </label>
      <Field label="Headline" value={title} onChange={setTitle} max={60} placeholder="e.g. Brunch at The Terrace" />
      <Field label="Tagline (optional)" value={subtitle} onChange={setSubtitle} max={80} placeholder="e.g. Every Friday · Downtown" />
      <Field label="Link (optional, https://)" value={link} onChange={setLink} max={300} placeholder="https://your-site.ae" />
      {!linkOk && <p className="text-xs font-bold text-rose-600">Links must start with https://</p>}

      {!floor && <div>
        <span className="text-xs font-bold text-slate-600">How long</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {[1, 2, 4, 8, 12].filter((w) => w <= (plan?.max_weeks ?? 12)).map((w) => (
            <button key={w} onClick={() => setWeeks(w)} className={`h-10 px-3 rounded-xl text-sm font-bold ${weeks === w ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{w} week{w > 1 ? "s" : ""}</button>
          ))}
        </div>
      </div>}
      {floor && <p className="text-xs font-bold text-slate-600">Runs for 7 days from approval, then the panel is free to book again.</p>}
      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <button onClick={onBack} className="h-12 px-4 rounded-2xl bg-slate-100 font-bold">Back</button>
        <button disabled={!ready} onClick={() => setCheckout(true)} className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black">
          Continue · {formatAED(price)}
        </button>
      </div>

      {checkout && plan && (
        <Checkout
          title={floor ? "Book a floor ad" : "Book a billboard ad"}
          amount={price}
          lines={[
            { label: "Ad", value: title },
            ...(floor
              ? [{ label: "Duration", value: "7 days" }, { label: "Placement", value: "Your image alone on this floor panel" }]
              : [
                { label: "Duration", value: `${weeks} week${weeks > 1 ? "s" : ""}` },
                { label: "Price per week", value: formatAED(plan.price_aed_per_week) },
                { label: "Rotation", value: `Shares the screen with up to ${plan.slots - 1} other ads` },
              ]),
          ]}
          note="Your ad is checked by our team after payment and runs for the weeks you bought from the moment it's approved. Ads that aren't approved are refunded in full. Sponsored content is labelled as such."
          onConfirm={async () => {
            const { error: e } = await supabase().rpc("create_ad_campaign", { p_placement: placement, p_title: title, p_subtitle: subtitle, p_link: link, p_creative: creative, p_weeks: weeks });
            return e ? commerceError(e.message) : null;
          }}
          onClose={() => { setCheckout(false); onBooked(); }}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, max, placeholder }: { label: string; value: string; onChange: (v: string) => void; max: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
    </label>
  );
}

const hostOf = (url: string | null) => { try { return url ? new URL(url).hostname.replace(/^www\./, "") : null; } catch { return null; } };

/** A floor ad opened from the map: the brand at the top, "Sponsored · site", and the ad shown big. */
function SponsoredSheet({ ad, house, onClose, onAdvertise, onOpen, free }: { ad?: LiveAd; house: HouseAd | null; onClose: () => void; onAdvertise: () => void; onOpen: () => void; free: boolean }) {
  const title = ad ? ad.title : house!.title;
  const site = ad ? hostOf(ad.link_url) : "Come To Dubai";
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[190] bg-slate-950/40 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="w-full sm:max-w-xl bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden text-slate-900 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="flex items-center gap-3 px-5 pt-3 pb-4">
            <span className="w-12 h-12 shrink-0 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {ad ? <img src={ad.creative_url} alt="" className="w-full h-full object-cover" /> : house!.icon}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-lg leading-tight truncate">{title}{ad?.subtitle ? ` – ${ad.subtitle}` : ""}</h2>
              <p className="text-sm text-slate-500 truncate">Sponsored{site ? ` · ${site}` : ""}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 shrink-0 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
          <div className="overflow-y-auto px-5 space-y-3">
            {ad ? (
              <button onClick={onOpen} className="block w-full rounded-3xl overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.creative_url} alt={ad.title} className="w-full max-h-[62dvh] object-contain" />
              </button>
            ) : (
              <div className="rounded-3xl p-7 aspect-[4/3] flex flex-col justify-center" style={{ background: house!.bg, color: house!.fg }}>
                <div className="text-5xl">{house!.icon}</div>
                <div className="mt-3 font-black text-4xl leading-[1.05]">{house!.title}</div>
                <div className="mt-2 font-bold text-lg opacity-80">{house!.sub}</div>
                <div className="mt-4 h-1.5 w-24 rounded-full" style={{ background: house!.accent }} />
              </div>
            )}
            {ad?.link_url && <button onClick={onOpen} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center gap-2">Visit {site} <ExternalLink className="w-4 h-4" /></button>}
            {!ad && house && house.href !== "#advertise" && <a href={house.href} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center">{house.cta} →</a>}
            {free && <button onClick={onAdvertise} className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">Advertise on this spot · 7 days</button>}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
