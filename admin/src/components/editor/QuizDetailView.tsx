import React, { useEffect, useMemo, useState } from 'react';
import { Quiz, QuizQuestion } from '../../types/quiz';
import { QuestionCard } from './QuestionCard';
import { QuestionRegenModal } from './QuestionRegenModal';
import { QuestionEditModal } from './QuestionEditModal';
import { ScoringPointsModal } from './ScoringPointsModal';
import { useLiveQuestionBank } from '../../hooks/useLiveQuestionBank';
import {
  bankQuestionToQuizQuestion,
  fetchQuestionBank,
  localizeQuizQuestion,
  type AdminQuizLanguage,
} from '../../services/quizBankApi';
import {
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Coins,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Check,
  CircleCheck,
  Copy,
  Database,
  Gamepad2,
  Inbox,
  Layers,
  ListChecks,
  LoaderCircle,
  Pencil,
  Scissors,
  Shuffle,
  Target,
  Timer,
} from 'lucide-react';
import { Button, EmptyState, IconTile, Pill, inputClass, panelClass, tabClass, tabListClass, type Tone } from '../ui/pb';
import { cn } from '../../lib/utils';

const PAGE_SIZE = 20;

function pageItems(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('ellipsis');
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < total - 1) items.push('ellipsis');
  items.push(total);
  return items;
}

function StatTile({
  title,
  value,
  icon,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tone: Tone;
  onClick?: () => void;
}) {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} className="hidden sm:flex lg:hidden xl:flex" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[#1F2937]">{title}</p>
        <p className="mt-0.5 whitespace-nowrap text-xl font-extrabold leading-tight tabular-nums text-[#0B1220] sm:text-[22px]">
          {value}
        </p>
      </div>
    </>
  );
  const shell = cn(panelClass, 'flex items-center gap-3.5 p-4 text-left');
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={cn(
          shell,
          'group transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16A34A]/20',
        )}
      >
        {body}
        <Pencil className="h-4 w-4 shrink-0 self-start text-[#94A3B8] transition-colors group-hover:text-[#16A34A]" />
      </button>
    );
  }
  return <div className={shell}>{body}</div>;
}

function Notice({ tone, title, children }: { tone: 'red' | 'green'; title?: string; children: React.ReactNode }) {
  const red = tone === 'red';
  const Icon = red ? AlertTriangle : CircleCheck;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
        red ? 'border-[#FBD5DD] bg-[#FFF5F7] text-[#9F1239]' : 'border-[#CDEFD6] bg-[#F0FBF3] text-[#14532D]',
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', red ? 'text-[#E11D48]' : 'text-[#16A34A]')} />
      <div className="min-w-0 break-words">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5' : 'font-medium'}>{children}</div>
      </div>
    </div>
  );
}

interface QuizDetailViewProps {
  quiz: Quiz;
  onUpdateQuiz: (updated: Quiz) => void;
  liveFromApi?: boolean;
}

