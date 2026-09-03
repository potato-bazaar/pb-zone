"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import giftConfettiImg from "../../../public/images/rewards/reward-gift-confetti.png";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import {
  EARN_METHODS,
  REWARD_MILESTONES,
  REWARD_TIERS,
  getNextMilestone,
  isTierUnlocked,
  pointsToUnlockTier,
  type RewardTier,
} from "@/data/rewards";
import { loadClaimedRewardIds } from "@/lib/rewardClaim";

const EARN_ICON_CUTOUT = "#EEF4FF";

function EarnIcon({ type }: { type: (typeof EARN_METHODS)[number]["icon"] }) {
  const cls = "h-10 w-10 text-[#2940B3]";

  if (type === "games") {
    return (
      <svg viewBox="0 0 32 32" className={cls} fill="currentColor" aria-hidden>
        <path d="M11 8h10c2.75 0 5 2.25 5 5v2.2c0 1.3-.7 2.5-1.8 3.2L22 24.5c-.35.7-1.05 1.1-1.8 1.1h-1.6l-1.1 2.2c-.3.6-.9 1-1.5 1h-2.6c-.6 0-1.2-.4-1.5-1l-1.1-2.2H10.8c-.75 0-1.45-.4-1.8-1.1L9.8 18.4C8.7 17.7 8 16.5 8 15.2V13c0-2.75 2.25-5 5-5Z" />
        <path
          d="M10.6 13.4 11 14.1l.9.1-.7.65.15.85-.85-.48-.85.48.15-.85-.7-.65.9-.1.4-.85.4.85Z"
          fill={EARN_ICON_CUTOUT}
        />
        <circle cx="14.5" cy="14.6" r="1.25" fill={EARN_ICON_CUTOUT} />
        <circle cx="17.5" cy="14.6" r="1.25" fill={EARN_ICON_CUTOUT} />
        <circle cx="21.2" cy="12.8" r="1.05" fill={EARN_ICON_CUTOUT} />
        <circle cx="23.4" cy="14.8" r="1.05" fill={EARN_ICON_CUTOUT} />
        <circle cx="21.2" cy="16.8" r="1.05" fill={EARN_ICON_CUTOUT} />
        <circle cx="19" cy="14.8" r="1.05" fill={EARN_ICON_CUTOUT} />
      </svg>
    );
  }

  if (type === "bonus") {
    return (
      <svg viewBox="0 0 32 32" className={cls} fill="currentColor" aria-hidden>
        <rect x="8.5" y="13" width="15" height="14" rx="1.8" />
        <rect x="7.5" y="11" width="17" height="3.5" rx="1.2" />
        <ellipse cx="12.8" cy="9" rx="3" ry="2.4" />
        <ellipse cx="19.2" cy="9" rx="3" ry="2.4" />
        <ellipse cx="12.8" cy="9" rx="2.1" ry="1.6" fill={EARN_ICON_CUTOUT} />
        <ellipse cx="19.2" cy="9" rx="2.1" ry="1.6" fill={EARN_ICON_CUTOUT} />
        <rect x="15.2" y="11" width="1.6" height="16" rx="0.8" fill={EARN_ICON_CUTOUT} />
        <rect x="8.5" y="14.8" width="15" height="1.4" rx="0.7" fill={EARN_ICON_CUTOUT} />
      </svg>
    );
  }

  if (type === "challenges") {
    return (
      <svg
        viewBox="0 0 32 32"
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="8" y="7" width="16" height="21" rx="2.2" />
        <path
          d="M12 7V5.8A1.8 1.8 0 0 1 13.8 4h4.4A1.8 1.8 0 0 1 20 5.8V7"
          fill="currentColor"
          stroke="none"
        />
        <circle cx="12.2" cy="13.5" r="1" fill="currentColor" stroke="none" />
        <path d="M15.5 13.5H22" />
        <circle cx="12.2" cy="18" r="1" fill="currentColor" stroke="none" />
        <path d="M15.5 18H22" />
        <circle cx="12.2" cy="22.5" r="1" fill="currentColor" stroke="none" />
        <path d="M15.5 22.5H19.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className={cls} fill="currentColor" aria-hidden>
      <path d="M16 5s-3 3.2-3 6.2c0 2.4 1.5 4.2 3.4 4.9.6.2 1.1.7 1.2 1.3.2 1-.2 2-.9 2.6-1.5 1.2-2.4 2.9-2.4 4.8 0 3.4 2.8 6.2 6.2 6.2s6.2-2.8 6.2-6.2c0-1.9-.9-3.6-2.4-4.8-.7-.6-1.1-1.6-.9-2.6.1-.6.6-1.1 1.2-1.3 1.9-.7 3.4-2.5 3.4-4.9C23 8.2 20 5 20 5s-1.8 2.8-4 2.8S16 5 16 5Z" />
      <ellipse cx="16" cy="22.2" rx="2.4" ry="2.8" fill={EARN_ICON_CUTOUT} />
    </svg>
  );
}

function EarnLabel({ label }: { label: string }) {
  if (label === "Challenges") {
    return (
      <span className="text-center text-[10px] font-semibold leading-tight text-[#2940B3]">
        {label}
      </span>
    );
  }

  const [first, second] = label.split(" ");

  return (
    <span className="text-center text-[10px] font-semibold leading-tight text-[#2940B3]">
      <span className="block">{first}</span>
      <span className="block">{second}</span>
    </span>
  );
}

function ProgressTimeline({ points }: { points: number }) {
  const milestones = REWARD_MILESTONES;
  const segmentCount = milestones.length - 1;

  // Green line reaches the latest completed milestone
  let lastReachedIndex = 0;
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (points >= milestones[i].points) {
      lastReachedIndex = i;
      break;
    }
  }
  const greenPct = (lastReachedIndex / segmentCount) * 100;

  return (
    <div className="relative mt-5 px-0.5 pb-1">
      <div
        className="absolute left-[10%] right-[10%] top-[0.7rem] h-[3px] rounded-full bg-[#E5E7EB]"
        aria-hidden
      />
      <div
        className="absolute left-[10%] top-[0.7rem] h-[3px] rounded-full bg-[#22A06B] transition-all"
        style={{ width: `calc(80% * ${greenPct / 100})` }}
        aria-hidden
      />
      <div className="relative flex justify-between">
        {milestones.map((milestone, i) => {
          const reached = points >= milestone.points;
          const isCurrent =
            reached &&
            (i === milestones.length - 1 ||
              points < milestones[i + 1].points);

          let dotClass =
            "border-[#D1D5DB] bg-white";
          if (reached) {
            dotClass =
              isCurrent && milestone.points > 0
                ? "border-[#2940B3] bg-[#2940B3]"
                : "border-[#22A06B] bg-[#22A06B]";
          }

          return (
            <div
              key={milestone.points}
              className="flex w-[4.75rem] flex-col items-center"
            >
              <span
                className={`flex h-[1.35rem] w-[1.35rem] items-center justify-center rounded-full border-2 ${dotClass}`}
              >
                {reached && (
                  <svg
                    viewBox="0 0 12 12"
                    className="h-2.5 w-2.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </span>
              <span className="mt-2 text-center text-[11px] font-bold leading-tight text-[#2940B3]">
                {milestone.points.toLocaleString()} PB
              </span>
              <span className="mt-0.5 text-center text-[10px] font-medium leading-tight text-[#6B7280]">
                {milestone.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GiftIconBadge() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EEF2FA] bg-white shadow-[0_2px_10px_rgba(41,64,179,0.1)]">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        {/* Bow loops */}
        <path
          d="M16 8.5c-1.8-2.2-4.8-2.2-6.2 0-.9 1.4-.4 3.2 1.2 4.1L16 15l4.8-2.4c1.6-.9 2.1-2.7 1.2-4.1-1.4-2.2-4.4-2.2-6.2 0Z"
          fill="#2940B3"
        />
        {/* Lid */}
        <rect x="7" y="14" width="18" height="4.5" rx="1" fill="#2940B3" />
        {/* Box body */}
        <rect x="8" y="18" width="16" height="10" rx="1.5" fill="#3B5BDB" />
        {/* Vertical ribbon */}
        <rect x="14.5" y="14" width="3" height="14" rx="0.5" fill="#74C0FC" />
        {/* Ribbon highlight */}
        <rect x="15.2" y="14" width="1" height="14" rx="0.5" fill="#A5D8FF" opacity="0.7" />
      </svg>
    </span>
  );
}

function RewardClaimModal({
  tier,
  onClose,
  onConfirm,
}: {
  tier: RewardTier;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-claim-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#1a1a2e]/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[21rem] overflow-hidden rounded-[1.5rem] bg-white shadow-[0_24px_60px_rgba(26,26,46,0.24)]">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#2940B3] shadow-sm backdrop-blur-sm transition active:scale-95"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <div className="relative overflow-hidden bg-white px-6 pb-1 pt-8">
          <div className="relative mx-auto flex h-[9.5rem] items-end justify-center pb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${tier.image}?v=1`}
              alt=""
              className="relative z-10 h-[7.25rem] w-full max-w-[8.25rem] object-contain drop-shadow-[0_12px_20px_rgba(41,64,179,0.15)]"
              draggable={false}
            />
          </div>
        </div>

        <div className="px-6 pb-6 pt-3">
          <h2
            id="reward-claim-title"
            className="font-display text-center text-[1.1rem] font-extrabold leading-tight text-[#2940B3]"
          >
            {tier.points.toLocaleString()} PB {tier.label}
          </h2>
          <p className="mx-auto mt-2.5 max-w-[15rem] text-center text-[13px] font-medium leading-relaxed text-[#5B6478]">
            Add your address details to get this reward delivered to you.
          </p>

          <button
            type="button"
            onClick={onConfirm}
            className="mt-5 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#6A5AE0] to-[#7B6AE8] py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(106,90,224,0.4)] transition active:scale-[0.99]"
          >
            Claim Now
          </button>
        </div>
      </div>
    </div>
  );
}

function RewardClaimButton({
  unlocked,
  claimed,
}: {
  unlocked: boolean;
  claimed: boolean;
}) {
  if (claimed) {
    return (
      <span className="flex min-h-9 w-full items-center justify-center rounded-full bg-[#E8F8EF] px-1 py-2 text-[10px] font-bold text-[#22A06B]">
        Claimed
      </span>
    );
  }

  if (unlocked) {
    return (
      <span className="flex min-h-9 w-full items-center justify-center rounded-full bg-[#6A5AE0] px-1 py-2 text-[10px] font-bold text-white shadow-[0_4px_12px_rgba(106,90,224,0.35)]">
        Claim
      </span>
    );
  }

  return (
    <span className="flex min-h-9 w-full items-center justify-center rounded-full bg-[#EEF0FA] px-1 py-2 text-[10px] font-bold text-[#B8C0E0]">
      Claim
    </span>
  );
}

export function RewardsScreen() {
  const router = useRouter();
  const { coins: points } = usePbCoins();
  const [claimedTierIds, setClaimedTierIds] = useState<Set<string>>(new Set());
  const [claimModalTier, setClaimModalTier] = useState<RewardTier | null>(null);
  const nextMilestone = getNextMilestone(points);
  const pointsAway = nextMilestone
    ? pointsToUnlockTier(points, nextMilestone.points)
    : 0;

  useEffect(() => {
    setClaimedTierIds(new Set(loadClaimedRewardIds()));
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm bg-[#F5F6FA]">
      <div
        className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{
          paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header
          className="sticky top-0 z-30 bg-[#F5F6FA] px-4 pb-3"
          style={{ paddingTop: "var(--header-top)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/rewards"
              aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBEEF2] text-[#1a1a2e] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="font-display text-lg font-bold text-[#1a1a2e]">
              Your Progress
            </h1>
            <CoinBadge amount={points} />
          </div>
        </header>

        <div className="space-y-4 px-4">
          {/* Total points */}
          <section className="relative min-h-[11rem] overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#EEF4FF] via-[#E8EFFF] to-[#E0EAFF] px-4 py-5 shadow-sm">
            <div className="relative z-10 max-w-[52%] pr-1">
              <p className="text-[15px] font-bold text-[#2940B3]">
                Your Total Points
              </p>
              <p className="font-display mt-1.5 text-[2.35rem] font-extrabold leading-none tracking-tight text-[#2940B3]">
                {points.toLocaleString()}{" "}
                <span className="text-[1.15rem] font-bold">PB</span>
              </p>
              <p className="mt-2.5 text-[13px] font-medium leading-snug text-[#374151]">
                Great job! Keep playing and earn more points.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/rewards/trophy-pedestal.png?v=2"
              alt=""
              className="pointer-events-none absolute -bottom-[4.5rem] right-2 z-0 h-[17rem] w-auto max-w-[58%] object-contain object-bottom drop-shadow-[0_12px_24px_rgba(41,64,179,0.2)]"
              draggable={false}
            />
          </section>

          {/* Reward progress */}
          <section className="rounded-[1.35rem] bg-gradient-to-br from-[#EEF4FF] via-[#E8EFFF] to-[#E0EAFF] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[15px] font-bold text-[#2940B3]">
                  Reward Progress
                </h2>
                <p className="mt-1.5 text-[12px] leading-snug text-[#374151]">
                  {nextMilestone ? (
                    <>
                      You are{" "}
                      <span className="font-bold text-[#2940B3]">
                        {pointsAway.toLocaleString()} PB
                      </span>{" "}
                      away from unlocking the next reward!
                    </>
                  ) : (
                    "You&apos;ve unlocked all milestone rewards!"
                  )}
                </p>
              </div>
              <GiftIconBadge />
            </div>
            <ProgressTimeline points={points} />
          </section>

          {/* Unlock rewards — 4 cards fill full width */}
          <section>
            <h2 className="font-display mb-3 text-[15px] font-bold text-[#1a1a2e]">
              Unlock Rewards
            </h2>
            <div className="grid grid-cols-4 gap-3.5">
              {REWARD_TIERS.map((tier) => {
                const unlocked = isTierUnlocked(points, tier.points);
                const remaining = pointsToUnlockTier(points, tier.points);
                const claimed = claimedTierIds.has(tier.id);
                const canClaim = unlocked && !claimed;

                return (
                  <article
                    key={tier.id}
                    role={canClaim ? "button" : undefined}
                    tabIndex={canClaim ? 0 : undefined}
                    onClick={() => {
                      if (canClaim) setClaimModalTier(tier);
                    }}
                    onKeyDown={(e) => {
                      if (!canClaim) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setClaimModalTier(tier);
                      }
                    }}
                    className={`flex min-h-[12rem] min-w-0 flex-col overflow-hidden rounded-[1rem] shadow-[0_2px_8px_rgba(41,64,179,0.06)] touch-manipulation ${
                      canClaim
                        ? "cursor-pointer border border-[#B8E6C8] bg-[#E8F8EF] active:scale-[0.98]"
                        : unlocked
                          ? "border border-[#B8E6C8] bg-[#E8F8EF]"
                          : "border border-[#DDE8FF] bg-gradient-to-b from-[#EEF4FF] to-[#E8EFFF]"
                    }`}
                  >
                    <div className="pointer-events-none flex flex-1 flex-col px-1 pt-2 pb-0.5 text-center">
                      <p
                        className={`text-[11px] font-bold leading-tight ${
                          unlocked ? "text-[#22A06B]" : "text-[#2940B3]"
                        }`}
                      >
                        {tier.points.toLocaleString()} PB
                      </p>
                      <p
                        className={`mt-0.5 text-[10px] font-semibold leading-tight ${
                          unlocked ? "text-[#22A06B]/85" : "text-[#2940B3]/80"
                        }`}
                      >
                        {tier.label}
                      </p>
                      <div className="mt-1.5 flex flex-1 items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${tier.image}?v=1`}
                          alt=""
                          className="h-[4.75rem] w-full object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,0.1)]"
                          draggable={false}
                        />
                      </div>
                    </div>
                    <div
                      className={`pointer-events-none px-1 pt-0 text-center text-[10px] font-bold leading-tight ${
                        unlocked ? "text-[#22A06B]" : "text-[#374151]"
                      }`}
                    >
                      {unlocked ? (
                        <span className="inline-flex items-center justify-center gap-1">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#22A06B]">
                            <svg
                              viewBox="0 0 12 12"
                              className="h-2.5 w-2.5 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              aria-hidden
                            >
                              <path d="M2 6l3 3 5-5" strokeLinecap="round" />
                            </svg>
                          </span>
                          Unlocked
                        </span>
                      ) : (
                        <>
                          <span className="font-bold text-[#1a1a2e]">
                            {remaining.toLocaleString()} PB
                          </span>{" "}
                          <span className="font-semibold text-[#9CA3AF]">
                            Left
                          </span>
                        </>
                      )}
                    </div>
                    <div className="pointer-events-none px-1.5 pb-2 pt-1.5">
                      <RewardClaimButton
                        unlocked={unlocked}
                        claimed={claimed}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Earn methods — single card like design */}
          <section className="mx-1 min-h-[9.5rem] rounded-[1.35rem] border border-[#DDE8FF] bg-[#EEF4FF] px-4 py-5 shadow-[0_2px_8px_rgba(41,64,179,0.06)]">
            <h2 className="font-display mb-5 text-[15px] font-bold text-[#2940B3]">
              Keep earning points by
            </h2>
            <div className="grid grid-cols-4 gap-1">
              {EARN_METHODS.map((method) => (
                <div
                  key={method.id}
                  className="flex flex-col items-center gap-2.5 px-0.5"
                >
                  <EarnIcon type={method.icon} />
                  <EarnLabel label={method.label} />
                </div>
              ))}
            </div>
          </section>

          {/* Banner */}
          <section className="mx-1 flex items-center gap-1 rounded-[1.35rem] border border-[#E8ECF4] bg-white px-3.5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <p className="min-w-0 flex-[1.5] text-[13px] font-semibold leading-[1.3] text-[#2940B3]">
              <span className="block">
                All players with{" "}
                <span className="font-bold">500 PB</span> or more
              </span>
              <span className="block">will get a guaranteed Basic Gift!</span>
            </p>
            <div className="ml-auto flex flex-1 justify-end pr-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${giftConfettiImg.src}?v=3`}
                alt=""
                width={giftConfettiImg.width}
                height={giftConfettiImg.height}
                className="h-[4.5rem] w-[4.5rem] shrink-0 -translate-x-2 object-contain"
                draggable={false}
              />
            </div>
          </section>
        </div>
      </div>

      <AppBottomNav />

      {claimModalTier ? (
        <RewardClaimModal
          tier={claimModalTier}
          onClose={() => setClaimModalTier(null)}
          onConfirm={() => {
            const tierId = claimModalTier.id;
            setClaimModalTier(null);
            router.push(`/rewards/claim/${tierId}/address`);
          }}
        />
      ) : null}
    </div>
  );
}
