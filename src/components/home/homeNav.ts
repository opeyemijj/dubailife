// Walking at home: the floor is a grid of quarter-metre cells. Cells outside the rooms, along walls
// (except through doorways), under counters and under furniture are closed; the citizen takes the
// shortest open route, straightened wherever there's a clear line, so they go round walls and through
// doors instead of through them.

export type Seg = { a: [number, number]; b: [number, number]; door?: [number, number] };
export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

export interface NavMap { minX: number; minZ: number; cols: number; rows: number; open: Uint8Array }

const RES = 0.25;
const BODY = 0.2;        // how close the citizen's middle comes to a wall
const FURNITURE_GAP = 0.12;

function distToSeg(px: number, pz: number, s: Seg) {
  const vx = s.b[0] - s.a[0], vz = s.b[1] - s.a[1];
  const len = Math.hypot(vx, vz);
  const t = Math.max(0, Math.min(len, ((px - s.a[0]) * vx + (pz - s.a[1]) * vz) / len));
  return { d: Math.hypot(px - (s.a[0] + (vx / len) * t), pz - (s.a[1] + (vz / len) * t)), t };
}

export function buildNav(rooms: Rect[], walls: Seg[], blocks: Rect[]): NavMap {
  const minX = Math.min(...rooms.map((r) => r.minX)), maxX = Math.max(...rooms.map((r) => r.maxX));
  const minZ = Math.min(...rooms.map((r) => r.minZ)), maxZ = Math.max(...rooms.map((r) => r.maxZ));
  const cols = Math.round((maxX - minX) / RES), rows = Math.round((maxZ - minZ) / RES);
  const open = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = minX + (c + 0.5) * RES, z = minZ + (r + 0.5) * RES;
    // Inside a room, clear of its outer edge.
    const inRoom = rooms.some((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ);
    const nearEdge = x < minX + BODY || x > maxX - BODY || z < minZ + BODY || z > maxZ - BODY;
    if (!inRoom || nearEdge) continue;
    // Away from walls, unless passing through the doorway.
    const blockedByWall = walls.some((w) => {
      const { d, t } = distToSeg(x, z, w);
      if (d >= BODY) return false;
      return !(w.door && t > w.door[0] + 0.1 && t < w.door[1] - 0.1);
    });
    if (blockedByWall) continue;
    if (blocks.some((b) => x > b.minX - FURNITURE_GAP && x < b.maxX + FURNITURE_GAP && z > b.minZ - FURNITURE_GAP && z < b.maxZ + FURNITURE_GAP)) continue;
    open[r * cols + c] = 1;
  }
  return { minX, minZ, cols, rows, open };
}

const cellOf = (n: NavMap, x: number, z: number): [number, number] => [
  Math.max(0, Math.min(n.cols - 1, Math.floor((x - n.minX) / RES))),
  Math.max(0, Math.min(n.rows - 1, Math.floor((z - n.minZ) / RES))),
];
const centre = (n: NavMap, c: number, r: number): [number, number] => [n.minX + (c + 0.5) * RES, n.minZ + (r + 0.5) * RES];
const isOpen = (n: NavMap, c: number, r: number) => c >= 0 && r >= 0 && c < n.cols && r < n.rows && n.open[r * n.cols + c] === 1;

/** The nearest open cell to a point (the point itself if it's open). */
function nearestOpen(n: NavMap, x: number, z: number): [number, number] | null {
  const [c0, r0] = cellOf(n, x, z);
  if (isOpen(n, c0, r0)) return [c0, r0];
  for (let rad = 1; rad < Math.max(n.cols, n.rows); rad++) {
    let best: [number, number] | null = null, bestD = Infinity;
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad || !isOpen(n, c0 + dc, r0 + dr)) continue;
      const [cx, cz] = centre(n, c0 + dc, r0 + dr);
      const d = Math.hypot(cx - x, cz - z);
      if (d < bestD) { bestD = d; best = [c0 + dc, r0 + dr]; }
    }
    if (best) return best;
  }
  return null;
}

/** True when a straight walk between two points stays on open cells. */
function clearLine(n: NavMap, a: [number, number], b: [number, number]) {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (RES / 3));
  for (let i = 0; i <= steps; i++) {
    const [c, r] = cellOf(n, a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps);
    if (!isOpen(n, c, r)) return false;
  }
  return true;
}

/**
 * Waypoints from `from` to `to`, or to the reachable spot nearest it (a tap on furniture or in a sealed-off
 * corner walks as close as the rooms allow). Empty when nowhere can be reached.
 */
export function findPath(n: NavMap, from: [number, number], to: [number, number]): Array<[number, number]> {
  const s = nearestOpen(n, from[0], from[1]);
  if (!s) return [];
  const idx = (c: number, r: number) => r * n.cols + c;
  // Every cell reachable from here, with the shortest way to it (the grid is small: Dijkstra is plenty).
  const dist = new Float32Array(n.cols * n.rows).fill(Infinity);
  const came = new Int32Array(n.cols * n.rows).fill(-1);
  const done = new Uint8Array(n.cols * n.rows);
  const queue: Array<[number, number]> = [[0, idx(s[0], s[1])]];
  dist[idx(s[0], s[1])] = 0;
  while (queue.length) {
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i][0] < queue[bi][0]) bi = i;
    const [, cur] = queue.splice(bi, 1)[0];
    if (done[cur]) continue;
    done[cur] = 1;
    const cc = cur % n.cols, cr = Math.floor(cur / n.cols);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dc && !dr) continue;
      const nc = cc + dc, nr = cr + dr;
      if (!isOpen(n, nc, nr)) continue;
      // No cutting corners past a wall end.
      if (dc && dr && (!isOpen(n, cc + dc, cr) || !isOpen(n, cc, cr + dr))) continue;
      const ni = idx(nc, nr);
      const d = dist[cur] + (dc && dr ? Math.SQRT2 : 1);
      if (d < dist[ni]) { dist[ni] = d; came[ni] = cur; queue.push([d, ni]); }
    }
  }
  // The reachable cell nearest the destination.
  let goal = -1, best = Infinity;
  for (let i = 0; i < done.length; i++) {
    if (!done[i]) continue;
    const [x, z] = centre(n, i % n.cols, Math.floor(i / n.cols));
    const d = Math.hypot(x - to[0], z - to[1]);
    if (d < best) { best = d; goal = i; }
  }
  if (goal < 0) return [];
  const [gc, gr] = cellOf(n, to[0], to[1]);
  const goalPoint: [number, number] = goal === idx(gc, gr) ? to : centre(n, goal % n.cols, Math.floor(goal / n.cols));
  const cells: Array<[number, number]> = [];
  for (let at = goal; at !== -1; at = came[at]) cells.unshift(centre(n, at % n.cols, Math.floor(at / n.cols)));
  cells[cells.length - 1] = goalPoint;
  // Straighten: from each point, jump to the furthest one in plain sight.
  const out: Array<[number, number]> = [];
  let at: [number, number] = from;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !clearLine(n, at, cells[j])) j--;
    out.push(cells[j]);
    at = cells[j];
    i = j + 1;
  }
  return out;
}
