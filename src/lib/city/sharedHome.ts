"use client";

// One home, one version: when two partners live together, the home's interior saved on the server (flats.interior:
// furniture plus the look: floor, walls, panels, bedding) is the only copy. Both of them (and visitors) read it and
// change it; each change is saved there and announced in the home's live room ({ type: "home" }) so everyone there
// reloads it at once.

import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeStyle, OwnedFurniture } from "@/lib/furniture";
import { getInterior, saveInteriorFull } from "./flats";

export interface SharedInterior { furniture: OwnedFurniture[]; style?: HomeStyle; shared?: boolean }

export function useSharedInterior(flatId: string | null) {
  const [data, setData] = useState<SharedInterior | null>(null);
  const saving = useRef(0);
  const load = useCallback(async () => {
    if (!flatId) return;
    const r = await getInterior(flatId);
    // Don't overwrite a change of ours that's still on its way.
    if (r.ok && saving.current === 0) setData({ furniture: r.data.interior?.furniture ?? [], style: r.data.interior?.style, shared: r.data.interior?.shared });
  }, [flatId]);
  useEffect(() => {
    if (!flatId) { setData(null); return; } // eslint-disable-line react-hooks/set-state-in-effect
    void load();
    // A fallback in case a live notice is missed.
    const t = setInterval(() => void load(), 30_000);
    const back = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", back);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", back); };
  }, [flatId, load]);
  /** Saves the new version (shown at once); false if the server refused. */
  const save = useCallback(async (next: SharedInterior) => {
    if (!flatId) return false;
    setData(next);
    saving.current++;
    const r = await saveInteriorFull(flatId, { furniture: next.furniture, style: next.style, shared: true });
    saving.current--;
    return r.ok;
  }, [flatId]);
  return { data, reload: load, save };
}
