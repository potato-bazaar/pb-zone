"use client";

import Image from "next/image";
import Link from "next/link";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { ALL_GAMES } from "@/data/games";

export function AllGamesScreen() {
  const { coins } = usePbCoins();

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-[#F7F5FC]">
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [-webkit-overflow-scrolling:touch]"
        style={{
          paddingTop: "var(--header-top)",
          paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header className="relative mb-5 flex min-h-10 items-center justify-center">
          <h1 className="font-display text-xl font-bold text-[#2940B3]">
            All Games
          </h1>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <CoinBadge amount={coins} />
          </div>
        </header>

        <ul className="flex flex-col gap-3.5 pb-2">
          {ALL_GAMES.map((game) => (
            <li key={game.id}>
              <article className="relative aspect-[2.2/1] w-full overflow-hidden rounded-[1.35rem] sm:aspect-[2.35/1] sm:rounded-[1.5rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={game.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-[68%_45%]"
                  draggable={false}
                />
                <div
                  className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-white/50 via-white/20 to-transparent"
                  aria-hidden
                />

                <div className="relative z-10 flex h-full flex-col justify-between p-3.5 sm:p-4">
                  <div className="max-w-[52%]">
                    <h2
                      className="font-display text-[1.05rem] font-extrabold tracking-wide sm:text-[1.2rem]"
                      style={{ color: game.titleColor }}
                    >
                      {game.title}
                    </h2>
                    <p className="mt-1 text-[11px] leading-snug text-[#374151] sm:text-[12px]">
                      {game.description}
                    </p>
                  </div>

                  <Link
                    href={`/games/${game.id}`}
                    className="inline-flex w-fit items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-bold text-white shadow-sm active:scale-[0.97] sm:px-4 sm:py-2 sm:text-sm"
                    style={{ backgroundColor: game.buttonBg }}
                  >
                    {game.cta}
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
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
              </article>
            </li>
          ))}
        </ul>
      </div>

      <AppBottomNav />
    </div>
  );
}
