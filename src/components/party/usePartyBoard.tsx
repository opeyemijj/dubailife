"use client";

// Everything a home page needs for the party game outside (the host's /home and a guest's property page):
// the live store, the 3D board (for ApartmentRoom's `extras`), a "Games" stop on the zone bar, the camera
// glide to the board, and the picker and card on screen.

import { useMemo, useState } from "react";
import { hasPlot, type HousingTier } from "@/lib/furniture";
import { PARTY_GAMES, usePartyGames } from "@/lib/partyGames";
import type { PlotZone } from "@/components/home/ApartmentRoom";
import { PARTY_BOARD_AT, PartyGameBoard } from "./PartyGameBoard";
import { PartyGameCard, PartyGamePicker } from "./PartyGamesUI";

export function usePartyBoard({ active, meId, meName, isHost, present, tier, exterior, lightsOut, level, onWatch }: {
  /** A party on here (and I'm in its room). */
  active: boolean;
  meId?: string;
  meName?: string;
  isHost: boolean;
  /** Everyone else in the room (user ids). */
  present: string[];
  tier: HousingTier;
  /** The plot's outside things (pool, garden…), from the home's style. */
  exterior: string[];
  lightsOut?: boolean;
  /** Which floor I'm on: the board is outside, on the ground floor. */
  level: number;
  /** Before the camera glides to the board (e.g. switch to the view from above). */
  onWatch?: () => void;
}) {
  const me = useMemo(() => (meId && meName ? { id: meId, username: meName } : null), [meId, meName]);
  const pg = usePartyGames({ me, isHost, present });
  const [picker, setPicker] = useState(false);
  const [focus, setFocus] = useState<{ n: number; at: [number, number] } | undefined>(undefined);
  const plot = hasPlot(tier);
  const grounds = plot && exterior.length > 0;
  const pool = plot && exterior.includes("pool");

  const watch = () => {
    onWatch?.();
    setFocus((f) => ({ n: (f?.n ?? 0) + 1, at: PARTY_BOARD_AT }));
  };

  const on = active && !!pg.snap;
  const zones: PlotZone[] = on
    ? [{ id: "party-game", label: PARTY_GAMES[pg.snap!.game].name, icon: "🎲", cam: PARTY_BOARD_AT, walk: plot ? [PARTY_BOARD_AT[0] - (pool ? 2.7 : 1.6), PARTY_BOARD_AT[1] + 2.2] : undefined }]
    : [];

  const board = on && level === 0 ? (
    <PartyGameBoard snap={pg.snap} mySeat={pg.mySeat} onMove={pg.move} pool={pool} grounds={grounds} lightsOut={lightsOut} />
  ) : null;

  const ui = active ? (
    <>
      {picker && <PartyGamePicker pg={pg} onClose={() => setPicker(false)} onStarted={watch} />}
      <PartyGameCard pg={pg} me={meId ?? null} isHost={isHost} present={present} onWatch={watch} />
    </>
  ) : null;

  return { pg, board, zones, focus, ui, poolCovered: !!board && pool, openPicker: () => setPicker(true) };
}
