/**
 * Leaderboard demo data. Rank is always computed from Season PB Points;
 * Coins never appear here (FRD §2). Replace OTHER_PLAYERS with the
 * season-score API when it exists.
 *
 * Every game also has its own board, ranked by the Season PB earned in that
 * game alone. For the demo, each mock player's per-game points are derived
 * deterministically from their season total.
 */

import { PB_GAME_LABELS, type PbGameId } from "@/data/pbEconomy";

export type LeaderboardTab = "season" | "lifetime";

export const LEADERBOARD_TABS: { id: LeaderboardTab; label: string }[] = [
  { id: "season", label: "Season" },
  { id: "lifetime", label: "Lifetime" },
];

/** Games that have their own leaderboard. Order = chip order on the PB screen. */
export const LEADERBOARD_GAMES: PbGameId[] = ["quiz-time", "potato-crush", "spud-run", "potato-sort", "potato-ninja", "word-scramble", "guess-disease", "fix-puzzle"];

export function isLeaderboardGame(value: string | null | undefined): value is PbGameId {
  return !!value && (LEADERBOARD_GAMES as string[]).includes(value);
}

export function gameLabel(gameId: PbGameId) {
  return PB_GAME_LABELS[gameId];
}

export type LeaderboardPlayer = {
  id: string;
  name: string;
  seasonPoints: number;
  lifetimePoints: number;
  /** Rank change since yesterday; positive = climbed. */
  movement: number;
};

export const OTHER_PLAYERS: LeaderboardPlayer[] = [
  { id: "spudking", name: "SpudKing", seasonPoints: 12850, lifetimePoints: 52430, movement: 0 },
  { id: "alooninja", name: "AlooNinja", seasonPoints: 11920, lifetimePoints: 45890, movement: 1 },
  { id: "tatertot", name: "TaterTot", seasonPoints: 10840, lifetimePoints: 32100, movement: -1 },
  { id: "mashpro", name: "MashPro", seasonPoints: 10420, lifetimePoints: 41220, movement: 2 },
  { id: "potatoplayz", name: "PotatoPlayz", seasonPoints: 9870, lifetimePoints: 38760, movement: -1 },
  { id: "spudbuddy", name: "SpudBuddy", seasonPoints: 9410, lifetimePoints: 29300, movement: 0 },
  { id: "chipper", name: "Chipper", seasonPoints: 9120, lifetimePoints: 21540, movement: 3 },
  { id: "taterqueen", name: "TaterQueen", seasonPoints: 8760, lifetimePoints: 48120, movement: 1 },
  { id: "fryguy", name: "FryGuy", seasonPoints: 7900, lifetimePoints: 19870, movement: -2 },
  { id: "mashiemoo", name: "MashieMoo", seasonPoints: 7240, lifetimePoints: 24310, movement: 0 },
  { id: "hashbrownie", name: "HashBrownie", seasonPoints: 6880, lifetimePoints: 17650, movement: 1 },
  { id: "spudnik", name: "SpudNik", seasonPoints: 6210, lifetimePoints: 26980, movement: -1 },
  { id: "tuberosa", name: "Tuberosa", seasonPoints: 5730, lifetimePoints: 15420, movement: 0 },
  { id: "chipchamp", name: "ChipChamp", seasonPoints: 5120, lifetimePoints: 13890, movement: 2 },
  { id: "russetrider", name: "RussetRider", seasonPoints: 4660, lifetimePoints: 11230, movement: -1 },
  { id: "goldenyukon", name: "GoldenYukon", seasonPoints: 4090, lifetimePoints: 9870, movement: 0 },
  { id: "latkelad", name: "LatkeLad", seasonPoints: 3510, lifetimePoints: 8640, movement: 1 },
  { id: "peelpro", name: "PeelPro", seasonPoints: 3240, lifetimePoints: 7120, movement: -1 },
  { id: "wedgewizard", name: "WedgeWizard", seasonPoints: 3010, lifetimePoints: 6410, movement: 0 },
  { id: "gnocchigirl", name: "GnocchiGirl", seasonPoints: 2860, lifetimePoints: 5290, movement: 1 },
  { id: "curlyfry", name: "CurlyFry", seasonPoints: 2730, lifetimePoints: 4860, movement: 0 },
  { id: "spudsprout", name: "SpudSprout", seasonPoints: 2590, lifetimePoints: 3420, movement: -1 },
  { id: "babytater", name: "BabyTater", seasonPoints: 2410, lifetimePoints: 2910, movement: 0 },
  { id: "tatertwin", name: "TaterTwin", seasonPoints: 2300, lifetimePoints: 2640, movement: 2 },
  { id: "minimash", name: "MiniMash", seasonPoints: 2150, lifetimePoints: 2380, movement: -1 },
  { id: "peeler", name: "Peeler", seasonPoints: 1980, lifetimePoints: 2210, movement: 0 },
];

