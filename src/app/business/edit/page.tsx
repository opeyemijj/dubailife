"use client";

// Venue editor for verified owners with an active plan: details, the promotion visitors see on
// arrival, offers and the venue's own items. Save as a draft, preview, then publish.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, ImagePlus, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { BusinessGate, Shell } from "@/components/business/BusinessGate";
import { uploadImage, venueName } from "@/lib/commerce";
import type { VenueContent } from "@/lib/venueContent";

export default function EditPage() {
  return (
    <Suspense fallback={<Shell><p className="text-sm text-slate-400">Loading…</p></Shell>}>
      <BusinessGate>{() => <Editor />}</BusinessGate>
    </Suspense>
  );
}

interface Analytics { visits_30d: number; visits_7d: number; daily: Array<{ day: string; visits: number }> }

function Editor() {
  const venue = useSearchParams().get("venue") ?? "";
  const [draft, setDraft] = useState<VenueContent | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const db = supabase();
    db.rpc("get_venue_editor", { p_venue: venue }).then(({ data }) => {
      if (!data) { setAllowed(false); return; }
      const d = data as { draft: VenueContent; published_at: string | null };
      setDraft(d.draft ?? {});
      setPublishedAt(d.published_at);
    });
    db.rpc("venue_analytics", { p_venue: venue }).then(({ data }) => data && setStats(data as Analytics));
  }, [venue]);

  if (!allowed) return (
    <Shell>
      <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 p-6 text-center space-y-2">
        <h1 className="font-black text-lg">Not available yet</h1>
        <p className="text-sm text-slate-500">You can edit {venueName(venue)} once your ownership is verified and the venue plan is active.</p>
        <Link href="/business" className="inline-block mt-2 font-bold text-emerald-700">Back to your venues</Link>
      </div>
    </Shell>
  );
  if (!draft) return <Shell><p className="text-sm text-slate-400">Loading…</p></Shell>;

  const set = <K extends keyof VenueContent>(k: K, v: VenueContent[K]) => setDraft({ ...draft, [k]: v });
  const promo = draft.promo ?? {};
  const setPromo = (k: keyof NonNullable<VenueContent["promo"]>, v: string) => set("promo", { ...promo, [k]: v });
  const linkOk = (u?: string) => !u || /^https:\/\/\S+\.\S+/.test(u);
  const valid = [draft.website, draft.reservation_url, promo.cta_url].every(linkOk);

  const save = async (publish: boolean) => {
    const db = supabase();
    const { error } = await db.rpc("save_venue_draft", { p_venue: venue, p_draft: draft });
    if (error) { setMsg("Couldn't save. Please try again."); return; }
    if (publish) {
      const { error: e } = await db.rpc("publish_venue_content", { p_venue: venue });
      if (e) { setMsg("Saved, but couldn't publish."); return; }
      setPublishedAt(new Date().toISOString());
      setMsg("Published — visitors see it now.");
    } else setMsg("Draft saved.");
  };

  const image = async (file: File | undefined, apply: (url: string) => void) => {
    if (!file) return;
    const res = await uploadImage("venue-media", file);
    if ("error" in res) setMsg(res.error);
    else apply(res.url);
  };

  return (
    <Shell>
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/business" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center" aria-label="Back"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black truncate">{venueName(venue)}</h1>
            <p className="text-xs text-slate-500">{publishedAt ? `Last published ${new Date(publishedAt).toLocaleString()}` : "Not published yet"}</p>
          </div>
          <button onClick={() => setPreview(!preview)} className="h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm font-bold flex items-center gap-1.5"><Eye className="w-4 h-4" /> {preview ? "Hide preview" : "Preview"}</button>
          <button disabled={!valid} onClick={() => save(false)} className="h-10 px-3 rounded-xl bg-slate-100 text-sm font-bold">Save draft</button>
          <button disabled={!valid} onClick={() => save(true)} className="h-10 px-4 rounded-xl bg-emerald-600 disabled:bg-slate-300 text-white text-sm font-black">Publish</button>
        </div>
        {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}
        {!valid && <p className="text-sm font-bold text-rose-600">Links must start with https://</p>}

        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4"><div className="text-xs font-bold text-slate-500 uppercase">Visits, 7 days</div><div className="text-2xl font-black">{stats.visits_7d.toLocaleString()}</div></div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4"><div className="text-xs font-bold text-slate-500 uppercase">Visits, 30 days</div><div className="text-2xl font-black">{stats.visits_30d.toLocaleString()}</div>
              <div className="mt-2 flex items-end gap-0.5 h-8">{stats.daily.map((d) => <span key={d.day} title={`${d.day}: ${d.visits}`} className="flex-1 bg-emerald-400 rounded-sm" style={{ height: `${Math.max(8, (d.visits / Math.max(1, ...stats.daily.map((x) => x.visits))) * 100)}%` }} />)}</div>
            </div>
          </div>
        )}

        {preview && (
          <div className="rounded-2xl bg-slate-800 p-4 grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Shown while the venue loads</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {promo.image_url && <img src={promo.image_url} alt="" className="w-full aspect-[16/9] object-cover rounded-xl mb-2" />}
              <div className="font-black">{promo.headline || "Your headline"}</div>
              {promo.text && <p className="text-xs text-slate-600">{promo.text}</p>}
              {promo.cta_url && <span className="mt-2 inline-block h-8 px-3 leading-8 rounded-xl bg-slate-900 text-white text-xs font-black">{promo.cta_label || "Find out more"}</span>}
            </div>
            <div className="bg-white rounded-2xl p-3 text-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">About sheet</div>
              <div className="font-black">{venueName(venue)} ✓</div>
              {draft.tagline && <div className="text-xs text-slate-500">{draft.tagline}</div>}
              {draft.description && <p className="text-xs">{draft.description}</p>}
              {(draft.offers ?? []).map((o, i) => <div key={i} className="text-xs bg-amber-50 rounded-lg p-1.5"><b>{o.title}</b> {o.detail}</div>)}
            </div>
          </div>
        )}

        <Section title="Details">
          <Field label="Tagline" value={draft.tagline} onChange={(v) => set("tagline", v)} max={80} />
          <Area label="Description" value={draft.description} onChange={(v) => set("description", v)} max={800} />
          <Area label="Opening hours" value={draft.hours} onChange={(v) => set("hours", v)} max={300} rows={3} placeholder={"Sun–Thu 10:00–23:00\nFri–Sat 10:00–00:00"} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Phone" value={draft.phone} onChange={(v) => set("phone", v)} max={30} />
            <Field label="Website (https://)" value={draft.website} onChange={(v) => set("website", v)} max={200} />
          </div>
          <Field label="Reservation or enquiry link (https://)" value={draft.reservation_url} onChange={(v) => set("reservation_url", v)} max={300} />
          <ImageField label="Logo" url={draft.logo_url} onFile={(f) => image(f, (u) => set("logo_url", u))} />
        </Section>

        <Section title="Arrival promotion" hint="Shown to visitors for a few seconds as your venue loads. They can dismiss it.">
          <ImageField label="Banner image" url={promo.image_url} onFile={(f) => image(f, (u) => setPromo("image_url", u))} />
          <Field label="Headline" value={promo.headline} onChange={(v) => setPromo("headline", v)} max={60} />
          <Field label="Text" value={promo.text} onChange={(v) => setPromo("text", v)} max={140} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Button label" value={promo.cta_label} onChange={(v) => setPromo("cta_label", v)} max={24} />
            <Field label="Button link (https://)" value={promo.cta_url} onChange={(v) => setPromo("cta_url", v)} max={300} />
          </div>
        </Section>

        <Section title="Offers">
          {(draft.offers ?? []).map((o, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input value={o.title} maxLength={60} onChange={(e) => set("offers", draft.offers!.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="e.g. 2-for-1 brunch" className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-sm" />
              <input value={o.detail ?? ""} maxLength={120} onChange={(e) => set("offers", draft.offers!.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)))} placeholder="Details" className="flex-[2] h-10 rounded-xl border border-slate-200 px-3 text-sm" />
              <button onClick={() => set("offers", draft.offers!.filter((_, j) => j !== i))} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center" aria-label="Remove offer"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {(draft.offers ?? []).length < 6 && <button onClick={() => set("offers", [...(draft.offers ?? []), { title: "" }])} className="h-9 px-3 rounded-xl bg-slate-100 text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add offer</button>}
        </Section>

        <Section title="Your menu & products in the game" hint="Sold to visitors for D-Coins at your venue's counter, alongside the standard range. Real-world orders go through your reservation link.">
          {(draft.items ?? []).map((it, i) => (
            <div key={i} className="grid grid-cols-[56px_1fr_110px_40px] gap-2 items-start">
              <input value={it.icon ?? ""} maxLength={4} onChange={(e) => set("items", draft.items!.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))} placeholder="🍰" className="h-10 rounded-xl border border-slate-200 px-2 text-center" />
              <div className="space-y-1">
                <input value={it.name} maxLength={60} onChange={(e) => set("items", draft.items!.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Item name" className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
                <input value={it.desc ?? ""} maxLength={160} onChange={(e) => set("items", draft.items!.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} placeholder="Short description" className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs" />
              </div>
              <input inputMode="numeric" value={String(it.price ?? "")} onChange={(e) => set("items", draft.items!.map((x, j) => (j === i ? { ...x, price: Number(e.target.value.replace(/\D/g, "")) } : x)))} placeholder="D-Coins" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
              <button onClick={() => set("items", draft.items!.filter((_, j) => j !== i))} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center" aria-label="Remove item"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {(draft.items ?? []).length < 30 && <button onClick={() => set("items", [...(draft.items ?? []), { name: "", price: 50 }])} className="h-9 px-3 rounded-xl bg-slate-100 text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add item</button>}
        </Section>
      </div>
    </Shell>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div><h2 className="font-black">{title}</h2>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, max, placeholder }: { label: string; value?: string; onChange: (v: string) => void; max: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <input value={value ?? ""} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
    </label>
  );
}

function Area({ label, value, onChange, max, rows = 4, placeholder }: { label: string; value?: string; onChange: (v: string) => void; max: number; rows?: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <textarea value={value ?? ""} maxLength={max} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" />
    </label>
  );
}

function ImageField({ label, url, onFile }: { label: string; url?: string; onFile: (f?: File) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover bg-slate-100" /> : <span className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center"><ImagePlus className="w-5 h-5 text-slate-400" /></span>}
      <span className="text-sm font-bold text-slate-700">{label}<span className="block text-xs font-normal text-slate-500">{url ? "Tap to replace" : "PNG, JPG or WebP, up to 5 MB"}</span></span>
      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
    </label>
  );
}
