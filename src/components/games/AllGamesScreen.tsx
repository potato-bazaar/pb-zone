"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { ALL_GAMES, GAME_CATEGORIES, type GameCategory, type GameItem } from "@/data/games";

function CrownIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#FFB300" stroke="#8A5A00" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="#8A5A00" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

function GameCard({ game, index }: { game: GameItem; index: number }) {
  const [w1, ...rest] = game.title.split(" ");
  const w2 = rest.join(" ");
  const { theme } = game;

  return (
    <article
      className={`game-card relative w-full overflow-hidden rounded-[1.4rem] bg-white shadow-[0_10px_26px_rgba(43,31,122,0.16)] ring-1 ring-white/80 ${game.featured ? "aspect-[4/3] md:aspect-[1.62/1]" : "aspect-[5/4] md:aspect-[1.7/1]"}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Image
        src={game.image}
        alt=""
        fill
        sizes="(max-width: 768px) calc(100vw - 2rem), 608px"
        priority={index === 0}
        className="object-cover object-[82%_center] md:object-[var(--card-focus)]"
        style={{ ["--card-focus" as string]: game.imagePosition ?? "76% 50%" }}
      />
      <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${theme.wash} 0%, ${theme.wash} 30%, rgba(255,255,255,0) 64%)` }} aria-hidden />
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.30) 36%, rgba(255,255,255,0) 60%)" }} aria-hidden />
      {game.featured ? <div className="game-card-shine pointer-events-none absolute inset-0" aria-hidden /> : null}

      <div className="relative z-10 flex h-full flex-col justify-between p-3.5 pb-4">
        <div>
          {game.featured ? (
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#FFD84D] px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-wider text-[#6B3A00] shadow-[0_2px_6px_rgba(0,0,0,0.2)] ring-1 ring-white/70">
              <CrownIcon className="h-3 w-3" />
              Featured
            </span>
          ) : null}
          <h2 className="game-title-3d font-display text-[23px] font-extrabold uppercase leading-[0.95] tracking-wide" style={{ ["--shade" as string]: theme.shade }}>
            <span style={{ color: theme.title[0] }}>{w1}</span> <span style={{ color: theme.title[1] }}>{w2}</span>
          </h2>
        </div>

        <div className="max-w-[62%]">
          <div className="flex shrink-0 items-center gap-2 pb-1">
            <Link
              href={`/games/${game.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-4 font-display text-[14px] font-extrabold text-white active:translate-y-[2px] active:shadow-none max-md:min-h-11"
              style={{ background: `linear-gradient(180deg, ${theme.button[0]} 0%, ${theme.button[1]} 100%)`, boxShadow: `0 3px 0 ${theme.shade}` }}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 ring-1 ring-white/40">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-3 w-3" fill="currentColor" aria-hidden>
                  <path d="M7 5v14l11-7L7 5z" />
                </svg>
              </span>
              {game.playable ? "Play Now" : "Preview"}
            </Link>
            {!game.playable ? (
              <span className="rounded-full bg-[#111A2F]/70 px-2 py-[3px] text-[9px] font-extrabold uppercase tracking-wider text-white ring-1 ring-white/30 backdrop-blur-[2px]">Soon</span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export function AllGamesScreen() {
  const { coins } = usePbCoins();
  const [filter, setFilter] = useState<"all" | GameCategory>("all");

  const games = filter === "all" ? ALL_GAMES : ALL_GAMES.filter((g) => g.category === filter);
  const coinsDisplay = Number.isFinite(coins) ? Math.max(0, Math.floor(coins)).toLocaleString("en-IN") : "0";

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      {/* One continuous bg for header + list — no extra wash layers (those caused the cut line) */}
      <div className="games-bg pointer-events-none absolute inset-0" aria-hidden />

      <div
        className="relative z-40 shrink-0 px-4"
        style={{ paddingTop: "var(--header-top)" }}
      >
        <header className="flex min-h-11 items-center justify-between gap-3">
          <div className="min-w-0 text-left">
            <h1 className="font-display text-[22px] font-extrabold leading-none text-[#2D2A8A]">
              All Games
            </h1>
            <p className="mt-1 text-[11px] font-bold text-[#7C6BD6]">
              Play. Learn. Earn. Grow.
            </p>
          </div>
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white py-1 pl-1.5 pr-3 shadow-[0_4px_14px_rgba(43,31,122,0.14)] ring-1 ring-[#ECE8FA]"
            role="status"
            aria-label={`${coinsDisplay} coins`}
          >
            <Image src="/images/home/coin.png" alt="" width={48} height={48} sizes="24px" className="h-6 w-6 shrink-0 object-contain" />
            <span className="font-display text-[15px] font-extrabold tabular-nums text-[#2D2A8A]">
              {coinsDisplay}
            </span>
          </div>
        </header>

        <div
          className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3"
          role="tablist"
          aria-label="Game categories"
        >
          {GAME_CATEGORIES.map((cat) => {
            const active = filter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(cat.id)}
                className={`inline-flex shrink-0 items-center rounded-full px-4 py-1.5 text-[12.5px] font-extrabold transition max-md:min-h-11 ${
                  active
                    ? "bg-gradient-to-b from-[#8B6CFF] to-[#5A3ED6] text-white"
                    : "bg-white text-[#5B4FB0] ring-1 ring-[#ECE8FA]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [-webkit-overflow-scrolling:touch]"
        style={{
          paddingBottom: "var(--shell-pad)",
        }}
      >
        <ul className="flex flex-col gap-3.5 pb-2">
          {games.map((game, i) => (
            <li key={game.id}>
              <GameCard game={game} index={i} />
            </li>
          ))}
        </ul>
      </div>

      <AppBottomNav />
    </div>
  );
}
