import Link from "next/link";

const CONFETTI = ["#FF8A3D", "#F5C518", "#FF6BCB", "#5EEAD4", "#B39DFF", "#4ADE80"];

export function ChampionBanner() {
  return (
    <section className="home-banner relative mb-3 overflow-hidden rounded-[1.5rem]">
      <div className="home-banner-shine" aria-hidden />

      {/* Confetti + sparkles */}
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="home-banner-confetti pointer-events-none"
          style={{
            backgroundColor: c,
            left: `${48 + ((i * 9) % 45)}%`,
            top: `${12 + ((i * 23) % 70)}%`,
            animationDelay: `${-i * 0.7}s`,
            transform: `rotate(${i * 37}deg)`,
          }}
          aria-hidden
        />
      ))}
      {[
        [52, 14, 0],
        [88, 26, 0.6],
        [70, 82, 1.2],
        [94, 68, 1.8],
      ].map(([x, y, d], i) => (
        <span key={i} className="home-banner-sparkle pointer-events-none text-[14px]" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} aria-hidden>
          ✦
        </span>
      ))}

      <div className="relative z-10 flex min-h-[13.5rem] items-center gap-2 p-5 pr-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/85">Play more. Earn more.</p>
          <h2 className="mt-1 font-display text-[24px] font-extrabold leading-[1.05] text-white">
            Become the
            <br />
            <span className="home-banner-title text-[30px]">PB Champion</span>
          </h2>
          <p className="mt-2 max-w-[12.5rem] text-[11.5px] leading-snug text-white/90">
            Play games, collect points, climb ranks &amp; win amazing rewards!
          </p>

          <Link
            href="/pb"
            className="home-cta mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 font-display text-[13px] font-extrabold text-white"
          >
            View Leaderboard
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>

        <div className="relative flex h-[12.5rem] w-[10.5rem] shrink-0 items-end justify-center overflow-visible">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/games/champion-potato.png"
            alt=""
            className="home-champ h-[104%] w-auto max-w-none object-contain object-bottom"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}
