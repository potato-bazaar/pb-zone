import React from 'react';
import { Quiz, QuizQuestion } from '../../types/quiz';
import { useLiveQuestionBank } from '../../hooks/useLiveQuestionBank';
import { 
  Radio, 
  Play, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Trash2
} from 'lucide-react';

interface ActiveQuizViewProps {
  quiz: Quiz;
  onNavigateToManage: () => void;
  onOpenSimulator: () => void;
  onRegenerateQuestion: (q: QuizQuestion) => void;
  onTogglePublish: () => void;
  liveFromApi?: boolean;
}

export const ActiveQuizView: React.FC<ActiveQuizViewProps> = ({
  quiz,
  onNavigateToManage,
  onOpenSimulator,
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
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-[#E2E2E2] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#0E8345] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0E8345]">
              {liveFromApi ? 'Live Quiz API Bank' : 'Live Active Quiz'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            {liveFromApi ? 'PB Zone Quiz — Live Questions' : quiz.title}
          </h1>
            <p className="text-xs text-[#6B6B6B] mt-0.5 max-w-2xl">
            {liveFromApi
              ? `Roz 10:00 AM IST AI bank refresh. Har user ko ${perQuiz} alag shuffled questions milte hain${live.upstream ? ` · ${live.upstream}` : ''}.`
              : quiz.description}
            </p>
        </div>

        <div className="flex items-center gap-2">
          {liveFromApi && (
            <button
              onClick={() => void live.refresh()}
              disabled={live.loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black text-black text-xs font-bold hover:bg-[#F6F6F6] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${live.loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold hover:bg-[#262626] transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Play Test Simulator</span>
          </button>

          {!liveFromApi && (
          <button
            onClick={onTogglePublish}
            className={`px-4 py-2.5 text-xs font-semibold border transition-all ${
              isPublished
                ? 'bg-white border-[#E2E2E2] text-black hover:border-black'
                : 'bg-[#0E8345] border-[#0E8345] text-white hover:bg-[#0b6b37]'
            }`}
          >
            {isPublished ? 'Unpublish' : 'Make Active'}
          </button>
          )}
        </div>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Format</div>
          <div className="text-xl font-bold text-black font-mono mt-1">
            {liveFromApi ? `${perQuiz} / session` : '20 Questions'}
          </div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">
            {liveFromApi ? `${live.settings?.timerSeconds ?? 15}s per question` : `${quiz.timeLimitSeconds}s per question`}
          </div>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">
            {liveFromApi ? 'Bank Size' : 'Pass Mark'}
          </div>
          <div className="text-xl font-bold text-black font-mono mt-1">
            {liveFromApi ? live.total : `${quiz.passScore} / 20`}
          </div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">
            {liveFromApi ? `${live.active} active in rotation` : 'Required to qualify as Winner'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Total Plays</div>
          <div className="text-xl font-bold text-black font-mono mt-1">
            {liveFromApi && live.loading ? '—' : totalPlays.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">
            {liveFromApi ? 'Unique players who played' : 'Player sessions initiated'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Winners Count</div>
          <div className="text-xl font-bold text-black font-mono mt-1">
            {liveFromApi && live.loading ? '—' : winnersCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">{winnersSubtitle}</div>
        </div>
      </div>

      {/* Questions Preview Banner with Quick Swap */}
      <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E2E2] pb-4">
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              {liveFromApi ? 'Live API Question Preview' : '20-Question Deck Quick Inspection'}
            </h3>
            <p className="text-xs text-[#6B6B6B]">
              {liveFromApi
                ? 'Newest AI questions first. Delete removes a question from future player sessions (soft delete).'
                : 'Review questions currently running on the web UI. Click "Swap" on any question (e.g. Question #3) to re-roll.'}
            </p>
          </div>

          <button
            onClick={onNavigateToManage}
            className="flex items-center gap-1.5 text-xs font-bold text-black hover:underline"
          >
            <span>Open Full Deck Manager</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {liveFromApi && live.error && (
          <div className="flex items-start gap-2 p-3 border border-[#C62828] bg-[#FFF5F5] text-xs text-[#C62828]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{live.error}</span>
          </div>
        )}

        {liveFromApi && !live.loading && previewQuestions.length === 0 && (
          <div className="text-xs text-[#6B6B6B] border border-dashed border-[#E2E2E2] p-4">
            Live question list API is empty or not deployed yet. Stats still load from the quiz API.
          </div>
        )}

        {/* Highlighted Questions */}
        <div className="space-y-3">
          {previewQuestions.slice(0, 6).map((q) => {
            const correctOpt = q.options.find((o) => o.isCorrect);
            return (
              <div
                key={q.id}
                className="p-4 border border-[#E2E2E2] hover:border-black transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5">
                      #{q.order}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#6B6B6B]">
                      {q.difficulty} • {q.topicTag}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-black">{q.question}</p>
                  <p className="text-[11px] text-[#545454]">
                    <strong>Correct Answer:</strong>{' '}
                    {correctOpt ? `${correctOpt.id}: ${correctOpt.text}` : 'Not revealed yet — still in play'}
                  </p>
                </div>

                {liveFromApi && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      const ok = window.confirm(
                        'Delete this question from the live bank? It will not appear in new quizzes.',
                      );
                      if (!ok) return;
                      void live.removeQuestion(q.id);
                    }}
                    disabled={live.deletingId === q.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-[#C62828] text-[#C62828] hover:bg-[#C62828] hover:text-white disabled:opacity-50 transition-all"
                    title={`Delete question #${q.order}`}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>{live.deletingId === q.id ? 'Deleting…' : 'Delete'}</span>
                  </button>
                </div>
                )}

                {!liveFromApi && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onRegenerateQuestion(q)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-black hover:bg-black hover:text-white transition-all"
                    title={`Swap question #${q.order}`}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Swap Q#{q.order}</span>
                  </button>
                </div>
                )}
              </div>
            );
          })}
        </div>

        {previewQuestions.length > 6 && (
          <div className="pt-2 text-center">
            <button
              onClick={onNavigateToManage}
              className="px-4 py-2 text-xs font-semibold bg-[#F6F6F6] hover:bg-[#EEEEEE] text-black border border-[#E2E2E2]"
            >
              View all {previewQuestions.length} questions in Manage Quiz →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
