import React, { useState } from 'react';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import { heroMascot } from './gameVisuals';
import { cn } from '../../lib/utils';

export const RANGE_OPTIONS = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
] as const;

export type RangeId = (typeof RANGE_OPTIONS)[number]['id'];

function RangePicker({ value, onChange, className }: { value: RangeId; onChange: (id: RangeId) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-[#0F172A] shadow-card transition-colors hover:bg-[#FAFDFB] xl:h-12 xl:gap-3 xl:rounded-2xl xl:px-5 xl:text-base 2xl:h-[52px] 2xl:text-[17px]"
      >
        <CalendarDays className="h-[18px] w-[18px] text-[#334155] xl:h-[22px] xl:w-[22px]" strokeWidth={1.75} />
        <span className="xl:min-w-[100px] xl:text-left">{RANGE_OPTIONS.find((opt) => opt.id === value)?.label}</span>
        <ChevronDown className={cn('h-4 w-4 text-[#334155] transition-transform xl:ml-5 xl:h-5 xl:w-5', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <button type="button" tabIndex={-1} aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <ul role="listbox" className="absolute left-0 z-50 mt-2 w-full min-w-[180px] rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5 xl:left-auto xl:right-0">
            {RANGE_OPTIONS.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.id === value}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F0FAF2]',
                    opt.id === value ? 'font-semibold text-[#14532D]' : 'text-[#334155]',
                  )}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                  {opt.id === value && <Check className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

interface DashboardHeroProps {
  range: RangeId;
  onRangeChange: (id: RangeId) => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({ range, onRangeChange }) => (
  <section className="relative">
    {/* Glow wash bleeds up behind the transparent header and out to the column edges. */}
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-4 -top-[72px] h-[300px] bg-[radial-gradient(34%_62%_at_60%_32%,rgba(254,236,140,0.6),rgba(254,236,140,0)_72%),radial-gradient(30%_70%_at_100%_0%,rgba(190,240,170,0.75),rgba(190,240,170,0)_70%),radial-gradient(40%_60%_at_80%_40%,rgba(220,245,200,0.6),rgba(220,245,200,0)_70%)] [mask-image:linear-gradient(to_bottom,black_55%,transparent)] sm:-inset-x-5 xl:-inset-x-6 xl:-top-[88px] xl:h-[340px] 2xl:-inset-x-[26px]"
    />
    {/* Sits on the KPI grid's top edge, clipped there so the art never peeks between cards. */}
    <div aria-hidden className="pointer-events-none absolute -inset-x-4 -bottom-3 -top-[72px] overflow-hidden sm:-inset-x-5 sm:-bottom-4 xl:-inset-x-6 xl:-top-[88px] 2xl:-inset-x-[26px] 2xl:-bottom-[18px]">
      <img
        src={heroMascot}
        alt=""
        draggable={false}
        className="absolute bottom-0 right-1 w-[62%] max-w-[300px] translate-y-[22%] select-none sm:right-5 sm:w-[46%] sm:max-w-[400px] md:max-w-[430px] xl:left-[42%] xl:right-auto xl:w-[35%] xl:max-w-none 2xl:left-[37%] 2xl:w-[40%] 2xl:max-w-[620px]"
      />
    </div>

    <div className="relative max-w-[56%] sm:max-w-[52%] xl:max-w-none">
      <p className="text-xs font-bold uppercase tracking-wide text-[#16A34A] 2xl:text-sm">
        Welcome back <span aria-hidden>👋</span>
      </p>
      <h1 className="mt-1 text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#0B1A13] sm:text-4xl 2xl:mt-1.5 2xl:text-[44px]">
        Dashboard
      </h1>
      <p className="mt-1.5 text-sm text-[#5F6F83] 2xl:mt-2 2xl:text-[17px]">
        Here&apos;s what&apos;s happening with your games and community.
      </p>
    </div>

    <RangePicker value={range} onChange={onRangeChange} className="z-20 mt-3 inline-block xl:absolute xl:right-0 xl:top-0 xl:mt-0" />
  </section>
);
