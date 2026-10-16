/**
 * Spin & Win API — one free spin per IST day. The server picks the segment by weight and pays PB Coins
 * into wallet.points (never PB Points); the wheel on screen only animates to the result it returns.
 */

import { QuizApiError, type QuizAuth } from "@/lib/quizApi";

export type SpinIcon = "leaf" | "book" | "bulb" | "star" | "potato" | "gift";

export type SpinSegment = {
  id: string;
  label: string;
  icon: SpinIcon;
  colour: string;
};

export type SpinWallet = {
  points: number;
  earnedPoints: number;
  bonusPoints: number;
  leaderboardPoints: number;
};

/** `extra_spin` is the "One more spin" segment: no coins, `amount` spins added to spinsLeft. */
export type SpinReward = { type: "coins" | "extra_spin"; amount: number };

/** Today's most recent spin, so the used-up state can say what it paid. */
export type SpinLast = { spinId: string; segmentId: string; reward: SpinReward; at: string | null };

export type SpinStatus = {
  canSpin: boolean;
  spinsLeft: number;
  /** When the next free spin opens (next IST midnight); null while a spin is available. */
  nextSpinAt: string | null;
  segments: SpinSegment[];
  lastSpin: SpinLast | null;
  wallet: SpinWallet | null;
};

export type SpinResult = {
  spinId: string;
  segmentId: string;
  reward: SpinReward;
  canSpin: boolean;
  spinsLeft: number;
  nextSpinAt: string | null;
  wallet: SpinWallet | null;
};

const SPIN_ICONS: readonly SpinIcon[] = ["leaf", "book", "bulb", "star", "potato", "gift"];

/** Wheel drawn before /status answers, and while the endpoint is not deployed. Mirrors the v1 server list. */
export const DEFAULT_SPIN_SEGMENTS: SpinSegment[] = [
  { id: "leaf", label: "15", icon: "leaf", colour: "#F6C744" },
  { id: "book", label: "25", icon: "book", colour: "#23843F" },
  { id: "bulb", label: "40", icon: "bulb", colour: "#F2862E" },
  { id: "star", label: "60", icon: "star", colour: "#1E7A3E" },
  { id: "potato", label: "+1 Spin", icon: "potato", colour: "#FBE08A" },
  { id: "gift", label: "150", icon: "gift", colour: "#F39A12" },
];

type ApiEnvelope<T> = { data: T; message?: string; error?: string };

function spinBaseUrl() {
  if (process.env.NEXT_PUBLIC_QUIZ_USE_PROXY !== "false") {
    return "/api/spin";
  }
  const publicBase =
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://pbzone-api.potatobazaar.com";
  return `${publicBase}/v1/spin`;
}

/** fetch() rejects header values outside Latin-1 (e.g. a Devanagari display name); send those percent-encoded. */
function headerSafe(value: string) {
  return /^[\x20-\x7E\xA0-\xFF]*$/.test(value) ? value : encodeURIComponent(value);
}

function buildHeaders(auth: QuizAuth): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token.replace(/^Bearer\s+/i, "").trim()}`;
  }

  headers["x-user-id"] = headerSafe(
    auth.userId || process.env.NEXT_PUBLIC_QUIZ_DEV_USER_ID || "dev-user-1",
  );
  headers["x-user-name"] = headerSafe(
    auth.userName ||
      process.env.NEXT_PUBLIC_QUIZ_DEV_USER_NAME ||
      process.env.NEXT_PUBLIC_DEFAULT_USER_NAME ||
      "Potato Player",
  );

  return headers;
}

async function spinFetch<T>(path: string, auth: QuizAuth, init?: RequestInit): Promise<T> {
  const url = `${spinBaseUrl()}${path}`;
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
    let msg = `Spin API error (${res.status})`;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeWallet(raw: unknown): SpinWallet | null {
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

function normalizeSegments(raw: unknown): SpinSegment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i) => {
      const s = asRecord(row);
      const fallback = DEFAULT_SPIN_SEGMENTS[i % DEFAULT_SPIN_SEGMENTS.length];
      const icon = SPIN_ICONS.includes(s.icon as SpinIcon) ? (s.icon as SpinIcon) : fallback.icon;
      return {
        id: String(s.id ?? ""),
        label: asString(s.label) ?? fallback.label,
        icon,
        colour: asString(s.colour) ?? asString(s.color) ?? fallback.colour,
      };
    })
    .filter((s) => s.id);
}

function normalizeReward(raw: unknown): SpinReward {
  const reward = asRecord(raw);
  return {
    type: reward.type === "extra_spin" ? "extra_spin" : "coins",
    amount: Math.max(0, asInt(reward.amount)),
  };
}

function normalizeLastSpin(raw: unknown): SpinLast | null {
  if (!raw || typeof raw !== "object") return null;
  const last = raw as Record<string, unknown>;
  const segmentId = asString(last.segmentId);
  if (!segmentId) return null;
  return {
    spinId: String(last.spinId ?? ""),
    segmentId,
    reward: normalizeReward(last.reward),
    at: asString(last.at),
  };
}

function normalizeStatus(raw: unknown): SpinStatus {
  const data = asRecord(raw);
  const spinsLeft = Math.max(0, asInt(data.spinsLeft));
  const segments = normalizeSegments(data.segments);
  return {
    canSpin: typeof data.canSpin === "boolean" ? data.canSpin : spinsLeft > 0,
    spinsLeft,
    nextSpinAt: asString(data.nextSpinAt),
    segments: segments.length >= 2 ? segments : DEFAULT_SPIN_SEGMENTS,
    lastSpin: normalizeLastSpin(data.lastSpin),
    wallet: normalizeWallet(data.wallet),
  };
}

function normalizeResult(raw: unknown): SpinResult {
  const data = asRecord(raw);
  const spinsLeft = Math.max(0, asInt(data.spinsLeft));
  return {
    spinId: String(data.spinId ?? ""),
    segmentId: String(data.segmentId ?? ""),
    reward: normalizeReward(data.reward),
    canSpin: typeof data.canSpin === "boolean" ? data.canSpin : spinsLeft > 0,
    spinsLeft,
    nextSpinAt: asString(data.nextSpinAt),
    wallet: normalizeWallet(data.wallet),
  };
}

export function fetchSpinStatus(auth: QuizAuth): Promise<SpinStatus> {
  return spinFetch<unknown>("/status", auth, { method: "GET" }).then(normalizeStatus);
}

/** Spends one spin. Reuse the same `requestId` when retrying so the server replays the first result. */
export function spin(auth: QuizAuth, requestId: string): Promise<SpinResult> {
  return spinFetch<unknown>("", auth, {
    method: "POST",
    body: JSON.stringify({ requestId }),
  }).then(normalizeResult);
}

const PENDING_SPIN_KEY = "pb-zone:spin-request";

function newRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `spin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Request id for the next spin. Kept until the server gives a definite answer, so a retry after a
 * dropped connection (even after a reload) sends the same id and cannot pay twice.
 */
export function pendingSpinRequestId(): string {
  try {
    const saved = localStorage.getItem(PENDING_SPIN_KEY);
    if (saved) return saved;
  } catch {
    /* storage can be blocked in some webviews */
  }
  const id = newRequestId();
  try {
    localStorage.setItem(PENDING_SPIN_KEY, id);
  } catch {
    /* storage can be blocked in some webviews */
  }
  return id;
}

/** Call once the server has answered (a result, or a 4xx that rejected the spin). */
export function clearPendingSpinRequest() {
  try {
    localStorage.removeItem(PENDING_SPIN_KEY);
  } catch {
    /* storage can be blocked in some webviews */
  }
}
