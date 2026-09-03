"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import type { RewardOrder } from "@/lib/rewardClaim";

const STEPS = [
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

function statusIndex(status: RewardOrder["status"]) {
  if (status === "delivered" || status === "contacted") return 1;
  return 0;
}

export function OrderPlacedScreen({ order }: { order: RewardOrder }) {
  const router = useRouter();
  const activeStep = statusIndex(order.status);

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm bg-white">
      <div
        className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{
          paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="px-5 pb-6"
          style={{ paddingTop: "var(--header-top)" }}
        >
          <div className="relative mx-auto flex flex-col items-center pt-4">
            <span
              className="absolute left-[28%] top-5 h-2 w-2 rounded-full bg-[#FBBF24]"
              aria-hidden
            />
            <span
              className="absolute right-[26%] top-6 h-1.5 w-1.5 rounded-full bg-[#6A5AE0]"
              aria-hidden
            />
            <span
              className="absolute left-[22%] top-14 h-1.5 w-1.5 rounded-full bg-[#22C55E]"
              aria-hidden
            />
            <span
              className="absolute right-[22%] top-[3.25rem] h-2 w-2 rounded-full bg-[#F97316]"
              aria-hidden
            />

            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#22A06B] shadow-[0_8px_20px_rgba(34,160,107,0.35)]">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M5 12.5 10 17.5 19 7.5" />
              </svg>
            </span>

            <h1 className="font-display mt-4 text-center text-[1.65rem] font-extrabold text-[#1a1a2e]">
              Order Placed!
            </h1>
            <p className="mt-2 max-w-[16rem] text-center text-[13px] font-medium leading-snug text-[#8B93A7]">
              Your order has been placed successfully. Our team will contact you
              soon.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-[11rem] rounded-[1.15rem] bg-[#F8F9FC] px-4 py-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${order.tierImage}?v=1`}
              alt=""
              className="mx-auto h-24 w-full object-contain"
              draggable={false}
            />
            <p className="mt-2 text-[13px] font-bold text-[#22A06B]">
              {order.tierPoints.toLocaleString()} PB {order.tierLabel}
            </p>
          </div>

          <h2 className="mt-8 text-[15px] font-extrabold text-[#1a1a2e]">
            What&apos;s Next?
          </h2>

          <ol className="relative mt-5 pl-1">
            {STEPS.map((step, index) => {
              const done = index <= activeStep;
              const isLast = index === STEPS.length - 1;

              return (
                <li
                  key={step.id}
                  className={`relative flex gap-3 ${isLast ? "pb-0" : "pb-12"}`}
                >
                  {!isLast ? (
                    <span
                      className={`absolute left-[5px] top-3 h-[calc(100%-0.35rem)] w-[2px] ${
                        index < activeStep ? "bg-[#22A06B]" : "bg-[#E5E7EB]"
                      }`}
                      aria-hidden
                    />
                  ) : null}

                  <span
                    className={`relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                      done ? "bg-[#22A06B]" : "bg-[#D1D5DB]"
                    }`}
                    aria-hidden
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-bold text-[#1a1a2e]">
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-[12px] font-medium text-[#8B93A7]">
                          {step.subtitle}
                        </p>
                      </div>
                      {done ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#22A06B]">
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
                          className="h-6 w-6 shrink-0 rounded-full border-2 border-[#D1D5DB]"
                          aria-hidden
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <button
            type="button"
            onClick={() =>
              router.push(`/orders/${encodeURIComponent(order.id)}`)
            }
            className="mt-8 flex w-full items-center justify-center rounded-full bg-[#6A5AE0] py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(106,90,224,0.35)] transition active:scale-[0.99]"
          >
            Track Order
          </button>
        </div>
      </div>

      <AppBottomNav />
    </div>
  );
}

export function OrderPlacedFallback() {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-screen-sm flex-col items-center justify-center gap-3 bg-white px-6">
      <p className="text-center text-sm font-semibold text-[#8B93A7]">
        Order not found.
      </p>
      <Link
        href="/orders"
        className="rounded-full bg-[#6A5AE0] px-5 py-2.5 text-sm font-bold text-white"
      >
        Go to Your Order
      </Link>
    </div>
  );
}
