import { displayNameFromRecord } from "@/lib/playerIdentity";

function apiBaseUrl(): string {
  const base =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "https://api.potatobazaar.com/api/";
  return base.endsWith("/") ? base : `${base}/`;
}

function profileEndpoint(): string {
  const path =
    process.env.USER_PROFILE_ENDPOINT ??
    process.env.NEXT_PUBLIC_USER_PROFILE_ENDPOINT ??
    "users/mobile/user_profile";
  return path.replace(/^\//, "");
}

export function cleanAuthToken(token: string): string {
  return token.replace(/^Bearer\s+/i, "").trim();
}

export type PotatoBazaarProfile = {
  firstName: string;
  lastName: string;
  userName: string;
};

export function extractProfile(json: unknown): PotatoBazaarProfile | null {
  if (!json || typeof json !== "object") return null;

  const root = json as Record<string, unknown>;
  const data = (root.data ?? root.result ?? root.user ?? root) as Record<
    string,
    unknown
  >;

  if (!data || typeof data !== "object") return null;

  const firstName =
    (typeof data.firstName === "string" && data.firstName) ||
    (typeof data.first_name === "string" && data.first_name) ||
    "";

  const lastName =
    (typeof data.lastName === "string" && data.lastName) ||
    (typeof data.last_name === "string" && data.last_name) ||
    "";

  if (firstName || lastName) {
    const userName = `${firstName} ${lastName}`.trim();
    return { firstName, lastName, userName };
  }

  const fromClaims = displayNameFromRecord(data);
  if (!fromClaims) return null;

  const parts = fromClaims.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    userName: fromClaims,
  };
}

export async function fetchPotatoBazaarProfile(token: string): Promise<
  | { ok: true; profile: PotatoBazaarProfile }
  | { ok: false; status: number; error: string; body?: unknown; raw?: string }
> {
  const clean = cleanAuthToken(token);
  if (!clean) {
    return { ok: false, status: 401, error: "Missing token" };
  }

  const url = `${apiBaseUrl()}${profileEndpoint()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${clean}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    return {
      ok: false,
      status: res.status,
      error: "Invalid JSON from upstream API",
      raw: text.slice(0, 300),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: "Upstream profile request failed",
      body: json,
    };
  }

  const profile = extractProfile(json);
  if (!profile) {
    return {
      ok: false,
      status: 502,
      error: "Could not parse profile from API response",
      body: json,
    };
  }

  return { ok: true, profile };
}

const profileCache = new Map<string, { name: string; expiresAt: number }>();
const PROFILE_TTL_MS = 10 * 60 * 1000;

export async function displayNameFromPotatoBazaar(
  token: string | null | undefined,
): Promise<string | undefined> {
  if (!token) return undefined;
  const clean = cleanAuthToken(token);
  if (!clean) return undefined;

  const cached = profileCache.get(clean);
  if (cached && cached.expiresAt > Date.now()) return cached.name;

  const result = await fetchPotatoBazaarProfile(clean);
  if (!result.ok) return undefined;

  profileCache.set(clean, {
    name: result.profile.userName,
    expiresAt: Date.now() + PROFILE_TTL_MS,
  });
  return result.profile.userName;
}
