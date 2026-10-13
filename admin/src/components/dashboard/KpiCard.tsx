import React, { useId } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Trend } from '../../lib/dashboardTrends';
import { cn } from '../../lib/utils';

export type KpiTone = 'green' | 'orange' | 'purple' | 'red' | 'blue';

const TONES: Record<KpiTone, { tile: string; icon: string; badge: string; line: string }> = {
  green: { tile: 'bg-[#E3F8E8]', icon: 'text-[#16A34A]', badge: 'bg-[#E6F7EA] text-[#2F8F4E]', line: '#22C55E' },
  orange: { tile: 'bg-[#FFF2DD]', icon: 'text-[#F59E0B]', badge: 'bg-[#FFF1DC] text-[#EA8A0C]', line: '#F59E0B' },
  purple: { tile: 'bg-[#F1EBFF]', icon: 'text-[#7C3AED]', badge: 'bg-[#F1EBFF] text-[#7C3AED]', line: '#8B5CF6' },
  red: { tile: 'bg-[#FDE8EC]', icon: 'text-[#F43F5E]', badge: 'bg-[#FDE8EC] text-[#F43F5E]', line: '#F43F5E' },
  blue: { tile: 'bg-[#E4F1FE]', icon: 'text-[#1D7CF2]', badge: 'bg-[#E4F1FE] text-[#1D7CF2]', line: '#3B82F6' },
};

export type KpiCardProps = {
  title: string;
  value: string;
  note: string;
  noteClass?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tone: KpiTone;
  badgeTone?: KpiTone;
  /** Omit when the metric has no history to compare against. */
  trend?: Trend;
};

function smoothPath(points: Array<[number, number]>, top: number, bottom: number) {
  const clampY = (y: number) => Math.min(bottom, Math.max(top, y));
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clampY(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clampY(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function Sparkline({ values, color, className }: { values?: number[]; color: string; className?: string }) {
  const gradientId = `spark${useId().replace(/:/g, '')}`;
  const width = 120;
  const height = 40;
  const pad = 4;

  if (!values || values.length < 2) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
        <line x1="0" x2={width} y1={height - 10} y2={height - 10} stroke={color} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((value, index): [number, number] => [
    (index / (values.length - 1)) * width,
    max === min ? height - 10 : pad + (1 - (value - min) / (max - min)) * (height - pad * 2),
  ]);
  const line = smoothPath(points, pad, height - pad);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TrendBadge({ trend, tone, className }: { trend?: Trend; tone: KpiTone; className?: string }) {
  const falling = trend?.change != null && trend.change < 0;
  const label = !trend ? '—' : trend.change === null ? 'New' : `${Math.round(Math.abs(trend.change))}%`;
  const Arrow = falling ? ArrowDown : ArrowUp;
  return (
    <span
      title={!trend ? 'No history to compare yet' : 'Change vs the previous period'}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold tabular-nums min-[1680px]:h-[26px] min-[1680px]:px-2.5 min-[1680px]:text-[13px]',
        TONES[falling ? 'red' : tone].badge,
        className,
      )}
    >
      {trend && trend.change !== null && <Arrow className="h-3 w-3" strokeWidth={2.75} />}
      {label}
    </span>
  );
}

function IconTile({ icon: Icon, tone, className }: { icon: KpiCardProps['icon']; tone: KpiTone; className?: string }) {
  return (
    <div
      className={cn(
        'h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 min-[1680px]:h-[62px] min-[1680px]:w-[62px] min-[1680px]:rounded-2xl',
        TONES[tone].tile,
        TONES[tone].icon,
        className,
      )}
    >
      <Icon className="h-5 w-5 sm:h-6 sm:w-6 min-[1680px]:h-[34px] min-[1680px]:w-[34px]" strokeWidth={2.25} />
    </div>
  );
}

/** Wide reference layout when cards have room (2-up from sm, 4-up from 1680px); stacked otherwise so labels never truncate. */
export function KpiCard({ title, value, note, noteClass, icon, tone, badgeTone = 'green', trend }: KpiCardProps) {
  const line = TONES[tone].line;
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-3 shadow-card sm:p-4 min-[1680px]:p-[17px]">
      <IconTile icon={icon} tone={tone} className="hidden sm:flex xl:hidden min-[1680px]:flex" />
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-start justify-between gap-2 sm:hidden xl:mb-3 xl:flex min-[1680px]:hidden">
          <IconTile icon={icon} tone={tone} className="flex" />
          <TrendBadge trend={trend} tone={badgeTone} />
        </div>
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[13px] font-medium text-[#1F2937] sm:text-sm min-[1680px]:pt-[5px] min-[1680px]:text-[15px]">{title}</p>
          <TrendBadge trend={trend} tone={badgeTone} className="hidden sm:inline-flex xl:hidden min-[1680px]:inline-flex" />
        </div>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[22px] font-extrabold leading-tight tabular-nums text-[#0B1220] sm:text-2xl min-[1680px]:-mt-1 min-[1680px]:text-[28px]">
              {value}
            </p>
            <p className={cn('mt-0.5 truncate text-xs min-[1680px]:text-[15px]', noteClass || 'text-[#64748B]')}>{note}</p>
          </div>
          <Sparkline values={trend?.series} color={line} className="hidden h-9 w-[40%] max-w-[116px] shrink-0 sm:block min-[1680px]:mb-0.5 min-[1680px]:h-10" />
        </div>
        <Sparkline values={trend?.series} color={line} className="mt-2 h-8 w-full sm:hidden" />
      </div>
    </div>
  );
}
