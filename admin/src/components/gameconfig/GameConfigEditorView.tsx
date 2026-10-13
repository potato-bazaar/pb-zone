import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Save, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { Game } from '../../types/quiz';
import {
  CONFIG_LABELS,
  ConfigItem,
  CrushLevel,
  GameConfig,
  GameConfigSettings,
  RushRun,
  WheelSegment,
  getConfigItems,
  withConfigItems,
  withConfigSettings,
} from '../../types/gameConfig';
import { aiGameConfigService } from '../../services/aiGameConfigService';
import { hasGroqKey } from '../../services/groqClient';
import { newId } from '../../services/gameConfigSynth';
import { CrushLevelEditor, CrushSettingsForm } from './CrushEditors';
import { SpinSegmentEditor, SpinSettingsForm } from './SpinEditors';
import { RushRunEditor, RushSettingsForm } from './RushEditors';
import { CrushLevelPreview, RushRunPreview, SpinWheelPreview } from './GameConfigPreviews';
import { ItemRegenModal } from './ItemRegenModal';
import { GameConfigJsonPanel } from './GameConfigJsonPanel';
import { summarizeItem } from './configSummary';
import { Card, DifficultyPill, GhostButton, IconButton, OutlineButton, Pill, PrimaryButton, labelCls } from './ui';
import { Button, buttonClass, panelClass } from '../ui/pb';
import { cn } from '../../lib/utils';

interface GameConfigEditorViewProps {
  config: GameConfig;
  game: Game;
  onSave: (updated: GameConfig) => void;
  onNavigateToSetup: () => void;
  onOpenPreview: () => void;
}

function renameCopy(item: ConfigItem): ConfigItem {
  if ('gridRows' in item) return { ...item, id: newId('lvl'), name: `${item.name} (Copy)` };
  if ('distanceMeters' in item) return { ...item, id: newId('run'), name: `${item.name} (Copy)` };
  return { ...item, id: newId('seg'), label: `${item.label} (Copy)`.slice(0, 18) };
}

const QUICK_PROMPTS: Record<GameConfig['kind'], string[]> = {
  crush: ['Make it harder with more blockers', 'Fewer moves, tighter puzzle', 'Focus on collecting fries', 'Relaxed level with generous moves'],
  spin: ['Make it a bigger prize', 'Turn it into a small consolation prize', 'Fries-themed voucher', 'Rare but exciting'],
  rush: ['More obstacles, faster pace', 'Add more power-ups', 'Longer run with a coin trail', 'Beginner-friendly warm-up'],
};

/* Inline-editable title/description: reads as text until hovered or focused. */
const editableCls =
  '-mx-2 block w-[calc(100%+1rem)] rounded-xl border border-transparent bg-transparent px-2 py-1 transition-colors hover:border-[#E2E8E4] focus:border-[#86D19A] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#16A34A]/10';
const collapsedCls = 'rounded-xl bg-[#F6F9F7] px-4 py-3 text-sm text-[#64748B]';

/* Framed from sm up; on phones the previews (which carry their own frames) get the full width. */
const PreviewFrame: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0 sm:rounded-xl sm:border sm:border-[#E6ECE8] sm:bg-white sm:p-4">
    <span className={labelCls}>{label}</span>
    {children}
  </div>
);

