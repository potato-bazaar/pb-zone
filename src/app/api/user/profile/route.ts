import { NextRequest, NextResponse } from "next/server";

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

function cleanToken(token: string): string {
  return token.replace(/^Bearer\s+/i, "").trim();
}

function extractProfile(
  json: unknown,
): { firstName: string; lastName: string; userName: string } | null {
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

  const full =
    (typeof data.name === "string" && data.name) ||
    (typeof data.userName === "string" && data.userName) ||
    (typeof data.fullName === "string" && data.fullName) ||
    "";

  if (!full.trim()) return null;

  const parts = full.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    userName: full.trim(),
  };
}

async function fetchProfileFromApi(token: string) {
  const url = `${apiBaseUrl()}${profileEndpoint()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
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
      ok: false as const,
      status: res.status,
      error: "Invalid JSON from upstream API",
      raw: text.slice(0, 300),
    };
  }

  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      error: "Upstream profile request failed",
      body: json,
    };
  }

  const profile = extractProfile(json);
  if (!profile) {
    return {
      ok: false as const,
      status: 502,
      error: "Could not parse profile from API response",
      body: json,
    };
  }

  return { ok: true as const, profile };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token ? cleanToken(body.token) : "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 401 },
      );
    }

    const result = await fetchProfileFromApi(token);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, ...result },
        { status: result.status || 502 },
      );
    }

    return NextResponse.json({ success: true, data: result.profile });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 },
    );
  }
}

/** GET fallback: /api/user/profile?token=... */
export async function GET(request: NextRequest) {
  const raw =
    request.nextUrl.searchParams.get("token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  const token = cleanToken(raw);

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing token" },
      { status: 401 },
    );
  }

  const result = await fetchProfileFromApi(token);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, ...result },
      { status: result.status || 502 },
    );
  }

  return NextResponse.json({ success: true, data: result.profile });
}
