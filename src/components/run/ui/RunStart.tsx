"use client";

const ART = "/games/run";

type Props = {
  best: number;
  seasonPoints: number;
  onPlay: () => void;
  onHowTo: () => void;
  onRewards: () => void;
  onLeaderboard: () => void;
  onBack: () => void;
};

/** Start screen from the mockup: farm road backdrop, wooden logo, running hero, big yellow Play Now, then How to Play / Rewards / Leaderboard. */
export function RunStart({ best, seasonPoints, onPlay, onHowTo, onRewards, onLeaderboard, onBack }: Props) {
  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#8fd0ff] text-white">
      <img src={`${ART}/farm.jpg`} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_70%]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B1020]/25 via-transparent to-[#0B1020]/80" aria-hidden />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4" style={{ paddingTop: "var(--header-top)" }}>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label="Back to games" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111A2F]/75 ring-1 ring-white/25">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="font-display text-[15px] font-extrabold tracking-wide drop-shadow">
            PB <span className="font-semibold text-white/85">ZONE</span>
          </span>
          <div className="flex items-center gap-1.5 rounded-full bg-[#111A2F]/80 px-3 py-1.5 ring-1 ring-white/20">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFD23F" stroke="#B8860B" strokeWidth="1.2" strokeLinejoin="round" aria-hidden>
              <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8L12 2.6z" />
            </svg>
            <span className="font-display text-[15px] font-extrabold tabular-nums">{seasonPoints.toLocaleString("en-IN")} PB</span>
          </div>
        </div>

        <div className="relative mt-2 flex justify-center">
          <span className="pointer-events-none absolute left-0 top-6 -rotate-6 font-script text-[14px] leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
            Run
            <br />
            Collect
            <br />
            Deliver
            <br />
            Score! ♥
          </span>
          <img src={`${ART}/logo.webp`} alt="Potato Run — From farm to a brighter tomorrow" draggable={false} className="run-logo w-[68%] max-w-[280px] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.45)]" />
          <span className="pointer-events-none absolute right-0 top-6 rotate-6 text-right font-script text-[14px] leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
            Good
            <br />
            Potatoes
            <br />
            Brighter
            <br />
            Tomorrows! ♥
          </span>
        </div>

        <div className="relative flex min-h-0 flex-1 items-end justify-center">
          <img src={`${ART}/star.webp`} alt="" draggable={false} className="run-float pointer-events-none absolute left-[8%] bottom-[38%] h-12 w-auto object-contain" style={{ animationDelay: "-0.6s" }} />
          <img src={`${ART}/potato.webp`} alt="" draggable={false} className="run-float pointer-events-none absolute right-[10%] bottom-[30%] h-12 w-auto object-contain" style={{ animationDelay: "-1.3s" }} />
          <img src={`${ART}/potato.webp`} alt="" draggable={false} className="run-float pointer-events-none absolute left-[18%] bottom-[8%] h-9 w-auto object-contain" style={{ animationDelay: "-0.2s" }} />
          <img src={`${ART}/hero.webp`} alt="" draggable={false} className="run-hero pointer-events-none h-[min(44dvh,400px)] w-auto object-contain drop-shadow-[0_18px_20px_rgba(0,0,0,0.5)]" />
        </div>

        <div className="pt-2" style={{ paddingBottom: "max(0.9rem, env(safe-area-inset-bottom, 0px))" }}>
          <button type="button" onClick={onPlay} className="flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#FFE066] to-[#F5B400] py-4 font-display text-[24px] font-extrabold text-[#3A2A00] shadow-[0_8px_0_#B8860B,0_16px_30px_rgba(0,0,0,0.4)] ring-2 ring-[#FFF3B0] active:translate-y-1 active:shadow-[0_4px_0_#B8860B]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M7 5v14l11-7L7 5z" />
            </svg>
            Play Now
          </button>
          {best > 0 ? <p className="mt-2 text-center text-[12px] font-extrabold text-white/90 drop-shadow">Your best: {best.toLocaleString("en-IN")} m</p> : null}
          <div className="mt-3 grid grid-cols-3 gap-2">
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
        </div>
      </div>
    </div>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5.5A2 2 0 0 1 5 4h5a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5.5A2 2 0 0 0 19 4h-5a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" />
    </svg>
  );
}
function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="16" y="3" width="4" height="17" rx="1" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z" />
    </svg>
  );
}
