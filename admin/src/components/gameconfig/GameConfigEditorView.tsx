import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Eye, Plus, Save, Sparkles, Trash2, Undo2 } from 'lucide-react';
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
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <CrushLevelEditor level={level} settings={content.settings} onChange={(l) => updateItem(index, l)} />
            </div>
            <div className="lg:col-span-2">
              <span className={labelCls}>Board preview</span>
              <CrushLevelPreview level={level} settings={content.settings} />
            </div>
          </div>
        );
      }
      case 'spin': {
        const seg = content.segments[index];
        const total = content.segments.reduce((s, x) => s + Math.max(0, x.weight), 0);
        return (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <SpinSegmentEditor segment={seg} totalWeight={total} onChange={(s) => updateItem(index, s)} />
            </div>
            <div className="lg:col-span-2">
              <span className={labelCls}>Wheel preview</span>
              <SpinWheelPreview segments={content.segments} settings={content.settings} interactive={false} size={220} />
            </div>
          </div>
        );
      }
      case 'rush': {
        const run = content.runs[index];
        return (
          <div className="space-y-4">
            <RushRunEditor run={run} settings={content.settings} onChange={(r) => updateItem(index, r)} />
            <div>
              <span className={labelCls}>Track preview</span>
              <RushRunPreview run={run} settings={content.settings} />
            </div>
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
          <span className="font-bold text-sm text-black">{s.title}</span>
          <DifficultyPill value={s.badge} />
          {s.chips.map((c) => (
            <Pill key={c}>{c}</Pill>
          ))}
        </div>
        {content.kind === 'crush' && <CrushLevelPreview level={candidate as CrushLevel} settings={content.settings} />}
        {content.kind === 'spin' && <p className="text-xs text-[#333333]">{(candidate as WheelSegment).description}</p>}
        {content.kind === 'rush' && <RushRunPreview run={candidate as RushRun} settings={content.settings} compact />}
        <p className="text-[11px] text-[#6B6B6B] italic">
          {'designerNote' in candidate ? candidate.designerNote : (candidate as WheelSegment).prizeValue}
        </p>
      </div>
    );
  };

  const regenItem = regenIndex !== null ? items[regenIndex] : null;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="border-b border-[#E2E2E2] pb-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 space-y-2 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone="dark">
              {labels.emoji} {labels.pack}
            </Pill>
            <Pill tone={config.status === 'published' ? 'green' : 'default'}>{config.status}</Pill>
            <Pill tone={draft.generatedBy === 'groq' ? 'purple' : 'default'}>
              {draft.generatedBy === 'groq' ? 'Groq AI' : 'Offline Designer'}
            </Pill>
            <span className="text-[10px] font-mono text-[#6B6B6B]">
              v{draft.version} · {draft.id}
            </span>
          </div>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full text-2xl font-bold tracking-tight text-black bg-transparent border-b border-transparent hover:border-[#E2E2E2] focus:border-black focus:outline-none"
          />
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="w-full text-xs text-[#545454] bg-transparent border border-transparent hover:border-[#E2E2E2] focus:border-black focus:outline-none p-1 -ml-1 resize-none"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <OutlineButton onClick={onOpenPreview}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </OutlineButton>
          <GhostButton onClick={onNavigateToSetup}>
            <Sparkles className="h-3.5 w-3.5" /> Generate another
          </GhostButton>
          <GhostButton onClick={handleDiscard} disabled={!isDirty}>
            <Undo2 className="h-3.5 w-3.5" /> Discard
          </GhostButton>
          <PrimaryButton onClick={handleSave} disabled={!isDirty}>
            <Save className="h-3.5 w-3.5" /> Save Changes
          </PrimaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Hand-edited settings */}
          <Card
            title="Game Settings"
            subtitle="Set by hand. The AI never changes these, it only designs content that respects them."
            right={
              <button onClick={() => setShowSettings((v) => !v)} className="text-xs font-semibold text-[#6B6B6B] hover:text-black">
                {showSettings ? 'Collapse' : 'Expand'}
              </button>
            }
          >
            {showSettings ? renderSettingsForm() : <p className="text-xs text-[#6B6B6B]">Settings collapsed.</p>}
          </Card>

          {/* Items */}
          <Card
            title={`${labels.items} (${items.length})`}
            subtitle={`Expand a row to edit it. Regenerate asks ${groqOn ? 'Groq' : 'the offline designer'} for a replacement that keeps the same slot.`}
            right={
              <PrimaryButton onClick={addItem}>
                <Plus className="h-3.5 w-3.5" /> Add {labels.item}
              </PrimaryButton>
            }
          >
            <div className="space-y-2">
              {items.map((item, index) => {
                const s = summarizeItem(draft.content, item);
                const open = expandedId === item.id;
                return (
                  <div key={item.id} className={`border bg-white transition-colors ${open ? 'border-black' : 'border-[#E2E2E2] hover:border-black'}`}>
                    <div className="flex flex-wrap items-center gap-2 p-3">
                      <span className="flex h-6 w-6 items-center justify-center bg-black text-white font-mono font-bold text-xs shrink-0">
                        #{item.order}
                      </span>
                      <span className="text-base">{s.emoji}</span>
                      <button
                        onClick={() => setExpandedId(open ? null : item.id)}
                        className="font-bold text-xs text-black hover:underline text-left"
                      >
                        {s.title}
                      </button>
                      <DifficultyPill value={s.badge} />
                      <div className="flex flex-wrap gap-1">
                        {s.chips.slice(0, 5).map((c) => (
                          <Pill key={c}>{c}</Pill>
                        ))}
                      </div>
                      <div className="ml-auto flex items-center gap-0.5 shrink-0">
                        <IconButton onClick={() => moveItem(index, -1)} disabled={index === 0} title="Move up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} title="Move down">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </IconButton>
                        <div className="h-4 w-px bg-[#E2E2E2] mx-1" />
                        <button
                          onClick={() => setRegenIndex(index)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border border-black hover:bg-black hover:text-white transition-all text-black"
                          title={`Regenerate ${labels.item.toLowerCase()} #${item.order}`}
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Regenerate</span>
                        </button>
                        <IconButton onClick={() => duplicateItem(index)} title="Duplicate">
                          <Copy className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton onClick={() => removeItem(index)} disabled={items.length <= 1} title="Delete" danger>
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton onClick={() => setExpandedId(open ? null : item.id)} title={open ? 'Collapse' : 'Edit'}>
                          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </IconButton>
                      </div>
                    </div>
                    {open && <div className="border-t border-[#E2E2E2] p-4 bg-[#FAFAFA]">{renderItemEditor(index)}</div>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* JSON */}
        <div className="space-y-4 xl:sticky xl:top-20 self-start">
          <Card
            title="JSON Payload"
            subtitle="Live view of the draft. Copy or download for the game client."
            right={
              <button onClick={() => setShowJson((v) => !v)} className="text-xs font-semibold text-[#6B6B6B] hover:text-black">
                {showJson ? 'Hide' : 'Show'}
              </button>
            }
          >
            {showJson ? <GameConfigJsonPanel config={draft} /> : <p className="text-xs text-[#6B6B6B]">JSON hidden.</p>}
          </Card>
        </div>
      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black text-white px-4 py-2.5 text-xs font-semibold shadow-xl flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#F5B301]" />
          <span>Unsaved changes</span>
          <button onClick={handleSave} className="underline font-bold">
            Save now
          </button>
          <button onClick={handleDiscard} className="text-white/70 hover:text-white">
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
              <span className="font-bold text-xs text-black">{summarizeItem(draft.content, regenItem).title}</span>
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
