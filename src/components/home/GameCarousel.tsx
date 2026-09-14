"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type FeaturedGame = {
  id: string;
  title: string;
  description: string;
  image: string;
  badge?: string;
  cta?: string;
  href?: string;
  tags?: string[];
};

type GameCarouselProps = {
  games: FeaturedGame[];
};

export function GameCarousel({ games }: GameCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  const getSlideStep = () => {
    const el = scrollerRef.current;
    if (!el) return 0;
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return el.clientWidth;
    const styles = getComputedStyle(el);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    return first.offsetWidth + gap;
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const step = getSlideStep();
      if (step <= 0) return;
      const index = Math.round(el.scrollLeft / step);
      setActive(Math.max(0, Math.min(games.length - 1, index)));
    };
    const pause = () => {
      pausedRef.current = true;
    };
    const resume = () => {
      pausedRef.current = false;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", pause);
    el.addEventListener("pointerup", resume);
    el.addEventListener("pointercancel", resume);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("pointerup", resume);
      el.removeEventListener("pointercancel", resume);
    };
  }, [games.length]);

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * getSlideStep(), behavior: "smooth" });
  };

  const activeRef = useRef(0);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (games.length <= 1) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      const next = (activeRef.current + 1) % games.length;
      goTo(next);
    }, 3500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length]);

  return (
    <div>
      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 pt-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {games.map((game, i) => (
          <article
            key={game.id}
            className={`home-feature relative w-[86%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] transition-transform duration-500 ${
              i === active ? "scale-100" : "scale-[0.96]"
            }`}
          >
            <div className="relative aspect-[16/11] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.image} alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_50%]" draggable={false} />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0d0733]/80 via-[#0d0733]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0733]/60 via-transparent to-transparent" />

              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#FFF3C4] px-2.5 py-1 text-[10px] font-extrabold text-[#5A3200] ring-1 ring-[#FFD766]">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                    <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8L12 2.6z" />
                  </svg>
                  {game.badge ?? "Featured Game"}
                </span>
                <h3 className="font-display text-[26px] font-extrabold leading-none text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]">{game.title}</h3>
                <p className="mt-1.5 max-w-[210px] text-[12px] font-semibold leading-snug text-white/90">{game.description}</p>
                {game.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {game.tags.map((t) => (
                      <span key={t} className="home-tag rounded-full px-2.5 py-1 text-[10px] font-bold text-white">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                <Link
                  href={game.href ?? "/games"}
                  className="home-cta mt-3 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 font-display text-[14px] font-extrabold text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M7 5v14l11-7L7 5z" />
                  </svg>
                  {game.cta ?? "Play Now"}
                </Link>
              </div>

              {i === 0 ? (
                <span className="home-sticker absolute bottom-4 right-3 rounded-2xl px-3 py-1.5 text-center font-display text-[11px] font-extrabold leading-tight text-[#5A3200]">
                  Earn PB
                  <br />
                  while you play!
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Featured games">
        {games.map((game, i) => (
          <button
            key={game.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Show ${game.title}`}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-[#6A5AE0]" : "w-2 bg-[#D4C8FF]"}`}
          />
        ))}
      </div>
    </div>
  );
}
