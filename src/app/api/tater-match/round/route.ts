import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function upstreamBase() {
  return (
    process.env.QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://pbzone-api.potatobazaar.com"
  );
}

/** Published Tater Match round (questions with real photos). Public, no auth needed. */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") || "mixed";
  const count = request.nextUrl.searchParams.get("count") || "10";
  const target = new URL(`${upstreamBase()}/v1/tater-match/round`);
  target.searchParams.set("mode", mode);
  target.searchParams.set("count", count);
  try {
    const upstream = await fetch(target, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Tater Match round unavailable" }, { status: 502 });
  }
}
