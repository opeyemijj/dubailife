// The outfits a citizen has bought (roster outfits with a price), kept on this device: the wardrobe and the
// bridal shops share it. Reads and writes are guarded (private windows, blocked storage).

const OWNED_CLOSET_KEY = "dl_owned_closet_v1";

export function loadOwnedCloset(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OWNED_CLOSET_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveOwnedCloset(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OWNED_CLOSET_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // ignore storage errors
  }
}
