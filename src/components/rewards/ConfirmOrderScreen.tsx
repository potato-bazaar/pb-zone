"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RewardTier } from "@/data/rewards";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import {
  formatAddressBlock,
  loadRewardAddress,
  placeRewardOrder,
  type RewardAddress,
} from "@/lib/rewardClaim";

export function ConfirmOrderScreen({
  tier,
  tierId,
}: {
  tier: RewardTier;
  tierId: string;
}) {
  const router = useRouter();
  const { coins, spendCoins } = usePbCoins();
  const [address, setAddress] = useState<RewardAddress | null>(null);

  useEffect(() => {
    const saved = loadRewardAddress();
    if (!saved) {
      router.replace(`/rewards/claim/${tierId}/address`);
      return;
    }
    setAddress(saved);
  }, [router, tierId]);

  if (!address) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-screen-sm items-center justify-center bg-[#F5F6FA]">
        <p className="text-sm font-semibold text-[#8B93A7]">Loading…</p>
      </div>
    );
  }

  const formatted = formatAddressBlock(address);

  function handlePlaceOrder() {
    if (!address) return;
    if (coins < tier.points) return;
    if (!spendCoins(tier.points)) return;
    const order = placeRewardOrder(tier, address);
    router.push(`/rewards/claim/success?orderId=${encodeURIComponent(order.id)}`);
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
          <div className="relative flex items-center justify-center">
            <Link
              href={`/rewards/claim/${tierId}/address`}
              aria-label="Back"
              className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#EBEEF2] text-[#2940B3]"
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
            <Link
              href={`/rewards/claim/${tierId}/address`}
              className="inline-flex items-center gap-1 text-[13px] font-bold text-[#2940B3]"
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
            </Link>
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
        </p>

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={coins < tier.points}
          className="mt-5 flex w-full items-center justify-center rounded-[0.95rem] bg-[#6A5AE0] py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(106,90,224,0.35)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#C5C0E8] disabled:shadow-none"
        >
          Place Order
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
