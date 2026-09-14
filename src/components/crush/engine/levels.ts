import type { BoosterType, LevelDef, Objective } from "./types";

/* ------------------------------------------------------------------ */
/*  Tile catalogue (ids match the admin "Level Pack" schema)           */
/* ------------------------------------------------------------------ */

export interface TileArt {
  id: string;
  label: string;
  /** Light → mid → dark gradient stops. */
  colors: [string, string, string];
  /** Accent used for particles / glow. */
  glow: string;
  shape: "potato" | "fries" | "sweet" | "gem" | "chip" | "leaf";
}

export const TILE_CATALOG: TileArt[] = [
  {
    id: "russet",
    label: "Russet Spud",
    colors: ["#F1CC8F", "#C8965A", "#7C4F22"],
    glow: "#F6D28B",
    shape: "potato",
  },
  {
    id: "fries",
    label: "Crinkle Fries",
    colors: ["#FFE082", "#FFB300", "#D84315"],
    glow: "#FFD54F",
    shape: "fries",
  },
  {
    id: "sweet",
    label: "Sweet Potato",
    colors: ["#FFAB76", "#F0642F", "#9C2B0B"],
    glow: "#FF8A50",
    shape: "sweet",
  },
  {
    id: "vitelotte",
    label: "Purple Vitelotte",
    colors: ["#D9A8FF", "#9B4DE0", "#4A1D7A"],
    glow: "#C58CFF",
    shape: "gem",
  },
  {
    id: "chip",
    label: "Golden Chip",
    colors: ["#FFF3A6", "#F5C518", "#B8860B"],
    glow: "#FFE566",
    shape: "chip",
  },
  {
    id: "sprout",
    label: "Fresh Sprout",
    colors: ["#B9F27A", "#5DBE3B", "#1F6B23"],
    glow: "#9BE86B",
    shape: "leaf",
  },
];

export const ALL_BOOSTERS: BoosterType[] = [
  "masher",
  "fryer-line",
  "oil-splash",
  "shuffle",
];

export const BOOSTER_INFO: Record<
  BoosterType,
  { label: string; emoji: string; price: number; blurb: string }
> = {
  masher: {
    label: "Masher",
    emoji: "🔨",
    price: 150,
    blurb: "Tap any tile to mash it.",
  },
  "fryer-line": {
    label: "Fryer Line",
    emoji: "🍟",
    price: 250,
    blurb: "Clears a full row and column.",
  },
  "oil-splash": {
    label: "Oil Splash",
    emoji: "💥",
    price: 250,
    blurb: "Blasts a 3×3 area.",
  },
  shuffle: {
    label: "Shuffle",
    emoji: "🔀",
    price: 100,
    blurb: "Re-deals the whole board.",
  },
};

export const STARTING_BOOSTERS: Record<BoosterType, number> = {
  masher: 3,
  "fryer-line": 2,
  "oil-splash": 2,
  shuffle: 2,
};

export const SCORE_PER_TILE = 60;
export const COMBO_MULTIPLIER = 0.5;
export const MAX_LIVES = 5;
export const LIFE_REFILL_MS = 30 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  Level pack                                                         */
/* ------------------------------------------------------------------ */

const collect = (tileId: string, target: number): Objective => ({
  type: "collect",
  tileId,
  target,
});
const score = (target: number): Objective => ({ type: "score", target });
const blockers = (): Objective => ({ type: "clear-blockers", target: 0 });

type LevelInput = Omit<LevelDef, "id" | "order" | "boostersAllowed"> & {
  boostersAllowed?: BoosterType[];
};

