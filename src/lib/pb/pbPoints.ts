/**
 * PB Points store — pure state logic + localStorage persistence.
 *
 * Mirrors the FRD player data model (§3): season_points, lifetime_points,
 * daily_points_earned, game_daily_points, streak_count. The server is
 * authoritative in production; this client store lets every screen work
 * before the API lands and encodes the same rules (caps, dedupe, resets).
 */

import {
  GAME_DAILY_POINT_CAPS,
  GLOBAL_DAILY_POINT_CAP,
  PB_SEASON,
  type PbGameId,
} from "@/data/pbEconomy";

export type PbBreakdownLine = {
  label: string;
  points: number;
};

export type PbPointEvent = {
  eventId: string;
  gameId: PbGameId;
  label: string;
  requested: number;
  applied: number;
  at: string;
};

export type RankMovement = {
  from: number;
  to: number;
  at: string;
};

export type PbPointsState = {
  version: 1;
  seasonId: string;
  seasonPoints: number;
  lifetimePoints: number;
  dailyDate: string;
  dailyPointsEarned: number;
  gameDailyPoints: Partial<Record<PbGameId, number>>;
  gameSeasonPoints: Partial<Record<PbGameId, number>>;
  streakCount: number;
  perfectRuns: number;
  creditedEventIds: string[];
  dailyChallengeDate: string | null;
  lastMovement: RankMovement | null;
  /** Last rank change on each game's own leaderboard. */
  gameMovement: Partial<Record<PbGameId, RankMovement>>;
  history: PbPointEvent[];
};

export type PbAwardInput = {
  /** Unique per game session so a run is never credited twice (FRD §2). */
  eventId: string;
  gameId: PbGameId;
  /** Points the game's scoring rules produced, before caps. */
  points: number;
  lines: PbBreakdownLine[];
  /** Counts toward the "perfect performances" tie-breaker. */
  perfect?: boolean;
  label?: string;
};

export type PbApplyResult = {
  state: PbPointsState;
  requested: number;
  applied: number;
  duplicate: boolean;
  cappedBy: "game" | "daily" | null;
  /** Points still earnable today across all games after this award. */
  dailyRemaining: number;
  /** Points still earnable today in this game after this award. */
  gameRemaining: number;
};

const STORAGE_KEY = "pbZonePoints.v1";
const HISTORY_LIMIT = 40;
const EVENT_ID_LIMIT = 400;

/** Demo seed — replace with API hydration later. Lifetime must be >= season. */
export const INITIAL_PB_POINTS: PbPointsState = {
  version: 1,
  seasonId: PB_SEASON.id,
  seasonPoints: 2650,
  lifetimePoints: 4120,
  dailyDate: "",
  dailyPointsEarned: 0,
  gameDailyPoints: {},
  gameSeasonPoints: { "quiz-time": 1290, "potato-crush": 840, "potato-ninja": 520 },
  streakCount: 0,
  perfectRuns: 2,
  creditedEventIds: [],
  dailyChallengeDate: null,
  lastMovement: null,
  gameMovement: {},
  history: [],
};

export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Apply day and season rollovers. Pure. */
export function normalizeState(state: PbPointsState, now: Date = new Date()): PbPointsState {
  let next = state;
  const today = todayKey(now);
  if (next.dailyDate !== today) {
    next = { ...next, dailyDate: today, dailyPointsEarned: 0, gameDailyPoints: {} };
  }
  if (next.seasonId !== PB_SEASON.id) {
    // Season score resets; lifetime Points remain (FRD §1).
    next = {
      ...next,
      seasonId: PB_SEASON.id,
      seasonPoints: 0,
      gameSeasonPoints: {},
      perfectRuns: 0,
      lastMovement: null,
      gameMovement: {},
    };
  }
  return next;
}

/** Credit a scoring event under the FRD cap and dedupe rules. Pure. */
export function applyAward(
  input: PbAwardInput,
  state: PbPointsState,
  now: Date = new Date(),
): PbApplyResult {
  const base = normalizeState(state, now);
  const gameCap = GAME_DAILY_POINT_CAPS[input.gameId] ?? 200;
  const gameUsed = base.gameDailyPoints[input.gameId] ?? 0;
  const gameRoom = Math.max(0, gameCap - gameUsed);
  const dailyRoom = Math.max(0, GLOBAL_DAILY_POINT_CAP - base.dailyPointsEarned);
  const requested = Math.max(0, Math.floor(input.points));

  if (base.creditedEventIds.includes(input.eventId)) {
    return {
      state: base,
      requested,
      applied: 0,
      duplicate: true,
      cappedBy: null,
      dailyRemaining: dailyRoom,
      gameRemaining: gameRoom,
    };
  }

  const applied = Math.min(requested, gameRoom, dailyRoom);
  let cappedBy: "game" | "daily" | null = null;
  if (applied < requested) cappedBy = gameRoom <= dailyRoom ? "game" : "daily";

  const event: PbPointEvent = {
    eventId: input.eventId,
    gameId: input.gameId,
    label: input.label ?? input.gameId,
    requested,
    applied,
    at: now.toISOString(),
  };

  const next: PbPointsState = {
    ...base,
    seasonPoints: base.seasonPoints + applied,
    lifetimePoints: base.lifetimePoints + applied,
    dailyPointsEarned: base.dailyPointsEarned + applied,
    gameDailyPoints: { ...base.gameDailyPoints, [input.gameId]: gameUsed + applied },
    gameSeasonPoints: {
      ...base.gameSeasonPoints,
      [input.gameId]: (base.gameSeasonPoints[input.gameId] ?? 0) + applied,
    },
    perfectRuns: base.perfectRuns + (input.perfect ? 1 : 0),
    creditedEventIds: [...base.creditedEventIds, input.eventId].slice(-EVENT_ID_LIMIT),
    history: [event, ...base.history].slice(0, HISTORY_LIMIT),
  };

  return {
    state: next,
    requested,
    applied,
    duplicate: false,
    cappedBy,
    dailyRemaining: Math.max(0, dailyRoom - applied),
    gameRemaining: Math.max(0, gameRoom - applied),
  };
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

function isState(value: unknown): value is PbPointsState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<PbPointsState>;
  return (
    v.version === 1 &&
    typeof v.seasonPoints === "number" &&
    typeof v.lifetimePoints === "number" &&
    Array.isArray(v.creditedEventIds)
  );
}

export function loadPbPoints(): PbPointsState {
  if (typeof window === "undefined") return INITIAL_PB_POINTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeState(INITIAL_PB_POINTS);
    const parsed: unknown = JSON.parse(raw);
    if (!isState(parsed)) return normalizeState(INITIAL_PB_POINTS);
    return normalizeState({
      ...INITIAL_PB_POINTS,
      ...parsed,
      gameDailyPoints: parsed.gameDailyPoints ?? {},
      gameSeasonPoints: parsed.gameSeasonPoints ?? {},
      gameMovement: parsed.gameMovement ?? {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
    });
  } catch {
    return normalizeState(INITIAL_PB_POINTS);
  }
}

export function savePbPoints(state: PbPointsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function topGamesThisSeason(state: PbPointsState, limit = 5) {
  return (Object.entries(state.gameSeasonPoints) as [PbGameId, number][])
    .filter(([, pts]) => pts > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
