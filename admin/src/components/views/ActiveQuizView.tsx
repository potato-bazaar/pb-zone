import React from 'react';
import { Quiz, QuizQuestion } from '../../types/quiz';
import { 
  Radio, 
  Play, 
  Edit3, 
  Sparkles, 
  Check, 
  Clock, 
  Users, 
  Award, 
  ArrowRight,
  ShieldAlert,
  Layers
} from 'lucide-react';

interface ActiveQuizViewProps {
  quiz: Quiz;
  onNavigateToManage: () => void;
  onOpenSimulator: () => void;
  onRegenerateQuestion: (q: QuizQuestion) => void;
  onTogglePublish: () => void;
}

export const ActiveQuizView: React.FC<ActiveQuizViewProps> = ({
  quiz,
  onNavigateToManage,
  onOpenSimulator,
  onRegenerateQuestion,
  onTogglePublish,
}) => {
  const isPublished = quiz.status === 'published';

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-[#E2E2E2] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#0E8345] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0E8345]">
              Live Active Quiz
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black">{quiz.title}</h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5 max-w-2xl">{quiz.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold hover:bg-[#262626] transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Play Test Simulator</span>
          </button>

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
        </div>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Format</div>
          <div className="text-xl font-bold text-black font-mono mt-1">20 Questions</div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">{quiz.timeLimitSeconds}s per question</div>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Pass Mark</div>
          <div className="text-xl font-bold text-black font-mono mt-1">{quiz.passScore} / 20</div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">Required to qualify as Winner</div>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Total Plays</div>
          <div className="text-xl font-bold text-black font-mono mt-1">{quiz.playsCount.toLocaleString()}</div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">Player sessions initiated</div>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Winners Count</div>
          <div className="text-xl font-bold text-black font-mono mt-1">{quiz.winnersCount}</div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">
            {quiz.playsCount > 0 ? `${Math.round((quiz.winnersCount / quiz.playsCount) * 100)}% Win rate` : 'New session'}
          </div>
        </div>
      </div>

      {/* Questions Preview Banner with Quick Swap */}
      <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E2E2] pb-4">
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              20-Question Deck Quick Inspection
            </h3>
            <p className="text-xs text-[#6B6B6B]">
              Review questions currently running on the web UI. Click "Swap" on any question (e.g. Question #3) to re-roll.
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

        {/* 5 Highlighted Questions with instant Swap */}
        <div className="space-y-3">
          {quiz.questions.slice(0, 6).map((q) => {
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
                    <strong>Correct Answer:</strong> {correctOpt?.id}: {correctOpt?.text}
                  </p>
                </div>

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
              </div>
            );
          })}
        </div>

        {quiz.questions.length > 6 && (
          <div className="pt-2 text-center">
            <button
              onClick={onNavigateToManage}
              className="px-4 py-2 text-xs font-semibold bg-[#F6F6F6] hover:bg-[#EEEEEE] text-black border border-[#E2E2E2]"
            >
              View all 20 Questions in Manage Quiz →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
