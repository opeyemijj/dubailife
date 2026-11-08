"use client";

import { Fragment, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Page, Table, Button, coins, when, act, db, useRows, Card, Stat } from "./ui";
import { Pagination } from "./Pagination";

interface Citizen {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  balance: number;
  created_at: string;
  last_sign_in_at: string | null;
  finished: boolean;
  is_admin: boolean;
}

interface Line {
  id: number;
  delta: number;
  balance_after: number;
  kind: string;
  reason: string | null;
  created_at: string;
}

type FilterTab = "all" | "finished" | "unfinished" | "active7d" | "whales";
type SortOption = "newest" | "oldest" | "balance_desc" | "recent_login";

export function Citizens() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { rows, reload } = useRows<Citizen>(
    () => db().rpc("admin_list_citizens", { p_query: q.trim().replace(/[%,]/g, ""), p_limit: 500 }),
    [q]
  );

  const [openLedgerId, setOpenLedgerId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Filter out admin users: only genuine players/citizens appear in this list
  const citizenRows = useMemo(() => {
    return (rows ?? []).filter((r) => !r.is_admin);
  }, [rows]);

  // Growth & Population Stats computed from genuine citizens (excluding admins)
  const stats = useMemo(() => {
    if (!citizenRows || citizenRows.length === 0) {
      return { total: 0, finished: 0, rate: 0, totalCoins: 0, active7d: 0 };
    }
    const total = citizenRows.length;
    const finished = citizenRows.filter((r) => r.finished).length;
    const rate = total > 0 ? Math.round((finished / total) * 100) : 0;
    const totalCoins = citizenRows.reduce((acc, r) => acc + (Number(r.balance) || 0), 0);
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const active7d = citizenRows.filter(
      (r) => r.last_sign_in_at && new Date(r.last_sign_in_at).getTime() >= sevenDaysAgo
    ).length;
    return { total, finished, rate, totalCoins, active7d };
  }, [citizenRows]);

  // Filter & Sort
  const filteredRows = useMemo(() => {
    let list = [...citizenRows];
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;

    switch (tab) {
      case "finished":
        list = list.filter((r) => r.finished);
        break;
      case "unfinished":
        list = list.filter((r) => !r.finished);
        break;
      case "active7d":
        list = list.filter(
          (r) => r.last_sign_in_at && new Date(r.last_sign_in_at).getTime() >= sevenDaysAgo
        );
        break;
      case "whales":
        list = list.filter((r) => (Number(r.balance) || 0) > 10000);
        break;
      default:
        break;
    }

    list.sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sort === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sort === "balance_desc") {
        return (Number(b.balance) || 0) - (Number(a.balance) || 0);
      }
      if (sort === "recent_login") {
        const timeA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
        const timeB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
        return timeB - timeA;
      }
      return 0;
    });

    return list;
  }, [citizenRows, tab, sort]);

  // Paginated slice
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Export to CSV for growth analytics
  const exportCSV = () => {
    if (!filteredRows.length) return;
    const headers = [
      "User ID",
      "Username",
      "Display Name",
      "Email",
      "Virtual AED Balance",
      "Onboarding Finished",
      "Joined Date",
      "Last Login Date",
    ];
    const csvRows = [headers.join(",")];
    filteredRows.forEach((r) => {
      const values = [
        `"${r.id}"`,
        `"${r.username ?? ""}"`,
        `"${(r.display_name ?? "").replace(/"/g, '""')}"`,
        `"${r.email}"`,
        r.balance || 0,
        r.finished ? "true" : "false",
        `"${r.created_at}"`,
        `"${r.last_sign_in_at ?? ""}"`,
      ];
      csvRows.push(values.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dubai_life_citizens_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const adjust = async (c: Citizen) => {
    const amount = prompt(`Adjust @${c.username}'s virtual AED (use a minus sign to remove):`);
    if (!amount || !Number(amount)) return;
    const reason = prompt("Reason (kept in the audit log):");
    if (!reason) return;
    setMsg(
      (await act(() =>
        db().rpc("admin_adjust_coins", {
          p_user: c.id,
          p_delta: Math.trunc(Number(amount)),
          p_reason: reason,
        })
      )) ?? "Adjusted."
    );
    reload();
  };

  // Asks once, in a small modal, before deleting.
  const [confirming, setConfirming] = useState<Citizen | null>(null);
  const [deleting, setDeleting] = useState(false);
  const remove = async (c: Citizen) => {
    setDeleting(true);
    const who = c.username ? `@${c.username}` : c.email;
    setMsg((await act(() => db().rpc("admin_delete_citizen", { p_user: c.id }))) ?? `Deleted ${who}.`);
    setDeleting(false);
    setConfirming(null);
    reload();
  };

  return (
    <Page
      title="Citizens & Player Growth"
      subtitle="Complete player registry, cohort analytics, wallet inspection, and coin movements."
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
      {/* Confirmation Modal */}
      {confirming && (
        <div
          className="fixed inset-0 z-[200] bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !deleting && setConfirming(null)}
        >
          <div
            className="w-full max-w-sm bg-white text-slate-900 rounded-2xl shadow-2xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black">Are you sure?</h2>
            <p className="text-sm text-slate-600">
              Delete{" "}
              <b>{confirming.username ? `@${confirming.username}` : confirming.email}</b> and all
              their data — wallet, homes, messages and purchases. This can&apos;t be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                tone="secondary"
                className="flex-1 h-10"
                disabled={deleting}
                onClick={() => setConfirming(null)}
              >
                Cancel
              </Button>
              <Button
                tone="danger"
                className="flex-1 h-10"
                disabled={deleting}
                onClick={() => remove(confirming)}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Population & Funnel KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Total Registered"
          value={stats.total.toLocaleString()}
          tone="slate"
          hint={`${stats.finished} finished avatar`}
        />
        <Stat
          label="Onboarding Conversion"
          value={`${stats.rate}%`}
          tone="emerald"
          hint={`${stats.total - stats.finished} dropped off`}
        />
        <Stat
          label="Active (Last 7 Days)"
          value={stats.active7d.toLocaleString()}
          tone="sky"
          hint={`${Math.round((stats.active7d / (stats.total || 1)) * 100)}% weekly retention`}
        />
        <Stat
          label="In-Game Circulation"
          value={coins(stats.totalCoins)}
          tone="amber"
          hint="Sum of player wallets"
        />
      </div>

      {/* Search, Filter Tabs & Sort Controls */}
      <Card className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by @username, display name, or email..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="newest">Joined: Newest First</option>
              <option value="oldest">Joined: Oldest First</option>
              <option value="balance_desc">Highest Balance (Whales)</option>
              <option value="recent_login">Recently Active</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          {[
            { id: "all", label: "All Citizens", count: citizenRows.length },
            { id: "finished", label: "Finished Onboarding", count: stats.finished },
            { id: "unfinished", label: "Dropped Off", count: stats.total - stats.finished },
            { id: "active7d", label: "Active 7 Days", count: stats.active7d },
            {
              id: "whales",
              label: "High Wealth (>10k)",
              count: citizenRows.filter((r) => (Number(r.balance) || 0) > 10000).length,
            },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setTab(f.id as FilterTab);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                tab === f.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  tab === f.id ? "bg-white/20 text-white" : "bg-white text-slate-500"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}

      {/* Main Table */}
      <Table
        head={["Citizen", "Email", "Joined", "Last active", "Wallet", ""]}
        empty={filteredRows.length === 0}
      >
        {paginatedRows.map((c) => (
          <Fragment key={c.id}>
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="px-3 py-2.5">
                <div className="font-bold text-slate-900">{c.display_name ?? "—"}</div>
                {c.username ? <div className="text-xs text-sky-600 font-semibold">@{c.username}</div> : null}
                {!c.finished && (
                  <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                    Dropped off (no avatar)
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-slate-600 text-xs font-mono">{c.email}</td>
              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-xs">{when(c.created_at)}</td>
              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-xs">{when(c.last_sign_in_at)}</td>
              <td className="px-3 py-2.5 font-bold whitespace-nowrap">
                {c.finished ? (
                  <span className="text-emerald-700 font-mono">{coins(c.balance)}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                {c.finished && (
                  <Button
                    tone="secondary"
                    onClick={() => setOpenLedgerId(openLedgerId === c.id ? null : c.id)}
                  >
                    {openLedgerId === c.id ? "Hide" : "Ledger"}
                  </Button>
                )}
                {c.finished && <Button onClick={() => adjust(c)}>Adjust</Button>}
                <Button tone="danger" onClick={() => setConfirming(c)}>
                  Delete
                </Button>
              </td>
            </tr>
            {openLedgerId === c.id && (
              <tr>
                <td colSpan={6} className="bg-slate-50/90 px-4 py-3 border-y border-slate-200">
                  <Ledger user={c.id} />
                </td>
              </tr>
            )}
          </Fragment>
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

function Ledger({ user }: { user: string }) {
  const { rows } = useRows<Line>(
    () =>
      db()
        .from("coin_ledger")
        .select("id, delta, balance_after, kind, reason, created_at")
        .eq("user_id", user)
        .order("created_at", { ascending: false })
        .limit(50),
    [user]
  );
  if (!rows) return <p className="text-xs text-slate-400">Loading coin movements…</p>;
  if (!rows.length) return <p className="text-xs text-slate-400">No coin movements recorded yet.</p>;
  return (
    <div className="space-y-1.5 text-xs">
      <div className="font-bold text-slate-700 pb-1 border-b border-slate-200">
        Recent Coin Movements (Last 50 transactions)
      </div>
      {rows.map((l) => (
        <div key={l.id} className="flex flex-wrap items-center gap-3 py-0.5">
          <span className="w-28 text-slate-400 font-mono text-[11px]">{when(l.created_at)}</span>
          <span className="w-24 font-bold capitalize text-slate-700">{l.kind.replace("_", " ")}</span>
          <span
            className={`w-24 font-mono font-bold ${
              l.delta < 0 ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {l.delta > 0 ? "+" : ""}
            {l.delta.toLocaleString()}
          </span>
          <span className="w-28 font-mono text-slate-500">= {l.balance_after.toLocaleString()}</span>
          <span className="flex-1 text-slate-500 truncate">{l.reason}</span>
        </div>
      ))}
    </div>
  );
}
