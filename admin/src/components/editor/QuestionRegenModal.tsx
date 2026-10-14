import React, { useState } from 'react';
import { QuizQuestion } from '../../types/quiz';
import { aiQuizService } from '../../services/aiQuizService';
import {
  Sparkles,
  ArrowRightLeft,
  Check,
  RefreshCw
} from 'lucide-react';
import { Button, ModalShell, inputClass, labelClass, softClass } from '../ui/pb';
import { CorrectChip, DifficultyPill } from './QuestionCard';
import { cn } from '../../lib/utils';

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
    <ModalShell
      open={isOpen}
      onClose={onClose}
      icon={Sparkles}
      tone="purple"
      size="lg"
      title={<>Regenerate & Swap Question #{question.order}</>}
      description="Swap this single question with an AI-generated replacement while preserving question order."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} className="mr-auto">
            Cancel
          </Button>
          <Button variant={candidate ? 'outline' : 'primary'} onClick={handleGenerate} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            <span>{candidate ? 'Re-roll Another' : 'Generate Replacement'}</span>
          </Button>
          {candidate && (
            <Button onClick={handleConfirmSwap}>
              <ArrowRightLeft className="h-4 w-4" />
              <span>Confirm & Swap in Question #{question.order}</span>
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* Current Question Being Replaced */}
        <div className={cn(softClass, 'p-4')}>
          <p className="text-xs font-semibold text-[#64748B]">Current Question #{question.order}</p>
          <p className="mt-1 text-sm font-semibold leading-snug text-[#0F172A]">{question.question}</p>
        </div>

        {/* Prompt Refinement Controls */}
        <div>
          <label className={labelClass}>AI Guidance (Optional)</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {quickPromptTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setCustomPrompt(tag)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  customPrompt === tag
                    ? 'border-[#86D19A] bg-[#E3F7E7] font-semibold text-[#14532D]'
                    : 'border-[#E2E8E4] bg-white font-medium text-[#475569] hover:border-[#B9D8C3] hover:text-[#14532D]',
                )}
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
            className={inputClass}
          />
        </div>

        {/* Candidate Replacement Preview */}
        {candidate && (
          <div className="space-y-3 rounded-xl border border-[#BFE6CB] bg-[#F7FCF8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[#14532D]">
                <Check className="h-4 w-4 text-[#16A34A]" strokeWidth={3} /> Replacement Candidate Ready
              </span>
              <DifficultyPill value={candidate.difficulty} />
            </div>

            <p className="text-[15px] font-semibold leading-snug text-[#0B1220]">{candidate.question}</p>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {candidate.options.map((opt) => (
                <div
                  key={opt.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5',
                    opt.isCorrect
                      ? 'border-[#9FDBB0] bg-[#F0FBF3] font-semibold text-[#0F172A]'
                      : 'border-[#E6ECE8] bg-white text-[#475569]',
                  )}
                >
                  <span className="min-w-0">
                    <strong className="mr-1 font-mono">{opt.id}:</strong> {opt.text}
                  </span>
                  {opt.isCorrect && <CorrectChip />}
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-white p-3 text-[13px] leading-relaxed text-[#334155] ring-1 ring-[#E6ECE8]">
              <strong className="font-semibold text-[#0F172A]">Explanation: </strong>
              {candidate.explanation}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
