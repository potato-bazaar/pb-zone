import { adminApiKey, quizApiBase } from '../config';
import { QuizQuestion } from '../types/quiz';
import { parseLiveMirror, type QuizLiveMirror } from '../lib/quizLiveMirror';

export type QuizBankOptionMap = {
  A: string;
  B: string;
  C: string;
  D: string;
};

export type QuizBankLocale = {
  question?: string;
  options?: Partial<QuizBankOptionMap>;
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
  /** Localized copy from BE (`hi` / `gu`). English is the top-level fields. */
  locales?: {
    hi?: QuizBankLocale;
    gu?: QuizBankLocale;
  };
};

export type AdminQuizLanguage = 'en' | 'hi' | 'gu';


export type QuizBankStats = {
  total: number;
  active: number;
  target: number;
  dailyNewCount?: number;
};

/** Live bank should hold one daily set, not stacked history. */
export const DEFAULT_QUESTION_BANK_CAP = 600;

export function questionBankCapFromStats(stats?: QuizBankStats | null) {
  const daily = Number(stats?.dailyNewCount);
  if (Number.isFinite(daily) && daily > 0 && daily <= 1000) return Math.round(daily);
  return DEFAULT_QUESTION_BANK_CAP;
}

export type QuizScoringConfig = {
  pointsPerCorrect: number;
  fastAnswerBonus: number;
  completeQuizBonus: number;
  fastAnswerSeconds?: number;
  questionsPerQuiz?: number;
  timerSeconds?: number;
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

const PLACEHOLDER_PLAYER_NAMES = new Set([
  'player',
  'potato player',
  'anonymous',
  'guest',
  'user',
  'unknown',
  'dev-user-1',
]);

function isPlaceholderPlayerName(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PLAYER_NAMES.has(trimmed.toLowerCase());
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function displayNameFromUnknown(row: Record<string, unknown> | null | undefined): string | undefined {
  if (!row) return undefined;
  const nested =
    row.user && typeof row.user === 'object'
      ? (row.user as Record<string, unknown>)
      : null;
  const first = pickString(row.firstName, row.first_name, nested?.firstName);
  const last = pickString(row.lastName, row.last_name, nested?.lastName);
  const combined = `${first ?? ''} ${last ?? ''}`.trim();
  const candidates = [
    pickString(row.playerName, row.fullName, row.displayName, row.userName, row.name),
    pickString(nested?.fullName, nested?.displayName, nested?.userName, nested?.name),
    combined || undefined,
  ];
  for (const name of candidates) {
    if (name && !isPlaceholderPlayerName(name)) return name;
  }
  return candidates.find((name) => Boolean(name));
}

function normalizeTelemetryPlayer(
  row: Record<string, unknown>,
  index: number,
): QuizTelemetryPlayer {
  const nested =
    row.user && typeof row.user === 'object'
      ? (row.user as Record<string, unknown>)
      : null;
  return {
    rank: Number(row.rank ?? index + 1),
    userId: String(row.userId ?? nested?.userId ?? row.id ?? ''),
    sessionId: String(row.sessionId ?? row.id ?? ''),
    playerName: displayNameFromUnknown(row) || 'Player',
    status: String(row.status ?? ''),
    correctCount: Number(row.correctCount ?? 0),
    skippedCount: Number(row.skippedCount ?? 0),
    wrongCount: Number(row.wrongCount ?? 0),
    unansweredCount: Number(row.unansweredCount ?? 0),
    answeredCount: Number(row.answeredCount ?? 0),
    totalQuestions: Number(row.totalQuestions ?? 12),
    sessionScore: Number(row.sessionScore ?? 0),
    userPoints: Number(row.userPoints ?? 0),
    percentage: Number(row.percentage ?? 0),
    durationSeconds: Number(row.durationSeconds ?? 0),
    startedAt: (row.startedAt as string | Date) ?? '',
    completedAt: (row.completedAt as string | Date | null) ?? null,
  };
}

async function fetchPlayerNameMap(): Promise<Record<string, string>> {
  if (nameMapCache && Date.now() - nameMapCache.at < 60_000) {
    return nameMapCache.map;
  }

  const map: Record<string, string> = {};

  const remember = (userId?: string, name?: string) => {
    if (!userId || !name || isPlaceholderPlayerName(name)) return;
    if (!map[userId]) map[userId] = name;
  };

  try {
    const plays = await adminFetch<
      Array<{ userId?: string; userName?: string; name?: string; fullName?: string }>
    >('/game-plays?limit=200');
    for (const row of Array.isArray(plays.data) ? plays.data : []) {
      remember(
        row.userId ? String(row.userId) : undefined,
        pickString(row.fullName, row.userName, row.name),
      );
    }
  } catch {
    // optional enrichment
  }

  try {
    const res = await fetch('/api/leaderboard/points?limit=200', {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: Array<{ userId?: string; name?: string }>;
      };
      for (const row of json.data ?? []) {
        remember(row.userId, row.name);
      }
    }
  } catch {
    // optional enrichment
  }

  nameMapCache = { at: Date.now(), map };
  return map;
}

let nameMapCache: { at: number; map: Record<string, string> } | null = null;

function applyNameMap(
  players: QuizTelemetryPlayer[],
  names: Record<string, string>,
) {
  return players.map((player) => {
    const mapped = names[player.userId];
    if (!mapped) return player;
    if (!isPlaceholderPlayerName(player.playerName)) return player;
    return { ...player, playerName: mapped };
  });
}

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
  // Same-origin Next proxy → /v1/admin/... (avoids browser CORS to ngrok/remote BE)
  const root =
    typeof window !== 'undefined'
      ? '/api/admin'
      : `${quizApiBase()}/v1/admin`;
  const url = `${root}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const key = adminApiKey();
  if (key) headers['x-admin-key'] = key;
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

function normalizeScoring(row: Partial<QuizScoringConfig> | null | undefined): QuizScoringConfig {
  return {
    pointsPerCorrect: Number(row?.pointsPerCorrect ?? 20),
    fastAnswerBonus: Number(row?.fastAnswerBonus ?? 5),
    completeQuizBonus: Number(row?.completeQuizBonus ?? 30),
    fastAnswerSeconds: Number(row?.fastAnswerSeconds ?? 5),
    questionsPerQuiz: Number(row?.questionsPerQuiz ?? 12),
    timerSeconds: Number(row?.timerSeconds ?? 15),
  };
}

/** GET /v1/admin/quiz-scoring — fill admin scoring form. */
export async function fetchQuizScoring() {
  const payload = await adminFetch<QuizScoringConfig>('/quiz-scoring');
  return normalizeScoring(payload.data);
}

export type SaveQuizScoringPayload = {
  pointsPerCorrect: number;
  fastAnswerBonus: number;
  completeQuizBonus: number;
  questionsPerQuiz?: number;
  timerSeconds?: number;
  fastAnswerSeconds?: number;
};

/** PUT /v1/admin/quiz-scoring — first 3 required; rest optional. */
export async function saveQuizScoring(payload: SaveQuizScoringPayload) {
  const body: SaveQuizScoringPayload = {
    pointsPerCorrect: payload.pointsPerCorrect,
    fastAnswerBonus: payload.fastAnswerBonus,
    completeQuizBonus: payload.completeQuizBonus,
  };
  if (payload.questionsPerQuiz != null) body.questionsPerQuiz = payload.questionsPerQuiz;
  if (payload.timerSeconds != null) body.timerSeconds = payload.timerSeconds;
  if (payload.fastAnswerSeconds != null) body.fastAnswerSeconds = payload.fastAnswerSeconds;

  const result = await adminFetch<QuizScoringConfig>('/quiz-scoring', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return normalizeScoring(result.data);
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
  try {
    const res = await fetch('/api/quiz-player-telemetry', {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: QuizTelemetry | Record<string, unknown> };
      const data = (json.data ?? json) as Record<string, unknown>;
      const rawPlayers = Array.isArray(data.players)
        ? (data.players as Record<string, unknown>[])
        : [];
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
        topWinnerName: (data.topWinnerName as string | null) ?? null,
        topWinnerPoints: Number(data?.topWinnerPoints ?? 0),
        questionStats: Array.isArray(data?.questionStats)
          ? (data.questionStats as QuizTelemetry['questionStats'])
          : [],
        players: rawPlayers.map((row, index) =>
          row && typeof row === 'object' && 'playerName' in row && 'userId' in row
            ? (row as unknown as QuizTelemetryPlayer)
            : normalizeTelemetryPlayer(row, index),
        ),
      };
    }
  } catch {
    // Fall through to the quiz admin API.
  }

  const payload = await adminFetch<QuizTelemetry | Record<string, unknown>>('/quiz-telemetry');
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const rawPlayers = Array.isArray(data.players)
    ? (data.players as Record<string, unknown>[])
    : [];
  const nameMap = await fetchPlayerNameMap();
  const players = applyNameMap(
    rawPlayers.map((row, index) => normalizeTelemetryPlayer(row, index)),
    nameMap,
  );
  const topWinnerName =
    pickString(data.topWinnerName) && !isPlaceholderPlayerName(String(data.topWinnerName))
      ? String(data.topWinnerName)
      : players.find((row) => !isPlaceholderPlayerName(row.playerName))?.playerName ??
        (data.topWinnerName as string | null) ??
        null;

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
    topWinnerName,
    topWinnerPoints: Number(data?.topWinnerPoints ?? 0),
    questionStats: Array.isArray(data?.questionStats)
      ? (data.questionStats as QuizTelemetry['questionStats'])
      : [],
    players,
  };
}

export const STORED_GAME_KEYS = [
  'quiz_time',
  'potato_crush',
  'spud_run',
  'potato_sort',
  'potato_ninja',
  'word_scramble',
  'guess_disease',
  'fix_puzzle',
] as const;

export type StoredGameKey = (typeof STORED_GAME_KEYS)[number];

export type StoredBoardPlayer = {
  userId: string;
  name: string;
  points: number;
  wallet: number;
  games: Partial<Record<StoredGameKey, number>>;
  coins: Partial<Record<StoredGameKey, number>>;
};

function gameKeyOf(value: unknown): StoredGameKey | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const key = value.trim().toLowerCase().replace(/-/g, '_');
  return (STORED_GAME_KEYS as readonly string[]).includes(key) ? (key as StoredGameKey) : null;
}

function readNumberMap(value: unknown): Partial<Record<StoredGameKey, number>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Partial<Record<StoredGameKey, number>> = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = gameKeyOf(rawKey);
    const amount = Number(rawValue);
    if (!key || !Number.isFinite(amount)) continue;
    out[key] = Math.max(0, Math.floor(amount));
  }
  return out;
}

function mergeMaps(
  left: Partial<Record<StoredGameKey, number>>,
  right: Partial<Record<StoredGameKey, number>>,
) {
  const out = { ...left };
  for (const key of STORED_GAME_KEYS) {
    if (right[key] == null) continue;
    out[key] = Math.max(out[key] ?? 0, right[key] ?? 0);
  }
  return out;
}

function rememberStoredPlayer(
  map: Map<string, StoredBoardPlayer>,
  row: Record<string, unknown>,
) {
  const userId = pickString(row.userId, row.id);
  if (!userId) return;
  const name = pickString(row.name, row.userName, row.fullName, row.playerName) || 'Player';
  const current = map.get(userId) ?? {
    userId,
    name,
    points: 0,
    wallet: 0,
    games: {},
    coins: {},
  };
  if (!isPlaceholderPlayerName(name)) current.name = name;
  const points = Number(row.points ?? row.pbPoints ?? row.leaderboardPoints);
  if (Number.isFinite(points)) current.points = Math.max(current.points, Math.floor(points));
  const wallet = Number(row.walletPoints ?? row.wallet);
  if (Number.isFinite(wallet)) current.wallet = Math.max(current.wallet, Math.floor(wallet));
  current.games = mergeMaps(current.games, readNumberMap(row.games));
  current.coins = mergeMaps(current.coins, readNumberMap(row.coins));
  const gameKey = gameKeyOf(row.gameKey);
  const playCoins = Number(row.coinsEarned ?? row.coinAwarded ?? row.coinsAwarded);
  if (gameKey && Number.isFinite(playCoins) && playCoins > 0) {
    current.coins[gameKey] = Math.max(current.coins[gameKey] ?? 0, Math.floor(playCoins));
  }
  map.set(userId, current);
}

async function fetchPointsPage(page: number) {
  const res = await fetch(`/api/leaderboard/points?limit=200&page=${page}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new QuizBankApiError(`Leaderboard points failed (${res.status})`, res.status);
  }
  const json = (await res.json()) as {
    data?: unknown;
    pagination?: { totalPages?: number };
  };
  const rows = Array.isArray(json.data) ? (json.data as Record<string, unknown>[]) : [];
  return { rows, totalPages: Number(json.pagination?.totalPages ?? 1) };
}

