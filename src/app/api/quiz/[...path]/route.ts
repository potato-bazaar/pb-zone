import { createHmac } from "crypto";
import http from "http";
import https from "https";
import { after, NextRequest, NextResponse } from "next/server";
import { enforceQuestionBankCap } from "@/lib/quizQuestionBankCap";
import {
  getLiveQuizMirror,
  recordLiveQuizAnswer,
  recordLiveQuizStart,
} from "@/lib/quizLiveMirrorStore";
import { asMirrorQuestion } from "@/lib/quizLiveMirror";
import {
  identityFromJwt,
  isPlaceholderDisplayName,
} from "@/lib/playerIdentity";
import { displayNameFromPotatoBazaar } from "@/lib/pbUserProfile";
import { rememberPlayerName } from "@/lib/playerNameStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function quizUpstreamBase() {
  return (
    process.env.QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_QUIZ_API_BASE_URL?.replace(/\/$/, "") ||
    "https://pbzone-api.potatobazaar.com"
  );
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

/** Mint a short-lived JWT matching quiz BE JWT_SECRET (local/dev only). */
function signDevBearerToken(userId: string, userName: string) {
  const secret =
    process.env.QUIZ_JWT_SECRET ||
    process.env.JWT_SECRET ||
    "";
  if (!secret) return null;

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      sub: userId,
      id: userId,
      userId,
      user_id: userId,
      name: userName,
      fullName: userName,
      userName,
      role: "user",
      iat: now,
      exp: now + 60 * 60 * 12,
    }),
  );
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

