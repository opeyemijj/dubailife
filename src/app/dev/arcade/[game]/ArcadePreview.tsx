"use client";

import { useEffect } from "react";
import { openArcade } from "@/components/arcade/launcher";
import type { ArcadeGameId } from "@/lib/arcade";

export function ArcadePreview({ game }: { game: string }) {
  // Query parameters become the game's params (e.g. ?demo=1&stage=2).
  useEffect(() => { openArcade({ game: game as ArcadeGameId, params: Object.fromEntries(new URLSearchParams(window.location.search)) }); }, [game]);
  return <main className="min-h-screen bg-black" />;
}
