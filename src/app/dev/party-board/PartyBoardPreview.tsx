"use client";

import { useEffect, useMemo, useState } from "react";
import { ApartmentRoom } from "@/components/home/ApartmentRoom";
import { HOUSING_CONFIGS, type HousingTier } from "@/lib/furniture";
import { MODULES } from "@/components/games";
import { PARTY_BOARD_AT, PartyGameBoard } from "@/components/party/PartyGameBoard";
import { PartyGameCard, PartyGamePicker, PartyGameResult } from "@/components/party/PartyGamesUI";
import { usePartyGames, type PartyGameId } from "@/lib/partyGames";

export function PartyBoardPreview({ tier, game, pool, moves }: { tier: string; game: string; pool: boolean; moves: number }) {
  const housingTier = (tier in HOUSING_CONFIGS ? tier : "villa") as HousingTier;
  const me = useMemo(() => ({ id: "me-preview", username: "you" }), []);
  const pg = usePartyGames({ me, isHost: true, present: [] });
  const [focus, setFocus] = useState<{ n: number; at: [number, number] } | undefined>(undefined);
  useEffect(() => {
    if (game === "none") return;
    const t = setTimeout(() => {
      pg.start(game as PartyGameId, true);
      setFocus({ n: 1, at: PARTY_BOARD_AT });
    }, 300);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Play a few moves for both sides so the board has something on it.
  const [played, setPlayed] = useState(0);
  const [picker, setPicker] = useState(false);
  useEffect(() => { if (game === "none") { const t = setTimeout(() => setFocus({ n: 1, at: [PARTY_BOARD_AT[0], PARTY_BOARD_AT[1] - (pool ? 4.1 : 0)] }), 300); return () => clearTimeout(t); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pg.snap || played >= moves || pg.snap.over) return;
    const t = setTimeout(async () => {
      const s = pg.snap!;
      const seat = MODULES[s.game].turnOf?.(s.state) ?? 0;
      if (seat === 0) pg.move(await MODULES[s.game].ai(s.state, 0));
      setPlayed((n) => n + 1);
    }, 500);
    return () => clearTimeout(t);
  }, [pg.snap?.seq, played]); // eslint-disable-line react-hooks/exhaustive-deps
  const exterior = pool ? ["pool", "garden"] : ["garden"];
  return (
    <main className="fixed inset-0">
      <ApartmentRoom housingTier={housingTier} view="above" homeStyle={{ ...HOUSING_CONFIGS[housingTier].finish, exterior }} focus={focus} poolCovered={!!pg.snap && pool && housingTier === "villa"}
        extraZones={pg.snap ? [{ id: "party-game", label: "Game", icon: "🎲", cam: PARTY_BOARD_AT }] : []}
        extras={<PartyGameBoard snap={pg.snap} mySeat={pg.mySeat} onMove={pg.move} pool={pool && housingTier === "villa"} grounds={housingTier === "villa" || housingTier === "townhouse"} onIdleTap={() => setPicker(true)} />} />
      {picker && <PartyGamePicker pg={pg} onClose={() => setPicker(false)} onStarted={() => setFocus((f) => ({ n: (f?.n ?? 0) + 1, at: PARTY_BOARD_AT }))} />}
      <PartyGameResult pg={pg} isHost onPickAnother={() => {}} />
      <PartyGameCard pg={pg} me={me.id} isHost present={[]} onWatch={() => setFocus((f) => ({ n: (f?.n ?? 0) + 1, at: PARTY_BOARD_AT }))} />
    </main>
  );
}
