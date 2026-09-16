import React, { useEffect, useMemo, useState } from 'react';
import { useQuizTelemetry } from '../../hooks/useQuizTelemetry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatNumber } from '../../lib/utils';
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Players</h1>
        <p className="text-sm text-muted-foreground">
          Stored leadership points from the board. Game columns are that game&apos;s points.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Players</CardTitle>
          <CardDescription>
            Ranked by stored PB points. Coins stay on the wallet and are not used for rank.
            {boardError ? ` Board unavailable: ${boardError}` : ''}
            {actionError ? ` ${actionError}` : ''}
          </CardDescription>
          {!searchQuery && (
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search players..."
              className="mt-2 h-10 max-w-sm rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>PB points</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Coins</TableHead>
                {STORED_GAME_KEYS.map((key) => (
                  <TableHead key={key}>{GAME_LABELS[key]}</TableHead>
                ))}
                <TableHead>Correct</TableHead>
                <TableHead>Played</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={16} className="h-24 text-center text-muted-foreground">
                    Loading players…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} className="h-24 text-center text-muted-foreground">
                    {query ? `No players found matching "${query}"` : 'No players found'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.rank}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="font-medium tabular-nums">{formatNumber(row.points)}</TableCell>
                    <TableCell className="tabular-nums">{row.wallet > 0 ? formatNumber(row.wallet) : '—'}</TableCell>
                    <TableCell className="tabular-nums">{row.coins > 0 ? formatNumber(row.coins) : '—'}</TableCell>
                    {STORED_GAME_KEYS.map((key) => (
                      <TableCell key={key} className="tabular-nums text-muted-foreground">
                        {row.games[key] ? formatNumber(row.games[key] ?? 0) : '—'}
                      </TableCell>
                    ))}
                    <TableCell>{row.correct}</TableCell>
                    <TableCell>{row.played}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={draftAmount[row.id] ?? ''}
                          onChange={(event) =>
                            setDraftAmount((current) => ({ ...current, [row.id]: event.target.value }))
                          }
                          placeholder="Add"
                          className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                        />
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void onAddPoints(row.id, row.name)}
                          className="inline-flex h-8 items-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void onRemove(row.id, row.name)}
                          className="inline-flex h-8 items-center rounded-md bg-red-600 px-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
