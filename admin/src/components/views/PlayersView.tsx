import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, Users } from 'lucide-react';
import { useQuizTelemetry } from '../../hooks/useQuizTelemetry';
import { Button, IconTile, PageHeader, inputClass, panelClass, tableClass } from '../ui/pb';
import { cn, formatNumber } from '../../lib/utils';
import {
  addPlayerPoints,
  fetchStoredBoardPlayers,
  removePlayer,
  STORED_GAME_KEYS,
  type StoredBoardPlayer,
  type StoredGameKey,
} from '../../services/quizBankApi';

interface PlayersViewProps {
  searchQuery: string;
}

const GAME_LABELS: Record<StoredGameKey, string> = {
  quiz_time: 'Quiz',
  potato_crush: 'Crush',
  spud_run: 'Run',
  potato_sort: 'Sort',
  potato_ninja: 'Ninja',
  word_scramble: 'Words',
  guess_disease: 'Disease',
  fix_puzzle: 'Puzzle',
};

function coinTotal(player: StoredBoardPlayer) {
  return STORED_GAME_KEYS.reduce((sum, key) => sum + (player.coins[key] ?? 0), 0);
}

const MEDAL: Record<number, string> = {
  1: 'bg-[#FFF3D6] text-[#B45309] ring-1 ring-inset ring-[#FCE3A6]',
  2: 'bg-[#EEF2F6] text-[#475569] ring-1 ring-inset ring-[#DCE3EA]',
  3: 'bg-[#FDEBDD] text-[#C2410C] ring-1 ring-inset ring-[#F9D2B5]',
};

const td = cn(tableClass.td, 'whitespace-nowrap');
/* The player column stays pinned while the wide table scrolls sideways. */
const stickyCell = 'sticky left-0 z-[1] shadow-[inset_-1px_0_0_#EEF2F6]';
const amountInputClass =
  'h-8 w-20 rounded-lg border border-[#E2E8E4] bg-white px-2.5 text-sm tabular-nums text-[#0F172A] transition-colors placeholder:text-[#94A3B8] focus:border-[#86D19A] focus:outline-none focus:ring-4 focus:ring-[#16A34A]/10';

