"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Building2,
  Users,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { Page, Stat, Card, aed, coins, db } from "./ui";

interface Report {
  revenue_by_purpose: Record<string, number>;
  revenue_30d: number;
  refunds_total: number;
  payments_pending: number;
  mrr: number;
  active_subscriptions: number;
  claims_pending: number;
  venues_claimed: number;
  campaigns: Record<string, number>;
  ad_impressions: number;
  ad_clicks: number;
  coins_outstanding: number;
  coins_purchased: number;
  coins_earned_30d: number;
  coins_spent_30d: number;
  citizens: number;
  businesses: number;
}

const PURPOSE: Record<string, string> = {
  coins: "Virtual AED Sales",
  venue_subscription: "Venue Subscriptions",
  ad_campaign: "Advertising",
};

export function Overview() {
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db()
      .rpc("admin_report")
      .then(({ data, error }) => (error ? setError(error.message) : setR(data as Report)));
  }, []);

  if (error) {
    return (
      <Page title="Overview">
        <p className="text-rose-600">{error}</p>
      </Page>
    );
  }

  if (!r) {
    return (
      <Page title="Overview">
        <p className="text-slate-400">Loading metrics…</p>
      </Page>
    );
  }

  const total = Object.values(r.revenue_by_purpose).reduce((a, b) => a + Number(b), 0);
  const ctr = r.ad_impressions ? ((r.ad_clicks / r.ad_impressions) * 100).toFixed(2) : "0.00";
  const hasPendingAction = r.claims_pending > 0 || r.payments_pending > 0;

  return (
    <Page
      title="Admin Command Center"
      subtitle="Executive summary of revenue, active population, economy velocity, and operational alerts."
      actions={
        <Link
          href="/admin/analytics"
          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
        >
          <TrendingUp className="w-4 h-4" />
          <span>Deep Growth Analytics →</span>
        </Link>
      }
    >
      {/* Action Required Banner if pending items exist */}
      {hasPendingAction && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Action needed:{" "}
              {r.claims_pending > 0 && (
                <span className="font-black text-amber-950">
                  {r.claims_pending} venue claim{r.claims_pending === 1 ? "" : "s"} to review
                </span>
              )}
              {r.claims_pending > 0 && r.payments_pending > 0 && " and "}
              {r.payments_pending > 0 && (
                <span className="font-black text-amber-950">
                  {r.payments_pending} pending payment order{r.payments_pending === 1 ? "" : "s"}
                </span>
              )}
              .
            </span>
          </div>
          <div className="flex items-center gap-2">
            {r.claims_pending > 0 && (
              <Link
                href="/admin/claims"
                className="px-2.5 py-1 rounded-lg bg-amber-200/60 hover:bg-amber-200 text-amber-950 transition-colors"
              >
                Review claims →
              </Link>
            )}
            {r.payments_pending > 0 && (
              <Link
                href="/admin/payments"
                className="px-2.5 py-1 rounded-lg bg-amber-200/60 hover:bg-amber-200 text-amber-950 transition-colors"
              >
                Verify payments →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Primary Financial & Population KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Total Revenue"
          value={aed(total)}
          tone="emerald"
          hint={`30d: ${aed(r.revenue_30d)}`}
        />
        <Stat
          label="Monthly Recurring"
          value={aed(r.mrr)}
          tone="sky"
          hint={`${r.active_subscriptions} active venue subscriptions`}
        />
        <Stat
          label="Citizen Population"
          value={r.citizens.toLocaleString()}
          tone="slate"
          hint="Registered players"
        />
        <Stat
          label="Awaiting Payment"
          value={r.payments_pending}
          tone="amber"
          hint="Unconfirmed orders"
        />
      </div>

      {/* Growth Quicklink Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/10 via-emerald-900/5 to-transparent p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Growth Intelligence Available</span>
          </div>
          <h2 className="text-base font-black text-slate-900">
            Player Acquisition Funnel &amp; Economy Health
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Analyze 7-day player retention cohorts, onboarding drop-off percentages, unit economics, and automated recommendations for scaling Dubai Life.
          </p>
        </div>
        <Link
          href="/admin/analytics"
          className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-2 whitespace-nowrap shadow-sm transition-all"
        >
          <span>Open Growth Analytics</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid: Revenue, Businesses, Ads */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Streams */}
        <Card title="Revenue Distribution">
          <div className="space-y-3">
            {Object.keys(PURPOSE).map((k) => {
              const streamAmount = r.revenue_by_purpose[k] ?? 0;
              const pct = total > 0 ? Math.round((streamAmount / total) * 100) : 0;
              return (
                <div key={k} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-600">{PURPOSE[k]}</span>
                    <span className="font-bold text-slate-900">
                      {aed(streamAmount)} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 text-right">
              <Link href="/admin/payments" className="text-xs font-bold text-sky-600 hover:underline">
                View all orders →
              </Link>
            </div>
          </div>
        </Card>

        {/* Venues & Businesses */}
        <Card title="Venues & B2B Pipeline">
          <Row k="Businesses registered" v={r.businesses} />
          <Row k="Venues claimed" v={r.venues_claimed} />
          <Row
            k="Claims to review"
            v={
              <Link href="/admin/claims" className="text-sky-600 font-bold hover:underline">
                {r.claims_pending} →
              </Link>
            }
          />
          <Row k="Active subscriptions" v={`${r.active_subscriptions} plans`} />
        </Card>

        {/* Advertising Performance */}
        <Card title="Advertising & Sponsored Impressions">
          {Object.entries(r.campaigns).map(([s, n]) => (
            <Row key={s} k={s.replace(/_/g, " ")} v={n} />
          ))}
          <Row k="Total impressions" v={r.ad_impressions.toLocaleString()} />
          <Row k="Clicks (CTR)" v={`${r.ad_clicks.toLocaleString()} (${ctr}%)`} />
        </Card>
      </div>

      {/* Virtual AED Economy Overview */}
      <Card title="Virtual AED Circulation & Balance">
        <div className="grid sm:grid-cols-4 gap-3 text-sm">
          <Row k="In citizens' wallets" v={coins(r.coins_outstanding)} />
          <Row k="Bought with money (all time)" v={coins(r.coins_purchased)} />
          <Row k="Earned in game (30d)" v={coins(r.coins_earned_30d)} />
          <Row k="Spent in game (30d)" v={coins(r.coins_spent_30d)} />
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Coin purchases are counted as revenue once, when paid. Unspent purchased coins are a liability until used; spending them isn&apos;t counted again.
        </p>
      </Card>
    </Page>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-600 capitalize">{k}</span>
      <span className="font-bold text-slate-900">{v}</span>
    </div>
  );
}
