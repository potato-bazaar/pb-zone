/** Quiz BE API types + client (Bearer auth). */

export type QuizOptionKey = "A" | "B" | "C" | "D";

export type QuizApiOption = {
  key: QuizOptionKey;
  text: string;
};

export type QuizApiQuestion = {
  index: number;
  total: number;
  timerSeconds: number;
  question: string;
  options: QuizApiOption[];
  id?: string;
  explanation?: string;
};

export type QuizLifelineSettings = {
  fiftyFiftyCost: number;
  extraTimeCost: number;
  skipCost: number;
  extraTimeSeconds: number;
};

export type QuizSessionSettings = {
  timerSeconds: number;
  pointsPerCorrect?: number;
  lifelines: QuizLifelineSettings;
};

export type QuizSessionStartData = {
  sessionId: string;
  user: { name?: string; points: number };
  settings: QuizSessionSettings;
  question: QuizApiQuestion;
};

export type QuizAnswerData = {
  correct: boolean;
  correctOption: QuizOptionKey;
  correctOptionText?: string;
  explanation?: string;
  pointsAwarded: number;
  sessionScore: number;
  userPoints: number;
  status: "active" | "completed" | string;
  nextQuestion: QuizApiQuestion | null;
};

export type QuizLifelineType = "fifty_fifty" | "extra_time" | "skip";

export type QuizLifelineData = {
  type: QuizLifelineType;
  userPoints: number;
  options?: QuizApiOption[];
  removedOptions?: QuizOptionKey[];
  extraTimeSeconds?: number;
  nextQuestion?: QuizApiQuestion | null;
  status?: "active" | "completed" | string;
  pointsAwarded?: number;
  sessionScore?: number;
};

export type QuizResultData = {
  correctCount: number;
  totalQuestions: number;
  sessionScore: number;
  userPoints: number;
  fastBonus?: number;
  completionBonus?: number;
  pointsAwarded?: number;
  /** Points earned from correct answers only (before bonuses) */
  answerPoints?: number;
};

export type QuizPointsData = {
  name?: string;
  points: number;
};

type ApiEnvelope<T> = { data: T; message?: string; error?: string };

export class QuizApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "QuizApiError";
    this.status = status;
    this.body = body;
  }
}

function quizBaseUrl() {
  const publicBase = process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(
    /\/$/,
    "",
  );
  // Prefer same-origin proxy to avoid CORS in browser / WebView
  if (process.env.NEXT_PUBLIC_QUIZ_USE_PROXY !== "false") {
    return "/api/quiz";
  }
  return publicBase || "http://localhost:3001/v1/quiz";
}

export type QuizAuth = {
  token: string | null;
  userId?: string | null;
  userName?: string | null;
};

