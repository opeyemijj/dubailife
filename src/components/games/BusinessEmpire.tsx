"use client";

// Business Empire: a property-trading and business game over 10 rounds. On your turn, buy property and
// businesses from the market, sell what you own back at today's price, or upgrade a business. When
// everyone has played, the round ends: property pays rent, businesses pay profit, and the round's news
// (announced at its start) moves prices and profits. Highest net worth after 10 rounds wins.

import type { BoardProps, GameModule } from "./types";

type Sector = "residential" | "commercial" | "food" | "lifestyle" | "hospitality" | "mobility" | "tech";
interface Asset { name: string; icon: string; kind: "property" | "business"; sector: Sector; base: number; yield?: number; income?: number }

const ASSETS: Asset[] = [
  { name: "JVC studio", icon: "🏢", kind: "property", sector: "residential", base: 300_000, yield: 0.07 },
  { name: "Dubai Marina 1-bed", icon: "🌊", kind: "property", sector: "residential", base: 650_000, yield: 0.06 },
  { name: "Dubai Hills villa", icon: "🏡", kind: "property", sector: "residential", base: 900_000, yield: 0.05 },
  { name: "Business Bay office", icon: "🏬", kind: "property", sector: "commercial", base: 500_000, yield: 0.07 },
  { name: "JLT retail unit", icon: "🛍️", kind: "property", sector: "commercial", base: 350_000, yield: 0.08 },
  { name: "Al Quoz warehouse", icon: "🏭", kind: "property", sector: "commercial", base: 400_000, yield: 0.09 },
  { name: "Karak tea café", icon: "☕", kind: "business", sector: "food", base: 120_000, income: 22_000 },
  { name: "Shawarma food truck", icon: "🚚", kind: "business", sector: "food", base: 80_000, income: 15_000 },
  { name: "Fitness studio", icon: "🏋️", kind: "business", sector: "lifestyle", base: 250_000, income: 38_000 },
  { name: "Beach club", icon: "🏖️", kind: "business", sector: "hospitality", base: 600_000, income: 85_000 },
  { name: "Luxury car rental", icon: "🏎️", kind: "business", sector: "mobility", base: 300_000, income: 48_000 },
  { name: "AI start-up", icon: "🤖", kind: "business", sector: "tech", base: 200_000, income: 40_000 },
];

interface News { title: string; text: string; value?: Partial<Record<Sector, number>>; income?: Partial<Record<Sector, number>> }
const NEWS: News[] = [
  { title: "Expo crowds are back", text: "Hospitality and food profits ×1.5; the beach club gains value.", income: { hospitality: 1.5, food: 1.5 }, value: { hospitality: 1.1 } },
  { title: "New metro line announced", text: "Homes near the new stations: residential prices +12%.", value: { residential: 1.12 } },
  { title: "Interest rates up", text: "Mortgages cost more: all property −8%.", value: { residential: 0.92, commercial: 0.92 } },
  { title: "Tech boom", text: "Investors pile in: AI start-up profits ×2 and value +25%.", income: { tech: 2 }, value: { tech: 1.25 } },
  { title: "Summer heat", text: "Tourists stay away: hospitality profits ×0.6.", income: { hospitality: 0.6 } },
  { title: "Golden visa rush", text: "Residential +15%, commercial +5%.", value: { residential: 1.15, commercial: 1.05 } },
  { title: "Fuel prices up", text: "Car rental profits ×0.7.", income: { mobility: 0.7 } },
  { title: "Ramadan nights", text: "Iftars and suhoors: food profits ×1.6.", income: { food: 1.6 } },
  { title: "Office demand surges", text: "Companies move in: commercial property +12%.", value: { commercial: 1.12 } },
  { title: "Fitness craze", text: "Dubai Fitness Challenge: fitness studio profits ×1.8.", income: { lifestyle: 1.8 } },
  { title: "Quiet week", text: "Prices drift; nothing big happening.", },
];

const ROUNDS = 10;
const START_CASH = 1_000_000;
const FEE = 0.02;

interface Holding { owner: number | null; level: number; price: number; last: number; paid: number }

export interface TradingState {
  cash: number[];
  market: Holding[];
  turn: number;
  round: number;
  news: number;
  /** Assets sold this turn (can't be bought straight back). */
  sold: number[];
  log: string[];
  winner: number | null;
  scores: number[] | null;
}

const rand = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function init(seats: number, seed: number): TradingState {
  const r = rand(seed || 1);
  return {
    cash: Array(seats).fill(START_CASH),
    market: ASSETS.map((a) => { const p = Math.round(a.base * (0.92 + r() * 0.16) / 1000) * 1000; return { owner: null, level: 0, price: p, last: p, paid: 0 }; }),
    turn: 0, round: 1, news: Math.floor(r() * NEWS.length), sold: [], log: ["Everyone starts with AED 1,000,000."], winner: null, scores: null,
  };
}

