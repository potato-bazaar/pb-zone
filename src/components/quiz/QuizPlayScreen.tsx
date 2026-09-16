"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { usePbPoints, type PbReceipt } from "@/components/providers/PbPointsProvider";
import { QuizCompleteScreen } from "@/components/quiz/QuizCompleteScreen";
import { scoreQuiz, type QuizAnswerRecord } from "@/lib/pb/scoring";
import { sounds, haptic } from "@/components/crush/render/sound";
import type { QuizOption } from "@/data/quizQuestions";
import {
  QuizApiError,
  defaultLifelineSettings,
  fetchQuizResult,
  submitQuizAnswer,
  toUiOption,
  useQuizLifeline as callQuizLifeline,
  type QuizAnswerData,
  type QuizApiQuestion,
  type QuizAuth,
  type QuizLifelineSettings,
  type QuizOptionKey,
  type QuizResultData,
  type QuizSessionStartData,
} from "@/lib/quizApi";
import {
  revealLiveMirrorAnswer,
  upsertLiveMirrorCurrent,
} from "@/lib/quizLiveMirror";
import { recordGameLeaderboard } from "@/lib/leaderboardApi";

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
      explanation: string | null;
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

const MASCOT_LINES = [
  "Good Farmers Know!",
  "Think it through!",
  "You've got this!",
  "Spud-tacular focus!",
  "Grow your brain!",
  "Dig deep!",
];

const SUBTITLES = [
  "Choose the best answer to help keep potatoes healthy and improve yield.",
  "Pick the answer a smart farmer would choose.",
  "One right answer. Trust what you've learned.",
];

