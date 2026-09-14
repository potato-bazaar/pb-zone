import React from 'react';
import { ArrowRight, Eye, Sparkles } from 'lucide-react';
import { Game } from '../../types/quiz';
import { CONFIG_LABELS, GameConfig, getConfigItems } from '../../types/gameConfig';
import { summarizeItem, summarizeSettings, describeContent } from './configSummary';
import { CrushLevelPreview, RushRunPreview, SpinWheelPreview } from './GameConfigPreviews';
import { DifficultyPill, Pill } from './ui';

interface GameConfigActiveViewProps {
  config: GameConfig;
  game: Game;
  rotationCount: number;
  onNavigateToManage: () => void;
  onNavigateToSetup: () => void;
  onOpenPreview: () => void;
  onTogglePublish: () => void;
  embedded?: boolean;
}

export const GameConfigActiveView: React.FC<GameConfigActiveViewProps> = ({
  config,
  game,
  rotationCount,
  onNavigateToManage,
  onNavigateToSetup,
  onOpenPreview,
  onTogglePublish,
  embedded = false,
}) => {
  const labels = CONFIG_LABELS[config.kind];
  const items = getConfigItems(config);
  const isPublished = config.status === 'published';
  const winRate = config.playsCount > 0 ? Math.round((config.winnersCount / config.playsCount) * 100) : null;

  const renderPreview = () => {
    const c = config.content;
    switch (c.kind) {
      case 'crush':
        return c.levels[0] ? <CrushLevelPreview level={c.levels[0]} settings={c.settings} /> : null;
      case 'spin':
        return <SpinWheelPreview segments={c.segments} settings={c.settings} size={260} />;
      case 'rush':
        return c.runs[0] ? <RushRunPreview run={c.runs[0]} settings={c.settings} /> : null;
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6 pb-16'}>
      {!embedded && (
      <div className="border-b border-[#E2E2E2] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex h-2.5 w-2.5 rounded-full ${isPublished ? 'bg-[#0E8345] animate-pulse' : 'bg-[#A0A0A0]'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isPublished ? 'text-[#0E8345]' : 'text-[#6B6B6B]'}`}>
              {isPublished ? `Live Active ${labels.pack}` : `${labels.pack} (Draft)`}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black">{config.title}</h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5 max-w-2xl">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPreview}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold hover:bg-[#262626] transition-all"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
          </button>
          <button
            onClick={onTogglePublish}
            className={`px-4 py-2.5 text-xs font-semibold border transition-all ${
              isPublished
                ? 'bg-white border-[#E2E2E2] text-black hover:border-black'
                : 'bg-[#0E8345] border-[#0E8345] text-white hover:bg-[#0b6b37]'
            }`}
          >
            {isPublished ? 'Unpublish' : 'Make Active'}
          </button>
        </div>
      </div>
      )}

      {!embedded && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Content</div>
          <div className="text-xl font-bold text-black font-mono mt-1">
            {items.length} {labels.items}
          </div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">{describeContent(config.content)}</div>
        </div>
        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Rotation Pool</div>
          <div className="text-xl font-bold text-black font-mono mt-1">{rotationCount}</div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">
            {config.inRotation ? 'This pack is in rotation' : 'This pack is not in rotation'}
          </div>
        </div>
        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Total Plays</div>
          <div className="text-xl font-bold text-black font-mono mt-1">{config.playsCount.toLocaleString()}</div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">Player sessions started</div>
        </div>
        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Winners</div>
          <div className="text-xl font-bold text-black font-mono mt-1">{config.winnersCount}</div>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">{winRate !== null ? `${winRate}% win rate` : 'No sessions yet'}</div>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Settings summary */}
        <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
          <div className="border-b border-[#E2E2E2] pb-3">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">Game Settings</h3>
            <p className="text-xs text-[#6B6B6B]">Hand-tuned. Edit them in the {labels.pack.toLowerCase()} editor.</p>
          </div>
          <dl className="space-y-2.5">
            {summarizeSettings(config.content).map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3 text-xs">
                <dt className="text-[#6B6B6B] shrink-0">{row.label}</dt>
                <dd className="text-black font-semibold text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="pt-3 border-t border-[#E2E2E2] flex flex-wrap gap-1.5">
            <Pill tone={config.generatedBy === 'groq' ? 'purple' : 'default'}>{config.generatedBy === 'groq' ? 'Groq AI' : 'Offline Designer'}</Pill>
            <Pill>v{config.version}</Pill>
            <Pill>{new Date(config.updatedAt).toLocaleDateString()}</Pill>
          </div>
        </div>

        {/* Preview */}
        <div className="xl:col-span-2 bg-white border border-[#E2E2E2] p-6 space-y-4">
          <div className="border-b border-[#E2E2E2] pb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                {config.kind === 'spin' ? 'Wheel Preview' : `First ${labels.item} Preview`}
              </h3>
              <p className="text-xs text-[#6B6B6B]">What players see for {game.name}.</p>
            </div>
            <button onClick={onOpenPreview} className="flex items-center gap-1.5 text-xs font-bold text-black hover:underline">
              <span>Open full preview</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex justify-center">{renderPreview()}</div>
        </div>
      </div>

      {/* Item inspection */}
      <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E2E2] pb-4 gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">{labels.items} Quick Inspection</h3>
            <p className="text-xs text-[#6B6B6B]">Open the editor to change, reorder or regenerate any {labels.item.toLowerCase()}.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onNavigateToSetup} className="flex items-center gap-1.5 text-xs font-semibold text-[#6B6B6B] hover:text-black">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Generate another</span>
            </button>
            <button onClick={onNavigateToManage} className="flex items-center gap-1.5 text-xs font-bold text-black hover:underline">
              <span>Open {labels.pack} Editor</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {items.slice(0, 8).map((item) => {
            const s = summarizeItem(config.content, item);
            return (
              <div
                key={item.id}
                className="p-3 border border-[#E2E2E2] hover:border-black transition-colors flex flex-wrap items-center gap-2 bg-white"
              >
                <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5">#{item.order}</span>
                <span className="text-base">{s.emoji}</span>
                <span className="text-xs font-semibold text-black">{s.title}</span>
                <DifficultyPill value={s.badge} />
                <div className="flex flex-wrap gap-1">
                  {s.chips.map((c) => (
                    <Pill key={c}>{c}</Pill>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 8 && (
          <div className="pt-2 text-center">
            <button
              onClick={onNavigateToManage}
              className="px-4 py-2 text-xs font-semibold bg-[#F6F6F6] hover:bg-[#EEEEEE] text-black border border-[#E2E2E2]"
            >
              View all {items.length} {labels.items.toLowerCase()} in the editor →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
