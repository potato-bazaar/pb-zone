import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Play,
  RefreshCw,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Game, GameFormat, Quiz } from '../../types/quiz';
import { ConfigKind, FORMAT_LABELS, GameConfig } from '../../types/gameConfig';
import { useQuizTelemetry } from '../../hooks/useQuizTelemetry';
import type { QuizTelemetryPlayer } from '../../services/quizBankApi';
import { GameConfigActiveView } from '../gameconfig/GameConfigActiveView';
import { QuizDetailView } from '../editor/QuizDetailView';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { cn, formatNumber } from '../../lib/utils';

const RANGE_OPTIONS = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
] as const;

const COVER_BY_FORMAT: Partial<Record<GameFormat, string>> = {
  'word-scramble': '/images/home/game-word-scramble.png',
  'pb-quiz': '/images/home/game-quiz-time.png',
  'trivia-20q': '/images/home/game-quiz-time.png',
  'picture-guess': '/images/home/game-guess-disease.png',
  'potato-crush': '/images/home/game-tater-match.png',
  'potato-rush': '/images/home/game-fix-puzzle.png',
};

interface GameDetailViewProps {
  game: Game;
  quiz?: Quiz | null;
  liveFromApi?: boolean;
  config?: GameConfig | null;
  configKind?: ConfigKind | null;
  rotationCount?: number;
  onNavigateToManage: () => void;
  onNavigateToSetup?: () => void;
  onOpenPreview?: () => void;
  onUpdateQuiz?: (updated: Quiz) => void;
  onTogglePublish: () => void;
}

type SessionStatus = 'completed' | 'in-progress' | 'skipped';

