import { createHmac } from "crypto";
import http from "http";
import https from "https";

export function quizAdminBase() {
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

export class QuizAdminClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "QuizAdminClientError";
    this.status = status;
  }
}

export async function quizAdminFetch<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<{
  data: T;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}> {
  const key = adminApiKey();
  const token = signAdminBearerToken();
  if (!key && !token) {
    throw new QuizAdminClientError(
      "Set QUIZ_ADMIN_API_KEY and/or QUIZ_JWT_SECRET to manage the quiz bank.",
      503,
    );
  }

  const target = new URL(
    `${quizAdminBase()}/v1/admin${path.startsWith("/") ? path : `/${path}`}`,
  );
  const headers = new Headers();
  headers.set("accept", "application/json");
  if (key) headers.set("x-admin-key", key);
  if (token) headers.set("authorization", `Bearer ${token}`);

  let body: string | undefined;
  if (init?.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.body);
  }

  const upstream = await upstreamRequest(
    target,
    init?.method ?? "GET",
    headers,
    body,
  );

  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(upstream.body) as Record<string, unknown>;
  } catch {
    json = null;
  }

  if (upstream.status < 200 || upstream.status >= 300) {
    const fromApi =
      (typeof json?.message === "string" && json.message) ||
      (typeof json?.error === "string" && json.error) ||
      `Quiz admin API error (${upstream.status})`;
    throw new QuizAdminClientError(fromApi, upstream.status);
  }

  return {
    data: (json?.data as T) ?? (json as T),
    pagination: json?.pagination as
      | { page: number; limit: number; total: number; totalPages: number }
      | undefined,
  };
}
