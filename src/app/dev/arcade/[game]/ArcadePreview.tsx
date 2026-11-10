"use client";

import { useEffect } from "react";
import { openArcade } from "@/components/arcade/launcher";
import type { ArcadeGameId } from "@/lib/arcade";

export function ArcadePreview({ game }: { game: string }) {
  // Query parameters become the game's params (e.g. ?demo=1&stage=2).
  // ?bout=<id>&role=host|guest opens a live boxing bout (open the other role in a second window).
  useEffect(() => {
    const q: Record<string, unknown> = Object.fromEntries(new URLSearchParams(window.location.search));
    if (typeof q.bout === "string") {
      q.live = { boutId: q.bout, host: q.role !== "guest" };
      q.opponent = { username: q.role === "guest" ? "host-tester" : "guest-tester", name: q.role === "guest" ? "@host-tester" : "@guest-tester" };
    }
    openArcade({ game: game as ArcadeGameId, params: q });
  }, [game]);
  return <main className="min-h-screen bg-black" />;
}
