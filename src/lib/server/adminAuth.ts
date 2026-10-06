import { createHmac } from "crypto";

export function adminUpstreamBase() {
  return (
    process.env.QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://pbzone-api.potatobazaar.com"
  );
}

export function adminApiKey() {
  return process.env.QUIZ_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function signAdminBearerToken() {
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
