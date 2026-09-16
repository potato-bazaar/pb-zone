"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { YouHighlightRow } from "@/components/leaderboard/LeaderboardRankRow";
import { PlayerAvatar } from "@/components/pb/PbUi";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import type { BoardRow } from "@/data/leaderboard";
import { fetchLeaderboardPoints, rankStoredPlayers, type StoredPlayerPoints } from "@/lib/leaderboardApi";
import { REWARD_TIERS } from "@/data/rewards";

const ART = "/games/run";

export type BoardTab = "leaderboard" | "rewards";
type Period = "week" | "month" | "all";

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

/** Leaderboard / Rewards screen from the mockup, on real PB data. */
export function RunBoard({ tab: initialTab, onClose }: { tab: BoardTab; onClose: () => void }) {
  const { state } = usePbPoints();
  const session = useUserSession();
  const [tab, setTab] = useState<BoardTab>(initialTab);
  const [period, setPeriod] = useState<Period>("week");
  const [stored, setStored] = useState<StoredPlayerPoints[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLeaderboardPoints(session, { limit: 200 })
      .then((players) => {
        if (!cancelled) setStored(Array.isArray(players) ? players : []);
      })
      .catch(() => {
        if (!cancelled) setStored([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, session.token, session.userId, session.userName]);

  const rows = useMemo(
    () =>
      loading && stored.length === 0
        ? []
        : rankStoredPlayers(
          stored,
          { userId: session.userId || "", name: session.userName || "You" },
          {
            mode: period === "month" ? "lifetime" : "season",
            gameKey: period === "month" ? null : "spud-run",
          },
        ),
    [loading, stored, session.userId, session.userName, period],
  );

  const top = rows.slice(0, 6);
  const youRow = rows.find((r) => r.isYou);
  const showYouBelow = youRow && !top.some((r) => r.isYou);

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#1a1f36] text-white">
      <img src={`${ART}/farm.jpg`} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover object-[50%_60%] blur-[3px]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B1020]/70 via-[#1B1440]/70 to-[#0B1020]/85" aria-hidden />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 [-webkit-overflow-scrolling:touch]" style={{ paddingTop: "var(--header-top)", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}>
        <div className="relative flex items-start justify-between">
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <img src={`${ART}/logo.webp`} alt="Potato Run" draggable={false} className="pointer-events-none absolute left-1/2 top-[-8px] w-[46%] max-w-[200px] -translate-x-1/2 object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.5)]" />
          <span className="w-10" />
        </div>

        <div className="mt-[22%] flex rounded-full bg-[#141A30]/85 p-1 ring-1 ring-white/12" role="tablist">
          {(
            [
              ["leaderboard", "Leaderboard"],
              ["rewards", "Rewards"],
            ] as [BoardTab, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex-1 rounded-full py-2 font-display text-[14px] font-extrabold transition ${tab === id ? "bg-white text-[#2D2A8A] shadow" : "text-white/80"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "leaderboard" ? (
          <>
            <div className="mt-3 flex gap-1.5">
              {PERIODS.map((p) => (
                <button key={p.id} type="button" onClick={() => setPeriod(p.id)} className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold ring-1 transition ${period === p.id ? "bg-gradient-to-b from-[#8B6CFF] to-[#5A3ED6] text-white ring-[#C6B6FF]/60" : "bg-[#141A30]/80 text-white/80 ring-white/12"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <ol className="run-result mt-3 space-y-1.5 rounded-[1.4rem] bg-white p-2 text-[#241A5E] shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              {loading && top.length === 0 ? (
                <li className="px-2 py-4 text-center text-[13px] font-bold text-[#8B84A8]">Loading points…</li>
              ) : null}
              {top.map((r) => (
                <BoardLine key={r.id} row={r} />
              ))}
              {showYouBelow && youRow ? (
                <>
                  <li className="text-center text-[11px] font-extrabold text-[#8B84A8]">· · ·</li>
                  <BoardLine row={youRow} />
                </>
              ) : null}
            </ol>
            <p className="mt-2 text-center text-[11px] font-bold text-white/70">
              {period === "month" ? "Ranked by stored points across all games" : "Ranked by stored Potato Run points"}
            </p>
          </>
        ) : (
          <>
            <ul className="run-result mt-3 space-y-2">
              {REWARD_TIERS.map((tier) => {
                const unlocked = state.lifetimePoints >= tier.points;
                const remaining = Math.max(0, tier.points - state.lifetimePoints);
                return (
                  <li key={tier.id} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 text-[#241A5E] shadow-[0_10px_26px_rgba(0,0,0,0.3)]">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F5F3FF]">
                      <img src={tier.image} alt="" draggable={false} className="h-12 w-12 object-contain" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[15px] font-extrabold">{tier.label}</span>
                      <span className="block text-[11px] font-bold text-[#8B84A8]">{tier.milestone.typeLabel} · {tier.points.toLocaleString("en-IN")} lifetime PB</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${unlocked ? "bg-[#DDF5E4] text-[#1E8A3E]" : "bg-[#F5F3FF] text-[#6A5AE0]"}`}>{unlocked ? "Unlocked" : `${remaining.toLocaleString("en-IN")} to go`}</span>
                  </li>
                );
              })}
            </ul>
            <Link href="/rewards" className="mt-3 block rounded-full bg-gradient-to-b from-[#FFE066] to-[#F5B400] py-3 text-center font-display text-[16px] font-extrabold text-[#3A2A00] shadow-[0_6px_0_#B8860B]">
              View all rewards
            </Link>
          </>
        )}

        <p className="mt-6 text-center font-script text-[18px] leading-snug text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          Run Higher.
          <br />
          Make a Brighter Tomorrow!
          <br />♥
        </p>
      </div>
    </div>
  );
}

function BoardLine({ row }: { row: BoardRow }) {
  if (row.isYou) {
    return (
      <li>
        <YouHighlightRow rank={row.rank} points={row.points} />
      </li>
    );
  }
  const medal = row.rank === 1 ? "bg-[#FFD84D] text-[#6B3A00]" : row.rank === 2 ? "bg-[#E2E6EF] text-[#3D4658]" : row.rank === 3 ? "bg-[#F2B27A] text-[#6B3A00]" : "bg-[#F5F3FF] text-[#6A5AE0]";
  return (
    <li className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${row.rank === 1 ? "bg-[#FFF3C4]" : "bg-[#F8F7FD]"}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-extrabold ${medal}`}>{row.rank}</span>
      <PlayerAvatar size="sm" ringClass="ring-white" />
      <span className="min-w-0 flex-1 truncate font-display text-[14px] font-extrabold text-[#241A5E]">{row.name}</span>
      <span className="shrink-0 font-display text-[14px] font-extrabold tabular-nums text-[#241A5E]">
        {row.points.toLocaleString("en-IN")} <span className="text-[#6A5AE0]">PB</span>
      </span>
    </li>
  );
}
