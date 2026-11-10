"use client";

// Development only: the real party board hook (usePartyBoard) in a home, with a stand-in HUD, to check the
// clear screen comes on when a game starts on a phone, and the clear / unclear toggle.

import { useState } from "react";
import { ApartmentRoom } from "@/components/home/ApartmentRoom";
import { HOUSING_CONFIGS } from "@/lib/furniture";
import { usePartyBoard } from "@/components/party/usePartyBoard";

export function CleanPreview() {
  const [clean, setClean] = useState(false);
  const board = usePartyBoard({
    active: true, meId: "me-preview", meName: "you", isHost: true, present: [], tier: "villa", exterior: ["pool", "garden"],
    level: 0, clean, onGameStart: () => setClean(true),
  });
  return (
    <main className="fixed inset-0">
      <ApartmentRoom housingTier="villa" view="above" homeStyle={{ ...HOUSING_CONFIGS.villa.finish, exterior: ["pool", "garden"] }}
        extras={board.board} extraZones={board.zones} focus={board.focus} poolCovered={board.poolCovered} clean={clean} />
      {!clean && <div className="fixed top-3 inset-x-3 z-30 h-12 rounded-full bg-white/90 text-slate-900 font-black flex items-center justify-center">STAND-IN HUD</div>}
      <button onClick={() => setClean((c) => !c)} className="fixed right-3 top-1/2 z-30 h-11 px-3 rounded-full bg-slate-900 text-white text-xs font-black">{clean ? "Unclear screen" : "Clear screen"}</button>
      {board.ui}
    </main>
  );
}