function Dash() {
  return <span className="text-[#94A3B8]">—</span>;
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-[#FBD5DD] bg-[#FDE8EC] px-3.5 py-2.5 text-sm text-[#BE123C]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export const PlayersView: React.FC<PlayersViewProps> = ({ searchQuery }) => {
  const live = useQuizTelemetry(true);
  const [stored, setStored] = useState<StoredBoardPlayer[]>([]);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const query = (searchQuery || localSearch).trim().toLowerCase();

  useEffect(() => {
    let cancelled = false;
    const load = async (silent: boolean) => {
      if (!silent) setBoardLoading(true);
      try {
        const rows = await fetchStoredBoardPlayers();
        if (cancelled) return;
        setStored(rows);
        setBoardError(null);
      } catch (err) {
        if (cancelled) return;
        setBoardError(err instanceof Error ? err.message : 'Could not load leaderboard points.');
      } finally {
        if (!cancelled) setBoardLoading(false);
      }
    };
    void load(false);
    const id = window.setInterval(() => void load(true), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const quizByUser = useMemo(() => {
    const map = new Map<string, (typeof live.data.players)[number]>();
    for (const player of live.data.players) {
      if (!player.userId || map.has(player.userId)) continue;
      map.set(player.userId, player);
    }
    return map;
  }, [live.data.players]);

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const merged = stored.map((player, index) => {
      seen.add(player.userId);
      const quiz = quizByUser.get(player.userId);
      return {
        id: player.userId,
        rank: index + 1,
        name: player.name || quiz?.playerName || 'Player',
        points: player.points,
        wallet: player.wallet,
        games: player.games,
        coins: coinTotal(player),
        correct: quiz ? `${quiz.correctCount}/${quiz.totalQuestions}` : '—',
        played: quiz?.completedAt
          ? new Date(quiz.completedAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—',
      };
    });

    for (const quiz of live.data.players) {
      if (!quiz.userId || seen.has(quiz.userId)) continue;
      seen.add(quiz.userId);
      merged.push({
        id: quiz.userId,
        rank: merged.length + 1,
        name: quiz.playerName || 'Player',
        points: 0,
        wallet: 0,
        games: {},
        coins: 0,
        correct: `${quiz.correctCount}/${quiz.totalQuestions}`,
        played: quiz.completedAt
          ? new Date(quiz.completedAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—',
      });
    }

    return merged.filter((row) =>
      query ? row.name.toLowerCase().includes(query) || row.id.toLowerCase().includes(query) : true,
    );
  }, [stored, quizByUser, live.data.players, query]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draftAmount, setDraftAmount] = useState<Record<string, string>>({});

  const reloadBoard = () => {
    setBoardLoading(true);
    void fetchStoredBoardPlayers()
      .then((next) => {
        setStored(next);
        setBoardError(null);
      })
      .catch((err) => {
        setBoardError(err instanceof Error ? err.message : 'Could not load leaderboard points.');
      })
      .finally(() => setBoardLoading(false));
  };

  const onAddPoints = async (userId: string, name: string) => {
    const amount = Math.floor(Number(draftAmount[userId]));
    if (!Number.isFinite(amount) || amount < 1) {
      setActionError('Enter a points amount of at least 1.');
      return;
    }
    setBusyId(userId);
    setActionError(null);
    try {
      await addPlayerPoints(userId, amount);
      setDraftAmount((current) => ({ ...current, [userId]: '' }));
      reloadBoard();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Could not update ${name}.`);
    } finally {
      setBusyId(null);
    }
  };

  const onRemove = async (userId: string, name: string) => {
    if (!window.confirm(`Remove ${name}? Their points will be cleared. Next login gets 1000 starter points.`)) {
      return;
    }
    setBusyId(userId);
    setActionError(null);
    try {
      await removePlayer(userId);
      reloadBoard();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Could not remove ${name}.`);
    } finally {
      setBusyId(null);
    }
  };

  const loading = boardLoading && rows.length === 0 && live.loading;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Players"
        description="Stored leadership points from the board. Game columns are that game's points."
      />

      <section className={cn(panelClass, 'p-4 sm:p-5')}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <IconTile icon={Users} tone="green" />
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight text-[#0B1220] sm:text-lg">Players</h2>
              <p className="mt-0.5 text-sm text-[#5F6F83]">
                Ranked by stored PB points. Coins stay on the wallet and are not used for rank.
              </p>
            </div>
          </div>
          {!searchQuery && (
            <div className="relative w-full shrink-0 md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search players..."
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          )}
        </div>

        {(boardError || actionError) && (
          <div className="mt-4 flex flex-col gap-2">
            {boardError && <ErrorNote>Board unavailable: {boardError}</ErrorNote>}
            {actionError && <ErrorNote>{actionError}</ErrorNote>}
          </div>
        )}

        <div className={cn(tableClass.wrap, 'mt-4')}>
          <table className={tableClass.table}>
            <thead>
              <tr>
                <th className={tableClass.th}>Rank</th>
                <th className={cn(tableClass.th, stickyCell)}>Player</th>
                <th className={tableClass.th}>PB points</th>
                <th className={tableClass.th}>Wallet</th>
                <th className={tableClass.th}>Coins</th>
                {STORED_GAME_KEYS.map((key) => (
                  <th key={key} className={tableClass.th}>
                    {GAME_LABELS[key]}
                  </th>
                ))}
                <th className={tableClass.th}>Correct</th>
                <th className={tableClass.th}>Played</th>
                <th className={tableClass.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={16} className="h-24 px-4 text-center text-sm text-[#64748B]">
                    Loading players…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="h-24 px-4 text-center text-sm text-[#64748B]">
                    {query ? `No players found matching "${query}"` : 'No players found'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className={cn(tableClass.tr, 'group')}>
                    <td className={td}>
                      <span
                        className={cn(
                          'inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums',
                          MEDAL[row.rank] ?? 'text-[#64748B]',
                        )}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className={cn(td, stickyCell, 'bg-white transition-colors group-hover:bg-[#F8FBF9]')}>
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E3F8E8] text-xs font-bold uppercase text-[#14532D]"
                        >
                          {row.name.trim().charAt(0) || '?'}
                        </span>
                        <span title={row.name} className="max-w-[120px] truncate font-semibold text-[#0F172A] sm:max-w-[200px]">
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className={cn(td, 'font-bold tabular-nums text-[#14532D]')}>{formatNumber(row.points)}</td>
                    <td className={cn(td, 'tabular-nums')}>{row.wallet > 0 ? formatNumber(row.wallet) : <Dash />}</td>
                    <td className={cn(td, 'tabular-nums')}>{row.coins > 0 ? formatNumber(row.coins) : <Dash />}</td>
                    {STORED_GAME_KEYS.map((key) => (
                      <td key={key} className={cn(td, 'tabular-nums text-[#64748B]')}>
                        {row.games[key] ? formatNumber(row.games[key] ?? 0) : <Dash />}
                      </td>
                    ))}
                    <td className={cn(td, 'tabular-nums')}>{row.correct === '—' ? <Dash /> : row.correct}</td>
                    <td className={cn(td, 'text-[#64748B]')}>{row.played === '—' ? <Dash /> : row.played}</td>
                    <td className={td}>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={draftAmount[row.id] ?? ''}
                          onChange={(event) =>
                            setDraftAmount((current) => ({ ...current, [row.id]: event.target.value }))
                          }
                          placeholder="Add"
                          aria-label={`Points to add for ${row.name}`}
                          className={amountInputClass}
                        />
                        <Button
                          size="sm"
                          disabled={busyId === row.id}
                          onClick={() => void onAddPoints(row.id, row.name)}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busyId === row.id}
                          onClick={() => void onRemove(row.id, row.name)}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
