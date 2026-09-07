import React, { useState } from 'react';
import { QuizQuestion } from '../../types/quiz';
import { aiQuizService } from '../../services/aiQuizService';
import { 
  Sparkles, 
  X, 
  ArrowRightLeft, 
  Check, 
  RefreshCw 
} from 'lucide-react';

interface QuestionRegenModalProps {
  question: QuizQuestion;
  quizTopic: string;
  isOpen: boolean;
  onClose: () => void;
  onApplySwap: (newQuestion: QuizQuestion) => void;
}

export const QuestionRegenModal: React.FC<QuestionRegenModalProps> = ({
  question,
  quizTopic,
  isOpen,
  onClose,
  onApplySwap,
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [candidate, setCandidate] = useState<QuizQuestion | null>(null);

  if (!isOpen) return null;

  const quickPromptTags = [
    'Make it more challenging & tricky',
    'Focus on French fries & snack culture',
    'Focus on Guinness world records',
    'Focus on botany & potato nightshade science',
    'Add an intriguing food history angle',
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const generated = await aiQuizService.regenerateSingleQuestion(
        question,
        quizTopic,
        customPrompt
      );
      setCandidate(generated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSwap = () => {
    if (candidate) {
      onApplySwap(candidate);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-black p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E2E2]">
          <div className="flex items-center gap-3">
            <span className="h-7 w-7 bg-black text-white flex items-center justify-center font-bold text-xs font-mono">
              #{question.order}
            </span>
            <div>
              <h2 className="text-base font-bold text-black">
                Regenerate & Swap Question #{question.order}
              </h2>
              <p className="text-xs text-[#6B6B6B]">
                Swap this single question with an AI-generated replacement while preserving question order.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#6B6B6B] hover:text-black transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Question Being Replaced */}
        <div className="p-3 bg-[#F6F6F6] border border-[#E2E2E2] space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#6B6B6B]">
            Current Question #{question.order}
          </div>
          <p className="text-xs font-semibold text-black">{question.question}</p>
        </div>

        {/* Prompt Refinement Controls */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-[#333333]">
            AI Guidance (Optional)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quickPromptTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setCustomPrompt(tag)}
                className={`text-[11px] px-2.5 py-1 border transition-all ${
                  customPrompt === tag
                    ? 'bg-black text-white border-black font-semibold'
                    : 'bg-white text-[#545454] border-[#E2E2E2] hover:border-black hover:text-black'
                }`}
              >
                + {tag}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Focus on sweet potato differences or Joël Robuchon mashed potatoes..."
            className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
          />
        </div>

        {/* Candidate Replacement Preview */}
        {candidate && (
          <div className="border border-black p-4 space-y-3 bg-[#FAFAFA]">
            <div className="flex items-center justify-between text-xs font-bold text-black">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 stroke-[3]" /> Replacement Candidate Ready
              </span>
              <span className="font-mono text-[10px] uppercase bg-black text-white px-2 py-0.5">
                {candidate.difficulty}
              </span>
            </div>

            <p className="text-sm font-bold text-black">{candidate.question}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {candidate.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-2.5 border flex items-center justify-between ${
                    opt.isCorrect
                      ? 'border-black bg-white text-black font-bold ring-1 ring-black'
                      : 'border-[#E2E2E2] bg-white text-[#545454]'
                  }`}
                >
                  <span>
                    <strong className="mr-1 font-mono">{opt.id}:</strong> {opt.text}
                  </span>
                  {opt.isCorrect && (
                    <span className="text-[9px] uppercase font-bold bg-black text-white px-1.5 py-0.5">
                      Correct
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="text-xs text-[#333333] bg-white p-2.5 border border-[#E2E2E2]">
              <strong className="text-black">Explanation: </strong>
              {candidate.explanation}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E2E2E2]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-black transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 border border-black px-4 py-2 text-xs font-semibold text-black hover:bg-[#F6F6F6] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{candidate ? 'Re-roll Another' : 'Generate Replacement'}</span>
            </button>

            {candidate && (
              <button
                onClick={handleConfirmSwap}
                className="flex items-center gap-2 bg-black text-white px-5 py-2 text-xs font-bold hover:bg-[#262626] transition-all"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Confirm & Swap in Question #{question.order}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
