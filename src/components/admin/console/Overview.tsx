"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Page, Stat, Card, aed, coins, db } from "./ui";

interface Report {
  revenue_by_purpose: Record<string, number>; revenue_30d: number; refunds_total: number; payments_pending: number;
  mrr: number; active_subscriptions: number; claims_pending: number; venues_claimed: number;
  campaigns: Record<string, number>; ad_impressions: number; ad_clicks: number;
  coins_outstanding: number; coins_purchased: number; coins_earned_30d: number; coins_spent_30d: number;
  citizens: number; businesses: number;
}

const PURPOSE: Record<string, string> = { coins: "Virtual AED sales", venue_subscription: "Venue subscriptions", ad_campaign: "Advertising" };

export function Overview() {
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    db().rpc("admin_report").then(({ data, error }) => (error ? setError(error.message) : setR(data as Report)));
  }, []);
  if (error) return <Page title="Overview"><p className="text-rose-600">{error}</p></Page>;
  if (!r) return <Page title="Overview"><p className="text-slate-400">Loading…</p></Page>;
  const total = Object.values(r.revenue_by_purpose).reduce((a, b) => a + Number(b), 0);
  const ctr = r.ad_impressions ? ((r.ad_clicks / r.ad_impressions) * 100).toFixed(2) : "0.00";
  return (
    <Page title="Overview" subtitle="Real money is in AED (confirmed payments only). In-game money is virtual AED.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Revenue, all time" value={aed(total)} tone="emerald" hint={`Refunded ${aed(r.refunds_total)}`} />
        <Stat label="Revenue, 30 days" value={aed(r.revenue_30d)} tone="emerald" />
        <Stat label="Monthly recurring" value={aed(r.mrr)} tone="sky" hint={`${r.active_subscriptions} active venue plans`} />
        <Stat label="Awaiting payment" value={r.payments_pending} tone="amber" hint="Orders not yet paid" />
      </div>
      <div className="grid lg:grid-cols-3 gap-3">
        <Card title="Revenue by stream">
          {Object.keys(PURPOSE).map((k) => (
            <div key={k} className="flex justify-between py-1.5 text-sm"><span className="text-slate-600">{PURPOSE[k]}</span><span className="font-bold">{aed(r.revenue_by_purpose[k] ?? 0)}</span></div>
          ))}
        </Card>
        <Card title="Venues & businesses">
          <Row k="Businesses registered" v={r.businesses} />
          <Row k="Venues claimed" v={r.venues_claimed} />
          <Row k="Claims to review" v={<Link href="/admin/claims" className="text-sky-600 font-bold">{r.claims_pending} →</Link>} />
        </Card>
        <Card title="Advertising">
          {Object.entries(r.campaigns).map(([s, n]) => <Row key={s} k={s.replace(/_/g, " ")} v={n} />)}
          <Row k="Impressions" v={r.ad_impressions.toLocaleString()} />
          <Row k="Clicks (CTR)" v={`${r.ad_clicks.toLocaleString()} (${ctr}%)`} />
        </Card>
      </div>
      <Card title="Virtual AED economy">
        <div className="grid sm:grid-cols-4 gap-3 text-sm">
          <Row k="In citizens' wallets" v={coins(r.coins_outstanding)} />
          <Row k="Bought with money (all time)" v={coins(r.coins_purchased)} />
          <Row k="Earned in game (30d)" v={coins(r.coins_earned_30d)} />
          <Row k="Spent in game (30d)" v={coins(r.coins_spent_30d)} />
        </div>
        <p className="text-xs text-slate-400 mt-3">Coin purchases are counted as revenue once, when paid. Unspent purchased coins are a liability until used; spending them isn&apos;t counted again.</p>
      </Card>
      <p className="text-xs text-slate-400">{r.citizens.toLocaleString()} citizens registered.</p>
    </Page>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 py-1.5 text-sm"><span className="text-slate-600 capitalize">{k}</span><span className="font-bold text-slate-900">{v}</span></div>;
}
