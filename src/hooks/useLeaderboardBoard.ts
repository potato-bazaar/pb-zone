"use client";

import { useEffect, useState } from "react";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import {
  fetchLeaderboard,
  type LeaderboardBoard,
  type LeaderboardPeriod,
} from "@/lib/leaderboardApi";

export function useLeaderboardBoard(
  period: LeaderboardPeriod,
  limit: number,
) {
  const session = useUserSession();
  const [board, setBoard] = useState<LeaderboardBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchLeaderboard(
      {
        token: session.token,
        userId: session.userId,
        userName: session.userName,
      },
      { period, limit },
    )
      .then((data) => {
        if (cancelled) return;
        setBoard(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setBoard(null);
        setError(err instanceof Error ? err.message : "Could not load leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, limit, session.token, session.userId, session.userName]);

  return { board, error, loading };
}
