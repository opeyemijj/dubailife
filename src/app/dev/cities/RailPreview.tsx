"use client";

// The map's round icons down the left, as a signed-in player sees them (goal, Vault, doctor, a live event).
import { RailButton } from "@/components/layout/mapRail";

export function RailPreview() {
  return (
    <>
      <RailButton n={0} icon="🎓" badge="1/4" label="Your goal" onClick={() => {}} />
      <RailButton n={1} icon="🎁" badge="1/3" label="Daily Vault" tone="bg-slate-900 text-white" onClick={() => {}} />
      <RailButton n={2} icon="🤒" badge="!" label="Flu: see a doctor" onClick={() => {}} />
      <RailButton n={3} icon="🎉" badge="LIVE" label="A party is on" alert onClick={() => {}} />
    </>
  );
}
