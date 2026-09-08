import { Suspense } from "react";
import { FullLeaderboardScreen } from "@/components/leaderboard/FullLeaderboardScreen";

export default function FullLeaderboardPage() {
  return (
    <Suspense
      fallback={
        <p className="px-6 py-16 text-center text-sm font-semibold text-[#6B7280]">
          Loading leaderboard…
        </p>
      }
    >
      <FullLeaderboardScreen />
    </Suspense>
  );
}
