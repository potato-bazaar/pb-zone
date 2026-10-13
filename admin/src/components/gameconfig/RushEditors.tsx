import React from 'react';
import { ArrowUpDown, Plus, Trash2 } from 'lucide-react';
import { RushObstacleType, RushPowerUpType, RushRun, RushSettings } from '../../types/gameConfig';
import { RUSH_OBSTACLES, RUSH_POWERUPS } from '../../data/gameConfigCatalog';
import { buttonClass } from '../ui/pb';
import { Field, IconButton, NumberField, SelectField, TextField, compactInputCls } from './ui';

/* ---------------- Settings (hand-edited) ---------------- */

export const RushSettingsForm: React.FC<{ settings: RushSettings; onChange: (s: RushSettings) => void }> = ({
  settings,
  onChange,
}) => {
  const set = <K extends keyof RushSettings>(key: K, value: RushSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
      <NumberField label="Lanes" value={settings.lanes} min={2} max={5} onChange={(v) => set('lanes', v)} />
      <NumberField label="Lives per run" value={settings.livesPerRun} min={1} max={10} onChange={(v) => set('livesPerRun', v)} />
      <NumberField label="Coin value" value={settings.coinValue} min={1} max={100} suffix="pts" onChange={(v) => set('coinValue', v)} />
      <NumberField
        label="Score per meter"
        value={settings.scorePerMeter}
        min={0}
        max={100}
        suffix="pts"
        onChange={(v) => set('scorePerMeter', v)}
      />
      <NumberField
        label="Jump duration"
        value={settings.jumpDurationMs}
        min={200}
        max={2000}
        step={50}
        suffix="ms"
        onChange={(v) => set('jumpDurationMs', v)}
      />
      <NumberField
        label="Slide duration"
        value={settings.slideDurationMs}
        min={200}
        max={2000}
        step={50}
        suffix="ms"
        onChange={(v) => set('slideDurationMs', v)}
      />
      <NumberField
        label="Reward distance"
        value={settings.rewardDistanceMeters}
        min={100}
        max={5000}
        step={50}
        suffix="m"
        onChange={(v) => set('rewardDistanceMeters', v)}
      />
      <TextField label="Reward text" value={settings.rewardText} onChange={(v) => set('rewardText', v)} maxLength={80} />
    </div>
  );
};

/* ---------------- Single run ---------------- */

