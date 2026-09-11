import { NextRequest, NextResponse } from "next/server";
import {
  cleanAuthToken,
  fetchPotatoBazaarProfile,
} from "@/lib/pbUserProfile";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token ? cleanAuthToken(body.token) : "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 401 },
      );
    }

    const result = await fetchPotatoBazaarProfile(token);

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
    request.headers.get("authorization") ??
    "";

  const token = cleanAuthToken(raw);

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing token" },
      { status: 401 },
    );
  }

  const result = await fetchPotatoBazaarProfile(token);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, ...result },
      { status: result.status || 502 },
    );
  }

  return NextResponse.json({ success: true, data: result.profile });
}
