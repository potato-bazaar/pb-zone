import React, { useState } from 'react';
import { QuizQuestion } from '../../types/quiz';
import { GAME_IMAGE_LIBRARY } from '../../data/gameConfigCatalog';
import { X, Save, Image as ImageIcon } from 'lucide-react';

interface QuestionEditModalProps {
  question: QuizQuestion;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: QuizQuestion) => void;
}

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({ question, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<QuizQuestion>({ ...question });

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

  const fieldCls =
    'w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4 animate-scale-in my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold text-white">Edit Question #{formData.order}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Question Prompt</label>
            <textarea
              rows={3}
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className={`${fieldCls} p-3 focus:ring-1 focus:ring-amber-500`}
              required
            />
          </div>

          {/* Picture round: image brief + URL + library */}
          {isPictureRound && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <ImageIcon className="h-4 w-4" />
                <span>Picture Clue (Guess the Potato)</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">AI image brief (what the photo should show)</label>
                <textarea
                  rows={2}
                  value={formData.imagePrompt || ''}
                  onChange={(e) => setFormData({ ...formData, imagePrompt: e.target.value })}
                  className={fieldCls}
                  placeholder="e.g. Close-up of golden fries covered in cheese curds and gravy..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Picture URL</label>
                <input
                  type="text"
                  value={formData.pictureUrl || ''}
                  onChange={(e) => setFormData({ ...formData, pictureUrl: e.target.value })}
                  className={`${fieldCls} font-mono`}
                  placeholder="https://... or /games/guess-the-potato.jpg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Or pick from the game artwork library</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {GAME_IMAGE_LIBRARY.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setFormData({ ...formData, pictureUrl: img.url })}
                      className={`relative aspect-video overflow-hidden rounded-lg border ${
                        formData.pictureUrl === img.url ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-800 hover:border-slate-600'
                      }`}
                      title={img.label}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              {formData.pictureUrl && (
                <div className="h-32 w-full max-w-xs rounded-lg overflow-hidden border border-slate-800 bg-black">
                  <img
                    src={formData.pictureUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Multiple-Choice Options & Correct Answer Selection</label>
            <div className="space-y-2">
              {formData.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                    opt.isCorrect ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectCorrectOption(opt.id)}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono font-bold text-xs transition-all ${
                      opt.isCorrect ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                    title="Click to mark as correct answer"
                  >
                    {opt.id}
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                    className="flex-1 bg-transparent px-2 py-1 text-xs text-slate-100 focus:outline-none"
                    placeholder={`Option ${opt.id} text...`}
                    required
                  />
                  {opt.isCorrect && (
                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Correct
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Explanation (Why it is correct)</label>
              <textarea
                rows={2}
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                className={fieldCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fun Fact / Extra Trivia</label>
              <textarea
                rows={2}
                value={formData.funFact || ''}
                onChange={(e) => setFormData({ ...formData, funFact: e.target.value })}
                className={fieldCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                className={`${fieldCls} p-2`}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Points</label>
              <input
                type="number"
                min={1}
                max={50}
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 10 })}
                className={`${fieldCls} p-2`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Timer (Seconds)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={formData.timeLimitSeconds}
                onChange={(e) => setFormData({ ...formData, timeLimitSeconds: parseInt(e.target.value) || 20 })}
                className={`${fieldCls} p-2`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
