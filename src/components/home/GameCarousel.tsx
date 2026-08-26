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
};

type GameCarouselProps = {
  games: FeaturedGame[];
};

export function GameCarousel({ games }: GameCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

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

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [games.length]);

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * getSlideStep(), behavior: "smooth" });
  };

  const activeRef = useRef(0);
  activeRef.current = active;

  useEffect(() => {
    if (games.length <= 1) return;

    const id = window.setInterval(() => {
      const next = (activeRef.current + 1) % games.length;
      const el = scrollerRef.current;
      if (!el) return;
      const first = el.firstElementChild as HTMLElement | null;
      const styles = getComputedStyle(el);
      const gap = parseFloat(styles.columnGap || styles.gap) || 0;
      const step = first ? first.offsetWidth + gap : el.clientWidth;
      el.scrollTo({ left: next * step, behavior: "smooth" });
      setActive(next);
    }, 2000);

    return () => window.clearInterval(id);
  }, [games.length]);

  return (
    <div>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {games.map((game) => (
          <article
            key={game.id}
            className="relative w-full min-w-full shrink-0 snap-start overflow-hidden rounded-3xl"
          >
            <div className="relative aspect-[16/10] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={game.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-4 sm:justify-center sm:p-5">
                <span className="mb-2 w-fit rounded-full bg-[#B8F27A] px-2.5 py-1 text-[10px] font-bold text-[#1a1a2e]">
                  {game.badge ?? "Featured Game"}
                </span>
                <h3 className="font-display text-2xl font-bold text-white">
                  {game.title}
                </h3>
                <p className="mt-1 max-w-[210px] text-[11px] leading-snug text-white/90">
                  {game.description}
                </p>
                <Link
                  href={game.href ?? "/games"}
                  className="mt-3 inline-flex w-fit items-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30"
                >
                  {game.cta ?? "Play Now"}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div
        className="mt-3 flex items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Featured games"
      >
        {games.map((game, i) => (
          <button
            key={game.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Show ${game.title}`}
            onClick={() => goTo(i)}
            className={
              i === active
                ? "h-2 w-2 rounded-full bg-primary"
                : "h-2 w-2 rounded-full bg-[#D1D5DB]"
            }
          />
        ))}
      </div>
    </div>
  );
}
