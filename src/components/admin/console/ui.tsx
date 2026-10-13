"use client";

// Building blocks for the admin console: one look everywhere (white cards, slate text, emerald
// for primary actions, rose for destructive ones).

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export const aed = (n: number | string | null | undefined) => `AED ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const coins = (n: number | string | null | undefined) => `${Number(n ?? 0).toLocaleString()} D-Coins`;
export const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export function Page({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {title && <h2 className="px-4 pt-4 text-sm font-black text-slate-900">{title}</h2>}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = "slate" }: { label: string; value: React.ReactNode; hint?: string; tone?: "slate" | "emerald" | "sky" | "amber" | "rose" }) {
  const tones = { slate: "text-slate-900", emerald: "text-emerald-600", sky: "text-sky-600", amber: "text-amber-600", rose: "text-rose-600" };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-black ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200", active: "bg-emerald-50 text-emerald-700 ring-emerald-200", verified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  requires_payment: "bg-amber-50 text-amber-700 ring-amber-200", pending_payment: "bg-amber-50 text-amber-700 ring-amber-200", pending: "bg-amber-50 text-amber-700 ring-amber-200",
  pending_review: "bg-sky-50 text-sky-700 ring-sky-200", processing: "bg-sky-50 text-sky-700 ring-sky-200", paused: "bg-slate-100 text-slate-600 ring-slate-200",
  refunded: "bg-violet-50 text-violet-700 ring-violet-200", rejected: "bg-rose-50 text-rose-700 ring-rose-200", failed: "bg-rose-50 text-rose-700 ring-rose-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200", ended: "bg-slate-100 text-slate-500 ring-slate-200", expired: "bg-slate-100 text-slate-500 ring-slate-200", past_due: "bg-rose-50 text-rose-700 ring-rose-200",
};
export function Badge({ status }: { status: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 ${BADGE[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>{status.replace(/_/g, " ")}</span>;
}

export function Button({ tone = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "danger" }) {
  const tones = { primary: "bg-emerald-600 hover:bg-emerald-700 text-white", secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800", danger: "bg-rose-600 hover:bg-rose-700 text-white" };
  return <button {...props} className={`h-9 px-3 rounded-xl text-xs font-black disabled:opacity-50 ${tones[tone]} ${props.className ?? ""}`} />;
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>{head.map((h) => <th key={h} className="text-left font-bold px-3 py-2.5 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty && <p className="text-center text-sm text-slate-400 py-10">Nothing here yet.</p>}
    </div>
  );
}

/** Runs an admin action; shows the database's refusal as a readable message. */
export async function act(fn: () => PromiseLike<{ error: { message: string } | null }>): Promise<string | null> {
  const { error } = await fn();
  if (!error) return null;
  const m = error.message;
  return /not_permitted/.test(m) ? "Your admin role can't do that." : /not_admin/.test(m) ? "Admins only." : m.replace(/^.*?:\s*/, "");
}

/** Loads rows with a query; `reload` re-runs it. */
export function useRows<T>(query: () => PromiseLike<{ data: T[] | null }>, deps: unknown[] = []) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.resolve(query()).then(({ data }) => { if (alive) setRows(data ?? []); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);
  return { rows, reload: () => setTick((t) => t + 1) };
}

/** Public profile names for a set of user ids. */
export function useNames(ids: string[]) {
  const key = [...new Set(ids)].sort().join(",");
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!key) return;
    supabase().from("profiles").select("id, username").in("id", key.split(",")).then(({ data }) => {
      setNames(Object.fromEntries((data ?? []).map((p) => [p.id, `@${p.username}`])));
    });
  }, [key]);
  return names;
}

export const db = supabase;
