import { createHmac } from "crypto";
import http from "http";
import https from "https";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminUpstreamBase() {
  // Same host Quiz Time uses — do not split admin onto a local BE.
  return (
    process.env.QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://pbzone-api.potatobazaar.com"
  );
}

function adminApiKey() {
  return process.env.QUIZ_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signAdminBearerToken() {
  const secret = process.env.QUIZ_JWT_SECRET || process.env.JWT_SECRET || "";
  if (!secret) return null;
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      sub: "pb-zone-admin-panel",
      id: "pb-zone-admin-panel",
      userId: "pb-zone-admin-panel",
      name: "PB Zone Admin",
      fullName: "PB Zone Admin",
      role: "admin",
      iat: now,
      exp: now + 60 * 60 * 12,
    }),
  );
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

type UpstreamResult = {
  status: number;
  contentType: string | null;
  body: string;
};

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

async function proxyAdmin(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const segments = path ?? [];
  const upstreamPath = `/v1/admin/${segments.join("/")}`;
  const target = new URL(`${adminUpstreamBase()}${upstreamPath}`);
  request.nextUrl.searchParams.forEach((value, keyName) => {
    target.searchParams.set(keyName, value);
  });

  const headers = new Headers();
  headers.set("accept", "application/json");
  const key = adminApiKey();
  if (key) headers.set("x-admin-key", key);
  const adminToken = signAdminBearerToken();
  if (adminToken) headers.set("authorization", `Bearer ${adminToken}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  if (!key && !adminToken) {
    return NextResponse.json(
      {
        error: "Admin auth missing",
        message:
          "Set QUIZ_ADMIN_API_KEY and/or QUIZ_JWT_SECRET in .env.local to read the live quiz bank.",
      },
      { status: 503 },
    );
  }

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
    responseHeaders.set("x-pb-admin-upstream", target.origin);
    responseHeaders.set("access-control-expose-headers", "x-pb-admin-upstream");

    if (upstream.status === 403) {
      let message = "Admin access required";
      try {
        const parsed = JSON.parse(upstream.body) as { message?: string };
        if (typeof parsed.message === "string" && parsed.message.trim()) {
          message = parsed.message;
        }
      } catch {
        // keep default
      }
      return NextResponse.json(
        {
          error: "Admin access required",
          message: `${message}. Set QUIZ_ADMIN_API_KEY in .env.local to the same value as the BE ADMIN_API_KEY for ${target.origin}.`,
          upstream: target.toString(),
        },
        { status: 403, headers: responseHeaders },
      );
    }
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const code =
      error instanceof Error && "code" in error
        ? String((error as Error & { code?: string }).code)
        : undefined;
    const detail =
      code === "ECONNREFUSED"
        ? `Quiz BE not reachable at ${target.origin}`
        : error instanceof Error
          ? error.message
          : "Failed to reach admin API";
    console.error("[admin proxy]", target.toString(), error);
    return NextResponse.json(
      {
        error: "Quiz admin API unreachable",
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
  return proxyAdmin(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAdmin(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAdmin(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAdmin(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAdmin(request, context);
}
