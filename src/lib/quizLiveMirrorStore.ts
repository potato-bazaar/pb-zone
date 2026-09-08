import fs from "fs";
import path from "path";
import {
  parseLiveMirror,
  questionFromApi,
  upsertMirrorQuestion,
  type MirrorQuestionInput,
  type QuizLiveMirror,
} from "@/lib/quizLiveMirror";

const ADMIN_USER_IDS = new Set(["pb-zone-admin-panel"]);

function storePath() {
  return path.join(process.cwd(), ".next", "quiz-live-mirror.json");
}

let memory: QuizLiveMirror | null = null;

function loadStore(): QuizLiveMirror | null {
  if (memory) return memory;
  try {
    memory = parseLiveMirror(
      JSON.parse(fs.readFileSync(storePath(), "utf8")),
    );
  } catch {
    memory = null;
  }
  return memory;
}

function saveStore(mirror: QuizLiveMirror) {
  memory = mirror;
  try {
    const file = storePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(mirror));
  } catch {
    // Dev cache file is best-effort; in-memory still works for this process.
  }
}

function shouldIgnoreUser(userId: string) {
  return ADMIN_USER_IDS.has(userId);
}

export function getLiveQuizMirror() {
  return loadStore();
}

export function recordLiveQuizStart(input: {
  userId: string;
  sessionId: string;
  question: MirrorQuestionInput;
}) {
  if (!input.sessionId || shouldIgnoreUser(input.userId)) return;
  saveStore({
    sessionId: input.sessionId,
    userId: input.userId,
    updatedAt: new Date().toISOString(),
    totalQuestions: Number(input.question.total || 12),
    questions: [questionFromApi(input.question, null, 0)],
  });
}

export function recordLiveQuizAnswer(input: {
  userId: string;
  sessionId: string;
  currentQuestion?: MirrorQuestionInput | null;
  correctOption?: string | null;
  nextQuestion?: MirrorQuestionInput | null;
}) {
  if (!input.sessionId || shouldIgnoreUser(input.userId)) return;
  const existing = loadStore();
  if (!existing || existing.sessionId !== input.sessionId) return;

  let next = existing;
  if (input.currentQuestion) {
    next = upsertMirrorQuestion(
      next,
      questionFromApi(
        input.currentQuestion,
        input.correctOption ?? null,
        next.questions.length ? next.questions[next.questions.length - 1].index : 0,
      ),
    );
  } else if (input.correctOption) {
    const unanswered =
      next.questions.find((row) => !row.correctOption) ??
      next.questions[next.questions.length - 1];
    if (unanswered) {
      next = upsertMirrorQuestion(next, {
        ...unanswered,
        correctOption: input.correctOption.toUpperCase(),
      });
    }
  }

  if (input.nextQuestion) {
    next = upsertMirrorQuestion(
      next,
      questionFromApi(input.nextQuestion, null, next.questions.length),
    );
    next.totalQuestions = Number(
      input.nextQuestion.total || next.totalQuestions,
    );
  }

  saveStore(next);
}
