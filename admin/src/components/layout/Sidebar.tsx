import React from 'react';
import { Grid, Radio, Layers, PlusCircle, History, BarChart3, Gamepad2, ChevronRight } from 'lucide-react';
import { Game } from '../../types/quiz';
import { GameKind } from '../../types/gameConfig';

export type TabId = 'games' | 'active' | 'manage' | 'setup' | 'previous' | 'analytics' | 'simulator';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activeGame: Game | null;
  kind: GameKind;
  activeItemTitle: string;
  totalItemsCount: number;
  rotationPoolCount: number;
}

const NAV_LABELS: Record<
  GameKind,
  { active: string; manage: string; setup: string; previous: string; manageBadge: string; setupBadge: string; simulator: string }
> = {
  quiz: {
    active: 'Current Quiz (Active)',
    manage: 'Manage Quiz',
    setup: 'Setup Quiz',
    previous: 'Previous Quizzes',
    manageBadge: '20-Q',
    setupBadge: 'AI Batch',
    simulator: 'Web UI Simulator',
  },
  crush: {
    active: 'Active Level Pack',
    manage: 'Edit Levels',
    setup: 'AI Generate Levels',
    previous: 'Level Pack Library',
    manageBadge: 'Match-3',
    setupBadge: 'Groq AI',
    simulator: 'Board Preview',
  },
  spin: {
    active: 'Active Prize Wheel',
    manage: 'Edit Wheel',
    setup: 'AI Generate Wheel',
    previous: 'Wheel Library',
    manageBadge: 'Wheel',
    setupBadge: 'Groq AI',
    simulator: 'Spin Preview',
  },
  rush: {
    active: 'Active Run Pack',
    manage: 'Edit Runs',
    setup: 'AI Generate Runs',
    previous: 'Run Pack Library',
    manageBadge: 'Runner',
    setupBadge: 'Groq AI',
    simulator: 'Track Preview',
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeGame,
  kind,
  activeItemTitle,
  totalItemsCount,
  rotationPoolCount,
}) => {
  const labels = NAV_LABELS[kind];

  const gameFlowNav: { id: TabId; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'active', label: labels.active, icon: <Radio className="h-4 w-4" />, badge: 'LIVE' },
    { id: 'manage', label: labels.manage, icon: <Layers className="h-4 w-4" />, badge: labels.manageBadge },
    { id: 'setup', label: labels.setup, icon: <PlusCircle className="h-4 w-4" />, badge: labels.setupBadge },
    { id: 'previous', label: labels.previous, icon: <History className="h-4 w-4" />, badge: totalItemsCount },
  ];

  const secondaryNav: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'analytics', label: 'Winners & Telemetry', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'simulator', label: labels.simulator, icon: <Gamepad2 className="h-4 w-4" /> },
  ];

  return (
    <aside className="w-64 border-r border-[#E2E2E2] bg-[#FFFFFF] flex flex-col justify-between py-5 px-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-5">
        <button
          onClick={() => onSelectTab('games')}
          className={`w-full flex items-center justify-between p-3 border transition-all text-left ${
            currentTab === 'games'
              ? 'bg-black text-white border-black font-bold'
              : 'bg-[#F6F6F6] text-black border-[#E2E2E2] hover:border-black'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Grid className="h-4 w-4" />
            <div>
              <div className="text-xs font-bold">Games Directory</div>
              <div className={`text-[10px] ${currentTab === 'games' ? 'text-white/70' : 'text-[#6B6B6B]'}`}>
                Select & Switch Games
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4" />
        </button>

        {activeGame && (
          <div className="space-y-4 pt-1">
            <div className="p-3 border border-[#E2E2E2] bg-white space-y-1">
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">Active Game Selected:</div>
              <div className="flex items-center gap-2 font-bold text-xs text-black">
                <span className="text-lg">{activeGame.icon}</span>
                <span className="truncate">{activeGame.name}</span>
              </div>
              <div className="text-[10px] text-[#6B6B6B] truncate">{activeGame.tagline}</div>
              <div className="text-[10px] text-[#545454] truncate pt-1 border-t border-[#E2E2E2]" title={activeItemTitle}>
                {activeItemTitle}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-2 px-1">Game Flow</div>
              <nav className="space-y-1">
                {gameFlowNav.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all ${
                        isActive ? 'bg-black text-white' : 'text-[#333333] hover:bg-[#F6F6F6] hover:text-black'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 font-mono font-bold uppercase ${
                            isActive ? 'bg-white text-black' : 'bg-[#EEEEEE] text-[#545454]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-2 px-1">Telemetry & Testing</div>
          <nav className="space-y-1">
            {secondaryNav.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold transition-all ${
                    isActive ? 'bg-black text-white' : 'text-[#545454] hover:bg-[#F6F6F6] hover:text-black'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="pt-3 border-t border-[#E2E2E2] text-[11px] text-[#6B6B6B] space-y-0.5">
        <div className="font-medium text-black truncate">{activeGame?.name}</div>
        <div className="flex items-center justify-between text-[10px]">
          <span>{rotationPoolCount} in Pool</span>
          <span className="text-[#0E8345] font-semibold">● Ready</span>
        </div>
      </div>
    </aside>
  );
};
