import React, { useState } from 'react';
import { Settings, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';
import { Game } from '../../types/quiz';
import {
  CONFIG_LABELS,
  ConfigKind,
  DifficultyCurve,
  GameConfig,
  GameConfigGenOptions,
  GameConfigSettings,
  PrizeMix,
} from '../../types/gameConfig';
import { CRUSH_THEMES, RUSH_THEMES, SPIN_THEMES } from '../../data/gameConfigCatalog';
import { aiGameConfigService } from '../../services/aiGameConfigService';
import { Card, Field, NumberField, Pill, PrimaryButton, SelectField, TextField, ToggleField, inputCls, labelCls } from './ui';

interface GameConfigSetupViewProps {
  game: Game;
  kind: ConfigKind;
  activeConfig: GameConfig | null;
  hasKey: boolean;
  model: string;
  onOpenSettings: () => void;
  onConfigsCreated: (configs: GameConfig[]) => void;
}

const COUNT_RANGE: Record<ConfigKind, { min: number; max: number; def: number; presets: number[] }> = {
  crush: { min: 3, max: 40, def: 10, presets: [5, 10, 15, 20, 30, 40] },
  spin: { min: 4, max: 16, def: 8, presets: [6, 8, 10, 12, 16] },
  rush: { min: 2, max: 20, def: 5, presets: [3, 5, 8, 10, 15, 20] },
};

const PLACEHOLDERS: Record<ConfigKind, string> = {
  crush: 'e.g. Level 5 should be a fries-only level, every 10th level has ice blockers, keep names family friendly...',
  spin: 'e.g. Include a 20% discount, keep the jackpot a Loaded Fries meal, no more than two empty segments...',
  rush: 'e.g. The last run should be a masher gauntlet, put a double-coins power-up near the finish...',
};

export const GameConfigSetupView: React.FC<GameConfigSetupViewProps> = ({
  game,
  kind,
  activeConfig,
  hasKey,
  model,
  onOpenSettings,
  onConfigsCreated,
}) => {
  const labels = CONFIG_LABELS[kind];
  const themes = kind === 'crush' ? CRUSH_THEMES : kind === 'spin' ? SPIN_THEMES : RUSH_THEMES;
  const range = COUNT_RANGE[kind];

  const [theme, setTheme] = useState(themes[0]);
  const [count, setCount] = useState(range.def);
  const [curve, setCurve] = useState<DifficultyCurve>('steady');
  const [prizeMix, setPrizeMix] = useState<PrizeMix>('balanced');
  const [customPrompt, setCustomPrompt] = useState('');
  const [variants, setVariants] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);
  const [reuseSettings, setReuseSettings] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settings: GameConfigSettings | undefined = reuseSettings && activeConfig ? activeConfig.content.settings : undefined;

  const buildOptions = (): GameConfigGenOptions => {
    const base = { theme: theme.trim() || themes[0], customPrompt: customPrompt.trim() || undefined };
    switch (kind) {
      case 'crush':
        return { kind, levelCount: count, curve, ...base };
      case 'spin':
        return { kind, segmentCount: count, prizeMix, ...base };
      case 'rush':
        return { kind, runCount: count, curve, ...base };
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setStatus('Preparing design brief...');
    try {
      const configs = await aiGameConfigService.generateVariants(
        game,
        buildOptions(),
        variants,
        autoRotate,
        settings,
        (msg, cur, total) => {
          setStatus(msg);
          if (cur && total) setProgress({ current: cur, total });
        }
      );
      onConfigsCreated(configs);
    } catch (e) {
      console.error(e);
      setError((e as Error).message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-[#E2E2E2] pb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-black">AI Generate {labels.pack}</h1>
          <Pill tone="purple">
            {labels.emoji} {game.name}
          </Pill>
        </div>
        <p className="text-xs text-[#6B6B6B] mt-1 max-w-2xl leading-relaxed">
          The AI designs the {labels.items.toLowerCase()}. Game settings such as lives, rewards and timers are yours to set by hand in
          the editor. Generation reuses the settings of the active {labels.pack.toLowerCase()} while that toggle stays on.
        </p>
      </div>

      {/* Engine status */}
      <div
        className={`p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          hasKey ? 'bg-[#EBF7EE] border-[#0E8345]' : 'bg-[#FFFBEB] border-[#FDE68A]'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {hasKey ? (
            <ShieldCheck className="h-4 w-4 text-[#0E8345] shrink-0 mt-0.5" />
          ) : (
            <WifiOff className="h-4 w-4 text-[#92400E] shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <div className={`font-bold ${hasKey ? 'text-[#0E8345]' : 'text-[#92400E]'}`}>
              {hasKey ? `Groq connected · ${model}` : 'Offline designer active'}
            </div>
            <div className={hasKey ? 'text-[#0E8345]/80' : 'text-[#92400E]/80'}>
              {hasKey
                ? `Each ${labels.pack.toLowerCase()} is one Groq request. Failed requests fall back to the offline designer automatically.`
                : `Without a Groq key the ${labels.items.toLowerCase()} are produced by the deterministic offline designer. Add a key in Settings for AI-designed content.`}
            </div>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-black bg-white hover:bg-black hover:text-white transition-all self-start sm:self-auto"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>AI Settings</span>
        </button>
      </div>

      {isGenerating ? (
        <div className="bg-white border border-[#E2E2E2] p-12 text-center space-y-4">
          <div className="inline-block h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <h3 className="text-base font-bold text-black">{status}</h3>
          {progress && (
            <div className="max-w-md mx-auto space-y-1">
              <div className="h-2 bg-[#EEEEEE] overflow-hidden">
                <div className="h-full bg-black transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
              <div className="text-[11px] font-mono text-[#6B6B6B]">
                {progress.current} / {progress.total}
              </div>
            </div>
          )}
          <p className="text-xs text-[#6B6B6B]">
            {hasKey ? 'Waiting for Groq. Large packs can take up to a minute.' : 'Designing offline. This is instant.'}
          </p>
        </div>
      ) : (
        <>
          <Card title="Design Brief" subtitle={`Tell the designer what this ${labels.pack.toLowerCase()} should feel like.`}>
            <Field label="Theme">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {themes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`text-[11px] px-2.5 py-1 border transition-all ${
                      theme === t ? 'bg-black text-white border-black font-semibold' : 'bg-white text-[#545454] border-[#E2E2E2] hover:border-black'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Or type your own theme"
                maxLength={40}
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Number of {labels.items} ({range.min} to {range.max})
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={1}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full accent-black cursor-pointer h-2 bg-[#EEEEEE] rounded-lg"
                  />
                  <span className="font-mono text-lg font-bold text-black min-w-[2.5rem] text-right">{count}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {range.presets.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`px-2.5 py-1 text-[11px] font-mono border transition-colors ${
                        count === n ? 'bg-black text-white border-black font-bold' : 'bg-white text-[#545454] border-[#E2E2E2] hover:border-black'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {kind === 'spin' ? (
                <SelectField
                  label="Prize generosity"
                  value={prizeMix}
                  onChange={(v) => setPrizeMix(v as PrizeMix)}
                  options={[
                    { value: 'generous', label: 'Generous (most spins win)' },
                    { value: 'balanced', label: 'Balanced (some empty slots, one jackpot)' },
                    { value: 'tight', label: 'Tight (about half empty, small prizes)' },
                  ]}
                  hint="Weights and prize sizes follow this. You can still tune every segment afterwards."
                />
              ) : (
                <SelectField
                  label="Difficulty curve"
                  value={curve}
                  onChange={(v) => setCurve(v as DifficultyCurve)}
                  options={[
                    { value: 'gentle', label: 'Gentle (easy for long, hard at the end)' },
                    { value: 'steady', label: 'Steady (even ramp easy to hard)' },
                    { value: 'steep', label: 'Steep (gets hard quickly)' },
                  ]}
                  hint={`${labels.items} are ordered easiest first.`}
                />
              )}
            </div>

            <TextField
              label="Custom directives (optional)"
              value={customPrompt}
              onChange={setCustomPrompt}
              multiline
              rows={2}
              placeholder={PLACEHOLDERS[kind]}
              maxLength={600}
            />
          </Card>

          <Card title="Output" subtitle="How many packs to produce and where they go.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumberField
                label="Variants to generate"
                value={variants}
                min={1}
                max={10}
                onChange={setVariants}
                hint="Each variant is a separate request with the same brief, so players in rotation get different packs."
              />
              <ToggleField
                label="Auto-add to player rotation"
                checked={autoRotate}
                onChange={setAutoRotate}
                className="sm:pt-4"
                hint="Rotation packs are served to players at random."
              />
              <ToggleField
                label={activeConfig ? 'Reuse settings of active pack' : 'Use default settings'}
                checked={reuseSettings}
                onChange={setReuseSettings}
                className="sm:pt-4"
                disabled={!activeConfig}
                hint={activeConfig ? `Copies lives, rewards and timers from "${activeConfig.title}".` : 'No active pack yet, defaults will be used.'}
              />
            </div>

            <div className="pt-4 border-t border-[#E2E2E2] flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-[#6B6B6B]">
                Generates{' '}
                <strong className="text-black">
                  {variants} {variants === 1 ? labels.pack.toLowerCase() : labels.packs.toLowerCase()}
                </strong>{' '}
                with{' '}
                <strong className="text-black">
                  {count} {labels.items.toLowerCase()}
                </strong>{' '}
                each.
              </p>
              <PrimaryButton onClick={handleGenerate} className="px-6 py-3">
                <Sparkles className="h-4 w-4" />
                <span>Generate {labels.pack}</span>
              </PrimaryButton>
            </div>
          </Card>

          {error && <div className="p-3 border border-[#C62828] bg-[#FCEBEB] text-xs text-[#C62828]">{error}</div>}
        </>
      )}
    </div>
  );
};
