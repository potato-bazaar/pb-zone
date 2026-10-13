import React, { useId, useState } from 'react';
import { QuizQuestion } from '../../types/quiz';
import { GAME_IMAGE_LIBRARY } from '../../data/gameConfigCatalog';
import { Check, Edit3, Save, Image as ImageIcon } from 'lucide-react';
import { Button, ModalShell, inputClass, labelClass, selectClass, softClass, textareaClass } from '../ui/pb';
import { CorrectChip } from './QuestionCard';
import { cn } from '../../lib/utils';

interface QuestionEditModalProps {
  question: QuizQuestion;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: QuizQuestion) => void;
}

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({ question, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<QuizQuestion>({ ...question });
  const formId = useId();

  if (!isOpen) return null;

  const isPictureRound = formData.pictureUrl !== undefined || formData.imagePrompt !== undefined;

  const handleOptionTextChange = (optId: string, text: string) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt) => (opt.id === optId ? { ...opt, text } : opt)),
    }));
  };

  const handleSelectCorrectOption = (optId: string) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt) => ({ ...opt, isCorrect: opt.id === optId })),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      icon={Edit3}
      title={<>Edit Question #{formData.order}</>}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>Question Prompt</label>
          <textarea
            rows={3}
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            className={textareaClass}
            required
          />
        </div>

        {/* Picture round: image brief + URL + library */}
        {isPictureRound && (
          <div className={cn(softClass, 'space-y-4 p-4')}>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF2DD] text-[#D97706]">
                <ImageIcon className="h-4 w-4" />
              </span>
              <span>Picture Clue (Guess the Potato)</span>
            </div>
            <div>
              <label className={labelClass}>AI image brief (what the photo should show)</label>
              <textarea
                rows={2}
                value={formData.imagePrompt || ''}
                onChange={(e) => setFormData({ ...formData, imagePrompt: e.target.value })}
                className={textareaClass}
                placeholder="e.g. Close-up of golden fries covered in cheese curds and gravy..."
              />
            </div>
            <div>
              <label className={labelClass}>Picture URL</label>
              <input
                type="text"
                value={formData.pictureUrl || ''}
                onChange={(e) => setFormData({ ...formData, pictureUrl: e.target.value })}
                className={cn(inputClass, 'font-mono')}
                placeholder="https://... or /games/guess-the-potato.jpg"
              />
            </div>
            <div>
              <label className={labelClass}>Or pick from the game artwork library</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {GAME_IMAGE_LIBRARY.map((img) => {
                  const selected = formData.pictureUrl === img.url;
                  return (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setFormData({ ...formData, pictureUrl: img.url })}
                      className={cn(
                        'relative aspect-video overflow-hidden rounded-lg border-2 bg-white transition-all',
                        selected
                          ? 'border-[#16A34A] ring-4 ring-[#16A34A]/15'
                          : 'border-transparent ring-1 ring-[#E2E8E4] hover:ring-[#B9D8C3]',
                      )}
                      title={img.label}
                    >
                      <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                      {selected && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-sm">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {formData.pictureUrl && (
              <div className="h-32 w-full max-w-xs overflow-hidden rounded-xl bg-[#EEF5F0] ring-1 ring-[#E6ECE8]">
                <img
                  src={formData.pictureUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Options */}
        <div>
          <label className={labelClass}>Multiple-Choice Options & Correct Answer Selection</label>
          <div className="space-y-2">
            {formData.options.map((opt) => (
              <div
                key={opt.id}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-1.5 pr-2.5 transition-colors focus-within:ring-4 focus-within:ring-[#16A34A]/10',
                  opt.isCorrect
                    ? 'border-[#9FDBB0] bg-[#F0FBF3]'
                    : 'border-[#E2E8E4] bg-white focus-within:border-[#86D19A]',
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSelectCorrectOption(opt.id)}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors',
                    opt.isCorrect
                      ? 'bg-[#16A34A] text-white shadow-sm'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E3F7E7] hover:text-[#14532D]',
                  )}
                  title="Click to mark as correct answer"
                >
                  {opt.id}
                </button>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                  placeholder={`Option ${opt.id} text...`}
                  required
                />
                {opt.isCorrect && <CorrectChip />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Explanation (Why it is correct)</label>
            <textarea
              rows={2}
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className={textareaClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Fun Fact / Extra Trivia</label>
            <textarea
              rows={2}
              value={formData.funFact || ''}
              onChange={(e) => setFormData({ ...formData, funFact: e.target.value })}
              className={textareaClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
              className={selectClass}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Points</label>
            <input
              type="number"
              min={1}
              max={50}
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 10 })}
              className={cn(inputClass, 'tabular-nums')}
            />
          </div>
          <div>
            <label className={labelClass}>Timer (Seconds)</label>
            <input
              type="number"
              min={5}
              max={120}
              value={formData.timeLimitSeconds}
              onChange={(e) => setFormData({ ...formData, timeLimitSeconds: parseInt(e.target.value) || 20 })}
              className={cn(inputClass, 'tabular-nums')}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
};
