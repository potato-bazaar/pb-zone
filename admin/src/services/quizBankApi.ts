import { QuizQuestion } from '../types/quiz';
import { parseLiveMirror, type QuizLiveMirror } from '../lib/quizLiveMirror';

export type QuizBankOptionMap = {
  A: string;
  B: string;
  C: string;
  D: string;
};

export type QuizBankQuestion = {
  id: string;
  question: string;
  options: QuizBankOptionMap;
  correctOption: string;
  topic: string | null;
  source: string;
  isActive: boolean;
  timesUsed: number;
  createdAt?: string;
};

export type QuizBankStats = {
  total: number;
  active: number;
  target: number;
  dailyNewCount?: number;
};

export type QuizApiSettings = {
  pointsPerCorrect: number;
  questionsPerQuiz: number;
  timerSeconds: number;
  lifelineFiftyFiftyCost?: number;
  lifelineExtraTimeCost?: number;
  lifelineSkipCost?: number;
  extraTimeSeconds?: number;
  fastAnswerBonus?: number;
  fastAnswerSeconds?: number;
  completeQuizBonus?: number;
};

export type QuizPlayStats = {
  playerCount: number;
  sessionCount: number;
  winnersCount: number;
  topWinnerName: string | null;
  topWinnerCount: number;
};

export type QuizTelemetryQuestionStat = {
  questionNumber: number;
  questionText: string;
  correctPercentage: number;
  wrongPercentage: number;
  skipPercentage: number;
  dropoffPercentage: number;
  avgResponseTimeSeconds: number;
  answered: number;
  correct: number;
  skipped: number;
  wrong: number;
};

export type QuizTelemetryPlayer = {
  rank: number;
  userId: string;
  sessionId: string;
  playerName: string;
  status: string;
  correctCount: number;
  skippedCount: number;
  wrongCount: number;
  unansweredCount: number;
  answeredCount: number;
  totalQuestions: number;
  sessionScore: number;
  userPoints: number;
  percentage: number;
  durationSeconds: number;
  startedAt: string | Date;
  completedAt: string | Date | null;
};

export type QuizTelemetry = {
  questionsPerQuiz: number;
  playerCount: number;
  sessionCount: number;
  completedSessions: number;
  winnersCount: number;
  winRatePercentage: number;
  completionRatePercentage: number;
  averageScore: number;
  averageTimeMinutes: number;
  topWinnerName: string | null;
  topWinnerPoints: number;
  questionStats: QuizTelemetryQuestionStat[];
  players: QuizTelemetryPlayer[];
};

export type QuizBankPage = {
  questions: QuizBankQuestion[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  upstream?: string;
};

export class QuizBankApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'QuizBankApiError';
    this.status = status;
  }
}

