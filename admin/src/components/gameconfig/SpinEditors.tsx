import React from 'react';
import { SpinPrizeType, SpinSettings, WheelSegment } from '../../types/gameConfig';
import { SPIN_PRIZES } from '../../data/gameConfigCatalog';
import { Field, NumberField, SelectField, TextField, ToggleField, inputCls } from './ui';

/* ---------------- Settings (hand-edited) ---------------- */

export const SpinSettingsForm: React.FC<{ settings: SpinSettings; onChange: (s: SpinSettings) => void }> = ({
  settings,
  onChange,
}) => {
  const set = <K extends keyof SpinSettings>(key: K, value: SpinSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
      <TextField label="Wheel name" value={settings.wheelName} onChange={(v) => set('wheelName', v)} className="sm:col-span-2" maxLength={40} />
      <NumberField label="Spins per day" value={settings.spinsPerDay} min={1} max={20} onChange={(v) => set('spinsPerDay', v)} />
      <NumberField
        label="Cooldown"
        value={settings.cooldownMinutes}
        min={0}
        max={10080}
        suffix="min"
        onChange={(v) => set('cooldownMinutes', v)}
      />
      <NumberField
        label="Spin duration"
        value={settings.spinDurationSeconds}
        min={1}
        max={15}
        suffix="sec"
        onChange={(v) => set('spinDurationSeconds', v)}
      />
      <NumberField
        label="Jackpot cap per day"
        value={settings.jackpotCapPerDay}
        min={0}
        max={1000}
        onChange={(v) => set('jackpotCapPerDay', v)}
      />
      <NumberField
        label="Voucher validity"
        value={settings.voucherValidityDays}
        min={1}
        max={365}
        suffix="days"
        onChange={(v) => set('voucherValidityDays', v)}
      />
      <ToggleField label="Login required" checked={settings.requireLogin} onChange={(v) => set('requireLogin', v)} className="sm:pt-5" />
    </div>
  );
};

/* ---------------- Single segment ---------------- */

export const SpinSegmentEditor: React.FC<{
  segment: WheelSegment;
  totalWeight: number;
  onChange: (s: WheelSegment) => void;
}> = ({ segment, totalWeight, onChange }) => {
  const set = <K extends keyof WheelSegment>(key: K, value: WheelSegment[K]) => onChange({ ...segment, [key]: value });
  const odds = totalWeight > 0 ? ((Math.max(0, segment.weight) / totalWeight) * 100).toFixed(1) : '0.0';

  const handlePrizeType = (v: string) => {
    const type = v as SpinPrizeType;
    const meta = SPIN_PRIZES.find((p) => p.id === type);
    onChange({ ...segment, prizeType: type, emoji: meta ? meta.emoji : segment.emoji });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
        <TextField label="Label (max 14)" value={segment.label} onChange={(v) => set('label', v)} maxLength={14} />
        <Field label="Emoji">
          <input
            type="text"
            value={segment.emoji}
            onChange={(e) => set('emoji', e.target.value.slice(0, 4))}
            className={`${inputCls} text-center text-base`}
          />
        </Field>
        <Field label="Color">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#E2E8E4] bg-white py-1 pl-1 pr-3 transition-colors focus-within:border-[#86D19A] focus-within:ring-4 focus-within:ring-[#16A34A]/10">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(segment.color) ? segment.color : '#F5B301'}
              onChange={(e) => set('color', e.target.value.toUpperCase())}
              className="h-7 w-10 shrink-0 cursor-pointer rounded-[8px] border-0 bg-transparent p-0 focus:outline-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[8px] [&::-webkit-color-swatch]:border-0"
            />
            <span className="truncate font-mono text-xs text-[#475569]">{segment.color}</span>
          </div>
        </Field>
        <SelectField
          label="Prize type"
          value={segment.prizeType}
          onChange={handlePrizeType}
          options={SPIN_PRIZES.map((p) => ({ value: p.id, label: `${p.emoji} ${p.label}` }))}
        />
        <TextField
          label="Prize value (shown to player)"
          value={segment.prizeValue}
          onChange={(v) => set('prizeValue', v)}
          className="sm:col-span-2"
          maxLength={60}
        />
        <NumberField
          label="Weight (odds)"
          value={segment.weight}
          min={1}
          max={100}
          onChange={(v) => set('weight', v)}
          hint={`${odds}% chance per spin`}
        />
        <ToggleField label="Jackpot segment" checked={segment.isJackpot} onChange={(v) => set('isJackpot', v)} className="sm:pt-5" />
      </div>
      <TextField
        label="Description"
        value={segment.description}
        onChange={(v) => set('description', v)}
        multiline
        rows={2}
        maxLength={200}
      />
    </div>
  );
};
