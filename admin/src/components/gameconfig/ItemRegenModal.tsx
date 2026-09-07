import React, { useState } from 'react';
import { ArrowRightLeft, Check, RefreshCw, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white border border-black p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E2E2]">
          <div>
            <h2 className="text-base font-bold text-black">{title}</h2>
            {subtitle && <p className="text-xs text-[#6B6B6B]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-[#6B6B6B] hover:text-black transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3 bg-[#F6F6F6] border border-[#E2E2E2] space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#6B6B6B]">Currently in this slot</div>
          {currentSummary}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-[#333333]">AI guidance (optional)</label>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((tag) => (
              <button
                key={tag}
                onClick={() => setInstruction(tag)}
                className={`text-[11px] px-2.5 py-1 border transition-all ${
                  instruction === tag
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
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Make it about sweet potatoes, or tighten the difficulty..."
            className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
          />
        </div>

        {error && <div className="p-3 border border-[#C62828] bg-[#FCEBEB] text-xs text-[#C62828]">{error}</div>}

        {candidate !== null && (
          <div className="border border-black p-4 space-y-3 bg-[#FAFAFA]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-black">
              <Check className="h-4 w-4 stroke-[3]" /> Replacement candidate ready
            </div>
            {renderCandidate(candidate)}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-[#E2E2E2]">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-black transition-colors">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 border border-black px-4 py-2 text-xs font-semibold text-black hover:bg-[#F6F6F6] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Designing...' : candidate !== null ? 'Re-roll another' : 'Generate replacement'}</span>
            </button>
            {candidate !== null && (
              <button
                onClick={() => onApply(candidate)}
                className="flex items-center gap-2 bg-black text-white px-5 py-2 text-xs font-bold hover:bg-[#262626] transition-all"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Confirm & swap in</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
