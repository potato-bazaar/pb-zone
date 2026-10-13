import React, { useMemo, useState } from 'react';
import { Quiz, QuizAnalytics, WinnerRecord } from '../../types/quiz';
import { storageService } from '../../services/storageService';
import { useQuizTelemetry } from '../../hooks/useQuizTelemetry';
import { AlertTriangle, BarChart3, Flag, Gamepad2, Gauge, RefreshCw, Search, Target, Trophy } from 'lucide-react';
import { Button, IconTile, Pill, inputClass, panelClass, softClass, tableClass, type Tone } from '../ui/pb';
import { cn } from '../../lib/utils';

interface AnalyticsDashboardProps {
  quiz: Quiz;
  analytics: QuizAnalytics;
  winners: WinnerRecord[];
  onRefresh: () => void;
  liveFromApi?: boolean;
}

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number | string }>;

/** Stacked on phones and in the 5-up row; icon beside the numbers when the tiles are wide. */
function MetricTile({
  label,
  value,
  note,
  icon,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  note: string;
  icon: IconType;
  tone: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        panelClass,
        'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-3.5 xl:flex-col xl:items-start xl:gap-3 min-[1680px]:flex-row min-[1680px]:items-center min-[1680px]:gap-3.5',
        className,
      )}
    >
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#1F2937]">{label}</p>
        <p className="text-[22px] font-extrabold leading-tight tabular-nums text-[#0B1220] sm:text-2xl">{value}</p>
        <p className="mt-0.5 text-xs text-[#64748B]">{note}</p>
      </div>
    </div>
  );
}

function SectionHead({
  icon,
  tone,
  title,
  description,
  children,
}: {
  icon: IconType;
  tone: Tone;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-tight text-[#0B1220] sm:text-lg">{title}</h3>
          <p className="mt-0.5 text-sm text-[#5F6F83]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

const ACCURACY_LEGEND = [
  { label: '>70% Accuracy', color: 'bg-[#22C55E]' },
  { label: '50% - 70%', color: 'bg-[#F59E0B]' },
  { label: '<50% (Hard)', color: 'bg-[#F43F5E]' },
];

const MEDAL: Record<number, string> = {
  1: 'bg-[#FFF3D6] text-[#B45309] ring-1 ring-inset ring-[#FCE3A6]',
  2: 'bg-[#EEF2F6] text-[#475569] ring-1 ring-inset ring-[#DCE3EA]',
  3: 'bg-[#FDEBDD] text-[#C2410C] ring-1 ring-inset ring-[#F9D2B5]',
};

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums',
        MEDAL[rank] ?? 'text-[#64748B]',
      )}
    >
      {rank}
    </span>
  );
}

function PlayerName({ name, avatar }: { name: string; avatar?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E3F8E8] text-[#14532D]',
          avatar ? 'text-base' : 'text-xs font-bold uppercase',
        )}
      >
        {avatar || name.trim().charAt(0) || '?'}
      </span>
      <span title={name} className="max-w-[180px] truncate font-semibold text-[#0F172A] sm:max-w-[240px]">
        {name}
      </span>
    </div>
  );
}

