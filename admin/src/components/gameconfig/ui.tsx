import React from 'react';
import { buttonClass, hintClass, labelClass } from '../ui/pb';

/* Small shared form/layout primitives for the game-config screens, in the PB Zone admin style (see ui/pb.tsx). */

const fieldCls =
  'rounded-xl border border-[#E2E8E4] bg-white px-3 py-2 text-sm text-[#0F172A] transition-colors placeholder:text-[#94A3B8] focus:border-[#86D19A] focus:outline-none focus:ring-4 focus:ring-[#16A34A]/10 disabled:cursor-not-allowed disabled:bg-[#F3F6F4] disabled:text-[#64748B]';
export const inputCls = `w-full ${fieldCls}`;
export const labelCls = labelClass;
/* Same look as inputCls but without w-full, for controls that size themselves inside a row. */
export const compactInputCls = fieldCls;

export const Field: React.FC<{ label: string; hint?: string; className?: string; children: React.ReactNode }> = ({
  label,
  hint,
  className = '',
  children,
}) => (
  <div className={className}>
    <label className={labelCls}>{label}</label>
    {children}
    {hint && <p className={hintClass}>{hint}</p>}
  </div>
);

export const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
}> = ({ label, value, onChange, placeholder, hint, className, multiline, rows = 2, maxLength }) => (
  <Field label={label} hint={hint} className={className}>
    {multiline ? (
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={inputCls}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={inputCls}
      />
    )}
  </Field>
);

export const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  className?: string;
  suffix?: string;
}> = ({ label, value, onChange, min, max, step = 1, hint, className, suffix }) => {
  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };
  return (
    <Field label={label} hint={hint} className={className}>
      <div className="relative">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          onBlur={(e) => {
            const n = parseFloat(e.target.value);
            onChange(clamp(Number.isFinite(n) ? n : min ?? 0));
          }}
          className={`${inputCls} font-mono ${suffix ? 'pr-12' : ''}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
};

export const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  className?: string;
}> = ({ label, value, onChange, options, hint, className }) => (
  <Field label={label} hint={hint} className={className}>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </Field>
);

export const ToggleField: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  className?: string;
  disabled?: boolean;
}> = ({ label, checked, onChange, hint, className = '', disabled }) => (
  <div className={className}>
    <label
      className={`flex items-center gap-2.5 rounded-xl border border-[#E6ECE8] bg-[#F6F9F7] px-3 py-2.5 text-sm transition-colors ${
        disabled ? 'opacity-50' : 'cursor-pointer hover:border-[#CFE6D6]'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-[#16A34A]"
      />
      <span className="font-semibold text-[#0F172A]">{label}</span>
    </label>
    {hint && <p className={hintClass}>{hint}</p>}
  </div>
);

export const Card: React.FC<{
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, right, className = '', children }) => (
  <div className={`space-y-4 rounded-2xl bg-white p-4 shadow-card sm:p-5 ${className}`}>
    {(title || right) && (
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EEF2F6] pb-3">
        <div className="min-w-[min(100%,14rem)] flex-1">
          {title && <h3 className="text-base font-bold text-[#0B1220]">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-sm text-[#5F6F83]">{subtitle}</p>}
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);

export const Pill: React.FC<{
  children: React.ReactNode;
  tone?: 'default' | 'green' | 'amber' | 'dark' | 'purple' | 'red';
  className?: string;
  title?: string;
}> = ({ children, tone = 'default', className = '', title }) => {
  const tones: Record<string, string> = {
    default: 'bg-[#F1F5F9] text-[#334155]',
    green: 'bg-[#E3F8E8] text-[#14532D]',
    amber: 'bg-[#FFF3D6] text-[#92400E]',
    dark: 'bg-[#14532D] text-white',
    purple: 'bg-[#F1EDFD] text-[#6D28D9]',
    red: 'bg-[#FDE8EC] text-[#BE123C]',
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export const DifficultyPill: React.FC<{ value: string }> = ({ value }) => (
  <span className="whitespace-nowrap rounded-full bg-[#EEF2F6] px-2.5 py-0.5 text-xs font-medium capitalize text-[#475569]">{value}</span>
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const PrimaryButton: React.FC<ButtonProps> = ({ className = '', children, ...rest }) => (
  <button type="button" {...rest} className={buttonClass('primary', 'md', className)}>
    {children}
  </button>
);

export const OutlineButton: React.FC<ButtonProps> = ({ className = '', children, ...rest }) => (
  <button type="button" {...rest} className={buttonClass('outline', 'md', className)}>
    {children}
  </button>
);

export const GhostButton: React.FC<ButtonProps> = ({ className = '', children, ...rest }) => (
  <button type="button" {...rest} className={buttonClass('ghost', 'md', className)}>
    {children}
  </button>
);

export const IconButton: React.FC<ButtonProps & { danger?: boolean }> = ({ className = '', danger, children, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors disabled:opacity-30 ${
      danger ? 'hover:bg-[#FDE8EC] hover:text-[#BE123C]' : 'hover:bg-[#EEF3EF] hover:text-[#0F172A]'
    } ${className}`}
  >
    {children}
  </button>
);
