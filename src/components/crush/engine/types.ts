/* ------------------------------------------------------------------ */
/*  Potato Crush – core engine types (pure TS, no DOM)                 */
/* ------------------------------------------------------------------ */

export type Special = "none" | "stripedH" | "stripedV" | "wrapped" | "bomb";

/** Bomb tiles use this kind so they never colour-match. */
export const BOMB_KIND = -1;

export interface Tile {
  id: number;
  /** Index into the level's tile list, or BOMB_KIND for a colour bomb. */
  kind: number;
  special: Special;
  /** A wrapped tile that already exploded once and will explode again after falling. */
  armed: boolean;
}

export interface Cell {
  active: boolean;
  tile: Tile | null;
  /** Ice layers covering the tile (tile is frozen in place). */
  ice: number;
  /** Wooden crate HP occupying the cell (no tile while > 0). */
  crate: number;
  /** Butter slick HP occupying the cell (no tile while > 0). */
  butter: number;
  /** Soil layers under the tile (cleared by matching on top). */
  soil: number;
}

export interface Pos {
  r: number;
  c: number;
}

export type BlockerKind = "ice" | "crate" | "butter" | "soil";

export type RemoveCause = "match" | "blast" | "bomb" | "booster";

export interface RemovedTile {
  pos: Pos;
  tileId: number;
  kind: number;
  special: Special;
  cause: RemoveCause;
}

export interface CreatedSpecial {
  pos: Pos;
  tileId: number;
  kind: number;
  special: Special;
}

export interface BlockerHit {
  pos: Pos;
  kind: BlockerKind;
  remaining: number;
}

export type FireShape =
  | "row"
  | "col"
  | "cross"
  | "area3"
  | "area5"
  | "lines3"
  | "color"
  | "board";

export interface FiredSpecial {
  pos: Pos;
  shape: FireShape;
  /** Colour kind for "color" shape. */
  kind: number;
  targets: Pos[];
}

export interface ScorePop {
  pos: Pos;
  amount: number;
}

export interface FallMove {
  tileId: number;
  from: Pos;
  to: Pos;
}

export interface Spawn {
  tile: Tile;
  to: Pos;
  /** 0 = lowest spawned tile of that column segment, increasing upwards. */
  stack: number;
  /** Row just above the segment's top (where the tile visually enters). */
  entryRow: number;
}

export type Step =
  | { type: "swap"; a: Pos; b: Pos; revert: boolean }
  | {
      type: "clear";
      cascade: number;
      removed: RemovedTile[];
      created: CreatedSpecial[];
      blockers: BlockerHit[];
      fired: FiredSpecial[];
      score: number;
      pops: ScorePop[];
    }
  | { type: "fall"; moves: FallMove[]; spawns: Spawn[] }
  | { type: "shuffle"; placements: { tileId: number; to: Pos }[] }
  | { type: "convert"; tiles: { pos: Pos; tileId: number; special: Special }[] };

export type ObjectiveType = "collect" | "score" | "clear-blockers";

export interface Objective {
  type: ObjectiveType;
  /** Tile id from the catalogue, for "collect". */
  tileId?: string;
  target: number;
}

export type BoosterType = "masher" | "fryer-line" | "oil-splash" | "shuffle";

export type Difficulty = "easy" | "medium" | "hard";

export interface LevelDef {
  id: string;
  order: number;
  name: string;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  moves: number;
  tileIds: string[];
  objectives: Objective[];
  /**
   * Optional board layout, one string per row:
   * `.` hole  `o` normal  `s`/`S` soil ×1/×2  `c`/`C` crate hp1/hp2
   * `i`/`I` ice ×1/×2  `b` butter
   */
  layout?: string[];
  starScores: [number, number, number];
  boostersAllowed: BoosterType[];
  designerNote?: string;
}

export interface ObjectiveProgress {
  objective: Objective;
  current: number;
  target: number;
  done: boolean;
}

export interface BoardSnapshot {
  rows: number;
  cols: number;
  cells: Cell[][];
}
