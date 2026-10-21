// Game City (on the Dubai Hills plot) and Academic City (on the West Coast plot). Game City has a tile
// for each game; tapping one opens that game's room (/games/<id>).

import { GAMES, tileId } from "@/lib/games/registry";

/** The Dubai Hills plot's centre (virtual coords) and the West Coast plot's. */
export const GAME_CITY = { id: "tile-dubai-hills-central", x: 1139, y: -12, name: "Game City · Dubai Hills" };
export const ACADEMIC_CITY = { id: "tile-west-coast-marina", name: "Academic City · West Coast" };

/** Renamed plots, by map entity id. */
export const DISTRICT_NAMES: Record<string, string> = { [GAME_CITY.id]: GAME_CITY.name, [ACADEMIC_CITY.id]: ACADEMIC_CITY.name };

/**
 * The plot's shape (see FloorTile): a parallelogram whose sides lean by 0.2355 (13.25°, the map's slant)
 * and whose long edges tilt down to the right by 0.01667. Its long edges are (width − 0.2355 × height)
 * long. Tiles are placed in the plot's own directions, so rows follow its long edges and columns its sides.
 */
const PLOT = { width: 1250, height: 900 };
const SLANT = 0.2355, TILT = 0.01667;
const COLS = 5, TILE_W = 168, TILE_H = 118, PAD_X = 70, PAD_Y = 90;

/** Where a point at (u along the long edges, v along the sides) from the plot's centre sits on the map. */
const onPlot = (u: number, v: number) => ({ x: Math.round(GAME_CITY.x + u + v * SLANT), y: Math.round(GAME_CITY.y + v - u * TILT) });

/**
 * The game tiles on a grid of five columns, inside the plot with even padding all round; a short last
 * row is centred.
 */
export const GAME_TILES = (() => {
  const rows = Math.ceil(GAMES.length / COLS);
  const inner = PLOT.width - PLOT.height * SLANT - 2 * PAD_X;
  const colPitch = (inner - TILE_W) / (COLS - 1);
  const rowPitch = Math.min(200, (PLOT.height - 2 * PAD_Y - TILE_H) / Math.max(1, rows - 1));
  return GAMES.map((g, i) => {
    const row = Math.floor(i / COLS), col = i % COLS;
    const inRow = Math.min(COLS, GAMES.length - row * COLS);
    const u = (col - (inRow - 1) / 2) * colPitch;
    const v = ((rows - 1) / 2 - row) * rowPitch;
    const at = onPlot(u, v);
    return {
      id: tileId(g.id), name: g.name, type: "game-tile", game: g.id,
      virtualX: at.x, virtualY: at.y, width: TILE_W, height: TILE_H, generated: true as const, interactive: true,
    };
  });
})();
