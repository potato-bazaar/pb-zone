"use client";

import Image from "next/image";
import type { LeaderboardEntry } from "@/lib/leaderboardApi";

function PlayerAvatar({
  src,
  ringClass = "ring-white",
}: {
  src?: string | null;
  ringClass?: string;
}) {
  return (
    <Image
      src={src || "/images/home/avatar.png"}
      alt=""
      width={36}
      height={36}
      className={`h-9 w-9 shrink-0 rounded-full bg-white object-cover ring-2 ${ringClass}`}
      unoptimized
    />
  );
}

export function LeaderboardRankRow({ row }: { row: LeaderboardEntry }) {
  const isYou = Boolean(row.isYou);
  const name = row.name?.trim() || (isYou ? "You" : "Player");

  if (isYou) {
    return (
      <div className="px-3 py-0.5">
        <div className="flex items-center gap-3 rounded-2xl bg-[#EEF4FF] px-3 py-3">
          <span className="w-5 shrink-0 text-center text-sm font-bold text-[#2940B3]">
            {row.rank}
          </span>
          <PlayerAvatar src={row.avatarUrl} ringClass="ring-[#2940B3]" />
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#2940B3]">
            {name} <span className="font-semibold text-[#2940B3]/70">(You)</span>
          </p>
          <span className="shrink-0 text-sm font-bold text-[#2940B3]">
            {row.points.toLocaleString()} PB
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
      <PlayerAvatar src={row.avatarUrl} />
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#1a1a2e]">
        {name}
      </p>
      <span className="shrink-0 text-sm font-bold text-[#1a1a2e]">
        {row.points.toLocaleString()}{" "}
        <span className="text-[#22A06B]">PB</span>
      </span>
    </div>
  );
}
