import Image from "next/image";
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

      <div className="relative z-10 flex min-h-[11rem] items-center gap-2 p-4 pr-2 min-[361px]:min-h-[13.5rem] min-[361px]:p-5 min-[361px]:pr-2 [@media(max-height:520px)]:min-h-0 [@media(max-height:520px)]:p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/85 min-[361px]:tracking-[0.18em]">Play more. Earn more.</p>
          <h2 className="mt-1 font-display text-[1.35rem] font-extrabold leading-[1.05] text-white min-[361px]:text-[24px] [@media(max-height:520px)]:text-[1.15rem]">
            Become the
            <br />
            <span className="home-banner-title text-[1.65rem] min-[361px]:text-[30px] [@media(max-height:520px)]:text-[1.35rem]">PB Champion</span>
          </h2>
          <p className="mt-2 max-w-[16rem] text-[13px] leading-snug text-white/90 min-[361px]:max-w-[12.5rem] min-[361px]:text-[11.5px] [@media(max-height:520px)]:mt-1">
            Play games, collect points, climb ranks &amp; win amazing rewards!
          </p>

          <Link
            href="/pb"
            className="home-cta mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 font-display text-[13px] font-extrabold text-white max-[360px]:mt-3 max-[360px]:min-h-11 max-[360px]:whitespace-nowrap max-[360px]:px-3 max-[360px]:text-[12.5px] max-md:min-h-11 md:min-h-0 [@media(max-height:520px)]:mt-2 [@media(max-height:520px)]:min-h-10"
          >
            View Leaderboard
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>

        <div className="relative flex h-[8.5rem] w-[6.25rem] shrink-0 items-end justify-center min-[361px]:h-[12.5rem] min-[361px]:w-[10.5rem] [@media(max-height:520px)]:h-[6.5rem] [@media(max-height:520px)]:w-[5.25rem]">
          <Image
            src="/games/champion-potato.png"
            alt=""
            fill
            sizes="(max-width: 360px) 100px, 168px"
            className="home-champ object-contain object-bottom"
          />
        </div>
      </div>
    </section>
  );
}
