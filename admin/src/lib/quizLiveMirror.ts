export const QUIZ_LIVE_MIRROR_KEY = 'pb-zone-quiz-live-session';

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

export function parseLiveMirror(raw: unknown): QuizLiveMirror | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<QuizLiveMirror>;
  if (!value.sessionId || !Array.isArray(value.questions)) return null;
  return {
    sessionId: String(value.sessionId),
    userId: String(value.userId || ''),
    updatedAt: String(value.updatedAt || new Date().toISOString()),
    totalQuestions: Number(value.totalQuestions || value.questions.length),
    questions: value.questions.map((row, fallbackIndex) => ({
      id: String(row?.id || `live-q-${fallbackIndex}`),
      index: Number(row?.index ?? fallbackIndex),
      question: String(row?.question || ''),
      options: {
        A: String(row?.options?.A || ''),
        B: String(row?.options?.B || ''),
        C: String(row?.options?.C || ''),
        D: String(row?.options?.D || ''),
      },
      correctOption: row?.correctOption ? String(row.correctOption).toUpperCase() : null,
    })),
  };
}

export function readLiveMirrorFromStorage(): QuizLiveMirror | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(QUIZ_LIVE_MIRROR_KEY);
    if (!raw) return null;
    return parseLiveMirror(JSON.parse(raw));
  } catch {
    return null;
  }
}
