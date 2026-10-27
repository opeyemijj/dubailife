"use client";

// The citizen's inner life, Sims-style: needs that slowly drop, feelings that follow from them, skills
// that grow with practice (and get rusty without it), daily wishes that earn ✨ points, and perks bought
// with those points. Everything is kept on the citizen (profiles.citizen.life) and saved with the game.

import { DEFAULT_NEEDS, getCitizenState, updateCitizen, type Citizen, type NeedKey, type Needs } from "@/lib/citizenStore";
import { isIll, maybeFallIll, SERVICES } from "@/lib/cityServices";

// ---------------------------------------------------------------- state

export type SkillId = "cooking" | "charisma" | "fitness" | "coding" | "music" | "hustle" | "dance" | "culture" | "gaming";

export interface SkillState { xp: number; lastUsed: string }

/** Things that happen around the city, counted for wishes. */
export type LifeEventKind = "chat" | "shift" | "dance" | "meal" | "game" | "workout" | "cook" | "study";

export interface Wish {
  id: string;
  kind: string;
  label: string;
  icon: string;
  reward: number;
  /** The counter or measure this wish watches, and where it stood when the wish was made. */
  metric: string;
  baseline: number;
  target: number;
  /** For "visit this venue": its "placeId/venueId". */
  key?: string;
  /** Where to go to do it. */
  href?: string;
}

export interface LifeState {
  skills: Partial<Record<SkillId, SkillState>>;
  counters: Partial<Record<LifeEventKind, number>>;
  /** Recent "day:person" pairs, so talking to the same person all day counts once. */
  talked: string[];
  points: number;
  wishes: Wish[];
  wishDay: string;
  rerolls: number;
  perks: string[];
  /** When needs last dropped (ISO). */
  tickAt?: string;
}

const EMPTY: LifeState = { skills: {}, counters: {}, talked: [], points: 0, wishes: [], wishDay: "", rerolls: 0, perks: [] };

export const lifeOf = (c: Citizen | null | undefined): LifeState => ({ ...EMPTY, ...(c?.life ?? {}) });

const today = () => new Date().toISOString().slice(0, 10);

function updateLife(fn: (l: LifeState, c: Citizen) => LifeState) {
  updateCitizen((c) => ({ ...c, life: fn(lifeOf(c), c) }));
}

// ---------------------------------------------------------------- skills

export interface SkillDef { id: SkillId; name: string; icon: string; how: string }

export const SKILLS: SkillDef[] = [
  { id: "cooking", name: "Cooking", icon: "🍳", how: "Cook and eat at home." },
  { id: "charisma", name: "Charisma", icon: "😎", how: "Talk to people around the city." },
  { id: "fitness", name: "Fitness", icon: "💪", how: "Swim, skate, play sport and work out." },
  { id: "coding", name: "Coding", icon: "💻", how: "Study tech courses in Academic City." },
  { id: "music", name: "Music", icon: "🎸", how: "Shows, concerts and the stage." },
  { id: "hustle", name: "Hustle", icon: "💼", how: "Work shifts and study business." },
  { id: "dance", name: "Dance", icon: "💃", how: "Hit the dance floor." },
  { id: "culture", name: "Culture", icon: "🕌", how: "Learn Arabic and UAE studies, visit landmarks." },
  { id: "gaming", name: "Gaming", icon: "🎮", how: "Play in Game City." },
];

export const MAX_LEVEL = 10;
const XP_PER_LEVEL = 100;
/** Idle days before a skill starts to fade, and how much it loses each idle day after that. */
const RUST_AFTER_DAYS = 3;
const RUST_PER_DAY = 10;
const DAY = 86_400_000;

/** A skill's XP now, after any fade (it never fades below level 1). */
export function skillXp(s: SkillState | undefined, now = Date.now()): number {
  if (!s) return 0;
  const idle = Math.floor((now - Date.parse(s.lastUsed)) / DAY) - RUST_AFTER_DAYS;
  if (idle <= 0 || s.xp < XP_PER_LEVEL) return s.xp;
  return Math.max(XP_PER_LEVEL, s.xp - idle * RUST_PER_DAY);
}

export function skillLevel(xp: number) {
  const level = Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL));
  return { level, progress: level >= MAX_LEVEL ? 1 : (xp % XP_PER_LEVEL) / XP_PER_LEVEL };
}

