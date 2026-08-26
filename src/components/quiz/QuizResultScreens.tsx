"use client";

import type { QuizOption } from "@/data/quizQuestions";

function MiniCoin({ className = "h-5 w-5" }: { className?: string }) {
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

function ConfettiBits() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <span className="absolute left-[14%] top-[10%] h-2.5 w-2.5 rotate-[18deg] rounded-[3px] bg-[#7C6CF0]" />
      <span className="absolute right-[18%] top-[14%] h-2 w-2 rounded-full bg-[#FF5A8A]" />
      <span className="absolute left-[22%] top-[48%] h-2 w-3 -rotate-[35deg] rounded-[2px] bg-[#F5C518]" />
      <span className="absolute right-[14%] top-[42%] h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#4ADE80]" />
      <span className="absolute left-[8%] top-[28%] h-1.5 w-1.5 rounded-full bg-[#60A5FA]" />
      <span className="absolute right-[28%] top-[6%] h-1.5 w-1.5 rounded-full bg-[#F472B6]" />
      <span className="absolute right-[10%] top-[58%] h-2 w-2 rotate-12 rounded-[2px] bg-[#A78BFA]" />
      <svg
        viewBox="0 0 24 24"
        className="absolute left-[28%] top-[6%] h-5 w-5 -rotate-[30deg] text-[#4ADE80]"
        fill="currentColor"
      >
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A15.08 15.08 0 0 0 12 20c6 0 10-4 10-10 0-1.5-.5-3-1.5-4.5C18.5 7 17.5 7.5 17 8z" />
      </svg>
    </div>
  );
}

type CorrectProps = {
  correctOption: QuizOption;
  pointsGained: number;
  isLast: boolean;
  onNext: () => void;
};

