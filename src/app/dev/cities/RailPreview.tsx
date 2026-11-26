"use client";

// The map's round icons as a signed-in player on Dubai's map sees them: Search, the goal, the Vault, the doctor and
// a live event down the right; the places and hotspot buttons at the bottom right.
import { RailButton } from "@/components/layout/mapRail";

export function RailPreview() {
  return (
    <>
      <RailButton n={0} icon="🔍" label="Search places" onClick={() => {}} />
      <RailButton n={1} icon="🎓" badge="1/4" label="Your goal" onClick={() => {}} />
      <RailButton n={2} icon="🎁" badge="1/3" label="Daily Vault" tone="bg-slate-900 text-white" onClick={() => {}} />
      <RailButton n={3} icon="🤒" badge="!" label="Flu: see a doctor" onClick={() => {}} />
      <RailButton n={4} icon="🎉" badge="LIVE" label="A party is on" alert onClick={() => {}} />
      <div className="fixed right-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.75rem)] z-40 flex flex-col gap-2">
        <div className="w-12 h-12 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-2xl">📍</div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg flex items-center justify-center text-2xl">🔥</div>
      </div>
    </>
  );
}
