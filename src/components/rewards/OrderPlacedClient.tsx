"use client";

import { useEffect, useState } from "react";
import {
  OrderPlacedFallback,
  OrderPlacedScreen,
} from "@/components/rewards/OrderPlacedScreen";
import {
  getRewardOrderById,
  type RewardOrder,
} from "@/lib/rewardClaim";

export function OrderPlacedClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<RewardOrder | null | undefined>(undefined);

  useEffect(() => {
    setOrder(getRewardOrderById(orderId));
  }, [orderId]);

  if (order === undefined) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-screen-sm items-center justify-center bg-[#F5F6FA]">
        <p className="text-sm font-semibold text-[#8B93A7]">Loading…</p>
      </div>
    );
  }

  if (!order) return <OrderPlacedFallback />;

  return <OrderPlacedScreen order={order} />;
}