export const GameConfigEditorView: React.FC<GameConfigEditorViewProps> = ({
  config,
  game,
  onSave,
  onNavigateToSetup,
  onOpenPreview,
}) => {
  const [draft, setDraft] = useState<GameConfig>(config);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [showJson, setShowJson] = useState(true);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);

  // Reset the draft when a different config (or a freshly saved version) arrives.
  useEffect(() => {
    setDraft(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.id, config.updatedAt]);

  const isDirty = useMemo(
    () =>
      JSON.stringify(draft.content) !== JSON.stringify(config.content) ||
      draft.title !== config.title ||
      draft.description !== config.description,
    [draft, config]
  );

  const labels = CONFIG_LABELS[draft.kind];
  const items = getConfigItems(draft);
  const theme = draft.tags[2] || game.name;
  const groqOn = hasGroqKey();

  const setItems = (next: ConfigItem[]) => setDraft((d) => ({ ...d, content: withConfigItems(d.content, next) }));
  const setSettings = (s: GameConfigSettings) => setDraft((d) => ({ ...d, content: withConfigSettings(d.content, s) }));
  const updateItem = (index: number, next: ConfigItem) => setItems(items.map((it, i) => (i === index ? next : it)));

  const moveItem = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };
  const duplicateItem = (index: number) => {
    const copy = renameCopy(items[index]);
    const next = [...items];
    next.splice(index + 1, 0, copy);
    setItems(next);
    setExpandedId(copy.id);
  };
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };
  const addItem = () => {
    const item = aiGameConfigService.createItem(draft.content, theme);
    setItems([...items, item]);
    setExpandedId(item.id);
  };

  const handleSave = () =>
    onSave({
      ...draft,
      // These are managed outside the editor (library / navbar); never overwrite them from a stale draft.
      inRotation: config.inRotation,
      status: config.status,
      playsCount: config.playsCount,
      winnersCount: config.winnersCount,
    });
  const handleDiscard = () => setDraft(config);

  const renderSettingsForm = () => {
    switch (draft.content.kind) {
      case 'crush':
        return <CrushSettingsForm settings={draft.content.settings} onChange={setSettings} />;
      case 'spin':
        return <SpinSettingsForm settings={draft.content.settings} onChange={setSettings} />;
      case 'rush':
        return <RushSettingsForm settings={draft.content.settings} onChange={setSettings} />;
    }
  };

  const renderItemEditor = (index: number) => {
    const content = draft.content;
    switch (content.kind) {
      case 'crush': {
        const level = content.levels[index];
        return (
          <div className="space-y-5">
            <CrushLevelEditor level={level} settings={content.settings} onChange={(l) => updateItem(index, l)} />
            <PreviewFrame label="Board preview">
              <div className="overflow-x-auto">
                <CrushLevelPreview level={level} settings={content.settings} />
              </div>
            </PreviewFrame>
          </div>
        );
      }
      case 'spin': {
        const seg = content.segments[index];
        const total = content.segments.reduce((s, x) => s + Math.max(0, x.weight), 0);
        return (
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-start">
            <div className="min-w-0">
              <SpinSegmentEditor segment={seg} totalWeight={total} onChange={(s) => updateItem(index, s)} />
            </div>
            <PreviewFrame label="Wheel preview">
              <div className="pt-1">
                <SpinWheelPreview segments={content.segments} settings={content.settings} interactive={false} size={220} />
              </div>
            </PreviewFrame>
          </div>
        );
      }
      case 'rush': {
        const run = content.runs[index];
        return (
          <div className="space-y-5">
            <RushRunEditor run={run} settings={content.settings} onChange={(r) => updateItem(index, r)} />
            <PreviewFrame label="Track preview">
              <RushRunPreview run={run} settings={content.settings} />
            </PreviewFrame>
          </div>
        );
      }
    }
  };

  const renderCandidate = (candidate: ConfigItem) => {
    const s = summarizeItem(draft.content, candidate);
    const content = draft.content;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base">{s.emoji}</span>
          <span className="text-sm font-semibold text-[#0F172A]">{s.title}</span>
          <DifficultyPill value={s.badge} />
          {s.chips.map((c) => (
            <Pill key={c}>{c}</Pill>
          ))}
        </div>
        {content.kind === 'crush' && (
          <div className="overflow-x-auto">
            <CrushLevelPreview level={candidate as CrushLevel} settings={content.settings} />
          </div>
        )}
        {content.kind === 'spin' && <p className="text-sm text-[#334155]">{(candidate as WheelSegment).description}</p>}
        {content.kind === 'rush' && <RushRunPreview run={candidate as RushRun} settings={content.settings} compact />}
        <p className="text-xs italic text-[#64748B]">
          {'designerNote' in candidate ? candidate.designerNote : (candidate as WheelSegment).prizeValue}
        </p>
      </div>
    );
  };

  const regenItem = regenIndex !== null ? items[regenIndex] : null;

  return (
    <div className="flex flex-col gap-4 pb-24 sm:gap-5">
      {/* Header */}
      <section className={cn(panelClass, 'flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-start xl:justify-between')}>
        <div className="min-w-0 max-w-3xl flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="dark">
              {labels.emoji} {labels.pack}
            </Pill>
            <Pill tone={config.status === 'published' ? 'green' : 'default'} className="capitalize">
              <span className={`h-1.5 w-1.5 rounded-full ${config.status === 'published' ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'}`} />
              {config.status}
            </Pill>
            <Pill tone={draft.generatedBy === 'groq' ? 'purple' : 'default'}>
              {draft.generatedBy === 'groq' ? 'Groq AI' : 'Offline Designer'}
            </Pill>
            <span className="font-mono text-[11px] text-[#64748B]">
              v{draft.version} · {draft.id}
            </span>
          </div>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className={cn(editableCls, 'text-lg font-bold tracking-[-0.01em] text-[#0B1220] sm:text-xl')}
          />
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className={cn(editableCls, 'resize-none text-sm leading-relaxed text-[#5F6F83]')}
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <OutlineButton onClick={onOpenPreview}>
            <Eye className="h-4 w-4" /> Preview
          </OutlineButton>
          <GhostButton onClick={onNavigateToSetup}>
            <Sparkles className="h-4 w-4" /> Generate another
          </GhostButton>
          <GhostButton onClick={handleDiscard} disabled={!isDirty}>
            <Undo2 className="h-4 w-4" /> Discard
          </GhostButton>
          <PrimaryButton onClick={handleSave} disabled={!isDirty}>
            <Save className="h-4 w-4" /> Save Changes
          </PrimaryButton>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5 xl:col-span-2">
          {/* Hand-edited settings */}
          <Card
            title="Game Settings"
            subtitle="Set by hand. The AI never changes these, it only designs content that respects them."
            right={
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                aria-expanded={showSettings}
                className={buttonClass('ghost', 'sm')}
              >
                {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showSettings ? 'Collapse' : 'Expand'}
              </button>
            }
          >
            {showSettings ? renderSettingsForm() : <p className={collapsedCls}>Settings collapsed.</p>}
          </Card>

          {/* Items */}
          <Card
            title={`${labels.items} (${items.length})`}
            subtitle={`Expand a row to edit it. Regenerate asks ${groqOn ? 'Groq' : 'the offline designer'} for a replacement that keeps the same slot.`}
            right={
              <Button variant="secondary" onClick={addItem}>
                <Plus className="h-4 w-4" /> Add {labels.item}
              </Button>
            }
          >
            <div className="flex flex-col gap-2.5">
              {items.map((item, index) => {
                const s = summarizeItem(draft.content, item);
                const open = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`overflow-hidden rounded-xl border bg-white transition-[border-color,box-shadow] ${
                      open ? 'border-[#86D19A] ring-4 ring-[#16A34A]/10' : 'border-[#E6ECE8] hover:border-[#CFE6D6]'
                    }`}
                  >
                    <div className={`flex flex-col gap-3 p-3 md:flex-row md:items-center ${open ? 'bg-[#F0FAF2]' : ''}`}>
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 font-mono text-xs font-bold ${
                            open ? 'bg-[#16A34A] text-white' : 'bg-[#E3F7E7] text-[#14532D]'
                          }`}
                        >
                          #{item.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-base leading-none">{s.emoji}</span>
                            <button
                              type="button"
                              onClick={() => setExpandedId(open ? null : item.id)}
                              className="min-w-0 text-left text-sm font-semibold text-[#0F172A] transition-colors hover:text-[#15803D]"
                            >
                              {s.title}
                            </button>
                            <DifficultyPill value={s.badge} />
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.chips.slice(0, 5).map((c) => (
                              <Pill key={c}>{c}</Pill>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-end gap-0.5">
                        <IconButton onClick={() => moveItem(index, -1)} disabled={index === 0} title="Move up">
                          <ArrowUp className="h-4 w-4" />
                        </IconButton>
                        <IconButton onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} title="Move down">
                          <ArrowDown className="h-4 w-4" />
                        </IconButton>
                        <div className="mx-1 h-5 w-px bg-[#E2E8E4]" />
                        <button
                          type="button"
                          onClick={() => setRegenIndex(index)}
                          className={buttonClass('secondary', 'xs', 'mx-0.5')}
                          title={`Regenerate ${labels.item.toLowerCase()} #${item.order}`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Regenerate</span>
                        </button>
                        <IconButton onClick={() => duplicateItem(index)} title="Duplicate">
                          <Copy className="h-4 w-4" />
                        </IconButton>
                        <IconButton onClick={() => removeItem(index)} disabled={items.length <= 1} title="Delete" danger>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                        <IconButton onClick={() => setExpandedId(open ? null : item.id)} title={open ? 'Collapse' : 'Edit'}>
                          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </IconButton>
                      </div>
                    </div>
                    {open && <div className="border-t border-[#DCEFE1] p-3 sm:p-4">{renderItemEditor(index)}</div>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* JSON */}
        <div className="min-w-0 space-y-4 self-start xl:sticky xl:top-20">
          <Card
            title="JSON Payload"
            subtitle="Live view of the draft. Copy or download for the game client."
            right={
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                aria-expanded={showJson}
                className={buttonClass('ghost', 'sm')}
              >
                {showJson ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showJson ? 'Hide' : 'Show'}
              </button>
            }
          >
            {showJson ? <GameConfigJsonPanel config={draft} /> : <p className={collapsedCls}>JSON hidden.</p>}
          </Card>
        </div>
      </div>

      {isDirty && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-xl bg-[#14532D] py-2 pl-4 pr-2 text-sm font-medium text-white shadow-xl sm:bottom-6">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#F5B301]" />
          <span>Unsaved changes</span>
          <button
            type="button"
            onClick={handleSave}
            className="h-8 rounded-lg bg-white px-3 text-xs font-semibold text-[#14532D] transition-colors hover:bg-[#E3F7E7]"
          >
            Save now
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className="h-8 rounded-lg px-2.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Discard
          </button>
        </div>
      )}

      {regenIndex !== null && regenItem && (
        <ItemRegenModal<ConfigItem>
          isOpen
          title={`Regenerate ${labels.item} #${regenIndex + 1}`}
          subtitle={
            groqOn
              ? 'Groq designs a replacement for this slot: same difficulty tier, fresh content.'
              : 'No Groq key set. The offline designer will produce the replacement.'
          }
          currentSummary={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#0F172A]">{summarizeItem(draft.content, regenItem).title}</span>
              {summarizeItem(draft.content, regenItem).chips.map((c) => (
                <Pill key={c}>{c}</Pill>
              ))}
            </div>
          }
          quickPrompts={QUICK_PROMPTS[draft.kind]}
          onGenerate={(instruction) => aiGameConfigService.regenerateItem(draft.content, regenIndex, theme, instruction)}
          renderCandidate={renderCandidate}
          onApply={(candidate) => {
            updateItem(regenIndex, { ...candidate, id: regenItem.id, order: regenIndex + 1 } as ConfigItem);
            setExpandedId(regenItem.id);
            setRegenIndex(null);
          }}
          onClose={() => setRegenIndex(null)}
        />
      )}
    </div>
  );
};
