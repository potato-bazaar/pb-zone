"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import {
  QuizCompleteScreen,
  QuizCorrectScreen,
  QuizMissedScreen,
  QuizWrongScreen,
} from "@/components/quiz/QuizResultScreens";
import type { QuizOption } from "@/data/quizQuestions";
import {
  QuizApiError,
  defaultLifelineSettings,
  fetchQuizResult,
  submitQuizAnswer,
  toUiOption,
  useQuizLifeline,
  type QuizAnswerData,
  type QuizApiQuestion,
  type QuizAuth,
  type QuizLifelineSettings,
  type QuizOptionKey,
  type QuizResultData,
  type QuizSessionStartData,
} from "@/lib/quizApi";

type QuizPlayScreenProps = {
  auth: QuizAuth;
  initialSession: QuizSessionStartData;
  onExit: () => void;
  onHome: () => void;
  onPlayAgain: () => void;
};

type Feedback =
  | {
      kind: "correct";
      pointsGained: number;
      correctOption: QuizOption;
      isLast: boolean;
      nextQuestion: QuizApiQuestion | null;
    }
  | {
      kind: "wrong";
      correctOption: QuizOption;
      explanation: string | null;
      isLast: boolean;
      nextQuestion: QuizApiQuestion | null;
    }
  | {
      kind: "missed";
      correctOption: QuizOption | null;
      isLast: boolean;
      nextQuestion: QuizApiQuestion | null;
    };

function MiniCoin({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="#F5C518"
        stroke="#C4920A"
        strokeWidth="1.2"
      />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fill="#8B6914"
      >
        PB
      </text>
    </svg>
  );
}

function resolveCorrectOption(
  question: QuizApiQuestion,
  correctKey: QuizOptionKey,
  correctOptionText?: string,
): QuizOption {
  const found = question.options.find((o) => o.key === correctKey);
  if (found) return toUiOption(found);
  return {
    id: correctKey,
    text: correctOptionText || correctKey,
  };
}

