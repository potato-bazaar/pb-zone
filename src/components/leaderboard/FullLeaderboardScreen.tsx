"use client";

import Image from "next/image";
import Link from "next/link";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { ALL_PLAYERS, type LeaderboardPlayer } from "@/data/leaderboard";

function PlayerAvatar({
  size = "sm",
  ringClass = "ring-white",
}: {
  size?: "sm";
  ringClass?: string;
}) {
  return (
    <Image
      src="/images/home/avatar.png"
      alt=""
      width={36}
      height={36}
      className={`h-9 w-9 shrink-0 rounded-full bg-white object-cover ring-2 ${ringClass}`}
      unoptimized
    />
  );
}

function LeaderboardRow({
  row,
  yourCoins,
}: {
  row: LeaderboardPlayer;
  yourCoins: number;
}) {
  if (row.isYou) {
    return (
      <div className="px-3 py-0.5">
        <div className="flex items-center gap-3 rounded-2xl bg-[#EEF4FF] px-3 py-3">
          <span className="w-5 shrink-0 text-center text-sm font-bold text-[#2940B3]">
            {row.rank}
          </span>
          <PlayerAvatar ringClass="ring-[#2940B3]" />
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#2940B3]">
            You
          </p>
          <span className="shrink-0 text-sm font-bold text-[#2940B3]">
            {yourCoins.toLocaleString()} PB
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="w-5 shrink-0 text-center text-sm font-bold text-[#1a1a2e]">
        {row.rank}
      </span>
      <PlayerAvatar ringClass="ring-white" />
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#1a1a2e]">
        {row.name}
      </p>
      <span className="shrink-0 text-sm font-bold text-[#1a1a2e]">
        {row.points.toLocaleString()}{" "}
        <span className="text-[#22A06B]">PB</span>
      </span>
    </div>
  );
}

export function FullLeaderboardScreen() {
  const { coins } = usePbCoins();

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
        {ALL_PLAYERS.map((row) => (
          <LeaderboardRow key={row.rank} row={row} yourCoins={coins} />
        ))}

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
