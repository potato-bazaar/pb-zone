"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { ChampionBanner } from "@/components/home/ChampionBanner";
import { GameCarousel, type FeaturedGame } from "@/components/home/GameCarousel";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { MilestoneProgressBar, PbStarIcon } from "@/components/pb/PbUi";
import { ALL_GAMES } from "@/data/games";
import { pbTitleFor } from "@/data/pbEconomy";
import { fetchLeaderboardPoints, rankStoredPlayers } from "@/lib/leaderboardApi";
import { sounds, haptic } from "@/components/crush/render/sound";

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
  badge: game.id === "potato-crush" ? "Featured Game" : game.id === "quiz-time" ? "Popular" : "New",
  tags:
    game.id === "potato-crush"
      ? ["Match-3", "Fun", "Rewards"]
      : game.id === "quiz-time"
        ? ["Trivia", "Learn", "Earn PB"]
        : ["Puzzle", "Fun"],
}));

/* ------------------------------------------------------------------ */
/*  Daily bonus                                                        */
/* ------------------------------------------------------------------ */

const DAILY_KEY = "pbZoneDailyBonus.v1";
const DAY_REWARDS = [10, 15, 20, 25, 30, 40, 100];

type DailyState = { lastClaim: string | null; streak: number };

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return { lastClaim: null, streak: 0 };
    const parsed = JSON.parse(raw) as DailyState;
    // A missed day resets the streak.
    if (parsed.lastClaim && parsed.lastClaim !== todayKey() && parsed.lastClaim !== yesterdayKey()) {
      return { lastClaim: null, streak: 0 };
    }
    return parsed;
  } catch {
    return { lastClaim: null, streak: 0 };
  }
}

function Coin({ className = "h-6 w-6" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/images/home/coin.png" alt="" className={`${className} object-contain`} draggable={false} />
  );
}

