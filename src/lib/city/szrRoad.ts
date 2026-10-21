// Where Sheikh Zayed Road runs and how the floor-ad strip north of it is laid out, shared by the mosaic
// (floorMosaic.ts), the buildings standing on it (szr.ts) and the coast (coast.ts).

export const CELL = 18; // px per mosaic cell on the map
export const ROWS = 8;

/** Centre line of Sheikh Zayed Road (virtual y); the mosaic's middle is MOSAIC_OFFSET units north of it. */
export const e11 = (x: number) => 1072 - (160 * (x + 3000)) / 9600;
export const MOSAIC_OFFSET = 120;

/** The strip's southern edge (by Sheikh Zayed Road), where buildings on it stand. */
export const stripFront = (x: number) => e11(x) + MOSAIC_OFFSET - (ROWS * CELL) / 2;
