import React, { useEffect, useId, useState } from 'react';
import { AlertTriangle, Save, Coins } from 'lucide-react';
import type { SaveQuizScoringPayload } from '../../services/quizBankApi';
import { Button, ModalShell, hintClass, inputClass, labelClass, softClass } from '../ui/pb';
import { cn } from '../../lib/utils';

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
  key: 'pointsPerCorrect' | 'completeQuizBonus';
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
    key: 'completeQuizBonus',
    label: 'Complete Quiz Bonus',
    hint: 'PB coins added when the full quiz is finished',
    suffix: 'PB',
  },
];

const OPTIONAL_FIELDS: Array<{
  key: 'questionsPerQuiz' | 'timerSeconds';
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
];

const numberInputClass = cn(inputClass, 'pr-12 font-mono font-semibold tabular-nums');
const suffixClass = 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#64748B]';

export const ScoringPointsModal: React.FC<ScoringPointsModalProps> = ({
  isOpen,
  initial,
  saving = false,
  error = null,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<ScoringPointsForm>(initial);
  const formId = useId();

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
    <ModalShell
      open={isOpen}
      onClose={onClose}
      icon={Coins}
      tone="amber"
      title="Set scoring points"
      description="PB coins scoring only — not leaderboard LP. Saved values show on How to Play and apply in gameplay."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save points'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(form);
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REQUIRED_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className={labelClass}>{field.label}</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={form[field.key]}
                  onChange={(event) => handleNumber(field.key, event.target.value, 0, 1000)}
                  className={numberInputClass}
                  required
                />
                <span className={suffixClass}>{field.suffix}</span>
              </div>
              <span className={cn(hintClass, 'block')}>{field.hint}</span>
            </label>
          ))}
        </div>

        <div className={cn(softClass, 'p-4')}>
          <p className="mb-3 text-sm font-semibold text-[#0B1220]">Optional format</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {OPTIONAL_FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className={labelClass}>{field.label}</span>
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
                    className={numberInputClass}
                  />
                  <span className={suffixClass}>{field.suffix}</span>
                </div>
                <span className={cn(hintClass, 'block')}>{field.hint}</span>
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <p className="flex items-start gap-2 rounded-xl bg-[#FDE8EC] px-3 py-2.5 text-xs font-semibold text-[#BE123C]">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </p>
        ) : null}
      </form>
    </ModalShell>
  );
};
