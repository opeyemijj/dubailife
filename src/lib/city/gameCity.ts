// Game City (on the Dubai Hills plot) and Academic City (on the West Coast plot). Game City has a tile
// for each game; tapping one opens that game's room (/games/<id>).

import { GAMES, tileId } from "@/lib/games/registry";

/** The Dubai Hills plot's centre (virtual coords) and the West Coast plot's. */
export const GAME_CITY = { id: "tile-dubai-hills-central", x: 1139, y: -12, name: "Game City · Dubai Hills" };
export const ACADEMIC_CITY = { id: "tile-west-coast-marina", name: "Academic City · West Coast" };

/** Renamed plots, by map entity id. */
export const DISTRICT_NAMES: Record<string, string> = { [GAME_CITY.id]: GAME_CITY.name, [ACADEMIC_CITY.id]: ACADEMIC_CITY.name };

/** The game tiles, in three rows of four centred on the plot and well inside its edges (back rows a little
 *  further right, following the slant), so none spills onto the roads around it. */
export const GAME_TILES = GAMES.map((g, i) => {
  const col = i % 4, row = Math.floor(i / 4);
  return {
    id: tileId(g.id), name: g.name, type: "game-tile", game: g.id,
    virtualX: GAME_CITY.x - 375 + col * 250 + (1 - row) * 48, virtualY: GAME_CITY.y + 205 - row * 205,
    width: 210, height: 140, generated: true as const, interactive: true,
  };
});
