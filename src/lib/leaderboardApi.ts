/** Leaderboard API client — LP ranks, not wallet PB coins. */

import {
  QuizApiError,
  type QuizAuth,
} from "@/lib/quizApi";

export type LeaderboardPeriod = "overall" | "week" | "month";

export type LeaderboardSeason = {
  id: string;
  title: string;
  subtitle: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  points: number;
  avatarUrl?: string | null;
  isYou?: boolean;
};

export type LeaderboardMe = {
  rank: number | null;
  points: number;
  name: string;
  userId: string;
};

export type LeaderboardBoard = {
  season: LeaderboardSeason;
  period: LeaderboardPeriod;
  updatedAt: string;
  nextRefreshInSec: number;
  podium: LeaderboardEntry[];
  rankings: LeaderboardEntry[];
  me: LeaderboardMe | null;
};

type ApiEnvelope<T> = { data: T; message?: string; error?: string };

function leaderboardBaseUrl() {
  if (process.env.NEXT_PUBLIC_QUIZ_USE_PROXY !== "false") {
    return "/api/leaderboard";
  }
  const publicBase =
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://pbzone-api.potatobazaar.com";
  return `${publicBase}/v1/leaderboard`;
}

function buildHeaders(auth: QuizAuth): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token.replace(/^Bearer\s+/i, "").trim()}`;
  }

  const userId =
    auth.userId ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_ID ||
    "dev-user-1";
  const userName =
    auth.userName ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_NAME ||
    process.env.NEXT_PUBLIC_DEFAULT_USER_NAME ||
    "Potato Player";
  headers["x-user-id"] = userId;
  headers["x-user-name"] = userName;

  return headers;
}

async function leaderboardFetch<T>(
  path: string,
  auth: QuizAuth,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const base = leaderboardBaseUrl();
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  const url = `${base}${path.startsWith("/") ? path : path ? `/${path}` : ""}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(auth),
    cache: "no-store",
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    let msg = `Leaderboard API error (${res.status})`;
    if (json && typeof json === "object") {
      const payload = json as { message?: unknown; error?: unknown };
      const fromApi = payload.message ?? payload.error;
      if (typeof fromApi === "string" && fromApi.trim()) msg = fromApi;
    }
    throw new QuizApiError(msg, res.status, json);
  }

  if (json && typeof json === "object" && "data" in json) {
    return (json as ApiEnvelope<T>).data;
  }
  return json as T;
}

export type StoredPlayerPoints = {
  userId: string;
  name: string;
  points: number;
  games: Record<string, number>;
};

export function gamePointsFromRow(row: StoredPlayerPoints, gameKey: string) {
  const want = gameKey.replace(/-/g, "_");
  for (const [key, value] of Object.entries(row.games ?? {})) {
    if (key.replace(/-/g, "_") === want) return Math.max(0, Number(value) || 0);
  }
  return 0;
}

/** Current-season total = sum of per-game stored points. */
export function seasonPointsFromRow(row: StoredPlayerPoints) {
  return Object.values(row.games ?? {}).reduce(
    (sum, value) => sum + Math.max(0, Number(value) || 0),
    0,
  );
}

const PLACEHOLDER_NAMES = new Set(["player", "potato player", "you", "anonymous", "guest"]);

/** Sort the existing player list. Higher points rank first. */
export function rankStoredPlayers(
  players: StoredPlayerPoints[],
  me: { userId: string; name: string },
  options?: { gameKey?: string | null; mode?: "season" | "lifetime" },
) {
  const mode = options?.mode ?? "lifetime";
  const gameKey = options?.gameKey ?? null;
  const rows = players.map((player) => {
    const points = gameKey
      ? gamePointsFromRow(player, gameKey)
      : mode === "season"
        ? seasonPointsFromRow(player)
        : Math.max(0, Number(player.points) || 0);
    return {
      id: player.userId,
      name: player.name || "Player",
      points,
      isYou: false,
    };
  });

  const ranked = rows
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  let youIndex = me.userId
    ? ranked.findIndex((row) => String(row.id) === String(me.userId))
    : -1;

  if (youIndex < 0 && me.name.trim()) {
    const mine = me.name.trim().toLowerCase();
    if (!PLACEHOLDER_NAMES.has(mine)) {
      const matches = ranked
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.name.trim().toLowerCase() === mine);
      if (matches.length === 1) youIndex = matches[0].index;
    }
  }

  if (youIndex >= 0) ranked[youIndex].isYou = true;

  return ranked.map((row, index) => ({ ...row, rank: index + 1, movement: 0 }));
}

/** Leadership board: stored PB points, not coins. Rank on the FE. */
export function fetchLeaderboardPoints(
  auth: QuizAuth,
  options?: { gameKey?: string; page?: number; limit?: number },
) {
  return leaderboardFetch<StoredPlayerPoints[]>("/points", auth, {
    gameKey: options?.gameKey,
    page: options?.page ?? 1,
    limit: options?.limit ?? 200,
  });
}

export type PerformanceMetric = {
  key?: string;
  value: number;
  max: number;
};

