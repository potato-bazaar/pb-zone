import React, { useState } from 'react';
import { QuizQuestion } from '../../types/quiz';
import {
  Sparkles,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Clock,
  ImageOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button, Pill, buttonClass, labelClass, panelClass, softClass, type Tone } from '../ui/pb';
import { cn } from '../../lib/utils';

const DIFFICULTY_TONE: Record<QuizQuestion['difficulty'], Tone> = {
  easy: 'green',
  medium: 'amber',
  hard: 'red',
};

export function DifficultyPill({ value }: { value: QuizQuestion['difficulty'] }) {
  return (
    <Pill tone={DIFFICULTY_TONE[value] ?? 'gray'} className="capitalize">
      {value}
    </Pill>
  );
}

export function CorrectChip() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#16A34A] px-2 py-0.5 text-[11px] font-semibold text-white">
      <Check className="h-3 w-3" strokeWidth={3} />
      Correct
    </span>
  );
}

const iconBtn =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#EEF3EF] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';
const iconBtnDanger =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#FDE8EC] hover:text-[#BE123C] disabled:cursor-not-allowed disabled:opacity-50';

interface QuestionCardProps {
  question: QuizQuestion;
  totalQuestions: number;
  onRegenerate: (question: QuizQuestion) => void;
  onEdit: (question: QuizQuestion) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  index: number;
  readOnly?: boolean;
  allowDelete?: boolean;
  deleting?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  totalQuestions,
  onRegenerate,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  index,
  readOnly = false,
  allowDelete = false,
  deleting = false,
}) => {
  const [showExplanation, setShowExplanation] = useState(true);
  const isPictureRound = question.pictureUrl !== undefined || question.imagePrompt !== undefined;
  const needsPicture = isPictureRound && !question.pictureUrl;

  return (
    <article className={cn(panelClass, 'p-4 sm:p-5')}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#EEF2F6] pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#E3F8E8] px-1.5 text-xs font-bold tabular-nums text-[#14532D]">
            #{question.order}
          </span>
          <span className="break-words text-sm font-medium text-[#475569] first-letter:uppercase">
            {question.topicTag || 'Potato Trivia'}
          </span>
          <DifficultyPill value={question.difficulty} />
          {needsPicture && (
            <Pill tone="amber">
              <ImageOff className="h-3 w-3" />
              Needs picture
            </Pill>
          )}
        </div>

        <div className="flex items-center gap-1">
          {readOnly ? (
            <>
              <Pill tone="green" dot>
                Live API
              </Pill>
              {allowDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(question.id)}
                  disabled={deleting}
                  className={iconBtnDanger}
                  title="Delete from live bank"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className={iconBtn}
                title="Move Up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={index === totalQuestions - 1}
                className={iconBtn}
                title="Move Down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>

              <span className="mx-1 h-5 w-px bg-[#E6ECE8]" />

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRegenerate(question)}
                title={`Regenerate Question #${question.order}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Swap Q#{question.order}</span>
              </Button>

              <button type="button" onClick={() => onEdit(question)} className={iconBtn} title="Edit Question">
                <Edit3 className="h-4 w-4" />
              </button>

              <button type="button" onClick={() => onDelete(question.id)} className={iconBtnDanger} title="Delete Question">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Prompt */}
      <div className="mt-4">
        <span className={labelClass}>{question.targetWord ? 'Word Clue / Riddle' : 'Question Prompt'}</span>
        <h3 className="text-[15px] font-semibold leading-snug text-[#0B1220] sm:text-base">{question.question}</h3>
      </div>

      {/* Picture clue (Guess the Potato) */}
      {question.pictureUrl && (
        <div className="mt-4 space-y-2">
          <div className="relative h-48 w-full max-w-lg overflow-hidden rounded-xl bg-[#EEF5F0] ring-1 ring-[#E6ECE8] sm:h-56">
            <img
              src={question.pictureUrl}
              alt="Potato Clue"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[#0B1A13]/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              <span>🔍</span>
              <span>Guess the Potato: Picture Clue</span>
            </div>
          </div>
          {question.imagePrompt && (
            <p className="max-w-lg text-xs leading-relaxed text-[#64748B]">
              <span className="font-semibold text-[#334155]">AI image brief:</span> {question.imagePrompt}
            </p>
          )}
        </div>
      )}

      {needsPicture && (
        <div className="mt-4 max-w-lg space-y-2.5 rounded-xl border border-dashed border-[#F3D38B] bg-[#FFFBF0] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#92400E]">
            <ImageOff className="h-4 w-4" />
            <span>No picture attached yet</span>
          </div>
          <p className="text-xs leading-relaxed text-[#475569]">
            <span className="font-semibold text-[#334155]">AI image brief:</span> {question.imagePrompt}
          </p>
          <button type="button" onClick={() => onEdit(question)} className={buttonClass('secondary', 'xs')}>
            Attach a picture URL in Edit
          </button>
        </div>
      )}

      {/* Word scramble tiles */}
      {question.targetWord && question.scrambledLetters && (
        <div className={cn(softClass, 'mt-4 p-4')}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-xs font-semibold text-[#334155]">Scrambled Letter Tiles Given to Player:</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {question.scrambledLetters.map((letter, lIdx) => (
                  <div
                    key={lIdx}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#D5E3D9] bg-white font-mono text-sm font-bold text-[#0F172A] shadow-sm"
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E2EAE5] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <span className="flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Target Solution Word:
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-sm font-bold">
                {question.targetWord.split('').map((char, cIdx) => (
                  <div key={cIdx} className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#16A34A] text-white shadow-sm">
                    {char}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Options */}
      {question.options && question.options.length > 0 && !question.targetWord && (
        <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {question.options.map((option) => {
            const isCorrect = option.isCorrect;
            return (
              <div
                key={option.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 text-sm transition-colors',
                  isCorrect ? 'border-[#9FDBB0] bg-[#F0FBF3] text-[#0F172A]' : 'border-[#E6ECE8] bg-white text-[#475569]',
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold',
                    isCorrect ? 'bg-[#16A34A] text-white' : 'bg-[#F1F5F9] text-[#475569]',
                  )}
                >
                  {option.id}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <span className={isCorrect ? 'font-semibold text-[#0F172A]' : 'font-medium'}>{option.text}</span>
                </div>
                {isCorrect ? (
                  <CorrectChip />
                ) : (
                  <span className="shrink-0 pt-1 text-[11px] font-medium text-[#F43F5E]/75">Wrong</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Explanation */}
      {showExplanation && (
        <div className={cn('mt-4 grid gap-2.5 text-[13px] leading-relaxed', question.funFact && 'md:grid-cols-2')}>
          <div className={cn(softClass, 'p-3.5 text-[#334155]')}>
            <span className="font-semibold text-[#0F172A]">Explanation: </span>
            {question.explanation}
          </div>
          {question.funFact && (
            <div className="rounded-xl bg-[#FFF8EB] p-3.5 text-[#334155]">
              <span className="font-semibold text-[#0F172A]">Fun Fact: </span>
              {question.funFact}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF2F6] pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="gray">
            <Clock className="h-3 w-3" />
            {question.timeLimitSeconds}s timer
          </Pill>
          <Pill tone="green" className="font-semibold tabular-nums">
            +{question.points} pts
          </Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allowDelete && (
            <Button variant="danger" size="sm" onClick={() => onDelete(question.id)} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Deleting…' : 'Delete question'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowExplanation(!showExplanation)}>
            {showExplanation ? 'Hide rationale' : 'View rationale'}
            {showExplanation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </article>
  );
};
