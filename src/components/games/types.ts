// What every game in Game City provides, so one room page can host any of them, against the computer
// or with other players.

import type { ComponentType } from "react";
import type { AvatarLookProps } from "@/components/avatar/roster";

export interface Seat {
  name: string;
  username?: string;
  look?: AvatarLookProps;
  /** A computer player (games against the AI). */
  ai?: boolean;
}

export interface Result {
  /** Seats that won (several = a shared win); empty = a draw. */
  winners: number[];
  /** Points per seat, where the game keeps score. */
  scores?: number[];
}

export interface BoardProps<S> {
  state: S;
  /** My seat. */
  me: number;
  seats: Seat[];
  /** Turn games: make a move (the new full state). */
  onMove: (next: S) => void;
  /** Race games: I've finished my round with this score (and, optionally, details to show). */
  onFinish?: (score: number, detail?: unknown) => void;
  /** False while a move is being saved or it isn't my turn. */
  canMove: boolean;
}

export interface GameModule<S> {
  /** A fresh game for this many seats. */
  init(seats: number, seed: number): S;
  /** Turn games: whose turn it is. Race games leave this out. */
  turnOf?(state: S): number | null;
  /** The computer's move for a seat (turn games), or its score for the round (race games). */
  ai(state: S, seat: number): S | Promise<S>;
  /** Race games: record a seat's finished score in the state. */
  finish?(state: S, seat: number, score: number): S;
  /** How long to wait before the computer moves (e.g. until a pool shot stops rolling). */
  delay?(state: S): number;
  /** The result once the game is over, null while it's running. */
  result(state: S): Result | null;
  Board: ComponentType<BoardProps<S>>;
}
