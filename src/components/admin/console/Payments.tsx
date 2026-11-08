"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Page, Table, Badge, Button, aed, when, act, db, useRows, useNames, Card, Stat } from "./ui";
import { Pagination } from "./Pagination";

interface Payment {
  id: string;
  user_id: string;
  purpose: string;
  description: string;
  amount_aed: number;
  status: string;
  provider: string | null;
  provider_ref: string | null;
  created_at: string;
  paid_at: string | null;
}

const PURPOSE_LABELS: Record<string, string> = {
  all: "All Streams",
  coins: "Virtual AED Sales",
  venue_subscription: "Venue Subscriptions",
  ad_campaign: "Advertising Campaigns",
};

export function Payments() {
  const [filter, setFilter] = useState("all");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { rows, reload } = useRows<Payment>(() => {
    return db().from("payments").select("*").order("created_at", { ascending: false }).limit(500);
  }, []);

  const names = useNames((rows ?? []).map((r) => r.user_id));
  const [msg, setMsg] = useState<string | null>(null);

  // Financial KPIs computed over all payments
  const metrics = useMemo(() => {
    if (!rows || rows.length === 0) {
      return { totalPaid: 0, pendingCount: 0, pendingAmount: 0, refundedTotal: 0, successRate: 0 };
    }
    const paid = rows.filter((r) => r.status === "paid");
    const totalPaid = paid.reduce((acc, r) => acc + (Number(r.amount_aed) || 0), 0);
    const pending = rows.filter((r) => r.status === "requires_payment" || r.status === "processing");
    const pendingAmount = pending.reduce((acc, r) => acc + (Number(r.amount_aed) || 0), 0);
    const refunded = rows.filter((r) => r.status === "refunded");
    const refundedTotal = refunded.reduce((acc, r) => acc + (Number(r.amount_aed) || 0), 0);
    const closed = rows.filter((r) => r.status === "paid" || r.status === "failed" || r.status === "cancelled");
    const successRate = closed.length ? Math.round((paid.length / closed.length) * 100) : 100;
    return {
      totalPaid,
      pendingCount: pending.length,
      pendingAmount,
      refundedTotal,
      successRate,
    };
  }, [rows]);

  // Filtering
  const filteredRows = useMemo(() => {
    if (!rows) return [];
    let list = rows;
    if (filter !== "all") {
      list = list.filter((r) => r.status === filter);
    }
    if (purposeFilter !== "all") {
      list = list.filter((r) => r.purpose === purposeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => {
        const citizen = (names[r.user_id] ?? "").toLowerCase();
        const desc = (r.description ?? "").toLowerCase();
        const ref = (r.provider_ref ?? "").toLowerCase();
        return citizen.includes(q) || desc.includes(q) || ref.includes(q) || r.id.toLowerCase().includes(q);
      });
    }
    return list;
  }, [rows, filter, purposeFilter, search, names]);

  // Paginated slice
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Export to CSV
  const exportCSV = () => {
    if (!filteredRows.length) return;
    const headers = [
      "Payment ID",
      "Created At",
      "Citizen ID",
      "Citizen Handle",
      "Description",
      "Purpose",
      "Amount AED",
      "Status",
      "Provider",
      "Provider Reference",
      "Paid At",
    ];
    const csvRows = [headers.join(",")];
    filteredRows.forEach((p) => {
      const values = [
        `"${p.id}"`,
        `"${p.created_at}"`,
        `"${p.user_id}"`,
        `"${names[p.user_id] ?? ""}"`,
        `"${p.description.replace(/"/g, '""')}"`,
        `"${p.purpose}"`,
        p.amount_aed,
        `"${p.status}"`,
        `"${p.provider ?? ""}"`,
        `"${p.provider_ref ?? ""}"`,
        `"${p.paid_at ?? ""}"`,
      ];
      csvRows.push(values.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dubai_life_payments_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const markPaid = async (p: Payment) => {
    const ref = prompt(
      `Confirm payment received for "${p.description}" (${aed(p.amount_aed)}).\nEnter the bank / gateway reference:`
    );
    if (ref === null) return;
    setMsg(
      (await act(() =>
        db().rpc("admin_mark_paid", {
          p_payment: p.id,
          p_provider: "manual",
          p_provider_ref: ref,
        })
      )) ?? "Marked paid and fulfilled."
    );
    reload();
  };

  const refund = async (p: Payment) => {
    const note = prompt(`Refund ${aed(p.amount_aed)} for "${p.description}"? Reason:`);
    if (!note) return;
    setMsg(
      (await act(() => db().rpc("admin_refund", { p_payment: p.id, p_note: note }))) ??
        "Refunded. Remember to return the money through the gateway."
    );
    reload();
  };

  return (
    <Page
      title="Payments & Revenue Orders"
      subtitle="Complete real-money transactions ledger in AED (virtual AED purchases, venue subscriptions, advertising)."
      actions={
        <button
          type="button"
          onClick={exportCSV}
          disabled={!filteredRows.length}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Export CSV</span>
        </button>
      }
    >
      {/* Financial Health KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Total Revenue (Paid)"
          value={aed(metrics.totalPaid)}
          tone="emerald"
          hint={`${metrics.successRate}% completion rate`}
        />
        <Stat
          label="Pending Checkout"
          value={metrics.pendingCount}
          tone="amber"
          hint={aed(metrics.pendingAmount)}
        />
        <Stat
          label="Refunded Volume"
          value={aed(metrics.refundedTotal)}
          tone="rose"
          hint="Processed refunds"
        />
        <Stat
          label="Transactions Count"
          value={(rows?.length ?? 0).toLocaleString()}
          tone="slate"
          hint="All time orders logged"
        />
      </div>

      {/* Filter Toolbar */}
      <Card className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by citizen handle, description, or reference code..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={purposeFilter}
              onChange={(e) => {
                setPurposeFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {Object.entries(PURPOSE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {["all", "paid", "requires_payment", "processing", "refunded", "failed", "cancelled"].map(
                (s) => (
                  <option key={s} value={s}>
                    Status: {s.replace(/_/g, " ")}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </Card>

      {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}

      {/* Transactions Table */}
      <Table
        head={["When", "Citizen", "Stream / Item", "Amount", "Status", "Reference", ""]}
        empty={filteredRows.length === 0}
      >
        {paginatedRows.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
            <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500 font-mono">
              {when(p.created_at)}
            </td>
            <td className="px-3 py-2.5">
              <span className="font-bold text-slate-900">
                {names[p.user_id] ?? p.user_id.slice(0, 8)}
              </span>
            </td>
            <td className="px-3 py-2.5">
              <div className="font-semibold text-slate-900">{p.description}</div>
              <span className="text-[10px] text-slate-400 capitalize">{p.purpose.replace(/_/g, " ")}</span>
            </td>
            <td className="px-3 py-2.5 font-bold whitespace-nowrap text-slate-900 font-mono">
              {aed(p.amount_aed)}
            </td>
            <td className="px-3 py-2.5">
              <Badge status={p.status} />
            </td>
            <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">
              {p.provider ? `${p.provider}: ${p.provider_ref ?? "—"}` : "—"}
            </td>
            <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
              {p.status === "requires_payment" && (
                <Button onClick={() => markPaid(p)}>Mark paid</Button>
              )}
              {p.status === "paid" && (
                <Button tone="danger" onClick={() => refund(p)}>
                  Refund
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {/* Pagination Bar */}
      {filteredRows.length > 0 && (
        <Pagination
          currentPage={page}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </Page>
  );
}
