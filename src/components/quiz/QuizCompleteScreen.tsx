"use client";

import { useEffect, useState } from "react";
import { PbBreakdownCard, RewardPills } from "@/components/pb/PbUi";
import type { PbReceipt } from "@/components/providers/PbPointsProvider";

type CompleteProps = {
  correctCount: number;
  totalQuestions: number;
  fastBonus: number;
  completionBonus: number;
  /** Coins earned this session (server-settled). */
  totalEarned: number;
  /** PB Points receipt for this session. */
  pb: PbReceipt | null;
  onPlayAgain: () => void;
  onHome: () => void;
};

function useCountUp(target: number, duration = 1100, delay = 500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const timer = window.setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return value;
}

function Coin({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="qcCoin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE566" />
          <stop offset="0.5" stopColor="#F5C518" />
          <stop offset="1" stopColor="#D4A017" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#qcCoin)" stroke="#C4920A" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#FFF3A8" strokeWidth="1" opacity="0.7" />
      <text x="12" y="15.3" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#8B6914" fontFamily="system-ui, sans-serif">
        PB
      </text>
    </svg>
  );
}

const CONFETTI = ["#7C6CF0", "#FF5A8A", "#F5C518", "#4ADE80", "#60A5FA", "#F472B6", "#FB923C"];

export function QuizCompleteScreen({
  correctCount,
  totalQuestions,
  fastBonus,
  completionBonus,
  totalEarned,
  pb,
  onPlayAgain,
  onHome,
}: CompleteProps) {
  const answerCoins = Math.max(0, totalEarned - fastBonus - completionBonus);
  const displayCoins = answerCoins + fastBonus + completionBonus;
  const pbApplied = pb?.applied ?? 0;
  const shownPb = useCountUp(pbApplied);
  const ratio = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const praise = ratio >= 0.9 ? "Potato genius!" : ratio >= 0.6 ? "Well done!" : ratio >= 0.3 ? "Nice effort!" : "Keep growing!";

  const coinRows = [
    { label: "Answer coins", value: `+${answerCoins}` },
    { label: "Fast answer bonus", value: `+${fastBonus}` },
    { label: "Completion bonus", value: `+${completionBonus}` },
  ];

  return (
    <div className="quiz-complete relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      <div className="quiz-farm absolute inset-0" aria-hidden />
      <div className="quiz-complete-haze absolute inset-0" aria-hidden />

      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
        {Array.from({ length: 26 }, (_, i) => (
          <span
            key={i}
            className="qc-confetti"
            style={{
              left: `${(i * 37 + 5) % 100}%`,
              backgroundColor: CONFETTI[i % CONFETTI.length],
              animationDelay: `${(i * 0.23) % 3}s`,
              animationDuration: `${3.2 + (i % 4) * 0.6}s`,
              width: 6 + (i % 3) * 3,
              height: 10 + (i % 2) * 4,
            }}
          />
        ))}
      </div>

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 [-webkit-overflow-scrolling:touch]"
        style={{ paddingTop: "max(3.5rem, calc(var(--header-top) + 0.25rem))" }}
      >
        <h1 className="qc-title shrink-0 text-center font-display text-[34px] font-extrabold leading-none">Game Complete!</h1>
        <p className="qc-fade mt-1.5 shrink-0 text-center text-[13px] font-semibold leading-snug text-[#3D2E7A]" style={{ animationDelay: "0.2s" }}>
          Great job! Keep harvesting knowledge!
        </p>

        <div className="relative mx-auto mt-1 h-[190px] w-full shrink-0">
          <div className="qc-rays absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/home/trophy-pb-ribbons.png"
            alt=""
            className="qc-trophy absolute left-1/2 top-1/2 h-[180px] w-auto -translate-x-[60%] -translate-y-1/2 object-contain"
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/games/quiz-mascot-cheer.png" alt="" className="qc-mascot absolute bottom-0 right-[3%] h-[110px] w-auto object-contain" draggable={false} />
        </div>

        {/* Rewards: Points and Coins shown separately (FRD §23) */}
        <section className="qc-card qc-rise relative mt-1 rounded-[1.6rem] px-4 pb-4 pt-4" style={{ animationDelay: "0.35s" }}>
          <p className="text-center text-[13px] font-bold text-[#5B4DB8]">
            {correctCount} / {totalQuestions} correct · {praise}
          </p>
          <p className="qc-score mt-1 text-center font-display font-extrabold leading-none">
            <span className="text-[48px] tabular-nums">+{shownPb}</span>
            <span className="ml-2 text-[24px]">PB Points</span>
          </p>
          <div className="qc-pill mt-3">
            <RewardPills points={pbApplied} coins={displayCoins} size="sm" />
          </div>

          {pb ? (
            <div className="mt-4">
              <PbBreakdownCard receipt={pb} />
            </div>
          ) : null}

          {/* Coins */}
          <div className="qc-row mt-3 rounded-2xl bg-[#FFF6D6] px-4 py-3 ring-1 ring-[#FFE082]" style={{ animationDelay: "0.9s" }}>
            <div className="flex items-center justify-between">
              <p className="font-display text-[15px] font-extrabold text-[#8A5A00]">PB Coins</p>
              <Coin className="h-5 w-5" />
            </div>
            <ul className="mt-1.5 divide-y divide-[#FFE9A8] text-[13px]">
              {coinRows.map((row) => (
                <li key={row.label} className="flex items-center justify-between py-1.5">
                  <span className="font-semibold text-[#8A5A00]">{row.label}</span>
                  <span className="font-extrabold tabular-nums text-[#5A3D00]">{row.value}</span>
                </li>
              ))}
              <li className="flex items-center justify-between pt-2">
                <span className="font-display font-extrabold text-[#5A3D00]">Total</span>
                <span className="font-display font-extrabold tabular-nums text-[#8A5A00]">+{displayCoins} Coins</span>
              </li>
            </ul>
          </div>
        </section>

        <div className="qc-rise mt-4 space-y-3" style={{ animationDelay: "0.7s" }}>
          <button type="button" onClick={onPlayAgain} className="quiz-next flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-display text-[18px] font-extrabold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M7 5v14l11-7L7 5z" />
              </svg>
            </span>
            Play Again
          </button>
          <button type="button" onClick={onHome} className="qc-secondary flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-display text-[17px] font-extrabold text-[#6A5AE0]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M12 3 3 10.5V20a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1v-9.5L12 3z" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