export const RushRunEditor: React.FC<{ run: RushRun; settings: RushSettings; onChange: (r: RushRun) => void }> = ({
  run,
  settings,
  onChange,
}) => {
  const set = <K extends keyof RushRun>(key: K, value: RushRun[K]) => onChange({ ...run, [key]: value });
  const lanes = Math.max(2, Math.min(5, settings.lanes || 3));

  const updateObstacle = (idx: number, patch: { type?: RushObstacleType; lane?: number; atMeters?: number }) =>
    set(
      'obstacles',
      run.obstacles.map((o, i) => (i === idx ? { ...o, ...patch } : o))
    );
  const addObstacle = () => {
    const last = run.obstacles[run.obstacles.length - 1];
    const at = Math.min(run.distanceMeters - 40, (last?.atMeters || 40) + 80);
    set('obstacles', [
      ...run.obstacles,
      { id: `obs-${run.order}-${Date.now().toString(36)}`, type: 'pothole', lane: 0, atMeters: Math.max(20, at) },
    ]);
  };
  const removeObstacle = (idx: number) =>
    set(
      'obstacles',
      run.obstacles.filter((_, i) => i !== idx)
    );
  const sortObstacles = () => set('obstacles', [...run.obstacles].sort((a, b) => a.atMeters - b.atMeters));

  const updatePowerUp = (idx: number, patch: { type?: RushPowerUpType; atMeters?: number }) =>
    set(
      'powerUps',
      run.powerUps.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    );
  const addPowerUp = () => {
    if (run.powerUps.length >= 12) return;
    set('powerUps', [...run.powerUps, { type: 'butter-shield', atMeters: Math.round(run.distanceMeters / 2) }]);
  };
  const removePowerUp = (idx: number) =>
    set(
      'powerUps',
      run.powerUps.filter((_, i) => i !== idx)
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
        <TextField label="Run name" value={run.name} onChange={(v) => set('name', v)} className="sm:col-span-2" maxLength={60} />
        <TextField label="Theme" value={run.theme} onChange={(v) => set('theme', v)} maxLength={40} />
        <SelectField
          label="Difficulty"
          value={run.difficulty}
          onChange={(v) => set('difficulty', v as RushRun['difficulty'])}
          options={[
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
          ]}
        />
        <NumberField
          label="Distance"
          value={run.distanceMeters}
          min={200}
          max={5000}
          step={50}
          suffix="m"
          onChange={(v) => set('distanceMeters', v)}
        />
        <NumberField label="Base speed" value={run.baseSpeed} min={0.5} max={3} step={0.1} suffix="x" onChange={(v) => set('baseSpeed', v)} />
        <NumberField
          label="Speed ramp"
          value={run.speedRampPercent}
          min={0}
          max={100}
          suffix="%"
          onChange={(v) => set('speedRampPercent', v)}
        />
        <NumberField label="Coins on track" value={run.coinsTotal} min={0} max={2000} onChange={(v) => set('coinsTotal', v)} />
        <TextField
          label="Reward on finish (blank = none)"
          value={run.rewardOnFinish || ''}
          onChange={(v) => set('rewardOnFinish', v.trim() ? v : undefined)}
          className="sm:col-span-2 md:col-span-4"
          maxLength={80}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-5">
        <Field label={`Obstacles (${run.obstacles.length})`} className="min-w-0 2xl:col-span-3">
          {/* A table from sm up; on phones each row wraps into a small card with inline labels. */}
          <div className="max-h-72 overflow-auto rounded-xl border border-[#E6ECE8] bg-white">
            <table className="block w-full border-separate border-spacing-0 text-left text-sm text-[#0F172A] sm:table sm:min-w-[26rem]">
              <thead className="sticky top-0 z-10 hidden text-xs text-[#475569] sm:table-header-group">
                <tr className="[&>th]:border-b [&>th]:border-[#E6ECE8] [&>th]:bg-[#F2F5F8] [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                  <th className="w-12">#</th>
                  <th>Type</th>
                  <th>Lane</th>
                  <th>At (m)</th>
                  <th />
                </tr>
              </thead>
              <tbody className="block sm:table-row-group">
                {run.obstacles.map((o, idx) => (
                  <tr
                    key={o.id}
                    className="flex flex-wrap items-center gap-2 border-b border-[#EEF2F6] p-2.5 last:border-b-0 sm:table-row sm:p-0 sm:transition-colors sm:hover:bg-[#F8FBF9] sm:[&:last-child>td]:border-b-0 sm:[&>td]:border-b sm:[&>td]:border-[#EEF2F6] sm:[&>td]:px-3 sm:[&>td]:py-1.5"
                  >
                    <td className="w-5 font-mono text-xs text-[#64748B] sm:w-auto">{idx + 1}</td>
                    <td className="min-w-0 flex-1 basis-48">
                      <select
                        value={o.type}
                        onChange={(e) => updateObstacle(idx, { type: e.target.value as RushObstacleType })}
                        className={`${compactInputCls} w-full min-w-[9rem]`}
                      >
                        {RUSH_OBSTACLES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.emoji} {t.label} ({t.action})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="flex items-center gap-2 sm:table-cell">
                      <span className="text-xs text-[#64748B] sm:hidden">Lane</span>
                      <select
                        value={Math.min(o.lane, lanes - 1)}
                        onChange={(e) => updateObstacle(idx, { lane: parseInt(e.target.value) || 0 })}
                        className={`${compactInputCls} w-16`}
                      >
                        {Array.from({ length: lanes }).map((_, l) => (
                          <option key={l} value={l}>
                            {l + 1}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="flex items-center gap-2 sm:table-cell">
                      <span className="text-xs text-[#64748B] sm:hidden">At (m)</span>
                      <input
                        type="number"
                        min={10}
                        max={run.distanceMeters}
                        step={10}
                        value={o.atMeters}
                        onChange={(e) => updateObstacle(idx, { atMeters: Math.max(10, parseInt(e.target.value) || 10) })}
                        className={`${compactInputCls} w-20 font-mono sm:w-24`}
                      />
                    </td>
                    <td className="ml-auto text-right">
                      <IconButton onClick={() => removeObstacle(idx)} title="Remove obstacle" danger>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
                {run.obstacles.length === 0 && (
                  <tr className="block sm:table-row">
                    <td colSpan={5} className="block px-3 py-6 text-center text-sm text-[#64748B] sm:table-cell">
                      No obstacles yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button type="button" onClick={addObstacle} className={buttonClass('secondary', 'xs')}>
              <Plus className="h-3.5 w-3.5" /> Add obstacle
            </button>
            <button type="button" onClick={sortObstacles} className={buttonClass('ghost', 'xs')}>
              <ArrowUpDown className="h-3.5 w-3.5" /> Sort by distance
            </button>
          </div>
        </Field>

        <Field label={`Power-ups (${run.powerUps.length}/12)`} className="min-w-0 2xl:col-span-2">
          <div className="space-y-2">
            {run.powerUps.length > 0 && (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-1">
                {run.powerUps.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl bg-[#F6F9F7] p-2">
                    <select
                      value={p.type}
                      onChange={(e) => updatePowerUp(idx, { type: e.target.value as RushPowerUpType })}
                      className={`${compactInputCls} min-w-0 flex-1`}
                    >
                      {RUSH_POWERUPS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emoji} {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={10}
                      max={run.distanceMeters}
                      step={10}
                      value={p.atMeters}
                      onChange={(e) => updatePowerUp(idx, { atMeters: Math.max(10, parseInt(e.target.value) || 10) })}
                      className={`${compactInputCls} w-24 font-mono`}
                    />
                    <IconButton onClick={() => removePowerUp(idx)} title="Remove power-up" danger>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
            {run.powerUps.length === 0 && (
              <p className="rounded-xl border border-dashed border-[#E2E8E4] px-3 py-2.5 text-xs text-[#64748B]">No power-ups on this run.</p>
            )}
            <button
              type="button"
              onClick={addPowerUp}
              disabled={run.powerUps.length >= 12}
              className={buttonClass('secondary', 'xs')}
            >
              <Plus className="h-3.5 w-3.5" /> Add power-up
            </button>
          </div>
        </Field>
      </div>

      <TextField label="Designer note" value={run.designerNote} onChange={(v) => set('designerNote', v)} multiline rows={2} maxLength={300} />
    </div>
  );
};
