"use client";

import { Page, Table, when, db, useRows } from "./ui";

interface Entry { id: number; actor: string | null; action: string; target: string | null; details: Record<string, unknown>; created_at: string }

export function Audit() {
  const { rows } = useRows<Entry>(() => db().from("audit_log").select("*").order("created_at", { ascending: false }).limit(300));
  return (
    <Page title="Audit log" subtitle="Every sensitive admin change: prices, payments, refunds, claims, ads and coin adjustments.">
      <Table head={["When", "Action", "Target", "Details"]} empty={rows?.length === 0}>
        {(rows ?? []).map((e) => (
          <tr key={e.id} className="align-top">
            <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{when(e.created_at)}</td>
            <td className="px-3 py-2.5 font-bold">{e.action}</td>
            <td className="px-3 py-2.5 text-xs">{e.target}</td>
            <td className="px-3 py-2.5 text-xs font-mono text-slate-500 break-all max-w-md">{JSON.stringify(e.details)}</td>
          </tr>
        ))}
      </Table>
    </Page>
  );
}
