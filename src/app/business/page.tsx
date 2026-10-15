"use client";

// Business portal: register a business, claim real venues in virtual Dubai, pay the monthly venue
// plan, manage what the venue shows, and follow ad campaigns and invoices.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, FileUp, Loader2, Megaphone, Receipt, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { BusinessGate, Shell } from "@/components/business/BusinessGate";
import { Checkout } from "@/components/commerce/Checkout";
import { commerceError, formatAED, useSettings, venueName } from "@/lib/commerce";
import { PLACES } from "@/lib/city/places";

interface Business { id: string; name: string; trade_license: string | null; contact_email: string | null; contact_phone: string | null; website: string | null }
interface Claim { id: string; venue_key: string; business_id: string; status: string; review_note: string | null; created_at: string }
interface Sub { id: string; venue_key: string; business_id: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean; price_aed: number }
interface Payment { id: string; description: string; amount_aed: number; status: string; created_at: string; paid_at: string | null }
interface Campaign { id: string; title: string; placement: string; status: string; impressions: number; clicks: number; ends_at: string | null; price_aed: number }

const LABEL: Record<string, string> = {
  pending: "Under review", verified: "Verified", rejected: "Not approved", revoked: "Revoked",
  pending_payment: "Awaiting payment", active: "Active", past_due: "Payment overdue", cancelled: "Cancelled", expired: "Expired",
  requires_payment: "Awaiting payment", paid: "Paid", refunded: "Refunded", pending_review: "In review", paused: "Paused", ended: "Finished",
};
const TONE: Record<string, string> = { verified: "text-emerald-700 bg-emerald-50", active: "text-emerald-700 bg-emerald-50", paid: "text-emerald-700 bg-emerald-50", rejected: "text-rose-700 bg-rose-50", past_due: "text-rose-700 bg-rose-50" };
const Pill = ({ s }: { s: string }) => <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${TONE[s] ?? "text-amber-700 bg-amber-50"}`}>{LABEL[s] ?? s}</span>;

export default function BusinessPage() {
  return (
    <Suspense fallback={<Shell><p className="text-sm text-slate-400">Loading…</p></Shell>}>
      <BusinessGate>{(me) => <Dashboard me={me} />}</BusinessGate>
    </Suspense>
  );
}

function Dashboard({ me }: { me: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const settings = useSettings();
  const [biz, setBiz] = useState<Business[] | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claiming, setClaiming] = useState<string | null>(params.get("claim"));
  const [paying, setPaying] = useState<{ business: string; venue: string } | null>(null);

  const load = useCallback(async () => {
    const db = supabase();
    const [b, c, s, p, a] = await Promise.all([
      db.from("businesses").select("*").order("created_at"),
      db.from("venue_claims").select("*").order("created_at", { ascending: false }),
      db.from("venue_subscriptions").select("*"),
      db.from("payments").select("id, description, amount_aed, status, created_at, paid_at").eq("user_id", me).order("created_at", { ascending: false }).limit(50),
      db.from("ad_campaigns").select("id, title, placement, status, impressions, clicks, ends_at, price_aed").eq("owner_id", me).order("created_at", { ascending: false }),
    ]);
    setBiz((b.data as Business[]) ?? []);
    setClaims((c.data as Claim[]) ?? []);
    setSubs((s.data as Sub[]) ?? []);
    setPayments((p.data as Payment[]) ?? []);
    setCampaigns((a.data as Campaign[]) ?? []);
  }, [me]);
  // Loads on open and after each change; state is set when the queries resolve.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  if (biz === null) return <Shell><p className="text-sm text-slate-400">Loading…</p></Shell>;
  if (biz.length === 0) return <Shell><Register onDone={load} /></Shell>;
  const business = biz[0];
  const plan = settings?.venue_subscription;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black">{business.name}</h1>
            <p className="text-sm text-slate-500">{[business.trade_license && `Licence ${business.trade_license}`, business.contact_email, business.contact_phone].filter(Boolean).join(" · ")}</p>
          </div>
          <button onClick={() => setClaiming("")} className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-black">Claim a venue</button>
        </div>

        {plan && (
          <section className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5">
            <div className="text-xs font-black uppercase tracking-wider text-emerald-300">Venue plan</div>
            <div className="text-2xl font-black mt-1">{formatAED(plan.price_aed)} <span className="text-sm font-bold text-white/60">per venue / {plan.interval}</span></div>
            <ul className="mt-3 grid sm:grid-cols-2 gap-1 text-sm text-white/80">{plan.benefits.map((b) => <li key={b}>✓ {b}</li>)}</ul>
            <p className="mt-3 text-xs text-white/50">{plan.terms}</p>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="font-black flex items-center gap-2"><Building2 className="w-4 h-4" /> Your venues</h2>
          {claims.length === 0 && <p className="text-sm text-slate-500">No venues yet. Claim the venue you own or manage to get started.</p>}
          {claims.map((c) => {
            const sub = subs.find((s) => s.venue_key === c.venue_key && s.business_id === c.business_id);
            const live = c.status === "verified" && sub?.status === "active";
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-black">{venueName(c.venue_key)}</div>
                  <div className="flex flex-wrap gap-2 mt-1 items-center text-xs">
                    <span className="text-slate-500">Ownership:</span> <Pill s={c.status} />
                    <span className="text-slate-500 ml-2">Plan:</span> <Pill s={sub?.status ?? "pending_payment"} />
                    {sub?.current_period_end && sub.status === "active" && <span className="text-slate-500">{sub.cancel_at_period_end ? "ends" : "renews"} {new Date(sub.current_period_end).toLocaleDateString()}</span>}
                  </div>
                  {c.review_note && c.status === "rejected" && <p className="text-xs text-rose-600 mt-1">{c.review_note}</p>}
                  {c.status === "pending" && <p className="text-xs text-slate-500 mt-1">We&apos;re checking your ownership details — usually within 2 working days.</p>}
                </div>
                <div className="flex gap-2">
                  {(c.status === "pending" || c.status === "verified") && sub?.status !== "active" && (
                    <button onClick={() => setPaying({ business: c.business_id, venue: c.venue_key })} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-black">Pay plan</button>
                  )}
                  {live && <Link href={`/business/edit?venue=${encodeURIComponent(c.venue_key)}`} className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center">Manage venue</Link>}
                  {live && sub && (
                    <button onClick={async () => { await supabase().rpc("cancel_subscription", { p_sub: sub.id, p_cancel: !sub.cancel_at_period_end }); void load(); }} className="h-9 px-3 rounded-xl bg-slate-100 text-xs font-bold">
                      {sub.cancel_at_period_end ? "Keep renewing" : "Cancel renewal"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-2">
          <h2 className="font-black flex items-center gap-2"><Megaphone className="w-4 h-4" /> Ad campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="text-sm text-slate-500">Book billboard ads by tapping any billboard on the city map. {settings && `From ${formatAED(settings.billboard.price_aed_per_week)} per week.`}</p>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {campaigns.map((c) => (
                <div key={c.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex-1 min-w-[160px]"><div className="font-bold">{c.title}</div><div className="text-xs text-slate-500">{c.placement.replace("billboard:", "Billboard ").replace("floor:", "Floor ad ")}{c.ends_at ? ` · until ${new Date(c.ends_at).toLocaleDateString()}` : ""}</div></div>
                  <Pill s={c.status} />
                  <div className="text-xs text-slate-500 w-36 text-right">{c.impressions.toLocaleString()} views · {c.clicks.toLocaleString()} clicks{c.impressions ? ` (${((c.clicks / c.impressions) * 100).toFixed(1)}%)` : ""}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="font-black flex items-center gap-2"><Receipt className="w-4 h-4" /> Invoices & payments</h2>
          {payments.length === 0 ? <p className="text-sm text-slate-500">No payments yet.</p> : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {payments.map((p) => (
                <div key={p.id} className="p-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0"><div className="font-bold truncate">{p.description}</div><div className="text-xs text-slate-500">#{p.id.slice(0, 8)} · {new Date(p.created_at).toLocaleDateString()}</div></div>
                  <div className="font-black">{formatAED(Number(p.amount_aed))}</div>
                  <Pill s={p.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {claiming !== null && (
        <ClaimVenue businessId={business.id} initial={claiming} onClose={() => { setClaiming(null); router.replace("/business"); }}
          onClaimed={(venue) => { setClaiming(null); router.replace("/business"); void load(); setPaying({ business: business.id, venue }); }} />
      )}
      {paying && plan && (
        <Checkout
          title="Venue plan"
          amount={plan.price_aed}
          lines={[{ label: "Venue", value: venueName(paying.venue) }, { label: "Billing", value: `Monthly, ${formatAED(plan.price_aed)}` }, { label: "Starts", value: "When ownership is verified and payment received" }]}
          note={plan.terms}
          onConfirm={async () => {
            const { error } = await supabase().rpc("create_subscription_payment", { p_business: paying.business, p_venue: paying.venue });
            return error ? commerceError(error.message) : null;
          }}
          onClose={() => { setPaying(null); void load(); }}
        />
      )}
    </Shell>
  );
}

function Register({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", license: "", email: "", phone: "", website: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error: err } = await supabase().rpc("register_business", { p_name: f.name, p_license: f.license, p_email: f.email, p_phone: f.phone, p_website: f.website });
    setBusy(false);
    if (err) setError("Couldn't register — check the details and try again.");
    else onDone();
  };
  return (
    <form onSubmit={submit} className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-3">
      <h1 className="text-xl font-black">Register your business</h1>
      <p className="text-sm text-slate-500">Claim your real venue in virtual Dubai, manage what visitors see, and advertise to everyone exploring the city.</p>
      {([["name", "Business name", true], ["license", "Trade licence number", true], ["email", "Business email", true], ["phone", "Phone", false], ["website", "Website (https://)", false]] as const).map(([k, label, req]) => (
        <label key={k} className="block">
          <span className="text-xs font-bold text-slate-600">{label}</span>
          <input required={req} value={f[k]} onChange={set(k)} className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm" />
        </label>
      ))}
      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      <button disabled={busy} className="w-full h-11 rounded-xl bg-emerald-600 text-white font-black">{busy ? "Saving…" : "Continue"}</button>
    </form>
  );
}

function ClaimVenue({ businessId, initial, onClose, onClaimed }: { businessId: string; initial: string; onClose: () => void; onClaimed: (venue: string) => void }) {
  const all = useMemo(() => PLACES.flatMap((p) => p.venues.filter((v) => !v.comingSoon).map((v) => ({ key: `${p.id}/${v.id}`, name: v.name, where: p.venues.length > 1 ? p.name : v.category }))), []);
  const [venue, setVenue] = useState(initial);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("Owner");
  const [evidence, setEvidence] = useState("");
  const [doc, setDoc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = all.filter((v) => !q || `${v.name} ${v.where}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40);

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("Documents must be 10 MB or smaller."); return; }
    const db = supabase();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error: e } = await db.storage.from("claim-docs").upload(path, file, { contentType: file.type });
    if (e) setError("Upload failed — use a PDF, JPG or PNG.");
    else { setDoc(`claim-docs:${path}`); setError(null); }
  };

  const submit = async () => {
    setBusy(true);
    const { error: e } = await supabase().rpc("submit_claim", { p_business: businessId, p_venue: venue, p_role: role, p_evidence: evidence, p_document: doc ?? "" });
    setBusy(false);
    if (e) setError(commerceError(e.message));
    else onClaimed(venue);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[92dvh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center"><h2 className="flex-1 text-lg font-black">Claim a venue</h2><button onClick={onClose} className="text-sm font-bold text-slate-500">Close</button></div>
        {!venue ? (
          <>
            <label className="flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-3"><Search className="w-4 h-4 text-slate-400" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search venues" className="flex-1 outline-none text-sm" /></label>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-100">
              {shown.map((v) => <button key={v.key} onClick={() => setVenue(v.key)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50"><div className="font-bold text-sm">{v.name}</div><div className="text-xs text-slate-500">{v.where}</div></button>)}
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-xl bg-slate-50 flex items-center"><span className="flex-1 font-black">{venueName(venue)}</span><button onClick={() => setVenue("")} className="text-xs font-bold text-slate-500">Change</button></div>
            <label className="block"><span className="text-xs font-bold text-slate-600">Your role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-2 text-sm">{["Owner", "General manager", "Marketing manager", "Authorised agency", "Other"].map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <label className="block"><span className="text-xs font-bold text-slate-600">How can we verify you? (licence details, your position, a contact at the venue)</span>
              <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={4} maxLength={2000} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" />
            </label>
            <label className="flex items-center gap-3 h-12 rounded-xl border-2 border-dashed border-slate-200 px-3 cursor-pointer">
              <FileUp className="w-5 h-5 text-slate-400" /><span className="text-sm text-slate-600">{doc ? "Document attached ✓" : "Attach trade licence or authorisation letter (private)"}</span>
              <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <button disabled={busy || evidence.trim().length < 10} onClick={submit} className="w-full h-11 rounded-xl bg-emerald-600 disabled:bg-slate-300 text-white font-black flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit claim
            </button>
            <p className="text-[11px] text-slate-400">Only verified owners or authorised representatives get control of a venue. Your document is visible only to you and our verification team.</p>
          </>
        )}
      </div>
    </div>
  );
}