/** Stored leadership points for every player. Coins are merged when the payload includes them. */
export async function fetchStoredBoardPlayers(): Promise<StoredBoardPlayer[]> {
  const map = new Map<string, StoredBoardPlayer>();
  const first = await fetchPointsPage(1);
  for (const row of first.rows) rememberStoredPlayer(map, row);
  const pages = Math.min(Math.max(first.totalPages, 1), 5);
  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchPointsPage(page);
    for (const row of next.rows) rememberStoredPlayer(map, row);
  }

  try {
    const plays = await adminFetch<Array<Record<string, unknown>>>('/game-plays?limit=200');
    for (const row of Array.isArray(plays.data) ? plays.data : []) {
      rememberStoredPlayer(map, row);
    }
  } catch {
    // Points board is the source of rank. Play rows only add coin totals when present.
  }

  return [...map.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

export async function removePlayer(userId: string) {
  const payload = await adminFetch<{
    userId: string;
    name: string;
    removed: boolean;
    starterPointsOnNextLogin: number;
  }>(`/players/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  return payload.data;
}

export async function addPlayerPoints(userId: string, amount: number) {
  const payload = await adminFetch<{
    userId: string;
    name: string;
    added: number;
    points: number;
  }>(`/players/${encodeURIComponent(userId)}/points`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  return payload.data;
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

function createdAtMs(row: QuizBankQuestion) {
  if (!row.createdAt) return 0;
  const ms = Date.parse(row.createdAt);
  return Number.isFinite(ms) ? ms : 0;
}

export function selectQuestionsToRetire(questions: QuizBankQuestion[], keep: number) {
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
  return questions.filter((row) => row.id && !keepIds.has(row.id));
}

export async function pruneQuestionBankToLatest(
  keep = DEFAULT_QUESTION_BANK_CAP,
  questions?: QuizBankQuestion[],
) {
  if (!questions) {
    try {
      const payload = await adminFetch<{ kept: number; removed: number; keep: number }>(
        '/quiz-question-bank/prune',
        { method: 'POST', body: JSON.stringify({ keep }) },
      );
      return {
        kept: Number(payload.data?.kept ?? keep),
        pruned: Number(payload.data?.removed ?? 0),
        keep: Number(payload.data?.keep ?? keep),
      };
    } catch (err) {
      if (!(err instanceof QuizBankApiError) || (err.status !== 404 && err.status !== 405)) {
        throw err;
      }
    }
  }

  const rows = questions ?? (await fetchAllQuestionBank({ isActive: true })).questions;
  const toRemove = selectQuestionsToRetire(rows, keep);
  if (toRemove.length === 0) {
    return { kept: rows.length, pruned: 0, keep };
  }

  const ids = toRemove.map((row) => row.id);
  const chunkSize = 80;
  let pruned = 0;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      const result = await deleteBankQuestions(chunk);
      pruned += Number(result.deleted ?? chunk.length);
    } catch (err) {
      if (!(err instanceof QuizBankApiError) || (err.status !== 404 && err.status !== 405)) {
        throw err;
      }
      for (const id of chunk) {
        await deleteBankQuestion(id);
        pruned += 1;
      }
    }
  }

  return {
    kept: Math.max(0, rows.length - toRemove.length),
    pruned,
    keep,
  };
}

export async function runDailyQuestionRefresh(options?: {
  newCount?: number;
  replace?: boolean;
}) {
  const newCount = options?.newCount ?? DEFAULT_QUESTION_BANK_CAP;
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
    body: JSON.stringify({
      newCount,
      replace: options?.replace ?? true,
      keepLatest: newCount,
    }),
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
    locales: row.locales
      ? {
          hi: row.locales.hi
            ? {
                question: row.locales.hi.question,
                options: row.locales.hi.options
                  ? { ...row.locales.hi.options }
                  : undefined,
              }
            : undefined,
          gu: row.locales.gu
            ? {
                question: row.locales.gu.question,
                options: row.locales.gu.options
                  ? { ...row.locales.gu.options }
                  : undefined,
              }
            : undefined,
        }
      : undefined,
  };
}

/** View helper — English is default; hi/gu overlay from `locales` when present. */
export function localizeQuizQuestion(
  question: QuizQuestion,
  language: AdminQuizLanguage = 'en',
): QuizQuestion {
  if (language === 'en') return question;
  const locale = question.locales?.[language];
  if (!locale) return question;

  const options = question.options.map((opt) => {
    const key = String(opt.id).toUpperCase() as keyof QuizBankOptionMap;
    const text = locale.options?.[key];
    return text && text.trim() ? { ...opt, text } : opt;
  });

  return {
    ...question,
    question:
      locale.question && locale.question.trim() ? locale.question : question.question,
    options,
  };
}
