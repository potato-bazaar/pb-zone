import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { RushObstacleType, RushPowerUpType, RushRun, RushSettings } from '../../types/gameConfig';
import { RUSH_OBSTACLES, RUSH_POWERUPS } from '../../data/gameConfigCatalog';
import { Field, NumberField, SelectField, TextField, compactInputCls, inputCls } from './ui';

/* ---------------- Settings (hand-edited) ---------------- */

export const RushSettingsForm: React.FC<{ settings: RushSettings; onChange: (s: RushSettings) => void }> = ({
  settings,
  onChange,
}) => {
  const set = <K extends keyof RushSettings>(key: K, value: RushSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TextField label="Run name" value={run.name} onChange={(v) => set('name', v)} className="col-span-2" maxLength={60} />
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
          className="col-span-2 sm:col-span-4"
          maxLength={80}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Field label={`Obstacles (${run.obstacles.length})`} className="xl:col-span-2">
          <div className="border border-[#E2E2E2] max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#F6F6F6] text-[#6B6B6B] uppercase text-[9px] font-bold tracking-wider sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5">#</th>
                  <th className="text-left px-2 py-1.5">Type</th>
                  <th className="text-left px-2 py-1.5">Lane</th>
                  <th className="text-left px-2 py-1.5">At (m)</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2E2]">
                {run.obstacles.map((o, idx) => (
                  <tr key={o.id}>
                    <td className="px-2 py-1 font-mono text-[#6B6B6B]">{idx + 1}</td>
                    <td className="px-2 py-1">
                      <select
                        value={o.type}
                        onChange={(e) => updateObstacle(idx, { type: e.target.value as RushObstacleType })}
                        className={`${inputCls} py-1`}
                      >
                        {RUSH_OBSTACLES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.emoji} {t.label} ({t.action})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={Math.min(o.lane, lanes - 1)}
                        onChange={(e) => updateObstacle(idx, { lane: parseInt(e.target.value) || 0 })}
                        className={`${compactInputCls} py-1 w-16`}
                      >
                        {Array.from({ length: lanes }).map((_, l) => (
                          <option key={l} value={l}>
                            {l + 1}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={10}
                        max={run.distanceMeters}
                        step={10}
                        value={o.atMeters}
                        onChange={(e) => updateObstacle(idx, { atMeters: Math.max(10, parseInt(e.target.value) || 10) })}
                        className={`${compactInputCls} py-1 w-24 font-mono`}
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeObstacle(idx)}
                        className="p-1 text-[#6B6B6B] hover:text-[#C62828]"
                        title="Remove obstacle"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {run.obstacles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-center text-[#6B6B6B]">
                      No obstacles yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button type="button" onClick={addObstacle} className="flex items-center gap-1 text-[11px] font-semibold text-black hover:underline">
              <Plus className="h-3 w-3" /> Add obstacle
            </button>
            <button type="button" onClick={sortObstacles} className="text-[11px] font-semibold text-[#6B6B6B] hover:text-black hover:underline">
              Sort by distance
            </button>
          </div>
        </Field>

        <Field label={`Power-ups (${run.powerUps.length}/12)`}>
          <div className="space-y-2">
            {run.powerUps.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={p.type}
                  onChange={(e) => updatePowerUp(idx, { type: e.target.value as RushPowerUpType })}
                  className={`${inputCls} py-1`}
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
                  className={`${compactInputCls} py-1 w-24 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => removePowerUp(idx)}
                  className="p-1 text-[#6B6B6B] hover:text-[#C62828]"
                  title="Remove power-up"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {run.powerUps.length === 0 && <p className="text-[11px] text-[#6B6B6B]">No power-ups on this run.</p>}
            <button
              type="button"
              onClick={addPowerUp}
              disabled={run.powerUps.length >= 12}
              className="flex items-center gap-1 text-[11px] font-semibold text-black hover:underline disabled:opacity-30"
            >
              <Plus className="h-3 w-3" /> Add power-up
            </button>
          </div>
        </Field>
      </div>

      <TextField label="Designer note" value={run.designerNote} onChange={(v) => set('designerNote', v)} multiline rows={2} maxLength={300} />
    </div>
  );
};
