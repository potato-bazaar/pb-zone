import React from 'react';
import { Game } from '../../types/quiz';
import { Settings, ChevronDown, Play, Cpu } from 'lucide-react';

interface NavbarProps {
  activeGame: Game | null;
  /** "Quiz", "Level Pack", "Prize Wheel", "Run Pack" */
  switcherLabel: string;
  switcherItems: { id: string; title: string; status: string }[];
  activeItemId: string;
  onSelectItem: (id: string) => void;
  onOpenGameSelector: () => void;
  onOpenSimulator: () => void;
  onOpenSettings: () => void;
  onTogglePublish: () => void;
  isPublished: boolean;
  showPublish: boolean;
  activeRotationCount: number;
  simulatorLabel: string;
  aiEngineLabel: string;
  aiEngineOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeGame,
  switcherLabel,
  switcherItems,
  activeItemId,
  onSelectItem,
  onOpenGameSelector,
  onOpenSimulator,
  onOpenSettings,
  onTogglePublish,
  isPublished,
  showPublish,
  activeRotationCount,
  simulatorLabel,
  aiEngineLabel,
  aiEngineOnline,
}) => {
  const activeItem = switcherItems.find((i) => i.id === activeItemId) || null;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#E2E2E2] bg-[#FFFFFF]">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand & game selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-black text-white flex items-center justify-center font-black text-sm tracking-tighter">
              PB
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-base tracking-tight text-black">PB Zone</span>
            </div>
          </div>

          <div className="h-5 w-px bg-[#E2E2E2]" />

          <button
            onClick={onOpenGameSelector}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#F6F6F6] hover:bg-[#EEEEEE] border border-[#E2E2E2] hover:border-black transition-all text-xs text-black"
            title="Switch Game Experience"
          >
            <span className="text-base">{activeGame?.icon || '🥔'}</span>
            <div className="text-left">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#6B6B6B]">Active Game</div>
              <div className="font-bold text-xs truncate max-w-[140px] sm:max-w-[180px]">{activeGame?.name || 'PB Zone'}</div>
            </div>
            <ChevronDown className="h-3 w-3 text-[#6B6B6B] ml-1" />
          </button>

          {/* Item switcher (quiz / config within this game) */}
          {activeItem && (
            <div className="relative group hidden md:block">
              <div className="flex items-center gap-2 px-3 py-1.5 border border-[#E2E2E2] hover:border-black text-xs text-black transition-colors cursor-pointer bg-[#FFFFFF]">
                <span className="text-[#6B6B6B]">{switcherLabel}:</span>
                <span className="font-semibold max-w-[180px] truncate">{activeItem.title}</span>
                <ChevronDown className="h-3 w-3 text-[#6B6B6B]" />
              </div>

              <div className="absolute left-0 mt-1 w-80 bg-white border border-[#E2E2E2] shadow-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                  Switch {switcherLabel} for {activeGame?.name}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {switcherItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSelectItem(item.id)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        item.id === activeItem.id ? 'bg-black text-white font-semibold' : 'text-black hover:bg-[#F6F6F6]'
                      }`}
                    >
                      <span className="truncate pr-2">{item.title}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 font-mono uppercase ${
                          item.id === activeItem.id
                            ? 'bg-white text-black'
                            : item.status === 'published'
                            ? 'bg-[#EBF7EE] text-[#0E8345]'
                            : 'bg-[#EEEEEE] text-[#545454]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className={`hidden xl:flex items-center gap-2 px-3 py-1.5 border text-xs transition-colors ${
              aiEngineOnline
                ? 'bg-[#EBF7EE] border-[#0E8345] text-[#0E8345] hover:bg-[#d8f0dc]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7]'
            }`}
            title="AI engine settings"
          >
            <Cpu className="h-3.5 w-3.5" />
            <span className="font-semibold truncate max-w-[200px]">{aiEngineLabel}</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#F6F6F6] border border-[#E2E2E2] text-xs text-black">
            <span className="h-2 w-2 rounded-full bg-[#0E8345]" />
            <span className="text-[#545454]">Pool:</span>
            <span className="font-bold">{activeRotationCount} in Rotation</span>
          </div>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#000000] text-[#FFFFFF] hover:bg-[#262626] transition-all"
            title="Launch player preview"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{simulatorLabel}</span>
          </button>

          {showPublish && (
            <button
              onClick={onTogglePublish}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border transition-all ${
                isPublished
                  ? 'bg-[#EBF7EE] border-[#0E8345] text-[#0E8345] hover:bg-[#d8f0dc]'
                  : 'bg-[#FFFFFF] border-black text-black hover:bg-[#F6F6F6]'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isPublished ? 'bg-[#0E8345]' : 'bg-black'}`} />
              <span>{isPublished ? 'Published' : 'Draft'}</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 text-[#545454] hover:text-black hover:bg-[#EEEEEE] transition-colors border border-transparent hover:border-[#E2E2E2]"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
