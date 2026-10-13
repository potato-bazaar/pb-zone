import React from 'react';
import { Gamepad2, Gift, Layers, Trophy } from 'lucide-react';
import { Game } from '../../types/quiz';
import { CONFIG_LABELS, ConfigKind, GameConfig, getItemCount } from '../../types/gameConfig';
import { IconTile, PageHeader, Pill, panelClass, tableClass, type Tone } from '../ui/pb';
import { cn } from '../../lib/utils';

interface GameConfigTelemetryViewProps {
  configs: GameConfig[];
  game: Game;
  kind: ConfigKind;
}

type Kpi = {
  label: string;
  value: string;
  note: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tone: Tone;
  /** Long text values (reward type) use a smaller, wrapping style. */
  text?: boolean;
};

export const GameConfigTelemetryView: React.FC<GameConfigTelemetryViewProps> = ({ configs, game, kind }) => {
  const labels = CONFIG_LABELS[kind];
  const totalPlays = configs.reduce((s, c) => s + c.playsCount, 0);
  const totalWinners = configs.reduce((s, c) => s + c.winnersCount, 0);
  const winRate = totalPlays > 0 ? Math.round((totalWinners / totalPlays) * 100) : 0;
  const inRotation = configs.filter((c) => c.inRotation).length;

  const kpis: Kpi[] = [
    { label: `${labels.packs}`, value: configs.length.toLocaleString(), note: `${inRotation} in rotation`, icon: Layers, tone: 'green' },
    { label: 'Total Plays', value: totalPlays.toLocaleString(), note: 'All packs combined', icon: Gamepad2, tone: 'blue' },
    { label: 'Total Winners', value: totalWinners.toLocaleString(), note: `${winRate}% win rate`, icon: Trophy, tone: 'purple' },
    { label: 'Reward Type', value: game.rewardType, note: 'Configured on the game', icon: Gift, tone: 'orange', text: true },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title={`Telemetry · ${game.name}`}
        description={`Plays and winners per ${labels.pack.toLowerCase()}. Counts update as the game client reports sessions.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={cn(panelClass, 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-3.5')}
          >
            <IconTile icon={kpi.icon} tone={kpi.tone} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#1F2937]">{kpi.label}</p>
              <p
                title={kpi.text ? kpi.value : undefined}
                className={
                  kpi.text
                    ? 'line-clamp-2 text-[15px] font-bold leading-snug text-[#0B1220]'
                    : 'text-[22px] font-extrabold leading-tight tabular-nums text-[#0B1220] sm:text-2xl'
                }
              >
                {kpi.value}
              </p>
              <p className="mt-0.5 text-xs text-[#64748B]">{kpi.note}</p>
            </div>
          </div>
        ))}
      </div>

      <section className={cn(panelClass, 'p-4 sm:p-5')}>
        <div className={tableClass.wrap}>
          <table className={cn(tableClass.table, 'min-w-[680px]')}>
            <thead>
              <tr>
                <th className={tableClass.th}>{labels.pack}</th>
                <th className={tableClass.th}>{labels.items}</th>
                <th className={tableClass.th}>Status</th>
                <th className={tableClass.th}>Plays</th>
                <th className={tableClass.th}>Winners</th>
                <th className={tableClass.th}>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => {
                const rate = c.playsCount > 0 ? Math.round((c.winnersCount / c.playsCount) * 100) : 0;
                return (
                  <tr key={c.id} className={tableClass.tr}>
                    <td className={cn(tableClass.td, 'font-semibold text-[#0F172A]')}>{c.title}</td>
                    <td className={cn(tableClass.td, 'tabular-nums')}>{getItemCount(c)}</td>
                    <td className={tableClass.td}>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill tone={c.status === 'published' ? 'green' : 'gray'} dot className="capitalize">
                          {c.status}
                        </Pill>
                        {c.inRotation && (
                          <Pill tone="blue" className="capitalize">
                            rotation
                          </Pill>
                        )}
                      </div>
                    </td>
                    <td className={cn(tableClass.td, 'tabular-nums')}>{c.playsCount.toLocaleString()}</td>
                    <td className={cn(tableClass.td, 'tabular-nums')}>{c.winnersCount.toLocaleString()}</td>
                    <td className={tableClass.td}>
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-[#EEF3EF]">
                          <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="font-medium tabular-nums">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {configs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#64748B]">
                    No {labels.packs.toLowerCase()} yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
