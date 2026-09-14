"use client";

const ART = "/games/run";

type Props = {
  onGo: () => void;
  onClose: () => void;
};

const STEPS: { n: number; title: string; text: string; icon: React.ReactNode }[] = [
  { n: 1, title: "Run & Collect", text: "Collect as many potatoes as you can!", icon: <img src={`${ART}/potato.webp`} alt="" draggable={false} className="h-10 w-10 object-contain" /> },
  { n: 2, title: "Avoid Obstacles", text: "Jump crates, slide under gates, dodge tractors and puddles!", icon: <img src={`${ART}/crate.webp`} alt="" draggable={false} className="h-10 w-10 object-contain" /> },
  { n: 3, title: "Use Power-ups", text: "Grab Magnet, Shield and Speed Boost to run further and score higher!", icon: <img src={`${ART}/boost.webp`} alt="" draggable={false} className="h-10 w-10 object-contain" /> },
  {
    n: 4,
    title: "Reach Cold Storage",
    text: "Deliver the potatoes and make a brighter tomorrow!",
    icon: (
      <svg viewBox="0 0 24 24" className="h-9 w-9 text-[#8FE3FF] drop-shadow-[0_0_8px_rgba(143,227,255,0.9)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19M12 2l-2.5 2.5M12 2l2.5 2.5M12 22l-2.5-2.5M12 22l2.5-2.5M2 12l2.5-2.5M2 12l2.5 2.5M22 12l-2.5-2.5M22 12l-2.5 2.5" />
      </svg>
    ),
  },
];

/** How to Play sheet from the mockup: dark card with four numbered steps and a purple Let's Go button. */
export function RunHowTo({ onGo, onClose }: Props) {
  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#1a1f36] text-white">
      <img src={`${ART}/farm.jpg`} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover object-[50%_60%] blur-[3px]" />
      <div className="pointer-events-none absolute inset-0 bg-[#0B1020]/62" aria-hidden />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 [-webkit-overflow-scrolling:touch]" style={{ paddingTop: "var(--header-top)", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}>
        <div className="run-result mx-auto w-full max-w-[24rem] rounded-[1.6rem] bg-[#141A30]/92 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/12 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="w-9" />
            <h1 className="font-display text-[22px] font-extrabold uppercase tracking-wide">How to Play</h1>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <ol className="mt-4 space-y-2.5">
            {STEPS.map((s, i) => (
              <li key={s.n} className="run-step flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10" style={{ animationDelay: `${120 + i * 90}ms` }}>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0B1020]/60 ring-1 ring-white/10">{s.icon}</span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-display text-[18px] font-extrabold text-[#C58BFF]">{s.n}</span>
                    <span className="font-display text-[15px] font-extrabold">{s.title}</span>
                  </span>
                  <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-white/80">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>

          <ul className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px] font-extrabold text-white/85">
            <li className="rounded-xl bg-white/[0.06] px-1 py-1.5 ring-1 ring-white/10">
              <span className="block text-[13px]">◀ ▶</span>Swipe to change lane
            </li>
            <li className="rounded-xl bg-white/[0.06] px-1 py-1.5 ring-1 ring-white/10">
              <span className="block text-[13px]">▲</span>Swipe up / tap to jump
            </li>
            <li className="rounded-xl bg-white/[0.06] px-1 py-1.5 ring-1 ring-white/10">
              <span className="block text-[13px]">▼</span>Swipe down to slide
            </li>
          </ul>
        </div>

        <p className="mt-5 text-center font-script text-[20px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Ready to run?</p>
        <button type="button" onClick={onGo} className="mx-auto mt-3 flex w-full max-w-[22rem] items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#8B6CFF] to-[#5A3ED6] py-4 font-display text-[22px] font-extrabold text-white shadow-[0_8px_0_#3B2490,0_16px_30px_rgba(0,0,0,0.4)] ring-2 ring-[#C6B6FF]/60 active:translate-y-1 active:shadow-[0_4px_0_#3B2490]">
          Let&apos;s Go!
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
