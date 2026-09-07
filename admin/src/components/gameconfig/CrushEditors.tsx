import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  CrushBlockerType,
  CrushBoosterType,
  CrushLevel,
  CrushObjective,
  CrushObjectiveType,
  CrushSettings,
} from '../../types/gameConfig';
import { CRUSH_BLOCKERS, CRUSH_BOOSTERS, CRUSH_OBJECTIVES, CRUSH_TILE_CATALOG } from '../../data/gameConfigCatalog';
import { Field, NumberField, SelectField, TextField, compactInputCls } from './ui';

/* ---------------- Settings (hand-edited) ---------------- */

export const CrushSettingsForm: React.FC<{ settings: CrushSettings; onChange: (s: CrushSettings) => void }> = ({
  settings,
  onChange,
}) => {
  const set = <K extends keyof CrushSettings>(key: K, value: CrushSettings[K]) => onChange({ ...settings, [key]: value });

  const toggleTile = (id: string) => {
    const has = settings.tileSet.some((t) => t.id === id);
    if (has) {
      if (settings.tileSet.length <= 3) return;
      set(
        'tileSet',
        settings.tileSet.filter((t) => t.id !== id)
      );
    } else {
      const tile = CRUSH_TILE_CATALOG.find((t) => t.id === id);
      if (tile) set('tileSet', [...settings.tileSet, tile]);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="Tile set in play (minimum 3)" hint="Levels can only use tiles from this set.">
        <div className="flex flex-wrap gap-2">
          {CRUSH_TILE_CATALOG.map((t) => {
            const on = settings.tileSet.some((x) => x.id === t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTile(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-xs transition-colors ${
                  on ? 'border-black bg-black text-white' : 'border-[#E2E2E2] bg-white text-[#545454] hover:border-black'
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NumberField label="Lives per day" value={settings.livesPerDay} min={1} max={20} onChange={(v) => set('livesPerDay', v)} />
        <NumberField
          label="Life refill"
          value={settings.lifeRefillMinutes}
          min={1}
          max={1440}
          suffix="min"
          onChange={(v) => set('lifeRefillMinutes', v)}
        />
        <NumberField label="Default rows" value={settings.defaultGridRows} min={5} max={10} onChange={(v) => set('defaultGridRows', v)} />
        <NumberField label="Default columns" value={settings.defaultGridCols} min={5} max={10} onChange={(v) => set('defaultGridCols', v)} />
        <NumberField label="Score per tile" value={settings.scorePerTile} min={10} max={1000} step={10} onChange={(v) => set('scorePerTile', v)} />
        <NumberField
          label="Combo multiplier"
          value={settings.comboMultiplier}
          min={1}
          max={5}
          step={0.1}
          onChange={(v) => set('comboMultiplier', v)}
        />
        <NumberField
          label="Reward every N levels"
          value={settings.rewardLevelInterval}
          min={1}
          max={50}
          onChange={(v) => set('rewardLevelInterval', v)}
        />
        <TextField label="Reward text" value={settings.rewardText} onChange={(v) => set('rewardText', v)} maxLength={80} />
      </div>
    </div>
  );
};

/* ---------------- Single level ---------------- */

export const CrushLevelEditor: React.FC<{
  level: CrushLevel;
  settings: CrushSettings;
  onChange: (l: CrushLevel) => void;
}> = ({ level, settings, onChange }) => {
  const set = <K extends keyof CrushLevel>(key: K, value: CrushLevel[K]) => onChange({ ...level, [key]: value });
  const tileSet = settings.tileSet.length ? settings.tileSet : CRUSH_TILE_CATALOG;

  const toggleTile = (id: string) => {
    if (level.tileIds.includes(id)) {
      if (level.tileIds.length <= 3) return;
      set(
        'tileIds',
        level.tileIds.filter((t) => t !== id)
      );
    } else {
      set('tileIds', [...level.tileIds, id]);
    }
  };

  const updateObjective = (idx: number, patch: Partial<CrushObjective>) =>
    set(
      'objectives',
      level.objectives.map((o, i) => {
        if (i !== idx) return o;
        const next = { ...o, ...patch };
        if (next.type === 'collect' && !next.tileId) next.tileId = level.tileIds[0];
        if (next.type !== 'collect') delete next.tileId;
        return next;
      })
    );
  const addObjective = () => {
    if (level.objectives.length >= 3) return;
    set('objectives', [...level.objectives, { type: 'collect', tileId: level.tileIds[0], target: 30 }]);
  };
  const removeObjective = (idx: number) => {
    if (level.objectives.length <= 1) return;
    set(
      'objectives',
      level.objectives.filter((_, i) => i !== idx)
    );
  };

  const updateBlocker = (idx: number, patch: { type?: CrushBlockerType; count?: number }) =>
    set(
      'blockers',
      level.blockers.map((b, i) => (i === idx ? { ...b, ...patch } : b))
    );
  const addBlocker = () => {
    if (level.blockers.length >= 4) return;
    const used = level.blockers.map((b) => b.type);
    const next = CRUSH_BLOCKERS.find((b) => !used.includes(b.id)) || CRUSH_BLOCKERS[0];
    set('blockers', [...level.blockers, { type: next.id, count: 4 }]);
  };
  const removeBlocker = (idx: number) =>
    set(
      'blockers',
      level.blockers.filter((_, i) => i !== idx)
    );

  const toggleBooster = (id: CrushBoosterType) =>
    set(
      'boostersAllowed',
      level.boostersAllowed.includes(id) ? level.boostersAllowed.filter((b) => b !== id) : [...level.boostersAllowed, id]
    );

  const setStar = (idx: 0 | 1 | 2, value: number) => {
    const next: [number, number, number] = [...level.starScores] as [number, number, number];
    next[idx] = value;
    set('starScores', next);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TextField label="Level name" value={level.name} onChange={(v) => set('name', v)} className="col-span-2" maxLength={60} />
        <SelectField
          label="Difficulty"
          value={level.difficulty}
          onChange={(v) => set('difficulty', v as CrushLevel['difficulty'])}
          options={[
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
          ]}
        />
        <NumberField label="Moves" value={level.moves} min={5} max={80} onChange={(v) => set('moves', v)} />
        <NumberField label="Grid rows" value={level.gridRows} min={5} max={10} onChange={(v) => set('gridRows', v)} />
        <NumberField label="Grid columns" value={level.gridCols} min={5} max={10} onChange={(v) => set('gridCols', v)} />
        <TextField
          label="Reward on clear (blank = none)"
          value={level.rewardOnClear || ''}
          onChange={(v) => set('rewardOnClear', v.trim() ? v : undefined)}
          className="col-span-2"
          maxLength={80}
        />
      </div>

      <Field label="Tiles in play (minimum 3)">
        <div className="flex flex-wrap gap-2">
          {tileSet.map((t) => {
            const on = level.tileIds.includes(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTile(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-xs transition-colors ${
                  on ? 'border-black bg-black text-white' : 'border-[#E2E2E2] bg-white text-[#545454] hover:border-black'
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Objectives */}
        <Field label={`Objectives (${level.objectives.length}/3)`}>
          <div className="space-y-2">
            {level.objectives.map((o, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select
                  value={o.type}
                  onChange={(e) => updateObjective(idx, { type: e.target.value as CrushObjectiveType })}
                  className={`${compactInputCls} flex-1 min-w-[8rem]`}
                >
                  {CRUSH_OBJECTIVES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {o.type === 'collect' && (
                  <select
                    value={o.tileId || level.tileIds[0]}
                    onChange={(e) => updateObjective(idx, { tileId: e.target.value })}
                    className={`${compactInputCls} flex-1 min-w-[8rem]`}
                  >
                    {level.tileIds.map((id) => {
                      const t = tileSet.find((x) => x.id === id);
                      return (
                        <option key={id} value={id}>
                          {t ? `${t.emoji} ${t.label}` : id}
                        </option>
                      );
                    })}
                  </select>
                )}
                <input
                  type="number"
                  min={1}
                  value={o.target}
                  onChange={(e) => updateObjective(idx, { target: Math.max(1, parseInt(e.target.value) || 1) })}
                  className={`${compactInputCls} w-20 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => removeObjective(idx)}
                  disabled={level.objectives.length <= 1}
                  className="p-1.5 text-[#6B6B6B] hover:text-[#C62828] disabled:opacity-20"
                  title="Remove objective"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addObjective}
              disabled={level.objectives.length >= 3}
              className="flex items-center gap-1 text-[11px] font-semibold text-black hover:underline disabled:opacity-30"
            >
              <Plus className="h-3 w-3" /> Add objective
            </button>
          </div>
        </Field>

        {/* Blockers */}
        <Field label={`Blockers (${level.blockers.length}/4)`}>
          <div className="space-y-2">
            {level.blockers.map((b, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select
                  value={b.type}
                  onChange={(e) => updateBlocker(idx, { type: e.target.value as CrushBlockerType })}
                  className={`${compactInputCls} flex-1 min-w-[8rem]`}
                >
                  {CRUSH_BLOCKERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.emoji} {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={64}
                  value={b.count}
                  onChange={(e) => updateBlocker(idx, { count: Math.min(64, Math.max(1, parseInt(e.target.value) || 1)) })}
                  className={`${compactInputCls} w-20 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => removeBlocker(idx)}
                  className="p-1.5 text-[#6B6B6B] hover:text-[#C62828]"
                  title="Remove blocker"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {level.blockers.length === 0 && <p className="text-[11px] text-[#6B6B6B]">No blockers on this level.</p>}
            <button
              type="button"
              onClick={addBlocker}
              disabled={level.blockers.length >= 4}
              className="flex items-center gap-1 text-[11px] font-semibold text-black hover:underline disabled:opacity-30"
            >
              <Plus className="h-3 w-3" /> Add blocker
            </button>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field label="Boosters allowed">
          <div className="flex flex-wrap gap-2">
            {CRUSH_BOOSTERS.map((b) => {
              const on = level.boostersAllowed.includes(b.id);
              return (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => toggleBooster(b.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-xs transition-colors ${
                    on ? 'border-black bg-black text-white' : 'border-[#E2E2E2] bg-white text-[#545454] hover:border-black'
                  }`}
                >
                  <span>{b.emoji}</span>
                  <span>{b.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Star score thresholds (1 / 2 / 3 stars)">
          <div className="grid grid-cols-3 gap-2">
            {([0, 1, 2] as const).map((i) => (
              <input
                key={i}
                type="number"
                min={100}
                step={100}
                value={level.starScores[i]}
                onChange={(e) => setStar(i, Math.max(100, parseInt(e.target.value) || 100))}
                className={`${compactInputCls} w-full font-mono`}
              />
            ))}
          </div>
        </Field>
      </div>

      <TextField
        label="Designer note"
        value={level.designerNote}
        onChange={(v) => set('designerNote', v)}
        multiline
        rows={2}
        maxLength={300}
      />
    </div>
  );
};