export const isRusty = (s: SkillState | undefined, now = Date.now()) =>
  !!s && s.xp >= XP_PER_LEVEL && now - Date.parse(s.lastUsed) > RUST_AFTER_DAYS * DAY;

/** The skill a course builds, from its category. */
export function skillForCourse(category: string): SkillId {
  if (/software|tech|security|data|artificial|program|cyber|blockchain/i.test(category)) return "coding";
  if (/culture|language|heritage/i.test(category)) return "culture";
  if (/marketing|media|sales|brand/i.test(category)) return "charisma";
  return "hustle";
}

// Repeating the same thing over and over doesn't count: one gain per skill every 45 seconds.
const GAIN_GAP_MS = 45_000;
const lastGain = new Map<SkillId, number>();

/** Practice a skill. Returns the new level if it went up. */
export function gainSkill(id: SkillId, xp: number): number | null {
  const now = Date.now();
  if (now - (lastGain.get(id) ?? 0) < GAIN_GAP_MS) return null;
  lastGain.set(id, now);
  let levelUp: number | null = null;
  updateLife((l) => {
    const before = skillXp(l.skills[id], now);
    const boost = 1 + perkBoost(l, id);
    const after = Math.min(MAX_LEVEL * XP_PER_LEVEL, before + Math.round(xp * boost));
    if (skillLevel(after).level > skillLevel(before).level) levelUp = skillLevel(after).level;
    return { ...l, skills: { ...l.skills, [id]: { xp: after, lastUsed: new Date(now).toISOString() } } };
  });
  if (levelUp !== null && typeof window !== "undefined") {
    const def = SKILLS.find((s) => s.id === id);
    window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `${def?.icon ?? "⭐"} ${def?.name ?? id} is now level ${levelUp}!` }));
  }
  return levelUp;
}

// ---------------------------------------------------------------- events (counted for wishes)

/** Something happened. Chats count once per person per day. */
export function lifeEvent(kind: LifeEventKind, withId?: string) {
  if (kind === "meal") maybeFallIll("meal");
  updateLife((l) => {
    if (kind === "chat" && withId) {
      const key = `${today()}:${withId}`;
      if (l.talked.includes(key)) return l;
      return { ...l, talked: [...l.talked, key].slice(-60), counters: { ...l.counters, chat: (l.counters.chat ?? 0) + 1 } };
    }
    return { ...l, counters: { ...l.counters, [kind]: (l.counters[kind] ?? 0) + 1 } };
  });
}

// ---------------------------------------------------------------- perks

export interface PerkDef { id: string; name: string; icon: string; cost: number; text: string; need?: NeedKey; slower?: number; skill?: SkillId | "all"; faster?: number }

export const PERKS: PerkDef[] = [
  { id: "iron-stomach", name: "Iron Stomach", icon: "🍛", cost: 8, text: "Hunger drops 25% slower.", need: "hunger", slower: 0.25 },
  { id: "steel-bladder", name: "Steel Bladder", icon: "🚽", cost: 6, text: "Bladder drops 30% slower.", need: "bladder", slower: 0.3 },
  { id: "early-bird", name: "Early Bird", icon: "🌅", cost: 8, text: "Energy drops 25% slower.", need: "energy", slower: 0.25 },
  { id: "never-dull", name: "Never Dull", icon: "🎉", cost: 8, text: "Fun drops 25% slower.", need: "fun", slower: 0.25 },
  { id: "social-butterfly", name: "Social Butterfly", icon: "🦋", cost: 8, text: "Social drops 25% slower.", need: "social", slower: 0.25 },
  { id: "fresh-all-day", name: "Fresh All Day", icon: "🫧", cost: 8, text: "Hygiene drops 25% slower.", need: "hygiene", slower: 0.25 },
  { id: "silver-tongue", name: "Silver Tongue", icon: "🍯", cost: 10, text: "Charisma grows 50% faster.", skill: "charisma", faster: 0.5 },
  { id: "hustle-juice", name: "Hustle Juice", icon: "🧃", cost: 12, text: "Hustle grows 50% faster.", skill: "hustle", faster: 0.5 },
  { id: "quick-study", name: "Quick Study", icon: "🧠", cost: 15, text: "Every skill grows 25% faster.", skill: "all", faster: 0.25 },
];