/* ------------------------------------------------------------------ */
/*  Per-game demo points                                               */
/* ------------------------------------------------------------------ */

/** Rough share of a typical player's season PB that comes from each game. */
const GAME_SHARE: Record<PbGameId, number> = {
  "quiz-time": 0.24,
  "potato-crush": 0.2,
  "potato-sort": 0.12,
  "potato-ninja": 0.12,
  "word-scramble": 0.1,
  "guess-disease": 0.08,
  "fix-puzzle": 0.08,
  "spud-run": 0.14,
  "connect-potatoes": 0,
  "potato-stack": 0,
  "basket-blitz": 0,
  "mash-master": 0,
  "daily-challenge": 0,
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Deterministic per-game season PB for a mock player (±35% jitter around the share). */
export function gamePointsFor(player: LeaderboardPlayer, gameId: PbGameId): number {
  const share = GAME_SHARE[gameId] ?? 0;
  if (share === 0) return 0;
  const jitter = 0.65 + hash(`${player.id}:${gameId}`) * 0.7;
  return Math.round((player.seasonPoints * share * jitter) / 10) * 10;
}

/* ------------------------------------------------------------------ */
/*  Rank helpers                                                       */
/* ------------------------------------------------------------------ */

export type BoardRow = {
  id: string;
  rank: number;
  name: string;
  points: number;
  movement: number;
  isYou: boolean;
};

export function seasonRankFor(seasonPoints: number): number {
  return 1 + OTHER_PLAYERS.filter((p) => p.seasonPoints > seasonPoints).length;
}

export function lifetimeRankFor(lifetimePoints: number): number {
  return 1 + OTHER_PLAYERS.filter((p) => p.lifetimePoints > lifetimePoints).length;
}

/** Rank on one game's season board, given your season PB from that game. */
export function gameRankFor(gameId: PbGameId, gamePoints: number): number {
  return 1 + OTHER_PLAYERS.filter((p) => gamePointsFor(p, gameId) > gamePoints).length;
}

export type YouOnBoard = {
  name: string;
  seasonPoints: number;
  lifetimePoints: number;
  gameSeasonPoints: Partial<Record<PbGameId, number>>;
  movement: number;
  gameMovement?: Partial<Record<PbGameId, number>>;
};

/**
 * Build a ranked board. With `gameId`, rows use that game's season PB
 * (Season tab only); otherwise overall season or lifetime PB.
 */
export function buildBoard(tab: LeaderboardTab, you: YouOnBoard, gameId: PbGameId | null = null): BoardRow[] {
  const forGame = tab === "season" && gameId !== null;
  const rows = [
    ...OTHER_PLAYERS.map((p) => ({
      id: p.id,
      name: p.name,
      points: forGame ? gamePointsFor(p, gameId) : tab === "season" ? p.seasonPoints : p.lifetimePoints,
      movement: tab === "season" ? (forGame ? Math.round(p.movement * (hash(`${p.id}:${gameId}:m`) > 0.5 ? 1 : 0)) : p.movement) : 0,
      isYou: false,
    })),
    {
      id: "you",
      name: you.name,
      points: forGame ? (you.gameSeasonPoints[gameId] ?? 0) : tab === "season" ? you.seasonPoints : you.lifetimePoints,
      movement: tab === "season" ? (forGame ? (you.gameMovement?.[gameId] ?? 0) : you.movement) : 0,
      isYou: true,
    },
  ];
  rows.sort((a, b) => b.points - a.points);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
