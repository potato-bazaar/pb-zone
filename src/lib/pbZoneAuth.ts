export const DEFAULT_USER_NAME =
  process.env.NEXT_PUBLIC_DEFAULT_USER_NAME ?? "Potato Player";

/** Web app's own persisted session */
export const SESSION_STORAGE_KEY = "pb-zone-session";

/** Keys injected by Potato Bazaar mobile WebView */
export const MOBILE_SESSION_KEY = "pbZoneSession";
export const MOBILE_USER_NAME_KEY = "pbZoneUserName";
export const MOBILE_TOKEN_KEY = "pbZoneToken";
export const MOBILE_USER_ID_KEY = "pbZoneUserId";

export type PbZoneSession = {
  userName: string;
  token: string | null;
  userId: string | null;
};

declare global {
  interface Window {
    __PB_ZONE_SESSION__?: {
      userName?: string;
      token?: string | null;
      userId?: string | number | null;
      userData?: Record<string, unknown>;
    };
  }
}

export function getDefaultSession(): PbZoneSession {
  return {
    userName: DEFAULT_USER_NAME,
    token: null,
    userId: null,
  };
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickToken(data: Record<string, unknown>): string | null {
  return (
    pickString(
      data.token,
      data.authToken,
      data.accessToken,
      data.access_token,
      data.jwt,
      data.bearerToken,
    ) ?? null
  );
}

function nameFromRecord(data: Record<string, unknown>): string | undefined {
  const direct = pickString(
    data.userName,
    data.name,
    data.displayName,
    data.fullName,
  );
  if (direct) return direct;

  const first = pickString(data.firstName, data.first_name);
  const last = pickString(data.lastName, data.last_name);
  if (first || last) return `${first ?? ""} ${last ?? ""}`.trim();

  return undefined;
}

function parseRecord(data: Record<string, unknown>): Partial<PbZoneSession> {
  const nested = data.userData ?? data.user ?? data.profile;
  const nestedRecord =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : null;

  const userName =
    nameFromRecord(data) ??
    (nestedRecord ? nameFromRecord(nestedRecord) : undefined);

  const token = pickToken(data) ?? (nestedRecord ? pickToken(nestedRecord) : null);

  const userIdRaw =
    data.userId ??
    data.id ??
    nestedRecord?.userId ??
    nestedRecord?.id ??
    null;

  return {
    userName,
    token,
    userId: userIdRaw != null ? String(userIdRaw) : null,
  };
}

function normalizeSession(partial: Partial<PbZoneSession>): PbZoneSession {
  const userName = partial.userName?.trim();
  return {
    userName: userName || DEFAULT_USER_NAME,
    token: partial.token?.replace(/^Bearer\s+/i, "").trim() || null,
    userId: partial.userId != null ? String(partial.userId) : null,
  };
}

function hasSessionData(session: Partial<PbZoneSession>): boolean {
  return Boolean(
    (session.userName?.trim() && session.userName !== DEFAULT_USER_NAME) ||
      session.token ||
      session.userId,
  );
}

function mergeField<T extends string | null>(
  ...values: (T | undefined)[]
): T | null {
  for (const value of values) {
    if (value != null && value !== "") return value;
  }
  return null;
}

function mergeUserName(...values: (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && trimmed !== DEFAULT_USER_NAME) return trimmed;
  }
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return DEFAULT_USER_NAME;
}

export function parseSessionFromSearchParams(
  search: string,
): Partial<PbZoneSession> | null {
  const params = new URLSearchParams(search);
  const userName = params.get("userName") ?? params.get("name");
  const token = params.get("token") ?? params.get("authToken");
  const userId = params.get("userId") ?? params.get("id");

  if (!userName && !token && !userId) return null;

  return normalizeSession({
    userName: userName ?? undefined,
    token,
    userId,
  });
}

function parseMobileSessionJson(raw: string): Partial<PbZoneSession> | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object") return null;
    return normalizeSession(parseRecord(data));
  } catch {
    return null;
  }
}

