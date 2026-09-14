import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Eye,
  Gamepad2,
  Gift,
  HelpCircle,
  Play,
  Trophy,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Game, WinnerRecord } from '../../types/quiz';
import { getGameKind } from '../../types/gameConfig';
import {
  fetchQuestionBankStats,
  fetchQuizPlayStats,
  fetchQuizTelemetry,
  type QuizBankStats,
  type QuizPlayStats,
  type QuizTelemetry,
} from '../../services/quizBankApi';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatNumber } from '../../lib/utils';

const TYPE_LABEL: Record<string, string> = {
  'pb-quiz': 'Quiz',
  'trivia-20q': 'Quiz',
  'word-scramble': 'Word Game',
  'picture-guess': 'Picture',
  'potato-crush': 'Match Game',
  'spin-wheel': 'Lucky Spin',
  'potato-rush': 'Runner',
};

const RANGE_OPTIONS = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
] as const;

interface DashboardViewProps {
  games: Game[];
  winners: WinnerRecord[];
  searchQuery: string;
  onOpenGame: (gameId: string) => void;
}

type Metric = {
  title: string;
  value: string;
  icon: LucideIcon;
  note: string;
  noteClass?: string;
};

function StatCard({ title, value, icon: Icon, note, noteClass }: Metric) {
  return (
    <Card className="shadow-none">
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums leading-none">{value}</p>
          <p className={`mt-1 text-[11px] leading-tight ${noteClass || 'text-muted-foreground'}`}>{note}</p>
        </div>
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
    </Card>
  );
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  games,
  winners,
  searchQuery,
  onOpenGame,
}) => {
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]['id']>('30');
  const [rangeOpen, setRangeOpen] = useState(false);
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
        (TYPE_LABEL[game.format] || '').toLowerCase().includes(q),
    );
  }, [games, searchQuery]);

  const quizPlayers = telemetry?.playerCount ?? playStats?.playerCount ?? 0;
  const quizPlays = telemetry?.sessionCount ?? playStats?.sessionCount ?? 0;
  const quizWinners = telemetry?.winnersCount ?? playStats?.winnersCount ?? 0;
  const questionCount = bankStats?.active ?? bankStats?.total ?? 0;
  const activeGames = games.filter((g) => g.status === 'active').length;
  const rewardsClaimed = winners.filter((w) => w.prizeClaimed).length;
  const pendingClaims = winners.filter((w) => !w.prizeClaimed).length;

  const metrics: Metric[] = [
    { title: 'Total Players', value: formatNumber(quizPlayers), icon: Users, note: 'Unique players' },
    { title: 'Total Games', value: formatNumber(games.length), icon: Gamepad2, note: 'In catalog' },
    {
      title: 'Active Games',
      value: formatNumber(activeGames),
      icon: Play,
      note: `of ${games.length} total games`,
    },
    { title: 'Total Plays', value: formatNumber(quizPlays), icon: Eye, note: 'Quiz sessions' },
    { title: 'Rewards Claimed', value: formatNumber(rewardsClaimed), icon: Gift, note: 'Prizes claimed' },
    {
      title: 'Pending Claims',
      value: formatNumber(pendingClaims),
      icon: Clock,
      note: pendingClaims > 0 ? 'Needs attention' : 'No open claims',
      noteClass: pendingClaims > 0 ? 'text-yellow-600' : undefined,
    },
    { title: 'Questions', value: formatNumber(questionCount), icon: HelpCircle, note: 'Live question bank' },
    { title: 'Winners', value: formatNumber(quizWinners), icon: Trophy, note: 'Quiz winners' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <div className="relative">
          <button
            type="button"
            onClick={() => setRangeOpen((open) => !open)}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-accent"
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {RANGE_OPTIONS.find((opt) => opt.id === range)?.label}
          </button>
          {rangeOpen && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setRange(opt.id);
                    setRangeOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.title} {...metric} />
        ))}
      </div>

      <Card className="shadow-none">
        <CardHeader className="px-3 py-2.5">
          <CardTitle className="text-sm font-medium">Game Performance</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3">Game Name</TableHead>
                <TableHead className="h-9 px-3">Type</TableHead>
                <TableHead className="h-9 px-3">Plays</TableHead>
                <TableHead className="h-9 px-3">Active Users</TableHead>
                <TableHead className="h-9 px-3">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGames.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 px-3 text-center text-muted-foreground">
                    No games found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGames.map((game) => {
                  const isQuiz = game.format === 'pb-quiz';
                  const plays = isQuiz ? quizPlays : game.totalPlays;
                  const isLive = game.status === 'active';
                  return (
                    <TableRow
                      key={game.id}
                      className="cursor-pointer"
                      onClick={() => onOpenGame(game.id)}
                    >
                      <TableCell className="px-3 py-2 font-medium">{game.name}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">
                        {TYPE_LABEL[game.format] || getGameKind(game.format)}
                      </TableCell>
                      <TableCell className="px-3 py-2">{formatNumber(plays)}</TableCell>
                      <TableCell className="px-3 py-2">{isQuiz ? formatNumber(quizPlayers) : '-'}</TableCell>
                      <TableCell className="px-3 py-2">
                        <span
                          className={
                            isLive
                              ? 'inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800'
                              : 'inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-800'
                          }
                        >
                          {isLive ? 'Active' : 'Draft'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
