"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { ALL_GAMES, GAME_CATEGORIES, type GameCategory, type GameItem, type GameTagIcon } from "@/data/games";
import { GAME_DAILY_POINT_CAPS, type PbGameId } from "@/data/pbEconomy";
import { fetchQuizPoints } from "@/lib/quizApi";

/* ------------------------------------------------------------------ */
/*  Small icons                                                        */
/* ------------------------------------------------------------------ */

function TagIcon({ icon, className = "h-3.5 w-3.5" }: { icon: GameTagIcon; className?: string }) {
  switch (icon) {
    case "coin":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#F5C518" stroke="#C4920A" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="6.5" fill="none" stroke="#FFF3A8" strokeWidth="1.2" />
          <path d="M12 7.5v9M9.6 10.2c0-1 1-1.6 2.4-1.6s2.4.6 2.4 1.5c0 2.2-4.8 1.3-4.8 3.6 0 1 1 1.6 2.4 1.6s2.4-.6 2.4-1.5" fill="none" stroke="#9A6B00" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "fire":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M12 2.5c1 3.2 4.5 4.6 4.5 9.2A4.5 4.5 0 0 1 12 16.2a4.5 4.5 0 0 1-4.5-4.5c0-1.4.5-2.4 1.2-3.3.3 1.1 1 1.8 1.9 1.8.2-3.4 1.3-5.3 1.4-7.7z" fill="#FF7A1A" />
          <path d="M12 9c.6 1.8 2.3 2.5 2.3 5a2.3 2.3 0 1 1-4.6 0c0-.8.3-1.4.7-1.9.2.6.6 1 1.1 1 .1-1.8.4-2.9.5-4.1z" fill="#FFD23F" />
        </svg>
      );
    case "star":
    case "new":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="#FFC107" stroke="#B8860B" strokeWidth="1.2" strokeLinejoin="round" aria-hidden>
          <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8L12 2.6z" />
        </svg>
      );
    case "match":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="3" y="3" width="8" height="8" rx="2" fill="#8E44E3" />
          <rect x="13" y="3" width="8" height="8" rx="2" fill="#FF6B9C" />
          <rect x="3" y="13" width="8" height="8" rx="2" fill="#4CCB68" />
          <rect x="13" y="13" width="8" height="8" rx="2" fill="#FFC107" />
        </svg>
      );
    case "quiz":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#6A5AE0" />
          <path d="M9.2 9.3a2.8 2.8 0 1 1 4 2.5c-.8.4-1.2.9-1.2 1.8v.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1.1" fill="#fff" />
        </svg>
      );
    case "questions":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="3" y="12" width="4" height="9" rx="1" fill="#6A5AE0" />
          <rect x="10" y="6" width="4" height="15" rx="1" fill="#8E44E3" />
          <rect x="17" y="9" width="4" height="12" rx="1" fill="#B48CFF" />
        </svg>
      );
    case "word":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="3" y="7" width="8" height="10" rx="2" fill="#F5DEB3" stroke="#A8743A" strokeWidth="1.2" />
          <rect x="13" y="7" width="8" height="10" rx="2" fill="#F5DEB3" stroke="#A8743A" strokeWidth="1.2" />
          <path d="M6 14l1-4 1 4M15 10h3v4h-3" fill="none" stroke="#5A3A12" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "identify":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#C44D2A" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
        </svg>
      );
    case "learn":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#7A3A12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 5.5A2 2 0 0 1 5 4h5a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5.5A2 2 0 0 0 19 4h-5a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" />
        </svg>
      );
    case "puzzle":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M9 3a2 2 0 0 1 2 2v1h2V5a2 2 0 1 1 4 0v1h2a1 1 0 0 1 1 1v3h-1a2 2 0 1 0 0 4h1v3a1 1 0 0 1-1 1h-3v-1a2 2 0 1 0-4 0v1H9a1 1 0 0 1-1-1v-3H7a2 2 0 1 1 0-4h1V7a1 1 0 0 1 1-1z" fill="#3B82E6" />
        </svg>
      );
    case "timer":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#C44D2A" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="13" r="7.5" />
          <path d="M12 9.5V13l2.5 1.5M9.5 3h5" />
        </svg>
      );
    case "sword":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#7A1E0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 20l10-10M14 10l5-5 1 4-4 3M4 20l3-1 1-3M7 19l-2-2" />
        </svg>
      );
    case "belt":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="12" width="20" height="6" rx="3" fill="#5B6472" />
          <circle cx="6" cy="15" r="1.6" fill="#D5DAE3" />
          <circle cx="12" cy="15" r="1.6" fill="#D5DAE3" />
          <circle cx="18" cy="15" r="1.6" fill="#D5DAE3" />
          <ellipse cx="9" cy="9" rx="3.2" ry="2.4" fill="#E0B25A" />
          <ellipse cx="16" cy="9" rx="2.6" ry="2" fill="#C8A04A" />
        </svg>
      );
  }
}

function CrownIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#FFB300" stroke="#8A5A00" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="#8A5A00" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CoinIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" fill="#F5C518" stroke="#C4920A" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="#FFF3A8" strokeWidth="1.1" />
      <path d="M12 7.5v9M9.6 10.2c0-1 1-1.6 2.4-1.6s2.4.6 2.4 1.5c0 2.2-4.8 1.3-4.8 3.6 0 1 1 1.6 2.4 1.6s2.4-.6 2.4-1.5" fill="none" stroke="#9A6B00" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

