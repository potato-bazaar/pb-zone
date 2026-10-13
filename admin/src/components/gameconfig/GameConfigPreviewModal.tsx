import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { Game } from '../../types/quiz';
import { CONFIG_LABELS, GameConfig, getConfigItems } from '../../types/gameConfig';
import { summarizeItem } from './configSummary';
import { CrushLevelPreview, RushRunPreview, SpinWheelPreview } from './GameConfigPreviews';
import { DifficultyPill, Pill } from './ui';
import { Button, ModalShell, Pill as TonePill, tableClass } from '../ui/pb';

interface GameConfigPreviewModalProps {
  config: GameConfig | null;
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
}

const orderBadge = 'inline-flex h-6 items-center rounded-lg bg-[#E3F8E8] px-2 text-xs font-bold tabular-nums text-[#14532D]';

/**
 * Player-facing preview of a configuration: playable wheel, level boards, run tracks.
 * Opened from the Preview button for non-quiz games.
 */
export const GameConfigPreviewModal: React.FC<GameConfigPreviewModalProps> = ({ config, game, isOpen, onClose }) => {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    setSelected(0);
  }, [config?.id]);

  if (!isOpen) return null;

  if (!config) {
    return (
      <ModalShell onClose={onClose} size="sm">
        <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
          <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF2DD] text-3xl">{game?.icon || '🎮'}</span>
          <h3 className="text-base font-bold text-[#0B1220]">Nothing to preview yet</h3>
          <p className="max-w-xs text-sm text-[#64748B]">Generate a configuration for {game?.name || 'this game'} first.</p>
          <Button onClick={onClose} className="mt-2">
            Close
          </Button>
        </div>
      </ModalShell>
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
              <span className={orderBadge}>Level {level.order}</span>
              <span className="text-base font-bold text-[#0B1220]">{level.name}</span>
              <DifficultyPill value={level.difficulty} />
            </div>
            <div className="overflow-x-auto rounded-xl bg-[#F6F9F7] p-4">
              <div className="mx-auto w-fit">
                <CrushLevelPreview level={level} settings={c.settings} />
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {s.chips.map((chip) => (
                <Pill key={chip}>{chip}</Pill>
              ))}
            </div>
            <p className="text-center text-sm italic text-[#64748B]">{level.designerNote}</p>
          </div>
        );
      }
      case 'spin':
        return (
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
            <div className="flex flex-col items-center rounded-xl bg-[#F6F9F7] px-3 py-4 sm:p-5">
              <div className="mb-3 text-sm font-semibold text-[#0B1220]">{c.settings.wheelName}</div>
              <SpinWheelPreview segments={c.segments} settings={c.settings} size={300} />
              <p className="mt-3 text-center text-xs text-[#64748B]">
                {c.settings.spinsPerDay} spin{c.settings.spinsPerDay === 1 ? '' : 's'} per day · {c.settings.spinDurationSeconds}s spin ·
                jackpot cap {c.settings.jackpotCapPerDay}/day
              </p>
            </div>
            <div className={tableClass.wrap}>
              <table className={tableClass.table}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>Segment</th>
                    <th className={tableClass.th}>Prize</th>
                    <th className={`${tableClass.th} text-right`}>Odds</th>
                  </tr>
                </thead>
                <tbody>
                  {c.segments.map((s) => {
                    const total = c.segments.reduce((sum, x) => sum + Math.max(0, x.weight), 0) || 1;
                    return (
                      <tr key={s.id} className={tableClass.tr}>
                        <td className={tableClass.td}>
                          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: s.color }} />
                          {s.emoji} {s.label}
                          {s.isJackpot && (
                            <TonePill tone="amber" className="ml-1.5">
                              Jackpot
                            </TonePill>
                          )}
                        </td>
                        <td className={`${tableClass.td} text-[#475569]`}>{s.prizeValue}</td>
                        <td className={`${tableClass.td} text-right font-medium tabular-nums`}>
                          {((Math.max(0, s.weight) / total) * 100).toFixed(1)}%
                        </td>
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
              <span className={orderBadge}>Run {run.order}</span>
              <span className="text-base font-bold text-[#0B1220]">{run.name}</span>
              <DifficultyPill value={run.difficulty} />
              <Pill>{run.theme}</Pill>
            </div>
            <RushRunPreview run={run} settings={c.settings} />
            <p className="text-sm italic text-[#64748B]">{run.designerNote}</p>
          </div>
        );
      }
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      size="xl"
      icon={Eye}
      title={config.title}
      description={`${labels.emoji} ${game?.name || labels.pack} · Player Preview`}
    >
      {c.kind === 'spin' ? (
        renderMain()
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-5">
          {/* Item picker: a swipeable row on phones, a scrolling column from md */}
          <div className="-m-1 flex gap-2 overflow-x-auto p-1 md:max-h-[64vh] md:flex-col md:overflow-y-auto md:overflow-x-hidden">
            {items.map((it, i) => {
              const s = summarizeItem(c, it);
              const on = i === idx;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`w-40 shrink-0 rounded-xl border px-3 py-2.5 text-left transition-colors md:w-full ${
                    on
                      ? 'border-[#16A34A] bg-[#F0FAF3] ring-2 ring-[#16A34A]/15'
                      : 'border-[#E6ECE8] bg-white hover:border-[#86D19A] hover:bg-[#F8FBF9]'
                  }`}
                >
                  <div className={`text-[11px] font-medium ${on ? 'text-[#15803D]' : 'text-[#64748B]'}`}>
                    {labels.item} {it.order}
                  </div>
                  <div className="truncate text-sm font-semibold text-[#0F172A]">{s.title}</div>
                  <div className="text-xs capitalize text-[#64748B]">{s.badge}</div>
                </button>
              );
            })}
          </div>
          <div className="min-w-0">{renderMain()}</div>
        </div>
      )}
    </ModalShell>
  );
};
