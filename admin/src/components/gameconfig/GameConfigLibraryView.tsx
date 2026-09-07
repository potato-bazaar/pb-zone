import React, { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { CONFIG_LABELS, ConfigKind, GameConfig, getItemCount } from '../../types/gameConfig';
import { describeContent } from './configSummary';
import { Pill } from './ui';

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

  return (
    <div className="space-y-6 pb-16">
      <div className="border-b border-[#E2E2E2] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">{labels.pack} Library</h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Every generated {labels.pack.toLowerCase()} for this game and the player rotation pool ({configs.length} total).
          </p>
        </div>
        <button
          onClick={onNavigateToSetup}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold hover:bg-[#262626] transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Generate More</span>
        </button>
      </div>

      <div className="p-4 bg-white border border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-black">Player Rotation Pool</span>
            <span className="bg-[#0E8345] text-white font-mono text-[10px] font-bold px-2 py-0.5">
              {rotationCount} in rotation
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B]">
            Players are served a random {labels.pack.toLowerCase()} from the rotation pool so they do not all see the same content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B6B6B]">Filter:</span>
          <div className="flex border border-[#E2E2E2]">
            {(['all', 'rotation', 'draft'] as const).map((mode, i) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold ${i > 0 ? 'border-l border-[#E2E2E2]' : ''} ${
                  filterMode === mode ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F6F6F6]'
                }`}
              >
                {mode === 'all' ? `All (${configs.length})` : mode === 'rotation' ? `In Rotation (${rotationCount})` : 'Drafts'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B6B]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, theme, batch group..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E2E2] text-xs text-black placeholder-[#6B6B6B] focus:border-black focus:outline-none"
        />
      </div>

      <div className="bg-white border border-[#E2E2E2] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F6F6F6] text-[#6B6B6B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E2E2]">
            <tr>
              <th className="py-3 px-4">{labels.pack}</th>
              <th className="py-3 px-4">{labels.items}</th>
              <th className="py-3 px-4">Engine</th>
              <th className="py-3 px-4">Plays</th>
              <th className="py-3 px-4">Rotation</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E2E2]">
            {filtered.map((c) => {
              const isCurrent = c.id === activeConfigId;
              return (
                <tr key={c.id} className={`hover:bg-[#FAFAFA] transition-colors ${isCurrent ? 'bg-[#F9F9F9]' : ''}`}>
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-black text-xs">{c.title}</span>
                        {isCurrent && <span className="bg-black text-white text-[9px] font-bold px-1.5 py-0.5 uppercase">Current Active</span>}
                        {c.status !== 'published' && <Pill>{c.status}</Pill>}
                      </div>
                      <p className="text-[11px] text-[#6B6B6B]">
                        {describeContent(c.content)}
                        {c.poolGroup ? ` · ${c.poolGroup}` : ''}
                      </p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-black">{getItemCount(c)}</td>
                  <td className="py-3.5 px-4">
                    <Pill tone={c.generatedBy === 'groq' ? 'purple' : 'default'}>{c.generatedBy === 'groq' ? 'Groq AI' : 'Offline'}</Pill>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#545454]">{c.playsCount}</td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onToggleRotation(c.id)}
                      className={`px-2.5 py-1 text-[10px] font-bold border uppercase transition-colors ${
                        c.inRotation
                          ? 'bg-[#EBF7EE] border-[#0E8345] text-[#0E8345]'
                          : 'bg-white border-[#E2E2E2] text-[#6B6B6B] hover:border-black'
                      }`}
                    >
                      {c.inRotation ? '✓ In Rotation' : '+ Add to Rotation'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isCurrent && (
                        <button
                          onClick={() => onSelectActive(c.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#E2E2E2] hover:border-black text-black transition-colors"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={() => onNavigateToManage(c.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-black text-white hover:bg-[#262626] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="p-1 text-[#6B6B6B] hover:text-[#C62828] transition-colors"
                        title={`Delete ${labels.pack.toLowerCase()}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[#6B6B6B]">
                  No {labels.packs.toLowerCase()} found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
