"use client";

import Link from "next/link";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { AppBottomNav } from "@/components/layout/AppBottomNav";

const MEGA_PRIZES = [
  {
    rank: 1 as const,
    title: "Latest Smartphone",
    bonus: "+2,000 PB Bonus",
    image: "/images/rewards/mega-prize-phone.png",
  },
  {
    rank: 2 as const,
    title: "Premium Travel Backpack",
    bonus: "+1,500 PB Bonus",
    image: "/images/rewards/mega-prize-backpack.png",
  },
  {
    rank: 3 as const,
    title: "Wireless Headphones",
    bonus: "+1,000 PB Bonus",
    image: "/images/rewards/mega-prize-headphones.png",
  },
];

const MEGA_PODIUM_ORDER = [2, 1, 3] as const;

const HOW_IT_WORKS = [
  {
    id: "earn",
    text: "Earn points by playing games, completing challenges & daily tasks.",
  },
  {
    id: "gift",
    text: "Reach 500 PB to unlock your Basic Gift.",
  },
  {
    id: "climb",
    text: "Climb the leaderboard to win Mega Prizes.",
  },
  {
    id: "reset",
    text: "Season resets every month.",
  },
] as const;

const RANK_RIBBONS = {
  1: "/images/rewards/rank-ribbon-1.png",
  2: "/images/rewards/rank-ribbon-2.png",
  3: "/images/rewards/rank-ribbon-3.png",
} as const;

function RankBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const isFirst = rank === 1;

  return (
    <span
      className={`absolute left-1/2 z-20 -translate-x-1/2 ${
        isFirst
          ? "top-0 w-[3.15rem] -translate-y-[48%]"
          : "top-0 w-[2.75rem] -translate-y-[42%]"
      }`}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${RANK_RIBBONS[rank]}?v=2`}
        alt=""
        className="h-auto w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)]"
        draggable={false}
      />
    </span>
  );
}

function MiniTrophy() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/rewards/mega-prizes-mini-trophy.png?v=1"
      alt=""
      className="mt-0.5 h-6 w-6 shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(212,160,23,0.35)]"
      draggable={false}
    />
  );
}

function HowIcon({ id }: { id: (typeof HOW_IT_WORKS)[number]["id"] }) {
  const cls = "h-5 w-5 text-[#2940B3]";

  if (id === "earn") {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden>
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M7.8 12.2 10.6 15l5.6-6.2"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (id === "gift") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
        {/* Bow loops */}
        <path d="M12 7.2c-1.5-1.9-4.1-1.9-5.3 0-.8 1.2-.3 2.8 1.1 3.5L12 12.2l4.2-1.5c1.4-.7 1.9-2.3 1.1-3.5-1.2-1.9-3.8-1.9-5.3 0Z" />
        {/* Lid */}
        <rect x="4.5" y="10.2" width="15" height="3.2" rx="1.1" />
        {/* Box */}
        <rect x="5.5" y="13" width="13" height="8.2" rx="1.4" />
        {/* Ribbon cut */}
        <rect x="11.15" y="10.2" width="1.7" height="11" rx="0.6" fill="white" />
      </svg>
    );
  }

  if (id === "climb") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
        {/* Cup */}
        <path d="M7.2 5.5h9.6c.5 0 .9.4.9.9v1.4c0 3.4-2.4 6.2-5.7 6.7v1.7h2.1c.5 0 .9.4.9.9v1.1H8.1v-1.1c0-.5.4-.9.9-.9h2.1v-1.7C7.8 14 5.4 11.2 5.4 7.8V6.4c0-.5.4-.9.9-.9h.9Z" />
        {/* Left handle */}
        <path d="M5.2 7.2H3.8c-.8 0-1.5.7-1.5 1.5 0 2.1 1.3 3.5 3.2 3.9-.4-1-.6-2.1-.6-3.2V7.2Z" />
        {/* Right handle */}
        <path d="M18.8 7.2h1.4c.8 0 1.5.7 1.5 1.5 0 2.1-1.3 3.5-3.2 3.9.4-1 .6-2.1.6-3.2V7.2Z" />
        {/* Base */}
        <rect x="8.2" y="19.2" width="7.6" height="1.8" rx="0.7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
      {/* Binder rings */}
      <rect x="7.2" y="2.8" width="2.2" height="3.2" rx="1.1" />
      <rect x="14.6" y="2.8" width="2.2" height="3.2" rx="1.1" />
      {/* Body */}
      <rect x="4" y="5.2" width="16" height="15.5" rx="2.4" />
      {/* Center mark */}
      <circle cx="12" cy="13.2" r="2.6" fill="white" />
      <circle cx="12" cy="13.2" r="1.15" fill="currentColor" />
    </svg>
  );
}

function GiftHeaderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-5 w-5 shrink-0 text-[#2940B3]"
      fill="currentColor"
      aria-hidden
    >
      <rect x="4.5" y="10" width="15" height="10" rx="1.5" />
      <rect x="3.5" y="8" width="17" height="3.2" rx="1" />
      <ellipse cx="9" cy="6.2" rx="2.4" ry="2" />
      <ellipse cx="15" cy="6.2" rx="2.4" ry="2" />
      <path d="M12 8V20" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

export function RewardsPrizesScreen() {
  const { coins } = usePbCoins();
  const basicUnlocked = coins >= 500;

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm bg-white">
      <div
        className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{
          paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header
          className="sticky top-0 z-30 bg-white px-4 pb-3"
          style={{ paddingTop: "var(--header-top)" }}
        >
          <div className="flex items-center justify-center">
            <h1 className="font-display text-lg font-bold text-[#2940B3]">
              Rewards &amp; Prizes
            </h1>
          </div>
        </header>

        <div className="space-y-6 px-4 pb-4 pt-1">
          <section className="overflow-visible rounded-[1.35rem] bg-gradient-to-b from-[#EEF4FF] to-[#F7F9FF] px-3.5 pb-4 pt-4 shadow-[0_2px_12px_rgba(41,64,179,0.05)]">
            <div className="flex items-start gap-2 px-0.5">
              <MiniTrophy />
              <div>
                <h2 className="font-display text-[15px] font-bold text-[#2940B3]">
                  Mega Prizes (Top 3 of the Season)
                </h2>
                <p className="mt-0.5 text-[12px] font-medium text-[#2940B3]/75">
                  Win big if you&apos;re in the top 3!
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-2.5 overflow-visible">
              {MEGA_PODIUM_ORDER.map((rank) => {
                const prize = MEGA_PRIZES.find((p) => p.rank === rank)!;
                return (
                  <article
                    key={prize.rank}
                    className="relative flex flex-col overflow-visible rounded-[1.1rem] border border-[#E4EAF6] bg-white px-2 pb-3 pt-7 shadow-[0_2px_8px_rgba(41,64,179,0.06)]"
                  >
                    <RankBadge rank={prize.rank} />
                    <div className="flex h-[5.25rem] items-center justify-center px-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${prize.image}?v=1`}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                        draggable={false}
                      />
                    </div>
                    <p className="mt-1.5 min-h-[2.4rem] text-center text-[11px] font-bold leading-tight text-[#2940B3]">
                      {prize.title}
                    </p>
                    <p className="mt-1 text-center text-[10px] font-bold text-[#22A06B]">
                      {prize.bonus}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.35rem] bg-gradient-to-b from-[#EEF4FF] to-[#F7F9FF] p-3.5 shadow-[0_2px_12px_rgba(41,64,179,0.05)]">
            <div className="flex items-start gap-2 px-0.5">
              <GiftHeaderIcon />
              <div>
                <h2 className="font-display text-[15px] font-bold text-[#2940B3]">
                  Everyone Gets a Basic Gift!
                </h2>
                <p className="mt-0.5 text-[12px] font-medium leading-snug text-[#2940B3]/75">
                  All players with 500 PB or more will get this exclusive gift.
                </p>
              </div>
            </div>

            <div className="mt-3.5 rounded-[1.15rem] border border-[#E4EAF6] bg-white px-3.5 py-3.5 shadow-[0_2px_8px_rgba(41,64,179,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] bg-[#F5F7FC]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/rewards/reward-cap.png?v=1"
                    alt=""
                    className="h-[4.25rem] w-[4.25rem] object-contain"
                    draggable={false}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-[#2940B3]">
                    PB Zone Cap
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#8B93A7]">
                    Stylish. Exclusive. Yours!
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      basicUnlocked
                        ? "bg-[#E8F8EF] text-[#22A06B]"
                        : "bg-[#EEF4FF] text-[#2940B3]"
                    }`}
                  >
                    {basicUnlocked ? (
                      <svg
                        viewBox="0 0 12 12"
                        className="h-2.5 w-2.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden
                      >
                        <path d="M2 6l3 3 5-5" strokeLinecap="round" />
                      </svg>
                    ) : null}
                    Unlocked at 500 PB
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/rewards/progress"
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2940B3] py-3.5 text-[14px] font-bold uppercase tracking-wide text-white shadow-[0_8px_18px_rgba(41,64,179,0.28)] transition active:scale-[0.99]"
            >
              Check Your Progress
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </section>

          <div className="relative pb-2">
            <section className="relative overflow-visible rounded-[1.35rem] bg-[#EEF4FF] px-4 pb-5 pt-4">
              <h2 className="font-display text-[15px] font-bold text-[#2940B3]">
                How It Works
              </h2>
              <ul className="relative z-10 mt-3 space-y-3 pr-[5.5rem]">
                {HOW_IT_WORKS.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                      <HowIcon id={item.id} />
                    </span>
                    <p className="pt-1 text-[12px] font-semibold leading-snug text-[#2940B3]/90">
                      {item.id === "gift" ? (
                        <>
                          Reach{" "}
                          <span className="font-extrabold">500 PB</span> to
                          unlock your Basic Gift.
                        </>
                      ) : (
                        item.text
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/leaderboard/season-potato-mascot.png"
              alt=""
              className="pointer-events-none absolute bottom-0 right-0 z-20 h-[8.25rem] w-auto object-contain object-bottom"
              draggable={false}
            />

            <Link
              href="/leaderboard"
              className="relative z-8 mt-3 flex w-[calc(100%-8.25rem)] items-center justify-center rounded-full border-2 border-[#2940B3] bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-[#2940B3] transition active:scale-[0.99]"
            >
              <span>View Full Leaderboard</span>
              <svg
                viewBox="0 0 24 24"
                className="ml-1.5 h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <AppBottomNav />
    </div>
  );
}
