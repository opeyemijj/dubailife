"use client";

// Food delivery, the fast-food chains' own apps, and groceries (src/data/phone/apps.json). Pick a store,
// fill the basket, pay from your wallet, and watch the rider come; the food feeds you when it lands.

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCitizen, type NeedKey } from "@/lib/citizenStore";
import { placeOrder, useOrders } from "@/lib/phoneOrders";
import APPS from "@/data/phone/apps.json";
import { AppScreen, aed, Big, Card, Note } from "./AppScreen";

type Item = { id: string; name: string; icon: string; price: number; need?: NeedKey; amount?: number; stock?: string; qty?: number };
type Store = { id: string; name: string; icon: string; bg: string; kind: string; items: Item[] };

const FOOD: Store[] = APPS.delivery.stores.map((s) => ({ ...s, items: s.menu.map((m) => ({ ...m, need: "hunger" as NeedKey, amount: m.hunger })) }));
const GROCERY: Store = { id: "daily-basket", name: APPS.grocery.app.name, icon: APPS.grocery.app.icon, bg: APPS.grocery.app.bg, kind: "Groceries for your kitchen", items: APPS.grocery.items as Item[] };

export const storeById = (id: string) => FOOD.find((s) => s.id === id);

export function DeliveryApp({ onBack, mode, storeId }: { onBack: () => void; mode: "food" | "grocery"; storeId?: string }) {
  const cfg = mode === "food" ? APPS.delivery : APPS.grocery;
  const [store, setStore] = useState<Store | null>(mode === "grocery" ? GROCERY : storeId ? storeById(storeId) ?? null : null);
  const title = storeId && store ? store.name : cfg.app.name;
  const back = () => (store && !storeId && mode === "food" ? setStore(null) : onBack());

  return (
    <AppScreen title={title} onBack={back} accent={mode === "food" ? "text-orange-600" : "text-amber-600"}>
      <Tracking />
      {store ? <Menu store={store} fee={cfg.deliveryFee} minutes={cfg.minutes} seconds={cfg.seconds} /> : (
        <>
          <p className="text-slate-500 px-1">{cfg.app.tagline} · delivery {aed(cfg.deliveryFee)}</p>
          {FOOD.map((s) => (
            <button key={s.id} onClick={() => setStore(s)} className="w-full flex items-center gap-3 p-3 rounded-[24px] bg-slate-100/80 text-left active:scale-[0.98] transition-transform">
              <span className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.bg} flex items-center justify-center text-3xl shrink-0`}>{s.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold">{s.name}</span>
                <span className="block text-slate-500">{s.kind} · {cfg.minutes[0]}–{cfg.minutes[1]} min</span>
              </span>
              <span className="text-slate-400 text-2xl">›</span>
            </button>
          ))}
        </>
      )}
    </AppScreen>
  );
}

function Menu({ store, fee, minutes, seconds }: { store: Store; fee: number; minutes: number[]; seconds: number }) {
  const { citizen } = useCitizen();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const lines = store.items.filter((i) => cart[i.id]);
  const subtotal = lines.reduce((s, i) => s + i.price * cart[i.id], 0);
  const total = subtotal + (subtotal ? fee : 0);
  const add = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(9, (c[id] ?? 0) + d)) }));

  const order = () => {
    const feeds = new Map<NeedKey, number>();
    const stock: Record<string, number> = {};
    for (const i of lines) {
      if (i.stock) stock[i.stock] = (stock[i.stock] ?? 0) + (i.qty ?? 1) * cart[i.id];
      else if (i.need) feeds.set(i.need, Math.min(100, (feeds.get(i.need) ?? 0) + (i.amount ?? 0) * cart[i.id]));
    }
    const ok = placeOrder({ store: store.name, icon: store.icon, total, minutes, feeds: [...feeds].map(([need, amount]) => ({ need, amount })), stock: Object.keys(stock).length ? stock : undefined, meal: lines.some((i) => i.need === "hunger") }, seconds);
    if (!ok) return setNote({ ok: false, text: "Not enough AED in your wallet." });
    setCart({});
    setNote({ ok: true, text: `Order placed with ${store.name}. Your rider is on the way.` });
  };

  return (
    <>
      <div className={`rounded-[28px] bg-gradient-to-br ${store.bg} text-white p-5 flex items-center gap-4`}>
        <span className="text-5xl">{store.icon}</span>
        <div><p className="text-2xl font-black">{store.name}</p><p className="text-white/85">{store.kind} · {minutes[0]}–{minutes[1]} min · {aed(fee)} delivery</p></div>
      </div>
      {note && <Note ok={note.ok}>{note.text}</Note>}
      {store.items.map((i) => (
        <div key={i.id} className="flex items-center gap-3 p-3 rounded-[22px] bg-slate-100/80">
          <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shrink-0">{i.icon}</span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold leading-tight">{i.name}</span>
            <span className="block text-sm text-slate-500">{aed(i.price)} · {i.stock ? `${i.qty} for your pantry` : `${i.need} +${i.amount}`}</span>
          </span>
          {cart[i.id] ? (
            <span className="flex items-center gap-2">
              <button onClick={() => add(i.id, -1)} aria-label={`One less ${i.name}`} className="w-9 h-9 rounded-full bg-white flex items-center justify-center"><Minus className="w-4 h-4" /></button>
              <span className="w-4 text-center font-black">{cart[i.id]}</span>
              <button onClick={() => add(i.id, 1)} aria-label={`One more ${i.name}`} className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center"><Plus className="w-4 h-4" /></button>
            </span>
          ) : <button onClick={() => add(i.id, 1)} className="h-9 px-4 rounded-full bg-white font-semibold">Add</button>}
        </div>
      ))}
      {subtotal > 0 && (
        <Card className="sticky bottom-0 bg-white border border-slate-200 shadow-lg">
          <div className="flex justify-between text-slate-600"><span>Items</span><span>{aed(subtotal)}</span></div>
          <div className="flex justify-between text-slate-600"><span>Delivery</span><span>{aed(fee)}</span></div>
          <div className="flex justify-between font-black text-lg"><span>Total</span><span>{aed(total)}</span></div>
          <Big onClick={order} disabled={(citizen?.balance ?? 0) < total}>Place order · {aed(total)}</Big>
        </Card>
      )}
    </>
  );
}

/** Orders on their way, with a live countdown. */
function Tracking() {
  const orders = useOrders();
  const [now, setNow] = useState(() => Date.now());
  const live = orders.filter((o) => !o.delivered);
  useEffect(() => {
    if (!live.length) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [live.length]);
  return live.map((o) => {
    const k = Math.min(1, (now - o.placedAt) / (o.arriveAt - o.placedAt));
    const stage = k < 0.35 ? "Preparing your order" : k < 0.95 ? "Rider on the way 🛵" : "Arriving now";
    return (
      <Card key={o.id} className="bg-orange-50">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{o.icon}</span>
          <div className="flex-1"><p className="font-semibold">{o.store} · {stage}</p><p className="text-sm text-slate-500">Arrives in about {Math.max(1, Math.round(o.eta * (1 - k)))} min</p></div>
        </div>
        <div className="h-2 rounded-full bg-white overflow-hidden"><div className="h-full bg-orange-500 transition-all" style={{ width: `${k * 100}%` }} /></div>
      </Card>
    );
  });
}
