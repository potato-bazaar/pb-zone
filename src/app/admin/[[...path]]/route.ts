import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const VITE_ORIGIN = "http://127.0.0.1:5173";

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function proxyVite(request: Request, relPath: string) {
  const incoming = new URL(request.url);
  const suffix = relPath ? `/admin/${relPath}` : "/admin/";
  const target = `${VITE_ORIGIN}${suffix}${incoming.search}`;
  const res = await fetch(target, {
    headers: {
      accept: request.headers.get("accept") ?? "*/*",
    },
    cache: "no-store",
    redirect: "manual",
  });
  const headers = new Headers();
  const contentType = res.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  return new Response(res.body, { status: res.status, headers });
}

async function serveBuiltAdmin(relPath: string) {
  const root = path.resolve(process.cwd(), "public", "admin");
  const requested = path.resolve(root, relPath || "index.html");
  if (requested !== root && !requested.startsWith(root + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }

  const filePath =
    existsSync(requested) && !requested.endsWith(path.sep) ? requested : path.join(root, "index.html");

  if (!existsSync(filePath)) {
    return new Response("Admin build missing. Run npm run build.", { status: 404 });
  }

  const body = await readFile(filePath);
  const type = MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
  return new Response(body, { headers: { "content-type": type } });
}

async function handle(request: Request, pathParts: string[]) {
  const relPath = pathParts.join("/");
  if (process.env.NODE_ENV !== "production") {
    return proxyVite(request, relPath);
  }
  return serveBuiltAdmin(relPath);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: pathParts = [] } = await context.params;
  return handle(request, pathParts);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: pathParts = [] } = await context.params;
  const res = await handle(request, pathParts);
  return new Response(null, { status: res.status, headers: res.headers });
}