function buildHeaders(auth: QuizAuth): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token.replace(/^Bearer\s+/i, "").trim()}`;
  }

  // Always send identity hints — proxy uses these for local JWT / BE bypass
  const userId =
    auth.userId ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_ID ||
    "dev-user-1";
  const userName =
    auth.userName ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_NAME ||
    process.env.NEXT_PUBLIC_DEFAULT_USER_NAME ||
    "Potato Player";
  headers["x-user-id"] = userId;
  headers["x-user-name"] = userName;

  return headers;
}

async function quizFetch<T>(
  path: string,
  auth: QuizAuth,
  init?: RequestInit,
): Promise<T> {
  const base = quizBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(auth),
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    let msg = `Quiz API error (${res.status})`;
    if (json && typeof json === "object") {
      const payload = json as { message?: unknown; error?: unknown };
      const fromApi = payload.message ?? payload.error;
      if (typeof fromApi === "string" && fromApi.trim()) msg = fromApi;
    }
    throw new QuizApiError(msg, res.status, json);
  }

  if (json && typeof json === "object" && "data" in json) {
    return (json as ApiEnvelope<T>).data;
  }

  return json as T;
}

export function fetchQuizPoints(auth: QuizAuth) {
  return quizFetch<QuizPointsData>("/me/points", auth, { method: "GET" }).then(
    (data) => ({
      name: data.name,
      points: Number(
        (data as QuizPointsData).points ??
          (data as { userPoints?: number }).userPoints ??
          0,
      ),
    }),
  );
}

function normalizeQuestion(raw: Partial<QuizApiQuestion> | null | undefined) {
  if (!raw) return null;
  const options = (raw.options ?? []).map((opt) => ({
    key: (opt.key ||
      (opt as { id?: QuizOptionKey }).id ||
      "A") as QuizOptionKey,
    text: opt.text ?? "",
  }));
  return {
    id: raw.id,
    index: Number(raw.index ?? 1),
    total: Number(raw.total ?? (options.length || 12)),
    timerSeconds: Number(raw.timerSeconds ?? 8),
    question: raw.question ?? "",
    options,
    explanation: raw.explanation,
  } satisfies QuizApiQuestion;
}

function normalizeSettings(
  raw: Partial<QuizSessionSettings> | null | undefined,
): QuizSessionSettings {
  const life = raw?.lifelines;
  return {
    timerSeconds: Number(raw?.timerSeconds ?? 8),
    pointsPerCorrect: raw?.pointsPerCorrect,
    lifelines: {
      fiftyFiftyCost: Number(life?.fiftyFiftyCost ?? 10),
      extraTimeCost: Number(life?.extraTimeCost ?? 10),
      skipCost: Number(life?.skipCost ?? 10),
      extraTimeSeconds: Number(life?.extraTimeSeconds ?? 10),
    },
  };
}

export function startQuizSession(auth: QuizAuth) {
  return quizFetch<Record<string, unknown>>("/sessions", auth, {
    method: "POST",
    body: JSON.stringify({}),
  }).then((raw) => {
    const user = (raw.user as { name?: string; points?: number } | undefined) ??
      {};
    const question = normalizeQuestion(
      (raw.question as QuizApiQuestion | undefined) ?? null,
    );
    if (!question) {
      throw new QuizApiError("Start session missing question", 500, raw);
    }
    return {
      sessionId: String(
        raw.sessionId ?? raw.id ?? (raw.session as { id?: string })?.id ?? "",
      ),
      user: {
        name: user.name,
        points: Number(
          user.points ??
            (raw as { userPoints?: number }).userPoints ??
            0,
        ),
      },
      settings: normalizeSettings(
        raw.settings as QuizSessionSettings | undefined,
      ),
      question,
    } satisfies QuizSessionStartData;
  });
}

export function submitQuizAnswer(
  auth: QuizAuth,
  sessionId: string,
  option: QuizOptionKey,
) {
  return quizFetch<QuizAnswerData>(
    `/sessions/${encodeURIComponent(sessionId)}/answer`,
    auth,
    {
      method: "POST",
      body: JSON.stringify({ option }),
    },
  ).then((data) => ({
    ...data,
    nextQuestion: normalizeQuestion(data.nextQuestion),
    pointsAwarded: Number(data.pointsAwarded ?? 0),
    sessionScore: Number(data.sessionScore ?? 0),
    userPoints: Number(data.userPoints ?? 0),
  }));
}

export function useQuizLifeline(
  auth: QuizAuth,
  sessionId: string,
  type: QuizLifelineType,
) {
  return quizFetch<QuizLifelineData>(
    `/sessions/${encodeURIComponent(sessionId)}/lifeline`,
    auth,
    {
      method: "POST",
      body: JSON.stringify({ type }),
    },
  ).then((data) => ({
    ...data,
    nextQuestion: data.nextQuestion
      ? normalizeQuestion(data.nextQuestion)
      : data.nextQuestion,
    userPoints: Number(data.userPoints ?? 0),
  }));
}

export function fetchQuizResult(auth: QuizAuth, sessionId: string) {
  return quizFetch<Record<string, unknown>>(
    `/sessions/${encodeURIComponent(sessionId)}/result`,
    auth,
    { method: "GET" },
  ).then((raw) => {
    const correctCount = Number(raw.correctCount ?? 0);
    const totalQuestions = Number(raw.totalQuestions ?? 0);
    // BE returns `score`; older docs used sessionScore / pointsAwarded
    const sessionScore = Number(
      raw.score ?? raw.sessionScore ?? raw.pointsAwarded ?? 0,
    );
    const fastBonus = Number(raw.fastBonus ?? 0);
    const completionBonus = Number(raw.completionBonus ?? 0);
    const totalEarned = Number(
      raw.pointsAwarded ??
        raw.totalEarned ??
        sessionScore + fastBonus + completionBonus,
    );

    return {
      correctCount,
      totalQuestions,
      sessionScore,
      answerPoints: sessionScore,
      userPoints: Number(raw.userPoints ?? 0),
      fastBonus,
      completionBonus,
      pointsAwarded: totalEarned,
    } satisfies QuizResultData;
  });
}

export function toUiOption(opt: QuizApiOption) {
  return { id: opt.key, text: opt.text };
}

export function defaultLifelineSettings(): QuizLifelineSettings {
  return {
    fiftyFiftyCost: 10,
    extraTimeCost: 10,
    skipCost: 10,
    extraTimeSeconds: 10,
  };
}