function perkBoost(l: LifeState, skill: SkillId) {
  return PERKS.filter((p) => l.perks.includes(p.id) && (p.skill === skill || p.skill === "all")).reduce((s, p) => s + (p.faster ?? 0), 0);
}

/** Buys a perk with ✨ points. Returns false if it's owned or unaffordable. */
export function buyPerk(id: string): boolean {
  const perk = PERKS.find((p) => p.id === id);
  const l = lifeOf(getCitizenState().citizen);
  if (!perk || l.perks.includes(id) || l.points < perk.cost) return false;
  updateLife((x) => ({ ...x, points: x.points - perk.cost, perks: [...x.perks, id] }));
  return true;
}

// ---------------------------------------------------------------- needs dropping over time

/** Points lost per hour of play. */
const DROP_PER_HOUR: Needs = { hunger: 6, energy: 4, fun: 5, social: 4, hygiene: 4, bladder: 8 };
/** Time away counts only up to this much, so coming back after a week isn't a disaster. */
const MAX_AWAY_MS = 2 * 3_600_000;

/** Lowers needs for the time since the last tick. Called every minute while signed in. */
export function tickNeeds(now = Date.now()) {
  updateCitizen((c) => {
    const l = lifeOf(c);
    const last = l.tickAt ? Date.parse(l.tickAt) : now;
    const ms = Math.min(MAX_AWAY_MS, Math.max(0, now - last));
    const life = { ...l, tickAt: new Date(now).toISOString() };
    if (ms < 30_000) return l.tickAt ? c : { ...c, life };
    const needs = { ...DEFAULT_NEEDS, ...c.needs };
    // Being ill wears you down faster until a doctor treats you.
    const hours = (ms / 3_600_000) * (isIll() ? SERVICES.illness.drainMultiplier : 1);
    for (const k of Object.keys(DROP_PER_HOUR) as NeedKey[]) {
      const slower = PERKS.filter((p) => p.need === k && l.perks.includes(p.id)).reduce((s, p) => s + (p.slower ?? 0), 0);
      needs[k] = Math.max(0, Math.round((needs[k] - DROP_PER_HOUR[k] * hours * (1 - slower)) * 10) / 10);
    }
    // Run down (hungry and unwashed) invites the flu; the summer midday sun, heatstroke when worn out.
    if (needs.hunger < 20 && needs.hygiene < 20) maybeFallIll("rundown");
    const gst = new Date(now + 4 * 3_600_000);
    if (gst.getUTCMonth() >= 4 && gst.getUTCMonth() <= 8 && gst.getUTCHours() >= 12 && gst.getUTCHours() < 16 && needs.energy < 30) maybeFallIll("heat");
    return { ...c, needs, life };
  });
}

// ---------------------------------------------------------------- feelings and mood

export interface Feeling { id: string; icon: string; name: string; text: string; value: number }

