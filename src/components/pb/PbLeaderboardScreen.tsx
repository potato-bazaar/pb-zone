"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { MovementBadge, PbHeader, PbStarIcon, PlayerAvatar } from "@/components/pb/PbUi";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { LEADERBOARD_GAMES, LEADERBOARD_TABS, buildBoard, gameLabel, gameRankFor, isLeaderboardGame, type BoardRow, type LeaderboardTab } from "@/data/leaderboard";
import { PB_SEASON, seasonDaysRemaining, type PbGameId } from "@/data/pbEconomy";

const CROWN_IMAGES = {
  1: "/images/leaderboard/crown-gold-1.png",
  2: "/images/leaderboard/crown-silver-2.png",
  3: "/images/leaderboard/crown-bronze-3.png",
} as const;

const VISIBLE_ROWS = 12;

function PodiumCard({ row, place }: { row: BoardRow; place: 1 | 2 | 3 }) {
  const isFirst = place === 1;
  const tone = {
    1: { bg: "from-[#FFE58A] to-[#F5B800]", ring: "ring-[#F5C518]", text: "text-[#5A3D00]", height: "min-h-[6.5rem]" },
    2: { bg: "from-[#E9EEFF] to-[#C7D2F5]", ring: "ring-[#B8C8DC]", text: "text-[#2B3550]", height: "min-h-[5rem]" },
    3: { bg: "from-[#FFD9BE] to-[#E89A5C]", ring: "ring-[#F0A878]", text: "text-[#5A2E0A]", height: "min-h-[4.5rem]" },
  }[place];

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end">
      <div className={`relative z-10 ${isFirst ? "-mb-8" : "-mb-7"}`}>
        <div className={`relative ${isFirst ? "pt-9" : "pt-7"}`}>
          <PlayerAvatar size={isFirst ? "lg" : "md"} ringClass={row.isYou ? "ring-[#6A5AE0]" : tone.ring} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CROWN_IMAGES[place]}
            alt=""
            className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 object-contain drop-shadow ${isFirst ? "h-[2.9rem] w-[4.2rem]" : "h-[1.9rem] w-[3.3rem] top-1.5"}`}
            draggable={false}
          />
        </div>
      </div>
      <div className={`flex w-full flex-col items-center justify-end rounded-2xl bg-gradient-to-b px-1.5 pb-3 pt-9 shadow-[0_6px_16px_rgba(36,26,94,0.14)] ${tone.bg} ${tone.height}`}>
        <span className={`font-display text-[20px] font-extrabold leading-none ${tone.text}`}>{place}</span>
        <p className={`mt-1 w-full truncate text-center text-[12px] font-extrabold ${tone.text}`}>{row.isYou ? "You" : row.name}</p>
        <p className={`text-[11px] font-bold tabular-nums ${tone.text} opacity-80`}>{row.points.toLocaleString("en-IN")} PB</p>
      </div>
    </div>
  );
}

function BoardRowItem({ row, showMovement }: { row: BoardRow; showMovement: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 ${row.isYou ? "rounded-2xl bg-[#FFF6D6] ring-1 ring-[#FFE082]" : ""}`}>
      <span className={`w-6 shrink-0 text-center font-display text-[14px] font-extrabold ${row.isYou ? "text-[#8A5A00]" : "text-[#3D3A5C]"}`}>{row.rank}</span>
      <PlayerAvatar size="sm" ringClass={row.isYou ? "ring-[#F5C518]" : "ring-[#EDE7FF]"} />
      <p className={`min-w-0 flex-1 truncate text-[14px] font-extrabold ${row.isYou ? "text-[#241A5E]" : "text-[#241A5E]"}`}>{row.isYou ? "You" : row.name}</p>
      <span className={`shrink-0 text-[13px] font-extrabold tabular-nums ${row.isYou ? "text-[#241A5E]" : "text-[#3D2E7A]"}`}>
        {row.points.toLocaleString("en-IN")} <span className="text-[#6A5AE0]">PB</span>
      </span>
      {showMovement ? (
        <span className="w-9 shrink-0 text-right">
          <MovementBadge delta={row.movement} />
        </span>
      ) : null}
    </div>
  );
}