function statusLook(status: Game['status']) {
  if (status === 'active') {
    return { label: 'Active', badge: 'bg-green-100 text-green-800 hover:bg-green-100', dot: 'bg-green-600' };
  }
  if (status === 'maintenance') {
    return { label: 'Paused', badge: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', dot: 'bg-yellow-500' };
  }
  return { label: 'Draft', badge: 'bg-gray-100 text-gray-800 hover:bg-gray-100', dot: 'bg-gray-400' };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function formatWhen(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sessionStatus(player: QuizTelemetryPlayer): SessionStatus {
  const raw = player.status.toLowerCase();
  if (raw.includes('skip')) return 'skipped';
  if (player.completedAt || raw.includes('complete') || raw.includes('winner') || raw.includes('finish')) {
    return 'completed';
  }
  if (player.totalQuestions > 0 && player.answeredCount >= player.totalQuestions) return 'completed';
  return 'in-progress';
}

function isWinner(player: QuizTelemetryPlayer, questionsPerQuiz: number) {
  if (player.status.toLowerCase().includes('winner')) return true;
  return player.totalQuestions > 0
    ? player.correctCount >= player.totalQuestions
    : player.correctCount >= questionsPerQuiz;
}

function playerIdLabel(player: QuizTelemetryPlayer) {
  if (player.playerName.includes('@')) return player.playerName;
  if (player.userId.includes('@')) return player.userId;
  return player.userId || '—';
}

function buildSeries(players: QuizTelemetryPlayer[]) {
  const buckets = 12;
  const empty = { plays: Array(buckets).fill(0), winners: Array(buckets).fill(0) };
  if (players.length === 0) return empty;

  const timed = players
    .map((player) => ({
      at: new Date(player.startedAt).getTime(),
      winner: isWinner(player, player.totalQuestions || 12),
    }))
    .filter((row) => Number.isFinite(row.at) && row.at > 0)
    .sort((a, b) => a.at - b.at);

  const source = timed.length > 0
    ? timed
    : players.map((player, index) => ({ at: index, winner: isWinner(player, player.totalQuestions || 12) }));

  const min = source[0].at;
  const max = source[source.length - 1].at;
  const span = Math.max(max - min, 1);
  const plays = Array(buckets).fill(0);
  const winners = Array(buckets).fill(0);

  source.forEach((row) => {
    const idx = Math.min(buckets - 1, Math.floor(((row.at - min) / span) * (buckets - 1)));
    plays[idx] += 1;
    if (row.winner) winners[idx] += 1;
  });

  for (let i = 1; i < buckets; i += 1) {
    plays[i] += plays[i - 1];
    winners[i] += winners[i - 1];
  }

  return { plays, winners };
}

function ParticipationChart({ plays, winners }: { plays: number[]; winners: number[] }) {
  const width = 640;
  const height = 168;
  const padX = 12;
  const padY = 10;
  const max = Math.max(...plays, ...winners, 1);

  const toPoints = (values: number[]) =>
    values.map((value, index) => {
      const x = padX + (index / Math.max(values.length - 1, 1)) * (width - padX * 2);
      const y = height - padY - (value / max) * (height - padY * 2);
      return `${x},${y}`;
    });

  const playPoints = toPoints(plays);
  const winnerPoints = toPoints(winners);
  const playLine = playPoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point}`).join(' ');
  const area = `${playLine} L${width - padX},${height - padY} L${padX},${height - padY} Z`;
  const winnerLine = winnerPoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[168px] w-full" role="img" aria-label="Live participation">
      <defs>
        <linearGradient id="playFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((line) => (
        <line
          key={line}
          x1={padX}
          x2={width - padX}
          y1={padY + (height - padY * 2) * line}
          y2={padY + (height - padY * 2) * line}
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill="url(#playFill)" />
      <path d={playLine} fill="none" stroke="#16a34a" strokeWidth="2.25" strokeLinejoin="round" />
      <path d={winnerLine} fill="none" stroke="#166534" strokeWidth="1.75" strokeDasharray="4 3" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="shadow-none">
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums leading-none">{value}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-green-700">
            <TrendingUp className="h-3 w-3" />
            {note}
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
    </Card>
  );
}

function RankMark({ rank }: { rank: number }) {
  if (rank <= 3) {
    const tone =
      rank === 1
        ? 'bg-amber-100 text-amber-800'
        : rank === 2
          ? 'bg-gray-100 text-gray-700'
          : 'bg-orange-100 text-orange-800';
    return (
      <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold', tone)}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center text-xs font-medium text-muted-foreground">{rank}</span>
  );
}

export const GameDetailView: React.FC<GameDetailViewProps> = ({
  game,
  quiz,
  liveFromApi = false,
  config,
  configKind,
  rotationCount = 0,
  onNavigateToManage,
  onNavigateToSetup,
  onOpenPreview,
  onUpdateQuiz,
  onTogglePublish,
}) => {
  const navigate = useNavigate();
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]['id']>('30');
  const [rangeOpen, setRangeOpen] = useState(false);
  const live = useQuizTelemetry(liveFromApi);
  const look = statusLook(game.status);
  const cover = COVER_BY_FORMAT[game.format] || game.imageUrl;
  const isQuiz = !configKind;
  const loading = liveFromApi && live.loading && live.data.players.length === 0;

  const players = live.data.players;
  const questionsPerQuiz = liveFromApi
    ? live.data.questionsPerQuiz || 12
    : quiz?.questionsCount || 20;

  const totalPlays = liveFromApi ? live.data.sessionCount || live.data.playerCount : quiz?.playsCount || config?.playsCount || 0;
  const uniquePlayers = liveFromApi ? live.data.playerCount : quiz?.playsCount || config?.playsCount || 0;
  const winnersCount = liveFromApi ? live.data.winnersCount : quiz?.winnersCount || config?.winnersCount || 0;
  const completionRate = liveFromApi
    ? live.data.completionRatePercentage
    : totalPlays > 0
      ? Math.round((winnersCount / totalPlays) * 1000) / 10
      : 0;

  const answered = liveFromApi
    ? live.data.completedSessions
    : players.filter((player) => sessionStatus(player) === 'completed').length;
  const skipped = players.filter((player) => sessionStatus(player) === 'skipped').length;
  const inProgress = liveFromApi
    ? Math.max(0, (live.data.sessionCount || uniquePlayers) - answered)
    : players.filter((player) => sessionStatus(player) === 'in-progress').length;

  const series = useMemo(() => buildSeries(players), [players]);

  const topWinners = useMemo(() => {
    return [...players]
      .filter((player) => isWinner(player, questionsPerQuiz) || sessionStatus(player) === 'completed')
      .sort((a, b) => (b.userPoints || b.sessionScore) - (a.userPoints || a.sessionScore))
      .slice(0, 5);
  }, [players, questionsPerQuiz]);

  const recentPlayers = useMemo(() => {
    return [...players]
      .sort((a, b) => {
        const aTime = new Date(a.completedAt || a.startedAt).getTime();
        const bTime = new Date(b.completedAt || b.startedAt).getTime();
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
      })
      .slice(0, 8);
  }, [players]);

  const rangeLabel = RANGE_OPTIONS.find((opt) => opt.id === range)?.label;
  const busy = live.loading || live.refreshing;

  const refreshAll = () => {
    if (liveFromApi) {
      void live.refresh(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-10">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setRangeOpen((open) => !open)}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-accent"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {rangeLabel}
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
          {liveFromApi && (
            <button
              type="button"
              onClick={refreshAll}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-accent disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', busy ? 'animate-spin' : '')} />
              Refresh
            </button>
          )}
        </div>
      </div>

      <Card className="shadow-none">
        <div className="flex flex-wrap items-start gap-3 p-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover"
              onError={(event) => {
                const img = event.currentTarget;
                if (game.imageUrl && img.src !== game.imageUrl) {
                  img.src = game.imageUrl;
                  return;
                }
                img.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold leading-tight">{game.name}</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {game.tagline || FORMAT_LABELS[game.format]}
                </p>
              </div>
              <Badge className={look.badge}>
                <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', look.dot)} />
                {look.label}
              </Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{game.description}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricCard
          title="Total Plays"
          value={loading ? '—' : formatNumber(totalPlays)}
          note={liveFromApi ? 'Quiz sessions' : 'Player sessions'}
          icon={Play}
        />
        <MetricCard
          title="Unique Players"
          value={loading ? '—' : formatNumber(uniquePlayers)}
          note="Who started this game"
          icon={Users}
        />
        <MetricCard
          title="Winners"
          value={loading ? '—' : formatNumber(winnersCount)}
          note={liveFromApi ? `Finished all ${questionsPerQuiz} Qs` : 'Qualified sessions'}
          icon={Trophy}
        />
        <MetricCard
          title="Completion Rate"
          value={loading ? '—' : `${completionRate}%`}
          note="Finished / started"
          icon={Clock}
        />
      </div>

      {liveFromApi && live.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{live.error}</p>
      )}

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-5">
        <Card className="shadow-none xl:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-3 py-2.5">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Live Session Overview</CardTitle>
                {game.status === 'active' && (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-600" />
                    Live
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Real-time stats for the current session.</p>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Total Players', value: uniquePlayers },
                { label: 'Answered', value: answered },
                { label: 'In Progress', value: inProgress },
                { label: 'Skipped', value: skipped },
              ].map((item) => (
                <div key={item.label} className="rounded-md border px-2.5 py-2">
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums">
                    {loading ? '—' : formatNumber(item.value)}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-md border bg-muted/20 px-2 pt-2">
              <div className="mb-1 flex items-center justify-end gap-3 px-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  Total Plays
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-900" />
                  Winners
                </span>
              </div>
              <ParticipationChart plays={series.plays} winners={series.winners} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-3 py-2.5">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                <Trophy className="h-3.5 w-3.5 text-amber-600" />
                Top Winners
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Highest scores in this game (current session)</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/winners')}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              View All
            </button>
          </CardHeader>
          <CardContent className="px-0 pb-1 pt-0">
            {topWinners.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-muted-foreground">No winners yet</p>
            ) : (
              <ul>
                {topWinners.map((player, index) => {
                  const rank = player.rank || index + 1;
                  const winner = isWinner(player, questionsPerQuiz);
                  return (
                    <li
                      key={`${player.userId}-${player.sessionId}-${rank}`}
                      className="flex items-center gap-2 border-t px-3 py-2"
                    >
                      <RankMark rank={rank} />
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                        {initials(player.playerName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{player.playerName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{playerIdLabel(player)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatNumber(player.userPoints || player.sessionScore)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{formatDuration(player.durationSeconds)}</p>
                      </div>
                      {winner && (
                        <Badge className="hidden bg-green-100 text-green-800 hover:bg-green-100 sm:inline-flex">
                          Winner
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-3 py-2.5">
          <div>
            <CardTitle className="text-sm font-medium">Recent Players</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Latest players who participated in this game</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/players')}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View All
          </button>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3">#</TableHead>
                <TableHead className="h-9 px-3">Player</TableHead>
                <TableHead className="h-9 px-3">Email / ID</TableHead>
                <TableHead className="h-9 px-3">Score</TableHead>
                <TableHead className="h-9 px-3">Time</TableHead>
                <TableHead className="h-9 px-3">Date & Time</TableHead>
                <TableHead className="h-9 px-3">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 px-3 text-center text-muted-foreground">
                    Loading players…
                  </TableCell>
                </TableRow>
              ) : recentPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 px-3 text-center text-muted-foreground">
                    {isQuiz ? 'No players yet' : 'Live player stats are available for Quiz Time'}
                  </TableCell>
                </TableRow>
              ) : (
                recentPlayers.map((player, index) => {
                  const status = sessionStatus(player);
                  return (
                    <TableRow key={`${player.sessionId}-${player.userId}-${index}`}>
                      <TableCell className="px-3 py-2 text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                            {initials(player.playerName)}
                          </span>
                          <span className="font-medium">{player.playerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{playerIdLabel(player)}</TableCell>
                      <TableCell className="px-3 py-2 tabular-nums">
                        {formatNumber(player.userPoints || player.sessionScore)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">
                        {formatDuration(player.durationSeconds)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">
                        {formatWhen(player.completedAt || player.startedAt)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : status === 'skipped'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-yellow-100 text-yellow-800',
                          )}
                        >
                          {status === 'completed' ? 'Completed' : status === 'skipped' ? 'Skipped' : 'In Progress'}
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

      {isQuiz && quiz && onUpdateQuiz && (
        <QuizDetailView quiz={quiz} onUpdateQuiz={onUpdateQuiz} liveFromApi={liveFromApi} />
      )}

      {isQuiz && !quiz && (
        <Card className="shadow-none">
          <p className="p-6 text-center text-sm text-muted-foreground">
            Open Questions to work with the live question bank.
          </p>
        </Card>
      )}

      {!isQuiz && !config && onNavigateToSetup && (
        <Card className="shadow-none">
          <p className="p-6 text-center text-sm text-muted-foreground">
            No configuration yet.{' '}
            <button type="button" onClick={onNavigateToSetup} className="font-medium text-foreground underline">
              Open Setup
            </button>
          </p>
        </Card>
      )}

      {!isQuiz && config && configKind && onNavigateToSetup && onOpenPreview && (
        <GameConfigActiveView
          embedded
          config={config}
          game={game}
          rotationCount={rotationCount}
          onNavigateToManage={onNavigateToManage}
          onNavigateToSetup={onNavigateToSetup}
          onOpenPreview={onOpenPreview}
          onTogglePublish={onTogglePublish}
        />
      )}
    </div>
  );
};
