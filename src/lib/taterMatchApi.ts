import type { TaterArtId, TaterModeId, TaterQuestion } from "@/data/taterMatch";

type RoundResponse = {
  data?: {
    published?: boolean;
    questions?: Array<{
      id: string;
      mode: TaterModeId;
      prompt: string;
      hint: string;
      learn: string;
      correctOptionId: string;
      sequence?: string[] | null;
      options: Array<{
        id: string;
        art: string;
        label?: string;
        imageUrl: string | null;
        imageCredit: { source: string; author: string | null; license: string | null } | null;
      }>;
    }>;
  };
};

/**
 * Questions published from the admin (real photos). Returns [] when nothing is published or the
 * backend can't be reached, so the game falls back to its built-in questions and drawings.
 */
export async function fetchPublishedRound(mode: TaterModeId | "mixed", count: number): Promise<TaterQuestion[]> {
  try {
    const res = await fetch(`/api/tater-match/round?mode=${mode}&count=${count}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as RoundResponse;
    if (!json.data?.published) return [];
    return (json.data.questions ?? [])
      .filter((q) => q.options.every((o) => o.imageUrl))
      .map((q) => ({
        id: q.id,
        mode: q.mode,
        prompt: q.prompt,
        hint: q.hint,
        learn: q.learn,
        correctOptionId: q.correctOptionId,
        ...(q.sequence ? { sequence: q.sequence } : {}),
        options: q.options.map((o) => ({
          id: o.id,
          art: o.art as TaterArtId,
          ...(o.label ? { label: o.label } : {}),
          imageUrl: o.imageUrl,
          imageCredit: o.imageCredit,
        })),
      }));
  } catch {
    return [];
  }
}