async function adminFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{
  data: T;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  message?: string;
  upstream?: string;
}> {
  const url = `/api/admin${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.body && !headers['content-type']) {
    headers['content-type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });

  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const fromApi =
      (typeof json?.message === 'string' && json.message) ||
      (typeof json?.error === 'string' && json.error) ||
      `Quiz admin API error (${res.status})`;
    throw new QuizBankApiError(fromApi, res.status);
  }

  return {
    data: (json?.data as T) ?? (json as T),
    pagination: json?.pagination as
      | { page: number; limit: number; total: number; totalPages: number }
      | undefined,
    message: typeof json?.message === 'string' ? json.message : undefined,
    upstream: res.headers.get('x-pb-admin-upstream') ?? undefined,
  };
}

export async function fetchQuestionBank(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}): Promise<QuizBankPage> {
  const query = new URLSearchParams();
  query.set('page', String(params?.page ?? 1));
  query.set('limit', String(params?.limit ?? 200));
  if (params?.search) query.set('search', params.search);
  if (typeof params?.isActive === 'boolean') query.set('isActive', String(params.isActive));

  const payload = await adminFetch<QuizBankQuestion[]>(
    `/quiz-question-bank/questions?${query.toString()}`,
  );
  const rows = Array.isArray(payload.data) ? payload.data : [];
  return {
    questions: rows,
    page: payload.pagination?.page ?? 1,
    limit: payload.pagination?.limit ?? rows.length,
    total: payload.pagination?.total ?? rows.length,
    totalPages: payload.pagination?.totalPages ?? 1,
    upstream: payload.upstream,
  };
}

export async function fetchAllQuestionBank(params?: {
  search?: string;
  isActive?: boolean;
}): Promise<QuizBankPage> {
  const pageSize = 200;
  const questions: QuizBankQuestion[] = [];
  let page = 1;
  let total = 0;
  let upstream: string | undefined;
  let totalPages = 1;

  while (page <= 25) {
    const result = await fetchQuestionBank({
      page,
      limit: pageSize,
      search: params?.search,
      isActive: params?.isActive,
    });
    questions.push(...result.questions);
    total = result.total;
    totalPages = result.totalPages;
    upstream = result.upstream ?? upstream;
    if (questions.length >= total || result.questions.length === 0) break;
    page += 1;
  }

  return {
    questions,
    page: 1,
    limit: questions.length,
    total,
    totalPages,
    upstream,
  };
}

export async function fetchQuestionBankStats() {
  const payload = await adminFetch<QuizBankStats>('/quiz-question-bank');
  return payload.data;
}

export async function fetchQuizSettings() {
  const payload = await adminFetch<QuizApiSettings>('/quiz-settings');
  return payload.data;
}

function normalizePlayStats(row: Partial<QuizPlayStats> | null | undefined): QuizPlayStats {
  return {
    playerCount: Number(row?.playerCount ?? 0),
    sessionCount: Number(row?.sessionCount ?? 0),
    winnersCount: Number(row?.winnersCount ?? 0),
    topWinnerName: row?.topWinnerName ?? null,
    topWinnerCount: Number(row?.topWinnerCount ?? 0),
  };
}

export async function fetchQuizPlayStats(): Promise<QuizPlayStats> {
  try {
    const payload = await adminFetch<QuizPlayStats>('/quiz-play-stats');
    return normalizePlayStats(payload.data);
  } catch (err) {
    if (!(err instanceof QuizBankApiError) || err.status !== 404) throw err;

    const plays = await adminFetch<Array<{ playCount?: number; userName?: string }>>(
      '/game-plays?gameKey=quiz_time&limit=1',
    );
    const top = Array.isArray(plays.data) ? plays.data[0] : undefined;
    return {
      playerCount: Number(plays.pagination?.total ?? 0),
      sessionCount: Number(top?.playCount ?? 0),
      winnersCount: 0,
      topWinnerName: top?.userName ?? null,
      topWinnerCount: Number(top?.playCount ?? 0),
    };
  }
}

export async function fetchQuizTelemetry(): Promise<QuizTelemetry> {
  const payload = await adminFetch<QuizTelemetry>('/quiz-telemetry');
  const data = payload.data;
  return {
    questionsPerQuiz: Number(data?.questionsPerQuiz ?? 12),
    playerCount: Number(data?.playerCount ?? 0),
    sessionCount: Number(data?.sessionCount ?? 0),
    completedSessions: Number(data?.completedSessions ?? 0),
    winnersCount: Number(data?.winnersCount ?? 0),
    winRatePercentage: Number(data?.winRatePercentage ?? 0),
    completionRatePercentage: Number(data?.completionRatePercentage ?? 0),
    averageScore: Number(data?.averageScore ?? 0),
    averageTimeMinutes: Number(data?.averageTimeMinutes ?? 0),
    topWinnerName: data?.topWinnerName ?? null,
    topWinnerPoints: Number(data?.topWinnerPoints ?? 0),
    questionStats: Array.isArray(data?.questionStats) ? data.questionStats : [],
    players: Array.isArray(data?.players) ? data.players : [],
  };
}

export async function deleteBankQuestion(questionId: string) {
  const payload = await adminFetch<QuizBankQuestion>(
    `/quiz-question-bank/questions/${encodeURIComponent(questionId)}`,
    { method: 'DELETE' },
  );
  return payload.data;
}

export async function deleteBankQuestions(ids: string[]) {
  const payload = await adminFetch<{ deleted: number; ids: string[] }>(
    '/quiz-question-bank/questions',
    { method: 'DELETE', body: JSON.stringify({ ids }) },
  );
  return payload.data;
}

export async function runDailyQuestionRefresh(newCount?: number) {
  const payload = await adminFetch<{
    shuffled: number;
    before: number;
    after: number;
    inserted: number;
    generated: number;
    targetNew: number;
    ranAt: string;
  }>('/quiz-question-bank/daily-refresh', {
    method: 'POST',
    body: JSON.stringify(typeof newCount === 'number' ? { newCount } : {}),
  });
  return payload.data;
}

export async function fetchLivePlayerSession(): Promise<QuizLiveMirror | null> {
  const res = await fetch('/api/quiz/live-session', {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
  const data = (json?.data ?? json) as unknown;
  return parseLiveMirror(data);
}

export function liveMirrorToBankQuestions(mirror: QuizLiveMirror): QuizBankQuestion[] {
  return [...mirror.questions]
    .sort((a, b) => a.index - b.index)
    .map((row, order) => ({
      id: row.id || `live-player-${order}`,
      question: row.question,
      options: row.options,
      correctOption: row.correctOption || '',
      topic: 'Live Quiz Time',
      source: 'quiz-time-player',
      isActive: true,
      timesUsed: 0,
    }));
}

export function bankQuestionToQuizQuestion(
  row: QuizBankQuestion,
  index: number,
  settings?: QuizApiSettings | null,
): QuizQuestion {
  const correct = String(row.correctOption || '').toUpperCase();
  const optionKeys: Array<keyof QuizBankOptionMap> = ['A', 'B', 'C', 'D'];
  return {
    id: row.id,
    order: index + 1,
    question: row.question,
    options: optionKeys.map((key) => ({
      id: key,
      text: row.options?.[key] ?? '',
      isCorrect: Boolean(correct) && correct === key,
    })),
    explanation: row.isActive
      ? 'This question is active in the live PB Zone quiz bank and can be served to players.'
      : 'This question is inactive and will not be served to players.',
    funFact: `API source: ${row.source || 'bank'} · used in ${row.timesUsed} player session${row.timesUsed === 1 ? '' : 's'}`,
    difficulty: 'medium',
    topicTag: row.topic || 'Potato',
    points: Number(settings?.pointsPerCorrect ?? 20),
    timeLimitSeconds: Number(settings?.timerSeconds ?? 15),
  };
}
