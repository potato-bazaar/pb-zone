"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { RewardTier } from "@/data/rewards";
import { BackToHub } from "@/components/layout/BackToHub";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { useBackTo } from "@/hooks/useBackTo";
import { noteReplace } from "@/lib/navStack";
import { QuizApiError, claimQuizReward } from "@/lib/quizApi";
import {
  formatAddressBlock,
  loadClaimedRewardIds,
  loadRewardAddress,
  placeRewardOrder,
} from "@/lib/rewardClaim";

const subscribeNever = () => () => {};

export function ConfirmOrderScreen({
  tier,
  tierId,
}: {
  tier: RewardTier;
  tierId: string;
}) {
  const router = useRouter();
  const session = useUserSession();
  const { earnedCoins, setWallet } = usePbCoins();
  const addressHref = `/rewards/claim/${tierId}/address`;
  const toAddress = useBackTo(addressHref);
  // The saved address lives in sessionStorage: read it once we're on the client (null while server-rendering / hydrating).
  const onClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  const address = useMemo(() => (onClient ? loadRewardAddress() : null), [onClient]);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const canClaim = earnedCoins >= tier.points;

  const auth = useMemo(
    () => ({
      token: session.token,
      userId: session.userId,
      userName: session.userName,
    }),
    [session.token, session.userId, session.userName],
  );

  // Nothing to confirm without a saved address (deep link, cleared session): this entry becomes the address step.
  useEffect(() => {
    if (!onClient || address) return;
    noteReplace();
    router.replace(addressHref);
  }, [onClient, address, router, addressHref]);

  if (!address) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-screen-sm items-center justify-center bg-[#F5F6FA]">
        <p className="text-sm font-semibold text-[#8B93A7]">Loading…</p>
      </div>
    );
  }

  const formatted = formatAddressBlock(address);

  async function handlePlaceOrder() {
    if (!address || claiming || !canClaim) return;
    // One order per reward: a Confirm reopened from history or a link must not spend coins on it again.
    if (loadClaimedRewardIds().includes(tierId)) {
      setClaimError("You've already claimed this reward. Track it in Your Orders.");
      return;
    }
    setClaiming(true);
    setClaimError(null);
    try {
      const wallet = await claimQuizReward(auth, tier.points);
      setWallet({
        coins: wallet.points,
        earnedCoins: wallet.earnedPoints,
        pbPoints: wallet.leaderboardPoints,
      });
      const order = placeRewardOrder(tier, address);
      // Replace: once the order is placed, the phone's back button must not reopen Confirm.
      // `claiming` stays on until Order Placed takes over, so a second tap can't place a second order.
      noteReplace();
      router.replace(
        `/rewards/claim/success?orderId=${encodeURIComponent(order.id)}`,
      );
    } catch (error) {
      const message =
        error instanceof QuizApiError
          ? error.message
          : "Could not claim this reward. Earn more PB by playing games.";
      setClaimError(message);
      setClaiming(false);
    }
  }

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm bg-[#F5F6FA]">
      <div
        className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header
          className="sticky top-0 z-30 bg-[#F5F6FA] px-4 pb-3"
          style={{ paddingTop: "var(--header-top)" }}
        >
          <div className="relative flex min-h-11 items-center justify-center">
            <BackToHub href={addressHref} tone="neutral" className="absolute left-0" />
            <h1 className="font-display text-lg font-bold text-[#2940B3]">
              Confirm Order
            </h1>
          </div>
        </header>

        <div className="px-4 pt-2">
        <section className="rounded-[1.15rem] border border-[#E8ECF4] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-[#2940B3]">
              Delivery Address
            </h2>
            {/* Editing is a step back to the address form: pop to it, so resubmitting doesn't stack a second Confirm. */}
            <button
              type="button"
              onClick={toAddress}
              aria-label="Edit delivery address"
              className="hit-slop inline-flex items-center gap-1 rounded-full text-[13px] font-bold text-[#2940B3] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2940B3]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Edit
            </button>
          </div>
          <p className="mt-3 text-[14px] font-bold text-[#1a1a2e]">
            {formatted.name}
          </p>
          {formatted.lines.map((line) => (
            <p
              key={line}
              className="mt-0.5 text-[13px] font-medium leading-snug text-[#4B5563]"
            >
              {line}
            </p>
          ))}
          <p className="mt-0.5 text-[13px] font-medium text-[#4B5563]">
            {formatted.phone}
          </p>
        </section>

        <section className="mt-3.5 rounded-[1.15rem] border border-[#E8ECF4] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <h2 className="text-[15px] font-bold text-[#2940B3]">
            Reward Summary
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[0.85rem] bg-[#F5F6FA]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${tier.image}?v=1`}
                alt=""
                className="h-14 w-14 object-contain"
                draggable={false}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-[#1a1a2e]">
                {tier.points.toLocaleString()} PB {tier.label}
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-[#8B93A7]">
                Qty: 1
              </p>
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-[13px] font-medium leading-snug text-[#8B93A7]">
          After you submit, our team will contact you and deliver your reward.
          Welcome coins cannot be used to claim rewards.
        </p>

        {claimError ? (
          <p className="mt-3 text-balance text-center text-[13px] font-semibold text-[#D14343]">
            {claimError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handlePlaceOrder()}
          disabled={!canClaim || claiming}
          className="mt-5 flex w-full items-center justify-center rounded-[0.95rem] bg-[#6A5AE0] py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(106,90,224,0.35)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#C5C0E8] disabled:shadow-none"
        >
          {claiming ? "Placing order…" : "Place Order"}
        </button>

        <p className="mt-4 text-center text-[12px] font-medium text-[#8B93A7]">
          By placing order, you agree to our
        </p>
        <button
          type="button"
          className="mx-auto mt-0.5 block text-[12px] font-bold text-[#2940B3] underline underline-offset-2"
        >
          Terms &amp; Conditions.
        </button>
        </div>
      </div>
    </div>
  );
}
