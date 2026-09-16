import { LIFE_REFILL_MS, MAX_LIVES, STARTING_BOOSTERS } from "./levels";
import type { BoosterType } from "./types";
import {
  fromApiBoosters,
  numberMapToRecord,
  recordToNumberMap,
  toApiBoosters,
  type CrushApiProgress,
} from "@/lib/crushApi";

const KEY = "pbZoneCrushProgress.v1";
const META_KEY = "pbZoneCrushProgressMeta.v1";

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

type CrushMeta = { updatedAt: string };

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

function loadMeta(): CrushMeta {
  if (typeof window === "undefined") return { updatedAt: new Date(0).toISOString() };
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { updatedAt: new Date(0).toISOString() };
    const parsed = JSON.parse(raw) as Partial<CrushMeta>;
    return {
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt
          ? parsed.updatedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return { updatedAt: new Date(0).toISOString() };
  }
}

function saveMeta(meta: CrushMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

export function getProgressUpdatedAt(): string {
  return loadMeta().updatedAt;
}

export function touchProgressUpdatedAt(at = new Date().toISOString()) {
  saveMeta({ updatedAt: at });
  return at;
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

function maxNumberMaps(a: Record<number, number>, b: Record<number, number>): Record<number, number> {
  const out: Record<number, number> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    const n = Number(key);
    if (!Number.isFinite(n)) continue;
    out[n] = Math.max(out[n] ?? 0, value);
  }
  return out;
}

/** Merge remote API progress into local — unlock/stars/score max; lives/boosters by updatedAt. */
export function mergeRemoteProgress(local: CrushProgress, remote: CrushApiProgress): CrushProgress {
  const localAt = Date.parse(getProgressUpdatedAt()) || 0;
  const remoteAt = Date.parse(remote.updatedAt) || 0;
  const preferRemoteLives = remoteAt >= localAt;

  const remoteStars = numberMapToRecord(remote.stars);
  const remoteScores = numberMapToRecord(remote.bestScores);
  const remoteBoosters = fromApiBoosters(remote.boosters);

  const merged: CrushProgress = {
    ...local,
    unlocked: Math.max(1, Math.max(local.unlocked, remote.unlocked)),
    stars: maxNumberMaps(local.stars, remoteStars),
    bestScores: maxNumberMaps(local.bestScores, remoteScores),
    lives: preferRemoteLives ? remote.lives : local.lives,
    livesAt: preferRemoteLives ? remote.livesAt : local.livesAt,
    boosters: preferRemoteLives
      ? { ...STARTING_BOOSTERS, ...remoteBoosters }
      : { ...STARTING_BOOSTERS, ...local.boosters },
  };
  return refillLives(merged);
}

export function toCrushPutBody(p: CrushProgress, clientUpdatedAt: string) {
  return {
    unlocked: p.unlocked,
    stars: recordToNumberMap(p.stars),
    bestScores: recordToNumberMap(p.bestScores),
    lives: p.lives,
    livesAt: p.livesAt,
    boosters: toApiBoosters(p.boosters),
    clientUpdatedAt,
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

export function commitProgress(next: CrushProgress, opts?: { touch?: boolean }) {
  cached = next;
  saveProgress(next);
  if (opts?.touch !== false) touchProgressUpdatedAt();
  for (const l of listeners) l();
}