export function QuizPlayScreen({
  auth,
  initialSession,
  onExit,
  onHome,
  onPlayAgain,
}: QuizPlayScreenProps) {
  const { coins, setCoins } = usePbCoins();
  const sessionId = initialSession.sessionId;
  // Freeze coin pill during play — only sync final points after quiz ends
  const [displayCoins] = useState(initialSession.user.points);

  const [question, setQuestion] = useState<QuizApiQuestion>(
    initialSession.question,
  );
  const [lifelines] = useState<QuizLifelineSettings>(
    initialSession.settings.lifelines ?? defaultLifelineSettings(),
  );
  const pointsPerCorrect = Number(
    initialSession.settings.pointsPerCorrect ?? 5,
  );
  const [selected, setSelected] = useState<QuizOptionKey | null>(null);
  const [timeLeft, setTimeLeft] = useState(
    initialSession.question.timerSeconds ||
      initialSession.settings.timerSeconds ||
      8,
  );
  const [hiddenIds, setHiddenIds] = useState<QuizOptionKey[]>([]);
  const [used5050, setUsed5050] = useState(false);
  const [usedExtra, setUsedExtra] = useState(false);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<QuizResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const answeringRef = useRef(false);

  const total = question.total || 12;
  const progressPct = (question.index / total) * 100;

  useEffect(() => {
    if (finished || locked || feedback || submitting) return;
    if (timeLeft <= 0) {
      if (selected) {
        void submitAnswer(selected);
      } else {
        void handleTimeMissed();
      }
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished, locked, feedback, submitting, question.index]);

  function applyAnswerData(data: QuizAnswerData, fromQuestion: QuizApiQuestion) {
    // Do not bump coin badge mid-quiz — points settle on result screen
    setSessionScore(data.sessionScore);
    if (data.correct) {
      setCorrectCount((c) => c + 1);
      if (!data.sessionScore && data.pointsAwarded > 0) {
        setSessionScore((s) => s + data.pointsAwarded);
      }
    }

    const correctOption = resolveCorrectOption(
      fromQuestion,
      data.correctOption,
      data.correctOptionText,
    );
    const done =
      data.status === "completed" ||
      data.nextQuestion == null ||
      fromQuestion.index >= fromQuestion.total;

    if (data.correct) {
      setFeedback({
        kind: "correct",
        pointsGained: data.pointsAwarded,
        correctOption,
        isLast: done,
        nextQuestion: data.nextQuestion,
      });
    } else {
      setFeedback({
        kind: "wrong",
        correctOption,
        explanation: data.explanation ?? null,
        isLast: done,
        nextQuestion: data.nextQuestion,
      });
    }
  }

  async function submitAnswer(option: QuizOptionKey) {
    if (answeringRef.current || feedback || finished) return;
    answeringRef.current = true;
    setLocked(true);
    setSubmitting(true);
    setError(null);
    setSelected(option);

    const currentQuestion = question;

    try {
      const data = await submitQuizAnswer(auth, sessionId, option);
      applyAnswerData(data, currentQuestion);
    } catch (err) {
      const message =
        err instanceof QuizApiError
          ? err.message
          : "Could not submit answer. Try again.";
      setError(message);
      setLocked(false);
      console.error("[quiz] answer failed", err);
    } finally {
      setSubmitting(false);
      answeringRef.current = false;
    }
  }

  async function handleTimeMissed() {
    if (answeringRef.current || feedback || finished) return;
    answeringRef.current = true;
    setLocked(true);
    setSubmitting(true);
    setError(null);

    const currentQuestion = question;

    try {
      // Advance without awarding points (timeout = unanswered)
      const data = await useQuizLifeline(auth, sessionId, "skip");
      const done =
        data.status === "completed" ||
        data.nextQuestion == null ||
        currentQuestion.index >= currentQuestion.total;

      setFeedback({
        kind: "missed",
        correctOption: null,
        isLast: done,
        nextQuestion: data.nextQuestion ?? null,
      });
    } catch (err) {
      // Fallback: submit a placeholder answer if skip fails (e.g. insufficient coins)
      try {
        const fallbackOption =
          currentQuestion.options.find((o) => !hiddenIds.includes(o.key))
            ?.key ?? "A";
        const data = await submitQuizAnswer(
          auth,
          sessionId,
          fallbackOption,
        );
        const correctOption = resolveCorrectOption(
          currentQuestion,
          data.correctOption,
          data.correctOptionText,
        );
        const done =
          data.status === "completed" ||
          data.nextQuestion == null ||
          currentQuestion.index >= currentQuestion.total;

        // Treat timeout as missed even if fallback option was luckily correct
        if (data.correct && data.pointsAwarded > 0) {
          // Keep local score honest for UI; BE may have awarded — result API is source of truth
          setSessionScore(data.sessionScore);
        }
        setFeedback({
          kind: "missed",
          correctOption,
          isLast: done,
          nextQuestion: data.nextQuestion,
        });
      } catch (inner) {
        const message =
          inner instanceof QuizApiError
            ? inner.message
            : err instanceof QuizApiError
              ? err.message
              : "Time ran out.";
        setError(message);
        setLocked(false);
        console.error("[quiz] timeout miss failed", err, inner);
      }
    } finally {
      setSubmitting(false);
      answeringRef.current = false;
    }
  }

  function loadNextQuestion(next: QuizApiQuestion) {
    setQuestion(next);
    setSelected(null);
    setHiddenIds([]);
    setUsed5050(false);
    setUsedExtra(false);
    setLocked(false);
    setFeedback(null);
    setError(null);
    setTimeLeft(
      next.timerSeconds ||
        initialSession.settings.timerSeconds ||
        8,
    );
  }

  async function goToResult() {
    setSubmitting(true);
    setError(null);
    try {
      const data = await fetchQuizResult(auth, sessionId);
      // Prefer API score; fall back to points accumulated during this play
      const earned =
        data.sessionScore > 0
          ? data.sessionScore + (data.fastBonus ?? 0) + (data.completionBonus ?? 0)
          : sessionScore > 0
            ? sessionScore
            : data.correctCount > 0 && pointsPerCorrect > 0
              ? data.correctCount * pointsPerCorrect
              : 0;

      setCoins(data.userPoints);
      setResult({
        ...data,
        sessionScore: data.sessionScore > 0 ? data.sessionScore : earned,
        pointsAwarded: data.pointsAwarded && data.pointsAwarded > 0 ? data.pointsAwarded : earned,
        correctCount: data.correctCount || correctCount,
        totalQuestions: data.totalQuestions || total,
      });
      setFinished(true);
      setFeedback(null);
    } catch (err) {
      const message =
        err instanceof QuizApiError
          ? err.message
          : "Could not load quiz result.";
      setError(message);
      const fallbackScore =
        sessionScore > 0
          ? sessionScore
          : correctCount * pointsPerCorrect;
      setResult({
        correctCount,
        totalQuestions: total,
        sessionScore: fallbackScore,
        pointsAwarded: fallbackScore,
        userPoints: coins,
        fastBonus: 0,
        completionBonus: 0,
      });
      setFinished(true);
      setFeedback(null);
      console.error("[quiz] result failed", err);
    } finally {
      setSubmitting(false);
    }
  }

  function continueAfterFeedback() {
    if (!feedback) return;
    if (feedback.isLast || !feedback.nextQuestion) {
      void goToResult();
      return;
    }
    loadNextQuestion(feedback.nextQuestion);
  }

  function onSelect(id: QuizOptionKey) {
    if (locked || finished || feedback || submitting) return;
    setSelected(id);
  }

  function onSubmit() {
    if (!selected || locked || finished || feedback || submitting) return;
    void submitAnswer(selected);
  }

  async function onLifeline(type: "fifty_fifty" | "extra_time" | "skip") {
    if (locked || feedback || submitting || finished) return;
    if (type === "fifty_fifty" && used5050) return;
    if (type === "extra_time" && usedExtra) return;

    setSubmitting(true);
    setError(null);

    try {
      const data = await useQuizLifeline(auth, sessionId, type);
      // Keep coin pill frozen during play (final balance applied on result)

      if (type === "fifty_fifty") {
        if (data.options?.length) {
          const keep = new Set(data.options.map((o) => o.key));
          setHiddenIds(
            question.options
              .map((o) => o.key)
              .filter((key) => !keep.has(key)),
          );
        } else if (data.removedOptions?.length) {
          setHiddenIds(data.removedOptions);
        }
        setUsed5050(true);
      }

      if (type === "extra_time") {
        const add =
          data.extraTimeSeconds ?? lifelines.extraTimeSeconds ?? 10;
        setTimeLeft((t) => t + add);
        setUsedExtra(true);
      }

      if (type === "skip") {
        if (data.nextQuestion) {
          const done = data.status === "completed";
          if (done) {
            await goToResult();
          } else {
            loadNextQuestion(data.nextQuestion);
          }
        } else if (data.status === "completed" || !data.nextQuestion) {
          await goToResult();
        }
      }
    } catch (err) {
      const message =
        err instanceof QuizApiError
          ? err.message
          : "Lifeline failed.";
      setError(message);
      console.error("[quiz] lifeline failed", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (finished && result) {
    return (
      <QuizCompleteScreen
        correctCount={result.correctCount}
        totalQuestions={result.totalQuestions || total}
        fastBonus={result.fastBonus ?? 0}
        completionBonus={result.completionBonus ?? 0}
        totalEarned={
          (result.pointsAwarded && result.pointsAwarded > 0
            ? result.pointsAwarded
            : null) ??
          (result.sessionScore > 0 ? result.sessionScore : null) ??
          sessionScore ??
          0
        }
        onPlayAgain={onPlayAgain}
        onHome={onHome}
      />
    );
  }

  if (feedback) {
    if (feedback.kind === "correct") {
      return (
        <QuizCorrectScreen
          correctOption={feedback.correctOption}
          pointsGained={feedback.pointsGained}
          isLast={feedback.isLast}
          onNext={continueAfterFeedback}
        />
      );
    }
    if (feedback.kind === "missed") {
      return (
        <QuizMissedScreen
          correctOption={feedback.correctOption}
          isLast={feedback.isLast}
          onNext={continueAfterFeedback}
        />
      );
    }
    return (
      <QuizWrongScreen
        correctOption={feedback.correctOption}
        explanation={feedback.explanation}
        isLast={feedback.isLast}
        onNext={continueAfterFeedback}
      />
    );
  }

  const visibleOptions = question.options.filter(
    (o) => !hiddenIds.includes(o.key),
  );

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-[#F5F3FF]">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-10"
        style={{ paddingTop: "var(--header-top)" }}
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#2B1F7A] shadow-[0_2px_10px_rgba(43,31,122,0.1)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 className="font-display text-[1.15rem] font-bold text-[#2B1F7A]">
            Quiz Time
          </h1>
          <CoinBadge amount={displayCoins} />
        </header>

        {error ? (
          <p className="mb-3 rounded-xl bg-[#FEE2E2] px-3 py-2 text-center text-[12px] font-semibold text-[#DC2626]">
            {error}
          </p>
        ) : null}

        <div className="mb-4 flex items-center gap-2.5">
          <div className="relative h-3.5 min-w-0 flex-1 rounded-full bg-[#E4DFF5]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#6A5AE0] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
            <span
              className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#EDE8FF] px-2.5 py-[2px] text-[10px] font-bold tabular-nums text-[#6A5AE0] shadow-sm transition-all duration-300"
              style={{
                left: `clamp(1.75rem, ${progressPct}%, calc(100% - 1.75rem))`,
              }}
            >
              {question.index} / {total}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-[0_2px_8px_rgba(43,31,122,0.08)]">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-[#6A5AE0]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span className="text-xs font-bold tabular-nums text-[#6A5AE0]">
              {timeLeft}s
            </span>
          </div>
        </div>

        <div className="relative -mx-0.5 mb-5 mt-1 min-h-[176px] overflow-visible rounded-[1.75rem] border-2 border-[#E8E1FA] bg-gradient-to-r from-[#F3EFFF] via-[#EDE7FF] to-[#E6DEFF] shadow-[0_4px_14px_rgba(168,148,232,0.22)] sm:min-h-[188px]">
          <div
            className="pointer-events-none absolute inset-y-2 right-0 w-[52%] overflow-hidden rounded-r-[1.6rem]"
            aria-hidden
          >
            <span className="absolute -right-4 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[#D4C8FF]/55 blur-[2px]" />
            <span className="absolute right-10 top-2 h-16 w-16 rounded-full bg-[#C9BBF8]/45 blur-[1px]" />
            <span className="absolute bottom-3 right-16 h-12 w-12 rounded-full bg-white/50 blur-[1px]" />
          </div>

          <div className="relative z-10 flex h-full min-h-[176px] items-center py-6 pl-5 pr-[44%] sm:min-h-[188px] sm:pl-6 sm:pr-[42%]">
            <p className="text-[17px] font-extrabold leading-snug text-[#2B1F7A] sm:text-[19px]">
              {question.question}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/quiz-potato-mascot.png"
            alt=""
            className="pointer-events-none absolute -bottom-1 right-0 z-20 h-[108%] w-auto max-w-[50%] object-contain object-bottom drop-shadow-[0_8px_14px_rgba(43,31,122,0.14)] sm:right-1"
            draggable={false}
          />
        </div>

        <ul className="flex flex-col gap-3">
          {visibleOptions.map((opt) => {
            const isSelected = selected === opt.key;
            return (
              <li key={opt.key}>
                <button
                  type="button"
                  disabled={locked || submitting}
                  onClick={() => onSelect(opt.key)}
                  className={`flex w-full items-center gap-3 rounded-[1.15rem] px-3.5 py-3.5 text-left shadow-[0_2px_10px_rgba(43,31,122,0.07)] transition active:scale-[0.99] ${
                    isSelected
                      ? "border-2 border-[#6A5AE0] bg-[#6A5AE0] text-white shadow-[0_4px_16px_rgba(106,90,224,0.35)]"
                      : "border border-[#EEEAF5] bg-white text-[#2B1F7A]"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      isSelected
                        ? "bg-white text-[#6A5AE0]"
                        : "bg-[#6A5AE0] text-white"
                    }`}
                  >
                    {opt.key}
                  </span>
                  <span className="text-[14px] font-semibold leading-snug sm:text-[15px]">
                    {opt.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {selected && !locked && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="min-w-[11rem] rounded-full bg-[#6A5AE0] px-10 py-3.5 text-base font-extrabold text-white shadow-[0_6px_20px_rgba(106,90,224,0.4)] transition active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        )}

        <div className="mt-auto pb-2 pt-6">
          <div className="flex items-stretch rounded-[1.35rem] bg-white px-1 py-3.5 shadow-[0_4px_18px_rgba(43,31,122,0.1)]">
            <LifelineButton
              label="50:50"
              cost={lifelines.fiftyFiftyCost}
              disabled={used5050 || locked || submitting}
              onClick={() => void onLifeline("fifty_fifty")}
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-[#6A5AE0]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M7 7h10M7 17h10M9 7l6 10M15 7l-6 10" />
                </svg>
              }
            />
            <div className="my-1 w-px bg-[#E8E4F5]" aria-hidden />
            <LifelineButton
              label="Extra Time"
              cost={lifelines.extraTimeCost}
              disabled={usedExtra || locked || submitting}
              onClick={() => void onLifeline("extra_time")}
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-[#6A5AE0]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2.5 1.5M9 3h6" />
                </svg>
              }
            />
            <div className="my-1 w-px bg-[#E8E4F5]" aria-hidden />
            <LifelineButton
              label="Skip Question"
              cost={lifelines.skipCost}
              disabled={locked || submitting}
              onClick={() => void onLifeline("skip")}
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-[#6A5AE0]"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M5 5v14l8.5-7L5 5zm9.5 0v14H17V5h-2.5z" />
                </svg>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LifelineButton({
  label,
  icon,
  cost,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  cost: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 disabled:opacity-40"
    >
      <span className="flex h-7 items-center justify-center">{icon}</span>
      <span className="text-center text-[11px] font-bold leading-tight text-[#2B1F7A]">
        {label}
      </span>
      <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#6A5AE0]">
        <MiniCoin />
        {cost}
      </span>
    </button>
  );
}
