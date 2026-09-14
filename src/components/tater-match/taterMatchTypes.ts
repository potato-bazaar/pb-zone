export type TileKind =
  | "potato"
  | "bag"
  | "leaf"
  | "tractor"
  | "onion"
  | "crate";

export type Phase = "intro" | "play" | "complete";

export type LevelResult = {
  level: number;
  score: number;
  movesBonus: number;
  pbPoints: number;
  stars: number;
};

export const COLS = 5;
export const ROWS = 7;
export const TILE_KINDS: TileKind[] = [
  "potato",
  "bag",
  "leaf",
  "tractor",
  "onion",
  "crate",
];

export const GOAL_TILE: TileKind = "potato";
export const START_MOVES = 20;
export const START_GOAL = 18;
