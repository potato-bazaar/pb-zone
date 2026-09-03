import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function quizUpstreamBase() {
  return (
    process.env.QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3001"
  );
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

/** Mint a short-lived JWT matching quiz BE JWT_SECRET (local/dev only). */
function signDevBearerToken(userId: string, userName: string) {
  const secret =
    process.env.QUIZ_JWT_SECRET ||
    process.env.JWT_SECRET ||
    "";
  if (!secret) return null;

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      sub: userId,
      id: userId,
      userId,
      name: userName,
      fullName: userName,
      role: "user",
      iat: now,
      exp: now + 60 * 60 * 12,
    }),
  );
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function resolveAuthHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  headers.set("accept", "application/json");

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const incomingAuth = request.headers.get("authorization");
  if (incomingAuth) {
    headers.set("authorization", incomingAuth);
  }

  const userId =
    request.headers.get("x-user-id") ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_ID ||
    process.env.QUIZ_DEV_USER_ID ||
    "dev-user-1";
  const userName =
    request.headers.get("x-user-name") ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_NAME ||
    process.env.QUIZ_DEV_USER_NAME ||
    "Potato Player";

  // Always forward bypass headers (useful when BE AUTH_DEV_BYPASS=true)
  headers.set("x-user-id", userId);
  headers.set("x-user-name", userName);

  const adminKey = request.headers.get("x-admin-key");
  if (adminKey) headers.set("x-admin-key", adminKey);

  // If no Bearer token, auto-sign one for local/dev so Start Quiz works
  const autoToken =
    process.env.QUIZ_DEV_AUTO_TOKEN !== "false" &&
    !incomingAuth &&
    Boolean(process.env.QUIZ_JWT_SECRET || process.env.JWT_SECRET);

  if (autoToken) {
    const token = signDevBearerToken(userId, userName);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

async function proxyQuiz(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const segments = path ?? [];
  const upstreamPath = `/v1/quiz/${segments.join("/")}`;
  const target = new URL(`${quizUpstreamBase()}${upstreamPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const headers = resolveAuthHeaders(request);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.text();
    if (body) init.body = body;
  }

  try {
    const upstream = await fetch(target.toString(), init);
    const text = await upstream.text();
    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) responseHeaders.set("content-type", upstreamType);

    return new NextResponse(text, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error
        ? (error as Error & { cause?: { code?: string } }).cause
        : undefined;
    const detail =
      cause?.code === "ECONNREFUSED"
        ? `Quiz BE not reachable at ${target.origin} (is it running on port 3001?)`
        : error instanceof Error
          ? error.message
          : "Failed to reach quiz API";

    console.error("[quiz proxy]", target.toString(), error);
    return NextResponse.json(
      {
        error: "Quiz API unreachable",
        message: detail,
        upstream: target.toString(),
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}
