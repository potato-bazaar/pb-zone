"use client";

const STEPS = [
  {
    title: "Pick a mode",
    body: "Variety, Disease, or Growth — each teaches a different potato skill.",
  },
  {
    title: "Tap to match",
    body: "Read the prompt, tap the matching image card, then Check Answer.",
  },
  {
    title: "Learn on every try",
    body: "Correct or wrong, you get a potato tip so the next match is easier.",
  },
  {
    title: "Earn PB",
    body: "+5 Points and +3 Coins per correct match. Perfect rounds get a bonus.",
  },
  {
    title: "Daily challenge",
    body: "Come back each day for a streak and extra coins.",
  },
] as const;

type Props = {
  onBack: () => void;
  onPlay: () => void;
};

export function TaterMatchHowTo({ onBack, onPlay }: Props) {
  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-white">
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F8FF] text-[#1E3A8A] ring-1 ring-[#E8EEF8]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="font-display text-[20px] font-extrabold text-[#1E3A8A]">How to Play</h1>
            <p className="text-[12px] font-bold text-[#5B7AB0]">Tater Match basics</p>
          </div>
        </header>

        <ul className="mt-5 space-y-3 overflow-y-auto pb-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-[1.1rem] bg-[#F5F8FF] p-3.5 ring-1 ring-[#E8EEF8]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2B6DEF] text-[14px] font-extrabold text-white">
                {i + 1}
              </span>
              <div>
                <p className="text-[14px] font-extrabold text-[#1E3A8A]">{step.title}</p>
                <p className="mt-1 text-[12px] font-semibold leading-snug text-[#5B6B88]">{step.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onPlay}
          className="mt-auto flex w-full items-center justify-center rounded-full bg-gradient-to-b from-[#4C8DFF] to-[#2B6DEF] py-3.5 font-display text-[15px] font-extrabold text-white shadow-[0_4px_0_#1E4BB8]"
        >
          Start Matching
        </button>
      </div>
    </div>
  );
}
