"use client";

import { CoinBadge } from "@/components/ui/CoinBadge";
import { PointsBadge } from "@/components/ui/PointsBadge";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";

export function WalletBadges({ className = "" }: { className?: string }) {
  const { coins, pbPoints } = usePbCoins();

  return (
    <div className={`flex shrink-0 items-center gap-1.5 ${className}`}>
      <CoinBadge amount={coins} className="py-1 pr-2.5" />
      <PointsBadge amount={pbPoints} className="py-1 pr-2.5" />
    </div>
  );
}