export function QuizCorrectScreen({
  correctOption,
  pointsGained,
  isLast,
  onNext,
}: CorrectProps) {
  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-[#F4FAF4]">
      <div
        className="flex min-h-0 flex-1 flex-col px-4 pb-12"
        style={{
          paddingTop: "max(3.75rem, calc(var(--header-top) + 1.25rem))",
        }}
      >
        <div className="mx-auto flex w-full flex-1 flex-col items-center">
          <h1 className="font-display text-[2.15rem] font-extrabold leading-none tracking-tight text-[#2F6B2F]">
            Great Job!
          </h1>

          <div className="relative mt-3 flex h-[270px] w-full shrink-0 items-end justify-center sm:h-[300px]">
            <ConfettiBits />
            <span
              className="pointer-events-none absolute bottom-1 left-1/2 h-6 w-36 -translate-x-1/2 rounded-[100%] bg-[#A8D5A8]/55 blur-[6px]"
              aria-hidden
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/quiz-potato-correct.png"
              alt=""
              className="relative z-10 h-[98%] w-auto max-w-[310px] object-contain object-bottom"
              draggable={false}
            />
          </div>

          <p className="mt-6 font-display text-[1.35rem] font-extrabold text-[#2F6B2F]">
            You are correct!
          </p>

          <p className="mt-3 flex items-center justify-center gap-2.5 text-[1.4rem] font-extrabold text-[#2F6B2F]">
            <MiniCoin className="h-9 w-9" />
            <span>+{pointsGained} PB</span>
          </p>

          <div className="mt-10 w-[88%] max-w-sm rounded-[1.5rem] border border-[#E8E4F5] bg-white px-5 py-5 text-center shadow-[0_2px_10px_rgba(43,31,122,0.04)]">
            <p className="text-[14px] font-bold text-[#5B4DB8]">
              Correct Answer
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D8D4E8] bg-[#F3F1F8] text-[16px] font-extrabold text-[#3D2F8A]">
                {correctOption.id}
              </span>
              <span className="text-[18px] font-extrabold text-[#2B1F7A]">
                {correctOption.text}
              </span>
            </div>
          </div>

          <div className="mt-auto w-full pb-2 pt-6">
            <button
              type="button"
              onClick={onNext}
              className="flex w-full items-center justify-center rounded-full bg-[#6A5AE0] py-[15px] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(106,90,224,0.38)] transition active:scale-[0.99]"
            >
              {isLast ? "See Results" : "Next Question"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type WrongProps = {
  correctOption: QuizOption;
  explanation: string;
  isLast: boolean;
  onNext: () => void;
};

export function QuizWrongScreen({
  correctOption,
  explanation,
  isLast,
  onNext,
}: WrongProps) {
  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-[#FFF1ED]">
      <div
        className="flex min-h-0 flex-1 flex-col px-4 pb-12"
        style={{
          paddingTop: "max(3.75rem, calc(var(--header-top) + 1.25rem))",
        }}
      >
        <div className="mx-auto flex w-full flex-1 flex-col items-center">
          <h1 className="font-display text-[2.15rem] font-extrabold leading-none tracking-tight text-[#E23D3D]">
            Oops!
          </h1>

          <div className="relative mt-3 flex h-[270px] w-full shrink-0 items-end justify-center sm:h-[300px]">
            <span
              className="pointer-events-none absolute left-[16%] top-[18%] text-2xl font-bold text-[#F97316]"
              aria-hidden
            >
              ?
            </span>
            <span
              className="pointer-events-none absolute right-[18%] top-[12%] text-3xl font-bold text-[#E23D3D]"
              aria-hidden
            >
              ?
            </span>
            <span
              className="pointer-events-none absolute right-[26%] top-[46%] text-xl font-bold text-[#B45309]"
              aria-hidden
            >
              ?
            </span>
            <span
              className="pointer-events-none absolute bottom-1 left-1/2 h-6 w-36 -translate-x-1/2 rounded-[100%] bg-[#F5C4B8]/50 blur-[6px]"
              aria-hidden
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/quiz-potato-wrong.png"
              alt=""
              className="relative z-10 h-[98%] w-auto max-w-[310px] object-contain object-bottom"
              draggable={false}
            />
          </div>

          <p className="mt-3 font-display text-[1.35rem] font-extrabold text-[#E23D3D]">
            That&apos;s not correct
          </p>

          <div className="mt-6 w-[88%] max-w-sm rounded-[1.5rem] border border-[#E8E4F5] bg-white px-5 py-5 text-center shadow-[0_2px_10px_rgba(43,31,122,0.04)]">
            <p className="text-[14px] font-bold text-[#5B4DB8]">Correct Answer</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D8D4E8] bg-[#F3F1F8] text-[16px] font-extrabold text-[#3D2F8A]">
                {correctOption.id}
              </span>
              <span className="text-[18px] font-extrabold text-[#2B1F7A]">
                {correctOption.text}
              </span>
            </div>
            <div className="my-4 h-px bg-[#EEEAF5]" />
            <p className="text-[14px] font-bold text-[#2B1F7A]">Explanation</p>
            <p className="mt-2 text-[15px] font-semibold leading-relaxed text-[#4B3F8A]">
              {explanation}
            </p>
          </div>

          <div className="mt-auto w-full pb-2 pt-6">
            <button
              type="button"
              onClick={onNext}
              className="flex w-full items-center justify-center rounded-full bg-[#6A5AE0] py-[15px] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(106,90,224,0.38)] transition active:scale-[0.99]"
            >
              {isLast ? "See Results" : "Next Question"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CompleteProps = {
  correctCount: number;
  totalQuestions: number;
  fastBonus: number;
  completionBonus: number;
  totalEarned: number;
  onPlayAgain: () => void;
  onHome: () => void;
};

export function QuizCompleteScreen({
  correctCount,
  totalQuestions,
  fastBonus,
  completionBonus,
  totalEarned,
  onPlayAgain,
  onHome,
}: CompleteProps) {
  const answerScore = totalEarned - fastBonus - completionBonus;

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-white">
      <div
        className="flex min-h-0 flex-1 flex-col px-6 pb-10"
        style={{
          paddingTop: "max(4.25rem, calc(var(--header-top) + 1.5rem))",
        }}
      >
        <div className="mx-auto flex w-full flex-1 flex-col">
          <h1 className="text-center font-display text-[1.85rem] font-extrabold text-[#6A5AE0]">
            Quiz Complete!
          </h1>

          <div className="relative mx-auto mt-5 flex h-56 w-full items-center justify-center sm:h-64">
            <ConfettiBits />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home/trophy-pb-ribbons.png"
              alt=""
              className="relative z-10 h-full w-auto max-w-[280px] object-contain drop-shadow-[0_10px_20px_rgba(196,146,10,0.28)]"
              draggable={false}
            />
          </div>

          <p className="mt-5 text-center text-[15px] font-semibold text-[#6B7280]">
            Your Score
          </p>
          <p className="mt-1 text-center font-display text-[2.75rem] font-extrabold leading-none text-[#6A5AE0]">
            {answerScore + fastBonus}{" "}
            <span className="text-[1.75rem]">PB</span>
          </p>

          <ul className="mt-8 space-y-3 text-[15px]">
            <li className="flex items-center justify-between text-[#4B3F8A]">
              <span>Correct Answers</span>
              <span className="font-bold text-[#2B1F7A]">
                {correctCount} / {totalQuestions}
              </span>
            </li>
            <li className="flex items-center justify-between text-[#4B3F8A]">
              <span>Fast Answer Bonus</span>
              <span className="font-bold text-[#2B1F7A]">+{fastBonus} PB</span>
            </li>
            <li className="flex items-center justify-between text-[#4B3F8A]">
              <span>Completion Bonus</span>
              <span className="font-bold text-[#2B1F7A]">
                +{completionBonus} PB
              </span>
            </li>
          </ul>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#FFF4CC] px-4 py-4">
            <span className="font-bold text-[#2B1F7A]">Total Earned</span>
            <span className="flex items-center gap-2 font-extrabold text-[#2B1F7A]">
              {totalEarned} PB
              <MiniCoin className="h-6 w-6" />
            </span>
          </div>

          <div className="mt-auto space-y-3 pb-1 pt-5">
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex w-full items-center justify-center rounded-full bg-[#6A5AE0] py-3.5 text-base font-bold text-white shadow-[0_6px_18px_rgba(106,90,224,0.3)] active:scale-[0.99]"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={onHome}
              className="flex w-full items-center justify-center rounded-full border-2 border-[#E4DFF5] bg-white py-3.5 text-base font-bold text-[#6A5AE0] active:scale-[0.99]"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
