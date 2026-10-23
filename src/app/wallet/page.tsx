"use client";

// Virtual AED: the in-world currency. Buy packs with real money (credited only once the payment is
// confirmed on the server), see pending orders and every coin in or out.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Coins, Receipt } from "lucide-react";
import { useRequireCitizen } from "@/lib/citizenStore";
import { supabase } from "@/lib/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";
import { Checkout } from "@/components/commerce/Checkout";
import { commerceError, formatAED, useSettings, type CoinPackage } from "@/lib/commerce";

interface Line { id: number; delta: number; balance_after: number; kind: string; reason: string | null; created_at: string }
interface Order { id: string; description: string; amount_aed: number; status: string; created_at: string }

const KIND: Record<string, string> = { purchase: "Bought", earn: "Earned", spend: "Spent", transfer_in: "Received", transfer_out: "Sent", grant: "Gift", admin: "Adjustment", refund: "Refund" };

export default function WalletPage() {
  const { citizen } = useRequireCitizen();
  const settings = useSettings();
  const [lines, setLines] = useState<Line[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [buying, setBuying] = useState<CoinPackage | null>(null);
  const [tick, setTick] = useState(0);
  const me = citizen?.id;

  useEffect(() => {
    if (!me) return;
    const db = supabase();
    db.from("coin_ledger").select("id, delta, balance_after, kind, reason, created_at").eq("user_id", me).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setLines((data as Line[]) ?? []));
    db.from("payments").select("id, description, amount_aed, status, created_at").eq("user_id", me).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, [me, tick]);

  const packs = settings?.coin_packages ?? [];
  const enabled = settings?.features.coin_purchases !== false;

  return (
    <main className="relative min-h-[100dvh] bg-zinc-950 text-white pb-28">
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-amber-500/15 to-transparent pointer-events-none" />
      <div className="relative max-w-md mx-auto px-4 pt-6 space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/explore" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Back to the map"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-2xl font-black">Wallet</h1>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 p-5 shadow-xl">
          <div className="text-xs font-black uppercase tracking-wider opacity-70">Virtual AED · in-game money</div>
          <div className="mt-1 text-4xl font-black flex items-center gap-2"><Coins className="w-8 h-8" /> {(citizen?.balance ?? 0).toLocaleString()}</div>
          <p className="mt-2 text-xs font-bold opacity-75">Spend it on shopping, food, homes, furniture and gifts around Dubai. Virtual AED can&apos;t be cashed out.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-white/80">Get virtual AED</h2>
          {!enabled && <p className="text-sm text-white/50">Coin packs are paused right now.</p>}
          <div className="grid grid-cols-2 gap-3">
            {packs.map((p) => (
              <button key={p.id} disabled={!enabled} onClick={() => setBuying(p)} className="relative text-left rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 p-4 disabled:opacity-50 transition-colors">
                {p.tag && <span className="absolute -top-2 right-3 text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">{p.tag}</span>}
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Virtual AED</div>
                <div className="text-xl font-black">{p.coins.toLocaleString()}</div>
                {p.bonus > 0 && <div className="text-xs font-bold text-emerald-400">+{p.bonus.toLocaleString()} bonus</div>}
                <div className="mt-2 text-sm font-black text-amber-300">Pay {formatAED(p.price_aed)}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/40">Paid with real money. Your virtual AED arrives once payment is confirmed. Digital items are non-refundable once used; unused purchases can be refunded within 14 days by contacting billing@mydubailife.app.</p>
        </section>

        {orders.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-black text-white/80 flex items-center gap-2"><Receipt className="w-4 h-4" /> Orders & receipts</h2>
            {orders.map((o) => (
              <div key={o.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{o.description}</div>
                  <div className="text-[11px] text-white/40">{new Date(o.created_at).toLocaleString()} · #{o.id.slice(0, 8)}</div>
                </div>
                <div className="text-right">
                  <div className="font-black">{formatAED(Number(o.amount_aed))}</div>
                  <div className={`text-[11px] font-bold ${o.status === "paid" ? "text-emerald-400" : o.status === "requires_payment" ? "text-amber-300" : "text-white/50"}`}>{o.status === "requires_payment" ? "Awaiting payment" : o.status}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-black text-white/80">History</h2>
          {lines === null ? <p className="text-sm text-white/40">Loading…</p> : lines.length === 0 ? <p className="text-sm text-white/40">No coin movements recorded yet.</p> : (
            <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{KIND[l.kind] ?? l.kind}{l.reason ? <span className="font-normal text-white/50"> · {l.reason}</span> : null}</div>
                    <div className="text-[11px] text-white/40">{new Date(l.created_at).toLocaleString()}</div>
                  </div>
                  <div className={`font-mono font-black ${l.delta < 0 ? "text-rose-300" : "text-emerald-400"}`}>{l.delta > 0 ? "+" : ""}{l.delta.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {buying && (
        <Checkout
          title="Buy virtual AED"
          amount={buying.price_aed}
          lines={[
            { label: "Virtual AED", value: buying.coins.toLocaleString() },
            ...(buying.bonus ? [{ label: "Bonus", value: `+${buying.bonus.toLocaleString()}` }] : []),
            { label: "You'll receive", value: `${(buying.coins + buying.bonus).toLocaleString()} virtual AED` },
          ]}
          note="Virtual AED is game money for use inside Dubai Life only. It has no cash value and can't be exchanged back for real money."
          onConfirm={async () => {
            const { error } = await supabase().rpc("create_coin_payment", { p_package: buying.id });
            return error ? commerceError(error.message) : null;
          }}
          onClose={() => { setBuying(null); setTick((t) => t + 1); }}
        />
      )}
      <BottomNav />
    </main>
  );
}