const raw: LevelInput[] = [
  {
    name: "First Harvest",
    difficulty: "easy",
    rows: 7,
    cols: 7,
    moves: 20,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip"],
    objectives: [score(5000)],
    starScores: [5000, 7500, 11000],
    designerNote: "Gentle warm-up. Four tiles, plenty of moves.",
  },
  {
    name: "Fry Day",
    difficulty: "easy",
    rows: 7,
    cols: 7,
    moves: 20,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip"],
    objectives: [collect("fries", 50)],
    starScores: [13500, 21500, 31500],
  },
  {
    name: "Golden Chips",
    difficulty: "easy",
    rows: 8,
    cols: 8,
    moves: 22,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip"],
    objectives: [collect("chip", 50), collect("russet", 40)],
    starScores: [15500, 24000, 35000],
  },
  {
    name: "Sweet Corners",
    difficulty: "easy",
    rows: 8,
    cols: 8,
    moves: 22,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip"],
    objectives: [score(9500)],
    layout: [
      "..oooo..",
      ".oooooo.",
      "oooooooo",
      "oooooooo",
      "oooooooo",
      "oooooooo",
      ".oooooo.",
      "..oooo..",
    ],
    starScores: [9500, 14500, 21000],
  },
  {
    name: "Muddy Field",
    difficulty: "easy",
    rows: 8,
    cols: 8,
    moves: 24,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip"],
    objectives: [blockers()],
    layout: [
      "oooooooo",
      "osssssso",
      "osssssso",
      "ossSSsso",
      "ossSSsso",
      "osssssso",
      "osssssso",
      "oooooooo",
    ],
    starScores: [12000, 19000, 27500],
  },
  {
    name: "Crate Crossing",
    difficulty: "medium",
    rows: 8,
    cols: 8,
    moves: 24,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip"],
    objectives: [blockers()],
    layout: [
      "oooooooo",
      "oooooooo",
      "oooCCooo",
      "ooCCCCoo",
      "ooCCCCoo",
      "oooCCooo",
      "oooooooo",
      "oooooooo",
    ],
    starScores: [8500, 13500, 20000],
  },
  {
    name: "Purple Peru",
    difficulty: "medium",
    rows: 8,
    cols: 8,
    moves: 24,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip"],
    objectives: [collect("vitelotte", 70), score(19000)],
    starScores: [19000, 29500, 43000],
  },
  {
    name: "Cold Storage",
    difficulty: "medium",
    rows: 8,
    cols: 8,
    moves: 28,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip"],
    objectives: [blockers()],
    layout: [
      "iooooooi",
      "oiooooio",
      "ooiIIioo",
      "oiIooIio",
      "oiIooIio",
      "ooiIIioo",
      "oiooooio",
      "iooooooi",
    ],
    starScores: [15500, 24500, 35500],
  },
  {
    name: "Butter Slide",
    difficulty: "medium",
    rows: 8,
    cols: 8,
    moves: 26,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [blockers(), collect("sprout", 30)],
    layout: [
      "oooooooo",
      "oooooooo",
      "obbbbbbo",
      "oooooooo",
      "oooooooo",
      "obbbbbbo",
      "oooooooo",
      "oooooooo",
    ],
    starScores: [8500, 13500, 19500],
  },
  {
    name: "Chip Shop Nights",
    difficulty: "medium",
    rows: 9,
    cols: 8,
    moves: 28,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [collect("chip", 35), collect("fries", 35)],
    layout: [
      "ooo..ooo",
      "oooooooo",
      "oooooooo",
      "oooooooo",
      "oooooooo",
      "oooooooo",
      "oooooooo",
      "oooooooo",
      "ooo..ooo",
    ],
    starScores: [10500, 16500, 24000],
  },
  {
    name: "Deep Soil",
    difficulty: "medium",
    rows: 9,
    cols: 8,
    moves: 28,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip"],
    objectives: [blockers()],
    layout: [
      "ssssssss",
      "sooooooS",
      "soSSSSoS",
      "soSooSoS",
      "soSooSoS",
      "soSooSoS",
      "soSSSSoS",
      "sooooooS",
      "ssssssss",
    ],
    starScores: [26000, 40500, 59000],
  },
  {
    name: "Frozen Fries",
    difficulty: "hard",
    rows: 9,
    cols: 8,
    moves: 36,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [blockers(), collect("fries", 30)],
    layout: [
      "iooooooi",
      "oiooooio",
      "ooiooioo",
      "oooIIooo",
      "oooIIooo",
      "oooIIooo",
      "ooiooioo",
      "oiooooio",
      "iooooooi",
    ],
    starScores: [10500, 17000, 24500],
  },
  {
    name: "The Cellar",
    difficulty: "hard",
    rows: 9,
    cols: 8,
    moves: 36,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [blockers()],
    layout: [
      "oooooooo",
      "oCCooCCo",
      "oCoooooo",
      "oooooooo",
      "ooosSooo",
      "ooosSooo",
      "oooooooo",
      "ooooooCo",
      "oCCooCCo",
    ],
    starScores: [14000, 22000, 32500],
  },
  {
    name: "Harvest Moon",
    difficulty: "hard",
    rows: 9,
    cols: 9,
    moves: 30,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [score(10000)],
    layout: [
      "...ooo...",
      ".ooooooo.",
      ".ooooooo.",
      "ooooooooo",
      "ooooooooo",
      "ooooooooo",
      ".ooooooo.",
      ".ooooooo.",
      "...ooo...",
    ],
    starScores: [10000, 15500, 22500],
  },
  {
    name: "Loaded Fries Fiesta",
    difficulty: "hard",
    rows: 9,
    cols: 9,
    moves: 32,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [collect("fries", 60), collect("sweet", 40), collect("sprout", 40)],
    starScores: [15000, 24000, 34500],
  },
  {
    name: "Ice Box",
    difficulty: "hard",
    rows: 9,
    cols: 9,
    moves: 44,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [blockers()],
    layout: [
      "iiiiiiiii",
      "ooooooooo",
      "ooobbbooo",
      "oobsssboo",
      "oobsSsboo",
      "oobsssboo",
      "ooobbbooo",
      "ooooooooo",
      "iiiiiiiii",
    ],
    starScores: [18500, 28500, 42000],
  },
  {
    name: "Farm to Fryer",
    difficulty: "hard",
    rows: 9,
    cols: 9,
    moves: 34,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [blockers(), score(14500)],
    layout: [
      "CoooooooC",
      "ocooooCoo",
      "oocoocooo",
      "ooooooooo",
      "ooooooooo",
      "ooooooooo",
      "oocoocooo",
      "oCooooCoo",
      "CoooooooC",
    ],
    starScores: [14500, 23000, 33500],
  },
  {
    name: "Mash Master",
    difficulty: "hard",
    rows: 9,
    cols: 9,
    moves: 36,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [collect("russet", 50), collect("vitelotte", 50)],
    layout: [
      "oooo.oooo",
      "oooo.oooo",
      "ooooooooo",
      "ooooooooo",
      ".ooooooo.",
      "ooooooooo",
      "ooooooooo",
      "oooo.oooo",
      "oooo.oooo",
    ],
    starScores: [14000, 21500, 31500],
  },
  {
    name: "Spud Royale",
    difficulty: "hard",
    rows: 9,
    cols: 9,
    moves: 44,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [blockers(), collect("chip", 40)],
    layout: [
      "sssssssss",
      "sIoooooIs",
      "soCoooCos",
      "sooooooos",
      "soobbboos",
      "sooooooos",
      "soCoooCos",
      "sIoooooIs",
      "sssssssss",
    ],
    starScores: [21000, 33000, 48000],
  },
  {
    name: "Potato Crown",
    difficulty: "hard",
    rows: 9,
    cols: 9,
    moves: 38,
    tileIds: ["russet", "fries", "sweet", "vitelotte", "chip", "sprout"],
    objectives: [score(16000), blockers()],
    layout: [
      "o.o.o.o.o",
      "ooooooooo",
      "oCoiiioCo",
      "ooiSSSioo",
      "ooiSCSioo",
      "ooiSSSioo",
      "oCoiiioCo",
      "ooooooooo",
      "ooooooooo",
    ],
    starScores: [16000, 25000, 36500],
  },
];

export const LEVELS: LevelDef[] = raw.map((lvl, i) => ({
  ...lvl,
  id: `crush-${i + 1}`,
  order: i + 1,
  boostersAllowed: lvl.boostersAllowed ?? ALL_BOOSTERS,
}));

export function getLevel(order: number): LevelDef | undefined {
  return LEVELS.find((l) => l.order === order);
}

export function tileArt(tileId: string): TileArt {
  return TILE_CATALOG.find((t) => t.id === tileId) ?? TILE_CATALOG[0];
}