function MiniCoin({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="quizCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="45%" stopColor="#F5C518" />
          <stop offset="100%" stopColor="#D4A017" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#quizCoinGrad)" stroke="#C4920A" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#FFF3A8" strokeWidth="1" opacity="0.7" />
      <path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 10h.01M15 10h.01" fill="none" stroke="#8B6914" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LeafIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A15.08 15.08 0 0 0 12 20c6 0 10-4 10-10 0-1.5-.5-3-1.5-4.5C18.5 7 17.5 7.5 17 8z" />
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
  const { coins, setWallet } = usePbCoins();
  const { awardPoints } = usePbPoints();
  const sessionId = initialSession.sessionId;
  const answersRef = useRef<QuizAnswerRecord[]>([]);
  const timeLeftRef = useRef(0);
  const [pbReceipt, setPbReceipt] = useState<PbReceipt | null>(null);
  const [displayCoins, setDisplayCoins] = useState(initialSession.user.points);

  const [question, setQuestion] = useState<QuizApiQuestion>(initialSession.question);
  const [lifelines] = useState<QuizLifelineSettings>(
    initialSession.settings.lifelines ?? defaultLifelineSettings(),
  );
  const pointsPerCorrect = Number(
    initialSession.settings.pointsPerCorrect ?? 20,
  );
  const [selected, setSelected] = useState<QuizOptionKey | null>(null);
  const [timeLeft, setTimeLeft] = useState(
    initialSession.question.timerSeconds ||
      initialSession.settings.timerSeconds ||
      15,
  );

  useEffect(() => {
    upsertLiveMirrorCurrent({
      sessionId,
      userId: auth.userId || "dev-user-1",
      question,
    });
  }, [auth.userId, question, sessionId]);
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
  const [burst, setBurst] = useState(0);
  const [timeBump, setTimeBump] = useState(0);

  const answeringRef = useRef(false);

  const total = question.total || 12;
  const progressPct = (question.index / total) * 100;
  const mascotLine = MASCOT_LINES[(question.index - 1) % MASCOT_LINES.length];
  const subtitle = SUBTITLES[(question.index - 1) % SUBTITLES.length];
  const timerTotal = question.timerSeconds || initialSession.settings.timerSeconds || 15;
  const timerUrgent = timeLeft <= 3 && !feedback && !locked;
  timeLeftRef.current = timeLeft;

  function recordAnswer(correct: boolean, timedOut = false) {
    const seconds = timedOut ? timerTotal : Math.max(0, timerTotal - timeLeftRef.current);
    answersRef.current = [...answersRef.current, { correct, seconds }];
  }

  function applyWallet(
    nextPoints: number,
    nextEarned?: number,
    nextPbPoints?: number,
  ) {
    if (!Number.isFinite(nextPoints)) return;
    const coins = Math.max(0, Math.floor(nextPoints));
    setDisplayCoins(coins);
    setWallet({
      coins,
      earnedCoins: typeof nextEarned === "number" ? nextEarned : undefined,
      pbPoints: typeof nextPbPoints === "number" ? nextPbPoints : undefined,
    });
  }

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
    if (timeLeft <= 3) sounds.play("ui");
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished, locked, feedback, submitting, question.index]);

  function applyAnswerData(data: QuizAnswerData, fromQuestion: QuizApiQuestion) {
    recordAnswer(data.correct);
    revealLiveMirrorAnswer({
      sessionId,
      question: fromQuestion,
      correctOption: data.correctOption ?? null,
      nextQuestion: data.nextQuestion,
    });
    setSessionScore(data.sessionScore);
    if (data.correct) {
      setCorrectCount((c) => c + 1);
      if (!data.sessionScore && data.pointsAwarded > 0) {
        setSessionScore((s) => s + data.pointsAwarded);
      }
    }

    const correctOption = resolveCorrectOption(fromQuestion, data.correctOption, data.correctOptionText);
    const done =
      data.status === "completed" || data.nextQuestion == null || fromQuestion.index >= fromQuestion.total;
    const explanation = data.explanation ?? fromQuestion.explanation ?? null;

    if (data.correct) {
      sounds.play("win");
      haptic([15, 30, 25]);
      setBurst((n) => n + 1);
      setFeedback({
        kind: "correct",
        pointsGained: data.pointsAwarded,
        correctOption,
        explanation,
        isLast: done,
        nextQuestion: data.nextQuestion,
      });
    } else {
      sounds.play("lose");
      haptic([40, 40, 40]);
      setFeedback({
        kind: "wrong",
        correctOption,
        explanation,
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
      const message = err instanceof QuizApiError ? err.message : "Could not submit answer. Try again.";
      setError(message);
      setLocked(false);
      setSelected(null);
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
    recordAnswer(false, true);

    try {
      const data = await submitQuizAnswer(auth, sessionId, null, {
        timedOut: true,
      });
      revealLiveMirrorAnswer({
        sessionId,
        question: currentQuestion,
        correctOption: null,
        nextQuestion: data.nextQuestion,
      });
      const done =
        data.status === "completed" || data.nextQuestion == null || currentQuestion.index >= currentQuestion.total;
      sounds.play("invalid");
      setFeedback({
        kind: "missed",
        correctOption: null,
        isLast: done,
        nextQuestion: data.nextQuestion ?? null,
      });
    } catch (err) {
      try {
        const fallbackOption =
          currentQuestion.options.find((o) => !hiddenIds.includes(o.key))?.key ?? "A";
        const data = await submitQuizAnswer(auth, sessionId, fallbackOption);
        const correctOption = resolveCorrectOption(currentQuestion, data.correctOption, data.correctOptionText);
        const done =
          data.status === "completed" || data.nextQuestion == null || currentQuestion.index >= currentQuestion.total;
        if (data.correct && data.pointsAwarded > 0) setSessionScore(data.sessionScore);
        sounds.play("invalid");
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
      next.timerSeconds || initialSession.settings.timerSeconds || 15,
    );
    sounds.play("swap");
  }

  function settlePbPoints(totalQuestions: number) {
    if (pbReceipt) return;
    const score = scoreQuiz(answersRef.current, totalQuestions);
    setPbReceipt(
      awardPoints({
        eventId: `quiz:${sessionId}`,
        gameId: "quiz-time",
        points: score.points,
        lines: score.lines,
        perfect: score.perfect,
        label: "Quiz Time",
      }),
    );
  }

  async function goToResult() {
    setSubmitting(true);
    setError(null);
    settlePbPoints(total);
    try {
      const data = await fetchQuizResult(auth, sessionId);
      const earned =
        data.sessionScore > 0
          ? data.sessionScore + (data.fastBonus ?? 0) + (data.completionBonus ?? 0)
          : sessionScore > 0
            ? sessionScore
            : data.correctCount > 0 && pointsPerCorrect > 0
              ? data.correctCount * pointsPerCorrect
              : 0;

      applyWallet(data.userPoints, data.earnedPoints, data.leaderboardPoints);
      const correct = data.correctCount || correctCount;
      const asked = data.totalQuestions || total;
      recordGameLeaderboard(auth, {
        gameKey: "quiz-time",
        sessionId,
        coins: earned,
        applyWallet: false,
        metrics: [
          { key: "accuracy", value: correct, max: Math.max(asked, 1) },
          { key: "complete", value: 1, max: 1 },
        ],
      });
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
      const message = err instanceof QuizApiError ? err.message : "Could not load quiz result.";
      setError(message);
      const fallbackScore = sessionScore > 0 ? sessionScore : correctCount * pointsPerCorrect;
      recordGameLeaderboard(auth, {
        gameKey: "quiz-time",
        sessionId,
        coins: fallbackScore,
        applyWallet: false,
        metrics: [
          { key: "accuracy", value: correctCount, max: Math.max(total, 1) },
          { key: "complete", value: 1, max: 1 },
        ],
      });
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
    sounds.play("ui");
    if (feedback.isLast || !feedback.nextQuestion) {
      void goToResult();
      return;
    }
    loadNextQuestion(feedback.nextQuestion);
  }

  function onPick(id: QuizOptionKey) {
    if (locked || finished || feedback || submitting) return;
    sounds.unlock();
    sounds.play("pop");
    haptic(12);
    void submitAnswer(id);
  }

  async function onLifeline(type: "fifty_fifty" | "extra_time" | "skip") {
    if (locked || feedback || submitting || finished) return;
    if (type === "fifty_fifty" && used5050) return;
    if (type === "extra_time" && usedExtra) return;

    const cost =
      type === "fifty_fifty"
        ? lifelines.fiftyFiftyCost
        : type === "extra_time"
          ? lifelines.extraTimeCost
          : lifelines.skipCost;

    if (displayCoins < cost) {
      setError(`Need ${cost} PB to use this lifeline.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    sounds.play("special");

    try {
      const data = await callQuizLifeline(auth, sessionId, type);
      applyWallet(data.userPoints, data.earnedPoints, data.leaderboardPoints);

      if (type === "fifty_fifty") {
        if (data.options?.length) {
          const keep = new Set(data.options.map((o) => o.key));
          setHiddenIds(question.options.map((o) => o.key).filter((key) => !keep.has(key)));
        } else if (data.removedOptions?.length) {
          setHiddenIds(data.removedOptions);
        }
        setUsed5050(true);
      }

      if (type === "extra_time") {
        const add = data.extraTimeSeconds ?? lifelines.extraTimeSeconds ?? 10;
        setTimeLeft((t) => t + add);
        setTimeBump((n) => n + 1);
        setUsedExtra(true);
      }

      if (type === "skip") {
        revealLiveMirrorAnswer({
          sessionId,
          question,
          correctOption: null,
          nextQuestion: data.nextQuestion,
        });
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
      const message = err instanceof QuizApiError ? err.message : "Lifeline failed.";
      setError(message);
      console.error("[quiz] lifeline failed", err);
    } finally {
      setSubmitting(false);
    }
  }

  const earnedSoFar = useMemo(() => sessionScore, [sessionScore]);

  if (finished && result) {
    return (
      <QuizCompleteScreen
        correctCount={result.correctCount}
        totalQuestions={result.totalQuestions || total}
        fastBonus={result.fastBonus ?? 0}
        completionBonus={result.completionBonus ?? 0}
        totalEarned={
          (result.pointsAwarded && result.pointsAwarded > 0 ? result.pointsAwarded : null) ??
          (result.sessionScore > 0 ? result.sessionScore : null) ??
          sessionScore ??
          0
        }
        pb={pbReceipt}
        onPlayAgain={onPlayAgain}
        onHome={onHome}
      />
    );
  }

  const correctKey = feedback && feedback.correctOption ? feedback.correctOption.id : null;

  return (
    <div className="quiz-play relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      <div className="quiz-farm absolute inset-0" aria-hidden />
      <div className="quiz-farm-haze absolute inset-0" aria-hidden />

      {/* Confetti burst on a correct answer */}
      {burst > 0 ? (
        <div key={burst} className="quiz-burst pointer-events-none absolute inset-x-0 top-[38%] z-30" aria-hidden>
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${18 + ((i * 37) % 64)}%`,
                animationDelay: `${(i % 6) * 0.04}s`,
                backgroundColor: ["#7C6CF0", "#FF5A8A", "#F5C518", "#4ADE80", "#60A5FA", "#F472B6"][i % 6],
                transform: `rotate(${(i * 47) % 360}deg)`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col px-3"
        style={{
          paddingTop: "var(--header-top)",
          paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Header */}
        <header className="relative mb-2 flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back"
            className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#2B1F7A] shadow-[0_2px_6px_rgba(43,31,122,0.16)] ring-1 ring-white/90 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center pt-0">
            <span className="-mb-0.5 text-[#2A9B5C]" aria-hidden>
              <LeafIcon className="h-3.5 w-3.5" />
            </span>
            <h1 className="quiz-title font-display text-[24px] font-extrabold leading-none">Quiz Time</h1>
            <p className="mt-0.5 text-[10px] font-bold tracking-[0.12em] text-[#3D2E7A]/80">Learn · Play · Grow</p>
          </div>
          <div
            className="quiz-glass-pill z-10 flex h-8 shrink-0 items-center gap-1 rounded-full py-0 pl-1.5 pr-2.5"
            role="status"
            aria-label={`${displayCoins + earnedSoFar} coins`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home/coin-transparent.png"
              alt=""
              className="h-5 w-5 object-contain"
              draggable={false}
            />
            <span key={earnedSoFar} className="quiz-pop text-[13px] font-extrabold leading-none tabular-nums text-[#1a1a2e]">
              {(displayCoins + earnedSoFar).toLocaleString("en-IN")}
            </span>
          </div>
        </header>

        {/* Progress + timer */}
        <div className="mb-4 mt-5 flex shrink-0 items-center gap-2">
          <div className="quiz-progress relative h-[24px] min-w-0 flex-1 rounded-full">
            <div className="quiz-progress-fill absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(progressPct, 12)}%` }} />
            <span
              className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#E9E2FF] px-2 py-[1px] text-[10px] font-extrabold tabular-nums text-[#6A5AE0] shadow-sm transition-all duration-500"
              style={{ left: `clamp(2rem, ${Math.max(progressPct, 12)}%, calc(100% - 2rem))` }}
            >
              {question.index} / {total}
            </span>
          </div>
          <div
            key={timeBump}
            className={`quiz-timer-pill flex h-[28px] shrink-0 items-center gap-1 rounded-full px-2.5 ${
              timerUrgent ? "quiz-timer-urgent" : ""
            } ${timeBump ? "quiz-pop" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#6A5AE0]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span className="min-w-[1.35rem] text-[12px] font-extrabold tabular-nums text-[#6A5AE0]">{timeLeft}s</span>
          </div>
        </div>

        {error ? (
          <p className="quiz-fade mb-2 shrink-0 rounded-2xl bg-[#FEE2E2] px-3 py-1.5 text-center text-[12px] font-semibold text-[#DC2626]">{error}</p>
        ) : null}

        {/* Question card — content-sized, not stretched */}
        <section
          key={question.index}
          className="quiz-card quiz-card-in relative mt-2 shrink-0 rounded-[1.5rem] p-3.5 pb-3"
        >
          <div className={`relative ${feedback ? "" : "min-h-[168px] pr-[43%]"}`}>
            <span className="quiz-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#5B3FA8]">
              <LeafIcon className="h-3 w-3 text-[#2A9B5C]" />
              Agriculture
            </span>
            <h2
              className={`mt-2 font-display font-extrabold leading-[1.2] text-[#241A5E] ${
                feedback ? "pr-0 text-[16px]" : "text-[19px] sm:text-[21px]"
              }`}
            >
              {question.question}
            </h2>
            {!feedback ? (
              <p className="mt-1.5 text-[12px] leading-snug text-[#6B6488]">{subtitle}</p>
            ) : null}

            {/* Mascot + speech bubble — hidden after answer to save space */}
            {!feedback ? (
              <div className="pointer-events-none absolute -right-1 top-0 h-full w-[45%]" aria-hidden>
                <div className="quiz-bubble absolute left-0 top-2 rounded-2xl bg-white px-2.5 py-1.5 text-center font-display text-[10px] font-extrabold leading-tight text-[#2B1F7A] shadow-[0_4px_12px_rgba(43,31,122,0.15)]">
                  {mascotLine}
                </div>
                <span className="quiz-mascot-leaf absolute bottom-2 left-2 text-[#8FD68B]">
                  <LeafIcon className="h-8 w-8" />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/games/quiz-mascot.png"
                  alt=""
                  className="quiz-mascot absolute -bottom-2 right-0 h-[88%] w-auto max-w-full object-contain object-bottom"
                  draggable={false}
                />
              </div>
            ) : null}
          </div>

          {/* Options */}
          <ul className={`mt-2 flex flex-col ${feedback ? "gap-1.5" : "gap-2"}`}>
            {question.options.map((opt, i) => {
              const hidden = hiddenIds.includes(opt.key);
              const isSelected = selected === opt.key;
              const isCorrect = correctKey === opt.key;
              const showResult = !!feedback;
              let state = "idle";
              if (showResult && isCorrect) state = "correct";
              else if (showResult && isSelected && !isCorrect) state = "wrong";
              else if (showResult) state = "dim";
              else if (isSelected) state = "selected";
              return (
                <li key={opt.key} className={hidden ? "quiz-option-hidden" : ""} style={{ animationDelay: `${0.06 * i}s` }}>
                  <button
                    type="button"
                    disabled={locked || submitting || hidden}
                    onClick={() => onPick(opt.key)}
                    className={`quiz-option quiz-option-${state} flex w-full items-center gap-2.5 rounded-full text-left ${
                      feedback ? "py-1.5 pl-1.5 pr-3" : "py-1.5 pl-1.5 pr-3.5"
                    }`}
                  >
                    <span className="quiz-option-key flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-extrabold">
                      {opt.key}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-bold leading-snug">{opt.text}</span>
                    {state === "correct" ? (
                      <span className="quiz-check flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22B14C] text-white shadow-[0_3px_0_#177a34]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12 5 5 9-10" />
                        </svg>
                      </span>
                    ) : null}
                    {state === "wrong" ? (
                      <span className="quiz-check flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EF4444] text-white shadow-[0_3px_0_#a32222]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </span>
                    ) : null}
                    {submitting && isSelected && !showResult ? (
                      <span className="quiz-spinner h-5 w-5 shrink-0 rounded-full border-[3px] border-white/40 border-t-white" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Inline feedback */}
          {feedback ? (
            <div className="mt-2.5 space-y-2">
              <div
                className={`quiz-feedback quiz-feedback-in flex items-center gap-2 rounded-[1.1rem] px-3 py-2 ${
                  feedback.kind === "correct" ? "quiz-feedback-correct" : feedback.kind === "wrong" ? "quiz-feedback-wrong" : "quiz-feedback-missed"
                }`}
              >
                <span
                  className={`quiz-check flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                    feedback.kind === "correct"
                      ? "bg-[#22B14C] shadow-[0_3px_0_#177a34]"
                      : feedback.kind === "wrong"
                        ? "bg-[#EF4444] shadow-[0_3px_0_#a32222]"
                        : "bg-[#F59E0B] shadow-[0_3px_0_#b7700a]"
                  }`}
                >
                  {feedback.kind === "correct" ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  ) : feedback.kind === "wrong" ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-display text-[15px] font-extrabold leading-tight ${
                      feedback.kind === "correct" ? "text-[#1E8A3E]" : feedback.kind === "wrong" ? "text-[#C62828]" : "text-[#B45309]"
                    }`}
                  >
                    {feedback.kind === "correct" ? "Correct!" : feedback.kind === "wrong" ? "Not quite!" : "Time's up!"}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[#3D3A5C]">
                    {feedback.kind === "correct"
                      ? feedback.explanation ?? `${feedback.correctOption.text} is the right call. Keep it up!`
                      : feedback.kind === "wrong"
                        ? `${feedback.correctOption.id} · ${feedback.correctOption.text}${feedback.explanation ? ` — ${feedback.explanation}` : ""}`
                        : feedback.correctOption
                          ? `The answer was ${feedback.correctOption.id} · ${feedback.correctOption.text}.`
                          : "Answer before the clock runs out to earn points."}
                  </p>
                </div>
                {feedback.kind === "correct" && feedback.pointsGained > 0 ? (
                  <span className="quiz-coin-pop flex shrink-0 items-center gap-1 self-center rounded-full bg-[#FFF3C4] px-2 py-1 font-display text-[14px] font-extrabold text-[#6B4A00] ring-1 ring-[#FFD766]">
                    <MiniCoin className="h-4 w-4" />+{feedback.pointsGained}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={continueAfterFeedback}
                disabled={submitting}
                className="quiz-next quiz-feedback-in flex w-full items-center justify-center gap-2 rounded-full py-2.5 font-display text-[15px] font-extrabold text-white disabled:opacity-60"
              >
                {submitting ? "Loading…" : feedback.isLast ? "See Results" : "Next Question"}
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          ) : null}
        </section>

        {/* Lifelines — lifted above phone gesture / home bar */}
        <div className="mt-auto shrink-0 pt-3 pb-1">
          <div className="quiz-card flex items-stretch rounded-[1.35rem] px-1 py-2">
            <LifelineButton
              label="50:50"
              cost={lifelines.fiftyFiftyCost}
              disabled={
                used5050 ||
                locked ||
                submitting ||
                !!feedback ||
                displayCoins < lifelines.fiftyFiftyCost
              }
              onClick={() => void onLifeline("fifty_fifty")}
              icon={
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="url(#quizLifeGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <defs>
                    <linearGradient id="quizLifeGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#8B7CFF" />
                      <stop offset="1" stopColor="#5B47DB" />
                    </linearGradient>
                  </defs>
                  <path d="M6 3h12M6 21h12M8 3v3c0 2.5 4 4 4 6s-4 3.5-4 6v3M16 3v3c0 2.5-4 4-4 6s4 3.5 4 6v3" />
                  <path d="M9.5 20h5" stroke="#F5C518" />
                </svg>
              }
            />
            <div className="my-1 w-px bg-[#E1DBF3]" aria-hidden />
            <LifelineButton
              label="Extra Time"
              cost={lifelines.extraTimeCost}
              disabled={
                usedExtra ||
                locked ||
                submitting ||
                !!feedback ||
                displayCoins < lifelines.extraTimeCost
              }
              onClick={() => void onLifeline("extra_time")}
              icon={
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="url(#quizLifeGrad)" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="13.5" r="7.5" />
                  <path d="M12 9.5v4l2.6 1.6M9.5 2.5h5M12 2.5v3.5M18.5 6l1.5-1.5" />
                </svg>
              }
            />
            <div className="my-1 w-px bg-[#E1DBF3]" aria-hidden />
            <LifelineButton
              label="Skip Question"
              cost={lifelines.skipCost}
              disabled={
                locked ||
                submitting ||
                !!feedback ||
                displayCoins < lifelines.skipCost
              }
              onClick={() => void onLifeline("skip")}
              icon={
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="url(#quizLifeGrad)" aria-hidden>
                  <path d="M5 5.5v13a1 1 0 0 0 1.55.83L15.5 13a1.2 1.2 0 0 0 0-2L6.55 4.67A1 1 0 0 0 5 5.5z" />
                  <rect x="17" y="5" width="3" height="14" rx="1" />
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
      className="quiz-lifeline flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 disabled:opacity-40"
    >
      <span className="quiz-lifeline-icon flex h-9 items-center justify-center">{icon}</span>
      <span className="text-center font-display text-[13px] font-extrabold leading-tight text-[#2B1F7A]">{label}</span>
      <span className="flex items-center gap-1 text-[13px] font-extrabold text-[#6A5AE0]">
        <MiniCoin className="h-4 w-4" />
        {cost}
      </span>
    </button>
  );
}
