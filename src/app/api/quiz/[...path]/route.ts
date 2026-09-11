import { createHmac } from "crypto";
import http from "http";
import https from "https";
import { after, NextRequest, NextResponse } from "next/server";
import { enforceQuestionBankCap } from "@/lib/quizQuestionBankCap";
import {
  getLiveQuizMirror,
  recordLiveQuizAnswer,
  recordLiveQuizStart,
} from "@/lib/quizLiveMirrorStore";
import { asMirrorQuestion } from "@/lib/quizLiveMirror";
import {
  identityFromJwt,
  isPlaceholderDisplayName,
} from "@/lib/playerIdentity";
import { displayNameFromPotatoBazaar } from "@/lib/pbUserProfile";
import { rememberPlayerName } from "@/lib/playerNameStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function quizUpstreamBase() {
  return (
    process.env.QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://pbzone-api.potatobazaar.com"
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
      user_id: userId,
      name: userName,
      fullName: userName,
      userName,
      role: "user",
      iat: now,
      exp: now + 60 * 60 * 12,
    }),
  );
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

async function resolveAuthHeaders(
  request: NextRequest,
  options?: { resolveName?: boolean },
): Promise<Headers> {
  const headers = new Headers();
  headers.set("accept", "application/json");

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const incomingAuth = request.headers.get("authorization");
  const jwtIdentity = identityFromJwt(incomingAuth);
  const headerName = request.headers.get("x-user-name");
  const userId =
    request.headers.get("x-user-id") ||
    jwtIdentity.userId ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_ID ||
    process.env.QUIZ_DEV_USER_ID ||
    "dev-user-1";
  let userName =
    [jwtIdentity.userName, headerName].find(
      (name) => name && !isPlaceholderDisplayName(name),
    ) ||
    jwtIdentity.userName ||
    headerName ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_NAME ||
    process.env.QUIZ_DEV_USER_NAME ||
    "Potato Player";

  if (options?.resolveName && incomingAuth) {
    const fromProfile = await displayNameFromPotatoBazaar(incomingAuth);
    if (fromProfile && !isPlaceholderDisplayName(fromProfile)) {
      userName = fromProfile;
    }
  }

  rememberPlayerName(userId, userName);

  headers.set("x-user-id", userId);
  headers.set("x-user-name", userName);

  const adminKey = request.headers.get("x-admin-key");
  if (adminKey) headers.set("x-admin-key", adminKey);

  const canSign = Boolean(process.env.QUIZ_JWT_SECRET || process.env.JWT_SECRET);
  const signed =
    canSign && userId && !isPlaceholderDisplayName(userName)
      ? signDevBearerToken(userId, userName)
      : null;

  if (signed) {
    headers.set("authorization", `Bearer ${signed}`);
  } else if (incomingAuth) {
    headers.set("authorization", incomingAuth);
  } else if (
    canSign &&
    process.env.QUIZ_DEV_AUTO_TOKEN !== "false"
  ) {
    const token = signDevBearerToken(userId, userName);
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
}

type UpstreamResult = {
  status: number;
  contentType: string | null;
  body: string;
};

/**
 * Node http(s) request so we can optionally skip TLS hostname checks
 * when QUIZ_API_TLS_INSECURE=true (misconfigured deploy cert).
 */
function upstreamRequest(
  target: URL,
  method: string,
  headers: Headers,
  body?: string,
): Promise<UpstreamResult> {
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
    if (body) req.write(body);
    req.end();
  });
}

function unwrapData(body: string): Record<string, unknown> | null {
  try {
    const json = JSON.parse(body) as Record<string, unknown>;
    if (json && typeof json === "object" && json.data && typeof json.data === "object") {
      return json.data as Record<string, unknown>;
    }
    return json;
  } catch {
    return null;
  }
}

function recordQuizTraffic(
  method: string,
  segments: string[],
  userId: string,
  responseBody: string,
) {
  if (method !== "POST") return;
  const data = unwrapData(responseBody);
  if (!data) return;

  if (segments.length === 1 && segments[0] === "sessions") {
    const sessionId = String(
      data.sessionId ??
        data.id ??
        (data.session as { id?: string } | undefined)?.id ??
        "",
    );
    recordLiveQuizStart({
      userId,
      sessionId,
      question: asMirrorQuestion(data.question) ?? {},
    });
    return;
  }

  if (segments[0] !== "sessions" || segments.length < 3) return;
  const sessionId = segments[1];
  const action = segments[2];
  if (action === "answer") {
    recordLiveQuizAnswer({
      userId,
      sessionId,
      correctOption: data.correctOption ? String(data.correctOption) : null,
      nextQuestion: asMirrorQuestion(data.nextQuestion),
    });
    return;
  }
  if (action === "lifeline") {
    recordLiveQuizAnswer({
      userId,
      sessionId,
      correctOption: data.correctOption ? String(data.correctOption) : null,
      nextQuestion: asMirrorQuestion(data.nextQuestion),
    });
  }
}

async function proxyQuiz(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const segments = path ?? [];

  if (
    request.method === "GET" &&
    segments.length === 1 &&
    segments[0] === "live-session"
  ) {
    return NextResponse.json(
      { success: true, data: getLiveQuizMirror() },
      { status: 200 },
    );
  }

  const upstreamPath = `/v1/quiz/${segments.join("/")}`;
  const target = new URL(`${quizUpstreamBase()}${upstreamPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const resolveName =
    request.method === "POST" &&
    segments.length === 1 &&
    segments[0] === "sessions";
  const headers = await resolveAuthHeaders(request, { resolveName });
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const text = await request.text();
    if (text) body = text;
  }

  try {
    const upstream = await upstreamRequest(
      target,
      request.method,
      headers,
      body,
    );
    const responseHeaders = new Headers();
    if (upstream.contentType) {
      responseHeaders.set("content-type", upstream.contentType);
    }

    if (upstream.status >= 200 && upstream.status < 300) {
      recordQuizTraffic(
        request.method,
        segments,
        headers.get("x-user-id") || "dev-user-1",
        upstream.body,
      );
      if (
        request.method === "POST" &&
        segments.length === 1 &&
        segments[0] === "sessions"
      ) {
        after(() => {
          void enforceQuestionBankCap().catch((error) => {
            console.error("[quiz-bank-cap]", error);
          });
        });
      }
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error
        ? (error as Error & {
            cause?: { code?: string; reason?: string };
          }).cause
        : undefined;
    const code =
      cause?.code ||
      (error instanceof Error && "code" in error
        ? String((error as Error & { code?: string }).code)
        : undefined);
    const detail =
      code === "ECONNREFUSED"
        ? `Quiz BE not reachable at ${target.origin} (is it running?)`
        : code === "ERR_TLS_CERT_ALTNAME_INVALID"
          ? `SSL cert mismatch for ${target.origin}. Fix server cert or set QUIZ_API_TLS_INSECURE=true for local dev.`
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
