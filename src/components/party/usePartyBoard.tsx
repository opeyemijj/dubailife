"use client";

// Everything a home page needs for the party game outside (the host's /home and a guest's property page):
// the live store, the 3D board (for ApartmentRoom's `extras`), a "Games" stop on the zone bar, the camera
// glide to the board, and the picker and card on screen.

import { useEffect, useMemo, useRef, useState } from "react";
import { hasPlot, type HousingTier } from "@/lib/furniture";
import { PARTY_GAMES, usePartyGames } from "@/lib/partyGames";
import type { PlotZone } from "@/components/home/ApartmentRoom";
import { PARTY_BOARD_AT, PartyGameBoard } from "./PartyGameBoard";
import { PartyGameCard, PartyGamePicker, PartyGameResult } from "./PartyGamesUI";

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

  // Everyone at the party sees the game: the camera glides to the board when one starts, and again when it ends
  // (so the winning board is in view behind the result).
  const watchRef = useRef(watch);
  useEffect(() => { watchRef.current = watch; });
  const startedKey = active && pg.snap ? `${pg.snap.id}:${pg.snap.over ? "over" : "on"}` : "";
  const startedBy = pg.snap?.players[0].id;
  useEffect(() => {
    if (!startedKey) return;
    // My own new game already glided there (the picker's onStarted).
    if (startedKey.endsWith(":on") && startedBy === meId) return;
    const t = setTimeout(() => watchRef.current(), 0);
    return () => clearTimeout(t);
  }, [startedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const on = active && !!pg.snap;
  // The board's stop on the zone bar: the game when one's on, or "Let's play" (the idle board) when not.
  const idleAt: [number, number] = pool ? [PARTY_BOARD_AT[0], PARTY_BOARD_AT[1] - 4.1] : PARTY_BOARD_AT;
  const zones: PlotZone[] = on
    ? [{ id: "party-game", label: PARTY_GAMES[pg.snap!.game].name, icon: "🎲", cam: PARTY_BOARD_AT, walk: plot ? [PARTY_BOARD_AT[0] - (pool ? 2.7 : 1.6), PARTY_BOARD_AT[1] + 2.2] : undefined }]
    : active ? [{ id: "party-game", label: "Let's play", icon: "🎲", cam: idleAt, walk: plot ? [idleAt[0] - 2.2, idleAt[1]] : undefined }]
    : [];

  // Always something outside during a party: the game, or the idle board inviting a game (tap it: the picker).
  const board = active && level === 0 ? (
    <PartyGameBoard snap={pg.snap} mySeat={pg.mySeat} onMove={pg.move} pool={pool} grounds={grounds} lightsOut={lightsOut} onIdleTap={() => setPicker(true)} />
  ) : null;

  const ui = active ? (
    <>
      {picker && <PartyGamePicker pg={pg} onClose={() => setPicker(false)} onStarted={watch} />}
      <PartyGameCard pg={pg} me={meId ?? null} isHost={isHost} present={present} onWatch={watch} />
      <PartyGameResult pg={pg} isHost={isHost} onPickAnother={() => setPicker(true)} />
    </>
  ) : null;

  return { pg, board, zones, focus, ui, poolCovered: on && level === 0 && pool, openPicker: () => setPicker(true) };
}
