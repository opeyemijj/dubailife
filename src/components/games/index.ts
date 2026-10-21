import type { GameId } from "@/lib/games/registry";
import type { GameModule } from "./types";
import { chess } from "./ChessGame";
import { dominoes } from "./Dominoes";
import { ludo } from "./Ludo";
import { pool } from "./Pool";
import { trivia } from "./Trivia";
import { word } from "./WordTiles";
import { connect4 } from "./ConnectFour";
import { battleship } from "./SeaBattle";
import { checkers } from "./Checkers";
import { snakes } from "./SnakesLadders";
import { snake } from "./SnakeArcade";
import { memory } from "./Memory";
import { candy } from "./CandyMatch";
import { tetris } from "./TetrisGame";
import { tycoon } from "./DubaiTycoon";
import { trading } from "./BusinessEmpire";
import { draw } from "./DrawGuess";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MODULES: Record<GameId, GameModule<any>> = {
  ludo,
  chess,
  dominoes,
  pool,
  word,
  trivia,
  connect4,
  battleship,
  checkers,
  snakes,
  snake,
  memory,
  candy,
  tetris,
  tycoon,
  trading,
  draw,
};
