import React, { useState } from 'react';
import { CircleAlert, Settings, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';
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
import { Button, IconTile, panelClass } from '../ui/pb';
import { Card, Field, NumberField, Pill, SelectField, TextField, ToggleField, inputCls, labelCls } from './ui';

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

const chipClass = (on: boolean) =>
  `inline-flex h-8 items-center justify-center rounded-full border px-3 text-xs transition-colors ${
    on
      ? 'border-[#16A34A] bg-[#E3F8E8] font-semibold text-[#14532D] ring-2 ring-[#16A34A]/15'
      : 'border-[#E2E8E4] bg-white font-medium text-[#475569] hover:border-[#86D19A] hover:text-[#0F172A]'
  }`;

/* Light track with a green fill (set inline from the value) and a white-ringed green thumb. */
const rangeCls = [
  'h-2 w-full cursor-pointer appearance-none rounded-full focus:outline-none',
  '[&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#16A34A] [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(15,23,42,0.25)]',
  '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#16A34A] [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(15,23,42,0.25)]',
  '[&:focus-visible::-webkit-slider-thumb]:ring-4 [&:focus-visible::-webkit-slider-thumb]:ring-[#16A34A]/20',
].join(' ');

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
    <div className="flex flex-col gap-4 pb-6">
      <section className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex items-start gap-3">
          <IconTile icon={Sparkles} tone="purple" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold leading-tight text-[#0B1220] sm:text-lg">AI Generate {labels.pack}</h2>
              <Pill tone="purple">
                {labels.emoji} {game.name}
              </Pill>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#5F6F83]">
              The AI designs the {labels.items.toLowerCase()}. Game settings such as lives, rewards and timers are yours to set by hand in
              the editor. Generation reuses the settings of the active {labels.pack.toLowerCase()} while that toggle stays on.
            </p>
          </div>
        </div>

        {/* Engine status */}
        <div
          className={`mt-4 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 ${
            hasKey ? 'border-[#CDEBD5] bg-[#F1FAF3]' : 'border-[#FBE3A8] bg-[#FFF9EB]'
          }`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ${
                hasKey ? 'text-[#16A34A]' : 'text-[#D97706]'
              }`}
            >
              {hasKey ? <ShieldCheck className="h-[18px] w-[18px]" /> : <WifiOff className="h-[18px] w-[18px]" />}
            </span>
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${hasKey ? 'text-[#14532D]' : 'text-[#92400E]'}`}>
                {hasKey ? `Groq connected · ${model}` : 'Offline designer active'}
              </div>
              <div className={`mt-0.5 text-xs leading-relaxed ${hasKey ? 'text-[#14532D]/75' : 'text-[#92400E]/80'}`}>
                {hasKey
                  ? `Each ${labels.pack.toLowerCase()} is one Groq request. Failed requests fall back to the offline designer automatically.`
                  : `Without a Groq key the ${labels.items.toLowerCase()} are produced by the deterministic offline designer. Add a key in Settings for AI-designed content.`}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenSettings} className="self-start sm:self-auto">
            <Settings className="h-3.5 w-3.5" />
            <span>AI Settings</span>
          </Button>
        </div>
      </section>

      {isGenerating ? (
        <section className={`${panelClass} flex flex-col items-center gap-4 px-6 py-12 text-center sm:py-16`}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3F8E8]">
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#16A34A] border-t-transparent" />
          </span>
          <h3 className="text-base font-bold text-[#0B1220] sm:text-lg">{status}</h3>
          {progress && (
            <div className="w-full max-w-md space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-[#EEF2F6]">
                <div
                  className="h-full rounded-full bg-[#16A34A] transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <div className="text-xs font-medium tabular-nums text-[#64748B]">
                {progress.current} / {progress.total}
              </div>
            </div>
          )}
          <p className="text-sm text-[#64748B]">
            {hasKey ? 'Waiting for Groq. Large packs can take up to a minute.' : 'Designing offline. This is instant.'}
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:items-start">
          <Card title="Design Brief" subtitle={`Tell the designer what this ${labels.pack.toLowerCase()} should feel like.`}>
            <Field label="Theme">
              <div className="mb-3 flex flex-wrap gap-2">
                {themes.map((t) => (
                  <button key={t} type="button" onClick={() => setTheme(t)} className={chipClass(theme === t)}>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    className={rangeCls}
                    style={{
                      background: `linear-gradient(to right, #16A34A ${((count - range.min) / (range.max - range.min)) * 100}%, #E6ECE8 0)`,
                    }}
                  />
                  <span className="min-w-[3rem] rounded-lg bg-[#E3F8E8] px-2 py-1 text-center text-base font-bold tabular-nums text-[#14532D]">
                    {count}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {range.presets.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`${chipClass(count === n)} min-w-[2.75rem] tabular-nums`}
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
              rows={3}
              placeholder={PLACEHOLDERS[kind]}
              maxLength={600}
            />
          </Card>

          <div className="flex flex-col gap-4">
            <Card title="Output" subtitle="How many packs to produce and where they go.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
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
                  className="sm:pt-[22px] xl:pt-0"
                  hint="Rotation packs are served to players at random."
                />
                <ToggleField
                  label={activeConfig ? 'Reuse settings of active pack' : 'Use default settings'}
                  checked={reuseSettings}
                  onChange={setReuseSettings}
                  className="sm:pt-[22px] xl:pt-0"
                  disabled={!activeConfig}
                  hint={activeConfig ? `Copies lives, rewards and timers from "${activeConfig.title}".` : 'No active pack yet, defaults will be used.'}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-[#EEF2F6] pt-4 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
                <p className="text-sm text-[#5F6F83]">
                  Generates{' '}
                  <strong className="font-semibold text-[#0F172A]">
                    {variants} {variants === 1 ? labels.pack.toLowerCase() : labels.packs.toLowerCase()}
                  </strong>{' '}
                  with{' '}
                  <strong className="font-semibold text-[#0F172A]">
                    {count} {labels.items.toLowerCase()}
                  </strong>{' '}
                  each.
                </p>
                <Button size="lg" onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate {labels.pack}</span>
                </Button>
              </div>
            </Card>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-[#FBD5DD] bg-[#FDE8EC] px-4 py-3 text-sm text-[#BE123C]"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">{error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
