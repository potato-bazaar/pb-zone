import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/*
 * PB Zone admin design system: the look of the dashboard, shared by every page.
 * Mint page background, white rounded-2xl panels with a soft shadow, green brand accents,
 * pastel icon tiles and pills, slate text.
 */

export type Tone = 'green' | 'orange' | 'purple' | 'red' | 'blue' | 'gray' | 'amber' | 'dark';

const TILE: Record<Tone, string> = {
  green: 'bg-[#E3F8E8] text-[#16A34A]',
  orange: 'bg-[#FFF2DD] text-[#F59E0B]',
  amber: 'bg-[#FFF3D6] text-[#D97706]',
  purple: 'bg-[#F1EBFF] text-[#7C3AED]',
  red: 'bg-[#FDE8EC] text-[#F43F5E]',
  blue: 'bg-[#E4F1FE] text-[#1D7CF2]',
  gray: 'bg-[#F1F5F9] text-[#475569]',
  dark: 'bg-[#14532D] text-white',
};

const PILL: Record<Tone, string> = {
  green: 'bg-[#E3F8E8] text-[#14532D]',
  orange: 'bg-[#FFF1DC] text-[#B45309]',
  amber: 'bg-[#FFF3D6] text-[#92400E]',
  purple: 'bg-[#F1EDFD] text-[#6D28D9]',
  red: 'bg-[#FDE8EC] text-[#BE123C]',
  blue: 'bg-[#E1EFFE] text-[#1E40AF]',
  gray: 'bg-[#F1F5F9] text-[#334155]',
  dark: 'bg-[#14532D] text-white',
};

const DOT: Record<Tone, string> = {
  green: 'bg-[#16A34A]',
  orange: 'bg-[#F59E0B]',
  amber: 'bg-[#F59E0B]',
  purple: 'bg-[#7C3AED]',
  red: 'bg-[#E11D48]',
  blue: 'bg-[#3B82F6]',
  gray: 'bg-[#94A3B8]',
  dark: 'bg-white',
};

/* ---------- Class recipes (for native elements that can't use a component) ---------- */

export const pbText = {
  title: 'text-[#0B1A13]',
  heading: 'text-[#0B1220]',
  body: 'text-[#0F172A]',
  muted: 'text-[#64748B]',
  subtle: 'text-[#5F6F83]',
} as const;

/** White panel surface. */
export const panelClass = 'rounded-2xl bg-white shadow-card';
/** Nested block inside a panel. */
export const insetClass = 'rounded-xl border border-[#E6ECE8] bg-white';
/** Soft tinted block inside a panel (notes, previews, read-only values). */
export const softClass = 'rounded-xl bg-[#F6F9F7]';

export const labelClass = 'mb-1.5 block text-xs font-semibold text-[#334155]';
export const hintClass = 'mt-1 text-xs leading-snug text-[#64748B]';

const fieldBase =
  'w-full rounded-xl border border-[#E2E8E4] bg-white text-sm text-[#0F172A] transition-colors placeholder:text-[#94A3B8] focus:border-[#86D19A] focus:outline-none focus:ring-4 focus:ring-[#16A34A]/10 disabled:cursor-not-allowed disabled:bg-[#F3F6F4] disabled:text-[#64748B]';
export const inputClass = `${fieldBase} h-10 px-3`;
export const textareaClass = `${fieldBase} px-3 py-2.5 leading-relaxed`;
export const selectClass = `${fieldBase} h-10 px-3 pr-8`;

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-[#16A34A] text-white shadow-sm hover:bg-[#15803D]',
  secondary: 'bg-[#E3F7E7] text-[#14532D] hover:bg-[#D3F1DA]',
  outline: 'border border-[#E2E8E4] bg-white text-[#334155] hover:border-[#CBD5D0] hover:bg-[#F6F9F7]',
  ghost: 'text-[#475569] hover:bg-[#EEF3EF] hover:text-[#0F172A]',
  danger: 'bg-[#FDE8EC] text-[#BE123C] hover:bg-[#FBD5DD]',
  dark: 'bg-[#14532D] text-white hover:bg-[#0F3F22]',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  xs: 'h-7 rounded-lg px-2.5 text-xs',
  sm: 'h-8 rounded-lg px-3 text-xs',
  md: 'h-10 rounded-xl px-4 text-sm',
  lg: 'h-11 rounded-xl px-5 text-[15px]',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16A34A]/20 disabled:cursor-not-allowed disabled:opacity-50',
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    className,
  );
}

