"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { PbStarIcon } from "@/components/pb/PbUi";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { LIFETIME_MILESTONES, milestoneProgress, type LifetimeMilestone } from "@/data/pbEconomy";
import { fetchMyLeaderboard } from "@/lib/leaderboardApi";
import { fetchQuizPoints } from "@/lib/quizApi";
import { loadClaimedRewardIds } from "@/lib/rewardClaim";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEEN_KEY = "pbZoneSeenUnlocks.v1";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  try {
    const next = loadSeen();
    next.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
  } catch {
    /* ignore */
  }
}

type RowState = "claimed" | "claimable" | "need-coins" | "locked";

function stateFor(
  m: LifetimeMilestone,
  leadership: number,
  earnedCoins: number,
  claimedIds: Set<string>,
): RowState {
  if (leadership < m.points) return "locked";
  // Digital rewards unlock from leaderboard standing and are granted instantly.
  if (!m.claimable || claimedIds.has(m.id)) return "claimed";
  if (earnedCoins < m.points) return "need-coins";
  return "claimable";
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function MilestoneArt({ m, size = "md" }: { m: LifetimeMilestone; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-28 w-28 text-[64px]" : "h-14 w-14 text-[30px]";
  const img = size === "lg" ? "h-24 w-24" : "h-12 w-12";
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-white/85 leading-none shadow-inner ${box}`}>
      {m.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image} alt="" className={`${img} object-contain drop-shadow`} draggable={false} />
      ) : (
        m.emoji
      )}
    </span>
  );
}

function TruckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H14a1.5 1.5 0 0 1 1.5 1.5V8h2.3c.5 0 .95.25 1.22.66l1.7 2.55c.18.27.28.6.28.93V16a1 1 0 0 1-1 1h-1.05a2.5 2.5 0 0 1-4.9 0h-4.1a2.5 2.5 0 0 1-4.9 0H4a1 1 0 0 1-1-1V6.5Zm12.5 3v2.5h3.2l-1.55-2.5H15.5ZM7.5 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  );
}

function GiftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 7.2c-1.5-1.9-4.1-1.9-5.3 0-.8 1.2-.3 2.8 1.1 3.5L12 12.2l4.2-1.5c1.4-.7 1.9-2.3 1.1-3.5-1.2-1.9-3.8-1.9-5.3 0Z" />
      <rect x="4.5" y="10.2" width="15" height="3.2" rx="1.1" />
      <rect x="5.5" y="13" width="13" height="8.2" rx="1.4" />
      <rect x="11.15" y="10.2" width="1.7" height="11" rx="0.6" fill="#fff" />
    </svg>
  );
}

function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

function ProgressBar({ value, max, compact = false }: { value: number; max: number; compact?: boolean }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div className={`overflow-hidden rounded-full bg-[#E6E0F8] ${compact ? "h-2" : "h-2.5"}`}>
      <div className="h-full rounded-full bg-gradient-to-r from-[#9C8CFF] to-[#6A5AE0] transition-[width] duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

function SparkleIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0.6c.35 2.7 1.55 4.55 4.4 4.9-2.85.35-4.05 2.2-4.4 4.9-.35-2.7-1.55-4.55-4.4-4.9 2.85-.35 4.05-2.2 4.4-4.9Z" />
    </svg>
  );
}

function CardWaveBackdrop() {
  return (
    <svg
      viewBox="0 0 360 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <path
        d="M-20 88 C 40 52, 110 108, 170 72 S 290 34, 400 78 L 400 130 L -20 130 Z"
        fill="#D8D0FF"
        opacity="0.42"
      />
      <path
        d="M-10 96 C 70 58, 150 112, 230 68 S 320 48, 410 86 L 410 130 L -10 130 Z"
        fill="#CFC6FF"
        opacity="0.28"
      />
      <path
        d="M30 18 C 90 42, 150 8, 220 34 S 310 52, 380 24 L 380 -10 L 30 -10 Z"
        fill="#E4DEFF"
        opacity="0.55"
      />
    </svg>
  );
}

type PbRewardsSummaryCardProps = {
  earnedCoins: number;
  rank: number | null;
  leadership: number;
  unlockedCount: number;
  nextReward?: {
    label: string;
    points: number;
    image?: string;
    emoji?: string;
  } | null;
  remaining?: number;
};

function PbRewardsSummaryCard({
  earnedCoins,
  rank,
  leadership,
  unlockedCount,
  nextReward = null,
  remaining = 0,
}: PbRewardsSummaryCardProps) {
  const allComplete = !nextReward;
  const displayEarned = Math.max(0, Math.floor(earnedCoins));

  return (
    <section
      className="relative overflow-hidden rounded-[1.35rem] bg-[#F0EDFF] shadow-[0_6px_20px_rgba(74,52,160,0.10)] ring-1 ring-[#E8E2FF]"
      aria-label="Earned coins and next reward"
    >
      <CardWaveBackdrop />

      {/* Coins row */}
      <div className="relative z-10 flex items-center gap-3 px-3.5 py-2.5">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <SparkleIcon className="absolute -left-0.5 top-0 h-2.5 w-2.5 text-[#F5C84A]" />
          <SparkleIcon className="absolute -right-0.5 bottom-0 h-2.5 w-2.5 text-[#FFD76A]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/home/coin-transparent.png"
            alt=""
            className="relative z-10 h-11 w-11 object-contain drop-shadow-[0_4px_8px_rgba(180,120,0,0.28)]"
            draggable={false}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-extrabold leading-none text-[#1D264F]">
            Earned Coins
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="font-display text-[32px] font-extrabold leading-none tracking-tight text-[#1D264F] tabular-nums">
              {displayEarned.toLocaleString("en-IN")}
            </p>
            <span className="inline-flex items-center rounded-full bg-[#D9D0FF]/95 px-2 py-0.5 text-[11px] font-extrabold text-[#6A4CFF]">
              {rank ? `Rank #${rank}` : "Unranked"}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[12px] font-bold text-[#3D9A5C]">
            <SparkleIcon className="h-2.5 w-2.5 text-[#F0B429]" />
            Keep playing, keep earning!
          </p>
        </div>
      </div>

      {/* Next reward — nested inside same card */}
      {allComplete ? (
        <p className="relative z-10 mx-2.5 mb-2.5 rounded-2xl bg-gradient-to-br from-[#FFF8E0] to-[#FFE9A8] px-3 py-2.5 text-center text-[12px] font-extrabold text-[#8A5A00] ring-1 ring-[#FFE082]/70">
          🏆 Every milestone unlocked. Legend status!
        </p>
      ) : (
        <div className="relative z-10 mx-2.5 mb-2.5 rounded-2xl bg-gradient-to-br from-[#FFF8E0] to-[#FFE9A8] p-2.5 ring-1 ring-[#FFE082]/70">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 text-[20px] shadow-sm ring-1 ring-[#FFE082]">
              {nextReward.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={nextReward.image}
                  alt=""
                  className="h-7 w-7 object-contain"
                  draggable={false}
                />
              ) : (
                nextReward.emoji
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A5A00]">
                Next reward
              </p>
              <p className="truncate text-[13px] font-extrabold text-[#241A5E]">{nextReward.label}</p>
              <div className="mt-1">
                <ProgressBar value={leadership} max={nextReward.points} compact />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-[#8B84A8]">
                  <span className="font-extrabold text-[#6A5AE0]">{unlockedCount}</span>{" "}
                  {unlockedCount === 1 ? "reward" : "rewards"} unlocked
                </p>
                <p className="text-[10px] font-extrabold text-[#8A5A00]">
                  {remaining.toLocaleString("en-IN")} PB to go!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Reward modal                                                       */
/* ------------------------------------------------------------------ */

function RewardModal({
  m,
  state,
  leadership,
  earnedCoins,
  rank,
  onClose,
  onClaim,
}: {
  m: LifetimeMilestone;
  state: RowState;
  leadership: number;
  earnedCoins: number;
  rank: number | null;
  onClose: () => void;
  onClaim: () => void;
}) {
  const physical = m.claimable;
  const remainingLeadership = Math.max(0, m.points - leadership);
  const remainingCoins = Math.max(0, m.points - earnedCoins);
  const title = state === "locked" ? "Keep Growing!" : state === "claimed" ? (physical ? "Reward Claimed!" : "Reward Unlocked!") : "Reward Unlocked!";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="pb-reward-title">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-[#1a1a2e]/55 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full max-w-[23rem] overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_60px_rgba(26,26,46,0.35)] ring-4 ring-[#B39DFF]/50">
        {/* Hero */}
        <div className="relative h-[15.5rem] overflow-hidden bg-[#2A1E6E]">
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(245,197,24,0.55) 0%, rgba(245,197,24,0) 60%), radial-gradient(ellipse 90% 80% at 50% 100%, rgba(156,140,255,0.6) 0%, transparent 65%), linear-gradient(160deg, #1D1552 0%, #3D2E9E 60%, #5B47C8 100%)",
            }}
          />
          <div className="qc-rays absolute left-1/2 top-[45%] h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 opacity-70" aria-hidden />
          {["#F5C518", "#FF8A3D", "#B39DFF", "#FFE082", "#7C6CF0", "#F5C518", "#FF6BCB", "#FFD54F"].map((c, i) => (
            <span
              key={i}
              className="pointer-events-none absolute h-2.5 w-4 rounded-sm opacity-90"
              style={{ backgroundColor: c, left: `${6 + ((i * 13) % 88)}%`, top: `${10 + ((i * 29) % 70)}%`, transform: `rotate(${i * 47}deg)` }}
              aria-hidden
            />
          ))}
          <button type="button" aria-label="Close" onClick={onClose} className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm active:scale-95">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          {/* Pedestal + product */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <div className={`relative z-10 -mb-3 flex items-center justify-center ${state === "locked" ? "grayscale" : ""}`}>
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="" className="h-32 w-32 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]" draggable={false} />
              ) : (
                <span className="text-[88px] leading-none drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]">{m.emoji}</span>
              )}
            </div>
            <div className="h-6 w-40 rounded-[100%] bg-gradient-to-b from-[#FFE58A] to-[#C99400] shadow-[0_6px_16px_rgba(0,0,0,0.4)]" aria-hidden />
            <div className="-mt-2 h-4 w-32 rounded-b-[100%] bg-[#A67A00]" aria-hidden />
          </div>

          {/* Seal */}
          <div className="absolute right-6 top-[38%] flex h-[4.5rem] w-[4.5rem] -rotate-6 flex-col items-center justify-center rounded-full bg-gradient-to-b from-[#FFE58A] to-[#F5B800] text-[#4A3300] shadow-[0_8px_18px_rgba(0,0,0,0.35)] ring-4 ring-[#FFF3C4]/70">
            <span className="font-display text-[19px] font-extrabold leading-none">{m.points.toLocaleString("en-IN")}</span>
            <span className="font-display text-[12px] font-extrabold leading-none">PB</span>
          </div>

          {/* Mascot */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/games/quiz-mascot-cheer.png" alt="" className="pointer-events-none absolute -left-2 bottom-0 h-[7.5rem] w-auto object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.4)]" draggable={false} />
        </div>

        {/* Body */}
        <div className="px-5 pb-5 pt-4 text-center">
          <h2 id="pb-reward-title" className="font-display text-[26px] font-extrabold leading-none text-[#241A5E]">
            {title.split(" ")[0]} <span className="text-[#6A5AE0]">{title.split(" ").slice(1).join(" ")}</span>
          </h2>
          <p className="mt-1.5 font-display text-[17px] font-extrabold text-[#241A5E]">
            {m.points.toLocaleString("en-IN")} PB · {m.label}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[#6B6488]">
            {state === "locked" ? (
              <>
                <span className="font-extrabold text-[#6A5AE0]">{remainingLeadership.toLocaleString("en-IN")} leaderboard PB</span> more to unlock this reward
                {rank ? <> · you are rank #{rank}</> : null}.
              </>
            ) : state === "need-coins" ? (
              <>
                Rank is enough. You still need <span className="font-extrabold text-[#6A5AE0]">{remainingCoins.toLocaleString("en-IN")} earned coins</span> to claim it.
              </>
            ) : (
              <>
                You&apos;ve reached the <span className="font-extrabold text-[#6A5AE0]">{m.points.toLocaleString("en-IN")} PB</span> milestone!
              </>
            )}
          </p>

          {state === "locked" || state === "need-coins" ? (
            <div className="mt-4 space-y-2.5 rounded-2xl bg-[#F5F3FF] px-4 py-3 text-left">
              <div>
                <div className="flex items-baseline justify-between text-[12px] font-bold text-[#3D2E7A]">
                  <span>Leaderboard</span>
                  <span className="tabular-nums text-[#6A5AE0]">
                    {leadership.toLocaleString("en-IN")} / {m.points.toLocaleString("en-IN")} PB
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={leadership} max={m.points} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between text-[12px] font-bold text-[#3D2E7A]">
                  <span>Earned coins</span>
                  <span className="tabular-nums text-[#6A5AE0]">
                    {earnedCoins.toLocaleString("en-IN")} / {m.points.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={earnedCoins} max={m.points} />
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 divide-x divide-[#E6E0F8] rounded-2xl bg-[#F5F3FF] py-3">
              <div className="px-1">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#EDE7FF]">
                  <PbStarIcon className="h-5 w-5" />
                </span>
                <p className="mt-1.5 text-[12px] font-extrabold text-[#241A5E]">{m.points.toLocaleString("en-IN")} PB</p>
                <p className="text-[10.5px] font-semibold leading-tight text-[#8B84A8]">Milestone reached</p>
              </div>
              <div className="px-1">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#EDE7FF] text-[#6A5AE0]">{physical ? <TruckIcon className="h-5 w-5" /> : <GiftIcon className="h-5 w-5" />}</span>
                <p className="mt-1.5 text-[12px] font-extrabold text-[#241A5E]">{physical ? "Physical reward" : "Digital reward"}</p>
                <p className="text-[10.5px] font-semibold leading-tight text-[#8B84A8]">{physical ? "Delivered to you" : "Added to your profile"}</p>
              </div>
              <div className="relative px-1">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#EDE7FF] text-[#6A5AE0]">
                  <GiftIcon className="h-5 w-5" />
                </span>
                <span className="absolute right-2 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#22B14C] text-white ring-2 ring-white">
                  <CheckIcon className="h-3 w-3" />
                </span>
                <p className="mt-1.5 text-[12px] font-extrabold text-[#241A5E]">{state === "claimed" ? "Claimed" : "Unlocked"}</p>
                <p className="text-[10.5px] font-semibold leading-tight text-[#8B84A8]">{state === "claimed" ? (physical ? "On its way" : "Yours to keep") : "Claim to receive"}</p>
              </div>
            </div>
          )}

          {state === "need-coins" ? (
            <Link href="/games" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6A5AE0] to-[#8A7BF0] py-3.5 font-display text-[17px] font-extrabold text-white shadow-[0_10px_24px_rgba(106,90,224,0.45)] active:scale-[0.99]">
              Play to earn coins
            </Link>
          ) : state === "claimable" ? (
            <>
              <div className="mt-3 flex items-start gap-3 rounded-2xl bg-[#EDE7FF] px-4 py-3 text-left">
                <span className="mt-0.5 text-[#6A5AE0]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                    <path d="M12 2.5a7 7 0 0 0-7 7c0 5.25 7 12 7 12s7-6.75 7-12a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[14px] font-extrabold text-[#241A5E]">Add your address details</p>
                  <p className="text-[12px] font-semibold leading-snug text-[#6B6488]">We&apos;ll need your delivery details to send this reward to you.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClaim}
                className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#6A5AE0] to-[#8A7BF0] py-3.5 font-display text-[17px] font-extrabold text-white shadow-[0_10px_24px_rgba(106,90,224,0.45)] active:scale-[0.99]"
              >
                <TruckIcon className="h-5 w-5" />
                Add Address &amp; Claim
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-[14px] font-bold text-[#8B84A8]">
                Maybe later
              </button>
            </>
          ) : state === "locked" ? (
            <Link href="/games" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6A5AE0] to-[#8A7BF0] py-3.5 font-display text-[17px] font-extrabold text-white shadow-[0_10px_24px_rgba(106,90,224,0.45)] active:scale-[0.99]">
              Play to earn PB
            </Link>
          ) : (
            <button type="button" onClick={onClose} className="mt-4 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#6A5AE0] to-[#8A7BF0] py-3.5 font-display text-[17px] font-extrabold text-white shadow-[0_10px_24px_rgba(106,90,224,0.45)] active:scale-[0.99]">
              Awesome!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export function PbRewardsScreen() {
  const router = useRouter();
  const session = useUserSession();
  const { earnedCoins, setWallet } = usePbCoins();
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<LifetimeMilestone | null>(null);
  const [leadership, setLeadership] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setClaimedIds(new Set(loadClaimedRewardIds())), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const auth = {
      token: session.token,
      userId: session.userId,
      userName: session.userName,
    };
    void Promise.all([
      fetchQuizPoints(auth).catch(() => null),
      fetchMyLeaderboard(auth, "overall").catch(() => null),
    ]).then(([wallet, board]) => {
      if (cancelled) return;
      if (wallet) {
        setWallet({
          coins: wallet.points,
          earnedCoins: wallet.earnedPoints,
          pbPoints: wallet.leaderboardPoints,
        });
      }
      const liveLeadership = Number(board?.me?.points ?? wallet?.leaderboardPoints ?? 0);
      setLeadership(Number.isFinite(liveLeadership) ? Math.max(0, Math.floor(liveLeadership)) : 0);
      setRank(board?.me?.rank ?? null);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [session.token, session.userId, session.userName, setWallet]);

  // Celebrate a newly unlocked physical reward once, the first time the player sees it here.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      const claimed = new Set(loadClaimedRewardIds());
      const seen = loadSeen();
      const fresh = LIFETIME_MILESTONES.find((m) => m.claimable && leadership >= m.points && !claimed.has(m.id) && !seen.has(m.id));
      if (fresh) setOpen(fresh);
    }, 400);
    return () => window.clearTimeout(t);
  }, [ready, leadership]);

  const milestone = milestoneProgress(leadership);
  const unlockedCount = LIFETIME_MILESTONES.filter((m) => leadership >= m.points).length;

  const closeModal = () => {
    if (open) markSeen(open.id);
    setOpen(null);
  };

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#F5F3FF]">
      {/* Hero — full banner, no side crop */}
      <div className="relative z-30 shrink-0 overflow-hidden bg-[#7EB8E8]">
        <h1 className="sr-only">PB Rewards</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/rewards/pb-rewards-hero.png?v=2"
          alt=""
          className="pointer-events-none relative z-10 block w-full h-auto"
          draggable={false}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-8 bg-gradient-to-b from-transparent to-[#F5F3FF]"
          aria-hidden
        />
      </div>

      {/* Curved sheet — ladder scrolls under the rounded edge */}
      <div
        className="relative z-40 -mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-[#F5F3FF] px-4 pt-5 [-webkit-overflow-scrolling:touch]"
        style={{ paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="space-y-3.5">
          <PbRewardsSummaryCard
            earnedCoins={earnedCoins}
            rank={rank}
            leadership={leadership}
            unlockedCount={unlockedCount}
            nextReward={
              milestone.next
                ? {
                    label: milestone.next.label,
                    points: milestone.next.points,
                    image: milestone.next.image,
                    emoji: milestone.next.emoji,
                  }
                : null
            }
            remaining={milestone.remaining}
          />

          <p className="px-1 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#8B84A8]">
            Reward ladder
          </p>

          {/* Ladder — one track only (green when done, grey when not) */}
          <ol className="relative pl-9 pr-1">
            {LIFETIME_MILESTONES.map((m, i) => {
              const rs = stateFor(m, leadership, earnedCoins, claimedIds);
              const isNext = milestone.next?.id === m.id;
              const isLast = i === LIFETIME_MILESTONES.length - 1;
              const nextReached =
                !isLast && leadership >= LIFETIME_MILESTONES[i + 1].points;
              const dot =
                rs === "claimed"
                  ? "bg-[#22B14C] text-white"
                  : rs === "claimable" || rs === "need-coins"
                    ? "bg-[#7C3AED] text-white shadow-[0_0_0_4px_rgba(124,58,237,0.25)]"
                    : "bg-[#D9D4EE] text-[#8B84A8]";
              const card =
                rs === "claimed"
                  ? "bg-[#F0FBF3] ring-1 ring-[#C8EED2]"
                  : rs === "claimable" || rs === "need-coins"
                    ? "bg-[#F1ECFF] ring-2 ring-[#B39DFF] shadow-[0_8px_20px_rgba(106,90,224,0.18)]"
                    : "bg-white ring-1 ring-[#E6E0F8] shadow-[0_2px_10px_rgba(36,26,94,0.05)]";
              return (
                <li key={m.id} className="relative mb-3">
                  {!isLast ? (
                    <span
                      className={`absolute -left-[1.8rem] top-6 h-[calc(100%+0.75rem)] w-0.5 ${nextReached ? "bg-[#22B14C]" : "bg-[#E6E0F8]"}`}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={`absolute -left-[2.55rem] top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full ring-[3px] ring-[#F5F3FF] ${dot}`}
                  >
                    {rs === "claimed" ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : rs === "claimable" || rs === "need-coins" ? (
                      <GiftIcon className="h-4 w-4" />
                    ) : (
                      <LockIcon />
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(m)}
                    className={`flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-left transition active:scale-[0.99] ${card} ${rs === "locked" ? "opacity-90" : ""}`}
                  >
                    <MilestoneArt m={m} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-display text-[16px] font-extrabold leading-tight ${rs === "claimed" ? "text-[#1E8A3E]" : rs === "claimable" || rs === "need-coins" || isNext ? "text-[#6A5AE0]" : "text-[#8B84A8]"}`}
                      >
                        {m.points.toLocaleString("en-IN")} PB
                      </p>
                      <p className="line-clamp-2 text-[13px] font-extrabold leading-tight text-[#241A5E]">
                        {m.label}
                      </p>
                      <p className="text-[10.5px] font-semibold text-[#8B84A8]">{m.typeLabel}</p>
                    </div>
                    {rs === "claimed" ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#DDF5E4] px-2.5 py-1.5 text-[11px] font-extrabold text-[#1E8A3E]">
                        <CheckIcon className="h-3.5 w-3.5" /> Claimed
                      </span>
                    ) : rs === "claimable" ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#6A5AE0] px-2.5 py-2 text-[11px] font-extrabold text-white shadow-[0_6px_14px_rgba(106,90,224,0.4)]">
                        <TruckIcon className="h-4 w-4" /> Claim Now
                      </span>
                    ) : rs === "need-coins" ? (
                      <span className="w-[5.75rem] shrink-0 text-right text-[10px] font-extrabold leading-tight text-[#6A5AE0]">
                        Need {(m.points - earnedCoins).toLocaleString("en-IN")} coins
                      </span>
                    ) : (
                      <span className="w-[5.75rem] shrink-0 text-right">
                        <span className="block text-[10px] font-bold tabular-nums text-[#8B84A8]">
                          {leadership.toLocaleString("en-IN")} /{" "}
                          {m.points.toLocaleString("en-IN")} PB
                        </span>
                        <span className="mt-1 block">
                          <ProgressBar value={leadership} max={m.points} compact />
                        </span>
                        <span className="mt-0.5 block text-[10px] font-extrabold text-[#6A5AE0]">
                          {(m.points - leadership).toLocaleString("en-IN")} PB to go!
                        </span>
                      </span>
                    )}
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-[#B8B0D8]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ol>

          <p className="px-2 pb-1 text-center text-[11.5px] font-semibold leading-snug text-[#8B84A8]">
            Unlocks follow live leaderboard PB. Claiming a gift spends earned coins, not welcome
            coins.
          </p>
        </div>
      </div>

      {open ? (
        <RewardModal
          m={open}
          state={stateFor(open, leadership, earnedCoins, claimedIds)}
          leadership={leadership}
          earnedCoins={earnedCoins}
          rank={rank}
          onClose={closeModal}
          onClaim={() => {
            const id = open.id;
            markSeen(id);
            setOpen(null);
            router.push(`/rewards/claim/${encodeURIComponent(id)}/address`);
          }}
        />
      ) : null}

      <AppBottomNav />
    </div>
  );
}
