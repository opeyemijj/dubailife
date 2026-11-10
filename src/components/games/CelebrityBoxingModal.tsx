"use client";

// "Challenge to a fight" from a profile, the feed, a party or a venue: opens the 3D Celebrity Boxing game
// (src/components/arcade/games/boxing) against that player's stand-in. Kept as a component so every place
// that offered the old boxing dialog opens the game without changing: it renders nothing itself.
//
// The old dialog's purse is gone: it paid the winner from their own phone with no check. Stakes come back
// with live player-against-player fights, held by the server; stand-in fights pay through the arcade's
// capped rewards (src/lib/arcade.ts).

import { useEffect, useRef } from "react";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { openArcade } from "@/components/arcade/launcher";

export interface BoxingOpponent {
  userId?: string;
  username: string;
  name: string;
  look?: AvatarLookProps;
}

interface CelebrityBoxingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opponent: BoxingOpponent;
  /** No longer used (see above). */
  initialPurse?: number;
  /** Told the fight's result line, to announce it where the challenge came from. */
  onBroadcastResult?: (summary: string) => void;
  /** Both players accepted: a live bout, the same fight on both phones (host = the challenger). */
  live?: { boutId: string; host: boolean } | null;
}

export function CelebrityBoxingModal({ open, onOpenChange, opponent, onBroadcastResult, live }: CelebrityBoxingModalProps) {
  const latest = useRef({ onOpenChange, onBroadcastResult });
  useEffect(() => { latest.current = { onOpenChange, onBroadcastResult }; });
  useEffect(() => {
    if (!open) return;
    openArcade({
      game: "boxing",
      params: { opponent: { username: opponent.username, name: `@${opponent.username}`, look: opponent.look }, live: live ?? undefined },
      onShare: (text) => latest.current.onBroadcastResult?.(text),
      onClose: () => latest.current.onOpenChange(false),
    });
  }, [open, opponent.username, opponent.name, opponent.look, live?.boutId]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
