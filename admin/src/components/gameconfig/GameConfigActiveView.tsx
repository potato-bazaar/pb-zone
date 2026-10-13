import React from 'react';
import { ArrowRight, Eye, Gamepad2, Layers, ListChecks, Shuffle, SlidersHorizontal, Sparkles, Trophy } from 'lucide-react';
import { Game } from '../../types/quiz';
import { CONFIG_LABELS, GameConfig, getConfigItems } from '../../types/gameConfig';
import { summarizeItem, summarizeSettings, describeContent } from './configSummary';
import { CrushLevelPreview, RushRunPreview, SpinWheelPreview } from './GameConfigPreviews';
import { DifficultyPill, Pill } from './ui';
import { Button, IconTile, Panel, Pill as StatusPill, StatTile, panelClass } from '../ui/pb';

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
    <div className={embedded ? 'flex flex-col gap-4' : 'flex flex-col gap-4 pb-6'}>
      {!embedded && (
        <section className={`${panelClass} flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="min-w-0">
            <StatusPill tone={isPublished ? 'green' : 'gray'} dot>
              {isPublished ? `Live Active ${labels.pack}` : `${labels.pack} (Draft)`}
            </StatusPill>
            <h2 className="mt-2 text-lg font-bold leading-tight text-[#0B1220] sm:text-xl">{config.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-[#5F6F83]">{config.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onOpenPreview}>
              <Eye className="h-4 w-4" />
              <span>Preview</span>
            </Button>
            <Button variant={isPublished ? 'outline' : 'dark'} onClick={onTogglePublish}>
              {isPublished ? 'Unpublish' : 'Make Active'}
            </Button>
          </div>
        </section>
      )}

      {!embedded && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={Layers}
            label="Content"
            value={`${items.length} ${labels.items}`}
            note={describeContent(config.content)}
          />
          <StatTile
            icon={Shuffle}
            tone="purple"
            label="Rotation pool"
            value={rotationCount}
            note={config.inRotation ? 'This pack is in rotation' : 'This pack is not in rotation'}
          />
          <StatTile
            icon={Gamepad2}
            tone="blue"
            label="Total plays"
            value={config.playsCount.toLocaleString()}
            note="Player sessions started"
          />
          <StatTile
            icon={Trophy}
            tone="orange"
            label="Winners"
            value={config.winnersCount}
            note={winRate !== null ? `${winRate}% win rate` : 'No sessions yet'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          icon={SlidersHorizontal}
          title="Game settings"
          description={`Hand-tuned. Edit them in the ${labels.pack.toLowerCase()} editor.`}
          className="flex flex-col"
        >
          <dl className="divide-y divide-[#EEF2F6]">
            {summarizeSettings(config.content).map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3 py-2.5 text-sm first:pt-0">
                <dt className="shrink-0 text-[#64748B]">{row.label}</dt>
                <dd className="text-right font-semibold text-[#0F172A]">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[#EEF2F6] pt-3">
            <Pill tone={config.generatedBy === 'groq' ? 'purple' : 'default'}>
              {config.generatedBy === 'groq' ? 'Groq AI' : 'Offline Designer'}
            </Pill>
            <Pill>v{config.version}</Pill>
            <Pill>{new Date(config.updatedAt).toLocaleDateString()}</Pill>
          </div>
        </Panel>

        <Panel
          icon={Eye}
          tone="blue"
          title={config.kind === 'spin' ? 'Wheel preview' : `First ${labels.item.toLowerCase()} preview`}
          description={`What players see for ${game.name}.`}
          actions={
            <Button variant="secondary" size="sm" onClick={onOpenPreview}>
              <span>Open full preview</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
          className="xl:col-span-2"
        >
          {/* Rush tracks scroll themselves; boards and wheels centre and scroll when wider than the card.
              Top padding keeps the wheel pointer (drawn above the wheel) inside the scroll box. */}
          {config.kind === 'rush' ? (
            <div className="min-w-0">{renderPreview()}</div>
          ) : (
            <div className="overflow-x-auto pt-3">
              <div className="mx-auto w-fit">{renderPreview()}</div>
            </div>
          )}
        </Panel>
      </div>

      {/* Same look as Panel's header, but the two actions stack under the title until md so the title never gets squeezed. */}
      <section className={`${panelClass} p-4 sm:p-5`}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <IconTile icon={ListChecks} tone="orange" />
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight text-[#0B1220] sm:text-lg">{labels.items} quick inspection</h2>
              <p className="mt-0.5 text-sm text-[#5F6F83]">
                Open the editor to change, reorder or regenerate any {labels.item.toLowerCase()}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onNavigateToSetup}>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Generate another</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={onNavigateToManage}>
              <span>Open {labels.pack} Editor</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {items.slice(0, 8).map((item) => {
            const s = summarizeItem(config.content, item);
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E6ECE8] bg-white px-3 py-2.5 transition-colors hover:border-[#86D19A] hover:bg-[#F8FBF9]"
              >
                <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-lg bg-[#E3F8E8] px-1.5 text-xs font-bold tabular-nums text-[#14532D]">
                  #{item.order}
                </span>
                <span className="text-base leading-none">{s.emoji}</span>
                <span className="text-sm font-semibold text-[#0F172A]">{s.title}</span>
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
          <div className="pt-4 text-center">
            <Button variant="outline" size="sm" onClick={onNavigateToManage}>
              <span>
                View all {items.length} {labels.items.toLowerCase()} in the editor
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};
