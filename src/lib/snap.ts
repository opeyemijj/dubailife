"use client";

// Snaps: a photo of whatever 3D scene is on screen (a venue, your home, a race), to post to the City. The scene's
// SnapProbe registers how to capture it; the 📸 button asks the one most recently on screen. Snaps taken this session
// are kept (in memory) so the City's composer can offer them.

type Capture = () => Promise<Blob | null>;
const captures: { id: number; fn: Capture }[] = [];
let nextId = 1;

/** A scene says how to photograph it; returns how to stop. */
export function registerSnap(fn: Capture): () => void {
  const id = nextId++;
  captures.push({ id, fn });
  return () => { const i = captures.findIndex((c) => c.id === id); if (i >= 0) captures.splice(i, 1); };
}

/** Whether there's a scene on screen to photograph. */
export const canSnap = () => captures.length > 0;

export interface Snap { blob: Blob; url: string; at: number; place: string | null; placeName: string | null }
const recent: Snap[] = [];
export const recentSnaps = () => [...recent];

/** Photographs the scene on screen. */
export async function takeSnap(place: string | null = null, placeName: string | null = null): Promise<Snap | null> {
  const c = captures.at(-1);
  if (!c) return null;
  const blob = await c.fn();
  if (!blob) return null;
  const snap = { blob, url: URL.createObjectURL(blob), at: Date.now(), place, placeName };
  recent.unshift(snap);
  // Keep the last 12 this session.
  for (const old of recent.splice(12)) URL.revokeObjectURL(old.url);
  return snap;
}
