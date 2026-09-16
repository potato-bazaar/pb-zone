"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { MilestoneProgressBar, PbStarIcon, PlayerAvatar, SectionCard } from "@/components/pb/PbUi";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { PB_GAME_LABELS, pbTitleFor, type PbGameId } from "@/data/pbEconomy";
import { isLeaderboardGame } from "@/data/leaderboard";
import {
  fetchLeaderboardPoints,
  fetchMyLeaderboard,
  gamePointsFromRow,
  rankStoredPlayers,
  type StoredPlayerPoints,
} from "@/lib/leaderboardApi";
import { fetchQuizPoints } from "@/lib/quizApi";

const GAME_EMOJI: Partial<Record<PbGameId, string>> = {
  "quiz-time": "🎓",
  "potato-crush": "🥔",
  "potato-ninja": "🔪",
  "potato-sort": "🧺",
  "word-scramble": "🔤",
  "guess-disease": "🌱",
  "fix-puzzle": "🧩",
  "spud-run": "🏃",
  "daily-challenge": "📅",
};

function gameBoardHref(id: PbGameId) {
  return `/pb?game=${id}`;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function PbProfileScreen() {
  const { userName, userId, token } = useUserSession();
  const { state, milestone } = usePbPoints();
  const { earnedCoins, bonusCoins, setWallet } = usePbCoins();
  const [stored, setStored] = useState<StoredPlayerPoints[] | null>(null);
  const [leadership, setLeadership] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [walletReady, setWalletReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const auth = { token, userId, userName };

    void Promise.all([
      fetchQuizPoints(auth).catch(() => null),
      fetchMyLeaderboard(auth, "overall").catch(() => null),
      fetchLeaderboardPoints(auth, { limit: 200 }).catch(() => null),
    ]).then(([wallet, board, players]) => {
      if (cancelled) return;
      if (wallet) {
        setWallet({
          coins: wallet.points,
          earnedCoins: wallet.earnedPoints,
          pbPoints: wallet.leaderboardPoints,
        });
      }
      const liveLeadership = Number(board?.me?.points ?? wallet?.leaderboardPoints ?? 0);
      setLeadership(Number.isFinite(liveLeadership) ? Math.max(0, Math.floor(liveLeadership)) : 0);
      const liveRank = board?.me?.rank;
      setRank(typeof liveRank === "number" && liveRank > 0 ? liveRank : null);
      setStored(Array.isArray(players) ? players : null);
      setWalletReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [token, userId, userName, setWallet]);

  const live = useMemo(() => {
    if (!stored) return null;
    const ranked = rankStoredPlayers(stored, { userId: userId || "", name: userName || "You" }, { mode: "season" });
    const me = ranked.find((row) => row.isYou);
    const meRow = stored.find((row) => row.userId === userId);
    const games = Object.keys(PB_GAME_LABELS)
      .filter((id): id is PbGameId => isLeaderboardGame(id))
      .map((gameId) => {
        const points = meRow ? gamePointsFromRow(meRow, gameId) : 0;
        const ahead = stored.filter((row) => gamePointsFromRow(row, gameId) > points).length;
        return { gameId, points, rank: ahead + 1 };
      })
      .filter((game) => game.points > 0)
      .sort((a, b) => b.points - a.points);
    return { points: me?.points ?? 0, rank: me?.rank ?? ranked.length, games };
  }, [stored, userId, userName]);

  const shownRank = rank ?? live?.rank ?? null;
  const title = pbTitleFor(leadership || state.lifetimePoints);

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#F5F3FF]">
      {/* Hero under the sheet — so the curve stays visible on top of the farm */}
      <div className="relative z-30 shrink-0">
        <div className="quiz-farm absolute inset-0" aria-hidden />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#241A5E]/55 via-[#241A5E]/25 to-transparent"
          aria-hidden
        />
        <div className="relative px-4 pb-10" style={{ paddingTop: "var(--header-top)" }}>
          <h1 className="text-center font-display text-[20px] font-extrabold text-white drop-shadow">
            My PB Profile
          </h1>
          <div className="mt-3 flex flex-col items-center">
            <PlayerAvatar size="xl" ringClass="ring-white" />
            <h2 className="mt-3 font-display text-[24px] font-extrabold text-white drop-shadow">
              {userName || "Potato Player"}
            </h2>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#6A5AE0] px-3 py-1 text-[12px] font-extrabold text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
              <PbStarIcon className="h-4 w-4" />
              {title}
            </span>
          </div>
        </div>
      </div>

      {/* Curved sheet on top — scroll clips content under the rounded edge */}
      <div
        className="relative z-40 -mt-7 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-[#F5F3FF] px-4 pt-5 [-webkit-overflow-scrolling:touch]"
        style={{ paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
          {/* Stats */}
          <div className="space-y-3.5">
          <SectionCard className="grid grid-cols-3 divide-x divide-[#F1EEFA] p-0 py-3">
            <div className="px-2 text-center">
              <p className="text-[11px] font-bold text-[#8B84A8]">Earned PB Coins</p>
              <p className="mt-1 flex items-center justify-center gap-1 font-display text-[24px] font-extrabold text-[#241A5E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/home/coin-transparent.png" alt="" className="h-6 w-6 object-contain" draggable={false} />
                <span className="tabular-nums">{walletReady ? earnedCoins.toLocaleString("en-IN") : "—"}</span>
              </p>
              <p className="text-[10px] font-semibold text-[#8B84A8]">for rewards</p>
            </div>
            <div className="px-2 text-center">
              <p className="text-[11px] font-bold text-[#8B84A8]">Rank</p>
              <p className="mt-1 font-display text-[24px] font-extrabold text-[#6A5AE0]">
                {walletReady ? (shownRank != null ? `#${shownRank}` : "—") : "—"}
              </p>
              <p className="text-[10px] font-semibold text-[#8B84A8]">leaderboard</p>
            </div>
            <div className="px-2 text-center">
              <p className="text-[11px] font-bold text-[#8B84A8]">Bonus Coins</p>
              <p className="mt-1 flex items-center justify-center gap-1 font-display text-[24px] font-extrabold text-[#241A5E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/home/coin-transparent.png" alt="" className="h-6 w-6 object-contain" draggable={false} />
                <span className="tabular-nums">{walletReady ? bonusCoins.toLocaleString("en-IN") : "—"}</span>
              </p>
              <p className="text-[10px] font-semibold text-[#8B84A8]">welcome bonus</p>
            </div>
          </SectionCard>

          {/* Next milestone */}
          <Link href="/rewards" className="block">
            <SectionCard className="flex items-center gap-3 bg-gradient-to-br from-[#FFF6D6] to-[#FFEFC2] ring-1 ring-[#FFE082]">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[28px] shadow-inner">
                {milestone.next ? (
                  milestone.next.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={milestone.next.image} alt="" className="h-12 w-12 object-contain" draggable={false} />
                  ) : (
                    milestone.next.emoji
                  )
                ) : (
                  "🏆"
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A5A00]">Next milestone</p>
                <MilestoneProgressBar lifetimePoints={state.lifetimePoints} compact />
              </div>
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#8A5A00]" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </SectionCard>
          </Link>

          {/* Top games this season */}
          <SectionCard>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[16px] font-extrabold text-[#241A5E]">Top Games This Season</h3>
              <Link href="/pb" className="text-[12px] font-extrabold text-[#6A5AE0]">
                Leaderboards ›
              </Link>
            </div>
            {(live?.games.length ?? 0) === 0 ? (
              <p className="mt-2 text-[13px] font-semibold text-[#8B84A8]">Play a game to see where your PB comes from.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#F1EEFA]">
                {live!.games.map((game, i) => (
                  <li key={game.gameId}>
                    <Link href={gameBoardHref(game.gameId)} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDE7FF] text-[20px]">{GAME_EMOJI[game.gameId] ?? "🎮"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-extrabold text-[#241A5E]">
                          {PB_GAME_LABELS[game.gameId]} {i === 0 ? <span aria-label="Best game">👑</span> : null}
                        </span>
                        <span className="block text-[11px] font-bold text-[#6A5AE0]">
                          #{game.rank} on the {PB_GAME_LABELS[game.gameId]} board
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-[#3D2E7A]">
                        {game.points.toLocaleString("en-IN")} <span className="text-[#6A5AE0]">PB</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Recent PB activity */}
          <SectionCard>
            <h3 className="font-display text-[16px] font-extrabold text-[#241A5E]">Recent PB</h3>
            {state.history.length === 0 ? (
              <p className="mt-2 text-[13px] font-semibold text-[#8B84A8]">Your PB history appears here after your first game.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#F1EEFA]">
                {state.history.slice(0, 6).map((ev) => (
                  <li key={ev.eventId} className="flex items-center gap-3 py-2">
                    <span className="text-[18px]">{GAME_EMOJI[ev.gameId] ?? "🎮"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-extrabold text-[#241A5E]">{ev.label}</p>
                      <p className="text-[11px] font-semibold text-[#8B84A8]">
                        {relativeTime(ev.at)}
                        {ev.applied < ev.requested ? ` · capped (${ev.requested} earned)` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[13px] font-extrabold tabular-nums ${ev.applied > 0 ? "text-[#6A5AE0]" : "text-[#8B84A8]"}`}>+{ev.applied} PB</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Today */}
          <SectionCard className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#8B84A8]">PB earned today</p>
              <p className="font-display text-[20px] font-extrabold text-[#241A5E]">
                {state.dailyPointsEarned.toLocaleString("en-IN")} <span className="text-[13px] text-[#8B84A8]">/ 1,000</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#8B84A8]">Perfect runs</p>
              <p className="font-display text-[20px] font-extrabold text-[#241A5E]">{state.perfectRuns}</p>
            </div>
          </SectionCard>

          <div className="grid grid-cols-2 gap-2 pb-2">
            <Link href="/pb" className="flex items-center justify-center rounded-full bg-[#6A5AE0] py-3 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgba(106,90,224,0.35)] active:scale-[0.98]">
              🏆 Leaderboard
            </Link>
            <Link href="/orders" className="flex items-center justify-center rounded-full bg-white py-3 text-[13px] font-extrabold text-[#6A5AE0] ring-1 ring-[#D4C8FF] active:scale-[0.98]">
              🛍️ Your Orders
            </Link>
          </div>
          </div>
      </div>

      <AppBottomNav />
    </div>
  );
}
