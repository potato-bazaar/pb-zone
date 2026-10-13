import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { DEFAULT_GROQ_MODEL, GROQ_MODEL_OPTIONS, testGroqConnection } from '../../services/groqClient';
import { Key, Save, RotateCcw, X, ShieldCheck, Info, CheckCircle2, AlertTriangle, Loader2, Cpu } from 'lucide-react';
import { Button, IconTile, hintClass, inputClass, insetClass, labelClass, selectClass, softClass } from '../ui/pb';
import { cn } from '../../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onResetData }) => {
  const [apiKey, setApiKey] = useState(storageService.getGroqApiKey());
  const [model, setModel] = useState(storageService.getGroqModel() || DEFAULT_GROQ_MODEL);
  const [isSaved, setIsSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.setGroqApiKey(apiKey);
    storageService.setGroqModel(model);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testGroqConnection(apiKey, model);
    setTestResult(result);
    setTesting(false);
  };

  const selectedModel = GROQ_MODEL_OPTIONS.find((m) => m.id === model);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-[#0B1A13]/40 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-[#EEF2F6] px-5 py-4">
          <IconTile icon={Key} tone="amber" size="sm" />
          <h2 id="settings-modal-title" className="min-w-0 flex-1 text-base font-bold text-[#0B1220] sm:text-lg">
            Admin & AI Engine Settings
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="settings-groq-key" className={labelClass}>
                Groq API Key (Optional)
              </label>
              <p className="mb-2 text-xs leading-relaxed text-[#64748B]">
                Powers live generation of quiz decks, word scrambles, picture rounds, Potato Crush levels, Spin the Potato wheels and
                Potato Rush runs. Without a key the panel uses the built-in offline engine.
              </p>
              <input
                id="settings-groq-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className={cn(inputClass, 'font-mono')}
              />
            </div>

            <div>
              <label htmlFor="settings-groq-model" className={cn(labelClass, 'flex items-center gap-1.5')}>
                <Cpu className="h-3.5 w-3.5 text-[#D97706]" /> Model
              </label>
              <select
                id="settings-groq-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={selectClass}
              >
                {GROQ_MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </select>
              {selectedModel && <p className={hintClass}>{selectedModel.note}</p>}
            </div>

            {testResult && (
              <div
                className={cn(
                  'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed',
                  testResult.ok
                    ? 'border-[#BBE7C6] bg-[#EEFAF1] text-[#14532D]'
                    : 'border-[#FBD5DD] bg-[#FDE8EC] text-[#BE123C]',
                )}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#16A34A]">
                <ShieldCheck className="h-4 w-4" /> Stored locally in your browser
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || !apiKey.trim()}
                  className="flex-1 sm:flex-none"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                  <span>{testing ? 'Testing...' : 'Test Key'}</span>
                </Button>
                <Button type="submit" className="flex-1 sm:flex-none">
                  <Save className="h-4 w-4" />
                  <span>{isSaved ? 'Saved!' : 'Save'}</span>
                </Button>
              </div>
            </div>
          </form>

          <div className={cn(insetClass, 'space-y-3 p-4')}>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#0B1220]">Database & Sample Reset</h3>
              <p className="text-xs leading-relaxed text-[#64748B]">
                Reset all games, quizzes, level packs, wheels, run packs, simulated winners and telemetry back to the verified sample
                defaults. Your Groq key is kept.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm('Reset PB Zone Admin state back to factory defaults?')) {
                  storageService.resetDefaults();
                  onResetData();
                  onClose();
                }
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Verified Potato Presets</span>
            </Button>
          </div>

          <div className={cn(softClass, 'flex items-start gap-2.5 p-3.5 text-xs leading-relaxed text-[#475569]')}>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" />
            <span>
              Generation runs in the browser against the Groq API. Every request that fails, times out or returns unusable JSON falls
              back to the offline engine so the admin flow never blocks.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
