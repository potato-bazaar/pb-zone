"use client";

import type { TaterModeId, TaterModeMeta, TaterProgress } from "@/data/taterMatch";
import { TATER_MODES } from "@/data/taterMatch";

type Props = {
  coins: number;
  points: number;
  progress: TaterProgress;
  dailyAvailable: boolean;
  onBack: () => void;
  onPlay: (mode: TaterModeId | "mixed", daily?: boolean) => void;
  onHowTo: () => void;
  onProgress: () => void;
};

const MODE_LOOK: Record<
  TaterModeId,
  { emoji: string; glow: string; ink: string; shade: string }
> = {
  variety: {
    emoji: "🥔",
    glow: "from-[#7EB6FF] to-[#2B6DEF]",
    ink: "#1E4BB8",
    shade: "#163A8C",
  },
  disease: {
    emoji: "🌿",
    glow: "from-[#6EE7A0] to-[#1F8A47]",
    ink: "#145C32",
    shade: "#0E4A28",
  },
  growth: {
    emoji: "🌱",
    glow: "from-[#FFB06A] to-[#C45C12]",
    ink: "#8A3A08",
    shade: "#6B2C06",
  },
};

export function TaterMatchHome({
  coins,
  points,
  progress,
  dailyAvailable,
  onBack,
  onPlay,
  onHowTo,
  onProgress,
}: Props) {
  const coinsDisplay = coins.toLocaleString("en-IN");
  const pointsDisplay = points.toLocaleString("en-IN");

  return (
    <div className="tm-home relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden text-[#14203A]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/games/quiz-farm.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_35%]"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,24,60,0.62) 0%, rgba(12,40,30,0.40) 36%, rgba(6,18,40,0.88) 78%, rgba(4,12,28,0.96) 100%)",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute -left-16 top-16 h-40 w-40 rounded-full bg-[#4CCB68]/22 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-10 top-6 h-36 w-36 rounded-full bg-[#4C8DFF]/28 blur-3xl" aria-hidden />

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col px-4"
        style={{
          paddingTop: "max(2.75rem, calc(var(--header-top) - 0.35rem))",
          paddingBottom: "calc(2.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#2B1F7A] shadow-[0_4px_14px_rgba(0,0,0,0.28)] ring-1 ring-white active:scale-95"
          >
            <ChevronLeft />
          </button>
          <div className="flex items-center gap-1.5">
            <GlassPill>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/home/coin-transparent.png" alt="" className="h-5 w-5 object-contain" draggable={false} />
              <span className="tabular-nums">{coinsDisplay}</span>
            </GlassPill>
            <GlassPill>
              <span aria-hidden>🏆</span>
              <span className="tabular-nums">{pointsDisplay}</span>
            </GlassPill>
          </div>
        </header>

        <div className="relative mt-1.5 flex shrink-0 items-end justify-between gap-2">
          <div className="min-w-0 pb-0.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B8F0C8] drop-shadow">
              Game Zone
            </p>
            <h1
              className="tm-title font-display text-[32px] font-extrabold uppercase leading-[0.9] tracking-wide text-white"
              style={{ textShadow: "0 3px 0 #0A2E18, 0 10px 22px rgba(0,0,0,0.45)" }}
            >
              <span className="text-[#FFE066]">Tater</span>{" "}
              <span className="text-[#7CFFB0]">Match</span>
            </h1>
            <p className="mt-1 text-[11px] font-extrabold text-white/90 drop-shadow">
              Match · Learn · Earn PB
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/quiz-potato-mascot.png"
            alt=""
            className="tm-bob -mb-0.5 h-[84px] w-auto drop-shadow-[0_12px_18px_rgba(0,0,0,0.45)]"
            draggable={false}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatBlock label="Streak" value={`${progress.streak}`} suffix="🔥" />
          <StatBlock label="Best" value={`${progress.bestCorrect}`} suffix="/10" />
          <StatBlock label="Rounds" value={String(progress.roundsPlayed)} />
        </div>

        <button
          type="button"
          onClick={() => onPlay("mixed", true)}
          disabled={!dailyAvailable}
          className="mt-2.5 flex items-center gap-2.5 rounded-[1.15rem] bg-gradient-to-b from-[#FFE066] to-[#F0A800] px-3 py-2.5 text-left shadow-[0_5px_0_#B8860B,0_10px_20px_rgba(0,0,0,0.28)] ring-2 ring-[#FFF3B0] active:translate-y-[2px] active:shadow-[0_3px_0_#B8860B] disabled:translate-y-0 disabled:opacity-55"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/30 text-[18px] ring-1 ring-white/50">
            ⚔️
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#6B3A00]">
              Daily Potato Challenge
            </span>
            <span className="mt-0.5 block text-[13px] font-extrabold leading-tight text-[#3A2A00]">
              {dailyAvailable ? "1 quest ready · +15 coins" : "Cleared — back tomorrow"}
            </span>
          </span>
          <span className="rounded-full bg-[#3A2A00] px-2.5 py-1 text-[11px] font-extrabold text-[#FFE066]">
            {dailyAvailable ? "GO" : "✓"}
          </span>
        </button>

        <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B8D4FF] drop-shadow">
          Pick your battle
        </p>
        <ul className="mt-1.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto [-webkit-overflow-scrolling:touch]">
          {TATER_MODES.map((mode, i) => (
            <ModeCard key={mode.id} mode={mode} index={i} onPlay={() => onPlay(mode.id)} />
          ))}
        </ul>

        {/* CTA dock — lifted off the home indicator */}
        <div className="mt-3 shrink-0 rounded-[1.35rem] bg-[#0B1830]/55 p-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/20 backdrop-blur-md">
          <button
            type="button"
            onClick={() => onPlay("mixed")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#FFE066] to-[#F5B400] py-3 font-display text-[18px] font-extrabold text-[#3A2A00] shadow-[0_6px_0_#B8860B] ring-2 ring-[#FFF3B0] active:translate-y-1 active:shadow-[0_3px_0_#B8860B]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M7 5v14l11-7L7 5z" />
            </svg>
            Play Now
          </button>
          <div className="mt-3.5 flex items-center gap-3">
            <button
              type="button"
              onClick={onHowTo}
              className="min-w-0 flex-1 rounded-full bg-white/12 py-2.5 text-[12px] font-extrabold text-white ring-1 ring-white/30"
            >
              How to Play
            </button>
            <button
              type="button"
              onClick={onProgress}
              className="min-w-0 flex-1 rounded-full bg-white/12 py-2.5 text-[12px] font-extrabold text-white ring-1 ring-white/30"
            >
              My Progress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  index,
  onPlay,
}: {
  mode: TaterModeMeta;
  index: number;
  onPlay: () => void;
}) {
  const look = MODE_LOOK[mode.id];
  return (
    <li style={{ animationDelay: `${index * 70}ms` }} className="tm-mode shrink-0">
      <button
        type="button"
        onClick={onPlay}
        className="flex w-full items-center gap-2.5 rounded-[1.1rem] bg-white px-2.5 py-2.5 text-left shadow-[0_5px_0_rgba(0,0,0,0.16),0_10px_18px_rgba(0,0,0,0.2)] ring-2 ring-white active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.16)]"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b text-[18px] text-white shadow-[0_3px_0_rgba(0,0,0,0.18)] ${look.glow}`}
        >
          {look.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-extrabold leading-tight" style={{ color: look.ink }}>
            {mode.title}
          </span>
          <span className="mt-0.5 block text-[10px] font-bold text-[#5B6478]">{mode.subtitle}</span>
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white"
          style={{ background: look.ink, boxShadow: `0 2px 0 ${look.shade}` }}
        >
          Play
        </span>
      </button>
    </li>
  );
}

function StatBlock({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-[1rem] bg-white/14 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-white/28 backdrop-blur-md">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#B8D4FF]">{label}</p>
      <p className="mt-0.5 font-display text-[16px] font-extrabold text-white drop-shadow">
        {value}
        {suffix ? <span className="text-[11px]">{suffix}</span> : null}
      </p>
    </div>
  );
}

function GlassPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 items-center gap-1 rounded-full bg-white/95 py-0 pl-1.5 pr-2.5 text-[12px] font-extrabold text-[#1a1a2e] shadow-[0_4px_12px_rgba(0,0,0,0.25)] ring-1 ring-white">
      {children}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
