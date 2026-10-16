"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  OrderPlacedFallback,
  OrderPlacedScreen,
} from "@/components/rewards/OrderPlacedScreen";
import { getRewardOrderById } from "@/lib/rewardClaim";

const subscribeNever = () => () => {};

export function OrderPlacedClient({ orderId }: { orderId: string }) {
  // Orders live in sessionStorage: read once we're on the client (undefined while server-rendering / hydrating).
  const onClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  const order = useMemo(
    () => (onClient ? getRewardOrderById(orderId) : undefined),
    [onClient, orderId],
  );

  if (order === undefined) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-screen-sm items-center justify-center bg-white">
        <p className="text-sm font-semibold text-[#8B93A7]">Loading…</p>
      </div>
    );
  }

  if (!order) return <OrderPlacedFallback />;

  return <OrderPlacedScreen order={order} />;
}
