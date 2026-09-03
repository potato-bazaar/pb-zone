"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import emptyOrdersImg from "../../../public/images/orders/empty-orders-box.png";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import {
  loadRewardOrders,
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

function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function YourOrdersScreen() {
  const [orders, setOrders] = useState<RewardOrder[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOrders(loadRewardOrders());
    setReady(true);
  }, []);

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
          <h1 className="font-display text-center text-lg font-bold text-[#2940B3]">
            Your Orders
          </h1>
          <p className="mt-1 text-center text-[13px] font-medium text-[#8B93A7]">
            Track all your reward orders in one place.
          </p>
        </header>

        <div className="px-4 pt-1">
          {!ready ? (
            <p className="py-16 text-center text-sm font-semibold text-[#8B93A7]">
              Loading…
            </p>
          ) : orders.length === 0 ? (
            <section className="flex min-h-[70dvh] flex-col items-center justify-center px-2 pb-8 text-center">
              <div className="relative flex h-48 w-48 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${emptyOrdersImg.src}?v=2`}
                  alt=""
                  width={emptyOrdersImg.width}
                  height={emptyOrdersImg.height}
                  className="relative z-10 h-40 w-40 object-contain drop-shadow-[0_10px_24px_rgba(106,90,224,0.18)]"
                  draggable={false}
                />
              </div>

              <h2 className="font-display mt-6 text-[1.55rem] font-extrabold text-[#1a1a2e]">
                No Order Placed
              </h2>
              <p className="mt-2 text-[14px] font-medium text-[#5B6478]">
                You haven&apos;t placed any reward order yet.
              </p>

              <Link
                href="/games"
                className="mt-8 inline-flex w-auto max-w-none items-center justify-center whitespace-nowrap rounded-full bg-[#6A5AE0] px-6 py-3.5 text-center text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(106,90,224,0.35)] transition active:scale-[0.99]"
              >
                Play Games to Claim Rewards
              </Link>
            </section>
          ) : (
            <ul className="space-y-3 pb-2">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${encodeURIComponent(order.id)}`}
                    className="block rounded-[1.25rem] border border-[#E8ECF4] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[0.85rem] bg-[#F8F9FC]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${order.tierImage}?v=1`}
                          alt=""
                          className="h-14 w-14 object-contain"
                          draggable={false}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-[#8B93A7]">
                              {order.id}
                            </p>
                            <p className="mt-0.5 text-[12px] font-medium text-[#8B93A7]">
                              {formatOrderDate(order.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(order.status)}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </div>

                        <p className="mt-2 text-[14px] font-bold leading-snug text-[#1a1a2e]">
                          {order.tierPoints.toLocaleString()} PB{" "}
                          {order.tierLabel}
                        </p>
                        <p className="mt-0.5 text-[12px] font-medium text-[#8B93A7]">
                          Qty: 1
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[#F0F2F8] pt-3">
                      <span className="text-[13px] font-bold text-[#2940B3]">
                        View Details
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4 text-[#2940B3]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AppBottomNav />
    </div>
  );
}