async function resolveAuthHeaders(
  request: NextRequest,
  options?: { resolveName?: boolean },
): Promise<Headers> {
  const headers = new Headers();
  headers.set("accept", "application/json");

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const incomingAuth = request.headers.get("authorization");
  const jwtIdentity = identityFromJwt(incomingAuth);
  const headerName = request.headers.get("x-user-name");
  const userId =
    request.headers.get("x-user-id") ||
    jwtIdentity.userId ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_ID ||
    process.env.QUIZ_DEV_USER_ID ||
    "dev-user-1";
  let userName =
    [jwtIdentity.userName, headerName].find(
      (name) => name && !isPlaceholderDisplayName(name),
    ) ||
    jwtIdentity.userName ||
    headerName ||
    process.env.NEXT_PUBLIC_QUIZ_DEV_USER_NAME ||
    process.env.QUIZ_DEV_USER_NAME ||
    "Potato Player";

  if (options?.resolveName && incomingAuth) {
    const fromProfile = await displayNameFromPotatoBazaar(incomingAuth);
    if (fromProfile && !isPlaceholderDisplayName(fromProfile)) {
      userName = fromProfile;
    }
  }

  rememberPlayerName(userId, userName);

  headers.set("x-user-id", userId);
  headers.set("x-user-name", userName);

  const adminKey = request.headers.get("x-admin-key");
  if (adminKey) headers.set("x-admin-key", adminKey);

  const canSign = Boolean(process.env.QUIZ_JWT_SECRET || process.env.JWT_SECRET);
  const signed =
    canSign && userId && !isPlaceholderDisplayName(userName)
      ? signDevBearerToken(userId, userName)
      : null;

  if (signed) {
    headers.set("authorization", `Bearer ${signed}`);
  } else if (incomingAuth) {
    headers.set("authorization", incomingAuth);
  } else if (
    canSign &&
    process.env.QUIZ_DEV_AUTO_TOKEN !== "false"
  ) {
    const token = signDevBearerToken(userId, userName);
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
}

type UpstreamResult = {
  status: number;
  contentType: string | null;
  body: string;
};

/**
 * Node http(s) request so we can optionally skip TLS hostname checks
 * when QUIZ_API_TLS_INSECURE=true (misconfigured deploy cert).
 */
function upstreamRequest(
  target: URL,
  method: string,
  headers: Headers,
  body?: string,
): Promise<UpstreamResult> {
  const insecure = process.env.QUIZ_API_TLS_INSECURE === "true";
  const isHttps = target.protocol === "https:";
  const lib = isHttps ? https : http;

  const headerBag: Record<string, string> = {};
  headers.forEach((value, key) => {
    headerBag[key] = value;
  });

  return new Promise((resolve, reject) => {
    const req = lib.request(
      target,
      {
        method,
        headers: headerBag,
        ...(isHttps && insecure
          ? { rejectUnauthorized: false, checkServerIdentity: () => undefined }
          : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 502,
            contentType: res.headers["content-type"] ?? null,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function unwrapData(body: string): Record<string, unknown> | null {
  try {
    const json = JSON.parse(body) as Record<string, unknown>;
    if (json && typeof json === "object" && json.data && typeof json.data === "object") {
      return json.data as Record<string, unknown>;
    }
    return json;
  } catch {
    return null;
  }
}

type QuizLang = "en" | "hi" | "gu";

/** sessionId → chosen language (BE often stores lang but still returns English copy). */
const sessionLanguage = new Map<string, QuizLang>();

type BankLocaleCache = {
  loadedAt: number;
  byNormText: Map<string, Record<string, unknown>>;
  withLocale: { hi: number; gu: number; total: number };
};

let bankLocaleCache: BankLocaleCache | null = null;
const BANK_CACHE_TTL_MS = 60_000;

function asQuizLang(value: unknown): QuizLang | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "hi" || raw === "gu" || raw === "en") return raw;
  return null;
}

function normalizeQuestionText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[?.!,;:]+$/g, "")
    .replace(/\s+/g, " ");
}

function hasLocale(row: Record<string, unknown>, lang: QuizLang) {
  if (lang === "en") return true;
  const locales = row.locales;
  if (!locales || typeof locales !== "object") return false;
  const loc = (locales as Record<string, unknown>)[lang];
  if (!loc || typeof loc !== "object") return false;
  const question = (loc as { question?: unknown }).question;
  return typeof question === "string" && question.trim().length > 0;
}

function adminAuthHeaders(): Headers {
  const headers = new Headers();
  headers.set("accept", "application/json");
  headers.set("ngrok-skip-browser-warning", "true");
  const key = process.env.QUIZ_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  if (key) headers.set("x-admin-key", key);
  const secret = process.env.QUIZ_JWT_SECRET || process.env.JWT_SECRET || "";
  if (secret) {
    const token = signDevBearerToken("pb-zone-admin-panel", "PB Zone Admin");
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
}

async function loadBankLocaleCache(force = false): Promise<BankLocaleCache> {
  if (
    !force &&
    bankLocaleCache &&
    Date.now() - bankLocaleCache.loadedAt < BANK_CACHE_TTL_MS
  ) {
    return bankLocaleCache;
  }

  const byNormText = new Map<string, Record<string, unknown>>();
  let withHi = 0;
  let withGu = 0;
  let total = 0;

  for (let page = 1; page <= 8; page += 1) {
    const target = new URL(
      `${quizUpstreamBase()}/v1/admin/quiz-question-bank/questions`,
    );
    target.searchParams.set("page", String(page));
    target.searchParams.set("limit", "200");
    target.searchParams.set("isActive", "true");
    const upstream = await upstreamRequest(target, "GET", adminAuthHeaders());
    if (upstream.status < 200 || upstream.status >= 300) break;
    const parsed = JSON.parse(upstream.body) as { data?: unknown; pagination?: { totalPages?: number } };
    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    if (rows.length === 0) break;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const text = String(rec.question ?? "");
      if (!text.trim()) continue;
      total += 1;
      if (hasLocale(rec, "hi")) withHi += 1;
      if (hasLocale(rec, "gu")) withGu += 1;
      byNormText.set(normalizeQuestionText(text), rec);
    }
    const totalPages = Number(parsed.pagination?.totalPages ?? page);
    if (page >= totalPages) break;
  }

  bankLocaleCache = {
    loadedAt: Date.now(),
    byNormText,
    withLocale: { hi: withHi, gu: withGu, total },
  };
  console.info(
    "[quiz locale] bank cache",
    bankLocaleCache.withLocale,
  );
  return bankLocaleCache;
}

async function resolveBankRowForQuestion(
  question: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const cache = await loadBankLocaleCache();
  const text = String(question.question ?? "");
  const fromCache = cache.byNormText.get(normalizeQuestionText(text));
  if (fromCache) return fromCache;

  const id = String(question.id ?? "");
  if (!id) return null;
  const target = new URL(
    `${quizUpstreamBase()}/v1/admin/quiz-question-bank/questions/${encodeURIComponent(id)}`,
  );
  try {
    const upstream = await upstreamRequest(target, "GET", adminAuthHeaders());
    if (upstream.status < 200 || upstream.status >= 300) return null;
    return unwrapData(upstream.body);
  } catch {
    return null;
  }
}

function isIndicText(value: unknown) {
  return /[\u0900-\u097F\u0A80-\u0AFF]/.test(String(value ?? ""));
}

function localizeQuestionPayload(
  question: unknown,
  bank: Record<string, unknown> | null,
  lang: QuizLang,
): unknown {
  if (!question || typeof question !== "object" || lang === "en" || !bank) return question;
  if (!hasLocale(bank, lang)) return question;

  const locObj = ((bank.locales as Record<string, unknown>)[lang] ||
    {}) as Record<string, unknown>;
  const bankOptions =
    bank.options && typeof bank.options === "object"
      ? (bank.options as Record<string, unknown>)
      : {};
  const locOptions =
    locObj.options && typeof locObj.options === "object"
      ? (locObj.options as Record<string, unknown>)
      : {};

  const englishToLetter = new Map<string, string>();
  for (const [letter, text] of Object.entries(bankOptions)) {
    if (typeof text !== "string") continue;
    englishToLetter.set(text.trim().toLowerCase(), letter.toUpperCase());
  }

  const q = { ...(question as Record<string, unknown>) };
  if (typeof locObj.question === "string" && locObj.question.trim()) {
    q.question = locObj.question;
  }

  if (Array.isArray(q.options)) {
    q.options = q.options.map((opt) => {
      if (!opt || typeof opt !== "object") return opt;
      const row = { ...(opt as Record<string, unknown>) };
      const english = typeof row.text === "string" ? row.text.trim().toLowerCase() : "";
      const letter =
        englishToLetter.get(english) ||
        String(row.label ?? row.key ?? "")
          .trim()
          .toUpperCase();
      const localized = letter ? locOptions[letter] ?? locOptions[letter.toLowerCase()] : null;
      if (typeof localized === "string" && localized.trim()) {
        row.text = localized;
      }
      return row;
    });
  }

  return q;
}

async function canServeQuestionInLang(
  question: unknown,
  lang: QuizLang,
): Promise<boolean> {
  if (!question || typeof question !== "object") return false;
  if (lang === "en") return true;
  // After localizeOneQuestion, translated copy must be Indic script.
  return isIndicText((question as { question?: unknown }).question);
}

async function localizeOneQuestion(
  rawQ: unknown,
  lang: QuizLang,
): Promise<unknown> {
  if (!rawQ || typeof rawQ !== "object" || lang === "en") return rawQ;
  if (isIndicText((rawQ as { question?: unknown }).question)) return rawQ;
  const bank = await resolveBankRowForQuestion(rawQ as Record<string, unknown>);
  return localizeQuestionPayload(rawQ, bank, lang);
}

/* ------------------------------------------------------------------ */
/*  Translated deck — HI/GU only play bank rows that have locales.    */
/*  Avoids BE mixed EN sessions + timedOut-skip ending after 1 Q.     */
/* ------------------------------------------------------------------ */

type DeckCard = {
  id: string;
  question: string;
  options: Array<{ key: string; text: string }>;
  correctOption: string;
  explanation?: string | null;
};

type TranslatedDeck = {
  lang: QuizLang;
  cards: DeckCard[];
  index: number;
  score: number;
  correctCount: number;
  timerSeconds: number;
  pointsPerCorrect: number;
  fastAnswerBonus: number;
  fastAnswerSeconds: number;
  completeQuizBonus: number;
  userPoints: number;
  earnedPoints: number;
  leaderboardPoints: number;
  fastBonusTotal: number;
  completeBonusAwarded: number;
};

const translatedDecks = new Map<string, TranslatedDeck>();

function shuffleInPlace<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

function bankRowToDeckCard(
  row: Record<string, unknown>,
  lang: QuizLang,
): DeckCard | null {
  if (!hasLocale(row, lang)) return null;
  const loc = (row.locales as Record<string, unknown>)[lang] as Record<
    string,
    unknown
  >;
  const bankOptions =
    row.options && typeof row.options === "object"
      ? (row.options as Record<string, unknown>)
      : {};
  const locOptions =
    loc.options && typeof loc.options === "object"
      ? (loc.options as Record<string, unknown>)
      : {};
  const keys = ["A", "B", "C", "D"] as const;
  const options = keys.map((key) => ({
    key,
    text: String(locOptions[key] ?? bankOptions[key] ?? key),
  }));
  const correct = String(row.correctOption ?? "A").trim().toUpperCase();
  const explanation =
    typeof loc.explanation === "string"
      ? loc.explanation
      : typeof row.explanation === "string"
        ? row.explanation
        : null;
  return {
    id: String(row.id ?? ""),
    question: String(loc.question ?? ""),
    options,
    correctOption: correct,
    explanation,
  };
}

function buildTranslatedDeck(lang: QuizLang, count: number): DeckCard[] {
  const cache = bankLocaleCache;
  if (!cache) return [];
  const cards: DeckCard[] = [];
  for (const row of cache.byNormText.values()) {
    const card = bankRowToDeckCard(row, lang);
    if (card?.id && card.question) cards.push(card);
  }
  shuffleInPlace(cards);
  return cards.slice(0, Math.max(1, count));
}

function deckQuestionPayload(
  card: DeckCard,
  index: number,
  total: number,
  timerSeconds: number,
) {
  return {
    id: card.id,
    index: index + 1,
    total,
    question: card.question,
    options: card.options,
    timerSeconds,
    hiddenOptions: [] as string[],
    explanation: card.explanation ?? null,
  };
}

async function startTranslatedDeckSession(
  upstreamBody: string,
  lang: QuizLang,
): Promise<Response | null> {
  await loadBankLocaleCache();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(upstreamBody) as Record<string, unknown>;
  } catch {
    return null;
  }
  const data =
    json.data && typeof json.data === "object"
      ? ({ ...(json.data as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : null;
  if (!data) return null;

  const sessionId = String(data.sessionId ?? data.id ?? "");
  if (!sessionId) return null;

  const settings =
    data.settings && typeof data.settings === "object"
      ? (data.settings as Record<string, unknown>)
      : {};
  const user =
    data.user && typeof data.user === "object"
      ? (data.user as Record<string, unknown>)
      : {};

  const perQuiz = Math.max(1, Number(settings.questionsPerQuiz ?? 12));
  const cards = buildTranslatedDeck(lang, perQuiz);
  if (cards.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "NO_TRANSLATED_QUESTIONS",
        message:
          lang === "hi"
            ? "Hindi questions are not available yet in the question bank."
            : "Gujarati questions are not available yet in the question bank.",
      },
      { status: 503 },
    );
  }

  const timerSeconds = Number(settings.timerSeconds ?? 15);
  const deck: TranslatedDeck = {
    lang,
    cards,
    index: 0,
    score: 0,
    correctCount: 0,
    timerSeconds,
    pointsPerCorrect: Number(settings.pointsPerCorrect ?? 20),
    fastAnswerBonus: Number(settings.fastAnswerBonus ?? 5),
    fastAnswerSeconds: Number(settings.fastAnswerSeconds ?? 5),
    completeQuizBonus: Number(settings.completeQuizBonus ?? 20),
    userPoints: Number(user.points ?? 0),
    earnedPoints: Number(user.earnedPoints ?? 0),
    leaderboardPoints: Number(user.leaderboardPoints ?? 0),
    fastBonusTotal: 0,
    completeBonusAwarded: 0,
  };
  translatedDecks.set(sessionId, deck);
  sessionLanguage.set(sessionId, lang);

  data.language = lang;
  data.question = deckQuestionPayload(cards[0]!, 0, cards.length, timerSeconds);
  data.status = "active";
  data.score = 0;

  console.info("[quiz locale] translated deck start", {
    sessionId,
    lang,
    deckSize: cards.length,
    bankHi: bankLocaleCache?.withLocale.hi,
    bankGu: bankLocaleCache?.withLocale.gu,
  });

  return NextResponse.json({
    ...json,
    data,
    message: json.message ?? "Quiz session started",
  });
}

function handleTranslatedDeckAnswer(
  sessionId: string,
  requestBody: string | undefined,
): Response | null {
  const deck = translatedDecks.get(sessionId);
  if (!deck) return null;

  let option: string | null = null;
  let timedOut = false;
  let responseTimeSeconds = deck.timerSeconds;
  try {
    const parsed = requestBody
      ? (JSON.parse(requestBody) as Record<string, unknown>)
      : {};
    if (typeof parsed.option === "string") option = parsed.option.toUpperCase();
    timedOut = Boolean(parsed.timedOut);
    if (typeof parsed.responseTimeSeconds === "number") {
      responseTimeSeconds = parsed.responseTimeSeconds;
    }
  } catch {
    /* ignore */
  }

  const card = deck.cards[deck.index];
  if (!card) {
    translatedDecks.delete(sessionId);
    return NextResponse.json({
      success: true,
      data: {
        correct: false,
        timedOut: true,
        correctOption: null,
        pointsAwarded: 0,
        sessionScore: deck.score,
        correctCount: deck.correctCount,
        status: "completed",
        userPoints: deck.userPoints,
        earnedPoints: deck.earnedPoints,
        leaderboardPoints: deck.leaderboardPoints,
        nextQuestion: null,
      },
    });
  }

  const correct = !timedOut && option === card.correctOption;
  let pointsAwarded = 0;
  let fastBonusAwarded = 0;
  if (correct) {
    pointsAwarded = deck.pointsPerCorrect;
    if (responseTimeSeconds <= deck.fastAnswerSeconds) {
      fastBonusAwarded = deck.fastAnswerBonus;
      pointsAwarded += fastBonusAwarded;
      deck.fastBonusTotal += fastBonusAwarded;
    }
    deck.correctCount += 1;
    deck.score += pointsAwarded;
    deck.userPoints += pointsAwarded;
    deck.earnedPoints += pointsAwarded;
  }

  deck.index += 1;
  const done = deck.index >= deck.cards.length;
  let completeBonus = 0;
  if (done && deck.correctCount === deck.cards.length) {
    completeBonus = deck.completeQuizBonus;
    deck.completeBonusAwarded = completeBonus;
    deck.score += completeBonus;
    deck.userPoints += completeBonus;
    deck.earnedPoints += completeBonus;
    pointsAwarded += completeBonus;
  }

  const nextCard = done ? null : deck.cards[deck.index]!;
  const nextQuestion = nextCard
    ? deckQuestionPayload(
        nextCard,
        deck.index,
        deck.cards.length,
        deck.timerSeconds,
      )
    : null;

  const correctOpt = card.options.find((o) => o.key === card.correctOption);

  return NextResponse.json({
    success: true,
    message: "Answer submitted",
    data: {
      correct,
      timedOut,
      correctOption: card.correctOption,
      correctOptionText: correctOpt?.text ?? card.correctOption,
      explanation: card.explanation ?? null,
      pointsAwarded,
      fastBonusAwarded,
      completeQuizBonus: completeBonus,
      sessionScore: deck.score,
      correctCount: deck.correctCount,
      status: done ? "completed" : "active",
      userPoints: deck.userPoints,
      earnedPoints: deck.earnedPoints,
      leaderboardPoints: deck.leaderboardPoints,
      nextQuestion,
      responseTimeSeconds,
    },
  });
}

function handleTranslatedDeckLifeline(
  sessionId: string,
  requestBody: string | undefined,
): Response | null {
  const deck = translatedDecks.get(sessionId);
  if (!deck) return null;

  let type = "";
  try {
    const parsed = requestBody
      ? (JSON.parse(requestBody) as Record<string, unknown>)
      : {};
    type = String(parsed.type ?? "").toLowerCase();
  } catch {
    /* ignore */
  }

  const card = deck.cards[deck.index];
  if (!card) {
    return NextResponse.json({
      success: true,
      data: {
        status: "completed",
        nextQuestion: null,
        userPoints: deck.userPoints,
        earnedPoints: deck.earnedPoints,
        leaderboardPoints: deck.leaderboardPoints,
      },
    });
  }

  const cost =
    type === "fifty_fifty" || type === "extra_time" || type === "skip" ? 10 : 0;
  if (cost > 0) {
    deck.userPoints = Math.max(0, deck.userPoints - cost);
  }

  if (type === "fifty_fifty") {
    const wrong = card.options.filter((o) => o.key !== card.correctOption);
    shuffleInPlace(wrong);
    const remove = new Set(wrong.slice(0, 2).map((o) => o.key));
    const kept = card.options.filter((o) => !remove.has(o.key));
    return NextResponse.json({
      success: true,
      data: {
        type,
        options: kept,
        removedOptions: [...remove],
        userPoints: deck.userPoints,
        earnedPoints: deck.earnedPoints,
        leaderboardPoints: deck.leaderboardPoints,
        status: "active",
      },
    });
  }

  if (type === "extra_time") {
    return NextResponse.json({
      success: true,
      data: {
        type,
        extraTimeSeconds: 10,
        userPoints: deck.userPoints,
        earnedPoints: deck.earnedPoints,
        leaderboardPoints: deck.leaderboardPoints,
        status: "active",
      },
    });
  }

  if (type === "skip") {
    deck.index += 1;
    const done = deck.index >= deck.cards.length;
    const nextCard = done ? null : deck.cards[deck.index]!;
    const nextQuestion = nextCard
      ? deckQuestionPayload(
          nextCard,
          deck.index,
          deck.cards.length,
          deck.timerSeconds,
        )
      : null;
    return NextResponse.json({
      success: true,
      data: {
        type,
        status: done ? "completed" : "active",
        nextQuestion,
        userPoints: deck.userPoints,
        earnedPoints: deck.earnedPoints,
        leaderboardPoints: deck.leaderboardPoints,
      },
    });
  }

  return NextResponse.json(
    { success: false, error: "UNKNOWN_LIFELINE", message: `Unknown lifeline: ${type}` },
    { status: 400 },
  );
}

function handleTranslatedDeckResult(sessionId: string): Response | null {
  const deck = translatedDecks.get(sessionId);
  // Keep finished decks briefly for result fetch — if already deleted, no match.
  if (!deck) return null;

  const payload = {
    success: true,
    data: {
      sessionId,
      correctCount: deck.correctCount,
      totalQuestions: deck.cards.length,
      score: deck.score,
      sessionScore: deck.score,
      pointsAwarded: deck.score,
      fastBonus: deck.fastBonusTotal,
      completionBonus: deck.completeBonusAwarded,
      userPoints: deck.userPoints,
      earnedPoints: deck.earnedPoints,
      leaderboardPoints: deck.leaderboardPoints,
      status: "completed",
      language: deck.lang,
    },
  };
  translatedDecks.delete(sessionId);
  return NextResponse.json(payload);
}

async function enrichQuizPayloadWithLocales(
  responseBody: string,
  langHint: QuizLang | null,
  sessionIdHint?: string,
): Promise<{
  body: string;
  lang: QuizLang;
  questionOk: boolean;
  nextOk: boolean;
  sessionId: string;
  status: string;
  hasNext: boolean;
}> {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(responseBody) as Record<string, unknown>;
  } catch {
    return {
      body: responseBody,
      lang: langHint ?? "en",
      questionOk: false,
      nextOk: false,
      sessionId: sessionIdHint ?? "",
      status: "",
      hasNext: false,
    };
  }

  const data =
    json.data && typeof json.data === "object"
      ? ({ ...(json.data as Record<string, unknown>) } as Record<string, unknown>)
      : null;
  if (!data) {
    return {
      body: responseBody,
      lang: langHint ?? "en",
      questionOk: false,
      nextOk: false,
      sessionId: sessionIdHint ?? "",
      status: "",
      hasNext: false,
    };
  }

  const sessionId = String(data.sessionId ?? data.id ?? sessionIdHint ?? "");
  const lang =
    asQuizLang(data.language) ||
    langHint ||
    (sessionId ? sessionLanguage.get(sessionId) ?? null : null) ||
    "en";

  if (sessionId && lang) sessionLanguage.set(sessionId, lang);

  if (lang === "en") {
    return {
      body: responseBody,
      lang,
      questionOk: true,
      nextOk: true,
      sessionId,
      status: String(data.status ?? ""),
      hasNext: Boolean(data.nextQuestion),
    };
  }

  if (data.question) data.question = await localizeOneQuestion(data.question, lang);
  if (data.nextQuestion) {
    data.nextQuestion = await localizeOneQuestion(data.nextQuestion, lang);
  }

  const questionOk = data.question
    ? await canServeQuestionInLang(data.question, lang)
    : true;
  const hasNext = Boolean(data.nextQuestion);
  const nextOk = hasNext ? await canServeQuestionInLang(data.nextQuestion, lang) : true;

  return {
    body: JSON.stringify({ ...json, data }),
    lang,
    questionOk,
    nextOk,
    sessionId,
    status: String(data.status ?? ""),
    hasNext,
  };
}

function recordQuizTraffic(
  method: string,
  segments: string[],
  userId: string,
  responseBody: string,
) {
  if (method !== "POST") return;
  const data = unwrapData(responseBody);
  if (!data) return;

  if (segments.length === 1 && segments[0] === "sessions") {
    const sessionId = String(
      data.sessionId ??
        data.id ??
        (data.session as { id?: string } | undefined)?.id ??
        "",
    );
    recordLiveQuizStart({
      userId,
      sessionId,
      question: asMirrorQuestion(data.question) ?? {},
    });
    return;
  }

  if (segments[0] !== "sessions" || segments.length < 3) return;
  const sessionId = segments[1];
  const action = segments[2];
  if (action === "answer") {
    recordLiveQuizAnswer({
      userId,
      sessionId,
      correctOption: data.correctOption ? String(data.correctOption) : null,
      nextQuestion: asMirrorQuestion(data.nextQuestion),
    });
    return;
  }
  if (action === "lifeline") {
    recordLiveQuizAnswer({
      userId,
      sessionId,
      correctOption: data.correctOption ? String(data.correctOption) : null,
      nextQuestion: asMirrorQuestion(data.nextQuestion),
    });
  }
}

async function proxyQuiz(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const segments = path ?? [];

  if (
    request.method === "GET" &&
    segments.length === 1 &&
    segments[0] === "live-session"
  ) {
    return NextResponse.json(
      { success: true, data: getLiveQuizMirror() },
      { status: 200 },
    );
  }

  const upstreamPath = `/v1/quiz/${segments.join("/")}`;
  const target = new URL(`${quizUpstreamBase()}${upstreamPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const resolveName =
    request.method === "POST" &&
    segments.length === 1 &&
    segments[0] === "sessions";
  const headers = await resolveAuthHeaders(request, { resolveName });
  let body: string | undefined;
  let requestLang: QuizLang | null = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const text = await request.text();
    if (text) {
      body = text;
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        requestLang = asQuizLang(parsed.language);
        if (requestLang) {
          headers.set("accept-language", requestLang);
        }
      } catch {
        /* ignore */
      }
    }
  }

  const responseHeaders = new Headers();
  responseHeaders.set("content-type", "application/json");
  responseHeaders.set("x-pb-quiz-upstream", quizUpstreamBase());
  responseHeaders.set("access-control-expose-headers", "x-pb-quiz-upstream");

  const isSessionStart =
    request.method === "POST" &&
    segments.length === 1 &&
    segments[0] === "sessions";
  const isSessionAnswer =
    request.method === "POST" &&
    segments[0] === "sessions" &&
    segments.length >= 3 &&
    segments[2] === "answer";
  const isSessionLifeline =
    request.method === "POST" &&
    segments[0] === "sessions" &&
    segments.length >= 3 &&
    segments[2] === "lifeline";
  const isSessionResult =
    request.method === "GET" &&
    segments[0] === "sessions" &&
    segments.length >= 3 &&
    segments[2] === "result";
  const sessionIdHint =
    segments[0] === "sessions" && segments.length >= 2 ? segments[1] : undefined;

  // HI/GU deck: grade + advance locally so we never burn the 12-slot BE session
  // by auto-skipping English questions (that was ending the quiz after 1 Q).
  if (sessionIdHint && translatedDecks.has(sessionIdHint)) {
    if (isSessionAnswer) {
      const deckRes = handleTranslatedDeckAnswer(sessionIdHint, body);
      if (deckRes) {
        const deckBody = await deckRes.text();
        recordQuizTraffic(
          request.method,
          segments,
          headers.get("x-user-id") || "dev-user-1",
          deckBody,
        );
        for (const [k, v] of responseHeaders.entries()) deckRes.headers.set(k, v);
        return new NextResponse(deckBody, {
          status: deckRes.status,
          headers: deckRes.headers,
        });
      }
    }
    if (isSessionLifeline) {
      const deckRes = handleTranslatedDeckLifeline(sessionIdHint, body);
      if (deckRes) {
        const deckBody = await deckRes.text();
        recordQuizTraffic(
          request.method,
          segments,
          headers.get("x-user-id") || "dev-user-1",
          deckBody,
        );
        for (const [k, v] of responseHeaders.entries()) deckRes.headers.set(k, v);
        return new NextResponse(deckBody, {
          status: deckRes.status,
          headers: deckRes.headers,
        });
      }
    }
    if (isSessionResult) {
      const deckRes = handleTranslatedDeckResult(sessionIdHint);
      if (deckRes) {
        for (const [k, v] of responseHeaders.entries()) deckRes.headers.set(k, v);
        return deckRes;
      }
    }
  }

  try {
    const upstream = await upstreamRequest(
      target,
      request.method,
      headers,
      body,
    );
    if (upstream.contentType) {
      responseHeaders.set("content-type", upstream.contentType);
    }

    let responseBody = upstream.body;
    let responseStatus = upstream.status;

    if (upstream.status >= 200 && upstream.status < 300) {
      // HI/GU start → replace BE question set with a translated-only deck.
      if (isSessionStart && (requestLang === "hi" || requestLang === "gu")) {
        await loadBankLocaleCache().catch((error) => {
          console.warn("[quiz locale] cache warm failed", error);
        });
        const deckStart = await startTranslatedDeckSession(
          responseBody,
          requestLang,
        );
        if (deckStart) {
          const deckBody = await deckStart.text();
          recordQuizTraffic(
            request.method,
            segments,
            headers.get("x-user-id") || "dev-user-1",
            deckBody,
          );
          after(() => {
            void enforceQuestionBankCap().catch((error) => {
              console.error("[quiz-bank-cap]", error);
            });
          });
          for (const [k, v] of responseHeaders.entries()) {
            deckStart.headers.set(k, v);
          }
          return new NextResponse(deckBody, {
            status: deckStart.status,
            headers: deckStart.headers,
          });
        }
      }

      const isSessionAction = isSessionAnswer || isSessionLifeline;
      if (isSessionStart || isSessionAction) {
        const enriched = await enrichQuizPayloadWithLocales(
          responseBody,
          requestLang,
          sessionIdHint,
        );
        responseBody = enriched.body;
      }

      recordQuizTraffic(
        request.method,
        segments,
        headers.get("x-user-id") || "dev-user-1",
        responseBody,
      );
      if (isSessionStart) {
        after(() => {
          void enforceQuestionBankCap().catch((error) => {
            console.error("[quiz-bank-cap]", error);
          });
        });
      }
    }

    return new NextResponse(responseBody, {
      status: responseStatus,
      headers: responseHeaders,
    });
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error
        ? (error as Error & {
            cause?: { code?: string; reason?: string };
          }).cause
        : undefined;
    const code =
      cause?.code ||
      (error instanceof Error && "code" in error
        ? String((error as Error & { code?: string }).code)
        : undefined);
    const detail =
      code === "ECONNREFUSED"
        ? `Quiz BE not reachable at ${target.origin} (is it running?)`
        : code === "ERR_TLS_CERT_ALTNAME_INVALID"
          ? `SSL cert mismatch for ${target.origin}. Fix server cert or set QUIZ_API_TLS_INSECURE=true for local dev.`
          : error instanceof Error
            ? error.message
            : "Failed to reach quiz API";

    console.error("[quiz proxy]", target.toString(), error);
    return NextResponse.json(
      {
        error: "Quiz API unreachable",
        message: detail,
        upstream: target.toString(),
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyQuiz(request, context);
}
