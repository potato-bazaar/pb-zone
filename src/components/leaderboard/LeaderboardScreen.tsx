"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LeaderboardRankRow } from "@/components/leaderboard/LeaderboardRankRow";
import {
  LEADERBOARD_FILTERS,
  type LeaderboardFilter,
} from "@/data/leaderboard";
import { useLeaderboardBoard } from "@/hooks/useLeaderboardBoard";
import { visibleRankings } from "@/lib/leaderboardApi";

const CROWN_IMAGES = {
  gold: "/images/leaderboard/crown-gold-1.png",
  silver: "/images/leaderboard/crown-silver-2.png",
  bronze: "/images/leaderboard/crown-bronze-3.png",
} as const;

function CrownBadge({
  tone,
  large,
}: {
  tone: "gold" | "silver" | "bronze";
  large?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CROWN_IMAGES[tone]}
      alt=""
      className={`pointer-events-none object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)] ${
        large ? "h-[3.2rem] w-[4.65rem]" : "h-[1.3rem] w-[3.45rem]"
      }`}
      draggable={false}
    />
  );
}

function PlayerAvatar({
  size = "md",
  ringClass = "ring-white",
  src,
}: {
  size?: "sm" | "md" | "lg";
  ringClass?: string;
  src?: string | null;
}) {
  const sizeClass =
    size === "lg"
      ? "h-16 w-16 ring-[3.5px]"
      : size === "md"
        ? "h-[3.25rem] w-[3.25rem] ring-[3px]"
        : "h-9 w-9 ring-2";

  return (
    <Image
      src={src || "/images/home/avatar.png"}
      alt=""
      width={64}
      height={64}
      className={`${sizeClass} shrink-0 rounded-full bg-white object-cover ${ringClass}`}
      unoptimized
    />
  );
}

function PodiumCard({
  player,
  tone,
  place,
}: {
  player: { name: string; points: number; isYou?: boolean; avatarUrl?: string | null };
  tone: "gold" | "silver" | "bronze";
  place: 1 | 2 | 3;
}) {
  const isFirst = place === 1;
  const styles = {
    gold: {
      bg: "bg-gradient-to-b from-[#FFF8DC] to-[#FFE082]",
      ring: "ring-[#F5C518]",
      score: "text-[#22A06B]",
    },
    silver: {
      bg: "bg-gradient-to-b from-[#EDF4FF] to-[#D4E4FF]",
      ring: "ring-[#B8C8DC]",
      score: "text-[#374151]",
    },
    bronze: {
      bg: "bg-gradient-to-b from-[#FFF0E8] to-[#FFD4BC]",
      ring: "ring-[#F0A878]",
      score: "text-[#374151]",
    },
  }[tone];

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end">
      <div
        className={`relative z-10 shrink-0 overflow-visible ${isFirst ? "mb-[-2.5rem]" : "mb-[-2.15rem]"}`}
      >
        <div
          className={`relative overflow-visible ${isFirst ? "pt-11" : "pt-9"}`}
        >
          <PlayerAvatar
            size={isFirst ? "lg" : "md"}
            ringClass={styles.ring}
            src={player.avatarUrl}
          />
          <div
            className={`absolute left-1/2 z-30 -translate-x-1/2 ${
              isFirst ? "top-0" : "top-3"
            }`}
          >
            <CrownBadge tone={tone} large={isFirst} />
          </div>
        </div>
      </div>

      <div
        className={`flex w-full flex-col items-center justify-end rounded-2xl px-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${styles.bg} ${
          isFirst
            ? "min-h-[7rem] pb-9 pt-10"
            : "min-h-[5.5rem] pb-6 pt-9"
        }`}
      >
        <p className="w-full truncate text-center text-[12px] font-bold leading-tight text-[#1a1a2e]">
          {player.name?.trim() || "Player"}
        </p>
        {player.isYou ? (
          <p className="text-[10px] font-bold leading-tight text-[#2940B3]">You</p>
        ) : null}
        <p
          className={`mt-0.5 text-center text-[11px] font-extrabold leading-tight ${styles.score}`}
        >
          {player.points.toLocaleString()}{" "}
          <span className="font-bold">PB</span>
        </p>
      </div>
    </div>
  );
}

function SeasonBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <section className="relative mb-3 mt-2 min-h-[10rem] overflow-hidden rounded-[1.35rem] shadow-[0_8px_24px_rgba(27,20,100,0.28)]">
      <div className="absolute inset-0 bg-[#1A1F5C]" aria-hidden />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 90% 85% at 100% 35%, rgba(106, 118, 220, 0.65) 0%, transparent 58%),
            radial-gradient(ellipse 70% 70% at 85% 85%, rgba(58, 72, 180, 0.5) 0%, transparent 52%),
            radial-gradient(ellipse 55% 45% at 8% 95%, rgba(35, 45, 120, 0.85) 0%, transparent 55%),
            radial-gradient(ellipse 45% 40% at 18% 15%, rgba(72, 88, 195, 0.28) 0%, transparent 50%),
            linear-gradient(128deg, #121A5C 0%, #1C2878 46%, #2A3BA8 100%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute -right-8 top-[-30%] h-[160%] w-[62%] rotate-[-14deg] rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(118,130,235,0.42)_0%,transparent_68%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-35%] left-[-8%] h-[85%] w-[55%] rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(42,58,150,0.45)_0%,transparent_72%)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-[36%] top-3 h-1.5 w-2 rotate-45 bg-[#FF8A3D]/90"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-[26%] top-8 h-1.5 w-1.5 rounded-sm bg-[#F5C518]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-7 right-[40%] h-1.5 w-2 rotate-12 bg-[#FF6BCB]/90"
        aria-hidden
      />

      <div className="relative z-10 min-h-[10rem] py-4 pl-4 pr-[9rem]">
        <div className="flex min-w-0 flex-col justify-center pt-3">
          <h2 className="font-display text-[20px] font-bold leading-none text-white">
            {title}
          </h2>
          <p className="mt-8 max-w-[12rem] text-[14px] font-semibold leading-[1.4] text-white/92">
            {subtitle}
          </p>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/leaderboard/season-potato-mascot.png"
        alt=""
        className="absolute bottom-0 right-4 z-10 h-[9rem] w-auto object-contain object-bottom"
        draggable={false}
      />
    </section>
  );
}

