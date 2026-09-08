import { useCallback, useEffect, useState } from 'react';
import { QuizQuestion } from '../types/quiz';
import {
  QuizBankApiError,
  bankQuestionToQuizQuestion,
  deleteBankQuestion,
  fetchAllQuestionBank,
  fetchQuestionBankStats,
  fetchQuizPlayStats,
  fetchQuizSettings,
  runDailyQuestionRefresh,
  type QuizApiSettings,
  type QuizPlayStats,
} from '../services/quizBankApi';

export function useLiveQuestionBank(enabled: boolean) {
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [settings, setSettings] = useState<QuizApiSettings | null>(null);
  const [upstream, setUpstream] = useState<string | null>(null);
  const [source, setSource] = useState<'bank' | 'unavailable'>('bank');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshingDaily, setRefreshingDaily] = useState(false);
  const [playStats, setPlayStats] = useState<QuizPlayStats>({
    playerCount: 0,
    sessionCount: 0,
    winnersCount: 0,
    topWinnerName: null,
    topWinnerCount: 0,
  });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [stats, quizSettings, nextPlayStats] = await Promise.all([
        fetchQuestionBankStats().catch(() => null),
        fetchQuizSettings().catch(() => null),
        fetchQuizPlayStats().catch(() => null),
      ]);
      setSettings(quizSettings);
      setActive(stats?.active ?? 0);
      setTotal(stats?.active ?? stats?.total ?? 0);
      if (nextPlayStats) setPlayStats(nextPlayStats);

      const page = await fetchAllQuestionBank({ isActive: true });
      setSource('bank');
      setUpstream(page.upstream ?? null);
      setQuestions(
        page.questions.map((row, index) => bankQuestionToQuizQuestion(row, index, quizSettings)),
      );
      setTotal(page.total || stats?.active || page.questions.length);
      setActive(stats?.active ?? page.total);
    } catch (err) {
      setQuestions([]);
      setSource('unavailable');
      if (err instanceof QuizBankApiError && err.status === 404) {
        setError(
          'List/delete APIs are not on this quiz server yet (GET/DELETE /v1/admin/quiz-question-bank/questions). Deploy the latest PB-ZONE-BE, then refresh.',
        );
      } else {
        setError(
          err instanceof QuizBankApiError || err instanceof Error
            ? err.message
            : 'Failed to load live question bank',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const removeQuestion = useCallback(async (questionId: string) => {
    setDeletingId(questionId);
    setError(null);
    try {
      await deleteBankQuestion(questionId);
      setQuestions((current) =>
        current
          .filter((row) => row.id !== questionId)
          .map((row, index) => ({ ...row, order: index + 1 })),
      );
      setActive((count) => Math.max(0, count - 1));
      setTotal((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(
        err instanceof QuizBankApiError || err instanceof Error
          ? err.message
          : 'Failed to delete question',
      );
      throw err;
    } finally {
      setDeletingId(null);
    }
  }, []);

  const runDailyRefresh = useCallback(async () => {
    setRefreshingDaily(true);
    setError(null);
    try {
      await runDailyQuestionRefresh();
      await refresh();
    } catch (err) {
      setError(
        err instanceof QuizBankApiError || err instanceof Error
          ? err.message
          : 'Failed to run daily question refresh',
      );
      throw err;
    } finally {
      setRefreshingDaily(false);
    }
  }, [refresh]);

  return {
    loading,
    error,
    questions,
    total,
    active,
    settings,
    upstream,
    source,
    sessionId: null as string | null,
    deletingId,
    refreshingDaily,
    playStats,
    refresh,
    removeQuestion,
    runDailyRefresh,
  };
}