export function HomeScreen() {
  const { userName, userId, token } = useUserSession();
  const { coins, addCoins } = usePbCoins();
  const { state: pb, seasonRank } = usePbPoints();
  const [liveBoard, setLiveBoard] = useState<{ points: number; rank: number } | null>(null);
  const pbTitle = useMemo(() => pbTitleFor(pb.lifetimePoints), [pb.lifetimePoints]);

  const [daily, setDaily] = useState<DailyState>({ lastClaim: null, streak: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [flying, setFlying] = useState<{ id: number; sx: number; sy: number; dx: number; dy: number; x: number; y: number }[]>([]);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [coinPop, setCoinPop] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDaily(loadDaily());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboardPoints({ token, userId, userName }, { limit: 200 })
      .then((players) => {
        if (cancelled) return;
        const ranked = rankStoredPlayers(Array.isArray(players) ? players : [], {
          userId: userId || "",
          name: userName || "You",
        }, { mode: "season" });
        const me = ranked.find((row) => row.isYou);
        if (me) setLiveBoard({ points: me.points, rank: me.rank });
      })
      .catch(() => {
        if (!cancelled) setLiveBoard(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, userId, userName]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const claimedToday = daily.lastClaim === todayKey();
  const todayIndex = claimedToday ? (daily.streak - 1) % 7 : daily.streak % 7; // 0-based day being shown as "today"
  const todayReward = DAY_REWARDS[todayIndex];

  const claimDaily = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (claimedToday || !hydrated) return;
      sounds.unlock();
      sounds.play("coin");
      haptic([10, 30, 20]);
      const next: DailyState = { lastClaim: todayKey(), streak: daily.streak + 1 };
      setDaily(next);
      try {
        localStorage.setItem(DAILY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      const reward = DAY_REWARDS[daily.streak % 7];

      // Coins fly from the button to the coin pill in the header.
      const from = e.currentTarget.getBoundingClientRect();
      const target = document.getElementById("home-coin-pill")?.getBoundingClientRect();
      if (target) {
        const x = from.left + from.width / 2;
        const y = from.top + from.height / 2;
        const dx = target.left + target.width / 2 - x;
        const dy = target.top + target.height / 2 - y;
        const batch = Array.from({ length: 8 }, (_, i) => ({
          id: Date.now() + i,
          x,
          y,
          sx: (Math.random() - 0.5) * 90,
          sy: -30 - Math.random() * 50,
          dx,
          dy,
        }));
        setFlying(batch);
        window.setTimeout(() => setFlying([]), 1000);
      }
      window.setTimeout(() => {
        addCoins(reward);
        setCoinPop((n) => n + 1);
        sounds.play("create");
      }, 750);
      setToast({ id: Date.now(), text: `+${reward} Coins · Day ${(daily.streak % 7) + 1} bonus claimed!` });
    },
    [addCoins, claimedToday, daily.streak, hydrated],
  );

  return (
    <div className="home-bg relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      <div className="home-farm-peek pointer-events-none" aria-hidden />

      {flying.map((c) => (
        <span
          key={c.id}
          className="home-coin-fly"
          style={{ left: c.x - 13, top: c.y - 13, ["--sx" as string]: c.sx, ["--sy" as string]: c.sy, ["--dx" as string]: c.dx, ["--dy" as string]: c.dy }}
          aria-hidden
        >
          <Coin className="h-full w-full" />
        </span>
      ))}
      {toast ? (
        <div key={toast.id} className="home-toast pointer-events-none fixed inset-x-0 top-[calc(var(--header-top)+3.5rem)] z-40 flex justify-center">
          <span className="rounded-full bg-[#241A5E] px-4 py-2 text-[13px] font-bold text-white shadow-lg">{toast.text}</span>
        </div>
      ) : null}

      <header className="relative z-30 flex shrink-0 items-center justify-between gap-3 px-4 pb-3" style={{ paddingTop: "var(--header-top)" }}>
          <div className="home-rise flex min-w-0 items-center gap-3">
            <div className="home-avatar-ring relative shrink-0 rounded-full">
              <Image src="/images/home/avatar.png" alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover ring-2 ring-white" unoptimized />
              <span className="home-avatar-sprout absolute -top-2 left-1/2 -translate-x-1/2 text-[#3FB05C]" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 22v-8M12 14c-4 0-7-3-7-7 4 0 7 3 7 7zm0 0c4 0 7-3 7-7-4 0-7 3-7 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-[19px] font-extrabold leading-tight text-[#241A5E]">Hi, {userName}!</p>
              <span className="mt-1 inline-flex rounded-full bg-[#E6DEFF] px-2.5 py-0.5 text-[11px] font-extrabold text-[#6A5AE0] ring-1 ring-[#D4C8FF]">
                {pbTitle}
              </span>
            </div>
          </div>
          <div id="home-coin-pill" className="home-pill home-rise flex h-11 shrink-0 items-center gap-1.5 rounded-full pl-2 pr-3" style={{ animationDelay: "0.1s" }} role="status" aria-label={`${coins} coins`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/home/coin.png" alt="" className="h-6 w-6 shrink-0 object-contain" draggable={false} />
            <span key={coinPop} className={`text-[15px] font-extrabold tabular-nums text-[#1a1a2e] ${coinPop ? "quiz-pop" : ""}`}>
              {coins.toLocaleString("en-IN")}
            </span>
          </div>
      </header>

      <div
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [-webkit-overflow-scrolling:touch]"
        style={{ paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
          {/* PB score card: Season PB + rank (compete) and lifetime milestone (achieve). Coins live in the wallet pill above. */}
          <section className="home-card home-rise mb-3 rounded-[1.35rem] px-3.5 py-3" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center gap-3">
              <Link href="/pb" className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EDE7FF]">
                  <PbStarIcon className="h-7 w-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8B84A8]">Season PB</span>
                  <span className="block font-display text-[18px] font-extrabold leading-tight tabular-nums text-[#241A5E]">
                    {(liveBoard?.points ?? pb.seasonPoints).toLocaleString("en-IN")} <span className="text-[13px] text-[#6A5AE0]">PB</span>
                  </span>
                </span>
              </Link>
              <div className="mx-1 h-11 w-px bg-[#E6E0F8]" aria-hidden />
              <Link href="/pb" className="flex shrink-0 items-center gap-2 pr-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/home/trophy-pb-clean.png" alt="" className="h-10 w-10 object-contain drop-shadow" draggable={false} />
                <span className="leading-tight">
                  <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8B84A8]">Rank</span>
                  <span className="flex items-center gap-1.5 font-display text-[18px] font-extrabold text-[#241A5E]">
                    #{liveBoard?.rank ?? seasonRank}
                  </span>
                </span>
              </Link>
            </div>
            <Link href="/rewards" className="mt-3 block rounded-2xl bg-[#F5F3FF] px-3 py-2">
              <MilestoneProgressBar lifetimePoints={pb.lifetimePoints} compact />
            </Link>
          </section>

          <div className="home-rise" style={{ animationDelay: "0.25s" }}>
            <ChampionBanner />
          </div>

          {/* Daily bonus */}
          <section className="home-card home-rise mb-5 mt-3 rounded-[1.35rem] p-3" style={{ animationDelay: "0.35s" }}>
            <div className="flex items-center gap-3">
              <Image src="/images/home/gift.png" alt="" width={56} height={56} className="home-day-gift h-12 w-12 shrink-0 object-contain" unoptimized />
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[16px] font-extrabold text-[#241A5E]">Daily Bonus</h3>
                <p className="text-[11px] leading-snug text-[#6B6488]">Claim every day to grow your streak and rewards!</p>
              </div>
              <button
                type="button"
                onClick={claimDaily}
                disabled={claimedToday || !hydrated}
                className={`relative shrink-0 rounded-full px-4 py-2 font-display text-[13px] font-extrabold transition active:scale-95 ${
                  claimedToday ? "bg-[#EEFBEA] text-[#1E8A3E] ring-1 ring-[#A9E9B2]" : "home-cta text-white"
                }`}
              >
                {claimedToday ? "Claimed ✓" : `Claim +${todayReward}`}
                {!claimedToday && hydrated ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" /> : null}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {DAY_REWARDS.map((reward, i) => {
                const claimed = i < daily.streak % 7 || (claimedToday && i === todayIndex) || (daily.streak % 7 === 0 && daily.streak > 0 && claimedToday);
                const isToday = !claimedToday && i === todayIndex;
                return (
                  <div
                    key={i}
                    className={`home-day flex flex-col items-center rounded-xl py-1.5 ${claimed ? "home-day-claimed" : ""} ${isToday ? "home-day-today" : ""}`}
                  >
                    <span className="relative">
                      {i === 6 ? <span className="text-[20px] leading-none">🎁</span> : <Coin className="h-6 w-6" />}
                      {claimed ? (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#22B14C] text-white ring-2 ring-white">
                          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m5 12 5 5 9-10" />
                          </svg>
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 text-[9px] font-extrabold text-[#6A5AE0]">Day {i + 1}</span>
                    <span className="text-[9px] font-semibold text-[#8B84A8]">+{reward}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Explore games */}
          <section className="home-rise mb-4" style={{ animationDelay: "0.45s" }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[20px] font-extrabold text-[#241A5E]">Explore Games</h2>
              <Link href="/games" className="home-pill inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-extrabold text-[#6A5AE0]">
                See All
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
            <GameCarousel games={featuredGames} />
          </section>

          {/* Quick links */}
          <section className="home-rise grid grid-cols-3 gap-2.5" style={{ animationDelay: "0.55s" }}>
            <QuickLink href="/games/quiz-time" title="Quizzes" body="Test your knowledge, earn PB" emoji="🎓" />
            <QuickLink href="/rewards" title="Rewards" body="Lifetime PB milestones" emoji="🎁" />
            <QuickLink href="/orders" title="Your Orders" body="Track your purchases" emoji="🛍️" />
          </section>
      </div>

      <AppBottomNav />
    </div>
  );
}

function QuickLink({ href, title, body, emoji }: { href: string; title: string; body: string; emoji: string }) {
  return (
    <Link href={href} className="home-quick flex flex-col gap-1 rounded-2xl p-3">
      <span className="text-[24px] leading-none">{emoji}</span>
      <span className="mt-1 flex items-center justify-between font-display text-[13px] font-extrabold text-[#241A5E]">
        {title}
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#6A5AE0]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
      <span className="text-[10px] leading-snug text-[#6B6488]">{body}</span>
    </Link>
  );
}
