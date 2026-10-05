"use client";

import { TATER_BADGES, type TaterProgress } from "@/data/taterMatch";

type Props = {
  progress: TaterProgress;
  onBack: () => void;
};

export function TaterMatchProgress({ progress, onBack }: Props) {
  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-[#F4F7FC]">
      <div
        className="flex min-h-0 flex-1 flex-col px-4"
        style={{
          paddingTop: "var(--header-top)",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1E3A8A] shadow-sm ring-1 ring-[#E8EEF8]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="font-display text-[20px] font-extrabold text-[#1E3A8A]">My Progress</h1>
            <p className="text-[12px] font-bold text-[#5B7AB0]">Streaks, badges & learning</p>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Card label="Day streak" value={`${progress.streak}🔥`} />
          <Card label="Best score" value={`${progress.bestCorrect}/10`} />
          <Card label="Rounds played" value={String(progress.roundsPlayed)} />
          <Card label="Total correct" value={String(progress.totalCorrect)} />
        </div>

        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-wider text-[#5B7AB0]">Badges</p>
        <ul className="mt-2 space-y-2 overflow-y-auto">
          {TATER_BADGES.map((badge) => {
            const unlocked = progress.badges.includes(badge.id);
            return (
              <li
                key={badge.id}
                className={`flex items-center gap-3 rounded-[1rem] px-3 py-3 ring-1 ${
                  unlocked ? "bg-white ring-[#D7EED0]" : "bg-white/70 ring-[#E8EEF8] opacity-60"
                }`}
              >
                <span className="text-[20px]" aria-hidden>
                  {unlocked ? "🏆" : "🔒"}
                </span>
                <div>
                  <p className="text-[13px] font-extrabold text-[#1E3A8A]">{badge.label}</p>
                  <p className="text-[11px] font-semibold text-[#6B7C9C]">{badge.hint}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {progress.learned.length > 0 ? (
          <>
            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-wider text-[#5B7AB0]">
              Recent learning
            </p>
            <ul className="mt-2 space-y-1.5 pb-4">
              {progress.learned.slice(0, 6).map((item) => (
                <li key={item} className="rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#2A4570] ring-1 ring-[#E8EEF8]">
                  🌱 {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] bg-white px-3 py-3 text-center shadow-sm ring-1 ring-[#E8EEF8]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7B8BB0]">{label}</p>
      <p className="mt-1 font-display text-[20px] font-extrabold text-[#1E3A8A]">{value}</p>
    </div>
  );
}
