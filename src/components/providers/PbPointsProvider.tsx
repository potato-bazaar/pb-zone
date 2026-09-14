"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  milestoneProgress,
  newlyUnlockedMilestones,
  type LifetimeMilestone,
  type MilestoneProgress,
  type PbGameId,
} from "@/data/pbEconomy";
import { gameRankFor, lifetimeRankFor, seasonRankFor } from "@/data/leaderboard";
import {
  INITIAL_PB_POINTS,
  applyAward,
  loadPbPoints,
  normalizeState,
  savePbPoints,
  type PbAwardInput,
  type PbBreakdownLine,
  type PbPointsState,
} from "@/lib/pb/pbPoints";

/** What a game gets back after crediting a run. Drives the Game Complete UI. */
export type PbReceipt = {
  eventId: string;
  gameId: PbGameId;
  requested: number;
  applied: number;
  duplicate: boolean;
  cappedBy: "game" | "daily" | null;
  dailyRemaining: number;
  lines: PbBreakdownLine[];
  rankBefore: number;
  rankAfter: number;
  /** Rank on this game's own leaderboard. */
  gameRankBefore: number;
  gameRankAfter: number;
  gamePointsAfter: number;
  seasonPointsAfter: number;
  lifetimePointsAfter: number;
  unlocked: LifetimeMilestone[];
};

type PbPointsContextValue = {
  state: PbPointsState;
  hydrated: boolean;
  seasonRank: number;
  lifetimeRank: number;
  milestone: MilestoneProgress;
  awardPoints: (input: PbAwardInput) => PbReceipt;
};

const PbPointsContext = createContext<PbPointsContextValue>({
  state: INITIAL_PB_POINTS,
  hydrated: false,
  seasonRank: seasonRankFor(INITIAL_PB_POINTS.seasonPoints),
  lifetimeRank: lifetimeRankFor(INITIAL_PB_POINTS.lifetimePoints),
  milestone: milestoneProgress(INITIAL_PB_POINTS.lifetimePoints),
  awardPoints: () => {
    throw new Error("PbPointsProvider missing");
  },
});

export function PbPointsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PbPointsState>(INITIAL_PB_POINTS);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    // Hydrate from storage after mount (deferred so SSR and first client render match).
    const t = window.setTimeout(() => {
      const loaded = loadPbPoints();
      stateRef.current = loaded;
      setState(loaded);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const commit = useCallback((next: PbPointsState) => {
    stateRef.current = next;
    savePbPoints(next);
    setState(next);
  }, []);

  const awardPoints = useCallback(
    (input: PbAwardInput): PbReceipt => {
      const before = normalizeState(stateRef.current);
      const result = applyAward(input, before);
      const rankBefore = seasonRankFor(before.seasonPoints);
      const rankAfter = seasonRankFor(result.state.seasonPoints);
      const gamePointsBefore = before.gameSeasonPoints[input.gameId] ?? 0;
      const gamePointsAfter = result.state.gameSeasonPoints[input.gameId] ?? 0;
      const gameRankBefore = gameRankFor(input.gameId, gamePointsBefore);
      const gameRankAfter = gameRankFor(input.gameId, gamePointsAfter);
      const unlocked = newlyUnlockedMilestones(before.lifetimePoints, result.state.lifetimePoints);

      const at = new Date().toISOString();
      let next: PbPointsState = result.state;
      if (result.applied > 0 && rankAfter !== rankBefore) {
        next = { ...next, lastMovement: { from: rankBefore, to: rankAfter, at } };
      }
      if (result.applied > 0 && gameRankAfter !== gameRankBefore) {
        next = { ...next, gameMovement: { ...next.gameMovement, [input.gameId]: { from: gameRankBefore, to: gameRankAfter, at } } };
      }
      commit(next);

      return {
        eventId: input.eventId,
        gameId: input.gameId,
        requested: result.requested,
        applied: result.applied,
        duplicate: result.duplicate,
        cappedBy: result.cappedBy,
        dailyRemaining: result.dailyRemaining,
        lines: input.lines,
        rankBefore,
        rankAfter,
        gameRankBefore,
        gameRankAfter,
        gamePointsAfter,
        seasonPointsAfter: next.seasonPoints,
        lifetimePointsAfter: next.lifetimePoints,
        unlocked,
      };
    },
    [commit],
  );

  const value = useMemo<PbPointsContextValue>(
    () => ({
      state,
      hydrated,
      seasonRank: seasonRankFor(state.seasonPoints),
      lifetimeRank: lifetimeRankFor(state.lifetimePoints),
      milestone: milestoneProgress(state.lifetimePoints),
      awardPoints,
    }),
    [state, hydrated, awardPoints],
  );

  return <PbPointsContext.Provider value={value}>{children}</PbPointsContext.Provider>;
}

export function usePbPoints() {
  return useContext(PbPointsContext);
}
