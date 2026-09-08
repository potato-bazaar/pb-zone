"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LeaderboardRankRow } from "@/components/leaderboard/LeaderboardRankRow";
import { useLeaderboardBoard } from "@/hooks/useLeaderboardBoard";
import {
  visibleFullBoard,
  type LeaderboardPeriod,
} from "@/lib/leaderboardApi";

function parsePeriod(value: string | null): LeaderboardPeriod {
  if (value === "week" || value === "month" || value === "overall") {
    return value;
  }
  return "overall";
}

export function FullLeaderboardScreen() {
  const searchParams = useSearchParams();
  const period = parsePeriod(searchParams.get("period"));
  const { board, error, loading } = useLeaderboardBoard(period, 100);
  const rows = board ? visibleFullBoard(board) : [];

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-white">
      <header
        className="sticky top-0 z-30 bg-white px-6 pb-2"
        style={{ paddingTop: "var(--header-top)" }}
      >
        <div className="relative flex min-h-[2.75rem] items-center justify-center py-1">
          <Link
            href="/leaderboard"
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
          <h1 className="font-display mx-14 text-xl font-bold text-[#1a1a2e]">
            Full Leaderboard
          </h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8 [-webkit-overflow-scrolling:touch]">
        {loading ? (
          <p className="px-6 py-16 text-center text-sm font-semibold text-[#6B7280]">
            Loading leaderboard…
          </p>
        ) : error ? (
          <p className="px-6 py-16 text-center text-sm font-semibold text-[#B42318]">
            {error}
          </p>
        ) : rows.length ? (
          rows.map((row) => (
            <LeaderboardRankRow
              key={row.userId || `${row.rank}-${row.name}`}
              row={row}
            />
          ))
        ) : (
          <p className="px-6 py-16 text-center text-sm font-semibold text-[#6B7280]">
            Play games to earn points and appear here.
          </p>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 px-4 text-[11px] text-[#9CA3AF]">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          Leaderboard updates every 10 minutes
        </p>
      </div>
    </div>
  );
}
