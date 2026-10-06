import type { TaterQuestion } from "@/data/taterMatch";

type Photo = {
  url: string;
  credit: { source: string; author: string | null; license: string | null };
};

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]!;
}

/**
 * Puts an approved backend photo on every option of the built-in questions (matched by the option's
 * `art` id = photo category). Options without an approved photo keep their drawing.
 */
export async function withBackendPhotos(questions: TaterQuestion[]): Promise<TaterQuestion[]> {
  const categories = [...new Set(questions.flatMap((q) => q.options.map((o) => o.art)))];
  if (categories.length === 0) return questions;

  let photos: Record<string, Photo[]> = {};
  try {
    const res = await fetch(`/api/tater-match/photos?categories=${encodeURIComponent(categories.join(","))}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: Record<string, Photo[]> };
      photos = json.data ?? {};
    }
  } catch {
    return questions;
  }

  return questions.map((q) => ({
    ...q,
    options: q.options.map((o) => {
      const pool = photos[o.art];
      if (!pool?.length) return o;
      const photo = pick(pool);
      return { ...o, imageUrl: photo.url, imageCredit: photo.credit };
    }),
  }));
}
