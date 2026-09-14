import { quizAdminFetch, QuizAdminClientError } from "@/lib/quizAdminClient";

export const QUESTION_BANK_CAP = 600;

type BankQuestion = {
  id: string;
  createdAt?: string;
  isActive?: boolean;
};

type BankStats = {
  total?: number;
  active?: number;
  dailyNewCount?: number;
};

type EnforceResult = {
  skipped?: boolean;
  reason?: string;
  activeBefore?: number;
  activeAfter?: number;
  kept?: number;
  pruned?: number;
  cap: number;
};

let pruneInFlight = false;
let lastOkAt = 0;
let lastKnownActive = 0;

export function questionBankCapFromStats(stats?: BankStats | null) {
  const daily = Number(stats?.dailyNewCount);
  if (Number.isFinite(daily) && daily > 0 && daily <= 1000) return Math.round(daily);
  return QUESTION_BANK_CAP;
}

function createdAtMs(row: BankQuestion) {
  if (!row.createdAt) return 0;
  const ms = Date.parse(row.createdAt);
  return Number.isFinite(ms) ? ms : 0;
}

function selectIdsToRetire(questions: BankQuestion[], keep: number) {
  if (keep <= 0 || questions.length <= keep) return [];
  const hasDates = questions.some((row) => createdAtMs(row) > 0);
  const ranked = hasDates
    ? [...questions].sort((a, b) => {
        const byDate = createdAtMs(b) - createdAtMs(a);
        if (byDate !== 0) return byDate;
        return String(b.id).localeCompare(String(a.id));
      })
    : [...questions];
  const keepRows = hasDates ? ranked.slice(0, keep) : ranked.slice(-keep);
  const keepIds = new Set(keepRows.map((row) => row.id));
  return questions.map((row) => row.id).filter((id) => id && !keepIds.has(id));
}

async function fetchAllActiveQuestions() {
  const questions: BankQuestion[] = [];
  let page = 1;
  let total = 0;

  while (page <= 25) {
    const query = new URLSearchParams({
      page: String(page),
      limit: "200",
      isActive: "true",
    });
    const payload = await quizAdminFetch<BankQuestion[]>(
      `/quiz-question-bank/questions?${query.toString()}`,
    );
    const rows = Array.isArray(payload.data) ? payload.data : [];
    questions.push(...rows);
    total = payload.pagination?.total ?? questions.length;
    if (questions.length >= total || rows.length === 0) break;
    page += 1;
  }

  return { questions, total };
}

async function deleteQuestionIds(ids: string[]) {
  const chunkSize = 80;
  let pruned = 0;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      const result = await quizAdminFetch<{ deleted?: number }>(
        "/quiz-question-bank/questions",
        { method: "DELETE", body: { ids: chunk } },
      );
      pruned += Number(result.data?.deleted ?? chunk.length);
    } catch (err) {
      if (
        !(err instanceof QuizAdminClientError) ||
        (err.status !== 404 && err.status !== 405)
      ) {
        throw err;
      }
      for (const id of chunk) {
        await quizAdminFetch(`/quiz-question-bank/questions/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        pruned += 1;
      }
    }
  }

  return pruned;
}

export async function pruneQuestionBankToLatest(keep = QUESTION_BANK_CAP) {
  try {
    const payload = await quizAdminFetch<{ kept?: number; removed?: number; keep?: number }>(
      "/quiz-question-bank/prune",
      { method: "POST", body: { keep } },
    );
    return {
      kept: Number(payload.data?.kept ?? keep),
      pruned: Number(payload.data?.removed ?? 0),
      cap: Number(payload.data?.keep ?? keep),
    };
  } catch (err) {
    if (
      !(err instanceof QuizAdminClientError) ||
      (err.status !== 404 && err.status !== 405)
    ) {
      throw err;
    }
  }

  const { questions } = await fetchAllActiveQuestions();
  const ids = selectIdsToRetire(questions, keep);
  if (ids.length === 0) {
    return { kept: questions.length, pruned: 0, cap: keep };
  }
  const pruned = await deleteQuestionIds(ids);
  return {
    kept: Math.max(0, questions.length - ids.length),
    pruned,
    cap: keep,
  };
}

/**
 * Keeps the live bank at one daily set. Safe to call often: no-ops when
 * already at cap, and ignores overlapping runs.
 */
export async function enforceQuestionBankCap(
  options?: { force?: boolean },
): Promise<EnforceResult> {
  const cap = QUESTION_BANK_CAP;
  if (pruneInFlight) {
    return { skipped: true, reason: "in-flight", cap };
  }
  if (
    !options?.force &&
    lastOkAt &&
    Date.now() - lastOkAt < 30 * 60 * 1000 &&
    lastKnownActive > 0 &&
    lastKnownActive <= cap
  ) {
    return {
      skipped: true,
      reason: "recently-ok",
      activeAfter: lastKnownActive,
      cap,
    };
  }

  pruneInFlight = true;
  try {
    const stats = await quizAdminFetch<BankStats>("/quiz-question-bank").catch(
      () => ({ data: null as BankStats | null }),
    );
    const resolvedCap = questionBankCapFromStats(stats.data);
    const activeBefore = Number(stats.data?.active ?? 0);
    lastKnownActive = activeBefore;

    if (activeBefore > 0 && activeBefore <= resolvedCap) {
      lastOkAt = Date.now();
      return {
        skipped: true,
        reason: "already-at-cap",
        activeBefore,
        activeAfter: activeBefore,
        cap: resolvedCap,
      };
    }

    const result = await pruneQuestionBankToLatest(resolvedCap);
    const nextStats = await quizAdminFetch<BankStats>("/quiz-question-bank").catch(
      () => ({ data: null as BankStats | null }),
    );
    const activeAfter = Number(nextStats.data?.active ?? result.kept);
    lastKnownActive = activeAfter;
    lastOkAt = Date.now();
    return {
      activeBefore: activeBefore || result.kept + result.pruned,
      activeAfter,
      kept: result.kept,
      pruned: result.pruned,
      cap: resolvedCap,
    };
  } finally {
    pruneInFlight = false;
  }
}
