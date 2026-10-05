/** Daily bonus API — server-side streak + claim; reward lands in wallet.points (PB coins). */

import { QuizApiError, type QuizAuth } from "@/lib/quizApi";

export type DailyBonusDay = {
  day: number;
  reward: number;
  claimed: boolean;
  isToday: boolean;
};

export type DailyBonusWallet = {
  points: number;
  earnedPoints: number;
  bonusPoints: number;
  leaderboardPoints: number;
};

export type DailyBonusStatus = {
  today: string | null;
  claimedToday: boolean;
  canClaim: boolean;
  currentDay: number;
  todayReward: number;
  nextClaimAt: string | null;
  days: DailyBonusDay[];
  wallet: DailyBonusWallet | null;
};

export type DailyBonusClaim = {
  id: string;
  day: number;
  reward: number;
  claimDate: string;
  claimedAt: string;
};

export type DailyBonusClaimResult = DailyBonusStatus & { claim: DailyBonusClaim | null };

export type DailyBonusHistory = {
  results: DailyBonusClaim[];
  page: number;
  limit: number;
  total: number;
  totalEarned: number;
};

type ApiEnvelope<T> = { data: T; message?: string; error?: string };

function dailyBonusBaseUrl() {
  if (process.env.NEXT_PUBLIC_QUIZ_USE_PROXY !== "false") {
    return "/api/daily-bonus";
  }
  const publicBase =
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://pbzone-api.potatobazaar.com";
  return `${publicBase}/v1/daily-bonus`;
}

function buildHeaders(auth: QuizAuth): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token.replace(/^Bearer\s+/i, "").trim()}`;
  }

  headers["x-user-id"] =
    auth.userId || process.env.NEXT_PUBLIC_QUIZ_DEV_USER_ID || "dev-user-1";
  headers["x-user-name"] =
    auth.userName ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_NAME ||
    process.env.NEXT_PUBLIC_DEFAULT_USER_NAME ||
    "Potato Player";

  return headers;
}

async function dailyBonusFetch<T>(path: string, auth: QuizAuth, init?: RequestInit): Promise<T> {
  const url = `${dailyBonusBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(auth),
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    let msg = `Daily bonus API error (${res.status})`;
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

function asInt(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function asString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function normalizeWallet(raw: unknown): DailyBonusWallet | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as Record<string, unknown>;
  if (!Number.isFinite(Number(w.points))) return null;
  return {
    points: asInt(w.points),
    earnedPoints: asInt(w.earnedPoints),
    bonusPoints: asInt(w.bonusPoints),
    leaderboardPoints: asInt(w.leaderboardPoints),
  };
}

function normalizeDays(raw: unknown): DailyBonusDay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const d = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return {
        day: asInt(d.day),
        reward: asInt(d.reward),
        claimed: Boolean(d.claimed),
        isToday: Boolean(d.isToday),
      };
    })
    .filter((d) => d.day > 0)
    .sort((a, b) => a.day - b.day);
}

function normalizeClaim(raw: unknown): DailyBonusClaim | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  return {
    id: String(c.id ?? ""),
    day: asInt(c.day),
    reward: asInt(c.reward),
    claimDate: String(c.claimDate ?? ""),
    claimedAt: String(c.claimedAt ?? ""),
  };
}

function normalizeStatus(raw: unknown): DailyBonusStatus {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const days = normalizeDays(data.days);
  const today = days.find((d) => d.isToday);
  return {
    today: asString(data.today),
    claimedToday: Boolean(data.claimedToday),
    canClaim: Boolean(data.canClaim),
    currentDay: asInt(data.currentDay, today?.day ?? 1),
    todayReward: asInt(data.todayReward, today?.reward ?? 0),
    nextClaimAt: asString(data.nextClaimAt),
    days,
    wallet: normalizeWallet(data.wallet),
  };
}

export function fetchDailyBonus(auth: QuizAuth) {
  return dailyBonusFetch<unknown>("", auth, { method: "GET" }).then(normalizeStatus);
}

export function claimDailyBonus(auth: QuizAuth): Promise<DailyBonusClaimResult> {
  return dailyBonusFetch<unknown>("/claim", auth, { method: "POST" }).then((raw) => {
    const status = normalizeStatus(raw);
    const claim = normalizeClaim((raw as Record<string, unknown> | null)?.claim);
    return {
      ...status,
      todayReward: claim?.reward ?? status.todayReward,
      claim,
    };
  });
}

export function fetchDailyBonusHistory(auth: QuizAuth, page = 1, limit = 30): Promise<DailyBonusHistory> {
  const qs = new URLSearchParams({ page: String(page), limit: String(Math.min(100, limit)) });
  return dailyBonusFetch<unknown>(`/history?${qs}`, auth, { method: "GET" }).then((raw) => {
    const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const results = Array.isArray(data.results)
      ? data.results.map(normalizeClaim).filter((c): c is DailyBonusClaim => c !== null)
      : [];
    return {
      results,
      page: asInt(data.page, page),
      limit: asInt(data.limit, limit),
      total: asInt(data.total, results.length),
      totalEarned: asInt(data.totalEarned),
    };
  });
}
