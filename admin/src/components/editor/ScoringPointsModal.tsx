import React, { useEffect, useState } from 'react';
import { X, Save, Coins } from 'lucide-react';
import type { SaveQuizScoringPayload } from '../../services/quizBankApi';

export type ScoringPointsForm = SaveQuizScoringPayload;

interface ScoringPointsModalProps {
  isOpen: boolean;
  initial: ScoringPointsForm;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (values: ScoringPointsForm) => Promise<void> | void;
}

const REQUIRED_FIELDS: Array<{
  key: 'pointsPerCorrect' | 'fastAnswerBonus' | 'completeQuizBonus';
  label: string;
  hint: string;
  suffix: string;
}> = [
  {
    key: 'pointsPerCorrect',
    label: 'Correct Answer',
    hint: 'PB coins for each right answer (How to Play + gameplay)',
    suffix: 'PB',
  },
  {
    key: 'fastAnswerBonus',
    label: 'Fast Answer Bonus',
    hint: 'Extra PB if the player answers within the fast window',
    suffix: 'PB',
  },
  {
    key: 'completeQuizBonus',
    label: 'Complete Quiz Bonus',
    hint: 'PB coins added when the full quiz is finished',
    suffix: 'PB',
  },
];

const OPTIONAL_FIELDS: Array<{
  key: 'questionsPerQuiz' | 'timerSeconds' | 'fastAnswerSeconds';
  label: string;
  hint: string;
  suffix: string;
  min: number;
  max: number;
}> = [
  {
    key: 'questionsPerQuiz',
    label: 'Questions per quiz',
    hint: 'How many questions each player gets',
    suffix: 'Qs',
    min: 1,
    max: 50,
  },
  {
    key: 'timerSeconds',
    label: 'Timer',
    hint: 'Seconds per question',
    suffix: 's',
    min: 5,
    max: 120,
  },
  {
    key: 'fastAnswerSeconds',
    label: 'Fast answer window',
    hint: 'Seconds to qualify for the fast bonus',
    suffix: 's',
    min: 1,
    max: 60,
  },
];

export const ScoringPointsModal: React.FC<ScoringPointsModalProps> = ({
  isOpen,
  initial,
  saving = false,
  error = null,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<ScoringPointsForm>(initial);

  useEffect(() => {
    if (isOpen) setForm(initial);
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const handleNumber = (key: keyof ScoringPointsForm, raw: string, min: number, max: number) => {
    const next = raw === '' ? min : Number(raw);
    if (!Number.isFinite(next)) return;
    setForm((prev) => ({
      ...prev,
      [key]: Math.max(min, Math.min(max, Math.floor(next))),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto border border-[#E2E2E2] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#E2E2E2] pb-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Coins className="h-4 w-4 text-black" />
              <h2 className="text-base font-bold text-black">Set scoring points</h2>
            </div>
            <p className="text-xs text-[#6B6B6B]">
              PB coins scoring only — not leaderboard LP. Saved values show on How to Play and apply in gameplay.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#6B6B6B] hover:text-black"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(form);
          }}
        >
          {REQUIRED_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-black">
                {field.label}
              </span>
              <span className="mb-1.5 block text-[11px] text-[#6B6B6B]">{field.hint}</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={form[field.key]}
                  onChange={(event) => handleNumber(field.key, event.target.value, 0, 1000)}
                  className="w-full border border-[#E2E2E2] bg-white px-3 py-2.5 pr-12 text-sm font-mono font-bold text-black focus:border-black focus:outline-none"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#6B6B6B]">
                  {field.suffix}
                </span>
              </div>
            </label>
          ))}

          <div className="border-t border-[#E2E2E2] pt-3">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
              Optional format
            </p>
            {OPTIONAL_FIELDS.map((field) => (
              <label key={field.key} className="mb-3 block last:mb-0">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-black">
                  {field.label}
                </span>
                <span className="mb-1.5 block text-[11px] text-[#6B6B6B]">{field.hint}</span>
                <div className="relative">
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={1}
                    value={form[field.key] ?? ''}
                    onChange={(event) =>
                      handleNumber(field.key, event.target.value, field.min, field.max)
                    }
                    className="w-full border border-[#E2E2E2] bg-white px-3 py-2.5 pr-12 text-sm font-mono font-bold text-black focus:border-black focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#6B6B6B]">
                    {field.suffix}
                  </span>
                </div>
              </label>
            ))}
          </div>

          {error ? <p className="text-xs font-semibold text-[#C62828]">{error}</p> : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-[#E2E2E2] text-black hover:border-black"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-black px-4 py-2 text-xs font-bold text-white hover:bg-[#262626] disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save points'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
