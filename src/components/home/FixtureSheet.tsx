"use client";

// Using a kitchen or bathroom fixture: what it is, the things you can do with it (how long they take,
// the needs they help, the ingredients they use), what's in your kitchen, and a way to order more.
// The chosen action runs for its few seconds (cancellable), then feeds you and uses the ingredients.

import { useEffect, useRef, useState } from "react";
import { Clock, Lock, Sparkles, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { adjustBalance, updateCitizen, useCitizen, DEFAULT_NEEDS, type NeedKey } from "@/lib/citizenStore";
import { gainSkill, lifeEvent, type SkillId } from "@/lib/life";
import { afterUsing, FIXTURES, kindOf, missingFor, pantryOf, type Fixture, type FixtureAction, type PantryItem } from "@/lib/homeFixtures";
import { HOUSING_CONFIGS, getHousingTierFromText, type HomeActivityDef, type HousingTier } from "@/lib/furniture";
import { openPhone } from "@/components/layout/PhoneOverlay";
import { gameAudio } from "@/utils/gameAudio";

const NEED_LABEL: Record<string, string> = { hunger: "Hunger", energy: "Energy", fun: "Fun", social: "Social", hygiene: "Hygiene", bladder: "Bladder" };
const PANTRY = FIXTURES.pantry as Record<string, { name: string; icon: string }>;

export function FixtureSheet({
  fixture,
  onClose,
  onStart,
  housingTier,
  onTriggerActivity,
}: {
  fixture: Fixture;
  onClose: () => void;
  onStart: (a: FixtureAction) => void;
  housingTier?: HousingTier;
  onTriggerActivity?: (act: HomeActivityDef) => void;
}) {
  const { citizen } = useCitizen();
  const kind = kindOf(fixture.kind);
  const pantry = pantryOf(citizen);
  const stocked = (Object.entries(pantry) as Array<[PantryItem, number]>).filter(([, n]) => n > 0);
  const usesPantry = kind.actions.some((a) => Object.keys(a.uses).length > 0);
  const tier: HousingTier = housingTier ?? getHousingTierFromText(citizen?.home ?? "studio");
  const activities = (HOUSING_CONFIGS[tier] ?? HOUSING_CONFIGS.studio).activities ?? [];

  const runActivity = (act: HomeActivityDef) => {
    if (onTriggerActivity) {
      onClose();
      onTriggerActivity(act);
      return;
    }
    if (act.cost && !adjustBalance(-act.cost)) return;
    gameAudio.playClickSound();
    updateCitizen((c) => {
      const needs = { ...DEFAULT_NEEDS, ...c.needs };
      needs[act.need.kind] = Math.min(100, (needs[act.need.kind] ?? 70) + act.need.amount);
      return { ...c, needs };
    });
    if (act.statBoost) {
      gainSkill(act.statBoost.name as SkillId, act.statBoost.amount);
    }
    onClose();
  };

  return (
    <Sheet icon={kind.icon} title={kind.name} subtitle={kind.desc} onClose={onClose}>
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {kind.actions.map((a) => {
            const missing = missingFor(a, pantry);
            return (
              <button key={a.id} disabled={missing.length > 0} onClick={() => onStart(a)}
                className="text-left rounded-3xl border border-slate-200 p-3.5 space-y-2 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 hover:border-amber-300 hover:bg-amber-50/40">
                <div className="flex items-start justify-between">
                  <span className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">{a.icon}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3.5 h-3.5" />{a.seconds}s</span>
                </div>
                <p className="font-semibold leading-tight">{a.label}</p>
                {missing.length ? (
                  <p className="flex items-center gap-1 text-xs font-semibold text-rose-600"><Lock className="w-3.5 h-3.5" /> Need {missing.map((m) => PANTRY[m]?.name ?? m).join(", ")}</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(Object.entries(a.needs) as Array<[NeedKey, number]>).filter(([, v]) => v > 0).map(([k]) => (
                      <span key={k} className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">+{NEED_LABEL[k]}</span>
                    ))}
                    {Object.entries(a.uses).map(([k, n]) => <span key={k} className="px-2 py-0.5 rounded-full bg-amber-50 text-[11px] font-semibold text-amber-700">−{n} {PANTRY[k]?.icon}</span>)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activities.length > 0 && (
        <div className="rounded-3xl bg-amber-50/60 border border-amber-200/70 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Room Activities & Rituals</span>
            </p>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              Instant Boost
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {activities.slice(0, 4).map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => runActivity(act)}
                className="flex items-center gap-2.5 rounded-2xl bg-white hover:bg-amber-50 border border-amber-200/60 p-2.5 text-left transition active:scale-95"
              >
                <span className="w-9 h-9 rounded-full bg-amber-100/70 flex items-center justify-center text-lg shrink-0">
                  {act.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{act.label}</p>
                  <p className="text-[10px] font-extrabold text-emerald-600">
                    +{act.need.amount} {NEED_LABEL[act.need.kind] ?? act.need.kind}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {usesPantry && (
        <div className="rounded-3xl bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-500">In your kitchen</p>
          {stocked.length === 0 ? <p className="text-slate-500 text-sm">Nothing left. Time to order groceries.</p> : (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {stocked.map(([k, n]) => <span key={k} className="text-sm text-slate-700">{PANTRY[k]?.icon} {PANTRY[k]?.name} ×{n}</span>)}
            </div>
          )}
          <button onClick={() => { onClose(); openPhone("grocery"); }} className="w-full h-12 rounded-full bg-white border border-slate-200 font-semibold">🛒 Order groceries on Daily Basket</button>
        </div>
      )}
    </Sheet>
  );
}

/** The action under way: a chip with its progress (tap to cancel). Finishes by itself. */
export function FixtureProgress({ action, onDone, onCancel }: { action: FixtureAction; onDone: () => void; onCancel: () => void }) {
  const [start] = useState(() => Date.now());
  const [k, setK] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / (action.seconds * 1000));
      setK(p);
      if (p >= 1 && !done.current) { done.current = true; clearInterval(t); onDone(); }
    }, 100);
    return () => clearInterval(t);
  }, [action.seconds, start, onDone]);
  return (
    <button onClick={onCancel} className="flex items-center gap-2.5 pl-1.5 pr-3 h-12 rounded-full bg-white/95 shadow-lg text-slate-900 active:scale-95">
      <span className="relative w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: `conic-gradient(#059669 ${k * 360}deg, #e2e8f0 0deg)` }}>
        <span className="absolute inset-1 rounded-full bg-white flex items-center justify-center">{action.icon}</span>
      </span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-semibold">{action.label}</span>
        <span className="flex items-center gap-0.5 text-[11px] text-slate-500"><X className="w-3 h-3" /> tap to cancel</span>
      </span>
    </button>
  );
}

/** Applies a finished action: needs, ingredients used, a meal counted, cooking practised. */
export function completeFixtureAction(a: FixtureAction) {
  updateCitizen((c) => {
    const needs = { ...DEFAULT_NEEDS, ...c.needs };
    for (const [k, v] of Object.entries(a.needs) as Array<[NeedKey, number]>) needs[k] = Math.max(0, Math.min(100, needs[k] + v));
    return { ...c, needs, pantry: afterUsing(a, pantryOf(c)) as Record<string, number> };
  });
  if (a.meal) lifeEvent("meal");
  if (a.skill) gainSkill(a.skill as SkillId, 10);
  gameAudio.playCoinSound();
}