export type GameScoreResult = {
  coinsAwarded: number;
  coins: Record<string, number>;
  totalCoins: number;
  averagePerformancePercent: number;
  leadershipPointsAwarded: number;
  pbPoints: number;
};

type ScoreListener = (
  result: GameScoreResult,
  meta: { gameKey: string; applyWallet: boolean },
) => void;

let scoreListener: ScoreListener | null = null;

/** Lets the wallet pick up pbPoints (and server coin total) after a game ends. */
export function subscribeGameScore(listener: ScoreListener) {
  scoreListener = listener;
  return () => {
    if (scoreListener === listener) scoreListener = null;
  };
}

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeScoreResult(json: unknown): GameScoreResult {
  const raw =
    json && typeof json === "object" && "data" in json
      ? (json as { data: unknown }).data
      : json;
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const coinsRaw = data.coins;
  const coins: Record<string, number> = {};
  if (coinsRaw && typeof coinsRaw === "object" && !Array.isArray(coinsRaw)) {
    for (const [key, value] of Object.entries(coinsRaw as Record<string, unknown>)) {
      coins[key] = Math.max(0, asNumber(value) ?? 0);
    }
  }
  const summed = Object.values(coins).reduce((sum, value) => sum + value, 0);
  return {
    coinsAwarded: asNumber(data.coinsAwarded) ?? asNumber(data.coinsAdded) ?? 0,
    coins,
    totalCoins: asNumber(data.totalCoins) ?? summed,
    averagePerformancePercent: asNumber(data.averagePerformancePercent) ?? 0,
    leadershipPointsAwarded:
      asNumber(data.leadershipPointsAwarded) ?? asNumber(data.lpAwarded) ?? 0,
    pbPoints: asNumber(data.pbPoints) ?? asNumber(data.leaderboardPoints) ?? 0,
  };
}

/** One game-over call: POST /v1/leaderboard/score. Coins for this game + average points on the board. */
export async function submitGameScore(
  auth: QuizAuth,
  input: {
    gameKey: string;
    sessionId: string;
    coins?: number;
    applyWallet?: boolean;
    metrics: PerformanceMetric[];
  },
): Promise<GameScoreResult> {
  const applyWallet = input.applyWallet !== false;
  const base = leaderboardBaseUrl();
  const res = await fetch(`${base}/score`, {
    method: "POST",
    headers: {
      ...buildHeaders(auth),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      gameKey: input.gameKey,
      sessionId: input.sessionId.slice(0, 64),
      coins: Math.max(0, Math.floor(input.coins ?? 0)),
      applyWallet,
      metrics: input.metrics,
    }),
    cache: "no-store",
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    let msg = `Scoring API error (${res.status})`;
    if (json && typeof json === "object") {
      const payload = json as { message?: unknown; error?: unknown };
      const fromApi = payload.message ?? payload.error;
      if (typeof fromApi === "string" && fromApi.trim()) msg = fromApi;
    }
    throw new QuizApiError(msg, res.status, json);
  }
  const result = normalizeScoreResult(json);
  scoreListener?.(result, { gameKey: input.gameKey, applyWallet });
  return result;
}

/** Fire-and-forget. Game over still shows if the score API is down. */
export function recordGameLeaderboard(
  auth: QuizAuth,
  input: {
    gameKey: string;
    sessionId: string;
    coins?: number;
    applyWallet?: boolean;
    metrics: PerformanceMetric[];
  },
) {
  const metrics = input.metrics.filter((metric) => metric.max > 0);
  if (metrics.length === 0) return;
  void submitGameScore(auth, { ...input, metrics }).catch((err) => {
    console.warn("[scoring] game score not stored", input.gameKey, err);
  });
}

export function fetchMyLeaderboard(
  auth: QuizAuth,
  period: LeaderboardPeriod = "overall",
) {
  return leaderboardFetch<{
    season: LeaderboardSeason;
    period: LeaderboardPeriod;
    me: LeaderboardMe;
  }>("/me", auth, { period });
}

function markYou(
  row: LeaderboardEntry,
  meId: string | null,
): LeaderboardEntry {
  return {
    ...row,
    isYou: Boolean(row.isYou || (meId && row.userId === meId)),
  };
}

export function visibleRankings(board: LeaderboardBoard): LeaderboardEntry[] {
  const meId = board.me?.userId ?? null;
  const rows = board.rankings.map((row) => markYou(row, meId));
  const shown = new Set(
    [...board.podium, ...rows].map((row) => row.userId).filter(Boolean),
  );
  if (meId && Number(board.me?.points ?? 0) > 0 && !shown.has(meId)) {
    rows.push({
      rank: board.me?.rank ?? rows.length + board.podium.length + 1,
      userId: meId,
      name: board.me?.name ?? "You",
      points: board.me?.points ?? 0,
      isYou: true,
    });
    rows.sort((a, b) => a.rank - b.rank || b.points - a.points);
  }
  return rows;
}

export function visibleFullBoard(board: LeaderboardBoard): LeaderboardEntry[] {
  const meId = board.me?.userId ?? null;
  const rows = [
    ...board.podium.map((row) => markYou(row, meId)),
    ...visibleRankings(board),
  ];
  rows.sort((a, b) => a.rank - b.rank || b.points - a.points);
  return rows;
}
