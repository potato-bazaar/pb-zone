import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react';
import { Game, GameFormat, Quiz } from '../../types/quiz';
import { ConfigKind, FORMAT_LABELS, GameConfig } from '../../types/gameConfig';
import { useQuizTelemetry } from '../../hooks/useQuizTelemetry';
import type { QuizTelemetryPlayer } from '../../services/quizBankApi';
import { GameConfigActiveView } from '../gameconfig/GameConfigActiveView';
import { QuizDetailView } from '../editor/QuizDetailView';
import { PlaySolid, UsersSolid } from '../dashboard/dashboardIcons';
import { Button, IconTile, Panel, Pill, buttonClass, panelClass, softClass, tableClass, type Tone } from '../ui/pb';
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

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number | string }>;

const SESSION_LOOK: Record<SessionStatus, { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'green' },
  'in-progress': { label: 'In Progress', tone: 'amber' },
  skipped: { label: 'Skipped', tone: 'gray' },
};

const emptyClass = cn(softClass, 'px-4 py-10 text-center text-sm text-[#64748B]');

function statusLook(status: Game['status']): { label: string; tone: Tone } {
  if (status === 'active') return { label: 'Active', tone: 'green' };
  if (status === 'maintenance') return { label: 'Paused', tone: 'amber' };
  return { label: 'Draft', tone: 'gray' };
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
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-[140px] w-full sm:h-[168px]"
      role="img"
      aria-label="Live participation"
    >
      <defs>
        <linearGradient id="playFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((line) => (
        <line
          key={line}
          x1={padX}
          x2={width - padX}
          y1={padY + (height - padY * 2) * line}
          y2={padY + (height - padY * 2) * line}
          stroke="#EEF2F6"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={area} fill="url(#playFill)" />
      <path
        d={playLine}
        fill="none"
        stroke="#16A34A"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={winnerLine}
        fill="none"
        stroke="#14532D"
        strokeWidth="1.75"
        strokeDasharray="4 3"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: IconType;
  tone: Tone;
}) {
  return (
    <div className={cn(panelClass, 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-3.5')}>
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#1F2937] sm:text-sm">{title}</p>
        <p className="text-[22px] font-extrabold leading-tight tabular-nums text-[#0B1220] sm:text-2xl">{value}</p>
        <p className="mt-0.5 text-xs leading-snug text-[#64748B]">{note}</p>
      </div>
    </div>
  );
}

function RankMark({ rank }: { rank: number }) {
  if (rank <= 3) {
    const tone = rank === 1 ? 'bg-[#FFF3D6]' : rank === 2 ? 'bg-[#F1F5F9]' : 'bg-[#FFF1DC]';
    return (
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm', tone)}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-semibold tabular-nums text-[#64748B]">
      {rank}
    </span>
  );
}

function ViewAllButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick}>
      View All
      <ArrowRight className="h-3.5 w-3.5" />
    </Button>
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
    <div className="flex flex-col gap-4 pb-10">
      <section className={cn(panelClass, 'flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between')}>
        <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:items-start sm:gap-y-1.5">
          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[#EEF3EF] sm:row-span-2 sm:h-20 sm:w-[120px]">
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover object-right"
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
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-[15px] font-bold leading-tight text-[#0B1220]">{game.name}</h2>
              <Pill tone={look.tone} dot>
                {look.label}
              </Pill>
            </div>
            <p className="mt-0.5 text-sm text-[#5F6F83]">{game.tagline || FORMAT_LABELS[game.format]}</p>
          </div>
          <p className="col-span-2 max-w-3xl text-sm leading-relaxed text-[#334155] sm:col-span-1 sm:col-start-2">
            {game.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setRangeOpen((open) => !open)}
              aria-expanded={rangeOpen}
              className={buttonClass('outline', 'md')}
            >
              <CalendarDays className="h-4 w-4 text-[#64748B]" />
              {rangeLabel}
              <ChevronDown className={cn('h-4 w-4 text-[#64748B] transition-transform', rangeOpen && 'rotate-180')} />
            </button>
            {rangeOpen && (
              <div className="absolute left-0 z-20 mt-2 w-44 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5 lg:left-auto lg:right-0">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[#F0FAF2]',
                      opt.id === range ? 'font-semibold text-[#14532D]' : 'text-[#334155]',
                    )}
                    onClick={() => {
                      setRange(opt.id);
                      setRangeOpen(false);
                    }}
                  >
                    {opt.label}
                    {opt.id === range && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {liveFromApi && (
            <Button variant="outline" onClick={refreshAll} disabled={busy}>
              <RefreshCw className={cn('h-4 w-4', busy ? 'animate-spin' : '')} />
              Refresh
            </Button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          title="Total Plays"
          value={loading ? '—' : formatNumber(totalPlays)}
          note={liveFromApi ? 'Quiz sessions' : 'Player sessions'}
          icon={PlaySolid}
          tone="purple"
        />
        <MetricCard
          title="Unique Players"
          value={loading ? '—' : formatNumber(uniquePlayers)}
          note="Who started this game"
          icon={UsersSolid}
          tone="green"
        />
        <MetricCard
          title="Winners"
          value={loading ? '—' : formatNumber(winnersCount)}
          note={liveFromApi ? `Finished all ${questionsPerQuiz} Qs` : 'Qualified sessions'}
          icon={Trophy}
          tone="orange"
        />
        <MetricCard
          title="Completion Rate"
          value={loading ? '—' : `${completionRate}%`}
          note="Finished / started"
          icon={Clock}
          tone="blue"
        />
      </div>

      {liveFromApi && live.error && (
        <p className="flex items-start gap-2.5 rounded-xl bg-[#FDE8EC] px-4 py-3 text-sm text-[#BE123C]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{live.error}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel
          className="min-w-0 xl:col-span-3"
          icon={Activity}
          title={
            <span className="flex flex-wrap items-center gap-2">
              Live Session Overview
              {game.status === 'active' && (
                <Pill tone="green" dot>
                  Live
                </Pill>
              )}
            </span>
          }
          description="Real-time stats for the current session."
        >
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: 'Total Players', value: uniquePlayers },
              { label: 'Answered', value: answered },
              { label: 'In Progress', value: inProgress },
              { label: 'Skipped', value: skipped },
            ].map((item) => (
              <div key={item.label} className={cn(softClass, 'px-3.5 py-3')}>
                <p className="text-xs font-medium text-[#64748B]">{item.label}</p>
                <p className="mt-1 text-lg font-bold leading-tight tabular-nums text-[#0B1220]">
                  {loading ? '—' : formatNumber(item.value)}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#E6ECE8] px-2 pb-2 pt-3 sm:px-3">
            <div className="mb-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-1 text-xs font-medium text-[#5F6F83]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                Total Plays
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#14532D]" />
                Winners
              </span>
            </div>
            <ParticipationChart plays={series.plays} winners={series.winners} />
          </div>
        </Panel>

        <Panel
          className="min-w-0 xl:col-span-2"
          icon={Trophy}
          tone="amber"
          title="Top Winners"
          description="Highest scores in this game (current session)"
          actions={<ViewAllButton onClick={() => navigate('/winners')} />}
        >
          {topWinners.length === 0 ? (
            <p className={emptyClass}>No winners yet</p>
          ) : (
            <ul className="divide-y divide-[#EEF2F6]">
              {topWinners.map((player, index) => {
                const rank = player.rank || index + 1;
                const winner = isWinner(player, questionsPerQuiz);
                return (
                  <li
                    key={`${player.userId}-${player.sessionId}-${rank}`}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <RankMark rank={rank} />
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E3F8E8] text-xs font-bold text-[#14532D]">
                      {initials(player.playerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">{player.playerName}</p>
                      <p className="truncate text-xs text-[#64748B]">{playerIdLabel(player)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-[#0B1220]">
                        {formatNumber(player.userPoints || player.sessionScore)}
                      </p>
                      <p className="text-xs tabular-nums text-[#64748B]">{formatDuration(player.durationSeconds)}</p>
                    </div>
                    {winner && (
                      <Pill tone="green" className="hidden sm:inline-flex">
                        Winner
                      </Pill>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        className="min-w-0"
        icon={Users}
        tone="blue"
        title="Recent Players"
        description="Latest players who participated in this game"
        actions={<ViewAllButton onClick={() => navigate('/players')} />}
      >
        {loading || recentPlayers.length === 0 ? (
          <p className={emptyClass}>
            {loading ? 'Loading players…' : isQuiz ? 'No players yet' : 'Live player stats are available for Quiz Time'}
          </p>
        ) : (
          <div className={tableClass.wrap}>
            <table className={cn(tableClass.table, 'min-w-[760px]')}>
              <thead>
                <tr>
                  <th className={tableClass.th}>#</th>
                  <th className={tableClass.th}>Player</th>
                  <th className={tableClass.th}>Email / ID</th>
                  <th className={tableClass.th}>Score</th>
                  <th className={tableClass.th}>Time</th>
                  <th className={tableClass.th}>Date & Time</th>
                  <th className={tableClass.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPlayers.map((player, index) => {
                  const status = SESSION_LOOK[sessionStatus(player)];
                  return (
                    <tr key={`${player.sessionId}-${player.userId}-${index}`} className={tableClass.tr}>
                      <td className={cn(tableClass.td, 'tabular-nums text-[#64748B]')}>{index + 1}</td>
                      <td className={tableClass.td}>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E3F8E8] text-[11px] font-bold text-[#14532D]">
                            {initials(player.playerName)}
                          </span>
                          <span className="whitespace-nowrap font-medium">{player.playerName}</span>
                        </div>
                      </td>
                      <td className={cn(tableClass.td, 'whitespace-nowrap text-[#64748B]')}>{playerIdLabel(player)}</td>
                      <td className={cn(tableClass.td, 'font-semibold tabular-nums')}>
                        {formatNumber(player.userPoints || player.sessionScore)}
                      </td>
                      <td className={cn(tableClass.td, 'whitespace-nowrap tabular-nums text-[#64748B]')}>
                        {formatDuration(player.durationSeconds)}
                      </td>
                      <td className={cn(tableClass.td, 'whitespace-nowrap text-[#64748B]')}>
                        {formatWhen(player.completedAt || player.startedAt)}
                      </td>
                      <td className={tableClass.td}>
                        <Pill tone={status.tone} dot>
                          {status.label}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {isQuiz && quiz && onUpdateQuiz && (
        <QuizDetailView quiz={quiz} onUpdateQuiz={onUpdateQuiz} liveFromApi={liveFromApi} />
      )}

      {isQuiz && !quiz && (
        <Panel>
          <p className="py-4 text-center text-sm text-[#64748B]">Open Questions to work with the live question bank.</p>
        </Panel>
      )}

      {!isQuiz && !config && onNavigateToSetup && (
        <Panel>
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-center sm:flex-row">
            <p className="text-sm text-[#64748B]">No configuration yet.</p>
            <Button variant="secondary" size="sm" onClick={onNavigateToSetup}>
              Open Setup
            </Button>
          </div>
        </Panel>
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