function readFromStorage(storage: Storage): Partial<PbZoneSession> | null {
  const raw = storage.getItem(MOBILE_SESSION_KEY);
  if (raw) {
    const parsed = parseMobileSessionJson(raw);
    if (parsed && hasSessionData(parsed)) return parsed;
  }

  const userName = storage.getItem(MOBILE_USER_NAME_KEY) ?? undefined;
  const token = storage.getItem(MOBILE_TOKEN_KEY);
  const userId = storage.getItem(MOBILE_USER_ID_KEY);

  if (userName || token || userId) {
    return normalizeSession({
      userName,
      token,
      userId,
    });
  }

  return null;
}

/** Mobile WebView inject — sessionStorage, localStorage, window global */
export function loadMobileInjectedSession(): Partial<PbZoneSession> | null {
  if (typeof window === "undefined") return null;

  const fromSession = readFromStorage(sessionStorage);
  if (fromSession) return fromSession;

  try {
    const fromLocal = readFromStorage(localStorage);
    if (fromLocal) return fromLocal;
  } catch {
    // localStorage may be blocked in some WebViews
  }

  const globalSession = window.__PB_ZONE_SESSION__;
  if (globalSession) {
    const parsed = normalizeSession(
      parseRecord(globalSession as Record<string, unknown>),
    );
    if (hasSessionData(parsed)) return parsed;
  }

  return null;
}

export function loadStoredSession(): Partial<PbZoneSession> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return normalizeSession(JSON.parse(raw) as PbZoneSession);
  } catch {
    return null;
  }
}

export function storeSession(session: PbZoneSession): void {
  if (typeof window === "undefined") return;

  const normalized = normalizeSession(session);
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));

  sessionStorage.setItem(MOBILE_SESSION_KEY, JSON.stringify(normalized));
  sessionStorage.setItem(MOBILE_USER_NAME_KEY, normalized.userName);
  if (normalized.token) {
    sessionStorage.setItem(MOBILE_TOKEN_KEY, normalized.token);
  }
  if (normalized.userId) {
    sessionStorage.setItem(MOBILE_USER_ID_KEY, normalized.userId);
  }

  window.__PB_ZONE_SESSION__ = normalized;
}

/**
 * Merge all session sources — per field priority: URL > mobile inject > stored
 */
export function resolveClientSession(search: string): PbZoneSession {
  const fromUrl = parseSessionFromSearchParams(search);
  const fromMobile = loadMobileInjectedSession();
  const stored = loadStoredSession();

  return normalizeSession({
    userName: mergeUserName(
      fromUrl?.userName,
      fromMobile?.userName,
      stored?.userName,
    ),
    token: mergeField(
      fromUrl?.token ?? undefined,
      fromMobile?.token ?? undefined,
      stored?.token ?? undefined,
    ),
    userId: mergeField(
      fromUrl?.userId ?? undefined,
      fromMobile?.userId ?? undefined,
      stored?.userId ?? undefined,
    ),
  });
}

export function isGuestSession(session: PbZoneSession): boolean {
  return (
    session.userName === DEFAULT_USER_NAME &&
    !session.token &&
    !session.userId
  );
}

export async function fetchUserProfile(
  token: string,
): Promise<{ firstName: string; lastName: string; userName: string } | null> {
  const clean = token.replace(/^Bearer\s+/i, "").trim();
  if (!clean) return null;

  try {
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: clean }),
      cache: "no-store",
    });

    const json = (await res.json()) as {
      success?: boolean;
      data?: { firstName: string; lastName: string; userName: string };
      error?: string;
      status?: number;
      body?: unknown;
    };

    if (!res.ok || !json.success || !json.data?.userName) {
      console.warn("[PB Zone] profile API failed:", {
        status: res.status,
        error: json.error,
        upstream: json.body,
      });
      return null;
    }

    return json.data;
  } catch (error) {
    console.warn("[PB Zone] profile API error:", error);
    return null;
  }
}
