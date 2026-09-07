import React from 'react';

/* Small shared form/layout primitives for the game-config screens.
   Styling follows the existing Uber-minimalist light theme of the admin panel. */

export const inputCls =
  'w-full bg-white border border-[#E2E2E2] p-2 text-xs text-black focus:border-black focus:outline-none disabled:bg-[#F6F6F6] disabled:text-[#6B6B6B]';
export const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-1';
/* Same look as inputCls but without w-full, for controls that size themselves inside a row. */
export const compactInputCls =
  'bg-white border border-[#E2E2E2] p-2 text-xs text-black focus:border-black focus:outline-none disabled:bg-[#F6F6F6] disabled:text-[#6B6B6B]';

export const Field: React.FC<{ label: string; hint?: string; className?: string; children: React.ReactNode }> = ({
  label,
  hint,
  className = '',
  children,
}) => (
  <div className={className}>
    <label className={labelCls}>{label}</label>
    {children}
    {hint && <p className="text-[10px] text-[#6B6B6B] mt-1 leading-snug">{hint}</p>}
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
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6B6B6B] pointer-events-none">
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
      className={`flex items-center gap-2 p-2 bg-[#F6F6F6] border border-[#E2E2E2] text-xs ${
        disabled ? 'opacity-50' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-black"
      />
      <span className="font-semibold text-black">{label}</span>
    </label>
    {hint && <p className="text-[10px] text-[#6B6B6B] mt-1 leading-snug">{hint}</p>}
  </div>
);

export const Card: React.FC<{
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, right, className = '', children }) => (
  <div className={`bg-white border border-[#E2E2E2] p-5 space-y-4 ${className}`}>
    {(title || right) && (
      <div className="flex items-start justify-between gap-3 border-b border-[#E2E2E2] pb-3">
        <div>
          {title && <h3 className="text-sm font-bold text-black uppercase tracking-wider">{title}</h3>}
          {subtitle && <p className="text-xs text-[#6B6B6B] mt-0.5">{subtitle}</p>}
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
    default: 'bg-[#F6F6F6] border-[#E2E2E2] text-[#333333]',
    green: 'bg-[#EBF7EE] border-[#0E8345] text-[#0E8345]',
    amber: 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]',
    dark: 'bg-black border-black text-white',
    purple: 'bg-[#EDE9FE] border-[#C4B5FD] text-[#6D28D9]',
    red: 'bg-[#FCEBEB] border-[#C62828] text-[#C62828]',
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-semibold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export const DifficultyPill: React.FC<{ value: string }> = ({ value }) => (
  <span className="uppercase text-[10px] font-bold text-[#545454] bg-[#EEEEEE] px-2 py-0.5 whitespace-nowrap">{value}</span>
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const PrimaryButton: React.FC<ButtonProps> = ({ className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold whitespace-nowrap hover:bg-[#262626] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

export const OutlineButton: React.FC<ButtonProps> = ({ className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 px-4 py-2 bg-white border border-black text-black text-xs font-bold whitespace-nowrap hover:bg-black hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

export const GhostButton: React.FC<ButtonProps> = ({ className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

export const IconButton: React.FC<ButtonProps & { danger?: boolean }> = ({ className = '', danger, children, ...rest }) => (
  <button
    {...rest}
    className={`p-1.5 text-[#6B6B6B] transition-colors disabled:opacity-20 ${
      danger ? 'hover:text-[#C62828]' : 'hover:text-black hover:bg-[#F6F6F6]'
    } ${className}`}
  >
    {children}
  </button>
);
