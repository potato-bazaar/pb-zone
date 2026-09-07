import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Game } from '../../types/quiz';
import { CONFIG_LABELS, GameConfig, getConfigItems } from '../../types/gameConfig';
import { summarizeItem } from './configSummary';
import { CrushLevelPreview, RushRunPreview, SpinWheelPreview } from './GameConfigPreviews';
import { DifficultyPill, Pill } from './ui';

interface GameConfigPreviewModalProps {
  config: GameConfig | null;
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Player-facing preview of a configuration: playable wheel, level boards, run tracks.
 * Opened from the "Play Simulator" button for non-quiz games.
 */
export const GameConfigPreviewModal: React.FC<GameConfigPreviewModalProps> = ({ config, game, isOpen, onClose }) => {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    setSelected(0);
  }, [config?.id]);

  if (!isOpen) return null;

  if (!config) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white border border-black p-8 max-w-md text-center space-y-3">
          <span className="text-3xl">{game?.icon || '🎮'}</span>
          <h3 className="text-base font-bold text-black">Nothing to preview yet</h3>
          <p className="text-xs text-[#6B6B6B]">Generate a configuration for {game?.name || 'this game'} first.</p>
          <button onClick={onClose} className="px-4 py-2 bg-black text-white text-xs font-bold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const items = getConfigItems(config);
  const idx = Math.min(selected, Math.max(0, items.length - 1));
  const labels = CONFIG_LABELS[config.kind];
  const c = config.content;

  const renderMain = () => {
    switch (c.kind) {
      case 'crush': {
        const level = c.levels[idx];
        if (!level) return null;
        const s = summarizeItem(c, level);
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5">Level {level.order}</span>
              <span className="text-sm font-bold text-black">{level.name}</span>
              <DifficultyPill value={level.difficulty} />
            </div>
            <div className="flex justify-center">
              <CrushLevelPreview level={level} settings={c.settings} />
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {s.chips.map((chip) => (
                <Pill key={chip}>{chip}</Pill>
              ))}
            </div>
            <p className="text-xs text-[#6B6B6B] italic text-center">{level.designerNote}</p>
          </div>
        );
      }
      case 'spin':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-black uppercase tracking-wider mb-3">{c.settings.wheelName}</div>
              <SpinWheelPreview segments={c.segments} settings={c.settings} size={300} />
              <p className="text-[11px] text-[#6B6B6B] mt-3 text-center">
                {c.settings.spinsPerDay} spin{c.settings.spinsPerDay === 1 ? '' : 's'} per day · {c.settings.spinDurationSeconds}s spin ·
                jackpot cap {c.settings.jackpotCapPerDay}/day
              </p>
            </div>
            <div className="border border-[#E2E2E2]">
              <table className="w-full text-xs">
                <thead className="bg-[#F6F6F6] text-[#6B6B6B] uppercase text-[9px] font-bold tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Segment</th>
                    <th className="text-left px-3 py-2">Prize</th>
                    <th className="text-right px-3 py-2">Odds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E2E2]">
                  {c.segments.map((s) => {
                    const total = c.segments.reduce((sum, x) => sum + Math.max(0, x.weight), 0) || 1;
                    return (
                      <tr key={s.id}>
                        <td className="px-3 py-2">
                          <span className="inline-block h-2.5 w-2.5 mr-2 align-middle" style={{ backgroundColor: s.color }} />
                          {s.emoji} {s.label}
                          {s.isJackpot && <span className="ml-1.5 bg-black text-white px-1 py-0.5 text-[8px] uppercase">Jackpot</span>}
                        </td>
                        <td className="px-3 py-2 text-[#545454]">{s.prizeValue}</td>
                        <td className="px-3 py-2 text-right font-mono">{((Math.max(0, s.weight) / total) * 100).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'rush': {
        const run = c.runs[idx];
        if (!run) return null;
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5">Run {run.order}</span>
              <span className="text-sm font-bold text-black">{run.name}</span>
              <DifficultyPill value={run.difficulty} />
              <Pill>{run.theme}</Pill>
            </div>
            <RushRunPreview run={run} settings={c.settings} />
            <p className="text-xs text-[#6B6B6B] italic">{run.designerNote}</p>
          </div>
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white border border-black shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E2E2]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">
              {labels.emoji} {game?.name || labels.pack} · Player Preview
            </span>
            <h2 className="text-lg font-bold text-black">{config.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#6B6B6B] hover:text-black transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4">
          {c.kind !== 'spin' && (
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-[#E2E2E2] max-h-[70vh] overflow-y-auto">
              {items.map((it, i) => {
                const s = summarizeItem(c, it);
                const on = i === idx;
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelected(i)}
                    className={`w-full text-left px-4 py-3 border-b border-[#E2E2E2] text-xs transition-colors ${
                      on ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F6F6F6]'
                    }`}
                  >
                    <div className="font-mono text-[10px] opacity-70">
                      {labels.item} {it.order}
                    </div>
                    <div className="font-bold truncate">{s.title}</div>
                    <div className={`text-[10px] uppercase ${on ? 'text-white/70' : 'text-[#6B6B6B]'}`}>{s.badge}</div>
                  </button>
                );
              })}
            </div>
          )}
          <div className={`${c.kind === 'spin' ? 'md:col-span-4' : 'md:col-span-3'} p-6 max-h-[70vh] overflow-y-auto`}>{renderMain()}</div>
        </div>
      </div>
    </div>
  );
};
