import React from 'react';
import { Quiz, QuizQuestion } from '../../types/quiz';
import { useLiveQuestionBank } from '../../hooks/useLiveQuestionBank';
import {
  Radio,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Database,
  Eye,
  LayoutList,
  Target,
  Trophy,
} from 'lucide-react';
import { PlaySolid } from '../dashboard/dashboardIcons';
import { Button, IconTile, Pill, panelClass, type Tone } from '../ui/pb';
import { cn } from '../../lib/utils';

interface ActiveQuizViewProps {
  quiz: Quiz;
  onNavigateToManage: () => void;
  onRegenerateQuestion: (q: QuizQuestion) => void;
  onTogglePublish: () => void;
  liveFromApi?: boolean;
}

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number | string }>;

const DIFFICULTY_TONE: Record<string, Tone> = { easy: 'green', medium: 'amber', hard: 'red' };

function MetricTile({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  note: React.ReactNode;
  icon: IconType;
  tone: Tone;
}) {
  return (
    <div className={cn(panelClass, 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-3.5')}>
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#1F2937] sm:text-sm">{label}</p>
        <p className="break-words text-xl font-extrabold leading-tight tabular-nums text-[#0B1220] sm:text-[22px]">{value}</p>
        <p className="mt-0.5 text-xs leading-snug text-[#64748B]">{note}</p>
      </div>
    </div>
  );
}

export const ActiveQuizView: React.FC<ActiveQuizViewProps> = ({
  quiz,
  onNavigateToManage,
  onRegenerateQuestion,
  onTogglePublish,
  liveFromApi = false,
}) => {
  const isPublished = quiz.status === 'published';
  const live = useLiveQuestionBank(liveFromApi);
  const previewQuestions = liveFromApi ? live.questions : quiz.questions;
  const perQuiz = live.settings?.questionsPerQuiz ?? 12;
  const totalPlays = liveFromApi ? live.playStats.playerCount : quiz.playsCount;
  const winnersCount = liveFromApi ? live.playStats.topWinnerCount : quiz.winnersCount;
  const uniqueWinners = liveFromApi ? live.playStats.winnersCount : quiz.winnersCount;
  const winnersSubtitle = liveFromApi
    ? live.playStats.topWinnerName
      ? `${live.playStats.topWinnerName} · ${uniqueWinners} unique winner${uniqueWinners === 1 ? '' : 's'}`
      : uniqueWinners > 0
        ? `${uniqueWinners} unique winner${uniqueWinners === 1 ? '' : 's'}`
        : 'No completed quizzes yet'
    : quiz.playsCount > 0
      ? `${Math.round((quiz.winnersCount / quiz.playsCount) * 100)}% Win rate`
      : 'New session';

  return (
    <div className="flex flex-col gap-4 pb-10">
      <section className={cn(panelClass, 'flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between')}>
        <div className="flex min-w-0 items-start gap-3.5">
          <IconTile icon={Radio} tone="green" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h2 className="text-base font-bold leading-tight text-[#0B1220] sm:text-lg">
                {liveFromApi ? 'PB Zone Quiz — Live Questions' : quiz.title}
              </h2>
              <Pill tone="green">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
                </span>
                {liveFromApi ? 'Live Quiz API Bank' : 'Live Active Quiz'}
              </Pill>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#5F6F83]">
              {liveFromApi
                ? `Roz 10:00 AM IST pe naya ${live.target} AI set automatically replace hota hai. Har user ko ${perQuiz} alag shuffled questions milte hain${live.upstream ? ` · ${live.upstream}` : ''}.`
                : quiz.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {liveFromApi && (
            <Button variant="outline" onClick={() => void live.refresh()} disabled={live.loading}>
              <RefreshCw className={cn('h-4 w-4', live.loading && 'animate-spin')} />
              Refresh
            </Button>
          )}

          {!liveFromApi && (
            <Button variant={isPublished ? 'outline' : 'primary'} onClick={onTogglePublish}>
              {isPublished ? 'Unpublish' : 'Make Active'}
            </Button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricTile
          icon={LayoutList}
          tone="green"
          label="Format"
          value={liveFromApi ? `${perQuiz} / session` : '20 Questions'}
          note={liveFromApi ? `${live.settings?.timerSeconds ?? 15}s per question` : `${quiz.timeLimitSeconds}s per question`}
        />
        <MetricTile
          icon={liveFromApi ? Database : Target}
          tone="blue"
          label={liveFromApi ? 'Bank Size' : 'Pass Mark'}
          value={liveFromApi ? live.total : `${quiz.passScore} / 20`}
          note={liveFromApi ? `${live.active} active in rotation` : 'Required to qualify as Winner'}
        />
        <MetricTile
          icon={PlaySolid}
          tone="purple"
          label="Total Plays"
          value={liveFromApi && live.loading ? '—' : totalPlays.toLocaleString()}
          note={liveFromApi ? 'Unique players who played' : 'Player sessions initiated'}
        />
        <MetricTile
          icon={Trophy}
          tone="orange"
          label="Winners Count"
          value={liveFromApi && live.loading ? '—' : winnersCount.toLocaleString()}
          note={winnersSubtitle}
        />
      </div>

      <section className={cn(panelClass, 'flex flex-col gap-3 p-4 sm:p-5')}>
        <div className="mb-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <IconTile icon={Eye} tone="purple" />
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight text-[#0B1220] sm:text-lg">
                {liveFromApi ? 'Live API Question Preview' : '20-Question Deck Quick Inspection'}
              </h2>
              <p className="mt-0.5 text-sm text-[#5F6F83]">
                {liveFromApi
                  ? 'Newest AI questions first. Delete removes a question from future player sessions (soft delete).'
                  : 'Review questions currently running on the web UI. Click "Swap" on any question (e.g. Question #3) to re-roll.'}
              </p>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={onNavigateToManage} className="self-start md:self-center">
            <span>Open Full Deck Manager</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {liveFromApi && live.error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-[#FDE8EC] px-4 py-3 text-sm text-[#BE123C]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{live.error}</span>
          </div>
        )}

        {liveFromApi && !live.loading && previewQuestions.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#D5E2D9] bg-[#F6F9F7] px-4 py-6 text-center text-sm text-[#64748B]">
            Live question list API is empty or not deployed yet. Stats still load from the quiz API.
          </div>
        )}

        {previewQuestions.slice(0, 6).map((q) => {
          const correctOpt = q.options.find((o) => o.isCorrect);
          return (
            <div
              key={q.id}
              className="flex flex-col gap-3 rounded-xl border border-[#E6ECE8] bg-white p-4 transition-colors hover:border-[#B7E4C2] hover:bg-[#FBFDFB] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-lg bg-[#E3F8E8] px-2 text-xs font-bold tabular-nums text-[#14532D]">
                    #{q.order}
                  </span>
                  <Pill tone={DIFFICULTY_TONE[q.difficulty] ?? 'gray'} className="capitalize">
                    {q.difficulty}
                  </Pill>
                  <span className="text-xs font-medium text-[#64748B]">{q.topicTag}</span>
                </div>
                <p className="text-sm font-semibold leading-snug text-[#0F172A]">{q.question}</p>
                <p className="text-xs leading-relaxed text-[#5F6F83]">
                  <strong className="font-semibold text-[#334155]">Correct Answer:</strong>{' '}
                  {correctOpt ? `${correctOpt.id}: ${correctOpt.text}` : 'Not revealed yet — still in play'}
                </p>
              </div>

              {liveFromApi && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const ok = window.confirm(
                        'Delete this question from the live bank? It will not appear in new quizzes.',
                      );
                      if (!ok) return;
                      void live.removeQuestion(q.id);
                    }}
                    disabled={live.deletingId === q.id}
                    title={`Delete question #${q.order}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{live.deletingId === q.id ? 'Deleting…' : 'Delete'}</span>
                  </Button>
                </div>
              )}

              {!liveFromApi && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onRegenerateQuestion(q)}
                    title={`Swap question #${q.order}`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Swap Q#{q.order}</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {previewQuestions.length > 6 && (
          <div className="flex justify-center pt-1">
            <Button variant="outline" onClick={onNavigateToManage}>
              View all {previewQuestions.length} questions in Manage Quiz →
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};
