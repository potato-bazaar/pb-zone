import React, { useState } from 'react';
import { ArrowRight, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '../../types/quiz';
import { getGameKind } from '../../types/gameConfig';
import { cn, formatNumber } from '../../lib/utils';
import { GAME_VISUALS } from './gameVisuals';
import { GamepadSolid } from './dashboardIcons';

export type GamePerformanceRow = {
  game: Game;
  plays: number;
  /** Null when the game has no live player feed. */
  activeUsers: number | null;
};

const STATUS: Record<Game['status'], { label: string; pill: string; dot: string }> = {
  active: { label: 'Active', pill: 'bg-[#E3F8E8] text-[#14532D]', dot: 'bg-[#16A34A]' },
  maintenance: { label: 'Maintenance', pill: 'bg-[#FFF3D6] text-[#92400E]', dot: 'bg-[#F59E0B]' },
  draft: { label: 'Draft', pill: 'bg-[#F1F5F9] text-[#334155]', dot: 'bg-[#94A3B8]' },
  'in-development': { label: 'In Development', pill: 'bg-[#E1EFFE] text-[#1E40AF]', dot: 'bg-[#3B82F6]' },
};

function GameIcon({ game }: { game: Game }) {
  const icon = GAME_VISUALS[game.format]?.icon;
  const box = 'h-11 w-11 shrink-0 rounded-[10px] 2xl:h-12 2xl:w-12 2xl:rounded-xl';
  return icon ? (
    <img src={icon} alt="" className={cn(box, 'object-cover shadow-sm')} />
  ) : (
    <span className={cn(box, 'flex items-center justify-center bg-[#FFF2DD] text-xl')}>{game.icon || '🎮'}</span>
  );
}

function TypeChip({ game }: { game: Game }) {
  const visual = GAME_VISUALS[game.format];
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-medium 2xl:px-3 2xl:py-1 2xl:text-[15px]',
        visual?.chip ?? 'bg-[#F1F5F9] text-[#334155]',
      )}
    >
      {visual?.label ?? getGameKind(game.format)}
    </span>
  );
}

function StatusPill({ status }: { status: Game['status'] }) {
  const style = STATUS[status] ?? STATUS.draft;
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium 2xl:px-3 2xl:text-[15px]', style.pill)}>
      <span className={cn('h-2 w-2 rounded-full 2xl:h-2.5 2xl:w-2.5', style.dot)} />
      {style.label}
    </span>
  );
}

function RowMenu({ game, onOpenGame }: { game: Game; onOpenGame: (gameId: string) => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = [
    { label: 'Manage content', run: () => onOpenGame(game.id) },
    { label: 'View details', run: () => navigate(`/games/${game.id}`) },
  ];
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={`Actions for ${game.name}`}
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#334155] hover:bg-[#EEF2F6]"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {open && (
        <>
          <button type="button" tabIndex={-1} aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#F0FAF2]"
                onClick={() => {
                  setOpen(false);
                  item.run();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface GamePerformanceTableProps {
  rows: GamePerformanceRow[];
  onOpenGame: (gameId: string) => void;
  onViewAll: () => void;
}

export const GamePerformanceTable: React.FC<GamePerformanceTableProps> = ({ rows, onOpenGame, onViewAll }) => (
  <section className="rounded-2xl bg-white p-3 shadow-card sm:p-4 2xl:px-[15px] 2xl:pb-4 2xl:pt-3.5">
    <div className="flex items-center gap-3 sm:px-1 2xl:gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DDF7E3] text-[#16A34A] 2xl:h-[52px] 2xl:w-[52px] 2xl:rounded-2xl">
        <GamepadSolid className="h-6 w-6 2xl:h-7 2xl:w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold leading-tight text-[#0B1220] 2xl:text-[22px]">Game Performance</h2>
        <p className="hidden truncate text-sm text-[#5F6F83] sm:block 2xl:text-[15px]">
          Track how each game is performing with your community.
        </p>
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#E3F7E7] px-3 text-sm font-semibold text-[#14532D] transition-colors hover:bg-[#D3F1DA] sm:h-10 sm:px-4 2xl:h-11 2xl:px-5 2xl:text-base"
      >
        <span className="sm:hidden">View all</span>
        <span className="hidden sm:inline">View All Games</span>
        <ArrowRight className="h-4 w-4 2xl:h-5 2xl:w-5" />
      </button>
    </div>

    {rows.length === 0 ? (
      <p className="mt-3 rounded-xl bg-[#F8FAFC] py-10 text-center text-sm text-[#64748B]">No games found</p>
    ) : (
      <>
        <div className="mt-3 hidden overflow-x-auto md:block 2xl:mt-[18px]">
          <table className="w-full min-w-[680px] table-fixed border-separate border-spacing-0 text-left text-sm text-[#0F172A] 2xl:text-[17px]">
            <colgroup>
              <col className="w-[31%]" />
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead className="text-[13px] text-[#475569] 2xl:text-[15px] [&_th]:bg-[#F2F5F8]">
              <tr>
                <th className="rounded-l-xl px-4 py-2.5 font-medium">Game Name</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Plays</th>
                <th className="px-4 py-2.5 font-medium">Active Users</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="rounded-r-xl px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ game, plays, activeUsers }) => (
                <tr
                  key={game.id}
                  onClick={() => onOpenGame(game.id)}
                  className="cursor-pointer transition-colors hover:bg-[#F8FBF9] [&>td]:border-b [&>td]:border-[#EEF2F6] [&:last-child>td]:border-b-0"
                >
                  <td className="px-4 py-0.5">
                    <div className="flex items-center gap-3 2xl:gap-4">
                      <GameIcon game={game} />
                      <span className="truncate font-medium">{game.name}</span>
                    </div>
                  </td>
                  <td className="px-4">
                    <TypeChip game={game} />
                  </td>
                  <td className="px-4 tabular-nums">{formatNumber(plays)}</td>
                  <td className="px-4 tabular-nums">{activeUsers === null ? '-' : formatNumber(activeUsers)}</td>
                  <td className="px-4">
                    <StatusPill status={game.status} />
                  </td>
                  <td className="px-2">
                    <div className="flex justify-end">
                      <RowMenu game={game} onOpenGame={onOpenGame} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-2 divide-y divide-[#EEF2F6] md:hidden">
          {rows.map(({ game, plays, activeUsers }) => (
            <li key={game.id} onClick={() => onOpenGame(game.id)} className="flex cursor-pointer items-center gap-3 py-3">
              <GameIcon game={game} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[#0F172A]">{game.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#64748B]">
                  <TypeChip game={game} />
                  <span className="tabular-nums">{formatNumber(plays)} plays</span>
                  {activeUsers !== null && <span className="tabular-nums">{formatNumber(activeUsers)} active</span>}
                </div>
              </div>
              <StatusPill status={game.status} />
              <RowMenu game={game} onOpenGame={onOpenGame} />
            </li>
          ))}
        </ul>
      </>
    )}
  </section>
);