const fmt = (n: number) => (Math.abs(n) >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : `AED ${Math.round(n / 1000).toLocaleString()}k`);
const upgradeCost = (i: number) => Math.round(ASSETS[i].base * 0.5);
/** Expected earnings per round at today's prices (before news). */
export function earning(s: TradingState, i: number) {
  const a = ASSETS[i], h = s.market[i];
  return a.kind === "property" ? h.price * a.yield! : a.income! * 1.5 ** h.level;
}
export const worth = (s: TradingState, seat: number) => s.cash[seat] + s.market.reduce((t, h) => (h.owner === seat ? t + h.price : t), 0);
const log = (s: TradingState, line: string): TradingState => ({ ...s, log: [line, ...s.log].slice(0, 6) });
const fill = (line: string, names: string[]) => line.replace(/\{(\d)\}/g, (_, d) => names[Number(d)] ?? "Someone");

function buy(s: TradingState, i: number): TradingState {
  const h = s.market[i], p = s.turn;
  if (h.owner !== null || s.cash[p] < h.price || s.sold.includes(i)) return s;
  const cash = [...s.cash]; cash[p] -= h.price;
  const market = s.market.map((x, j) => (j === i ? { ...x, owner: p, paid: x.price } : x));
  return log({ ...s, cash, market }, `{${p}} bought the ${ASSETS[i].name} for ${fmt(h.price)}.`);
}

function sell(s: TradingState, i: number): TradingState {
  const h = s.market[i], p = s.turn;
  if (h.owner !== p) return s;
  const got = Math.round(h.price * (1 - FEE));
  const cash = [...s.cash]; cash[p] += got;
  const market = s.market.map((x, j) => (j === i ? { ...x, owner: null, level: 0, paid: 0 } : x));
  return log({ ...s, cash, market, sold: [...s.sold, i] }, `{${p}} sold the ${ASSETS[i].name} for ${fmt(got)} (${got >= h.paid ? "+" : "−"}${fmt(Math.abs(got - h.paid))}).`);
}

function upgrade(s: TradingState, i: number): TradingState {
  const h = s.market[i], p = s.turn, cost = upgradeCost(i);
  if (h.owner !== p || ASSETS[i].kind !== "business" || h.level >= 2 || s.cash[p] < cost) return s;
  const cash = [...s.cash]; cash[p] -= cost;
  const market = s.market.map((x, j) => (j === i ? { ...x, level: x.level + 1, price: x.price + Math.round(ASSETS[i].base * 0.4), paid: x.paid + cost } : x));
  return log({ ...s, cash, market }, `{${p}} upgraded the ${ASSETS[i].name} to level ${h.level + 2}.`);
}

/** Ends a turn; after the last player, the round closes: income, news, new prices. */
function endTurn(s0: TradingState): TradingState {
  const n = s0.cash.length;
  const next = (s0.turn + 1) % n;
  if (next !== 0) return { ...s0, turn: next, sold: [] };
  const r = rand(s0.round * 7919 + s0.market.reduce((t, h) => t + h.price, 0) % 100_000);
  const news = NEWS[s0.news];
  const cash = [...s0.cash];
  const lines: string[] = [];
  const market = s0.market.map((h, i) => {
    const a = ASSETS[i];
    if (h.owner !== null) {
      const swing = a.sector === "tech" ? r() * 1.8 : 0.85 + r() * 0.3;
      const got = Math.round(earning(s0, i) * (a.kind === "business" ? swing * (news.income?.[a.sector] ?? 1) : 1));
      cash[h.owner] += got;
    }
    const drift = 0.96 + r() * 0.08;
    const price = Math.round((h.price * drift * (news.value?.[a.sector] ?? 1)) / 1000) * 1000;
    return { ...h, last: h.price, price };
  });
  for (let seat = 0; seat < n; seat++) {
    const gained = cash[seat] - s0.cash[seat];
    if (gained > 0) lines.push(`{${seat}} earned ${fmt(gained)}`);
  }
  let s: TradingState = { ...s0, cash, market, turn: 0, sold: [], round: s0.round + 1, news: Math.floor(r() * NEWS.length) };
  s = log(s, `📰 Round ${s0.round} closed · ${news.title}. ${lines.join(" · ") || "No income this round."}`);
  if (s.round > ROUNDS) {
    // Scores are net worth in thousands of AED (saved scores are capped at 100,000).
    const scores = cash.map((_, seat) => Math.round(worth(s, seat) / 1000));
    const best = Math.max(...scores);
    return { ...s, round: ROUNDS, scores, winner: scores.indexOf(best) };
  }
  return s;
}

