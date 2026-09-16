"use client";

const ART = "/games/run";

type Props = {
  best: number;
  coins: number;
  onPlay: () => void;
  onHowTo: () => void;
  onRewards: () => void;
  onLeaderboard: () => void;
  onBack: () => void;
};

/** Start screen from the mockup: farm road backdrop, wooden logo, running hero, big yellow Play Now. */
export function RunStart({ best, coins, onPlay, onHowTo, onRewards, onLeaderboard, onBack }: Props) {
  void onHowTo;
  void onRewards;
  void onLeaderboard;

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#8fd0ff] text-white">
      <img src={`${ART}/farm.jpg`} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_55%]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B1020]/20 via-transparent to-[#0B1020]/75" aria-hidden />

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col px-4"
        style={{
          paddingTop: "max(0.35rem, calc(var(--header-top) - 0.35rem))",
          paddingBottom: "max(1.75rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))",
        }}
      >
        {/* Back (left) + coins (right) — parallel */}
        <div className="mb-1 flex shrink-0 items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to games"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#2B1F7A] shadow-[0_3px_10px_rgba(0,0,0,0.2)] ring-1 ring-white/90 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E4F5] bg-white py-1 pl-1.5 pr-3 shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
            role="status"
            aria-label={`${Math.max(0, Math.floor(coins)).toLocaleString("en-IN")} coins`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home/coin-transparent.png"
              alt=""
              className="h-5 w-5 shrink-0 object-contain"
              draggable={false}
            />
            <span className="text-[14px] font-extrabold tabular-nums leading-none text-[#1a1a2e]">
              {Math.max(0, Math.floor(coins)).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="relative mt-0 flex shrink-0 justify-center">
          <img
            src={`${ART}/logo.webp`}
            alt="Potato Run — From farm to a brighter tomorrow"
            draggable={false}
            className="run-logo w-[64%] max-w-[260px] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.45)]"
          />
        </div>

        {/* Hero — higher up, clear of Play Now + phone gesture bar */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center pb-6 pt-0">
          <img src={`${ART}/star.webp`} alt="" draggable={false} className="run-float pointer-events-none absolute left-[6%] top-[8%] h-11 w-auto object-contain" style={{ animationDelay: "-0.6s" }} />
          <img src={`${ART}/potato.webp`} alt="" draggable={false} className="run-float pointer-events-none absolute right-[8%] top-[14%] h-11 w-auto object-contain" style={{ animationDelay: "-1.3s" }} />
          <img src={`${ART}/potato.webp`} alt="" draggable={false} className="run-float pointer-events-none absolute left-[12%] top-[42%] h-8 w-auto object-contain" style={{ animationDelay: "-0.2s" }} />
          <img
            src={`${ART}/hero.webp`}
            alt=""
            draggable={false}
            className="run-hero pointer-events-none -translate-y-4 h-[min(36dvh,320px)] w-auto object-contain drop-shadow-[0_18px_20px_rgba(0,0,0,0.5)]"
          />
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onPlay}
            className="flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#FFE066] to-[#F5B400] py-3.5 font-display text-[22px] font-extrabold text-[#3A2A00] shadow-[0_8px_0_#B8860B,0_16px_30px_rgba(0,0,0,0.4)] ring-2 ring-[#FFF3B0] active:translate-y-1 active:shadow-[0_4px_0_#B8860B]"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M7 5v14l11-7L7 5z" />
            </svg>
            Play Now
          </button>
          {best > 0 ? (
            <p className="mt-3.5 text-center text-[12px] font-extrabold text-white/90 drop-shadow">
              Your best: {best.toLocaleString("en-IN")} m
            </p>
          ) : null}

          {/* TODO: restore How to Play / Rewards / Leaderboard cards later
          <div className="mt-6 grid grid-cols-3 gap-2">
            {(
              [
                ["How to Play", onHowTo, <BookIcon key="book" />],
                ["Rewards", onRewards, <GiftIcon key="gift" />],
                ["Leaderboard", onLeaderboard, <BarsIcon key="bars" />],
              ] as [string, () => void, React.ReactNode][]
            ).map(([label, fn, icon]) => (
              <button key={label} type="button" onClick={fn} className="flex flex-col items-center gap-1 rounded-2xl bg-[#111A2F]/70 py-2.5 ring-1 ring-white/20 active:scale-95">
                {icon}
                <span className="text-[11px] font-extrabold">{label}</span>
              </button>
            ))}
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
