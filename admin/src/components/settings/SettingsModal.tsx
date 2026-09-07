import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { DEFAULT_GROQ_MODEL, GROQ_MODEL_OPTIONS, testGroqConnection } from '../../services/groqClient';
import { Key, Save, RotateCcw, X, ShieldCheck, Info, CheckCircle2, AlertTriangle, Loader2, Cpu } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5 animate-scale-in my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Key className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Admin & AI Engine Settings</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Groq API Key (Optional)</label>
            <p className="text-[11px] text-slate-400 mb-2">
              Powers live generation of quiz decks, word scrambles, picture rounds, Potato Crush levels, Spin the Potato wheels and
              Potato Rush runs. Without a key the panel uses the built-in offline engine.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-amber-400" /> Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
            >
              {GROQ_MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
                </option>
              ))}
            </select>
            {selectedModel && <p className="text-[11px] text-slate-400 mt-1">{selectedModel.note}</p>}
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-[11px] border ${
                testResult.ok
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Stored locally in your browser
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !apiKey.trim()}
                className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-2 text-xs font-bold transition-all disabled:opacity-40"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5" />}
                <span>{testing ? 'Testing...' : 'Test Key'}</span>
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-bold transition-all"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaved ? 'Saved!' : 'Save'}</span>
              </button>
            </div>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Database & Sample Reset</h4>
          <p className="text-xs text-slate-400">
            Reset all games, quizzes, level packs, wheels, run packs, simulated winners and telemetry back to the verified sample
            defaults. Your Groq key is kept.
          </p>
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset PB Zone Admin state back to factory defaults?')) {
                storageService.resetDefaults();
                onResetData();
                onClose();
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-rose-900/40 text-rose-300 hover:bg-rose-950/20 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Verified Potato Presets</span>
          </button>
        </div>

        <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
          <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Generation runs in the browser against the Groq API. Every request that fails, times out or returns unusable JSON falls
            back to the offline engine so the admin flow never blocks.
          </span>
        </div>
      </div>
    </div>
  );
};
