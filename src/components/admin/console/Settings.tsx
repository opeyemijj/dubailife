"use client";

import { useEffect, useState } from "react";
import { Page, Card, Button, act, db, when } from "./ui";

interface Setting { key: string; value: unknown; updated_at: string }

const HELP: Record<string, string> = {
  venue_subscription: "Monthly price per venue (AED), what's included and the terms shown to businesses.",
  coin_packages: "D-Coin packs sold for real money: coins, bonus coins, AED price and an optional tag.",
  billboard: "Billboard ads: ad slots per billboard (carousel), price per week (AED) and the longest campaign.",
  features: "Switch monetisation features on or off without a release.",
  limits: "Anti-abuse limits on D-Coins: biggest single in-game credit, daily earning cap and daily sending cap.",
};

export function Settings() {
  const [rows, setRows] = useState<Setting[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const load = () => db().from("app_settings").select("key, value, updated_at").order("key").then(({ data }) => {
    setRows((data as Setting[]) ?? []);
    setDrafts(Object.fromEntries((data ?? []).map((s) => [s.key, JSON.stringify(s.value, null, 2)])));
  });
  useEffect(() => { void load(); }, []);

  const save = async (key: string) => {
    let value: unknown;
    try { value = JSON.parse(drafts[key]); } catch { setMsg({ ...msg, [key]: "That isn't valid JSON." }); return; }
    const error = await act(() => db().rpc("admin_set_setting", { p_key: key, p_value: value }));
    setMsg({ ...msg, [key]: error ?? "Saved — live now." });
    if (!error) void load();
  };

  return (
    <Page title="Prices & features" subtitle="Changes apply immediately, no deployment needed, and are recorded in the audit log.">
      {(rows ?? []).map((s) => (
        <Card key={s.key} title={s.key.replace(/_/g, " ")}>
          <p className="text-xs text-slate-500 mb-2">{HELP[s.key]}</p>
          <textarea value={drafts[s.key] ?? ""} onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })} spellCheck={false} rows={Math.min(16, (drafts[s.key] ?? "").split("\n").length + 1)}
            className="w-full font-mono text-xs rounded-xl border border-slate-200 bg-slate-50 p-3" />
          <div className="flex items-center gap-3 mt-2">
            <Button onClick={() => save(s.key)}>Save</Button>
            <span className="text-xs text-slate-400">Last changed {when(s.updated_at)}</span>
            {msg[s.key] && <span className="text-xs font-bold text-emerald-700">{msg[s.key]}</span>}
          </div>
        </Card>
      ))}
    </Page>
  );
}
