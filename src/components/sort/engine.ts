/**
 * Potato Sort — pure game rules (no DOM).
 *
 * Potatoes ride a conveyor; the player drags each one into the matching bin
 * before it falls off the end. Scoring follows the FRD's Basket Blitz table.
 */

export type PotatoKind = "good" | "premium" | "damaged" | "small";

export type Bin = {
  id: PotatoKind;
  label: string;
  blurb: string;
  /** Tailwind-free colours so the bins can be styled inline. */
  color: string;
  dark: string;
  icon: "potato" | "star" | "crack" | "small";
  /** Two-line caption printed on the bin face. */
  lines: [string, string];
  /** Rendered crate art in public/games/sort. */
  art: string;
};

export const BINS: Bin[] = [
  { id: "good", label: "Good", blurb: "Clean & healthy. To storage.", lines: ["Clean & Healthy", "To Storage"], color: "#2E9E44", dark: "#1F6E2F", icon: "potato", art: "bin-good.webp" },
  { id: "premium", label: "Premium", blurb: "Best quality. Higher value.", lines: ["Best Quality", "Higher Value"], color: "#E2B01C", dark: "#A67E0B", icon: "star", art: "bin-premium.webp" },
  { id: "damaged", label: "Damaged", blurb: "Cuts & bruises. Not for storage.", lines: ["Cuts, Bruises", "Not for Storage"], color: "#D9412E", dark: "#9E2A1C", icon: "crack", art: "bin-damaged.webp" },
  { id: "small", label: "Small", blurb: "Undersized. Keep separate.", lines: ["Undersized", "Separate"], color: "#6B7280", dark: "#4B5563", icon: "small", art: "bin-small.webp" },
];

export const ROUND_SECONDS = 45;
export const ROUND_POTATOES = 30;
/** Seconds a potato takes to travel the whole belt. */
export const TRAVEL_SECONDS = 5.5;
/** Seconds between spawns. 30 potatoes spawn within ~38 s of a 45 s round. */
export const SPAWN_SECONDS = 1.3;
/** A sort counts as "fast" if the potato is binned within this long of appearing. */
export const FAST_SECONDS = 2;

export type Potato = {
  id: number;
  kind: PotatoKind;
  /** Horizontal lane, 0..1 across the belt. */
  lane: number;
  /** 0 at the far end of the belt, 1 when it falls off the near end. */
  progress: number;
  /** Time (ms) the potato appeared. */
  spawnedAt: number;
  /** Seed for procedural spots / shape. */
  seed: number;
  /** Frozen while the player holds it. */
  held: boolean;
};

export type RoundStats = {
  correct: number;
  fast: number;
  wrong: number;
  missed: number;
  combo: number;
  maxCombo: number;
  combo5: number;
  combo10: number;
  handled: number;
  /** Running PB / coin totals for the HUD (final totals come from scoring.ts). */
  points: number;
  coins: number;
  perBin: Record<PotatoKind, number>;
};

export function emptyStats(): RoundStats {
  return {
    correct: 0,
    fast: 0,
    wrong: 0,
    missed: 0,
    combo: 0,
    maxCombo: 0,
    combo5: 0,
    combo10: 0,
    handled: 0,
    points: 0,
    coins: 0,
    perBin: { good: 0, premium: 0, damaged: 0, small: 0 },
  };
}

/** Small deterministic PRNG so a round can be replayed from its seed. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KIND_WEIGHTS: [PotatoKind, number][] = [
  ["good", 0.36],
  ["premium", 0.2],
  ["damaged", 0.24],
  ["small", 0.2],
];

export function pickKind(rng: () => number): PotatoKind {
  const r = rng();
  let acc = 0;
  for (const [kind, w] of KIND_WEIGHTS) {
    acc += w;
    if (r < acc) return kind;
  }
  return "good";
}

export function spawnPotato(id: number, rng: () => number, now: number): Potato {
  return {
    id,
    kind: pickKind(rng),
    lane: 0.12 + rng() * 0.76,
    progress: 0,
    spawnedAt: now,
    seed: Math.floor(rng() * 1e9),
    held: false,
  };
}

export type SortOutcome = {
  correct: boolean;
  fast: boolean;
  /** Points added by this single action (for the floating "+4" label). */
  points: number;
  coins: number;
  /** Combo milestone reached by this action, if any. */
  comboHit: 5 | 10 | null;
};

/** Apply one drop into a bin. Wrong bins give 0, never negative (FRD §2). */
export function applySort(stats: RoundStats, potato: Potato, bin: PotatoKind, now: number): SortOutcome {
  stats.handled += 1;
  const correct = potato.kind === bin;
  if (!correct) {
    stats.wrong += 1;
    stats.combo = 0;
    return { correct: false, fast: false, points: 0, coins: 0, comboHit: null };
  }
  const fast = now - potato.spawnedAt <= FAST_SECONDS * 1000;
  let points = fast ? 4 : 2;
  let coins = fast ? 2 : 1;
  if (fast) stats.fast += 1;
  else stats.correct += 1;
  stats.perBin[bin] += 1;
  stats.combo += 1;
  stats.maxCombo = Math.max(stats.maxCombo, stats.combo);
  let comboHit: 5 | 10 | null = null;
  if (stats.combo === 5) {
    stats.combo5 += 1;
    points += 8;
    coins += 4;
    comboHit = 5;
  } else if (stats.combo === 10) {
    stats.combo10 += 1;
    points += 15;
    coins += 8;
    comboHit = 10;
  }
  stats.points += points;
  stats.coins += coins;
  return { correct: true, fast, points, coins, comboHit };
}

/** A potato fell off the belt unsorted. */
export function applyMiss(stats: RoundStats) {
  stats.handled += 1;
  stats.missed += 1;
  stats.combo = 0;
}

/** Combo meter: progress toward the next combo milestone (5, then 10, then rolling 10s). */
export function comboMeter(combo: number): { next: number; pct: number } {
  const next = combo < 5 ? 5 : combo < 10 ? 10 : 10;
  const base = combo < 5 ? 0 : combo < 10 ? 5 : Math.floor(combo / 10) * 10;
  const span = next - base || 10;
  const pct = combo >= 10 ? Math.min(100, Math.round(((combo - base) / span) * 100)) : Math.min(100, Math.round(((combo - base) / span) * 100));
  return { next, pct };
}
