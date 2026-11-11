"use client";

// Your children at home (both parents' home pages): where each baby is, picking them up and carrying them round
// the house (upstairs too), and putting them down in a bed, on a chair or sofa, or on the floor, where a crawler
// crawls about and a toddler toddles. Either parent can do it, and the other sees it at once: the home's live room
// carries a "baby" event, and the spot is saved (set_child_spot) for next time. A baby nobody has put anywhere yet
// is laid in the nearest bed. Milestones come with the days (family.json stages): lying, sitting, crawling, walking.

import { useCallback, useEffect, useRef, useState } from "react";
import FAMILY from "@/data/life/family.json";
import { setChildSpot, stageOf, useFamily, type BabySpot, type Child } from "@/lib/love";
import type { Received, RoomEvent } from "@/lib/room";
import type { Person } from "@/components/home/ApartmentRoom";
import { gameAudio } from "@/utils/gameAudio";
import { babyScale, CarriedBaby, poseFor, wanderFrom, type BabyPose } from "./Baby";

type Placed = Extract<BabySpot, { level: number }>;
const isCarried = (s: BabySpot | null | undefined): s is { carriedBy: string } => !!s && "carriedBy" in s;
const ADULT = 1.7;

interface Baby { child: Child; name: string; days: number; pose: BabyPose; stageLabel: string; stageIcon: string; scale: number; spot: BabySpot | null }

