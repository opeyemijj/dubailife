"use client";

// Shows the attraction game opened with openArcade(). Each game is its own chunk, loaded on demand: nothing
// here is downloaded until a game is opened. Games are registered in GAMES as they're built.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ArcadeGameId } from "@/lib/arcade";
import { closeArcade, useArcadeLaunch } from "./launcher";
import { useScreenBusy } from "@/lib/popups";

export interface ArcadeGameProps {
  params?: Record<string, unknown>;
  onClose: () => void;
  onShare?: (text: string) => void;
}

const loading = () => (
  <div className="fixed inset-0 z-[400] bg-black flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-4 border-white/15 border-t-amber-400 animate-spin" aria-label="Loading the game" />
  </div>
);

const GAMES: Partial<Record<ArcadeGameId, ComponentType<ArcadeGameProps>>> = {
  boxing: dynamic(() => import("./games/boxing/BoxingGame"), { ssr: false, loading }),
  gym: dynamic(() => import("./games/gym/GymGame"), { ssr: false, loading }),
  scan: dynamic(() => import("./games/maternity/ScanGame"), { ssr: false, loading }),
  labour: dynamic(() => import("./games/maternity/LabourGame"), { ssr: false, loading }),
  court: dynamic(() => import("./games/court/CourtGame"), { ssr: false, loading }),
  hall: dynamic(() => import("./games/events/EventGame"), { ssr: false, loading }),
  bridal: dynamic(() => import("./games/bridal/BridalGame"), { ssr: false, loading }),
  nails: dynamic(() => import("./games/nails/NailGame"), { ssr: false, loading }),
  goldsouk: dynamic(() => import("./games/goldsouk/GoldSoukGame"), { ssr: false, loading }),
};

export function ArcadeHost() {
  const launch = useArcadeLaunch();
  // A game on: popups wait until it's over (lib/popups).
  useScreenBusy(!!launch);
  if (!launch) return null;
  const Game = GAMES[launch.game];
  if (!Game) return null;
  return <Game params={launch.params} onClose={closeArcade} onShare={launch.onShare} />;
}
