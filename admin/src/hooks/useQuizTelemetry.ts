import { useCallback, useEffect, useState } from 'react';
import {
  QuizBankApiError,
  fetchQuizTelemetry,
  type QuizTelemetry,
} from '../services/quizBankApi';

const EMPTY: QuizTelemetry = {
  questionsPerQuiz: 12,
  playerCount: 0,
  sessionCount: 0,
  completedSessions: 0,
  winnersCount: 0,
  winRatePercentage: 0,
  completionRatePercentage: 0,
  averageScore: 0,
  averageTimeMinutes: 0,
  topWinnerName: null,
  topWinnerPoints: 0,
  questionStats: [],
  players: [],
};

export function useQuizTelemetry(enabled: boolean) {
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuizTelemetry>(EMPTY);

  const refresh = useCallback(
    async (silent = false) => {
      if (!enabled) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const next = await fetchQuizTelemetry();
        setData(next);
      } catch (err) {
        setError(
          err instanceof QuizBankApiError || err instanceof Error
            ? err.message
            : 'Failed to load quiz telemetry',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    void refresh(false);
    const id = window.setInterval(() => void refresh(true), 10000);
    return () => window.clearInterval(id);
  }, [enabled, refresh]);

  return { loading, refreshing, error, data, refresh };
}
