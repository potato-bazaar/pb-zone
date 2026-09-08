import React, { useState } from 'react';
import { Quiz, QuizQuestion } from '../../types/quiz';
import { QuestionCard } from './QuestionCard';
import { QuestionRegenModal } from './QuestionRegenModal';
import { QuestionEditModal } from './QuestionEditModal';
import { useLiveQuestionBank } from '../../hooks/useLiveQuestionBank';
import { 
  Plus, 
  Search, 
  Play, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface QuizDetailViewProps {
  quiz: Quiz;
  onUpdateQuiz: (updated: Quiz) => void;
  onNavigateToSetup: () => void;
  onOpenSimulator: () => void;
  liveFromApi?: boolean;
}

export const QuizDetailView: React.FC<QuizDetailViewProps> = ({
  quiz,
  onUpdateQuiz,
  onNavigateToSetup,
  onOpenSimulator,
  liveFromApi = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [regenTarget, setRegenTarget] = useState<QuizQuestion | null>(null);
  const [editTarget, setEditTarget] = useState<QuizQuestion | null>(null);
  const [copied, setCopied] = useState(false);
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

  void onNavigateToSetup;

  const handleCopyJSON = () => {
    const payload = liveFromApi
      ? { source: 'pb-zone-quiz-api', total: live.total, active: live.active, settings: live.settings, questions: live.questions }
      : quiz;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredQuestions = sourceQuestions.filter((q) => {
    const matchesDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    const matchesSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.options.some((opt) => opt.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.topicTag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiff && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner Header */}
      <div className="bg-white border border-[#E2E2E2] p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">
                {liveFromApi ? 'Live Quiz API Question Bank' : 'Deck Management (20 Questions)'}
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 font-bold uppercase font-mono ${
                  liveFromApi
                    ? 'bg-[#EBF7EE] text-[#0E8345]'
                    : quiz.status === 'published'
                    ? 'bg-[#EBF7EE] text-[#0E8345]'
                    : 'bg-[#EEEEEE] text-[#545454]'
                }`}
              >
                ● {liveFromApi ? 'API BANK' : quiz.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-black">
              {liveFromApi ? 'PB Zone Quiz — Live Questions' : quiz.title}
            </h1>
            <p className="text-xs text-[#6B6B6B] mt-1 max-w-2xl">
              {liveFromApi
                ? `Roz 10:00 AM IST pe naya AI set bank mein add hota hai. Har player ko ${perQuiz} alag shuffled questions milte hain${live.upstream ? ` · ${live.upstream}` : ''}.`
                : quiz.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center p-3 bg-[#F6F6F6] border border-[#E2E2E2] min-w-[5rem]">
              <div className="text-[10px] uppercase font-bold text-[#6B6B6B]">Questions</div>
              <div className="font-mono font-bold text-base text-black">
                {liveFromApi ? `${live.active} active` : `${quiz.questions.length} / 20`}
              </div>
            </div>
            <div className="text-center p-3 bg-[#F6F6F6] border border-[#E2E2E2] min-w-[5rem]">
              <div className="text-[10px] uppercase font-bold text-[#6B6B6B]">
                {liveFromApi ? 'Per Quiz' : 'Pass Mark'}
              </div>
              <div className="font-mono font-bold text-base text-black">
                {liveFromApi ? `${perQuiz} Qs` : `${quiz.passScore} pts`}
              </div>
            </div>
            <div className="text-center p-3 bg-[#F6F6F6] border border-[#E2E2E2] min-w-[5rem]">
              <div className="text-[10px] uppercase font-bold text-[#6B6B6B]">
                {liveFromApi ? 'Timer' : 'Plays'}
              </div>
              <div className="font-mono font-bold text-base text-black">
                {liveFromApi ? `${live.settings?.timerSeconds ?? 15}s` : quiz.playsCount}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-[#E2E2E2] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!liveFromApi && (
              <button
                onClick={handleToggleStatus}
                className={`px-4 py-2 text-xs font-bold transition-all ${
                  quiz.status === 'published'
                    ? 'bg-white border border-black text-black hover:bg-[#F6F6F6]'
                    : 'bg-[#0E8345] text-white hover:bg-[#0b6b37]'
                }`}
              >
                {quiz.status === 'published' ? 'Unpublish Quiz' : 'Publish Quiz to Live'}
              </button>
            )}

            {liveFromApi && (
              <>
              <button
                onClick={() => void live.refresh()}
                disabled={live.loading || live.refreshingDaily}
                className="px-4 py-2 text-xs font-bold bg-black text-white hover:bg-[#262626] disabled:opacity-60 flex items-center gap-2"
              >
                <RefreshCw className={`h-3 w-3 ${live.loading ? 'animate-spin' : ''}`} />
                Refresh from API
              </button>
              <button
                onClick={() => {
                  const ok = window.confirm(
                    'Run daily refresh now? This resets usage shuffle and can generate up to 600 new AI questions. It may take several minutes.',
                  );
                  if (!ok) return;
                  void live.runDailyRefresh();
                }}
                disabled={live.loading || live.refreshingDaily}
                className="px-4 py-2 text-xs font-bold bg-white border border-black text-black hover:bg-[#F6F6F6] disabled:opacity-60"
              >
                {live.refreshingDaily ? 'Generating…' : 'Run daily refresh'}
              </button>
              </>
            )}

            <button
              onClick={onOpenSimulator}
              className="px-4 py-2 text-xs font-semibold bg-black text-white hover:bg-[#262626] transition-all flex items-center gap-2"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Test Play in Simulator</span>
            </button>

            <button
              onClick={handleCopyJSON}
              className="px-3 py-2 text-xs font-semibold bg-white border border-[#E2E2E2] text-black hover:border-black transition-colors"
            >
              {copied ? 'Copied!' : 'Export JSON'}
            </button>
          </div>

          {!liveFromApi && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNewQuestion}
              className="px-3.5 py-2 text-xs font-semibold bg-white border border-[#E2E2E2] hover:border-black text-black transition-all flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Question</span>
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B6B6B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={liveFromApi ? 'Search the full quiz API bank…' : 'Search question text or options...'}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E2E2] text-xs text-black placeholder-[#6B6B6B] focus:border-black focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#6B6B6B]">Filter Difficulty:</span>
          <div className="flex border border-[#E2E2E2] bg-white text-xs">
            {['all', 'easy', 'medium', 'hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1 capitalize font-medium transition-all ${
                  selectedDifficulty === diff
                    ? 'bg-black text-white font-bold'
                    : 'text-[#545454] hover:text-black'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Note on individual swap */}
      <div className="flex items-center justify-between text-xs text-[#6B6B6B] px-1">
        <span>
          Showing {filteredQuestions.length} of {sourceQuestions.length}
          {liveFromApi ? ` loaded · bank ${live.active || live.total}` : ' questions'}
        </span>
        <span className="text-black font-semibold">
          {liveFromApi
            ? 'Delete a question to soft-remove it from new quizzes. Options are shuffled per player.'
            : '💡 Click "Swap Q#" on any question (e.g. Question #3) to regenerate it with AI'}
        </span>
      </div>

      {liveFromApi && live.error && (
        <div className="flex items-start gap-3 p-4 border border-[#C62828] bg-[#FFF5F5] text-xs text-[#C62828]">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Could not load live quiz questions</div>
            <p className="mt-1 text-[#7F1D1D]">{live.error}</p>
          </div>
        </div>
      )}

      {liveFromApi && live.loading && (
        <div className="bg-white border border-[#E2E2E2] p-8 text-center text-xs text-[#6B6B6B]">
          Loading questions from the PB Zone quiz API…
        </div>
      )}

      {/* Question Cards List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
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
        ))}
        {liveFromApi && !live.loading && !live.error && filteredQuestions.length === 0 && (
          <div className="bg-white border border-[#E2E2E2] p-8 text-center text-xs text-[#6B6B6B]">
            Question bank is empty, or list API is not deployed yet. Seed / daily-refresh the quiz API, then refresh.
          </div>
        )}
      </div>

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
    </div>
  );
};