export function useBabies({ meId, flatId, level, onOpenFamily }: {
  meId?: string | null;
  /** The home I'm in (a baby put down in another home starts again here, in a bed). */
  flatId: string | null;
  level: number;
  onOpenFamily: () => void;
}) {
  const family = useFamily(meId);
  const [spots, setSpots] = useState<Record<number, BabySpot | null>>({});
  const [menu, setMenu] = useState<number | null>(null);
  const [call, setCall] = useState<{ n: number; where: "bed" | "chair" | "floor"; height: number; scale: number; anyLevel?: boolean } | undefined>(undefined);
  const pending = useRef<number | null>(null);
  const emitRef = useRef<((e: RoomEvent) => void) | null>(null);
  const bindEmit = useCallback((emit: (e: RoomEvent) => void) => { emitRef.current = emit; }, []);
  const [clock, setClock] = useState(0);

  const born = (family?.children ?? []).filter((c) => c.born).slice(0, 6);
  const babies: Baby[] = born.map((c) => {
    const now = clock || Date.parse(c.dueAt);
    const { days, stage } = stageOf(c, now);
    const local = spots[c.id];
    let spot = local !== undefined ? local : c.spot ?? null;
    // Put down in another home: here, they start again (in a bed).
    if (spot && !isCarried(spot) && spot.flat && flatId && spot.flat !== flatId) spot = null;
    return {
      child: c, name: c.name ?? (c.gender === "girl" ? "Baby girl" : "Baby boy"), days, pose: poseFor(stage.id),
      stageLabel: stage.label, stageIcon: stage.icon, scale: babyScale(days), spot,
    };
  });
  const wandering = babies.some((b) => b.spot && !isCarried(b.spot) && b.spot.on === "floor" && (b.pose === "crawl" || b.pose === "walk"));

  // A clock for the babies: once a second while one is crawling or toddling about, else once a minute.
  useEffect(() => {
    const tick = () => setClock(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, wandering ? 1000 : 60_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [wandering]);

  const set = useCallback((child: number, spot: BabySpot) => {
    setSpots((s) => ({ ...s, [child]: spot }));
    emitRef.current?.({ type: "baby", child, spot });
    void setChildSpot(child, spot);
  }, []);

  /** The other parent picked a baby up or put them down. */
  const receive = useCallback((e: Received) => {
    if (e.type !== "baby") return false;
    setSpots((s) => ({ ...s, [e.child]: e.spot }));
    return true;
  }, []);

  const carrying = babies.find((b) => isCarried(b.spot) && b.spot.carriedBy === meId) ?? null;

  const pickUp = (b: Baby) => {
    if (!meId) return;
    gameAudio.playClickSound();
    // One at a time: whoever I was holding goes down here first.
    if (carrying && carrying.child.id !== b.child.id) return;
    set(b.child.id, { carriedBy: meId });
    setMenu(null);
  };
  const putDown = (where: "bed" | "chair" | "floor") => {
    if (!carrying) return;
    gameAudio.playClickSound();
    pending.current = carrying.child.id;
    setCall((c) => ({ n: (c?.n ?? 0) + 1, where, height: ADULT * carrying.scale, scale: carrying.scale }));
  };
  /** The room found where (the nearest bed or seat, or the floor in front of me). */
  const onBabyDown = (spot: Omit<Placed, "flat">) => {
    const id = pending.current;
    pending.current = null;
    if (id === null) return;
    set(id, { ...spot, flat: flatId });
  };

  // A baby nobody's put anywhere yet (or put down in another home) goes into the nearest bed on the ground floor.
  const unplaced = babies.find((b) => !b.spot)?.child.id ?? null;
  const placing = useRef<number | null>(null);
  useEffect(() => {
    if (unplaced === null || level !== 0 || placing.current === unplaced || pending.current !== null) return;
    placing.current = unplaced;
    const b = babies.find((x) => x.child.id === unplaced)!;
    const t = setTimeout(() => {
      pending.current = unplaced;
      setCall((c) => ({ n: (c?.n ?? 0) + 1, where: "bed", height: ADULT * b.scale, scale: b.scale, anyLevel: true }));
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per baby that needs a place
  }, [unplaced, level]);

  /** A carried baby, for whoever is carrying them (me, or the other parent's avatar). */
  const cradleFor = (userId: string | undefined) => {
    const b = babies.find((x) => isCarried(x.spot) && x.spot.carriedBy === userId);
    if (!b) return undefined;
    return <CarriedBaby look={lookOf(b.child)} days={b.days} pose={b.pose} />;
  };

  // The babies put down on this floor.
  const people: Person[] = babies.flatMap((b): Person[] => {
    const s = b.spot;
    if (!s || isCarried(s) || s.level !== level) return [];
    const onFloor = s.on === "floor";
    const pose: BabyPose = s.on === "bed" ? "lie" : s.on === "chair" ? (b.pose === "lie" ? "lie" : "sit") : b.pose;
    const [x, z] = onFloor ? wanderFrom(b.child.id, [s.x, s.z], clock, pose, 4.6) : [s.x, s.z];
    return [{
      look: lookOf(b.child),
      position: [x, s.y, z],
      rotation: s.yaw,
      animation: pose === "lie" ? "sleep" : pose === "sit" ? "sit" : pose === "walk" ? "walk" : "idle",
      pose: pose === "crawl" ? "crawl" : undefined,
      pace: pose === "crawl" ? 0.22 : pose === "walk" ? 0.45 : undefined,
      scale: b.scale,
      label: `${b.stageIcon} ${b.name} · ${b.stageLabel}`,
      onClick: () => setMenu(b.child.id),
    }];
  });

  const canCarry = (b: Baby) => b.days < FAMILY.carryUntilDay;
  const menuBaby = babies.find((b) => b.child.id === menu) ?? null;
  const heldBy = menuBaby && isCarried(menuBaby.spot) ? menuBaby.spot.carriedBy : null;

  const ui = (
    <>
      {carrying && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] z-40 w-[min(26rem,calc(100vw-1.5rem))] rounded-2xl bg-white/95 text-slate-900 shadow-2xl p-2.5 space-y-2">
          <p className="text-xs font-black text-center">🤱 Carrying {carrying.name} · {carrying.stageIcon} {carrying.stageLabel}</p>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => putDown("bed")} className="h-11 rounded-xl bg-indigo-600 text-white text-[11px] font-black active:scale-95">🛏️ In a bed</button>
            <button onClick={() => putDown("chair")} className="h-11 rounded-xl bg-amber-500 text-slate-950 text-[11px] font-black active:scale-95">🪑 On a seat</button>
            <button onClick={() => putDown("floor")} className="h-11 rounded-xl bg-slate-200 text-slate-900 text-[11px] font-black active:scale-95">⬇️ Put down</button>
          </div>
        </div>
      )}
      {menuBaby && (
        <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-black/40 p-3" onClick={() => setMenu(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white text-slate-900 p-4 space-y-2.5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{menuBaby.stageIcon}</span>
              <div>
                <p className="font-black">{menuBaby.name}</p>
                <p className="text-xs text-slate-500">{menuBaby.stageLabel} · {menuBaby.days === 0 ? "born today" : `${menuBaby.days} day${menuBaby.days === 1 ? "" : "s"} old`}</p>
              </div>
            </div>
            {canCarry(menuBaby) ? (
              <button disabled={!!heldBy || (!!carrying && carrying.child.id !== menuBaby.child.id)} onClick={() => pickUp(menuBaby)}
                className="w-full h-12 rounded-2xl bg-rose-500 text-white font-black active:scale-95 disabled:opacity-40">
                {heldBy ? "Your partner is holding them" : carrying && carrying.child.id !== menuBaby.child.id ? `Put ${carrying.name} down first` : "🤱 Pick up"}
              </button>
            ) : (
              <p className="text-xs text-slate-500">Too big to carry now: they walk everywhere by themselves.</p>
            )}
            <button onClick={() => { setMenu(null); onOpenFamily(); }} className="w-full h-11 rounded-2xl bg-slate-100 text-slate-800 text-sm font-black active:scale-95">🍼 Feed, play, bath (Family)</button>
          </div>
        </div>
      )}
    </>
  );

  return { people, cradle: cradleFor(meId ?? undefined), cradleFor, babyCall: call, onBabyDown, receive, bindEmit, ui, carrying: !!carrying };
}

/** A child's look: a girl or a boy, dressed like their mum or dad. */
function lookOf(c: Child) {
  return { gender: c.gender === "girl" ? ("woman" as const) : ("man" as const) };
}