export const QuizDetailView: React.FC<QuizDetailViewProps> = ({
  quiz,
  onUpdateQuiz,
  liveFromApi = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [viewLanguage, setViewLanguage] = useState<AdminQuizLanguage>('en');
  const [regenTarget, setRegenTarget] = useState<QuizQuestion | null>(null);
  const [editTarget, setEditTarget] = useState<QuizQuestion | null>(null);
  const [copied, setCopied] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [scoringSaving, setScoringSaving] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [remoteMatches, setRemoteMatches] = useState<QuizQuestion[] | null>(null);
  const [searchingBank, setSearchingBank] = useState(false);
  const live = useLiveQuestionBank(liveFromApi);

  // Handle single question swap
  const handleApplySwap = (newQuestion: QuizQuestion) => {
    const updatedQuestions = quiz.questions.map((q) =>
      q.id === newQuestion.id ? newQuestion : q
    );
    onUpdateQuiz({
      ...quiz,
      questions: updatedQuestions,
    });
  };

  // Handle manual question save
  const handleSaveQuestion = (updatedQuestion: QuizQuestion) => {
    const updatedQuestions = quiz.questions.map((q) =>
      q.id === updatedQuestion.id ? updatedQuestion : q
    );
    onUpdateQuiz({
      ...quiz,
      questions: updatedQuestions,
    });
  };

  // Delete question
  const handleDeleteQuestion = async (id: string) => {
    if (liveFromApi) {
      const ok = window.confirm(
        'Delete this question from the live bank? Players will not get it in new quizzes. Past sessions stay intact.',
      );
      if (!ok) return;
      try {
        await live.removeQuestion(id);
      } catch {
        // Error is shown by the live bank hook.
      }
      return;
    }
    const remaining = quiz.questions
      .filter((q) => q.id !== id)
      .map((q, idx) => ({ ...q, order: idx + 1 }));
    onUpdateQuiz({
      ...quiz,
      questions: remaining,
      questionsCount: remaining.length,
    });
  };

  // Reorder
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newQuestions = [...quiz.questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index - 1];
    newQuestions[index - 1] = temp;
    const renumbered = newQuestions.map((q, idx) => ({ ...q, order: idx + 1 }));
    onUpdateQuiz({ ...quiz, questions: renumbered });
  };

  const handleMoveDown = (index: number) => {
    if (index === quiz.questions.length - 1) return;
    const newQuestions = [...quiz.questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + 1];
    newQuestions[index + 1] = temp;
    const renumbered = newQuestions.map((q, idx) => ({ ...q, order: idx + 1 }));
    onUpdateQuiz({ ...quiz, questions: renumbered });
  };

  // Add question
  const handleAddNewQuestion = () => {
    const newOrder = quiz.questions.length + 1;
    const newQ: QuizQuestion = {
      id: `q-manual-${Date.now()}`,
      order: newOrder,
      question: 'New Question Prompt...',
      options: [
        { id: 'A', text: 'Option A (Correct)', isCorrect: true },
        { id: 'B', text: 'Option B', isCorrect: false },
        { id: 'C', text: 'Option C', isCorrect: false },
        { id: 'D', text: 'Option D', isCorrect: false },
      ],
      explanation: 'Provide explanation for players.',
      funFact: 'Trivia fact.',
      difficulty: 'medium',
      topicTag: quiz.topic,
      points: 10,
      timeLimitSeconds: 20,
      aiConfidence: 1.0,
    };
    onUpdateQuiz({
      ...quiz,
      questions: [...quiz.questions, newQ],
      questionsCount: quiz.questions.length + 1,
    });
    setEditTarget(newQ);
  };

  // Toggle publish
  const handleToggleStatus = () => {
    const nextStatus = quiz.status === 'published' ? 'draft' : 'published';
    onUpdateQuiz({ ...quiz, status: nextStatus });
  };

  useEffect(() => {
    if (!liveFromApi) return;
    const query = searchQuery.trim();
    if (query.length < 2) {
      setRemoteMatches(null);
      setSearchingBank(false);
      return;
    }

    let cancelled = false;
    setSearchingBank(true);
    const timer = window.setTimeout(() => {
      void fetchQuestionBank({ search: query, isActive: true, limit: 50 })
        .then((page) => {
          if (cancelled) return;
          setRemoteMatches(
            page.questions.map((row, index) =>
              bankQuestionToQuizQuestion(row, index, live.settings),
            ),
          );
        })
        .catch(() => {
          if (!cancelled) setRemoteMatches(null);
        })
        .finally(() => {
          if (!cancelled) setSearchingBank(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [liveFromApi, live.settings, searchQuery]);

  const sourceQuestions =
    liveFromApi && remoteMatches ? remoteMatches : liveFromApi ? live.questions : quiz.questions;
  const perQuiz = live.settings?.questionsPerQuiz ?? 12;
  const scoringValues = {
    pointsPerCorrect: Number(live.settings?.pointsPerCorrect ?? 20),
    completeQuizBonus: Number(live.settings?.completeQuizBonus ?? 30),
    questionsPerQuiz: Number(live.settings?.questionsPerQuiz ?? 12),
    timerSeconds: Number(live.settings?.timerSeconds ?? 15),
  };

  const handleCopyJSON = () => {
    const payload = liveFromApi
      ? { source: 'pb-zone-quiz-api', total: live.total, active: live.active, settings: live.settings, questions: live.questions }
      : quiz;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredQuestions = useMemo(() => {
    return sourceQuestions.filter((q) => {
      const matchesDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
      const matchesSearch =
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.options.some((opt) => opt.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
        q.topicTag.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLang =
        !liveFromApi ||
        viewLanguage === 'en' ||
        Boolean(q.locales?.[viewLanguage]?.question?.trim());
      return matchesDiff && matchesSearch && matchesLang;
    });
  }, [sourceQuestions, selectedDifficulty, searchQuery, liveFromApi, viewLanguage]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedQuestions = filteredQuestions.slice(pageStart, pageStart + PAGE_SIZE);
  const showingFrom = filteredQuestions.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + PAGE_SIZE, filteredQuestions.length);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedDifficulty]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const goToPage = (next: number) => {
    setPage(Math.min(totalPages, Math.max(1, next)));
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      <section className={cn(panelClass, 'p-4 sm:p-5')}>
        <div className="flex items-start gap-3.5">
          <IconTile icon={liveFromApi ? Database : Layers} tone="green" className="hidden sm:flex" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-[#16A34A]">
                {liveFromApi ? 'Live question bank' : 'Deck management'}
              </p>
              <Pill
                tone={liveFromApi || quiz.status === 'published' ? 'green' : 'gray'}
                dot
                className={liveFromApi ? undefined : 'capitalize'}
              >
                {liveFromApi ? 'API bank' : quiz.status}
              </Pill>
            </div>
            <h2 className="mt-1 text-lg font-bold leading-tight text-[#0B1220] sm:text-xl">
              {liveFromApi ? 'PB Zone Quiz — Live Questions' : quiz.title}
            </h2>
            <p className="mt-1.5 max-w-4xl break-words text-sm leading-relaxed text-[#5F6F83]">
              {liveFromApi
                ? `Roz 10:00 AM IST pe naya ${live.target} AI questions automatically replace hote hain — bank ${live.target} pe hi rehta hai, roz manually trim nahi karna. Har player ko ${perQuiz} alag shuffled questions milte hain${live.upstream ? ` · ${live.upstream}` : ''}.`
                : quiz.description}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#EEF2F6] pt-4 sm:flex sm:flex-wrap sm:items-center">
          {!liveFromApi && (
            <Button variant={quiz.status === 'published' ? 'outline' : 'primary'} onClick={handleToggleStatus}>
              {quiz.status === 'published' ? 'Unpublish Quiz' : 'Publish Quiz to Live'}
            </Button>
          )}

          {liveFromApi && (
            <>
              <Button
                onClick={() => void live.refresh()}
                disabled={live.loading || live.refreshingDaily || live.pruning}
              >
                <RefreshCw className={cn('h-4 w-4', live.loading ? 'animate-spin' : '')} />
                Refresh from API
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const cap = live.target;
                  const ok = window.confirm(
                    `Run daily refresh now? This generates a fresh set of up to ${cap} AI questions and retires older ones so the live bank stays at ${cap}. It may take several minutes.`,
                  );
                  if (!ok) return;
                  void live.runDailyRefresh();
                }}
                disabled={live.loading || live.refreshingDaily || live.pruning}
              >
                {live.refreshingDaily ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                {live.refreshingDaily ? 'Generating…' : 'Run daily refresh'}
              </Button>
              {live.active > live.target && (
                <Button
                  variant="danger"
                  onClick={() => {
                    const extra = live.active - live.target;
                    const ok = window.confirm(
                      `Keep only the latest ${live.target} questions? This will retire ${extra} older stacked questions from new quizzes. Past player sessions stay intact.`,
                    );
                    if (!ok) return;
                    void live.pruneToLatest();
                  }}
                  disabled={live.loading || live.refreshingDaily || live.pruning}
                >
                  {live.pruning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                  {live.pruning ? 'Trimming…' : `Keep latest ${live.target}`}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setScoringError(null);
                  setScoringOpen(true);
                }}
              >
                <Coins className="h-4 w-4" />
                Set scoring points
              </Button>
            </>
          )}

          <Button variant="outline" onClick={handleCopyJSON}>
            {copied ? <Check className="h-4 w-4 text-[#16A34A]" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Export JSON'}
          </Button>

          {!liveFromApi && (
            <Button variant="secondary" onClick={handleAddNewQuestion} className="sm:ml-auto">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          )}
        </div>
      </section>

      <div className={cn('grid grid-cols-2 gap-3 sm:gap-4', liveFromApi ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <StatTile
          icon={liveFromApi ? Database : ListChecks}
          tone="green"
          title={liveFromApi ? 'Active / Cap' : 'Questions'}
          value={liveFromApi ? `${live.active} / ${live.target}` : `${quiz.questions.length} / 20`}
        />
        <StatTile
          icon={liveFromApi ? Shuffle : Target}
          tone="blue"
          title={liveFromApi ? 'Per quiz' : 'Pass mark'}
          value={liveFromApi ? `${perQuiz} Qs` : `${quiz.passScore} pts`}
        />
        <StatTile
          icon={liveFromApi ? Timer : Gamepad2}
          tone="orange"
          title={liveFromApi ? 'Timer' : 'Plays'}
          value={liveFromApi ? `${live.settings?.timerSeconds ?? 15}s` : String(quiz.playsCount)}
        />
        {liveFromApi && (
          <StatTile
            icon={Coins}
            tone="purple"
            title="Scoring"
            value={`+${scoringValues.pointsPerCorrect}/+${scoringValues.completeQuizBonus}`}
            onClick={() => {
              setScoringError(null);
              setScoringOpen(true);
            }}
          />
        )}
      </div>

      <section className={cn(panelClass, 'flex flex-col gap-3 p-4 sm:p-5')}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md md:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={liveFromApi ? 'Search the full quiz API bank…' : 'Search question text or options...'}
              className={cn(inputClass, 'pl-9')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {liveFromApi ? (
              <div className={tabListClass} role="radiogroup" aria-label="Question language">
                {(
                  [
                    { code: 'en', label: 'EN' },
                    { code: 'hi', label: 'HI' },
                    { code: 'gu', label: 'GU' },
                  ] as const
                ).map((opt) => {
                  const selected = viewLanguage === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setViewLanguage(opt.code)}
                      className={tabClass(selected)}
                      title={
                        opt.code === 'en'
                          ? 'English'
                          : opt.code === 'hi'
                            ? 'Hindi'
                            : 'Gujarati'
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className={tabListClass}>
              {['all', 'easy', 'medium', 'hard'].map((diff) => {
                const selected = selectedDifficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setSelectedDifficulty(diff)}
                    className={cn(tabClass(selected), 'capitalize')}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-[#EEF2F6] pt-3 text-xs text-[#64748B]">
          <span className="font-medium tabular-nums text-[#334155]">
            Showing {showingFrom}–{showingTo} of {filteredQuestions.length}
            {liveFromApi
              ? remoteMatches
                ? ` matching the live bank${searchingBank ? '…' : ''}`
                : ` loaded · bank ${live.active || live.total}`
              : ' questions'}
            {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ''}
            {liveFromApi
              ? ` · view ${viewLanguage === 'en' ? 'English' : viewLanguage === 'hi' ? 'Hindi' : 'Gujarati'}`
              : ''}
          </span>
          <span>
            {liveFromApi
              ? 'Generated bank questions with the correct answer marked. Option order is shuffled only in the Quiz Time game.'
              : 'Click "Swap Q#" on any question to regenerate it with AI'}
          </span>
        </div>
      </section>

      {liveFromApi && live.active > live.target && (
        <Notice tone="red" title="Question bank is stacking">
          {live.active} active questions are live, but only the latest {live.target} should stay.
          Click Keep latest {live.target} to retire the older set, or run daily refresh to replace the bank.
        </Notice>
      )}

      {liveFromApi && live.status && !live.error && <Notice tone="green">{live.status}</Notice>}

      {liveFromApi && live.error && (
        <Notice tone="red" title="Could not load live quiz questions">
          {live.error}
        </Notice>
      )}

      {liveFromApi && (live.loading || live.pruning || live.refreshingDaily) && (
        <div className={cn(panelClass, 'flex items-center justify-center gap-2.5 px-6 py-10 text-center text-sm text-[#64748B]')}>
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#16A34A]" />
          <p>
            {live.pruning
              ? `Retiring older questions so the live bank stays at ${live.target}…`
              : live.refreshingDaily
                ? 'Generating the daily question set…'
                : 'Loading questions from the PB Zone quiz API…'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {pagedQuestions.map((q, idx) => {
          const listIndex = liveFromApi
            ? pageStart + idx
            : quiz.questions.findIndex((item) => item.id === q.id);
          return (
            <QuestionCard
              key={q.id}
              question={liveFromApi ? localizeQuizQuestion(q, viewLanguage) : q}
              index={listIndex < 0 ? pageStart + idx : listIndex}
              totalQuestions={sourceQuestions.length}
              readOnly={liveFromApi}
              allowDelete={liveFromApi}
              deleting={liveFromApi && live.deletingId === q.id}
              onRegenerate={(question) => setRegenTarget(question)}
              onEdit={(question) => setEditTarget(question)}
              onDelete={(id) => void handleDeleteQuestion(id)}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          );
        })}
        {liveFromApi && !live.loading && !live.error && filteredQuestions.length === 0 && (
          <div className={panelClass}>
            <EmptyState
              icon={Inbox}
              title="Question bank is empty, or list API is not deployed yet."
              description="Seed / daily-refresh the quiz API, then refresh."
            />
          </div>
        )}
      </div>

      {filteredQuestions.length > 0 && (
        <div className={cn(panelClass, 'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5')}>
          <p className="text-center text-sm text-[#64748B] sm:text-left">{PAGE_SIZE} questions per page</p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Prev</span>
            </Button>
            {pageItems(currentPage, totalPages).map((item, idx) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-sm text-[#94A3B8]">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => goToPage(item)}
                  aria-current={item === currentPage ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums transition-colors',
                    item === currentPage
                      ? 'bg-[#16A34A] text-white shadow-sm'
                      : 'text-[#475569] hover:bg-[#EEF3EF] hover:text-[#0F172A]',
                  )}
                >
                  {item}
                </button>
              ),
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <span className="sr-only sm:not-sr-only">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Single Question Swap Modal */}
      {regenTarget && (
        <QuestionRegenModal
          question={regenTarget}
          quizTopic={quiz.topic}
          isOpen={Boolean(regenTarget)}
          onClose={() => setRegenTarget(null)}
          onApplySwap={handleApplySwap}
        />
      )}

      {/* Manual Edit Modal */}
      {editTarget && (
        <QuestionEditModal
          question={editTarget}
          isOpen={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveQuestion}
        />
      )}

      {liveFromApi && (
        <ScoringPointsModal
          isOpen={scoringOpen}
          initial={scoringValues}
          saving={scoringSaving}
          error={scoringError}
          onClose={() => {
            if (scoringSaving) return;
            setScoringOpen(false);
          }}
          onSave={async (values) => {
            setScoringSaving(true);
            setScoringError(null);
            try {
              await live.saveScoring(values);
              setScoringOpen(false);
            } catch (err) {
              setScoringError(
                err instanceof Error ? err.message : 'Could not save scoring points.',
              );
            } finally {
              setScoringSaving(false);
            }
          }}
        />
      )}
    </div>
  );
};
