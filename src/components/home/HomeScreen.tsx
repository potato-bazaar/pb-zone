import Image from "next/image";
import Link from "next/link";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { ChampionBanner } from "@/components/home/ChampionBanner";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { GameCarousel, type FeaturedGame } from "@/components/home/GameCarousel";
import { ALL_GAMES } from "@/data/games";

/** Demo balance — replace with API / store later */
const USER_COINS = 120;

const featuredGames: FeaturedGame[] = ALL_GAMES.map((game) => ({
  id: game.id,
  title: game.title
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" "),
  description: game.shortDescription,
  image: game.image,
  cta: game.id === "quiz-time" ? "Play Quiz" : "Play Now",
  href: `/games/${game.id}`,
}));

export function HomeScreen() {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-screen-sm bg-[#F5F3FF]">
      <div
        className="px-4 pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))]"
        style={{ paddingTop: "var(--header-top)" }}
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/images/home/avatar.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
              unoptimized
            />
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-bold text-[#1a1a2e]">
                Hi, Potato Player!
              </p>
              <span className="mt-0.5 inline-flex rounded-full bg-[#DDD6FF] px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                PB Rookie
              </span>
            </div>
          </div>

          <CoinBadge amount={USER_COINS} />
        </header>

        <ChampionBanner />

        <section className="mb-5 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <Image
            src="/images/home/gift.png"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 object-contain"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[15px] font-bold text-[#1a1a2e]">
              Daily Bonus
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280]">
              Play any game to claim your daily bonus!
            </p>
          </div>
          <button
            type="button"
            className="relative shrink-0 rounded-full border border-[#D1D5DB] bg-white px-4 py-2 text-xs font-bold text-[#1a1a2e]"
          >
            Claim
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
        </section>

        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#1a1a2e]">
              Explore Games
            </h2>
            <Link href="/games" className="text-sm font-semibold text-[#9CA3AF]">
              See All
            </Link>
          </div>

          <GameCarousel games={featuredGames} />
        </section>
      </div>

      <AppBottomNav />
    </div>
  );
}