export function PbLeaderboardScreen({ initialGame }: { initialGame?: string }) {
  const { userName } = useUserSession();
  const { state, seasonRank, lifetimeRank } = usePbPoints();
  const [tab, setTab] = useState<LeaderboardTab>("season");
  const [game, setGame] = useState<PbGameId | null>(isLeaderboardGame(initialGame) ? initialGame : null);
  const daysLeft = seasonDaysRemaining();

  const yourMovement = state.lastMovement ? state.lastMovement.from - state.lastMovement.to : 0;
  const gameMovement = useMemo(() => {
    const out: Partial<Record<PbGameId, number>> = {};
    for (const [id, mv] of Object.entries(state.gameMovement) as [PbGameId, { from: number; to: number }][]) out[id] = mv.from - mv.to;
    return out;
  }, [state.gameMovement]);

  const rows = useMemo(
    () =>
      buildBoard(
        tab,
        {
          name: userName || "You",
          seasonPoints: state.seasonPoints,
          lifetimePoints: state.lifetimePoints,
          gameSeasonPoints: state.gameSeasonPoints,
          movement: yourMovement,
          gameMovement,
        },
        game,
      ),
    [tab, game, userName, state.seasonPoints, state.lifetimePoints, state.gameSeasonPoints, yourMovement, gameMovement],
  );

  const you = rows.find((r) => r.isYou)!;
  const podium = rows.slice(0, 3);
  const list = rows.slice(3, Math.max(VISIBLE_ROWS, 3));
  const youVisible = you.rank <= VISIBLE_ROWS;
  const isSeason = tab === "season";
  const forGame = isSeason && game !== null;
  const yourGamePoints = game ? (state.gameSeasonPoints[game] ?? 0) : 0;
  const yourRank = forGame && game ? gameRankFor(game, yourGamePoints) : isSeason ? seasonRank : lifetimeRank;
  const yourPoints = forGame ? yourGamePoints : isSeason ? state.seasonPoints : state.lifetimePoints;
  const yourDelta = forGame && game ? (gameMovement[game] ?? 0) : yourMovement;
  const hasMovement = forGame && game ? !!state.gameMovement[game] : !!state.lastMovement;

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm bg-[#F5F3FF]">
      <div className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]" style={{ paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))" }}>
        {/* Hero */}
        <div className="relative overflow-hidden bg-[#2A1E6E] pb-6">
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(156,140,255,0.55) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(106,90,224,0.5) 0%, transparent 60%), linear-gradient(160deg, #1D1552 0%, #2E2180 55%, #3D2E9E 100%)",
            }}
          />
          {["#FF8A3D", "#F5C518", "#FF6BCB", "#5EEAD4", "#B39DFF", "#4ADE80"].map((c, i) => (
            <span
              key={i}
              className="pointer-events-none absolute h-2 w-3 rounded-sm opacity-80"
              style={{ backgroundColor: c, left: `${8 + ((i * 17) % 85)}%`, top: `${28 + ((i * 23) % 55)}%`, transform: `rotate(${i * 40}deg)` }}
              aria-hidden
            />
          ))}

          <div className="relative z-10">
            <PbHeader
              title="PB Leaderboard"
              backHref="/home"
              tone="dark"
              right={
                <Link href="/pb/prizes" aria-label="How it works" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8h.01" />
                  </svg>
                </Link>
              }
            />

            {/* Season / Lifetime toggle */}
            <div className="mx-4 mt-1 flex rounded-full bg-white/12 p-1 ring-1 ring-white/20">
              {LEADERBOARD_TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex-1 rounded-full py-2 text-[13px] font-extrabold transition ${active ? "bg-[#6A5AE0] text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]" : "text-white/80"}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {isSeason ? (
              <div className="mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Game leaderboards">
                {[null, ...LEADERBOARD_GAMES].map((g) => {
                  const active = game === g;
                  return (
                    <button
                      key={g ?? "all"}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setGame(g)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-extrabold transition ${active ? "bg-[#F5C518] text-[#4A3300] shadow-[0_4px_12px_rgba(0,0,0,0.25)]" : "bg-white/12 text-white/85 ring-1 ring-white/20"}`}
                    >
                      {g ? gameLabel(g) : "All games"}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-4 text-center text-white">
              {isSeason ? (
                <>
                  <p className="font-display text-[18px] font-extrabold">{forGame && game ? `${gameLabel(game)} · ${PB_SEASON.label}` : PB_SEASON.label}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[12px] font-bold text-white/90">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                      <rect x="3.5" y="5" width="17" height="15" rx="2" />
                      <path d="M3.5 10h17M8 3.5V7M16 3.5V7" />
                    </svg>
                    {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-[18px] font-extrabold">All-time PB Legends</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-white/80">Lifetime PB never resets with the season.</p>
                </>
              )}
            </div>

            {/* Podium */}
            <div className="mt-5 flex items-end gap-2 px-4">
              <PodiumCard row={podium[1]} place={2} />
              <PodiumCard row={podium[0]} place={1} />
              <PodiumCard row={podium[2]} place={3} />
            </div>
          </div>
        </div>

        <div className="px-4">
          {/* List */}
          <div className="relative z-20 -mt-4 overflow-hidden rounded-[1.35rem] bg-white pb-2 pt-2 shadow-[0_8px_24px_rgba(36,26,94,0.10)]">
            <div className="flex items-center gap-3 px-3 pb-1 pt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8B84A8]">
              <span className="w-6 text-center">#</span>
              <span className="w-9" />
              <span className="flex-1">Player</span>
              <span>{forGame ? "Game PB" : isSeason ? "Season PB" : "Lifetime PB"}</span>
              {isSeason ? <span className="w-9 text-right">Δ</span> : null}
            </div>
            <div className="divide-y divide-[#F1EEFA] px-1">
              {list.map((row) => (
                <BoardRowItem key={row.id} row={row} showMovement={isSeason} />
              ))}
              {!youVisible ? (
                <>
                  <div className="py-1 text-center text-[16px] leading-none text-[#B8B0D8]">⋮</div>
                  <BoardRowItem row={you} showMovement={isSeason} />
                </>
              ) : null}
            </div>
          </div>

          {/* Your rank card */}
          <section className="mt-3 rounded-[1.35rem] bg-gradient-to-br from-[#EDE7FF] to-[#E1DBFF] p-4 shadow-[0_4px_18px_rgba(106,90,224,0.12)]">
            <div className="flex items-center gap-3">
              <PlayerAvatar size="md" ringClass="ring-[#6A5AE0]" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#6A5AE0]">Your rank</p>
                <p className="font-display text-[26px] font-extrabold leading-none text-[#241A5E]">#{yourRank}</p>
                {forGame && game ? <p className="mt-0.5 text-[11px] font-bold text-[#6A5AE0]">{gameLabel(game)} board</p> : null}
              </div>
              <div className="text-right">
                <p className="inline-flex items-center gap-1 font-display text-[20px] font-extrabold text-[#241A5E]">
                  <PbStarIcon className="h-5 w-5" />
                  {yourPoints.toLocaleString("en-IN")} PB
                </p>
                {isSeason && hasMovement ? (
                  <p className="mt-0.5 text-[11px] font-bold text-[#3D2E7A]">
                    <MovementBadge delta={yourDelta} /> since last game
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] font-semibold text-[#6B6488]">{isSeason ? "Play a game to move up" : "Permanent achievement"}</p>
                )}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/pb/prizes" className="flex items-center justify-center gap-1.5 rounded-full bg-[#6A5AE0] py-2.5 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgba(106,90,224,0.35)] active:scale-[0.98]">
                🏆 Season prizes
              </Link>
              <Link href="/profile" className="flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-[13px] font-extrabold text-[#6A5AE0] ring-1 ring-[#D4C8FF] active:scale-[0.98]">
                My PB profile
              </Link>
            </div>
          </section>

          <p className="mt-3 text-center text-[11px] font-semibold text-[#9CA3AF]">
            {forGame && game ? `Ranked by Season PB earned in ${gameLabel(game)}. Coins never affect rank.` : isSeason ? "Ranked by Season PB Points. Coins never affect rank." : "Ranked by Lifetime PB Points."}
          </p>
          {!isSeason ? (
            <p className="mt-6 text-center font-script text-[15px] text-[#6A5AE0]">&ldquo;Bigger harvests build brighter tomorrows.&rdquo; ♥</p>
          ) : null}
        </div>
      </div>

      <AppBottomNav />
    </div>
  );
}
