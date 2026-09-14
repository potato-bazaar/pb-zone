"use client";

import Link from "next/link";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { PbHeader, SectionCard } from "@/components/pb/PbUi";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { HOW_PB_WORKS, PB_SEASON, SEASON_PRIZES, TIE_BREAKERS, seasonDaysRemaining, type SeasonPrize } from "@/data/pbEconomy";

const RANK_RIBBONS = {
  1: "/images/rewards/rank-ribbon-1.png",
  2: "/images/rewards/rank-ribbon-2.png",
  3: "/images/rewards/rank-ribbon-3.png",
} as const;

/** Placeholder art for prizes without a product image (earbuds). */
function EarbudsArt({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="earbudCase" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D9D4EE" />
        </linearGradient>
      </defs>
      <rect x="8" y="26" width="48" height="30" rx="12" fill="url(#earbudCase)" stroke="#8B84A8" strokeWidth="2" />
      <path d="M12 34h40" stroke="#8B84A8" strokeWidth="2" opacity="0.5" />
      <g stroke="#3D2E7A" strokeWidth="2">
        <path d="M24 20c-5 0-8 3-8 8v6a4 4 0 0 0 8 0v-2" fill="#EDE7FF" />
        <path d="M40 20c5 0 8 3 8 8v6a4 4 0 0 1-8 0v-2" fill="#EDE7FF" />
        <circle cx="24" cy="16" r="6" fill="#6A5AE0" />
        <circle cx="40" cy="16" r="6" fill="#6A5AE0" />
      </g>
      <circle cx="32" cy="45" r="2.5" fill="#4ADE80" />
    </svg>
  );
}

function PrizeCard({ prize }: { prize: SeasonPrize }) {
  const first = prize.rank === 1;
  const frame = {
    1: "from-[#FFE58A] to-[#F5B800] ring-[#F5C518]",
    2: "from-[#E9EEFF] to-[#C7D2F5] ring-[#B8C8DC]",
    3: "from-[#FFD9BE] to-[#E89A5C] ring-[#F0A878]",
  }[prize.rank];
  return (
    <article className={`relative flex flex-col items-center rounded-[1.2rem] bg-gradient-to-b p-2 pt-7 ring-2 ${frame} ${first ? "min-h-[12.5rem] -mt-4" : "min-h-[10.5rem]"}`}>
      <span className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[45%] ${first ? "w-[3.1rem]" : "w-[2.7rem]"}`} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={RANK_RIBBONS[prize.rank]} alt="" className="h-auto w-full object-contain drop-shadow" draggable={false} />
      </span>
      <div className={`flex w-full flex-1 items-center justify-center rounded-xl bg-white/60 ${first ? "h-[6.5rem]" : "h-[5rem]"}`}>
        {prize.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={prize.image} alt="" className="max-h-[90%] max-w-[85%] object-contain drop-shadow" draggable={false} />
        ) : (
          <EarbudsArt className={first ? "h-20 w-20" : "h-16 w-16"} />
        )}
      </div>
      <p className="mt-2 text-center font-display text-[13px] font-extrabold leading-tight text-[#241A5E]">{prize.title}</p>
      <p className="text-[10px] font-bold text-[#3D2E7A]/70">Rank #{prize.rank}</p>
    </article>
  );
}

export function SeasonPrizesScreen() {
  const { seasonRank, state } = usePbPoints();
  const daysLeft = seasonDaysRemaining();
  const order = [2, 1, 3] as const;

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm bg-[#F5F3FF]">
      <div className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]" style={{ paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="quiz-farm relative overflow-hidden pb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-[#241A5E]/60 via-[#241A5E]/30 to-[#F5F3FF]" aria-hidden />
          <div className="relative z-10">
            <PbHeader title="This Season's Prizes" backHref="/pb" tone="dark" />
            <div className="mt-1 text-center text-white">
              <h2 className="font-display text-[22px] font-extrabold drop-shadow">Top 3 Players Win Mega Prizes!</h2>
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-[12px] font-bold">
                📅 {PB_SEASON.label} · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
              </p>
            </div>
            <div className="mt-8 grid grid-cols-3 items-end gap-2.5 px-4">
              {order.map((rank) => (
                <PrizeCard key={rank} prize={SEASON_PRIZES.find((p) => p.rank === rank)!} />
              ))}
            </div>
          </div>
        </div>

        <div className="-mt-3 space-y-3 px-4">
          <SectionCard className="flex items-center justify-between bg-gradient-to-br from-[#EDE7FF] to-[#E1DBFF]">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#6A5AE0]">You right now</p>
              <p className="font-display text-[22px] font-extrabold text-[#241A5E]">
                #{seasonRank} <span className="text-[14px] text-[#3D2E7A]">· {state.seasonPoints.toLocaleString("en-IN")} PB</span>
              </p>
            </div>
            <Link href="/pb" className="rounded-full bg-[#6A5AE0] px-4 py-2 text-[12px] font-extrabold text-white shadow-[0_6px_16px_rgba(106,90,224,0.35)] active:scale-95">
              Leaderboard
            </Link>
          </SectionCard>

          <SectionCard>
            <h3 className="font-display text-[16px] font-extrabold text-[#241A5E]">How It Works</h3>
            <ul className="mt-2 space-y-2.5">
              {HOW_PB_WORKS.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDE7FF] text-[12px] font-extrabold text-[#6A5AE0]">{i + 1}</span>
                  <p className="text-[13px] font-semibold leading-snug text-[#3D2E7A]">{line}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard className="bg-[#FFF6D6] ring-1 ring-[#FFE082]">
            <h3 className="font-display text-[15px] font-extrabold text-[#8A5A00]">Tie-breakers (in order)</h3>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[13px] font-semibold text-[#5A3D00]">
              {TIE_BREAKERS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </SectionCard>

          <p className="px-2 pb-2 text-center text-[11.5px] font-semibold leading-snug text-[#8B84A8]">
            Everyone from #4 onward keeps every milestone reward they unlocked. Coins never count toward rank.
          </p>
        </div>
      </div>

      <AppBottomNav />
    </div>
  );
}