function GameCard({ game, earnedToday, index }: { game: GameItem; earnedToday: number; index: number }) {
  const [w1, ...rest] = game.title.split(" ");
  const w2 = rest.join(" ");
  const { theme } = game;
  const cap = GAME_DAILY_POINT_CAPS[(game.pbGameId ?? game.id) as PbGameId] ?? 200;
  const pbLabel = earnedToday > 0 ? `${earnedToday}/${cap} PB today` : `Earn up to ${cap} PB`;

  return (
    <article
      className={`game-card relative w-full overflow-hidden rounded-[1.4rem] bg-white shadow-[0_10px_26px_rgba(43,31,122,0.16)] ring-1 ring-white/80 ${game.featured ? "aspect-[1.9/1]" : "aspect-[2.1/1]"}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={game.image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: game.imagePosition ?? "76% 50%" }} draggable={false} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${theme.wash} 0%, ${theme.wash} 30%, rgba(255,255,255,0) 64%)` }} aria-hidden />
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.30) 36%, rgba(255,255,255,0) 60%)" }} aria-hidden />
      {game.featured ? <div className="game-card-shine pointer-events-none absolute inset-0" aria-hidden /> : null}

      <div className="relative z-10 flex h-full flex-col justify-between p-3.5">
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
          <p className="mt-1.5 max-w-[54%] text-[11.5px] font-bold leading-snug text-[#2D2A4A]">{game.description}</p>
        </div>

        <div className="max-w-[62%]">
          <ul className="flex flex-wrap gap-1.5">
            {game.tags.map((tag) => {
              const isPb = tag.icon === "coin";
              return (
                <li key={tag.label} className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10.5px] font-extrabold shadow-[0_2px_6px_rgba(0,0,0,0.12)] backdrop-blur-[3px] ${isPb && earnedToday > 0 ? "bg-[#FFF3C4] text-[#7A4A00]" : "bg-white/85 text-[#2D2A4A]"}`}>
                  <TagIcon icon={tag.icon} />
                  {isPb ? pbLabel : tag.label}
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <Link
              href={`/games/${game.id}`}
              className="inline-flex items-center gap-2 rounded-full py-2 pl-3.5 pr-5 font-display text-[15px] font-extrabold text-white active:translate-y-[2px] active:shadow-none"
              style={{ background: `linear-gradient(180deg, ${theme.button[0]} 0%, ${theme.button[1]} 100%)`, boxShadow: `0 4px 0 ${theme.shade}, 0 10px 18px rgba(0,0,0,0.25)` }}
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
  const { state: pb } = usePbPoints();
  const { coins, setCoins } = usePbCoins();
  const session = useUserSession();
  const [filter, setFilter] = useState<"all" | GameCategory>("all");

  useEffect(() => {
    let cancelled = false;

    void fetchQuizPoints({
      token: session.token,
      userId: session.userId,
      userName: session.userName,
    })
      .then((data) => {
        if (cancelled) return;
        if (typeof data.points === "number") setCoins(data.points);
      })
      .catch((error) => {
        console.warn("[quiz] me/points failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [session.token, session.userId, session.userName, setCoins]);

  const games = filter === "all" ? ALL_GAMES : ALL_GAMES.filter((g) => g.category === filter);
  const coinsDisplay = Number.isFinite(coins) ? Math.max(0, Math.floor(coins)).toLocaleString("en-IN") : "0";

  return (
    <div className="games-bg relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [-webkit-overflow-scrolling:touch]"
        style={{
          paddingTop: "var(--header-top)",
          paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header className="relative mb-4 flex min-h-12 items-center justify-between gap-2">
          <Link href="/home" aria-label="Back to home" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#3D2FB8] shadow-[0_4px_14px_rgba(43,31,122,0.14)] ring-1 ring-[#ECE8FA]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <h1 className="font-display text-[22px] font-extrabold leading-none text-[#2D2A8A]">All Games</h1>
            <p className="mt-1 text-[11px] font-bold text-[#7C6BD6]">Play. Learn. Earn. Grow.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-white py-1 pl-1.5 pr-1 shadow-[0_4px_14px_rgba(43,31,122,0.14)] ring-1 ring-[#ECE8FA]" role="status" aria-label={`${coinsDisplay} coins`}>
            <CoinIcon className="h-6 w-6" />
            <span className="px-1 font-display text-[15px] font-extrabold tabular-nums text-[#2D2A8A]">{coinsDisplay}</span>
            <Link href="/rewards" aria-label="Earn more coins" className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-[#8B6CFF] to-[#5A3ED6] text-white shadow-[0_2px_6px_rgba(90,62,214,0.4)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          </div>
        </header>

        <div className="no-scrollbar -mx-4 mb-3.5 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Game categories">
          {GAME_CATEGORIES.map((cat) => {
            const active = filter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(cat.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[12.5px] font-extrabold transition ${active ? "bg-gradient-to-b from-[#8B6CFF] to-[#5A3ED6] text-white shadow-[0_4px_12px_rgba(90,62,214,0.35)]" : "bg-white text-[#5B4FB0] ring-1 ring-[#ECE8FA]"}`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <ul className="flex flex-col gap-3.5 pb-2">
          {games.map((game, i) => (
            <li key={game.id}>
              <GameCard game={game} earnedToday={pb.gameDailyPoints[(game.pbGameId ?? game.id) as PbGameId] ?? 0} index={i} />
            </li>
          ))}
        </ul>
      </div>

      <AppBottomNav />
    </div>
  );
}
