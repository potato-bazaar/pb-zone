import React from 'react';
import { Game } from '../../types/quiz';
import { CONFIG_LABELS, ConfigKind, GameConfig, getItemCount } from '../../types/gameConfig';
import { Pill } from './ui';

interface GameConfigTelemetryViewProps {
  configs: GameConfig[];
  game: Game;
  kind: ConfigKind;
}

export const GameConfigTelemetryView: React.FC<GameConfigTelemetryViewProps> = ({ configs, game, kind }) => {
  const labels = CONFIG_LABELS[kind];
  const totalPlays = configs.reduce((s, c) => s + c.playsCount, 0);
  const totalWinners = configs.reduce((s, c) => s + c.winnersCount, 0);
  const winRate = totalPlays > 0 ? Math.round((totalWinners / totalPlays) * 100) : 0;
  const inRotation = configs.filter((c) => c.inRotation).length;

  return (
    <div className="space-y-6 pb-16">
      <div className="border-b border-[#E2E2E2] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-black">Telemetry · {game.name}</h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Plays and winners per {labels.pack.toLowerCase()}. Counts update as the game client reports sessions.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `${labels.packs}`, value: configs.length.toLocaleString(), note: `${inRotation} in rotation` },
          { label: 'Total Plays', value: totalPlays.toLocaleString(), note: 'All packs combined' },
          { label: 'Total Winners', value: totalWinners.toLocaleString(), note: `${winRate}% win rate` },
          { label: 'Reward Type', value: game.rewardType, note: 'Configured on the game' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#E2E2E2] p-4">
            <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">{kpi.label}</div>
            <div className="text-lg font-bold text-black font-mono mt-1 truncate">{kpi.value}</div>
            <div className="text-[11px] text-[#6B6B6B] mt-0.5">{kpi.note}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E2E2E2] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F6F6F6] text-[#6B6B6B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E2E2]">
            <tr>
              <th className="py-3 px-4">{labels.pack}</th>
              <th className="py-3 px-4">{labels.items}</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Plays</th>
              <th className="py-3 px-4">Winners</th>
              <th className="py-3 px-4">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E2E2]">
            {configs.map((c) => {
              const rate = c.playsCount > 0 ? Math.round((c.winnersCount / c.playsCount) * 100) : 0;
              return (
                <tr key={c.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-3 px-4 font-semibold text-black">{c.title}</td>
                  <td className="py-3 px-4 font-mono">{getItemCount(c)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Pill tone={c.status === 'published' ? 'green' : 'default'}>{c.status}</Pill>
                      {c.inRotation && <Pill>rotation</Pill>}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono">{c.playsCount.toLocaleString()}</td>
                  <td className="py-3 px-4 font-mono">{c.winnersCount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-[#EEEEEE] overflow-hidden">
                        <div className="h-full bg-black" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="font-mono">{rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {configs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[#6B6B6B]">
                  No {labels.packs.toLowerCase()} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
