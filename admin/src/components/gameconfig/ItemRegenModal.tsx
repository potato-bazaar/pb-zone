import React, { useState } from 'react';
import { ArrowRightLeft, Check, CircleAlert, Plus, RefreshCw } from 'lucide-react';
import { Button, ModalShell, inputClass, labelClass } from '../ui/pb';

interface ItemRegenModalProps<T> {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  currentSummary: React.ReactNode;
  quickPrompts: string[];
  onGenerate: (instruction: string) => Promise<T>;
  renderCandidate: (candidate: T) => React.ReactNode;
  onApply: (candidate: T) => void;
  onClose: () => void;
}

const chipClass = (on: boolean) =>
  `inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-left text-xs transition-colors ${
    on
      ? 'border-[#16A34A] bg-[#E3F8E8] font-semibold text-[#14532D] ring-2 ring-[#16A34A]/15'
      : 'border-[#E2E8E4] bg-white font-medium text-[#475569] hover:border-[#86D19A] hover:text-[#0F172A]'
  }`;

/**
 * Generic "regenerate one item" dialog used for levels, wheel segments and runs.
 * Mirrors the question-swap flow of the quiz editor.
 */
export function ItemRegenModal<T>({
  isOpen,
  title,
  subtitle,
  currentSummary,
  quickPrompts,
  onGenerate,
  renderCandidate,
  onApply,
  onClose,
}: ItemRegenModalProps<T>) {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [candidate, setCandidate] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await onGenerate(instruction);
      setCandidate(next);
    } catch (e) {
      console.error(e);
      setError((e as Error).message || 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      icon={RefreshCw}
      tone="purple"
      title={title}
      description={subtitle}
      bodyClassName="space-y-5"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} className="mr-auto">
            Cancel
          </Button>
          <Button variant="outline" onClick={handleGenerate} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Designing...' : candidate !== null ? 'Re-roll another' : 'Generate replacement'}</span>
          </Button>
          {candidate !== null && (
            <Button onClick={() => onApply(candidate)}>
              <ArrowRightLeft className="h-4 w-4" />
              <span>Confirm & swap in</span>
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-1.5 rounded-xl bg-[#F6F9F7] p-3.5">
        <div className="text-xs font-semibold text-[#64748B]">Currently in this slot</div>
        {currentSummary}
      </div>

      <div>
        <label className={labelClass}>AI guidance (optional)</label>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((tag) => (
            <button key={tag} type="button" onClick={() => setInstruction(tag)} className={chipClass(instruction === tag)}>
              <Plus className="h-3 w-3 shrink-0" />
              <span>{tag}</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Make it about sweet potatoes, or tighten the difficulty..."
          className={`${inputClass} mt-3`}
        />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-[#FBD5DD] bg-[#FDE8EC] px-4 py-3 text-sm text-[#BE123C]">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      {candidate !== null && (
        <div className="space-y-3 rounded-xl border border-[#16A34A]/40 bg-[#F4FBF6] p-4 ring-4 ring-[#16A34A]/5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#14532D]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            Replacement candidate ready
          </div>
          {renderCandidate(candidate)}
        </div>
      )}
    </ModalShell>
  );
}
