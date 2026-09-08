/** Shared shape for the live Quiz Time session shown in /admin. */

export const QUIZ_LIVE_MIRROR_KEY = "pb-zone-quiz-live-session";

export type QuizLiveMirrorOptions = {
  A: string;
  B: string;
  C: string;
  D: string;
};

export type QuizLiveMirrorQuestion = {
  id: string;
  index: number;
  question: string;
  options: QuizLiveMirrorOptions;
  correctOption: string | null;
};

export type QuizLiveMirror = {
  sessionId: string;
  userId: string;
  updatedAt: string;
  totalQuestions: number;
  questions: QuizLiveMirrorQuestion[];
};

export type MirrorQuestionInput = {
  id?: string;
  index?: number;
  total?: number;
  question?: string;
  options?: Array<{ key?: string; id?: string; text?: string }>;
};

export function emptyMirrorOptions(): QuizLiveMirrorOptions {
  return { A: "", B: "", C: "", D: "" };
}

export function optionsFromApi(
  options: MirrorQuestionInput["options"],
): QuizLiveMirrorOptions {
  const mapped = emptyMirrorOptions();
  for (const opt of options ?? []) {
    const key = String(opt.key || opt.id || "").toUpperCase();
    if (key === "A" || key === "B" || key === "C" || key === "D") {
      mapped[key] = opt.text ?? "";
    }
  }
  return mapped;
}

export function asMirrorQuestion(value: unknown): MirrorQuestionInput | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.question == null && row.id == null) return null;
  const options = Array.isArray(row.options)
    ? row.options.map((opt) => {
        const item = (opt ?? {}) as Record<string, unknown>;
        return {
          key: item.key != null ? String(item.key) : undefined,
          id: item.id != null ? String(item.id) : undefined,
          text: item.text != null ? String(item.text) : undefined,
        };
      })
    : undefined;
  return {
    id: row.id != null ? String(row.id) : undefined,
    index: row.index != null ? Number(row.index) : undefined,
    total: row.total != null ? Number(row.total) : undefined,
    question: row.question != null ? String(row.question) : undefined,
    options,
  };
}

export function questionFromApi(
  input: MirrorQuestionInput,
  correctOption: string | null,
  fallbackIndex = 0,
): QuizLiveMirrorQuestion {
  const index = Number.isFinite(Number(input.index))
    ? Number(input.index)
    : fallbackIndex;
  return {
    id: input.id || `live-q-${index}`,
    index,
    question: input.question ?? "",
    options: optionsFromApi(input.options),
    correctOption: correctOption ? correctOption.toUpperCase() : null,
  };
}

export function upsertMirrorQuestion(
  mirror: QuizLiveMirror,
  next: QuizLiveMirrorQuestion,
): QuizLiveMirror {
  const questions = [...mirror.questions];
  const existing = questions.findIndex((row) => row.index === next.index);
  if (existing >= 0) {
    const prev = questions[existing];
    questions[existing] = {
      ...prev,
      ...next,
      correctOption: next.correctOption ?? prev.correctOption,
      options: {
        A: next.options.A || prev.options.A,
        B: next.options.B || prev.options.B,
        C: next.options.C || prev.options.C,
        D: next.options.D || prev.options.D,
      },
    };
  } else {
    questions.push(next);
  }
  questions.sort((a, b) => a.index - b.index);
  return {
    ...mirror,
    questions,
    totalQuestions: Math.max(mirror.totalQuestions, next.index + 1),
    updatedAt: new Date().toISOString(),
  };
}

export function parseLiveMirror(raw: unknown): QuizLiveMirror | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<QuizLiveMirror>;
  if (!value.sessionId || !Array.isArray(value.questions)) return null;
  return {
    sessionId: String(value.sessionId),
    userId: String(value.userId || ""),
    updatedAt: String(value.updatedAt || new Date().toISOString()),
    totalQuestions: Number(value.totalQuestions || value.questions.length),
    questions: value.questions.map((row, fallbackIndex) => ({
      id: String(row?.id || `live-q-${fallbackIndex}`),
      index: Number(row?.index ?? fallbackIndex),
      question: String(row?.question || ""),
      options: {
        A: String(row?.options?.A || ""),
        B: String(row?.options?.B || ""),
        C: String(row?.options?.C || ""),
        D: String(row?.options?.D || ""),
      },
      correctOption: row?.correctOption
        ? String(row.correctOption).toUpperCase()
        : null,
    })),
  };
}

export function readLiveMirrorFromStorage(): QuizLiveMirror | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(QUIZ_LIVE_MIRROR_KEY);
    if (!raw) return null;
    return parseLiveMirror(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeLiveMirrorToStorage(mirror: QuizLiveMirror) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUIZ_LIVE_MIRROR_KEY, JSON.stringify(mirror));
}

export function startLiveMirror(input: {
  userId: string;
  sessionId: string;
  question: MirrorQuestionInput;
}) {
  const question = questionFromApi(input.question, null, 0);
  writeLiveMirrorToStorage({
    sessionId: input.sessionId,
    userId: input.userId,
    updatedAt: new Date().toISOString(),
    totalQuestions: Number(input.question.total || 12),
    questions: [question],
  });
}

export function revealLiveMirrorAnswer(input: {
  sessionId: string;
  question: MirrorQuestionInput;
  correctOption: string | null;
  nextQuestion?: MirrorQuestionInput | null;
}) {
  const current = readLiveMirrorFromStorage();
  if (!current || current.sessionId !== input.sessionId) return;
  let next = upsertMirrorQuestion(
    current,
    questionFromApi(
      input.question,
      input.correctOption,
      current.questions.length,
    ),
  );
  if (input.nextQuestion) {
    next = upsertMirrorQuestion(
      next,
      questionFromApi(
        input.nextQuestion,
        null,
        next.questions.length,
      ),
    );
    next.totalQuestions = Number(
      input.nextQuestion.total || next.totalQuestions,
    );
  }
  writeLiveMirrorToStorage(next);
}

export function upsertLiveMirrorCurrent(input: {
  sessionId: string;
  userId: string;
  question: MirrorQuestionInput;
}) {
  const current = readLiveMirrorFromStorage();
  const question = questionFromApi(input.question, null, 0);
  if (!current || current.sessionId !== input.sessionId) {
    startLiveMirror(input);
    return;
  }
  writeLiveMirrorToStorage(upsertMirrorQuestion(current, question));
}
