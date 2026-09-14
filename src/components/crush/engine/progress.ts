import { LIFE_REFILL_MS, MAX_LIVES, STARTING_BOOSTERS } from "./levels";
import type { BoosterType } from "./types";

const KEY = "pbZoneCrushProgress.v1";

export interface CrushProgress {
  /** Stars per level order (1-based). */
  stars: Record<number, number>;
  bestScores: Record<number, number>;
  /** Highest level order the player may play. */
  unlocked: number;
  lives: number;
  /** Timestamp of the last life bookkeeping. */
  livesAt: number;
  boosters: Record<BoosterType, number>;
  sound: boolean;
  totalCoinsEarned: number;
}

export function defaultProgress(): CrushProgress {
  return {
    stars: {},
    bestScores: {},
    unlocked: 1,
    lives: MAX_LIVES,
    livesAt: Date.now(),
    boosters: { ...STARTING_BOOSTERS },
    sound: true,
    totalCoinsEarned: 0,
  };
}

export function loadProgress(): CrushProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<CrushProgress>;
    const merged: CrushProgress = {
      ...defaultProgress(),
      ...parsed,
      boosters: { ...STARTING_BOOSTERS, ...(parsed.boosters ?? {}) },
    };
    return refillLives(merged);
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: CrushProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Applies timed life refills. Pure – returns a new object. */
export function refillLives(p: CrushProgress, now = Date.now()): CrushProgress {
  if (p.lives >= MAX_LIVES) return { ...p, lives: MAX_LIVES, livesAt: now };
  const elapsed = Math.max(0, now - p.livesAt);
  const gained = Math.floor(elapsed / LIFE_REFILL_MS);
  if (gained <= 0) return p;
  const lives = Math.min(MAX_LIVES, p.lives + gained);
  const livesAt = lives >= MAX_LIVES ? now : p.livesAt + gained * LIFE_REFILL_MS;
  return { ...p, lives, livesAt };
}

export function msToNextLife(p: CrushProgress, now = Date.now()): number {
  if (p.lives >= MAX_LIVES) return 0;
  return Math.max(0, p.livesAt + LIFE_REFILL_MS - now);
}

export function loseLife(p: CrushProgress, now = Date.now()): CrushProgress {
  const fresh = refillLives(p, now);
  const wasFull = fresh.lives >= MAX_LIVES;
  return {
    ...fresh,
    lives: Math.max(0, fresh.lives - 1),
    livesAt: wasFull ? now : fresh.livesAt,
  };
}

export function recordWin(
  p: CrushProgress,
  order: number,
  stars: number,
  score: number,
  coins: number,
  totalLevels: number,
): CrushProgress {
  return {
    ...p,
    stars: { ...p.stars, [order]: Math.max(p.stars[order] ?? 0, stars) },
    bestScores: { ...p.bestScores, [order]: Math.max(p.bestScores[order] ?? 0, score) },
    unlocked: Math.min(totalLevels, Math.max(p.unlocked, order + 1)),
    totalCoinsEarned: p.totalCoinsEarned + coins,
  };
}

export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Tiny external store so React can read progress without effects    */
/* ------------------------------------------------------------------ */

let cached: CrushProgress | null = null;
const listeners = new Set<() => void>();

export function subscribeProgress(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProgressSnapshot(): CrushProgress {
  if (!cached) cached = loadProgress();
  return cached;
}

export function getServerProgressSnapshot(): CrushProgress | null {
  return null;
}

export function commitProgress(next: CrushProgress) {
  cached = next;
  saveProgress(next);
  for (const l of listeners) l();
}