export function feelingsOf(c: Citizen | null | undefined, now = Date.now()): Feeling[] {
  if (!c) return [];
  const n = { ...DEFAULT_NEEDS, ...c.needs };
  const out: Feeling[] = [];
  const add = (id: string, icon: string, name: string, text: string, value: number) => out.push({ id, icon, name, text, value });

  if (n.hunger < 15) add("starving", "😫", "Starving", "Running on empty. Eat something now.", -20);
  else if (n.hunger < 35) add("hungry", "🍽️", "Hungry", "The stomach is talking. Time for a meal.", -10);
  else if (n.hunger >= 85) add("well-fed", "😋", "Well Fed", "That meal hit the spot.", 5);
  if (n.energy < 15) add("exhausted", "🥱", "Exhausted", "Can barely keep the eyes open.", -20);
  else if (n.energy < 35) add("tired", "😴", "Tired", "A nap would be lovely.", -10);
  else if (n.energy >= 85) add("energised", "⚡", "Energised", "Ready for anything.", 5);
  if (n.fun < 25) add("bored", "😑", "Bored", "Nothing's happening. Go out and do something.", -10);
  else if (n.fun >= 90) add("blast", "🥳", "Having a Blast", "Dubai nights hit different.", 10);
  if (n.social < 25) add("lonely", "🥺", "Lonely", "Haven't talked to anyone in a while.", -10);
  else if (n.social >= 90) add("popular", "🌟", "Popular", "Everyone wants a moment with you.", 10);
  if (n.hygiene < 20) add("smelly", "🤢", "Smelly", "People are keeping their distance. Shower!", -15);
  else if (n.hygiene >= 85) add("fresh", "🫧", "Fresh", "Clean, perfumed and ready.", 5);
  if (n.bladder < 15) add("bursting", "😣", "Bursting", "Find a bathroom. Quickly.", -15);
  if (n.hunger < 20 && n.hygiene < 20) add("sick", "🤒", "Feeling Sick", "Body isn't well. Eat and freshen up before it gets worse.", -15);

  if (c.balance >= 1_000_000) add("living-large", "🥂", "Living Large", "Money in the bank. Life is sweet.", 10);
  else if (c.balance < 1_000) add("broke", "💸", "Broke", "The wallet is crying. Time to hustle.", -10);
  const shift = c.job?.lastShiftAt ? Date.parse(c.job.lastShiftAt) : 0;
  if (now - shift < 2 * 3_600_000) add("paid", "💰", "Just Got Paid", "Fresh wages in the account.", 10);
  const graduated = Object.values(c.academic?.enrolled ?? {}).some((e) => e.graduatedAt && now - Date.parse(e.graduatedAt) < 3 * DAY);
  if (graduated) add("graduate", "🎓", "Proud Graduate", "Certificate in hand. The future is bright.", 15);
  if ((c.furniture?.length ?? 0) >= 5) add("home", "🛋️", "Home Sweet Home", "The place is starting to feel like yours.", 5);

  return out.sort((a, b) => b.value - a.value);
}

export function moodOf(feelings: Feeling[]) {
  const total = feelings.reduce((s, f) => s + f.value, 0);
  const label = total >= 30 ? "Very Happy" : total >= 10 ? "Happy" : total > -10 ? "Fine" : total > -30 ? "Uncomfortable" : "Miserable";
  const tone = total >= 10 ? "text-emerald-600" : total > -10 ? "text-slate-500" : "text-rose-600";
  const top = feelings.find((f) => f.value > 0) ?? feelings[0];
  return { total, label, tone, top };
}

// ---------------------------------------------------------------- wishes

/** Measures a wish watches, from the citizen as they are now. */
export function metricOf(c: Citizen, metric: string): number {
  const l = lifeOf(c);
  const n = { ...DEFAULT_NEEDS, ...c.needs };
  if (metric.startsWith("count:")) return l.counters[metric.slice(6) as LifeEventKind] ?? 0;
  switch (metric) {
    case "visited": return c.visited?.length ?? 0;
    case "bought": return c.inventory?.length ?? 0;
    case "furniture": return c.furniture?.length ?? 0;
    case "lessons": return Object.values(c.academic?.enrolled ?? {}).reduce((s, e) => s + (e.completedLessons?.length ?? 0), 0);
    case "all-needs": return Math.min(...Object.values(n));
    case "hygiene": return n.hygiene;
    case "energy": return n.energy;
    default: return 0;
  }
}

export function wishDone(c: Citizen, w: Wish): boolean {
  if (w.key) return !!c.visited?.includes(w.key);
  // Level measures ("keep every need above 70") are met when they reach the target; counts must grow by it.
  if (w.metric === "all-needs" || w.metric === "hygiene" || w.metric === "energy") return metricOf(c, w.metric) >= w.target;
  return metricOf(c, w.metric) - w.baseline >= w.target;
}

type WishTemplate = Omit<Wish, "id" | "baseline">;

