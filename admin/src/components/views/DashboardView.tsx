import React, { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Game, WinnerRecord } from '../../types/quiz';
import {
  fetchQuestionBankStats,
  fetchQuizPlayStats,
  fetchQuizTelemetry,
  type QuizBankStats,
  type QuizPlayStats,
  type QuizTelemetry,
} from '../../services/quizBankApi';
import { formatNumber } from '../../lib/utils';
import { activityTrend, growthTrend } from '../../lib/dashboardTrends';
import { DashboardHero, type RangeId } from '../dashboard/DashboardHero';
import { KpiCard, type KpiCardProps } from '../dashboard/KpiCard';
import { GamePerformanceTable, type GamePerformanceRow } from '../dashboard/GamePerformanceTable';
import { GAME_VISUALS } from '../dashboard/gameVisuals';
import { ClaimSolid, GamepadSolid, GiftSolid, PlaySolid, QuestionSolid, UsersSolid } from '../dashboard/dashboardIcons';

interface DashboardViewProps {
  games: Game[];
  winners: WinnerRecord[];
  searchQuery: string;
  onOpenGame: (gameId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  games,
  winners,
  searchQuery,
  onOpenGame,
}) => {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeId>('30');
  const [playStats, setPlayStats] = useState<QuizPlayStats | null>(null);
  const [bankStats, setBankStats] = useState<QuizBankStats | null>(null);
  const [telemetry, setTelemetry] = useState<QuizTelemetry | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchQuizPlayStats().catch(() => null),
      fetchQuestionBankStats().catch(() => null),
      fetchQuizTelemetry().catch(() => null),
    ]).then(([play, bank, live]) => {
      if (cancelled) return;
      setPlayStats(play);
      setBankStats(bank);
      setTelemetry(live);
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (game) =>
        game.name.toLowerCase().includes(q) ||
        game.format.toLowerCase().includes(q) ||
        (GAME_VISUALS[game.format]?.label || '').toLowerCase().includes(q),
    );
  }, [games, searchQuery]);

  const quizPlayers = telemetry?.playerCount ?? playStats?.playerCount ?? 0;
  const quizPlays = telemetry?.sessionCount ?? playStats?.sessionCount ?? 0;
  const quizWinners = telemetry?.winnersCount ?? playStats?.winnersCount ?? 0;
  const questionCount = bankStats?.active ?? bankStats?.total ?? 0;
  const activeGames = games.filter((g) => g.status === 'active');
  const rewardsClaimed = winners.filter((w) => w.prizeClaimed);
  const pendingClaims = winners.filter((w) => !w.prizeClaimed);

  // Trends only come from timestamped records. The telemetry feed holds one row per player rather than
  // every session, so players, plays, questions and winners have no history to compare against.
  const trends = useMemo(() => {
    const days = Number(range);
    return {
      games: growthTrend(games.map((g) => g.createdAt), days),
      activeGames: growthTrend(games.filter((g) => g.status === 'active').map((g) => g.createdAt), days),
      claimed: activityTrend(winners.filter((w) => w.prizeClaimed).map((w) => w.completedAt), days),
      pending: activityTrend(winners.filter((w) => !w.prizeClaimed).map((w) => w.completedAt), days),
    };
  }, [range, games, winners]);

  const metrics: KpiCardProps[] = [
    { title: 'Total Players', value: formatNumber(quizPlayers), note: 'Unique players', icon: UsersSolid, tone: 'green' },
    { title: 'Total Games', value: formatNumber(games.length), note: 'In catalog', icon: GamepadSolid, tone: 'orange', trend: trends.games },
    {
      title: 'Active Games',
      value: formatNumber(activeGames.length),
      note: `of ${games.length} total games`,
      icon: PlaySolid,
      tone: 'green',
      trend: trends.activeGames,
    },
    { title: 'Total Plays', value: formatNumber(quizPlays), note: 'Quiz sessions', icon: GamepadSolid, tone: 'purple' },
    {
      title: 'Rewards Claimed',
      value: formatNumber(rewardsClaimed.length),
      note: 'Prizes claimed',
      icon: GiftSolid,
      tone: 'red',
      badgeTone: 'red',
      trend: trends.claimed,
    },
    {
      title: 'Pending Claims',
      value: formatNumber(pendingClaims.length),
      note: pendingClaims.length > 0 ? 'Needs attention' : 'No open claims',
      noteClass: pendingClaims.length > 0 ? 'text-[#F97316]' : undefined,
      icon: ClaimSolid,
      tone: 'orange',
      badgeTone: 'orange',
      trend: trends.pending,
    },
    { title: 'Questions', value: formatNumber(questionCount), note: 'Live question bank', icon: QuestionSolid, tone: 'blue', badgeTone: 'blue' },
    { title: 'Winners', value: formatNumber(quizWinners), note: 'Quiz winners', icon: Trophy, tone: 'purple' },
  ];

  const rows: GamePerformanceRow[] = filteredGames.map((game) => {
    const isQuiz = game.format === 'pb-quiz';
    return { game, plays: isQuiz ? quizPlays : game.totalPlays, activeUsers: isQuiz ? quizPlayers : null };
  });

  return (
    <div className="flex flex-col gap-4 2xl:gap-[18px]">
      <DashboardHero range={range} onRangeChange={setRange} />

      <div className="relative grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 2xl:gap-x-[18px] 2xl:gap-y-[17px]">
        {metrics.map((metric) => (
          <KpiCard key={metric.title} {...metric} />
        ))}
      </div>

      <GamePerformanceTable rows={rows} onOpenGame={onOpenGame} onViewAll={() => navigate('/games')} />
    </div>
  );
};
