"use client";

// The map's round icons as a signed-in player on Dubai's map sees them: Search, the goal, the Vault, the doctor and
// a live event, then the places and hotspot buttons, together in one column centred on the right.
import { RailButton, RailSlot, RAIL_LAST } from "@/components/layout/mapRail";

export function RailPreview() {
  return (
    <>
      <RailButton n={0} icon="🔍" label="Search places" onClick={() => {}} />
      <RailButton n={1} icon="🎓" badge="1/4" label="Your goal" onClick={() => {}} />
      <RailButton n={2} icon="🎁" badge="1/3" label="Daily Vault" tone="bg-slate-900 text-white" onClick={() => {}} />
      <RailButton n={3} icon="🤒" badge="!" label="Flu: see a doctor" onClick={() => {}} />
      <RailButton n={4} icon="🎉" badge="LIVE" label="A party is on" alert onClick={() => {}} />
      <RailSlot order={RAIL_LAST}><div className="flex flex-col gap-2">
        <div className="w-12 h-12 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-2xl">📍</div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg flex items-center justify-center text-2xl">🔥</div>
      </div></RailSlot>
    </>
  );
}
