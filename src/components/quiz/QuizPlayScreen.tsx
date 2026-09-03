"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import {
  QuizCompleteScreen,
  QuizCorrectScreen,
  QuizWrongScreen,
} from "@/components/quiz/QuizResultScreens";
import {
  QUIZ_POINTS_COMPLETE,
  QUIZ_POINTS_CORRECT,
  QUIZ_POINTS_FAST,
  QUIZ_QUESTIONS,
  QUIZ_QUESTION_COUNT,
  QUIZ_TIME_PER_QUESTION,
  type QuizQuestion,
} from "@/data/quizQuestions";

type QuizPlayScreenProps = {
  onExit: () => void;
  onHome: () => void;
  onPlayAgain: () => void;
};

type Feedback =
  | {
      kind: "correct";
      pointsGained: number;
      correctOption: QuizQuestion["options"][number];
    }
  | {
      kind: "wrong";
      correctOption: QuizQuestion["options"][number];
      explanation: string;
    };

function MiniCoin({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#F5C518" stroke="#C4920A" strokeWidth="1.2" />
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

function pickQuestions(): QuizQuestion[] {
  const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, QUIZ_QUESTION_COUNT);
}

export function QuizPlayScreen({
  onExit,
  onHome,
  onPlayAgain,
}: QuizPlayScreenProps) {
  const { coins, addCoins, spendCoins } = usePbCoins();
  const questions = useMemo(() => pickQuestions(), []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [fastBonus, setFastBonus] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME_PER_QUESTION);
  const [hiddenIds, setHiddenIds] = useState<Array<"A" | "B" | "C" | "D">>([]);
  const [used5050, setUsed5050] = useState(false);
  const [usedExtra, setUsedExtra] = useState(false);
  const [finished, setFinished] = useState(false);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const current = questions[index];
  const total = questions.length;
  const progressPct = ((index + 1) / total) * 100;
  const isLast = index >= total - 1;

  useEffect(() => {
    if (finished || locked || feedback || !current) return;
    if (timeLeft <= 0) {
      if (selected) {
        revealAnswer(selected === current.correctId);
      } else {
        revealAnswer(false);
      }
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished, locked, feedback, index, selected]);

  function resetForNext() {
    setSelected(null);
    setHiddenIds([]);
    setUsed5050(false);
    setUsedExtra(false);
    setLocked(false);
    setFeedback(null);
    setTimeLeft(QUIZ_TIME_PER_QUESTION);
  }

  function revealAnswer(wasCorrect: boolean) {
    if (!current || feedback) return;
    setLocked(true);

    const correctOption =
      current.options.find((o) => o.id === current.correctId) ??
      current.options[0];

    if (wasCorrect) {
      const isFast = timeLeft >= QUIZ_TIME_PER_QUESTION - 5;
      const bonus = isFast ? QUIZ_POINTS_FAST : 0;
      const gained = QUIZ_POINTS_CORRECT + bonus;
      setScore((s) => s + gained);
      setCorrectCount((c) => c + 1);
      if (bonus) setFastBonus((b) => b + bonus);
      addCoins(gained);
      setFeedback({
        kind: "correct",
        pointsGained: gained,
        correctOption,
      });
      return;
    }

    setFeedback({
      kind: "wrong",
      correctOption,
      explanation: current.explanation,
    });
  }

  function continueAfterFeedback() {
    if (isLast) {
      setScore((s) => s + QUIZ_POINTS_COMPLETE);
      addCoins(QUIZ_POINTS_COMPLETE);
      setFinished(true);
      setFeedback(null);
      return;
    }
    setIndex((i) => i + 1);
    resetForNext();
  }

  function onSelect(id: "A" | "B" | "C" | "D") {
    if (locked || finished || feedback || !current) return;
    setSelected(id);
  }

  function onSubmit() {
    if (locked || finished || feedback || !current || !selected) return;
    revealAnswer(selected === current.correctId);
  }

  function spend(cost: number) {
    return spendCoins(cost);
  }

  function use5050() {
    if (used5050 || locked || feedback || !current) return;
    if (!spend(10)) return;
    const wrong = current.options
      .filter((o) => o.id !== current.correctId)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((o) => o.id);
    setHiddenIds(wrong);
    setUsed5050(true);
  }

  function useExtraTime() {
    if (usedExtra || locked || feedback) return;
    if (!spend(10)) return;
    setTimeLeft((t) => t + 10);
    setUsedExtra(true);
  }

  function useSkip() {
    if (locked || feedback) return;
    if (!spend(10)) return;
    revealAnswer(false);
  }

  if (finished) {
    const totalEarned = score;
    return (
      <QuizCompleteScreen
        correctCount={correctCount}
        totalQuestions={total}
        fastBonus={fastBonus}
        completionBonus={QUIZ_POINTS_COMPLETE}
        totalEarned={totalEarned}
        onPlayAgain={onPlayAgain}
        onHome={onHome}
      />
    );
  }

  if (feedback && current) {
    if (feedback.kind === "correct") {
      return (
        <QuizCorrectScreen
          correctOption={feedback.correctOption}
          pointsGained={feedback.pointsGained}
          isLast={isLast}
          onNext={continueAfterFeedback}
        />
      );
    }
    return (
      <QuizWrongScreen
        correctOption={feedback.correctOption}
        explanation={feedback.explanation}
        isLast={isLast}
        onNext={continueAfterFeedback}
      />
    );
  }

  if (!current) return null;

  const visibleOptions = current.options.filter(
    (o) => !hiddenIds.includes(o.id),
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
          <CoinBadge amount={coins} />
        </header>

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
              {index + 1} / {total}
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
            <span className="absolute right-[42%] top-[18%] text-[10px] text-[#C4B5F5]/90">
              ✦
            </span>
            <span className="absolute right-[28%] top-[38%] text-[7px] text-white/90">
              ✦
            </span>
            <span className="absolute bottom-[28%] right-[48%] text-[8px] text-[#B8A8F0]/75">
              ✦
            </span>
          </div>

          <div className="relative z-10 flex h-full min-h-[176px] items-center py-6 pl-5 pr-[44%] sm:min-h-[188px] sm:pl-6 sm:pr-[42%]">
            <p className="text-[17px] font-extrabold leading-snug text-[#2B1F7A] sm:text-[19px]">
              {current.question}
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
            const isSelected = selected === opt.id;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onSelect(opt.id)}
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
                    {opt.id}
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
              className="min-w-[11rem] rounded-full bg-[#6A5AE0] px-10 py-3.5 text-base font-extrabold text-white shadow-[0_6px_20px_rgba(106,90,224,0.4)] transition active:scale-[0.98]"
            >
              Submit
            </button>
          </div>
        )}

        <div className="mt-auto pb-2 pt-6">
          <div className="flex items-stretch rounded-[1.35rem] bg-white px-1 py-3.5 shadow-[0_4px_18px_rgba(43,31,122,0.1)]">
            <LifelineButton
              label="50:50"
              disabled={used5050 || locked}
              onClick={use5050}
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
              disabled={usedExtra || locked}
              onClick={useExtraTime}
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
              disabled={locked}
              onClick={useSkip}
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
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
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
        10
      </span>
    </button>
  );
}
