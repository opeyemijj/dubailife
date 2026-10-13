"use client";

// Real numbers for the landing page: total visits (counted once per browser session) and how many
// homes exist in the city.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

let visitCounted = false;

export function useSiteStats() {
  const [visits, setVisits] = useState<number | null>(null);
  const [homes, setHomes] = useState<number | null>(null);
  useEffect(() => {
    const db = supabase();
    (async () => {
      let first = !visitCounted;
      try {
        if (sessionStorage.getItem("visit-counted")) first = false;
        sessionStorage.setItem("visit-counted", "1");
      } catch { /* storage blocked */ }
      visitCounted = true;
      if (first) await db.rpc("track_site_visit");
      const [{ data: total }, { count }] = await Promise.all([
        db.rpc("site_visits_total"),
        db.from("flats").select("id", { count: "exact", head: true }),
      ]);
      setVisits(Number(total ?? 0));
      setHomes(count ?? null);
    })();
  }, []);
  return { visits, homes };
}

export const compact = (n: number | null) => (n === null ? "…" : n >= 1e6 ? `${(n / 1e6).toFixed(1)}m` : n >= 1000 ? `${(n / 1000).toFixed(n >= 1e4 ? 0 : 1)}k` : n.toLocaleString());
