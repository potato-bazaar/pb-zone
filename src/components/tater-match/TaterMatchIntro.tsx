"use client";

import { CoinBadge } from "@/components/ui/CoinBadge";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { AppBottomNav } from "@/components/layout/AppBottomNav";

type Props = {
  onPlay: () => void;
  onBack: () => void;
};

const STEPS = [
  {
    body: "Match 3 or more items to collect them.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M9.2 11.2V7.6a1.4 1.4 0 0 1 2.8 0v3.2"
          stroke="#2F6FBF"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M12 10.8V6.9a1.35 1.35 0 0 1 2.7 0v4.2"
          stroke="#2F6FBF"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M14.7 11.1V8.2a1.25 1.25 0 0 1 2.5 0v5.1c0 2.7-1.7 4.9-4.4 4.9h-.4c-2.2 0-3.7-1.1-4.6-2.6L6.4 12.4a1.2 1.2 0 0 1 1.9-1.4l.9 1.2"
          stroke="#2F6FBF"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    body: "Create bigger matches to earn more PB Points.",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/images/home/coin.png" alt="" className="h-6 w-6 object-contain" />
    ),
  },
  {
    body: "Complete the level goals within limited moves!",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/images/home/gift.png" alt="" className="h-6 w-6 object-contain" />
    ),
  },
] as const;

export function TaterMatchIntro({ onPlay, onBack }: Props) {
  const { coins } = usePbCoins();

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#F3F8FF]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 10%, #DBECFF 0%, transparent 55%), radial-gradient(ellipse 70% 45% at 90% 30%, #E8F4FF 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 50% 90%, #FFF6D6 0%, transparent 55%)",
        }}
      />

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col px-4"
        style={{
          paddingTop: "max(2.75rem, calc(var(--header-top) + 0.25rem))",
          paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-full py-1 pr-2 active:scale-[0.98]"
            aria-label="Back to games"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/pb-zone-logo.png"
              alt=""
              className="h-9 w-9 object-contain"
            />
            <span className="text-left leading-tight">
              <span className="block font-display text-[13px] font-extrabold tracking-wide text-[#1E3A8A]">
                PB ZONE
              </span>
              <span className="block text-[9px] font-semibold text-[#64748B]">
                by Potato Bazaar
              </span>
            </span>
          </button>
          <CoinBadge amount={coins} className="py-1 pr-2.5" />
        </header>

        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#B8DCFF] via-[#C8E6FF] to-[#A8D4F8] p-4 shadow-[0_10px_28px_rgba(47,127,209,0.18)]">
          <div
            className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/25"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-[#7EB8F0]/30"
            aria-hidden
          />

          <div className="relative z-10 flex items-end gap-2">
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="font-display text-[1.85rem] font-extrabold leading-none tracking-tight text-[#0F172A] sm:text-[2.1rem]">
                Tater Match
              </h1>
              <p className="mt-2 max-w-[11.5rem] text-[12px] font-medium leading-snug text-[#334155] sm:text-[13px]">
                Match, collect and grow your PB Points!
              </p>
            </div>
            <div className="relative h-[7.5rem] w-[7.5rem] shrink-0 sm:h-[8.5rem] sm:w-[8.5rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/quiz-potato-correct.png"
                alt=""
                className="absolute inset-0 h-full w-full object-contain drop-shadow-md"
                draggable={false}
              />
            </div>
          </div>
        </div>

        <section className="mt-4 rounded-[1.35rem] bg-white/90 p-4 shadow-[0_6px_20px_rgba(30,58,138,0.06)] backdrop-blur-sm">
          <h2 className="mb-3 font-display text-[15px] font-extrabold text-[#1E3A8A]">
            How to Play
          </h2>
          <ul className="flex flex-col gap-3">
            {STEPS.map((step) => (
              <li key={step.body} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF5FF] shadow-inner">
                  {step.icon}
                </span>
                <p className="pt-2 text-[13px] font-medium leading-snug text-[#3F4658]">
                  {step.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-auto pt-5">
          <button
            type="button"
            onClick={onPlay}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[#1B2B5A] text-base font-extrabold text-white shadow-[0_8px_20px_rgba(27,43,90,0.28)] active:scale-[0.98]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-0.5" fill="currentColor" aria-hidden>
                <path d="M8 5.5v13l11-6.5L8 5.5Z" />
              </svg>
            </span>
            Play Now
          </button>
        </div>
      </div>

      <AppBottomNav />
    </div>
  );
}
