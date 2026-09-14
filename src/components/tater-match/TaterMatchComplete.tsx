"use client";

import type { LevelResult } from "@/components/tater-match/taterMatchTypes";

type Props = {
  result: LevelResult;
  onNext: () => void;
  onBackToGames: () => void;
};

export function TaterMatchComplete({ result, onNext, onBackToGames }: Props) {
  const message =
    result.stars >= 3
      ? "Amazing! You collected all the potatoes!"
      : result.stars === 2
        ? "Great job! Keep matching those taters!"
        : "Nice try! Practice makes perfect potatoes.";

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#F5F9FF]">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,#DCECFF_0%,transparent_55%)]" />
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-[2px] opacity-80"
            style={{
              left: `${6 + ((i * 17) % 88)}%`,
              top: `${4 + ((i * 29) % 36)}%`,
              backgroundColor: ["#F5C518", "#7C3AED", "#38BDF8", "#F472B6", "#34D399"][
                i % 5
              ],
              transform: `rotate(${i * 24}deg)`,
            }}
          />
        ))}
      </div>

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col px-5"
        style={{
          paddingTop: "max(2.75rem, calc(var(--header-top) + 0.35rem))",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative h-36 w-36 sm:h-40 sm:w-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/quiz-potato-correct.png"
              alt=""
              className="h-full w-full object-contain drop-shadow-lg"
              draggable={false}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home/coin.png"
              alt=""
              className="absolute -right-1 bottom-2 h-14 w-14 object-contain drop-shadow-md sm:h-16 sm:w-16"
              draggable={false}
            />
          </div>

          <h1 className="mt-1 font-display text-[1.75rem] font-extrabold text-[#1E3A8A] sm:text-[2rem]">
            Level Complete!
          </h1>

          <div className="mt-2 flex items-end gap-2 text-3xl" aria-label={`${result.stars} stars`}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`${n === 2 ? "mb-1 text-4xl" : "text-3xl"} ${
                  n <= result.stars ? "" : "opacity-25 grayscale"
                }`}
              >
                ⭐
              </span>
            ))}
          </div>

          <p className="mt-2 max-w-[16rem] text-[13px] font-medium leading-snug text-[#475569]">
            {message}
          </p>
        </div>

        <div className="mt-4 rounded-[1.35rem] bg-white p-4 shadow-[0_8px_24px_rgba(30,58,138,0.08)]">
          <ResultRow
            label="Score"
            value={result.score.toLocaleString("en-IN")}
          />
          <ResultRow
            label="Moves Bonus"
            value={result.movesBonus.toLocaleString("en-IN")}
          />
          <ResultRow
            label="PB Points Earned"
            value={String(result.pbPoints)}
            highlight
            withCoin
          />
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onNext}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#F5C518] py-3.5 text-base font-extrabold text-[#1A1A2E] shadow-[0_8px_18px_rgba(245,197,24,0.35)] active:scale-[0.98]"
          >
            Next Level
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onBackToGames}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-[15px] font-bold text-[#334155] shadow-sm active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8.2 8.2h7.6c1.7 0 2.9 1.1 3.2 2.6l.85 4.1c.35 1.7-.7 3.2-2.4 3.55-.55.12-1.15-.05-1.55-.45l-1.35-1.35c-.35-.35-.85-.55-1.35-.55h-2.6c-.5 0-1 .2-1.35.55L7.7 18c-.4.4-1 .57-1.55.45-1.7-.35-2.75-1.85-2.4-3.55l.85-4.1C5.3 9.3 6.5 8.2 8.2 8.2Z" />
              <circle cx="9.2" cy="13" r="0.9" fill="currentColor" stroke="none" />
              <circle cx="14.8" cy="12.2" r="0.7" fill="currentColor" stroke="none" />
              <circle cx="16.2" cy="13.8" r="0.7" fill="currentColor" stroke="none" />
            </svg>
            Back to Games
          </button>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-center gap-3 overflow-hidden rounded-[1.25rem] bg-gradient-to-r from-[#6A5AE0] to-[#8B7CF0] p-3.5 text-white shadow-[0_8px_20px_rgba(106,90,224,0.28)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home/gift.png"
              alt=""
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-extrabold">Keep Going!</p>
              <p className="mt-0.5 text-[12px] leading-snug text-white/90">
                Clear more levels to earn bigger PB rewards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  highlight = false,
  withCoin = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  withCoin?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#EEF2F7] py-2.5 last:border-0 last:pb-0 first:pt-0">
      <span className="text-[13px] font-medium text-[#64748B]">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-[14px] font-extrabold tabular-nums ${
          highlight ? "text-[#D4A017]" : "text-[#1E293B]"
        }`}
      >
        {withCoin ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/images/home/coin.png" alt="" className="h-5 w-5 object-contain" />
        ) : null}
        {value}
      </span>
    </div>
  );
}
