"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShiftScene } from "@/components/jobs/ShiftScene";
import { SmartYard } from "@/components/driving/SmartYard";
import { pool } from "@/components/games/Pool";
import { MysteryBox } from "@/components/goals/MysteryBox";
import { LifePanel, type LifeTab } from "@/components/life/LifePanel";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function ShowcasePage() {
  const sp = useSearchParams();
  const view = sp?.get("v") ?? "shift";
  const [poolState, setPoolState] = useState(() => pool.init(2));
  const [lifeTab, setLifeTab] = useState<LifeTab>("profile");

  if (view === "shift") {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <ShiftScene
          job={{
            title: "Head Barista",
            venture: "Al Karama Saffron Karak",
            ventureType: "karak_cafe",
            weeklyWage: 2400,
            shifts: 2,
            shiftsPerWeek: 4,
            workedToday: false,
            owed: 0,
            nextPayroll: new Date(Date.now() + 86400000 * 3).toISOString(),
          }}
          look={{ gender: "man", preset: "Male_Adult_08" }}
          onCancel={() => {}}
          onDone={() => {}}
        />
      </div>
    );
  }

  if (view === "yard") {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black">🚗 Dubai RTA Driving Academy</h1>
            <p className="text-xs text-slate-400">Stage 3 · 3D Smart Yard Parking Test</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black">3D LIVE</span>
        </div>
        <SmartYard onDone={() => {}} />
      </div>
    );
  }

  if (view === "pool") {
    const PoolBoard = pool.Board;
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col justify-center max-w-xl mx-auto">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black">🎱 Dubai VIP 3D Billiards Lounge</h1>
            <p className="text-xs text-slate-400">Glossy 3D physics + Live Player Avatars watching tableside</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black">3D TABLE</span>
        </div>
        <div className="bg-white text-slate-900 rounded-3xl p-4 shadow-2xl">
          <PoolBoard
            state={poolState}
            me={0}
            seats={[
              { id: "me", name: "You (@habibi)" },
              { id: "ai", name: "Tariq (@marina_vip)" },
            ]}
            canMove={true}
            onMove={(next) => setPoolState(next)}
          />
        </div>
      </div>
    );
  }

  if (view === "vault") {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <MysteryBox prize={1000} xp={150} onDone={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <TopBar walletBalance={148500} />
      <LifePanel open={true} tab={lifeTab} onTab={setLifeTab} onClose={() => {}} />
      <BottomNav />
    </div>
  );
}

