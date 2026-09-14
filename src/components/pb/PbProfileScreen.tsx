"use client";

import Link from "next/link";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { MilestoneProgressBar, MovementBadge, PbHeader, PbStarIcon, PlayerAvatar, SectionCard } from "@/components/pb/PbUi";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { PB_GAME_LABELS, PB_SEASON, pbTitleFor, type PbGameId } from "@/data/pbEconomy";
import { gameRankFor } from "@/data/leaderboard";
import { topGamesThisSeason } from "@/lib/pb/pbPoints";

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
  const { userName } = useUserSession();
  const { state, seasonRank, milestone } = usePbPoints();
  const topGames = topGamesThisSeason(state);
  const title = pbTitleFor(state.lifetimePoints);

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm bg-[#F5F3FF]">
      <div className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]" style={{ paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="quiz-farm relative overflow-hidden pb-6">
          <div className="absolute inset-0 bg-gradient-to-b from-[#241A5E]/55 via-[#241A5E]/25 to-[#F5F3FF]" aria-hidden />
          <div className="relative z-10">
            <PbHeader
              title="My PB Profile"
              backHref="/home"
              tone="dark"
              right={
                <Link href="/orders" aria-label="Your orders" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="5" y="4" width="14" height="17" rx="2" />
                    <path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7M9 11h6M9 15h4" />
                  </svg>
                </Link>
              }
            />
            <span className="pointer-events-none absolute right-5 top-[6.5rem] text-right font-script text-[13px] leading-tight text-white drop-shadow" aria-hidden>
              Play
              <br />
              Learn
              <br />
              Grow ♥
            </span>
            <div className="mt-2 flex flex-col items-center">
              <PlayerAvatar size="xl" ringClass="ring-white" />
              <h2 className="mt-3 font-display text-[24px] font-extrabold text-white drop-shadow">{userName || "Potato Player"}</h2>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#6A5AE0] px-3 py-1 text-[12px] font-extrabold text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
                <PbStarIcon className="h-4 w-4" />
                {title}
              </span>
            </div>
          </div>
        </div>

        <div className="-mt-2 space-y-3 px-4">
          {/* Stats */}
          <SectionCard className="grid grid-cols-3 divide-x divide-[#F1EEFA] p-0 py-3">
            <div className="px-2 text-center">
              <p className="text-[11px] font-bold text-[#8B84A8]">Season Rank</p>
              <p className="font-display text-[24px] font-extrabold text-[#241A5E]">#{seasonRank}</p>
              {state.lastMovement ? <MovementBadge delta={state.lastMovement.from - state.lastMovement.to} /> : null}
            </div>
            <div className="px-2 text-center">
              <p className="text-[11px] font-bold text-[#8B84A8]">Season PB</p>
              <p className="font-display text-[24px] font-extrabold text-[#6A5AE0]">{state.seasonPoints.toLocaleString("en-IN")}</p>
              <p className="text-[10px] font-semibold text-[#8B84A8]">{PB_SEASON.label}</p>
            </div>
            <div className="px-2 text-center">
              <p className="text-[11px] font-bold text-[#8B84A8]">Lifetime PB</p>
              <p className="font-display text-[24px] font-extrabold text-[#241A5E]">{state.lifetimePoints.toLocaleString("en-IN")}</p>
              <p className="text-[10px] font-semibold text-[#8B84A8]">never resets</p>
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
            {topGames.length === 0 ? (
              <p className="mt-2 text-[13px] font-semibold text-[#8B84A8]">Play a game to see where your PB comes from.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#F1EEFA]">
                {topGames.map(([gameId, pts], i) => (
                  <li key={gameId}>
                    <Link href={gameBoardHref(gameId)} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDE7FF] text-[20px]">{GAME_EMOJI[gameId] ?? "🎮"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-extrabold text-[#241A5E]">
                          {PB_GAME_LABELS[gameId]} {i === 0 ? <span aria-label="Best game">👑</span> : null}
                        </span>
                        <span className="block text-[11px] font-bold text-[#6A5AE0]">
                          #{gameRankFor(gameId, pts)} on the {PB_GAME_LABELS[gameId]} board
                          {state.gameMovement[gameId] ? <> · <MovementBadge delta={state.gameMovement[gameId]!.from - state.gameMovement[gameId]!.to} /></> : null}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-[#3D2E7A]">
                        {pts.toLocaleString("en-IN")} <span className="text-[#6A5AE0]">PB</span>
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
