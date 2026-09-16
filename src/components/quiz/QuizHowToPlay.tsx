"use client";

import { useState } from "react";
import type { QuizLanguage } from "@/lib/quizApi";

type HowToPlayProps = {
  onStart: (language: QuizLanguage) => void;
  onBack: () => void;
  starting?: boolean;
  error?: string | null;
  scoring?: {
    pointsPerCorrect: number;
    fastAnswerBonus: number;
    completeQuizBonus: number;
    timerSeconds?: number;
    questionsPerQuiz?: number;
    fastAnswerSeconds?: number;
  };
};

const STEPS = [
  {
    title: "Answer Questions",
    body: "Read the question carefully and choose the correct answer from the options.",
    icon: "?",
  },
  {
    title: "Time Limit",
    body: "You have limited time for each question. Answer faster to score higher!",
    icon: "⏱",
  },
  {
    title: "Score Points",
    body: "Earn PB Points for every correct answer. The more correct answers, the more points you earn.",
    icon: "🏆",
  },
  {
    title: "Use Power-ups",
    body: "Stuck on a question? Use power-ups to get hints, extra time or skip the question.",
    icon: "⚡",
  },
  {
    title: "Complete Quiz",
    body: "Answer all questions to complete the quiz and get bonus points!",
    icon: "⚑",
  },
] as const;

const LANG_OPTIONS: { code: QuizLanguage; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
];

const DEFAULT_SCORING = {
  pointsPerCorrect: 20,
  fastAnswerBonus: 5,
  completeQuizBonus: 30,
  timerSeconds: 15,
};

export function QuizHowToPlay({
  onStart,
  onBack,
  starting = false,
  error = null,
  scoring,
}: HowToPlayProps) {
  const [language, setLanguage] = useState<QuizLanguage>("en");
  const points = {
    pointsPerCorrect: Number(scoring?.pointsPerCorrect ?? DEFAULT_SCORING.pointsPerCorrect),
    fastAnswerBonus: Number(scoring?.fastAnswerBonus ?? DEFAULT_SCORING.fastAnswerBonus),
    completeQuizBonus: Number(
      scoring?.completeQuizBonus ?? DEFAULT_SCORING.completeQuizBonus,
    ),
    timerSeconds: Number(scoring?.timerSeconds ?? DEFAULT_SCORING.timerSeconds),
  };
  const steps = STEPS.map((step) =>
    step.title === "Time Limit"
      ? {
          ...step,
          body: `You have ${points.timerSeconds}s for each question. Answer faster to score higher!`,
        }
      : step,
  );
  const scoringRows = [
    { label: "Correct Answer", value: `+${points.pointsPerCorrect} PB` },
    { label: "Fast Answer Bonus", value: `+${points.fastAnswerBonus} PB` },
    { label: "Complete Quiz Bonus", value: `+${points.completeQuizBonus} PB` },
  ];
  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-white">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-10"
        style={{
          paddingTop: "max(3.25rem, calc(var(--header-top) + 0.5rem))",
        }}
      >
        <header className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#1a1a2e]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 className="flex-1 pr-10 text-center font-display text-xl font-extrabold tracking-wide text-[#6A5AE0]">
            HOW TO PLAY
          </h1>
        </header>

        <div className="mx-auto flex w-full flex-1 flex-col">
          <ul className="mt-2 flex flex-col gap-4">
            {steps.map((step) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6A5AE0] text-lg font-bold text-white">
                  {step.icon}
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2 className="font-display text-[15px] font-bold text-[#3D2E7A]">
                    {step.title}
                  </h2>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#5B5675]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl bg-[#F0ECFF] p-4">
            <h3 className="text-center font-display text-sm font-extrabold tracking-wide text-[#6A5AE0]">
              SCORING SYSTEM
            </h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {scoringRows.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-3 border-b border-[#E0D9F5] pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-[13px] text-[#4B4568]">{row.label}</span>
                  <span className="text-[13px] font-bold text-[#6A5AE0]">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <h3 className="text-center font-display text-sm font-extrabold tracking-wide text-[#6A5AE0]">
              CHOOSE LANGUAGE
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Quiz language">
              {LANG_OPTIONS.map((opt) => {
                const selected = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={starting}
                    onClick={() => setLanguage(opt.code)}
                    className={`rounded-2xl px-2 py-3 text-center transition active:scale-[0.98] disabled:opacity-60 ${
                      selected
                        ? "bg-[#6A5AE0] text-white shadow-md shadow-primary/20 ring-2 ring-[#6A5AE0]"
                        : "bg-[#F5F3FF] text-[#3D2E7A] ring-1 ring-[#E0D9F5]"
                    }`}
                  >
                    <span className="block font-display text-[13px] font-extrabold leading-tight">
                      {opt.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-[11px] font-semibold ${
                        selected ? "text-white/85" : "text-[#7B7498]"
                      }`}
                    >
                      {opt.native}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pb-4 pt-6">
            {error ? (
              <p className="mb-3 text-center text-[13px] font-semibold text-[#DC2626]">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => onStart(language)}
              disabled={starting}
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#6A5AE0] text-base font-extrabold text-white shadow-md shadow-primary/25 active:scale-[0.98] disabled:opacity-60"
            >
              {starting ? "Starting…" : "Start Quiz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