/** One step for the computer: take a big profit, else buy the best earner it can afford, else upgrade, else end its turn. */
function ai(s: TradingState, seat: number): TradingState {
  const mine = s.market.map((h, i) => (h.owner === seat ? i : -1)).filter((i) => i >= 0);
  const flip = mine.find((i) => s.market[i].price >= s.market[i].paid * 1.25 && s.round < ROUNDS);
  if (flip !== undefined) return sell(s, flip);
  const reserve = 60_000;
  const options = s.market.map((h, i) => ({ i, h })).filter(({ h, i }) => h.owner === null && !s.sold.includes(i) && s.cash[seat] - h.price >= reserve)
    .sort((a, b) => earning(s, b.i) / b.h.price - earning(s, a.i) / a.h.price);
  if (options.length && s.round < ROUNDS) return buy(s, options[0].i);
  const up = mine.find((i) => ASSETS[i].kind === "business" && s.market[i].level < 2 && s.cash[seat] - upgradeCost(i) >= reserve && s.round <= ROUNDS - 2);
  if (up !== undefined) return upgrade(s, up);
  return endTurn(s);
}

const turnOf = (s: TradingState) => (s.winner === null ? s.turn : null);
const result = (s: TradingState) => (s.winner === null ? null : { winners: [s.winner], scores: s.scores ?? undefined });

const SECTOR_TINT: Record<Sector, string> = { residential: "#0ea5e9", commercial: "#6366f1", food: "#f97316", lifestyle: "#ec4899", hospitality: "#14b8a6", mobility: "#ef4444", tech: "#8b5cf6" };

function Board({ state, me, seats, onMove, canMove }: BoardProps<TradingState>) {
  const shown = seats.map((x, i) => (i === me ? "You" : x.name));
  const myTurn = canMove && state.turn === me && state.winner === null;
  const news = NEWS[state.news];
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-3 sm:p-4 flex items-center gap-3">
        <span className="text-3xl">📰</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-black uppercase tracking-widest text-blue-200">Round {state.round} of {ROUNDS} · this round&apos;s news</div>
          <div className="font-black">{news.title}</div>
          <div className="text-xs text-blue-100">{news.text}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {state.cash.map((c, s) => (
          <div key={s} className={`rounded-xl px-3 py-2 text-xs font-bold border-2 ${state.turn === s ? "border-blue-600 bg-white" : "border-transparent bg-slate-100"}`}>
            {shown[s]}
            <div className="font-mono text-sm text-slate-900">{fmt(c)} cash</div>
            <div className="text-[11px] text-slate-500">Net worth {fmt(worth(state, s))}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {state.market.map((h, i) => {
          const a = ASSETS[i];
          const change = h.last ? (h.price - h.last) / h.last : 0;
          const mine = h.owner === me;
          return (
            <div key={i} className={`rounded-2xl border p-3 flex gap-3 items-center ${mine ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
              <span className="text-3xl w-10 text-center">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm leading-tight truncate">{a.name}{h.level > 0 ? ` · L${h.level + 1}` : ""}</div>
                <div className="text-[11px] font-bold" style={{ color: SECTOR_TINT[a.sector] }}>{a.kind === "property" ? "Property" : "Business"} · {a.sector}</div>
                <div className="text-xs text-slate-600 font-mono">
                  {fmt(h.price)} <span className={change > 0.001 ? "text-emerald-600" : change < -0.001 ? "text-rose-600" : "text-slate-400"}>{change > 0.001 ? "▲" : change < -0.001 ? "▼" : "•"}{Math.abs(change * 100).toFixed(1)}%</span>
                  <span className="text-slate-400"> · earns ~{fmt(earning(state, i))}/round</span>
                </div>
                {h.owner !== null && <div className="text-[11px] font-bold text-slate-500">Owner: {shown[h.owner]}</div>}
              </div>
              {myTurn && (
                <div className="flex flex-col gap-1 shrink-0">
                  {h.owner === null && <button disabled={state.cash[me] < h.price || state.sold.includes(i)} onClick={() => onMove(buy(state, i))} className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-black disabled:opacity-30">Buy</button>}
                  {mine && <button onClick={() => onMove(sell(state, i))} className="h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-black">Sell</button>}
                  {mine && a.kind === "business" && h.level < 2 && <button disabled={state.cash[me] < upgradeCost(i)} onClick={() => onMove(upgrade(state, i))} className="h-8 px-2 rounded-lg bg-amber-500 text-white text-[11px] font-black disabled:opacity-30">Upgrade {fmt(upgradeCost(i))}</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {myTurn ? (
        <button onClick={() => onMove(endTurn(state))} className="w-full h-12 rounded-xl bg-slate-900 text-white font-black">{state.turn === state.cash.length - 1 ? "End turn · close the round" : "End turn"}</button>
      ) : state.winner === null && <p className="text-center text-sm font-bold text-slate-500">{shown[state.turn]} is trading…</p>}

      <div className="rounded-2xl bg-white border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
        {state.log.map((l, k) => <p key={k} className={k ? "opacity-70" : "font-bold text-slate-800"}>{fill(l, shown)}</p>)}
        <p className="text-[11px] text-slate-400 pt-1">Selling costs a 2% agent fee. Businesses upgrade twice (+50% profit each).</p>
      </div>
    </div>
  );
}

export const trading: GameModule<TradingState> = { init, turnOf, ai, result, Board, delay: () => 600 };
