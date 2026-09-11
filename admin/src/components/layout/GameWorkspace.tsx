import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Game } from '../../types/quiz';
import { getGameKind } from '../../types/gameConfig';
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

  return (
    <div className="flex flex-col gap-3">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/games" className="hover:text-foreground">
          Games
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={base} className="hover:text-foreground">
          {game.name}
        </Link>
        {sectionLabel && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{sectionLabel}</span>
          </>
        )}
      </nav>

      <div className="flex flex-wrap gap-1 rounded-md border bg-muted/40 p-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'inline-flex h-8 items-center rounded-sm px-2.5 text-sm',
                isActive ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {children}
    </div>
  );
};