export function LeaderboardScreen() {
  const [filter, setFilter] = useState<LeaderboardFilter>("overall");
  const { board, error, loading } = useLeaderboardBoard(filter, 8);

  const meId = board?.me?.userId ?? null;
  const first = board?.podium.find((p) => p.rank === 1) ?? null;
  const second = board?.podium.find((p) => p.rank === 2) ?? null;
  const third = board?.podium.find((p) => p.rank === 3) ?? null;
  const listRows = board ? visibleRankings(board) : [];
  const hasPodium = Boolean(first || second || third);
  const myRank = board?.me?.rank ?? null;
  const myPoints = board?.me?.points ?? 0;

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col bg-[#F5F6FA]">
      {/* Header */}
      <header
        className="sticky top-0 z-30 bg-transparent px-6 pb-2"
        style={{ paddingTop: "var(--header-top)" }}
      >
        <div className="relative flex min-h-[2.75rem] items-center justify-center py-1">
          <Link
            href="/home"
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
            Leaderboard
          </h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 [-webkit-overflow-scrolling:touch]">
        <SeasonBanner
          title={board?.season.title || "Season 1"}
          subtitle={
            board?.season.subtitle ||
            "Climb the ranks, earn points & win amazing rewards!"
          }
        />

        {/* Filter tabs */}
        <div className="mb-2 flex w-full gap-2">
          {LEADERBOARD_FILTERS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`flex-1 rounded-full py-2.5 text-center text-[13px] font-bold transition ${
                  active
                    ? "bg-[#2940B3] text-white shadow-sm"
                    : "bg-[#EEF2FA] text-[#1a1a2e]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm font-semibold text-[#6B7280]">
            Loading leaderboard…
          </p>
        ) : error ? (
          <p className="py-16 text-center text-sm font-semibold text-[#B42318]">
            {error}
          </p>
        ) : (
          <>
            {hasPodium ? (
              <div className="relative z-10 flex items-end gap-1.5 overflow-visible px-0">
                {second ? (
                  <PodiumCard
                    player={{
                      ...second,
                      isYou: Boolean(
                        second.isYou || (meId && second.userId === meId),
                      ),
                    }}
                    tone="silver"
                    place={2}
                  />
                ) : (
                  <div className="flex-1" />
                )}
                {first ? (
                  <PodiumCard
                    player={{
                      ...first,
                      isYou: Boolean(
                        first.isYou || (meId && first.userId === meId),
                      ),
                    }}
                    tone="gold"
                    place={1}
                  />
                ) : (
                  <div className="flex-1" />
                )}
                {third ? (
                  <PodiumCard
                    player={{
                      ...third,
                      isYou: Boolean(
                        third.isYou || (meId && third.userId === meId),
                      ),
                    }}
                    tone="bronze"
                    place={3}
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            ) : null}

            {listRows.length ? (
              <div
                className={`relative z-20 overflow-hidden rounded-t-[1.35rem] rounded-b-2xl bg-white pb-1 pt-3 shadow-[0_-4px_18px_rgba(0,0,0,0.05)] ${
                  hasPodium ? "-mt-4" : "mt-1"
                }`}
              >
                {listRows.map((row) => (
                  <LeaderboardRankRow
                    key={row.userId || `${row.rank}-${row.name}`}
                    row={row}
                  />
                ))}
              </div>
            ) : hasPodium ? null : (
              <div className="relative z-20 mt-1 overflow-hidden rounded-2xl bg-white px-6 py-10 shadow-sm">
                <p className="text-center text-sm font-semibold text-[#6B7280]">
                  Play games to earn points and appear here.
                </p>
              </div>
            )}
          </>
        )}

        <Link
          href={`/leaderboard/full?period=${filter}`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2940B3] py-3.5 text-[15px] font-bold text-white shadow-[0_6px_18px_rgba(41,64,179,0.28)] active:scale-[0.99]"
        >
          View Full Leaderboard
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>

        {/* Your stats card */}
        <div className="relative mt-3 overflow-hidden rounded-2xl bg-[#EEF4FF] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#6B7280]">Your Rank</p>
              <p className="font-display text-3xl font-extrabold text-[#2940B3]">
                {myRank != null ? `#${myRank}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B7280]">
                Total Points
              </p>
              <p className="font-display text-3xl font-extrabold text-[#2940B3]">
                {myPoints.toLocaleString()}{" "}
                <span className="text-xl">PB</span>
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home/trophy-pb-clean.png"
              alt=""
              className="h-20 w-auto shrink-0 object-contain"
              draggable={false}
            />
          </div>
        </div>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#9CA3AF]">
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