const WISHES: WishTemplate[] = [
  { kind: "gig", label: "Do a side gig", icon: "💼", reward: 3, metric: "count:shift", target: 1, href: "/explore" },
  { kind: "talk", label: "Have 3 conversations", icon: "💬", reward: 2, metric: "count:chat", target: 3, href: "/explore" },
  { kind: "new-place", label: "Visit somewhere new", icon: "🧭", reward: 3, metric: "visited", target: 1, href: "/explore" },
  { kind: "shop", label: "Buy something in the city", icon: "🛍️", reward: 2, metric: "bought", target: 1, href: "/explore" },
  { kind: "furniture", label: "Buy furniture for your home", icon: "🛋️", reward: 3, metric: "furniture", target: 1, href: "/home" },
  { kind: "dance", label: "Dance at a club", icon: "💃", reward: 2, metric: "count:dance", target: 1, href: "/explore" },
  { kind: "meal", label: "Eat out at a restaurant", icon: "🍽️", reward: 2, metric: "count:meal", target: 1, href: "/explore" },
  { kind: "cook", label: "Grab a bite at home", icon: "🍳", reward: 1, metric: "count:cook", target: 1, href: "/home" },
  { kind: "game", label: "Play a game in Game City", icon: "🎮", reward: 2, metric: "count:game", target: 1, href: "/explore?at=game-tile-chess" },
  { kind: "study", label: "Study a lesson", icon: "📚", reward: 3, metric: "lessons", target: 1, href: "/academics" },
  { kind: "workout", label: "Swim, skate or work out", icon: "🏊", reward: 2, metric: "count:workout", target: 1, href: "/explore" },
  { kind: "fresh", label: "Freshen up (hygiene 80%+)", icon: "🛁", reward: 1, metric: "hygiene", target: 80, href: "/home" },
  { kind: "rested", label: "Get well rested (energy 80%+)", icon: "🛏️", reward: 1, metric: "energy", target: 80, href: "/home" },
  { kind: "balanced", label: "Keep every need above 70%", icon: "🌿", reward: 4, metric: "all-needs", target: 70 },
];

export const MAX_WISHES = 3;
export const REROLLS_PER_DAY = 3;

/** A venue someone could be sent to, for "visit X" wishes. */
export interface WishVenue { key: string; name: string; placeId: string }

function makeWish(c: Citizen, taken: string[], venues: WishVenue[]): Wish {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  // One in four wishes is to visit a particular venue the citizen hasn't been to yet.
  const fresh = venues.filter((v) => !c.visited?.includes(v.key) && !taken.includes(`visit:${v.key}`));
  if (fresh.length && Math.random() < 0.25) {
    const v = fresh[Math.floor(Math.random() * fresh.length)];
    return { id, kind: `visit:${v.key}`, label: `Visit ${v.name}`, icon: "📍", reward: 3, metric: "visited", baseline: 0, target: 1, key: v.key, href: `/place/${v.placeId}` };
  }
  const pool = WISHES.filter((w) => !taken.includes(w.kind) && !(w.metric === "all-needs" || w.metric === "hygiene" || w.metric === "energy" ? wishDone(c, { ...w, id, baseline: 0 }) : false));
  const t = pool[Math.floor(Math.random() * pool.length)] ?? WISHES[0];
  return { ...t, id, baseline: metricOf(c, t.metric) };
}

/** Fills the wish list up to three, starting fresh each day. */
export function refreshWishes(venues: WishVenue[]) {
  updateLife((l, c) => {
    const day = today();
    let wishes = l.wishDay === day ? l.wishes : [];
    if (wishes.length >= MAX_WISHES && l.wishDay === day) return l;
    while (wishes.length < MAX_WISHES) wishes = [...wishes, makeWish(c, wishes.map((w) => w.kind), venues)];
    return { ...l, wishes, wishDay: day, rerolls: l.wishDay === day ? l.rerolls : 0 };
  });
}

export function rerollWish(id: string, venues: WishVenue[]): boolean {
  const l = lifeOf(getCitizenState().citizen);
  if (l.rerolls >= REROLLS_PER_DAY) return false;
  updateLife((x, c) => ({
    ...x, rerolls: x.rerolls + 1,
    wishes: x.wishes.map((w) => (w.id === id ? makeWish(c, x.wishes.map((y) => y.kind), venues) : w)),
  }));
  return true;
}

/** Collects a finished wish's ✨ and puts a new wish in its place. */
export function claimWish(id: string, venues: WishVenue[]): number {
  const c = getCitizenState().citizen;
  const w = lifeOf(c).wishes.find((x) => x.id === id);
  if (!c || !w || !wishDone(c, w)) return 0;
  updateLife((x, cit) => ({
    ...x, points: x.points + w.reward,
    wishes: x.wishes.map((y) => (y.id === id ? makeWish(cit, x.wishes.map((z) => z.kind), venues) : y)),
  }));
  return w.reward;
}
