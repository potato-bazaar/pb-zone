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

export function fetchLeaderboard(
  auth: QuizAuth,
  options?: { period?: LeaderboardPeriod; limit?: number },
) {
  return leaderboardFetch<LeaderboardBoard>("", auth, {
    period: options?.period ?? "overall",
    limit: options?.limit ?? 20,
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
