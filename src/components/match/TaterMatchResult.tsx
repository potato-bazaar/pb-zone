"use client";

type Props = {
  modeTitle: string;
  correct: number;
  total: number;
  pointsEarned: number;
  coinsEarned: number;
  seconds: number;
  streak: number;
  learned: string[];
  onAgain: () => void;
  onHome: () => void;
};

export function TaterMatchResult({
  modeTitle,
  correct,
  total,
  pointsEarned,
  coinsEarned,
  seconds,
  streak,
  learned,
  onAgain,
  onHome,
}: Props) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const title =
    accuracy >= 90 ? "Potato Expert" : accuracy >= 70 ? "Sharp Matcher" : accuracy >= 50 ? "Growing Farmer" : "Keep Practising";

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(76,203,104,0.25), transparent 60%), linear-gradient(180deg, #E8F6E4 0%, #F4F7FC 50%, #FFFFFF 100%)",
        }}
        aria-hidden
      />

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col px-4"
        style={{
          paddingTop: "max(3.5rem, calc(var(--header-top) + 0.25rem))",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <p className="text-center text-[12px] font-extrabold uppercase tracking-wider text-[#1F8A47]">
          Round Complete
        </p>
        <h1 className="mt-1 text-center font-display text-[28px] font-extrabold text-[#145C32]">
          🎉 {title}
        </h1>
        <p className="mt-1 text-center text-[13px] font-bold text-[#3D6B4A]">{modeTitle}</p>

        <div className="mt-5 rounded-[1.4rem] bg-white p-4 shadow-[0_12px_28px_rgba(20,92,50,0.12)] ring-1 ring-[#D7EED0]">
          <p className="text-center font-display text-[34px] font-extrabold tabular-nums text-[#1E3A8A]">
            {correct} / {total}
          </p>
          <p className="text-center text-[12px] font-bold text-[#6B7C9C]">Correct matches</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Time" value={`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`} />
            <Stat label="PB Points" value={`+${pointsEarned}`} accent="#2B6DEF" />
            <Stat label="PB Coins" value={`+${coinsEarned}`} accent="#C4920A" />
          </div>

          <p className="mt-3 text-center text-[13px] font-extrabold text-[#C45C12]">
            🔥 {streak} Day Streak
          </p>
        </div>

        {learned.length > 0 ? (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[1.2rem] bg-white px-3 py-3 ring-1 ring-[#E8EEF8]">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#5B7AB0]">
              What you learned
            </p>
            <ul className="mt-2 space-y-2">
              {learned.slice(0, 4).map((tip) => (
                <li
                  key={tip}
                  className="rounded-xl bg-[#F5F8FF] px-3 py-2 text-[12px] font-semibold leading-snug text-[#2A4570]"
                >
                  🌱 {tip.split("·")[0]?.trim() || tip.slice(0, 60)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onAgain}
            className="flex w-full items-center justify-center rounded-full bg-gradient-to-b from-[#4C8DFF] to-[#2B6DEF] py-3.5 font-display text-[15px] font-extrabold text-white shadow-[0_4px_0_#1E4BB8]"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onHome}
            className="w-full rounded-full bg-white py-3 text-[13px] font-extrabold text-[#1E3A8A] ring-1 ring-[#E8EEF8]"
          >
            Tater Home
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-[#F5F8FF] px-3 py-2.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7B8BB0]">{label}</p>
      <p
        className="mt-0.5 font-display text-[18px] font-extrabold tabular-nums"
        style={{ color: accent ?? "#1E3A8A" }}
      >
        {value}
      </p>
    </div>
  );
}
