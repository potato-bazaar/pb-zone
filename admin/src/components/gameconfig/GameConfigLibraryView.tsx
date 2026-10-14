import React, { useState } from 'react';
import { Check, Library, Plus, Search, Shuffle, Trash2 } from 'lucide-react';
import { CONFIG_LABELS, ConfigKind, GameConfig, getItemCount } from '../../types/gameConfig';
import { describeContent } from './configSummary';
import { IconButton, Pill } from './ui';
import { Button, EmptyState, IconTile, Pill as StatusPill, Tabs, inputClass, panelClass, tableClass } from '../ui/pb';

interface GameConfigLibraryViewProps {
  configs: GameConfig[];
  activeConfigId: string;
  kind: ConfigKind;
  onSelectActive: (id: string) => void;
  onToggleRotation: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigateToSetup: () => void;
  onNavigateToManage: (id: string) => void;
}

export const GameConfigLibraryView: React.FC<GameConfigLibraryViewProps> = ({
  configs,
  activeConfigId,
  kind,
  onSelectActive,
  onToggleRotation,
  onDelete,
  onNavigateToSetup,
  onNavigateToManage,
}) => {
  const labels = CONFIG_LABELS[kind];
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'rotation' | 'draft'>('all');

  const q = search.toLowerCase();
  const filtered = configs.filter((c) => {
    const matches =
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)) ||
      (c.poolGroup || '').toLowerCase().includes(q);
    if (filterMode === 'rotation') return matches && c.inRotation;
    if (filterMode === 'draft') return matches && c.status === 'draft';
    return matches;
  });
  const rotationCount = configs.filter((c) => c.inRotation).length;

  const renderTitle = (c: GameConfig, isCurrent: boolean) => (
    <div className="min-w-0 space-y-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold text-[#0F172A]">{c.title}</span>
        {isCurrent && (
          <StatusPill tone="green" dot>
            Current Active
          </StatusPill>
        )}
        {c.status !== 'published' && <Pill className="capitalize">{c.status}</Pill>}
      </div>
      <p className="text-xs text-[#64748B]">
        {describeContent(c.content)}
        {c.poolGroup ? ` · ${c.poolGroup}` : ''}
      </p>
    </div>
  );

  const renderEngine = (c: GameConfig) => (
    <Pill tone={c.generatedBy === 'groq' ? 'purple' : 'default'}>{c.generatedBy === 'groq' ? 'Groq AI' : 'Offline'}</Pill>
  );

  const renderRotation = (c: GameConfig) => (
    <Button variant={c.inRotation ? 'secondary' : 'outline'} size="sm" onClick={() => onToggleRotation(c.id)}>
      {c.inRotation ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      <span>{c.inRotation ? 'In Rotation' : 'Add to Rotation'}</span>
    </Button>
  );

  const renderActions = (c: GameConfig, isCurrent: boolean) => (
    <div className="flex items-center justify-end gap-1.5">
      {!isCurrent && (
        <Button variant="outline" size="sm" onClick={() => onSelectActive(c.id)}>
          Set Active
        </Button>
      )}
      <Button size="sm" onClick={() => onNavigateToManage(c.id)}>
        Edit
      </Button>
      <IconButton danger onClick={() => onDelete(c.id)} title={`Delete ${labels.pack.toLowerCase()}`}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-6">
      <section className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <IconTile icon={Library} />
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight text-[#0B1220] sm:text-lg">{labels.pack} Library</h2>
              <p className="mt-0.5 text-sm text-[#5F6F83]">
                Every generated {labels.pack.toLowerCase()} for this game and the player rotation pool ({configs.length} total).
              </p>
            </div>
          </div>
          <Button onClick={onNavigateToSetup} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span>Generate More</span>
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#F6F9F7] p-3 sm:p-4">
          <IconTile icon={Shuffle} size="sm" />
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#0F172A]">Player rotation pool</span>
              <StatusPill tone="green" dot>
                {rotationCount} in rotation
              </StatusPill>
            </div>
            <p className="text-[13px] leading-snug text-[#64748B]">
              Players are served a random {labels.pack.toLowerCase()} from the rotation pool so they do not all see the same content.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, theme, batch group..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-[#64748B]">Filter:</span>
            <Tabs
              items={(['all', 'rotation', 'draft'] as const).map((mode) => ({
                id: mode,
                label: mode === 'all' ? `All (${configs.length})` : mode === 'rotation' ? `In Rotation (${rotationCount})` : 'Drafts',
              }))}
              value={filterMode}
              onChange={setFilterMode}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Search} tone="gray" title={`No ${labels.packs.toLowerCase()} found.`} className="py-10" />
        ) : (
          <>
            {/* Table from xl, cards below */}
            <div className={`${tableClass.wrap} mt-4 hidden xl:block`}>
              <table className={tableClass.table}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>{labels.pack}</th>
                    <th className={tableClass.th}>{labels.items}</th>
                    <th className={tableClass.th}>Engine</th>
                    <th className={tableClass.th}>Plays</th>
                    <th className={tableClass.th}>Rotation</th>
                    <th className={`${tableClass.th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const isCurrent = c.id === activeConfigId;
                    return (
                      <tr key={c.id} className={`${tableClass.tr} ${isCurrent ? 'bg-[#F3FBF5]' : ''}`}>
                        <td className={tableClass.td}>{renderTitle(c, isCurrent)}</td>
                        <td className={`${tableClass.td} font-semibold tabular-nums`}>{getItemCount(c)}</td>
                        <td className={tableClass.td}>{renderEngine(c)}</td>
                        <td className={`${tableClass.td} tabular-nums text-[#475569]`}>{c.playsCount}</td>
                        <td className={tableClass.td}>{renderRotation(c)}</td>
                        <td className={tableClass.td}>{renderActions(c, isCurrent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
              {filtered.map((c) => {
                const isCurrent = c.id === activeConfigId;
                return (
                  <li
                    key={c.id}
                    className={`flex flex-col gap-3 rounded-xl border p-3.5 ${
                      isCurrent ? 'border-[#16A34A] bg-[#F3FBF5] ring-2 ring-[#16A34A]/15' : 'border-[#E6ECE8] bg-white'
                    }`}
                  >
                    {renderTitle(c, isCurrent)}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#64748B]">
                      <span>
                        <span className="font-semibold tabular-nums text-[#0F172A]">{getItemCount(c)}</span> {labels.items.toLowerCase()}
                      </span>
                      <span>
                        <span className="font-semibold tabular-nums text-[#0F172A]">{c.playsCount}</span> plays
                      </span>
                      {renderEngine(c)}
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F6] pt-3">
                      {renderRotation(c)}
                      {renderActions(c, isCurrent)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};