const TIER_TONE: Record<string, Tone> = {
  'Grand Spud Master': 'purple',
  'Golden Crispy': 'amber',
  'Tater Prodigy': 'blue',
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  quiz,
  analytics,
  winners,
  onRefresh,
  liveFromApi = false,
}) => {
  const live = useQuizTelemetry(liveFromApi);
  const [winnerSearch, setWinnerSearch] = useState('');
  const [selectedStatQuestion, setSelectedStatQuestion] = useState<number | null>(null);

  const questionsPerQuiz = liveFromApi ? live.data.questionsPerQuiz || 12 : 20;
  const totalPlays = liveFromApi ? live.data.playerCount : analytics.totalPlays;
  const totalWinners = liveFromApi ? live.data.winnersCount : analytics.totalWinners;
  const winRate = liveFromApi ? live.data.winRatePercentage : analytics.winRatePercentage;
  const completion = liveFromApi ? live.data.completionRatePercentage : analytics.completionRatePercentage;
  const averageScore = liveFromApi ? live.data.averageScore : analytics.averageScore;
  const averageTime = liveFromApi ? live.data.averageTimeMinutes : analytics.averageTimeMinutes;
  const questionStats = liveFromApi ? live.data.questionStats : analytics.questionStats;

  const players = useMemo(() => {
    if (liveFromApi) {
      const q = winnerSearch.trim().toLowerCase();
      return live.data.players.filter((player) =>
        q ? player.playerName.toLowerCase().includes(q) : true,
      );
    }
    return [];
  }, [liveFromApi, live.data.players, winnerSearch]);

  const filteredWinners = winners.filter((w) => {
    const matchesSearch =
      w.playerName.toLowerCase().includes(winnerSearch.toLowerCase()) ||
      (w.rewardVoucherCode && w.rewardVoucherCode.toLowerCase().includes(winnerSearch.toLowerCase()));
    return matchesSearch;
  });

  const handleToggleClaim = (winnerId: string) => {
    const updated = winners.map((w) =>
      w.id === winnerId ? { ...w, prizeClaimed: !w.prizeClaimed } : w
    );
    storageService.saveWinners(updated);
    onRefresh();
  };

  const loadingNumbers = liveFromApi && live.loading && live.data.players.length === 0;
  const busy = live.loading || live.refreshing;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-[#0B1220] sm:text-xl">Winners & Player Telemetry</h2>
          <p className="mt-1 max-w-3xl text-sm text-[#5F6F83]">
            {liveFromApi
              ? `Live ${questionsPerQuiz}-question Quiz Time leaderboard. Highest points stay on top.`
              : `Performance metrics, winner fulfillment, and question accuracy for ${quiz.title}.`}
          </p>
        </div>
        {liveFromApi && (
          <Button
            variant="outline"
            onClick={() => void live.refresh(false)}
            disabled={busy}
            className="self-start sm:self-auto"
          >
            <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />
            Refresh
          </Button>
        )}
      </div>

      {liveFromApi && live.error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#FBD5DD] bg-[#FDE8EC] px-4 py-3 text-sm text-[#BE123C]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{live.error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <MetricTile
          icon={Gamepad2}
          tone="green"
          label="Total Plays"
          value={loadingNumbers ? '—' : totalPlays.toLocaleString()}
          note={liveFromApi ? 'Unique players who played' : 'Web UI sessions'}
        />
        <MetricTile
          icon={Trophy}
          tone="purple"
          label="Winners"
          value={loadingNumbers ? '—' : totalWinners.toLocaleString()}
          note={liveFromApi ? `Finished all ${questionsPerQuiz} Qs` : `Scored ≥ ${quiz.passScore}/20`}
        />
        <MetricTile
          icon={Target}
          tone="orange"
          label="Win Rate"
          value={loadingNumbers ? '—' : `${winRate}%`}
          note={liveFromApi ? 'Winners / unique players' : 'Target: 30%'}
        />
        <MetricTile
          icon={Flag}
          tone="blue"
          label="Completion"
          value={loadingNumbers ? '—' : `${completion}%`}
          note={`Finished all ${questionsPerQuiz} Qs`}
        />
        <MetricTile
          icon={Gauge}
          tone="red"
          label="Average Score"
          value={
            <>
              {loadingNumbers ? '—' : averageScore}{' '}
              <span className="text-sm font-semibold text-[#64748B]">/ {questionsPerQuiz}</span>
            </>
          }
          note={`Avg duration: ${averageTime}m`}
          className="col-span-2 xl:col-span-1"
        />
      </div>

      <section className={cn(panelClass, 'p-4 sm:p-5')}>
        <SectionHead
          icon={BarChart3}
          tone="green"
          title={`${questionsPerQuiz}-Question Accuracy Breakdown`}
          description={
            liveFromApi
              ? `Accuracy by question slot (Q1–Q${questionsPerQuiz}) across live player sessions.`
              : 'Identifies which questions are too difficult or causing drop-offs. Click any bar to inspect telemetry.'
          }
        >
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-[#475569]">
            {ACCURACY_LEGEND.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', item.color)} />
                {item.label}
              </span>
            ))}
          </div>
        </SectionHead>

        <div
          className={cn(
            'grid grid-cols-4 gap-2 sm:grid-cols-6',
            questionsPerQuiz <= 12 ? 'md:grid-cols-12' : 'md:grid-cols-10 xl:grid-cols-[repeat(20,minmax(0,1fr))]',
          )}
        >
          {questionStats.map((stat) => {
            const isSelected = selectedStatQuestion === stat.questionNumber;
            const barBg =
              stat.correctPercentage >= 70
                ? 'bg-[#22C55E]'
                : stat.correctPercentage >= 50
                ? 'bg-[#F59E0B]'
                : 'bg-[#F43F5E]';

            return (
              <button
                key={stat.questionNumber}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedStatQuestion(stat.questionNumber)}
                className={cn(
                  'flex h-28 flex-col items-center justify-between rounded-xl border p-2 text-center transition-colors',
                  isSelected
                    ? 'border-[#86D19A] bg-[#F0FAF2] ring-2 ring-[#16A34A]/20'
                    : 'border-[#E6ECE8] bg-white hover:border-[#BFE5C9] hover:bg-[#F8FBF9]',
                )}
              >
                <span className="text-[11px] font-semibold text-[#64748B]">Q{stat.questionNumber}</span>

                <span className="flex h-14 w-4 flex-col justify-end overflow-hidden rounded-full bg-[#EEF3EF] sm:w-5">
                  <span
                    className={cn('w-full rounded-full transition-all', barBg)}
                    style={{ height: `${Math.max(stat.correctPercentage, 0)}%` }}
                  />
                </span>

                <span className="text-[11px] font-bold tabular-nums text-[#0F172A]">{stat.correctPercentage}%</span>
              </button>
            );
          })}
        </div>

        {selectedStatQuestion !== null && (
          <div className={cn(softClass, 'mt-4 flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-start sm:justify-between')}>
            {(() => {
              const qStat = questionStats.find((s) => s.questionNumber === selectedStatQuestion);
              if (!qStat) return null;
              return (
                <>
                  <div className="min-w-0 space-y-2">
                    <div className="font-semibold text-[#0F172A]">
                      Question #{qStat.questionNumber}: {qStat.questionText}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#475569]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                        <span>Correct: <strong className="text-[#0F172A]">{qStat.correctPercentage}%</strong></span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#F43F5E]" />
                        <span>Incorrect: <strong className="text-[#0F172A]">{qStat.wrongPercentage}%</strong></span>
                      </span>
                      {'skipPercentage' in qStat && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
                          <span>Skipped: <strong className="text-[#0F172A]">{(qStat as { skipPercentage?: number }).skipPercentage ?? 0}%</strong></span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                        <span>Drop-off Rate: <strong className="text-[#0F172A]">{qStat.dropoffPercentage}%</strong></span>
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setSelectedStatQuestion(null)}
                    className="self-start"
                  >
                    Close
                  </Button>
                </>
              );
            })()}
          </div>
        )}
      </section>

      <section className={cn(panelClass, 'p-4 sm:p-5')}>
        <SectionHead
          icon={Trophy}
          tone="amber"
          title={liveFromApi ? 'Players Leaderboard' : 'Winning Players & Reward Fulfillment'}
          description={
            liveFromApi
              ? 'Live players ranked by total points. Correct, skipped, wrong, score, and points for the latest session.'
              : `Players who reached or exceeded the ${quiz.passScore}/20 pass threshold.`
          }
        >
          <div className="relative w-full shrink-0 md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={winnerSearch}
              onChange={(e) => setWinnerSearch(e.target.value)}
              placeholder={liveFromApi ? 'Search player name...' : 'Search winner name...'}
              className={cn(inputClass, 'pl-9')}
            />
          </div>
        </SectionHead>

        <div className={tableClass.wrap}>
          {liveFromApi ? (
            <table className={cn(tableClass.table, 'min-w-[640px]')}>
              <thead>
                <tr>
                  <th className={tableClass.th}>#</th>
                  <th className={tableClass.th}>Player</th>
                  <th className={tableClass.th}>Correct</th>
                  <th className={tableClass.th}>Skipped</th>
                  <th className={tableClass.th}>Wrong</th>
                  <th className={tableClass.th}>Score</th>
                  <th className={tableClass.th}>Points</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#64748B]">
                      {live.loading ? 'Loading live players…' : 'No players have started Quiz Time yet.'}
                    </td>
                  </tr>
                ) : (
                  players.map((player) => (
                    <tr key={player.userId} className={tableClass.tr}>
                      <td className={tableClass.td}>
                        <RankBadge rank={player.rank} />
                      </td>
                      <td className={tableClass.td}>
                        <PlayerName name={player.playerName} />
                      </td>
                      <td className={cn(tableClass.td, 'font-semibold tabular-nums')}>
                        {player.correctCount}/{player.totalQuestions}
                      </td>
                      <td className={cn(tableClass.td, 'tabular-nums text-[#64748B]')}>{player.skippedCount}</td>
                      <td className={cn(tableClass.td, 'tabular-nums text-[#64748B]')}>{player.wrongCount}</td>
                      <td className={cn(tableClass.td, 'whitespace-nowrap tabular-nums')}>
                        <span className="font-semibold">{player.sessionScore}</span>{' '}
                        <span className="text-[#64748B]">({player.percentage}%)</span>
                      </td>
                      <td className={cn(tableClass.td, 'font-bold tabular-nums text-[#14532D]')}>{player.userPoints}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className={cn(tableClass.table, 'min-w-[760px]')}>
              <thead>
                <tr>
                  <th className={tableClass.th}>Player</th>
                  <th className={tableClass.th}>Score</th>
                  <th className={tableClass.th}>Time</th>
                  <th className={tableClass.th}>Tier Badge</th>
                  <th className={tableClass.th}>Reward Code</th>
                  <th className={cn(tableClass.th, 'text-center')}>Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {filteredWinners.map((w) => (
                  <tr key={w.id} className={tableClass.tr}>
                    <td className={tableClass.td}>
                      <PlayerName name={w.playerName} avatar={w.avatar} />
                    </td>
                    <td className={cn(tableClass.td, 'whitespace-nowrap tabular-nums')}>
                      <span className="font-semibold">
                        {w.score} / {w.totalQuestions}
                      </span>{' '}
                      <span className="text-[#64748B]">({w.percentage}%)</span>
                    </td>
                    <td className={cn(tableClass.td, 'tabular-nums text-[#64748B]')}>{w.timeSpentSeconds}s</td>
                    <td className={tableClass.td}>
                      <Pill tone={TIER_TONE[w.prizeTier] ?? 'gray'}>{w.prizeTier}</Pill>
                    </td>
                    <td className={tableClass.td}>
                      {w.rewardVoucherCode ? (
                        <code className="whitespace-nowrap rounded-lg bg-[#F6F9F7] px-2 py-1 font-mono text-xs font-semibold text-[#0F172A]">
                          {w.rewardVoucherCode}
                        </code>
                      ) : (
                        <span className="text-[#94A3B8]">None</span>
                      )}
                    </td>
                    <td className={cn(tableClass.td, 'text-center')}>
                      <Button
                        size="xs"
                        variant={w.prizeClaimed ? 'secondary' : 'outline'}
                        onClick={() => handleToggleClaim(w.id)}
                      >
                        {!w.prizeClaimed && <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />}
                        {w.prizeClaimed ? '✓ Claimed' : 'Pending'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
