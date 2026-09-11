import React, { useEffect, useMemo, useState } from 'react';
import { Quiz, QuizQuestion } from '../../types/quiz';
import { QuestionCard } from './QuestionCard';
import { QuestionRegenModal } from './QuestionRegenModal';
import { QuestionEditModal } from './QuestionEditModal';
import { ScoringPointsModal } from './ScoringPointsModal';
import { useLiveQuestionBank } from '../../hooks/useLiveQuestionBank';
import { 
  Plus, 
  Search, 
  RefreshCw,
  AlertTriangle,
  Coins,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
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
  onClick,
}: {
  title: string;
  value: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums leading-none whitespace-nowrap">{value}</p>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className="rounded-lg border bg-card p-3 text-left shadow-none hover:bg-accent"
      >
        {body}
      </button>
    );
  }
  return (
    <Card className="shadow-none">
      <div className="p-3">{body}</div>
    </Card>
  );
}

const btnPrimary =
  'inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60';
const btnOutline =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent disabled:opacity-60';

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
  const [regenTarget, setRegenTarget] = useState<QuizQuestion | null>(null);
  const [editTarget, setEditTarget] = useState<QuizQuestion | null>(null);
  const [copied, setCopied] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [scoringSaving, setScoringSaving] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
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

  const sourceQuestions = liveFromApi ? live.questions : quiz.questions;
  const perQuiz = live.settings?.questionsPerQuiz ?? 12;
  const scoringValues = {
    pointsPerCorrect: Number(live.settings?.pointsPerCorrect ?? 20),
    fastAnswerBonus: Number(live.settings?.fastAnswerBonus ?? 5),
    completeQuizBonus: Number(live.settings?.completeQuizBonus ?? 30),
    questionsPerQuiz: Number(live.settings?.questionsPerQuiz ?? 12),
    timerSeconds: Number(live.settings?.timerSeconds ?? 15),
    fastAnswerSeconds: Number(live.settings?.fastAnswerSeconds ?? 5),
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
      return matchesDiff && matchesSearch;
    });
  }, [sourceQuestions, selectedDifficulty, searchQuery]);

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
    <div className="flex flex-col gap-3 pb-10">
      <Card className="shadow-none">
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {liveFromApi ? 'Live question bank' : 'Deck management'}
              </p>
              <Badge
                className={
                  liveFromApi || quiz.status === 'published'
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                }
              >
                <span
                  className={cn(
                    'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                    liveFromApi || quiz.status === 'published' ? 'bg-green-600' : 'bg-gray-400',
                  )}
                />
                {liveFromApi ? 'API bank' : quiz.status}
              </Badge>
            </div>
            <h1 className="text-lg font-semibold leading-tight">
              {liveFromApi ? 'PB Zone Quiz — Live Questions' : quiz.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {liveFromApi
                ? `Roz 10:00 AM IST pe naya ${live.target} AI questions automatically replace hote hain — bank ${live.target} pe hi rehta hai, roz manually trim nahi karna. Har player ko ${perQuiz} alag shuffled questions milte hain${live.upstream ? ` · ${live.upstream}` : ''}.`
                : quiz.description}
            </p>
          </div>
        </div>
      </Card>

      <div className={cn('grid grid-cols-2 gap-2', liveFromApi ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <StatTile
          title={liveFromApi ? 'Active / Cap' : 'Questions'}
          value={liveFromApi ? `${live.active} / ${live.target}` : `${quiz.questions.length} / 20`}
        />
        <StatTile
          title={liveFromApi ? 'Per quiz' : 'Pass mark'}
          value={liveFromApi ? `${perQuiz} Qs` : `${quiz.passScore} pts`}
        />
        <StatTile
          title={liveFromApi ? 'Timer' : 'Plays'}
          value={liveFromApi ? `${live.settings?.timerSeconds ?? 15}s` : String(quiz.playsCount)}
        />
        {liveFromApi && (
          <StatTile
            title="Scoring"
            value={`+${scoringValues.pointsPerCorrect}/+${scoringValues.fastAnswerBonus}/+${scoringValues.completeQuizBonus}`}
            onClick={() => {
              setScoringError(null);
              setScoringOpen(true);
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {!liveFromApi && (
            <button type="button" onClick={handleToggleStatus} className={quiz.status === 'published' ? btnOutline : btnPrimary}>
              {quiz.status === 'published' ? 'Unpublish Quiz' : 'Publish Quiz to Live'}
            </button>
          )}

          {liveFromApi && (
            <>
              <button
                type="button"
                onClick={() => void live.refresh()}
                disabled={live.loading || live.refreshingDaily || live.pruning}
                className={btnPrimary}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', live.loading ? 'animate-spin' : '')} />
                Refresh from API
              </button>
              <button
                type="button"
                onClick={() => {
                  const cap = live.target;
                  const ok = window.confirm(
                    `Run daily refresh now? This generates a fresh set of up to ${cap} AI questions and retires older ones so the live bank stays at ${cap}. It may take several minutes.`,
                  );
                  if (!ok) return;
                  void live.runDailyRefresh();
                }}
                disabled={live.loading || live.refreshingDaily || live.pruning}
                className={btnOutline}
              >
                {live.refreshingDaily ? 'Generating…' : 'Run daily refresh'}
              </button>
              {live.active > live.target && (
                <button
                  type="button"
                  onClick={() => {
                    const extra = live.active - live.target;
                    const ok = window.confirm(
                      `Keep only the latest ${live.target} questions? This will retire ${extra} older stacked questions from new quizzes. Past player sessions stay intact.`,
                    );
                    if (!ok) return;
                    void live.pruneToLatest();
                  }}
                  disabled={live.loading || live.refreshingDaily || live.pruning}
                  className="inline-flex h-8 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {live.pruning ? 'Trimming…' : `Keep latest ${live.target}`}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setScoringError(null);
                  setScoringOpen(true);
                }}
                className={btnOutline}
              >
                <Coins className="h-3.5 w-3.5" />
                Set scoring points
              </button>
            </>
          )}

          <button type="button" onClick={handleCopyJSON} className={btnOutline}>
            {copied ? 'Copied!' : 'Export JSON'}
          </button>
        </div>

        {!liveFromApi && (
          <button type="button" onClick={handleAddNewQuestion} className={btnOutline}>
            <Plus className="h-3.5 w-3.5" />
            Add Question
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={liveFromApi ? 'Search the full quiz API bank…' : 'Search question text or options...'}
            className="h-8 w-full rounded-md border border-input bg-background px-3 pl-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {['all', 'easy', 'medium', 'hard'].map((diff) => {
            const selected = selectedDifficulty === diff;
            return (
              <button
                key={diff}
                type="button"
                onClick={() => setSelectedDifficulty(diff)}
                className={cn(
                  'inline-flex h-8 items-center rounded-md px-2.5 text-sm capitalize',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-input bg-background text-foreground hover:bg-accent',
                )}
              >
                {diff}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-0.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {showingFrom}–{showingTo} of {filteredQuestions.length}
          {liveFromApi ? ` loaded · bank ${live.active || live.total}` : ' questions'}
          {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ''}
        </span>
        <span>
          {liveFromApi
            ? 'Older questions are retired when a new daily set lands. Delete one to soft-remove it from new quizzes.'
            : 'Click "Swap Q#" on any question to regenerate it with AI'}
        </span>
      </div>

      {liveFromApi && live.active > live.target && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Question bank is stacking</p>
            <p className="mt-0.5">
              {live.active} active questions are live, but only the latest {live.target} should stay.
              Click Keep latest {live.target} to retire the older set, or run daily refresh to replace the bank.
            </p>
          </div>
        </div>
      )}

      {liveFromApi && live.status && !live.error && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
          {live.status}
        </div>
      )}

      {liveFromApi && live.error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Could not load live quiz questions</p>
            <p className="mt-0.5">{live.error}</p>
          </div>
        </div>
      )}

      {liveFromApi && (live.loading || live.pruning || live.refreshingDaily) && (
        <Card className="shadow-none">
          <p className="p-6 text-center text-sm text-muted-foreground">
            {live.pruning
              ? `Retiring older questions so the live bank stays at ${live.target}…`
              : live.refreshingDaily
                ? 'Generating the daily question set…'
                : 'Loading questions from the PB Zone quiz API…'}
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {pagedQuestions.map((q, idx) => {
          const listIndex = liveFromApi
            ? pageStart + idx
            : quiz.questions.findIndex((item) => item.id === q.id);
          return (
            <QuestionCard
              key={q.id}
              question={q}
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
          <Card className="shadow-none">
            <p className="p-6 text-center text-sm text-muted-foreground">
              Question bank is empty, or list API is not deployed yet. Seed / daily-refresh the quiz API, then refresh.
            </p>
          </Card>
        )}
      </div>

      {filteredQuestions.length > 0 && (
        <Card className="shadow-none">
          <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{PAGE_SIZE} questions per page</p>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className={btnOutline}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              {pageItems(currentPage, totalPages).map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToPage(item)}
                    className={cn(
                      'h-8 min-w-8 rounded-md px-2 text-sm',
                      item === currentPage
                        ? 'bg-primary font-medium text-primary-foreground'
                        : 'border border-input bg-background hover:bg-accent',
                    )}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={btnOutline}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Card>
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
