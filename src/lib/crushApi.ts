/** Potato Crush progress API — level save (not coins/LP). */

import { QuizApiError, type QuizAuth } from "@/lib/quizApi";
import type { BoosterType } from "@/components/crush/engine/types";

export type CrushApiBoosters = {
  hammer: number;
  fryer: number;
  oil: number;
  shuffle: number;
};

/** Wire payload — BE uses short booster keys. */
export type CrushApiProgress = {
  unlocked: number;
  stars: Record<string, number>;
  bestScores: Record<string, number>;
  lives: number;
  livesAt: number;
  boosters: CrushApiBoosters;
  updatedAt: string;
};

type ApiEnvelope<T> = { data: T; message?: string; error?: string };

function crushBaseUrl() {
  if (process.env.NEXT_PUBLIC_QUIZ_USE_PROXY !== "false") {
    return "/api/crush";
  }
  const publicBase =
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://pbzone-api.potatobazaar.com";
  return `${publicBase}/v1/crush`;
}

function buildHeaders(auth: QuizAuth): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
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

async function crushFetch<T>(
  path: string,
  auth: QuizAuth,
  init?: RequestInit,
): Promise<T> {
  const base = crushBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

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
    let msg = `Crush API error (${res.status})`;
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

function normalizeBoosters(raw: unknown): CrushApiBoosters {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  // Accept both BE short keys and FE long keys.
  return {
    hammer: Math.max(0, asInt(obj.hammer ?? obj.masher, 0)),
    fryer: Math.max(0, asInt(obj.fryer ?? obj["fryer-line"], 0)),
    oil: Math.max(0, asInt(obj.oil ?? obj["oil-splash"], 0)),
    shuffle: Math.max(0, asInt(obj.shuffle, 0)),
  };
}

function normalizeNumberMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = asInt(value, -1);
    if (n < 0) continue;
    out[String(key)] = n;
  }
  return out;
}

export function normalizeCrushProgress(raw: unknown): CrushApiProgress {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const updatedAt =
    typeof data.updatedAt === "string" && data.updatedAt
      ? data.updatedAt
      : new Date().toISOString();
  return {
    unlocked: Math.max(1, asInt(data.unlocked, 1)),
    stars: normalizeNumberMap(data.stars),
    bestScores: normalizeNumberMap(data.bestScores),
    lives: Math.max(0, asInt(data.lives, 5)),
    livesAt: Math.max(0, asInt(data.livesAt, Date.now())),
    boosters: normalizeBoosters(data.boosters),
    updatedAt,
  };
}

/** FE booster bag → BE wire keys. */
export function toApiBoosters(boosters: Record<BoosterType, number>): CrushApiBoosters {
  return {
    hammer: Math.max(0, Math.floor(boosters.masher ?? 0)),
    fryer: Math.max(0, Math.floor(boosters["fryer-line"] ?? 0)),
    oil: Math.max(0, Math.floor(boosters["oil-splash"] ?? 0)),
    shuffle: Math.max(0, Math.floor(boosters.shuffle ?? 0)),
  };
}

/** BE wire keys → FE booster bag. */
export function fromApiBoosters(boosters: CrushApiBoosters): Record<BoosterType, number> {
  return {
    masher: boosters.hammer,
    "fryer-line": boosters.fryer,
    "oil-splash": boosters.oil,
    shuffle: boosters.shuffle,
  };
}

export function numberMapToRecord(map: Record<string, number>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(map)) {
    const n = Number(key);
    if (!Number.isFinite(n)) continue;
    out[n] = value;
  }
  return out;
}

export function recordToNumberMap(map: Record<number, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(map)) {
    out[String(key)] = Math.max(0, Math.floor(value));
  }
  return out;
}

export function fetchCrushProgress(auth: QuizAuth) {
  return crushFetch<unknown>("/progress", auth, { method: "GET" }).then(normalizeCrushProgress);
}

export function putCrushProgress(
  auth: QuizAuth,
  body: {
    unlocked: number;
    stars: Record<string, number>;
    bestScores: Record<string, number>;
    lives: number;
    livesAt: number;
    boosters: CrushApiBoosters;
    clientUpdatedAt: string;
  },
) {
  return crushFetch<unknown>("/progress", auth, {
    method: "PUT",
    body: JSON.stringify(body),
  }).then(normalizeCrushProgress);
}
