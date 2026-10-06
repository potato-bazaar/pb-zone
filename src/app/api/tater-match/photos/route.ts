import { NextRequest, NextResponse } from "next/server";
import { adminApiKey, adminUpstreamBase, signAdminBearerToken } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type TaterPhoto = {
  url: string;
  credit: { source: string; author: string | null; license: string | null };
};

const CATEGORY_ID = /^[a-z0-9-]{1,64}$/;
const MAX_CATEGORIES = 40;
const CACHE_MS = 60_000;

const cache = new Map<string, { at: number; photos: TaterPhoto[] }>();

function absoluteUrl(url: string, base: string) {
  try {
    return new URL(url, `${base}/`).toString();
  } catch {
    return null;
  }
}

async function approvedPhotos(categoryId: string): Promise<TaterPhoto[]> {
  const hit = cache.get(categoryId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.photos;

  const base = adminUpstreamBase();
  const headers: Record<string, string> = { accept: "application/json" };
  const key = adminApiKey();
  if (key) headers["x-admin-key"] = key;
  const token = signAdminBearerToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(
    `${base}/v1/admin/tater-match/categories/${encodeURIComponent(categoryId)}/images?status=approved&limit=100`,
    { headers, cache: "no-store", signal: AbortSignal.timeout(5000) },
  );
  if (!res.ok) throw new Error(`Tater photos ${categoryId}: ${res.status}`);

  const json = (await res.json()) as {
    data?: {
      results?: Array<{
        url: string | null;
        source?: string;
        author?: string | null;
        license?: string | null;
      }>;
    };
  };
  const photos: TaterPhoto[] = [];
  for (const img of json.data?.results ?? []) {
    const url = img.url ? absoluteUrl(img.url, base) : null;
    if (!url) continue;
    photos.push({
      url,
      credit: { source: img.source ?? "web", author: img.author ?? null, license: img.license ?? null },
    });
  }
  cache.set(categoryId, { at: Date.now(), photos });
  return photos;
}

/** Approved Tater Match photos per category (the option `art` id), for the built-in questions. */
export async function GET(request: NextRequest) {
  const ids = [
    ...new Set(
      (request.nextUrl.searchParams.get("categories") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter((id) => CATEGORY_ID.test(id)),
    ),
  ].slice(0, MAX_CATEGORIES);

  const settled = await Promise.allSettled(ids.map((id) => approvedPhotos(id)));
  const data: Record<string, TaterPhoto[]> = {};
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") data[ids[i]!] = result.value;
    else console.error("[tater photos]", result.reason);
  });

  return NextResponse.json({ success: true, data });
}
