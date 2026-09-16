"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { BoardYouRow } from "@/components/leaderboard/LeaderboardRankRow";
import { PbHeader, PbStarIcon, PlayerAvatar } from "@/components/pb/PbUi";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { LEADERBOARD_GAMES, LEADERBOARD_TABS, gameLabel, isLeaderboardGame, type BoardRow, type LeaderboardTab } from "@/data/leaderboard";
import { PB_SEASON, type PbGameId } from "@/data/pbEconomy";
import {
  fetchLeaderboardPoints,
  gamePointsFromRow,
  rankStoredPlayers,
  seasonPointsFromRow,
  type StoredPlayerPoints,
} from "@/lib/leaderboardApi";
import { fetchQuizPoints } from "@/lib/quizApi";

const CROWN_IMAGES = {
  1: "/images/leaderboard/crown-gold-1.png",
  2: "/images/leaderboard/crown-silver-2.png?v=4",
  3: "/images/leaderboard/crown-bronze-3.png",
} as const;

const VISIBLE_ROWS = 12;

const PLACEHOLDER_ME_NAMES = new Set(["player", "potato player", "you", "anonymous", "guest"]);

const HERO_BG =
  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(156,140,255,0.55) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(106,90,224,0.5) 0%, transparent 60%), linear-gradient(160deg, #1D1552 0%, #2E2180 55%, #3D2E9E 100%)";

function emptyRow(place: number): BoardRow {
  return { id: `empty-${place}`, rank: place, name: "—", points: 0, movement: 0, isYou: false };
}

function PodiumCard({ row, place }: { row: BoardRow; place: 1 | 2 | 3 }) {
  const isFirst = place === 1;
  const tone = {
    1: { bg: "from-[#FFE58A] to-[#F5B800]", ring: "ring-[#F5C518]", text: "text-[#5A3D00]", height: "min-h-[8.5rem]" },
    2: { bg: "from-[#E9EEFF] to-[#C7D2F5]", ring: "ring-[#B8C8DC]", text: "text-[#2B3550]", height: "min-h-[7rem]" },
    3: { bg: "from-[#FFD9BE] to-[#E89A5C]", ring: "ring-[#F0A878]", text: "text-[#5A2E0A]", height: "min-h-[6.25rem]" },
  }[place];

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end">
      <div className={`relative z-10 ${isFirst ? "-mb-8" : "-mb-7"}`}>
        <div className={`relative ${isFirst ? "pt-9" : "pt-8"}`}>
          <PlayerAvatar size={isFirst ? "lg" : "md"} ringClass={row.isYou ? "ring-[#6A5AE0]" : tone.ring} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CROWN_IMAGES[place]}
            alt=""
            className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 object-contain drop-shadow ${isFirst ? "h-[2.9rem] w-[4.2rem]" : "h-[2.15rem] w-[3.5rem]"}`}
            draggable={false}
          />
        </div>
      </div>
      <div
        className={`relative z-0 flex w-full flex-col items-center rounded-2xl bg-gradient-to-b px-1.5 pt-9 shadow-[0_6px_16px_rgba(36,26,94,0.14)] ${tone.bg} ${tone.height} ${
          isFirst ? "pb-14" : "pb-12"
        }`}
      >
        <span className={`font-display text-[20px] font-extrabold leading-none ${tone.text}`}>{place}</span>
        <p className={`mt-1 w-full truncate text-center text-[12px] font-extrabold ${tone.text}`}>{row.isYou ? "You" : row.name}</p>
        <p className={`mt-0.5 text-[11px] font-bold tabular-nums ${tone.text} opacity-90`}>
          {row.points.toLocaleString("en-IN")} PB
        </p>
      </div>
    </div>
  );
}

function BoardRowItem({ row }: { row: BoardRow }) {
  return <BoardYouRow row={row} />;
}

export function PbLeaderboardScreen({ initialGame }: { initialGame?: string }) {
  const { userName, userId, token } = useUserSession();
  const [tab, setTab] = useState<LeaderboardTab>("season");
  const [game, setGame] = useState<PbGameId | null>(isLeaderboardGame(initialGame) ? initialGame : null);
  const [stored, setStored] = useState<StoredPlayerPoints[]>([]);
  const [meUserId, setMeUserId] = useState<string | null>(userId ? String(userId) : null);
  const [meLeaderboardPoints, setMeLeaderboardPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isSeason = tab === "season";
  const forGame = game !== null;

  const auth = useMemo(
    () => ({ token, userId, userName }),
    [token, userId, userName],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      fetchLeaderboardPoints(auth, { limit: 200 }),
      fetchQuizPoints(auth).catch(() => null),
    ])
      .then(([players, me]) => {
        if (cancelled) return;
        setStored(Array.isArray(players) ? players : []);
        if (me?.userId) setMeUserId(String(me.userId));
        else if (userId) setMeUserId(String(userId));
        setMeLeaderboardPoints(Math.max(0, Number(me?.leaderboardPoints) || 0));
      })
      .catch((err) => {
        if (cancelled) return;
        setStored([]);
        setLoadError(err instanceof Error ? err.message : "Could not load leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth, userId]);

  const resolvedMeId = meUserId || (userId ? String(userId) : "");

  const meStored = useMemo(() => {
    if (resolvedMeId) {
      const byId = stored.find((p) => String(p.userId) === String(resolvedMeId));
      if (byId) return byId;
    }
    const mine = (userName || "").trim().toLowerCase();
    if (!mine || PLACEHOLDER_ME_NAMES.has(mine)) return undefined;
    const matches = stored.filter((p) => (p.name || "").trim().toLowerCase() === mine);
    return matches.length === 1 ? matches[0] : undefined;
  }, [stored, resolvedMeId, userName]);

  const selectedPoints = useMemo(() => {
    if (meStored) {
      if (isSeason && game) return gamePointsFromRow(meStored, game);
      if (isSeason) {
        const season = seasonPointsFromRow(meStored);
        // Prefer live board total when per-game map is empty / out of sync
        return season > 0 ? season : meLeaderboardPoints;
      }
      return Math.max(0, Number(meStored.points) || meLeaderboardPoints || 0);
    }
    // Matched list row missing — still show me/points leadership total on All games / lifetime
    if (!game) return meLeaderboardPoints;
    return 0;
  }, [meStored, isSeason, game, meLeaderboardPoints]);

  const hasPlayed = selectedPoints > 0;

  // Always show this board's scores. Highlight "you" only if you've scored here.
  const rows = useMemo(
    () =>
      loading && stored.length === 0
        ? []
        : rankStoredPlayers(
            stored,
            { userId: resolvedMeId, name: userName || "You" },
            {
              mode: isSeason ? "season" : "lifetime",
              gameKey: isSeason ? game : null,
            },
          ),
    [loading, stored, resolvedMeId, userName, isSeason, game],
  );

  const youOnBoard = useMemo(() => {
    const marked = rows.find((r) => r.isYou);
    if (marked) return marked;
    if (!hasPlayed || !resolvedMeId) return undefined;
    return rows.find((r) => String(r.id) === String(resolvedMeId));
  }, [rows, hasPlayed, resolvedMeId]);
  const podium = [rows[0] ?? emptyRow(1), rows[1] ?? emptyRow(2), rows[2] ?? emptyRow(3)];
  // List from #4 up. Only pin "you" at the bottom when you're off the podium
  // (already visible on podium when rank ≤ 3 — no duplicate).
  const list = useMemo(() => {
    if (rows.length === 0) return [];
    if (rows.length <= 3) return [];
    const rest = rows.slice(3, Math.max(VISIBLE_ROWS, 3));
    const youOffPodium =
      youOnBoard &&
      youOnBoard.rank > 3 &&
      !rest.some((r) => r.isYou || String(r.id) === String(youOnBoard.id));
    if (youOffPodium) {
      return [...rest, youOnBoard];
    }
    return rest;
  }, [rows, youOnBoard]);
  const yourRank = youOnBoard?.rank ?? null;
  const yourPoints = selectedPoints;
  // Bottom "Your rank" card is for comparison when you're not already on the podium.
  const showYourRankCard = !loading && (!hasPlayed || yourRank == null || yourRank > 3);

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      {/* One continuous purple — header + scroll share it, scroll feels invisible */}
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: HERO_BG }} />

      {/* Fixed controls — transparent so same surface as content underneath */}
      <div className="relative z-40 shrink-0">
        <PbHeader title="PB Leaderboard" tone="dark" />
        <div className="mx-4 mt-1 mb-2 flex rounded-full bg-white/12 p-1 ring-1 ring-white/20">
          {LEADERBOARD_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  if (t.id === "lifetime") setGame(null);
                }}
                className={`flex-1 rounded-full py-2 text-[13px] font-extrabold transition ${active ? "bg-[#6A5AE0] text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]" : "text-white/80"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content scrolls under the fixed header on the same bg */}
      <div
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{ paddingBottom: "calc(7.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {isSeason ? (
          <div className="flex gap-1.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Game leaderboards">
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
        ) : (
          <div className="h-2" />
        )}

        <div className="mt-2 text-center text-white">
          {isSeason ? (
            <p className="font-display text-[17px] font-extrabold">
              {forGame && game ? `${gameLabel(game)} · ${PB_SEASON.label}` : `${PB_SEASON.label} · All games`}
            </p>
          ) : (
            <p className="font-display text-[17px] font-extrabold">Lifetime · Overall points</p>
          )}
        </div>

        <div className="relative z-10 mt-4 flex items-end gap-3 px-4 pb-2">
          <PodiumCard row={podium[1]} place={2} />
          <PodiumCard row={podium[0]} place={1} />
          <PodiumCard row={podium[2]} place={3} />
        </div>

        <div className="relative z-20 -mt-10 px-4">
          <div className="overflow-hidden rounded-[1.35rem] bg-white pb-2 pt-4 shadow-[0_8px_24px_rgba(36,26,94,0.10)]">
            <div className="divide-y divide-[#F1EEFA] px-1">
              {loading ? (
                <p className="px-3 py-6 text-center text-[13px] font-bold text-[#8B84A8]">Loading points…</p>
              ) : rows.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] font-bold text-[#8B84A8]">
                  {loadError || "No points yet. Finish a game to land on the board."}
                </p>
              ) : (
                list.map((row) => <BoardRowItem key={`${row.id}-${row.rank}`} row={row} />)
              )}
            </div>
          </div>

          <section className="mt-3 rounded-[1.35rem] bg-gradient-to-br from-[#EDE7FF] to-[#E1DBFF] p-4 shadow-[0_4px_18px_rgba(106,90,224,0.12)]">
            {showYourRankCard ? (
              <div className="flex items-center gap-3">
                <PlayerAvatar size="md" ringClass="ring-[#6A5AE0]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#6A5AE0]">Your rank</p>
                  <p className="font-display text-[26px] font-extrabold leading-none text-[#241A5E]">
                    {hasPlayed && yourRank != null ? `#${yourRank}` : "—"}
                  </p>
                  {forGame && game ? <p className="mt-0.5 text-[11px] font-bold text-[#6A5AE0]">{gameLabel(game)} board</p> : null}
                </div>
                <div className="text-right">
                  <p className="inline-flex items-center gap-1 font-display text-[20px] font-extrabold text-[#241A5E]">
                    <PbStarIcon className="h-5 w-5" />
                    {yourPoints.toLocaleString("en-IN")} PB
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#6B6488]">
                    {!hasPlayed
                      ? "Play to join this board"
                      : isSeason && forGame && game
                        ? `${gameLabel(game)} season points`
                        : isSeason
                          ? "Season points across all games"
                          : "Lifetime overall points"}
                  </p>
                </div>
              </div>
            ) : null}
            <div className={`grid grid-cols-2 gap-2 ${showYourRankCard ? "mt-3" : ""}`}>
              <Link href="/pb/prizes" className="flex items-center justify-center gap-1.5 rounded-full bg-[#6A5AE0] py-2.5 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgba(106,90,224,0.35)] active:scale-[0.98]">
                🏆 Season prizes
              </Link>
              <Link href="/profile" className="flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-[13px] font-extrabold text-[#6A5AE0] ring-1 ring-[#D4C8FF] active:scale-[0.98]">
                My PB profile
              </Link>
            </div>
          </section>

          <p className="mt-3 text-center text-[11px] font-semibold text-white/55">
            {isSeason && forGame && game
              ? `Ranked by ${gameLabel(game)} season points.`
              : isSeason
                ? "Ranked by season points across all games."
                : "Ranked by lifetime overall points."}
          </p>
          {!isSeason ? (
            <p className="mt-6 text-center font-script text-[15px] text-[#B8A9FF]">&ldquo;Bigger harvests build brighter tomorrows.&rdquo; ♥</p>
          ) : null}
        </div>
      </div>

      <AppBottomNav />
    </div>
  );
}
