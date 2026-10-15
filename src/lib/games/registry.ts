// The games in Game City (Dubai Hills). All free. Each has a tile on the map and its own room.

export type GameId = "ludo" | "chess" | "dominoes" | "pool" | "word" | "trivia" | "connect4" | "battleship" | "checkers" | "snakes" | "snake" | "memory";

export interface GameInfo {
  id: GameId;
  name: string;
  tagline: string;
  icon: string;
  /** Tile colours on the map and in the room. */
  bg: string;
  fg: string;
  accent: string;
  minPlayers: number;
  maxPlayers: number;
  /** Turn-based (players take turns) or a race (everyone plays the same round at once). */
  kind: "turns" | "race";
  rules: string;
}

export const GAMES: GameInfo[] = [
  { id: "ludo", name: "Ludo", tagline: "Race your four tokens home", icon: "🎲", bg: "#fef3c7", fg: "#7c2d12", accent: "#dc2626", minPlayers: 2, maxPlayers: 4, kind: "turns",
    rules: "Roll a 6 to bring a token out. Move round the board and into your home column. Land on a rival to send them back. First to get all four tokens home wins." },
  { id: "chess", name: "Chess", tagline: "Checkmate the king", icon: "♟️", bg: "#1c1917", fg: "#fafaf9", accent: "#d4af37", minPlayers: 2, maxPlayers: 2, kind: "turns",
    rules: "Standard chess. Tap a piece, then the square to move to. Pawns become queens when they reach the far side." },
  { id: "dominoes", name: "Dominoes", tagline: "Match the ends, empty your hand", icon: "🁫", bg: "#f8fafc", fg: "#0f172a", accent: "#0f766e", minPlayers: 2, maxPlayers: 4, kind: "turns",
    rules: "Double-six draw dominoes. Play a tile that matches either open end. Can't play? Draw from the boneyard. First to empty their hand wins; if everyone is blocked, the lowest hand wins." },
  { id: "pool", name: "Pool", tagline: "8-ball on the felt", icon: "🎱", bg: "#14532d", fg: "#ecfccb", accent: "#facc15", minPlayers: 2, maxPlayers: 2, kind: "turns",
    rules: "Drag back from the cue ball to aim and set power, then let go. Pot all your group (solids or stripes), then the 8-ball. Pot the white and your turn ends." },
  { id: "word", name: "Word Tile Challenge", tagline: "Make words from 7 tiles", icon: "🔤", bg: "#e0e7ff", fg: "#312e81", accent: "#4f46e5", minPlayers: 2, maxPlayers: 4, kind: "race",
    rules: "Everyone gets the same seven letter tiles. Make as many words (3+ letters) as you can in 90 seconds. Longer words and rare letters score more." },
  { id: "trivia", name: "Trivia Quiz", tagline: "Dubai, the world and more", icon: "❓", bg: "#fdf2f8", fg: "#831843", accent: "#db2777", minPlayers: 2, maxPlayers: 4, kind: "race",
    rules: "Ten questions, 15 seconds each. Faster correct answers score more. Everyone gets the same questions." },
  { id: "connect4", name: "Connect Four", tagline: "Four in a row wins", icon: "🔴", bg: "#1d4ed8", fg: "#ffffff", accent: "#facc15", minPlayers: 2, maxPlayers: 2, kind: "turns",
    rules: "Drop your discs into the columns. First to line up four in a row — across, down or diagonally — wins." },
  { id: "battleship", name: "Sea Battle", tagline: "Sink the enemy fleet", icon: "🚢", bg: "#0c4a6e", fg: "#e0f2fe", accent: "#f97316", minPlayers: 2, maxPlayers: 2, kind: "turns",
    rules: "Both fleets are hidden at sea. Take turns firing at the enemy's waters — a hit earns another shot. Sink all five enemy ships to win." },
  { id: "checkers", name: "Checkers", tagline: "Jump, capture, crown", icon: "⛀", bg: "#7f1d1d", fg: "#fef2f2", accent: "#fbbf24", minPlayers: 2, maxPlayers: 2, kind: "turns",
    rules: "Move diagonally forward. Jumping over a rival's piece captures it, and captures are compulsory — chain them when you can. Reach the far side to be crowned and move both ways." },
  { id: "snakes", name: "Snakes & Ladders", tagline: "Climb up, slide down", icon: "🪜", bg: "#ecfccb", fg: "#365314", accent: "#16a34a", minPlayers: 2, maxPlayers: 4, kind: "turns",
    rules: "Roll and move. Ladders take you up, snakes take you down. First to land exactly on 100 wins." },
  { id: "snake", name: "Snake", tagline: "Eat, grow, don't crash", icon: "🐍", bg: "#052e16", fg: "#bbf7d0", accent: "#22c55e", minPlayers: 2, maxPlayers: 4, kind: "race",
    rules: "Steer the snake to eat the dates and grow. Don't hit the walls or yourself — it speeds up as you grow. Highest score wins." },
  { id: "memory", name: "Memory Match", tagline: "Find the Dubai pairs", icon: "🃏", bg: "#fff7ed", fg: "#7c2d12", accent: "#ea580c", minPlayers: 2, maxPlayers: 4, kind: "race",
    rules: "Flip two cards at a time to find matching Dubai landmarks. Fewer flips and a faster time score more." },
];

export const gameInfo = (id: string) => GAMES.find((g) => g.id === id) ?? null;

/** Map entity id of a game's tile in Game City. */
export const tileId = (id: GameId) => `game-tile-${id}`;
