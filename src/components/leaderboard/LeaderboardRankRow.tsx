"use client";

import Image from "next/image";
import type { LeaderboardEntry } from "@/lib/leaderboardApi";
import { PlayerAvatar } from "@/components/pb/PbUi";
import type { BoardRow } from "@/data/leaderboard";

/** Purple “You” pill — used on every board list. Not blue. */
export function YouHighlightRow({
  rank,
  points,
  avatarUrl,
}: {
  rank: number;
  points: number;
  avatarUrl?: string | null;
}) {
  return (
    <div className="mx-1 my-0.5 rounded-full bg-white p-[2px] shadow-[0_2px_10px_rgba(106,90,224,0.14)]">
      <div className="flex items-center gap-3 rounded-full bg-[#EDE7FF] px-3 py-2.5">
        <span className="w-6 shrink-0 text-center font-display text-[14px] font-extrabold text-[#241A5E]">{rank}</span>
        {avatarUrl != null ? (
          <Image
            src={avatarUrl || "/images/home/avatar.png"}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full bg-white object-cover ring-2 ring-[#6A5AE0]/55"
            unoptimized
          />
        ) : (
          <PlayerAvatar size="sm" ringClass="ring-[#6A5AE0]/55" />
        )}
        <p className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-[#241A5E]">You</p>
        <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-[#6A5AE0]">
          {points.toLocaleString("en-IN")} PB
        </span>
      </div>
    </div>
  );
}

export function LeaderboardRankRow({ row }: { row: LeaderboardEntry }) {
  const isYou = Boolean(row.isYou);
  const name = row.name?.trim() || (isYou ? "You" : "Player");

  if (isYou) {
    return <YouHighlightRow rank={row.rank} points={row.points} avatarUrl={row.avatarUrl} />;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="w-5 shrink-0 text-center text-sm font-bold text-[#1a1a2e]">{row.rank}</span>
      <Image
        src={row.avatarUrl || "/images/home/avatar.png"}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full bg-white object-cover ring-2 ring-white"
        unoptimized
      />
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#1a1a2e]">{name}</p>
      <span className="shrink-0 text-sm font-bold text-[#1a1a2e]">
        {row.points.toLocaleString()} <span className="text-[#6A5AE0]">PB</span>
      </span>
    </div>
  );
}

export function BoardYouRow({ row }: { row: BoardRow }) {
  if (row.isYou) {
    return <YouHighlightRow rank={row.rank} points={row.points} />;
  }
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-6 shrink-0 text-center font-display text-[14px] font-extrabold text-[#241A5E]">{row.rank}</span>
      <PlayerAvatar size="sm" ringClass="ring-[#EDE7FF]" />
      <p className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-[#241A5E]">{row.name}</p>
      <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-[#241A5E]">
        {row.points.toLocaleString("en-IN")} <span className="text-[#6A5AE0]">PB</span>
      </span>
    </div>
  );
}
