const PLACEHOLDER_NAMES = new Set([
  "player",
  "potato player",
  "anonymous",
  "guest",
  "user",
  "unknown",
  "dev-user-1",
]);

export function isPlaceholderDisplayName(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_NAMES.has(trimmed.toLowerCase());
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const clean = token.replace(/^Bearer\s+/i, "").trim();
  const parts = clean.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : decodeUriPayload(padded);
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function decodeUriPayload(padded: string) {
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function displayNameFromRecord(
  data: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!data) return undefined;

  const nested = data.user ?? data.profile ?? data.userData;
  const nestedRecord =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : null;

  const direct = pickString(
    data.playerName,
    data.fullName,
    data.displayName,
    data.userName,
    data.username,
    data.name,
    nestedRecord?.fullName,
    nestedRecord?.displayName,
    nestedRecord?.userName,
    nestedRecord?.name,
  );
  if (direct && !isPlaceholderDisplayName(direct)) return direct;

  const first = pickString(
    data.firstName,
    data.first_name,
    data.given_name,
    nestedRecord?.firstName,
    nestedRecord?.first_name,
  );
  const last = pickString(
    data.lastName,
    data.last_name,
    data.family_name,
    nestedRecord?.lastName,
    nestedRecord?.last_name,
  );
  const combined = `${first ?? ""} ${last ?? ""}`.trim();
  if (combined) return combined;

  return direct;
}

export function userIdFromRecord(
  data: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!data) return undefined;
  const nested = data.user ?? data.profile ?? data.userData;
  const nestedRecord =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : null;
  return pickString(
    data.userId,
    data.user_id,
    data.uid,
    data.sub,
    data.id,
    nestedRecord?.userId,
    nestedRecord?.user_id,
    nestedRecord?.id,
  );
}

export function identityFromJwt(token?: string | null): {
  userId?: string;
  userName?: string;
} {
  if (!token) return {};
  const payload = decodeJwtPayload(token);
  if (!payload) return {};
  return {
    userId: userIdFromRecord(payload),
    userName: displayNameFromRecord(payload),
  };
}
