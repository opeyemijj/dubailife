"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  Gamepad2,
  Building,
  Target,
  BarChart2,
  CheckCircle,
  HelpCircle,
  Clock,
} from "lucide-react";
import { Page, Card, Stat, aed, coins, db } from "./ui";

interface AdminReport {
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

interface CitizenCohort {
  id: string;
  finished: boolean;
  balance: number;
  created_at: string;
  last_sign_in_at: string | null;
}

export function Analytics() {
  const [report, setReport] = useState<AdminReport | null>(null);
  const [cohorts, setCohorts] = useState<CitizenCohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    Promise.all([
      db().rpc("admin_report"),
      db().rpc("admin_list_citizens", { p_limit: 500 }),
    ])
      .then(([repRes, citRes]) => {
        if (repRes.error) {
          setError(repRes.error.message);
        } else {
          setReport(repRes.data as AdminReport);
        }
        if (citRes.data) {
          setCohorts(citRes.data as CitizenCohort[]);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Compute Growth & Engagement Funnel
  const funnel = useMemo(() => {
    const totalRegistered = cohorts.length || (report?.citizens ?? 0);
    const finishedOnboarding = cohorts.filter((c) => c.finished).length;
    const dropOff = totalRegistered - finishedOnboarding;
    const onboardingRate = totalRegistered
      ? Math.round((finishedOnboarding / totalRegistered) * 100)
      : 0;

    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;

    const active7d = cohorts.filter(
      (c) => c.last_sign_in_at && new Date(c.last_sign_in_at).getTime() >= sevenDaysAgo
    ).length;

    const active30d = cohorts.filter(
      (c) => c.last_sign_in_at && new Date(c.last_sign_in_at).getTime() >= thirtyDaysAgo
    ).length;

    const retention7d = totalRegistered ? Math.round((active7d / totalRegistered) * 100) : 0;
    const retention30d = totalRegistered ? Math.round((active30d / totalRegistered) * 100) : 0;

    // High engagement players (balance > 5,000 or recent active)
    const powerUsers = cohorts.filter(
      (c) => (Number(c.balance) || 0) > 5000 && c.finished
    ).length;

    return {
      totalRegistered,
      finishedOnboarding,
      dropOff,
      onboardingRate,
      active7d,
      active30d,
      retention7d,
      retention30d,
      powerUsers,
    };
  }, [cohorts, report]);

  // Total Real-Money Revenue
  const totalRev = useMemo(() => {
    if (!report?.revenue_by_purpose) return 0;
    return Object.values(report.revenue_by_purpose).reduce((a, b) => a + Number(b), 0);
  }, [report]);

  // Virtual Economy Health Metrics (Faucets vs Sinks)
  const economy = useMemo<{
    ratio: number;
    status: string;
    faucet: number;
    sink: number;
    healthTone: "emerald" | "amber" | "rose";
  }>(() => {
    if (!report) {
      return { ratio: 1, status: "Balanced", faucet: 0, sink: 0, healthTone: "emerald" };
    }
    const faucet = Number(report.coins_earned_30d) || 0;
    const sink = Number(report.coins_spent_30d) || 0;
    // Sink to Faucet ratio
    const ratio = faucet > 0 ? Number((sink / faucet).toFixed(2)) : 1;

    let status = "Balanced & Sustainable";
    let healthTone: "emerald" | "amber" | "rose" = "emerald";

    if (ratio < 0.4) {
      status = "High Inflation (Faucets exceed Sinks by >2.5x)";
      healthTone = "amber";
    } else if (ratio > 1.3) {
      status = "Deflationary (Spending exceeds Earning)";
      healthTone = "amber";
    }

    return { ratio, status, faucet, sink, healthTone };
  }, [report]);

  if (error) {
    return (
      <Page title="Growth Analytics">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          Failed to load analytics: {error}
        </div>
      </Page>
    );
  }

  if (loading || !report) {
    return (
      <Page title="Growth Analytics">
        <div className="py-20 text-center text-sm text-slate-400">Computing analytics and cohorts…</div>
      </Page>
    );
  }

  return (
    <Page
      title="Growth & Product Analytics"
      subtitle="Actionable intelligence on player acquisition, onboarding dropoff, monetization, and virtual economy velocity."
      actions={
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
            {(["7d", "30d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer uppercase ${
                  timeRange === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r === "all" ? "All Time" : r}
              </button>
            ))}
          </div>
          <Link
            href="/admin/citizens"
            className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black inline-flex items-center gap-1.5 transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            <span>View Citizens</span>
          </Link>
        </div>
      }
    >
      {/* 1. Executive Growth Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Total Registered"
          value={funnel.totalRegistered.toLocaleString()}
          tone="slate"
          hint={`${funnel.finishedOnboarding} activated citizens`}
        />
        <Stat
          label="Gross Revenue"
          value={aed(timeRange === "30d" ? report.revenue_30d : totalRev)}
          tone="emerald"
          hint={`MRR: ${aed(report.mrr)}`}
        />
        <Stat
          label="7-Day Retention"
          value={`${funnel.retention7d}%`}
          tone="sky"
          hint={`${funnel.active7d} active this week`}
        />
        <Stat
          label="Economy Health"
          value={`${Math.round(economy.ratio * 100)}%`}
          tone={economy.healthTone}
          hint={economy.status.split(" ")[0]}
        />
      </div>

      {/* 2. Conversion Funnel & Onboarding Analysis */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Player Acquisition & Onboarding Funnel" className="lg:col-span-2">
          <p className="text-xs text-slate-500 mb-4">
            Track user conversion from initial landing signup down to active in-game citizenship.
          </p>

          <div className="space-y-4">
            {/* Step 1: Sign up */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>1. Accounts Registered</span>
                <span>{funnel.totalRegistered.toLocaleString()} (100%)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-800 rounded-full w-full" />
              </div>
            </div>

            {/* Step 2: Finished Avatar & Profile */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>2. Completed Onboarding (Avatar &amp; Budget)</span>
                <span className="text-emerald-600">
                  {funnel.finishedOnboarding.toLocaleString()} ({funnel.onboardingRate}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, funnel.onboardingRate)}%` }}
                />
              </div>
              {funnel.dropOff > 0 && (
                <div className="text-[11px] text-amber-600 mt-1 font-semibold flex items-center gap-1">
                  <span>⚠️ {funnel.dropOff} users created an account but didn&apos;t pick an avatar yet.</span>
                </div>
              )}
            </div>

            {/* Step 3: Active in City (Last 7d) */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>3. Returned to City (Weekly Active)</span>
                <span className="text-sky-600">
                  {funnel.active7d.toLocaleString()} ({funnel.retention7d}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(3, funnel.retention7d)}%` }}
                />
              </div>
            </div>

            {/* Step 4: Power Citizens */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>4. High-Net-Worth Citizens (&gt;5k AED / Heavy Players)</span>
                <span className="text-indigo-600">{funnel.powerUsers.toLocaleString()} citizens</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(2, (funnel.powerUsers / (funnel.totalRegistered || 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 3. Actionable Growth Decision Engine */}
        <Card title="Growth Decision Assistant">
          <div className="space-y-3 pt-1">
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="font-black flex items-center gap-1.5 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Onboarding Optimization</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-900/90">
                {funnel.onboardingRate >= 75
                  ? "Great! Over 75% of signups complete their avatar. Maintain simplicity on step 1."
                  : `Drop-off is ${100 - funnel.onboardingRate}%. Google 1-Tap now active will streamline account creation.`}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-200 text-xs text-sky-950 space-y-1">
              <div className="font-black flex items-center gap-1.5 text-sky-800">
                <Target className="w-3.5 h-3.5" />
                <span>B2B Venue Monetization</span>
              </div>
              <p className="text-[11px] leading-relaxed text-sky-900/90">
                {report.venues_claimed} claimed venues. High-footfall districts (Dubai Marina &amp; Downtown) have unclaimed clubs. Target local businesses to drive recurring MRR ({aed(report.mrr)}).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-black flex items-center gap-1.5 text-amber-800">
                <Flame className="w-3.5 h-3.5" />
                <span>Economy Sinks</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                {economy.ratio < 0.5
                  ? "Citizens are earning faster than spending. Introduce luxury furniture items and villa upgrades to soak up excess virtual AED."
                  : "Virtual AED inflow/outflow is healthy. Blueprints balance daily earnings."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Real-Money Monetization Breakdown & Virtual Economy Velocity */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Real Money Breakdown */}
        <Card title="Real-Money Revenue Streams (AED)">
          <div className="space-y-3">
            {[
              {
                id: "coins",
                label: "Virtual AED Packs",
                amount: report.revenue_by_purpose?.coins ?? 0,
                color: "bg-emerald-500",
              },
              {
                id: "venue_subscription",
                label: "Venue Verified Subscriptions (MRR)",
                amount: report.revenue_by_purpose?.venue_subscription ?? 0,
                color: "bg-sky-500",
              },
              {
                id: "ad_campaign",
                label: "Sponsored In-Game Ads",
                amount: report.revenue_by_purpose?.ad_campaign ?? 0,
                color: "bg-amber-500",
              },
            ].map((stream) => {
              const pct = totalRev > 0 ? Math.round((stream.amount / totalRev) * 100) : 0;
              return (
                <div key={stream.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">{stream.label}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {aed(stream.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stream.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Unsettled / Pending Orders</span>
              <span className="font-bold text-amber-700">
                {report.payments_pending} awaiting confirmation
              </span>
            </div>
          </div>
        </Card>

        {/* Virtual AED Economy Velocity */}
        <Card title="Virtual AED Economy Health (30 Days)">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px] font-semibold">Circulating Supply</span>
                <strong className="text-base text-slate-900 font-mono">
                  {coins(report.coins_outstanding)}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px] font-semibold">Purchased with Real Money</span>
                <strong className="text-base text-emerald-700 font-mono">
                  {coins(report.coins_purchased)}
                </strong>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">30d Faucet (Job shifts, quests, daily logins):</span>
                <span className="font-mono font-bold text-emerald-600">
                  +{Number(report.coins_earned_30d).toLocaleString()} AED
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">30d Sink (Rent, Blueprints, Dining, Games):</span>
                <span className="font-mono font-bold text-rose-600">
                  -{Number(report.coins_spent_30d).toLocaleString()} AED
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-slate-800">Sink-to-Faucet Ratio:</span>
                <span className="font-mono font-black text-slate-900">
                  {economy.ratio}x ({economy.status})
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Advertising & Venues Performance */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="In-Game Advertising Performance">
          <div className="grid grid-cols-3 gap-3 text-center py-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Impressions</span>
              <div className="text-xl font-black text-slate-900 mt-1">
                {report.ad_impressions.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Clicks</span>
              <div className="text-xl font-black text-slate-900 mt-1">
                {report.ad_clicks.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Click-Through</span>
              <div className="text-xl font-black text-emerald-700 mt-1">
                {report.ad_impressions
                  ? `${((report.ad_clicks / report.ad_impressions) * 100).toFixed(2)}%`
                  : "0.00%"}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Active campaigns: {report.campaigns?.active ?? 0}</span>
            <Link href="/admin/ads" className="text-sky-600 font-bold hover:underline">
              Manage campaigns →
            </Link>
          </div>
        </Card>

        <Card title="Venue Claims & Business Pipeline">
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Registered Commercial Businesses:</span>
              <span className="font-bold text-slate-900">{report.businesses}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Venues Verified &amp; Claimed:</span>
              <span className="font-bold text-slate-900">{report.venues_claimed}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Active Venue Subscriptions:</span>
              <span className="font-bold text-emerald-600">{report.active_subscriptions}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Pending Ownership Claims:</span>
              <Link
                href="/admin/claims"
                className="font-bold text-sky-600 hover:underline flex items-center gap-1"
              >
                <span>{report.claims_pending} to review</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
