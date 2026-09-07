import Link from "next/link";

export function ChampionBanner() {
  return (
    <section className="relative mb-3 overflow-hidden rounded-[1.35rem] shadow-[0_8px_24px_rgba(27,20,100,0.3)]">
      {/* Deep blue wavy background like Figma */}
      <div className="absolute inset-0 bg-[#15206B]" aria-hidden />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 100% 0%, rgba(74, 95, 200, 0.55) 0%, transparent 55%),
            radial-gradient(ellipse 70% 90% at 90% 60%, rgba(58, 78, 180, 0.45) 0%, transparent 50%),
            radial-gradient(ellipse 60% 50% at 0% 100%, rgba(40, 55, 140, 0.7) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 20% 20%, rgba(90, 110, 210, 0.25) 0%, transparent 50%),
            linear-gradient(145deg, #121A5C 0%, #1A2778 42%, #2438A0 100%)
          `,
        }}
      />
      {/* soft flowing light bands */}
      <div
        className="pointer-events-none absolute -right-10 top-[-20%] h-[140%] w-[70%] rotate-[-18deg] rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(99,120,220,0.35)_0%,transparent_65%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-30%] left-[-10%] h-[80%] w-[60%] rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(50,70,160,0.4)_0%,transparent_70%)]"
        aria-hidden
      />

      {/* confetti accents on right */}
      <span className="pointer-events-none absolute right-[38%] top-4 h-1.5 w-2 rotate-45 bg-[#FF8A3D]" aria-hidden />
      <span className="pointer-events-none absolute right-[28%] top-8 h-1.5 w-1.5 rounded-sm bg-[#F5C518]" aria-hidden />
      <span className="pointer-events-none absolute bottom-10 right-[42%] h-1.5 w-2 rotate-12 bg-[#FF6BCB]" aria-hidden />
      <span className="pointer-events-none absolute right-8 top-[42%] h-1 w-2.5 rounded-sm bg-[#5EEAD4]" aria-hidden />

      <div className="relative z-10 flex min-h-[12.5rem] items-center gap-2 p-5 sm:min-h-[13.5rem] sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-white sm:text-sm">
            Become the
          </p>
          <h2 className="font-display text-[1.65rem] font-bold leading-[1.1] text-[#FBD85D] sm:text-[1.85rem]">
            PB Champion
          </h2>
          <p className="mt-1.5 max-w-[12rem] text-[11px] leading-snug text-white/90 sm:max-w-[13.5rem] sm:text-xs">
            Play games, collect points, climb ranks &amp; win rewards!
          </p>

          <Link
            href="/leaderboard"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#7B6CF0] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-black/25 transition active:scale-[0.97] sm:text-[13px]"
          >
            View Leaderboard
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>

        {/* Trophy — slightly bigger, left tilted */}
        <div className="relative -mr-1 flex h-[12rem] w-[9.5rem] shrink-0 items-center justify-center overflow-visible sm:h-[13rem] sm:w-[10.5rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/home/trophy-pb-clean.png"
            alt=""
            width={220}
            height={220}
            className="h-[110%] w-[110%] max-w-none -rotate-[12deg] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.4)]"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}
