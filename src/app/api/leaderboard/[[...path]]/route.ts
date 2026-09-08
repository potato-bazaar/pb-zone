import { createHmac } from "crypto";
import http from "http";
import https from "https";
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

function signDevBearerToken(userId: string, userName: string) {
  const secret = process.env.QUIZ_JWT_SECRET || process.env.JWT_SECRET || "";
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

  headers.set("x-user-id", userId);
  headers.set("x-user-name", userName);

  const autoToken =
    process.env.QUIZ_DEV_AUTO_TOKEN !== "false" &&
    !incomingAuth &&
    Boolean(process.env.QUIZ_JWT_SECRET || process.env.JWT_SECRET);

  if (autoToken) {
    const token = signDevBearerToken(userId, userName);
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
}

function upstreamRequest(
  target: URL,
  method: string,
  headers: Headers,
): Promise<{ status: number; contentType: string | null; body: string }> {
  const insecure = process.env.QUIZ_API_TLS_INSECURE === "true";
  const isHttps = target.protocol === "https:";
  const lib = isHttps ? https : http;
  const headerBag: Record<string, string> = {};
  headers.forEach((value, key) => {
    headerBag[key] = value;
  });

  return new Promise((resolve, reject) => {
    const req = lib.request(
      target,
      {
        method,
        headers: headerBag,
        ...(isHttps && insecure
          ? { rejectUnauthorized: false, checkServerIdentity: () => undefined }
          : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 502,
            contentType: res.headers["content-type"] ?? null,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function proxyLeaderboard(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  const segments = path ?? [];
  const upstreamPath = `/v1/leaderboard${segments.length ? `/${segments.join("/")}` : ""}`;
  const target = new URL(`${quizUpstreamBase()}${upstreamPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  try {
    const upstream = await upstreamRequest(
      target,
      request.method,
      resolveAuthHeaders(request),
    );
    const responseHeaders = new Headers();
    if (upstream.contentType) {
      responseHeaders.set("content-type", upstream.contentType);
    }
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach leaderboard API";
    console.error("[leaderboard proxy]", target.toString(), error);
    return NextResponse.json(
      {
        error: "Leaderboard API unreachable",
        message,
        upstream: target.toString(),
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxyLeaderboard(request, context);
}
