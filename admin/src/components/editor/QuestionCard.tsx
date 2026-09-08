import React, { useState } from 'react';
import { QuizQuestion } from '../../types/quiz';
import { Sparkles, Edit3, Trash2, ArrowUp, ArrowDown, Check, Clock, ImageOff } from 'lucide-react';

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
    <div className="bg-white border border-[#E2E2E2] hover:border-black p-5 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#E2E2E2]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center bg-black text-white font-mono font-bold text-xs">
            #{question.order}
          </span>
          <span className="text-xs font-bold text-black uppercase tracking-wider">{question.topicTag || 'Potato Trivia'}</span>
          <span className="text-[10px] font-semibold uppercase bg-[#EEEEEE] text-[#545454] px-2 py-0.5">{question.difficulty}</span>
          {needsPicture && (
            <span className="text-[10px] font-bold uppercase bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] px-2 py-0.5">
              Needs picture
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {readOnly ? (
            <>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-[#EBF7EE] text-[#0E8345] px-2 py-0.5">
                Live API
              </span>
              {allowDelete && (
                <button
                  onClick={() => onDelete(question.id)}
                  disabled={deleting}
                  className="p-1.5 text-[#6B6B6B] hover:text-[#C62828] disabled:opacity-50 transition-colors"
                  title="Delete from live bank"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          ) : (
            <>
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1.5 text-[#6B6B6B] hover:text-black disabled:opacity-20 transition-colors"
            title="Move Up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalQuestions - 1}
            className="p-1.5 text-[#6B6B6B] hover:text-black disabled:opacity-20 transition-colors"
            title="Move Down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-[#E2E2E2] mx-1" />

          <button
            onClick={() => onRegenerate(question)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-black hover:bg-black hover:text-white transition-all text-black"
            title={`Regenerate Question #${question.order}`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Swap Q#{question.order}</span>
          </button>

          <button
            onClick={() => onEdit(question)}
            className="p-1.5 text-[#6B6B6B] hover:text-black hover:bg-[#F6F6F6] transition-colors"
            title="Edit Question"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onDelete(question.id)}
            className="p-1.5 text-[#6B6B6B] hover:text-[#C62828] transition-colors"
            title="Delete Question"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
            </>
          )}
        </div>
      </div>

      {/* Prompt */}
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] block mb-1">
          {question.targetWord ? 'Word Clue / Riddle' : 'Question Prompt'}
        </span>
        <h3 className="text-sm font-bold text-black leading-snug">{question.question}</h3>
      </div>

      {/* Picture clue (Guess the Potato) */}
      {question.pictureUrl && (
        <div className="mb-4 space-y-1.5">
          <div className="relative h-48 sm:h-56 w-full max-w-lg rounded-2xl overflow-hidden border border-[#E2E2E2] bg-black shadow-sm">
            <img
              src={question.pictureUrl}
              alt="Potato Clue"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute top-2.5 left-2.5 bg-black/90 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
              <span>🔍</span>
              <span>Guess the Potato: Picture Clue</span>
            </div>
          </div>
          {question.imagePrompt && (
            <p className="text-[11px] text-[#6B6B6B] max-w-lg">
              <span className="font-bold text-black">AI image brief:</span> {question.imagePrompt}
            </p>
          )}
        </div>
      )}

      {needsPicture && (
        <div className="mb-4 max-w-lg p-4 border border-dashed border-[#C8C8C8] bg-[#FAFAFA] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-black">
            <ImageOff className="h-4 w-4" />
            <span>No picture attached yet</span>
          </div>
          <p className="text-[11px] text-[#545454] leading-relaxed">
            <span className="font-bold text-black">AI image brief:</span> {question.imagePrompt}
          </p>
          <button onClick={() => onEdit(question)} className="text-[11px] font-semibold text-black underline hover:no-underline">
            Attach a picture URL in Edit
          </button>
        </div>
      )}

      {/* Word scramble tiles */}
      {question.targetWord && question.scrambledLetters && (
        <div className="mb-4 p-4 bg-[#F6F6F6] border border-[#E2E2E2] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Scrambled Letter Tiles Given to Player:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {question.scrambledLetters.map((letter, lIdx) => (
                  <div
                    key={lIdx}
                    className="flex h-9 w-9 items-center justify-center bg-white border-2 border-black font-mono font-black text-sm text-black shadow-sm"
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-[#E2E2E2] sm:pl-4 pt-2 sm:pt-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E8345] flex items-center gap-1">
                <Check className="h-3 w-3 stroke-[3]" /> Target Solution Word:
              </span>
              <div className="flex flex-wrap gap-1 mt-1.5 font-mono font-black text-sm">
                {question.targetWord.split('').map((char, cIdx) => (
                  <div key={cIdx} className="flex h-9 w-9 items-center justify-center bg-black text-white font-bold">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
          {question.options.map((option) => {
            const isCorrect = option.isCorrect;
            return (
              <div
                key={option.id}
                className={`flex items-start gap-2.5 p-3 text-xs transition-all border ${
                  isCorrect ? 'border-black bg-[#FAFAFA] text-black ring-1 ring-black' : 'border-[#E2E2E2] bg-white text-[#545454]'
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center font-mono font-bold text-[11px] ${
                    isCorrect ? 'bg-black text-white' : 'bg-[#EEEEEE] text-[#545454]'
                  }`}
                >
                  {option.id}
                </div>
                <div className="flex-1">
                  <span className={isCorrect ? 'font-bold text-black' : 'font-medium'}>{option.text}</span>
                </div>
                {isCorrect ? (
                  <span className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-black text-white px-1.5 py-0.5">
                    <Check className="h-2.5 w-2.5 stroke-[3]" /> Correct
                  </span>
                ) : (
                  <span className="shrink-0 text-[9px] uppercase tracking-wider text-[#A0A0A0]">Wrong</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Explanation */}
      {showExplanation && (
        <div className="space-y-2 pt-2 border-t border-[#E2E2E2] text-xs">
          <div className="p-3 bg-[#F6F6F6] border border-[#E2E2E2] text-[#333333]">
            <span className="font-bold text-black">Explanation: </span>
            {question.explanation}
          </div>
          {question.funFact && (
            <div className="p-3 bg-[#FAFAFA] border border-[#E2E2E2] text-[#333333]">
              <span className="font-bold text-black">Fun Fact: </span>
              {question.funFact}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B6B6B]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {question.timeLimitSeconds}s timer
          </span>
          <span className="font-mono font-medium text-black">+{question.points} pts</span>
        </div>
        <div className="flex items-center gap-3">
          {allowDelete && (
            <button
              onClick={() => onDelete(question.id)}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border border-[#C62828] text-[#C62828] hover:bg-[#C62828] hover:text-white disabled:opacity-50 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              {deleting ? 'Deleting…' : 'Delete question'}
            </button>
          )}
          <button onClick={() => setShowExplanation(!showExplanation)} className="text-[#6B6B6B] hover:text-black underline transition-colors">
            {showExplanation ? 'Hide rationale' : 'View rationale'}
          </button>
        </div>
      </div>
    </div>
  );
};
