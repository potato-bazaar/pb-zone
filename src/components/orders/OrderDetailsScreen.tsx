"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import {
  formatAddressBlock,
  getRewardOrderById,
  type RewardOrder,
} from "@/lib/rewardClaim";

function statusLabel(status: RewardOrder["status"]) {
  if (status === "delivered") return "Delivered";
  if (status === "contacted") return "Team contacting";
  return "Order Placed";
}

function statusClass(status: RewardOrder["status"]) {
  if (status === "delivered") return "bg-[#E8F8EF] text-[#22A06B]";
  if (status === "contacted") return "bg-[#EEF4FF] text-[#2940B3]";
  return "bg-[#F0EDFF] text-[#6A5AE0]";
}

const TRACK_STEPS = [
  {
    id: "placed",
    title: "Order Placed",
    subtitle: "We've received your order",
  },
  {
    id: "contacted",
    title: "PB Team Contact You",
    subtitle: "Our team will contact you",
  },
] as const;

function trackStepIndex(status: RewardOrder["status"]) {
  if (status === "delivered" || status === "contacted") return 1;
  return 0;
}

function OrderStatusTimeline({ status }: { status: RewardOrder["status"] }) {
  const activeStep = trackStepIndex(status);

  return (
    <ol className="relative mt-1 pl-0.5">
      {TRACK_STEPS.map((step, index) => {
        const done = index <= activeStep;
        const isLast = index === TRACK_STEPS.length - 1;

        return (
          <li
            key={step.id}
            className={`relative flex gap-3 ${isLast ? "pb-0" : "pb-11"}`}
          >
            {!isLast ? (
              <span
                className={`absolute left-[11px] top-7 h-[calc(100%-1.1rem)] w-[2px] ${
                  index < activeStep ? "bg-[#86EFAC]" : "bg-[#E5E7EB]"
                }`}
                aria-hidden
              />
            ) : null}

            {done ? (
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#22A06B]">
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path d="M2 6l3 3 5-5" strokeLinecap="round" />
                </svg>
              </span>
            ) : (
              <span
                className="relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-[#D1D5DB] bg-white"
                aria-hidden
              />
            )}

            <div className="min-w-0 pt-0.5">
              <p className="text-[14px] font-bold text-[#1a1a2e]">
                {step.title}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-[#8B93A7]">
                {step.subtitle}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetailsScreen({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<RewardOrder | null | undefined>(undefined);

  useEffect(() => {
    setOrder(getRewardOrderById(orderId));
  }, [orderId]);

  if (order === undefined) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-screen-sm items-center justify-center bg-[#F7F5FC]">
        <p className="text-sm font-semibold text-[#8B93A7]">Loading…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-[#F7F5FC]">
        <header
          className="px-4 pb-3"
          style={{ paddingTop: "var(--header-top)" }}
        >
          <div className="relative flex items-center justify-center">
            <Link
              href="/orders"
              aria-label="Back"
              className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#EBEEF2] text-[#1a1a2e] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]"
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
              Order Details
            </h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <p className="text-[15px] font-bold text-[#1a1a2e]">Order not found</p>
          <Link
            href="/orders"
            className="mt-4 text-[14px] font-bold text-[#2940B3]"
          >
            Back to Your Orders
          </Link>
        </div>
        <AppBottomNav />
      </div>
    );
  }

  const address = formatAddressBlock(order.address);
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm bg-[#F7F5FC]">
      <div
        className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{
          paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header
          className="sticky top-0 z-30 bg-[#F7F5FC] px-4 pb-3"
          style={{ paddingTop: "var(--header-top)" }}
        >
          <div className="relative flex items-center justify-center">
            <Link
              href="/orders"
              aria-label="Back"
              className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#EBEEF2] text-[#1a1a2e] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]"
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
              Order Details
            </h1>
          </div>
        </header>

        <div className="space-y-3 px-4 pt-1 pb-2">
          <article className="rounded-[1.25rem] border border-[#E8ECF4] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-[#8B93A7]">
                  {order.id}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-[#8B93A7]">
                  {date}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(order.status)}`}
              >
                {statusLabel(order.status)}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[0.85rem] bg-[#F8F9FC]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${order.tierImage}?v=1`}
                  alt=""
                  className="h-14 w-14 object-contain"
                  draggable={false}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-[#1a1a2e]">
                  {order.tierPoints.toLocaleString()} PB {order.tierLabel}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-[#8B93A7]">
                  Qty: 1
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-[0.85rem] bg-[#F8F9FC] px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#8B93A7]">
                Delivery Address
              </p>
              <p className="mt-1 text-[13px] font-bold text-[#1a1a2e]">
                {address.name}
              </p>
              {address.lines.map((line) => (
                <p
                  key={line}
                  className="text-[12px] font-medium leading-snug text-[#4B5563]"
                >
                  {line}
                </p>
              ))}
              <p className="text-[12px] font-medium text-[#4B5563]">
                {address.phone}
              </p>
            </div>
          </article>

          <article className="rounded-[1.25rem] border border-[#E8ECF4] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <OrderStatusTimeline status={order.status} />
          </article>
        </div>
      </div>

      <AppBottomNav />
    </div>
  );
}
