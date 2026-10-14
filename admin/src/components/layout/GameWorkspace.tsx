import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Game } from '../../types/quiz';
import { getGameKind } from '../../types/gameConfig';
import { GAME_STATUS, GAME_VISUALS } from '../dashboard/gameVisuals';
import { Pill, panelClass, tabClass, tabListClass } from '../ui/pb';
import { cn } from '../../lib/utils';

interface GameWorkspaceProps {
  game: Game;
  sectionLabel?: string;
  children: React.ReactNode;
}

export const GameWorkspace: React.FC<GameWorkspaceProps> = ({ game, sectionLabel, children }) => {
  const isQuiz = getGameKind(game.format) === 'quiz';
  const base = `/games/${game.id}`;
  const tabs = isQuiz
    ? [
        { to: base, label: 'Overview', end: true },
        { to: `${base}/quiz-management`, label: 'Quiz Management', end: true },
        { to: `${base}/questions`, label: 'Questions', end: true },
        { to: `${base}/telemetry`, label: 'Telemetry', end: true },
      ]
    : [
        { to: base, label: 'Overview', end: true },
        { to: `${base}/setup`, label: 'Setup', end: true },
        { to: `${base}/library`, label: 'Library', end: true },
        { to: `${base}/edit`, label: 'Editor', end: true },
      ];
  const visual = GAME_VISUALS[game.format];
  const status = GAME_STATUS[game.status] ?? GAME_STATUS.draft;

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-[#64748B]">
        <Link to="/games" className="font-medium hover:text-[#14532D]">
          Games
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={base} className="font-medium hover:text-[#14532D]">
          {game.name}
        </Link>
        {sectionLabel && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-[#0F172A]">{sectionLabel}</span>
          </>
        )}
      </nav>

      <div className={cn(panelClass, 'flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between')}>
        <div className="flex min-w-0 items-center gap-4">
          {visual?.icon ? (
            <img src={visual.icon} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFF2DD] text-2xl">
              {game.icon || '🎮'}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-extrabold tracking-[-0.01em] text-[#0B1A13] sm:text-2xl">{game.name}</h1>
              <Pill tone={status.tone} dot>
                {status.label}
              </Pill>
              {visual && (
                <Pill tone="gray" className="hidden sm:inline-flex">
                  {visual.label}
                </Pill>
              )}
            </div>
            {(game.tagline || game.description) && (
              <p className="mt-0.5 line-clamp-1 text-sm text-[#5F6F83]">{game.tagline || game.description}</p>
            )}
          </div>
        </div>

        <div className={cn(tabListClass, 'self-start xl:self-auto')}>
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => tabClass(isActive)}>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
};