export const tableClass = {
  wrap: 'w-full overflow-x-auto rounded-xl',
  table: 'w-full border-separate border-spacing-0 text-left text-sm text-[#0F172A]',
  th: 'whitespace-nowrap bg-[#F2F5F8] px-4 py-2.5 text-[13px] font-medium text-[#475569] first:rounded-l-xl last:rounded-r-xl',
  tr: 'transition-colors hover:bg-[#F8FBF9] [&>td]:border-b [&>td]:border-[#EEF2F6] [&:last-child>td]:border-b-0',
  td: 'px-4 py-3 align-middle',
} as const;

/* ---------- Components ---------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />
  ),
);
Button.displayName = 'Button';

export function IconTile({
  icon: Icon,
  tone = 'green',
  size = 'md',
  className,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = { sm: 'h-9 w-9 rounded-lg', md: 'h-11 w-11 rounded-xl', lg: 'h-14 w-14 rounded-2xl' }[size];
  const glyph = { sm: 'h-[18px] w-[18px]', md: 'h-[22px] w-[22px]', lg: 'h-7 w-7' }[size];
  return (
    <span className={cn('flex shrink-0 items-center justify-center', box, TILE[tone], className)}>
      <Icon className={glyph} strokeWidth={2} />
    </span>
  );
}

export function Pill({
  tone = 'gray',
  dot,
  className,
  children,
  title,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        PILL[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT[tone])} />}
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-wide text-[#16A34A]">{eyebrow}</p>}
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-[-0.02em] text-[#0B1A13] sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-[#5F6F83]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** White card with an optional dashboard-style header (icon tile, title, subtitle, actions). */
export function Panel({
  title,
  description,
  icon,
  tone = 'green',
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tone?: Tone;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}) {
  const hasHeader = title || description || actions;
  return (
    <section className={cn(panelClass, 'p-4 sm:p-5', className)}>
      {hasHeader && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {icon && <IconTile icon={icon} tone={tone} />}
          {/* The min width makes wide actions wrap below the title instead of squeezing it. */}
          <div className="min-w-[min(100%,14rem)] flex-1">
            {title && <h2 className="text-base font-bold leading-tight text-[#0B1220] sm:text-lg">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-[#5F6F83]">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </section>
  );
}

/** Compact metric tile for page-level stats. */
export function StatTile({
  label,
  value,
  note,
  icon,
  tone = 'green',
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn(panelClass, 'flex items-center gap-3.5 p-4', className)}>
      {icon && <IconTile icon={icon} tone={tone} />}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[#1F2937]">{label}</p>
        <p className="text-[22px] font-extrabold leading-tight tabular-nums text-[#0B1220]">{value}</p>
        {note && <p className="truncate text-xs text-[#64748B]">{note}</p>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  tone = 'green',
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      {icon && <IconTile icon={icon} tone={tone} size="lg" className="mb-1" />}
      <h3 className="text-base font-bold text-[#0B1220]">{title}</h3>
      {description && <p className="max-w-md text-sm text-[#64748B]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export type TabItem<T extends string> = { id: T; label: React.ReactNode; badge?: React.ReactNode };

/** Segmented control. For router tabs, style NavLinks with `tabClass`. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn(tabListClass, className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          onClick={() => onChange(item.id)}
          className={tabClass(item.id === value)}
        >
          {item.label}
          {item.badge}
        </button>
      ))}
    </div>
  );
}

export const tabListClass = 'inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-[#E9F0EB] p-1';
export function tabClass(active: boolean) {
  return cn(
    'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors',
    active ? 'bg-white text-[#14532D] shadow-sm' : 'text-[#475569] hover:text-[#0F172A]',
  );
}

/** Accessible switch for boolean settings. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-[#16A34A]' : 'bg-[#CBD5E1]',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/** Overlay + panel used by every modal. */
export function ModalShell({
  open = true,
  onClose,
  title,
  description,
  icon,
  tone = 'green',
  size = 'md',
  footer,
  children,
  bodyClassName,
  closeOnBackdrop = false,
}: {
  open?: boolean;
  onClose: () => void;
  /** Off by default so a stray click can't throw away unsaved edits. */
  closeOnBackdrop?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-7xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-[#0B1A13]/40 backdrop-blur-[2px]" onClick={closeOnBackdrop ? onClose : undefined} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn('relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', width)}
      >
        {(title || description) && (
          <div className="flex items-start gap-3 border-b border-[#EEF2F6] px-5 py-4">
            {icon && <IconTile icon={icon} tone={tone} size="sm" />}
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-base font-bold text-[#0B1220] sm:text-lg">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-[#64748B]">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className={buttonClass('ghost', 'icon-sm')}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF2F6] bg-[#FAFCFB] px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
