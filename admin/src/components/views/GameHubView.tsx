import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Disc3,
  HelpCircle,
  Image as ImageIcon,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Type,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Game, GameFormat } from '../../types/quiz';
import { FORMAT_LABELS } from '../../types/gameConfig';
import { GAME_IMAGE_LIBRARY } from '../../data/gameConfigCatalog';
import { fetchQuizPlayStats, fetchQuizTelemetry } from '../../services/quizBankApi';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn, formatNumber } from '../../lib/utils';

interface GameHubViewProps {
  games: Game[];
  activeGameId: string;
  searchQuery?: string;
  onSelectGame: (gameId: string) => void;
  onCreateGame: (newGame: Game) => void;
  getQuizCountForGame: (gameId: string) => number;
  getRotationCountForGame: (gameId: string) => number;
  getConfigCountForGame: (gameId: string) => number;
}

const FORMAT_OPTIONS: GameFormat[] = [
  'pb-quiz',
  'trivia-20q',
  'word-scramble',
  'picture-guess',
  'potato-crush',
  'spin-wheel',
  'potato-rush',
];

const TYPE_META: Record<GameFormat, { label: string; icon: LucideIcon }> = {
  'word-scramble': { label: 'Word Game', icon: Type },
  'pb-quiz': { label: 'Quiz', icon: HelpCircle },
  'trivia-20q': { label: 'Quiz', icon: HelpCircle },
  'picture-guess': { label: 'Picture Game', icon: ImageIcon },
  'potato-crush': { label: 'Match Game', icon: LayoutGrid },
  'spin-wheel': { label: 'Lucky Spin', icon: Disc3 },
  'potato-rush': { label: 'Endless Runner', icon: Zap },
};

const COVER_BY_FORMAT: Partial<Record<GameFormat, string>> = {
  'word-scramble': '/images/home/game-word-scramble.png',
  'pb-quiz': '/images/home/game-quiz-time.png',
  'trivia-20q': '/images/home/game-quiz-time.png',
  'picture-guess': '/images/home/game-guess-disease.png',
  'potato-crush': '/images/home/game-tater-match.png',
  'potato-rush': '/images/home/game-fix-puzzle.png',
};

type StatusFilter = 'all' | 'active' | 'draft' | 'paused';
type SortMode = 'latest' | 'oldest' | 'plays' | 'name';

function statusOf(game: Game): Exclude<StatusFilter, 'all'> {
  if (game.status === 'active') return 'active';
  if (game.status === 'maintenance') return 'paused';
  return 'draft';
}

function statusStyle(status: Exclude<StatusFilter, 'all'>) {
  if (status === 'active') {
    return {
      label: 'Active',
      badge: 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800',
      dot: 'bg-green-600',
    };
  }
  if (status === 'paused') {
    return {
      label: 'Paused',
      badge: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800',
      dot: 'bg-yellow-500',
    };
  }
  return {
    label: 'Draft',
    badge: 'bg-gray-100 text-gray-800 hover:bg-gray-100 hover:text-gray-800',
    dot: 'bg-gray-400',
  };
}

export const GameHubView: React.FC<GameHubViewProps> = ({
  games,
  onSelectGame,
  onCreateGame,
  searchQuery = '',
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortMode>('latest');
  const [sortOpen, setSortOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [quizPlayers, setQuizPlayers] = useState(0);
  const [quizPlays, setQuizPlays] = useState(0);
  const [quizWinners, setQuizWinners] = useState(0);

  const [newName, setNewName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFormat, setNewFormat] = useState<GameFormat>('pb-quiz');
  const [newIcon, setNewIcon] = useState('🥔');
  const [newImageUrl, setNewImageUrl] = useState('/games/spud-trivia.jpg');
  const [newReward, setNewReward] = useState('Exclusive Discount Voucher');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchQuizPlayStats().catch(() => null),
      fetchQuizTelemetry().catch(() => null),
    ]).then(([play, live]) => {
      if (cancelled) return;
      setQuizPlayers(live?.playerCount ?? play?.playerCount ?? 0);
      setQuizPlays(live?.sessionCount ?? play?.sessionCount ?? 0);
      setQuizWinners(live?.winnersCount ?? play?.winnersCount ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: games.length,
      active: games.filter((g) => statusOf(g) === 'active').length,
      draft: games.filter((g) => statusOf(g) === 'draft').length,
      paused: games.filter((g) => statusOf(g) === 'paused').length,
    }),
    [games],
  );

  const visibleGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = games.filter((game) => {
      if (filter !== 'all' && statusOf(game) !== filter) return false;
      if (!q) return true;
      const type = TYPE_META[game.format]?.label || '';
      return (
        game.name.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q)
      );
    });
    rows.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'plays') return b.totalPlays - a.totalPlays;
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === 'oldest' ? aTime - bTime : bTime - aTime;
    });
    return rows;
  }, [filter, games, searchQuery, sort]);

  const statsFor = (game: Game) => {
    if (game.format === 'pb-quiz') {
      return {
        plays: quizPlays || game.totalPlays,
        uniquePlayers: quizPlayers,
        rewardsClaimed: quizWinners || game.totalWinners,
      };
    }
    return {
      plays: game.totalPlays,
      uniquePlayers: game.totalPlays,
      rewardsClaimed: game.totalWinners,
    };
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const gameId = `game-${Date.now()}`;
    onCreateGame({
      id: gameId,
      name: newName,
      slug: newName.toLowerCase().replace(/\s+/g, '-'),
      tagline: newTagline || 'Custom Game Mode',
      description: newDescription || 'Interactive game experience.',
      format: newFormat,
      icon: newIcon || '🎮',
      imageUrl: newImageUrl || '/games/spud-trivia.jpg',
      status: 'draft',
      isConfigured: true,
      activeQuizId: '',
      totalPlays: 0,
      totalWinners: 0,
      rewardType: newReward,
      createdAt: new Date().toISOString(),
    });
    setIsCreating(false);
    setNewName('');
    setNewTagline('');
    setNewDescription('');
  };

  const filters: { id: StatusFilter; label: string; dot?: string }[] = [
    { id: 'all', label: 'All Games' },
    { id: 'active', label: 'Active', dot: 'bg-green-600' },
    { id: 'draft', label: 'Draft', dot: 'bg-gray-400' },
    { id: 'paused', label: 'Paused', dot: 'bg-yellow-500' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Games</h1>
          <p className="text-sm text-muted-foreground">
            Manage and control all your PB Zone games. Create new games, edit existing ones and track performance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create New Game
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((item) => {
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-input bg-background text-foreground hover:bg-accent',
                )}
              >
                {item.dot && <span className={cn('h-1.5 w-1.5 rounded-full', selected ? 'bg-primary-foreground' : item.dot)} />}
                {item.label}
                <span className={cn('text-xs', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((open) => !open)}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-accent"
          >
            Sort by: {sort === 'latest' ? 'Latest' : sort === 'oldest' ? 'Oldest' : sort === 'plays' ? 'Plays' : 'Name'}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border bg-popover p-1 shadow-md">
              {(['latest', 'oldest', 'plays', 'name'] as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className="w-full rounded-sm px-3 py-1.5 text-left text-sm capitalize hover:bg-accent"
                  onClick={() => {
                    setSort(mode);
                    setSortOpen(false);
                  }}
                >
                  {mode === 'plays' ? 'Most plays' : mode}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {visibleGames.length === 0 ? (
        <Card className="shadow-none">
          <p className="p-6 text-center text-sm text-muted-foreground">No games found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {visibleGames.map((game) => {
            const type = TYPE_META[game.format];
            const TypeIcon = type.icon;
            const status = statusOf(game);
            const look = statusStyle(status);
            const stats = statsFor(game);
            const cover = COVER_BY_FORMAT[game.format] || game.imageUrl;

            return (
              <Card key={game.id} className="shadow-none">
                <div className="flex gap-3 p-3">
                  <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-md bg-muted">
                    <img
                      src={cover}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== game.imageUrl && game.imageUrl) {
                          img.src = game.imageUrl;
                          return;
                        }
                        img.style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold">{game.name}</h2>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <TypeIcon className="h-3.5 w-3.5" />
                          {type.label}
                        </p>
                      </div>
                      <Badge className={look.badge}>
                        <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', look.dot)} />
                        {look.label}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="font-semibold tabular-nums">{formatNumber(stats.plays)}</span>
                        <span className="ml-1 text-muted-foreground">Plays</span>
                      </div>
                      <div>
                        <span className="font-semibold tabular-nums">{formatNumber(stats.uniquePlayers)}</span>
                        <span className="ml-1 text-muted-foreground">Unique Players</span>
                      </div>
                      <div>
                        <span className="font-semibold tabular-nums">{formatNumber(stats.rewardsClaimed)}</span>
                        <span className="ml-1 text-muted-foreground">Rewards Claimed</span>
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{game.description}</p>

                    <div className="mt-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectGame(game.id)}
                        className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
                      >
                        Manage
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuId((id) => (id === game.id ? null : game.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label={`More actions for ${game.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuId === game.id && (
                          <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border bg-popover p-1 shadow-md">
                            <button
                              type="button"
                              className="w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent"
                              onClick={() => {
                                setMenuId(null);
                                onSelectGame(game.id);
                              }}
                            >
                              Manage
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Create New Game</h2>
              <p className="text-sm text-muted-foreground">Add a game to the PB Zone catalog.</p>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Game Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as GameFormat)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {FORMAT_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Icon</label>
                  <select
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="🥔">🥔</option>
                    <option value="🏆">🏆</option>
                    <option value="🧩">🧩</option>
                    <option value="🎡">🎡</option>
                    <option value="⚡">⚡</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tagline</label>
                <input
                  value={newTagline}
                  onChange={(e) => setNewTagline(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Artwork</label>
                <div className="grid grid-cols-5 gap-2">
                  {GAME_IMAGE_LIBRARY.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setNewImageUrl(img.url)}
                      className={cn(
                        'aspect-video overflow-hidden rounded-md border',
                        newImageUrl === img.url ? 'border-foreground ring-1 ring-ring' : 'border-input',
                      )}
                    >
                      <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reward</label>
                <input
                  value={newReward}
                  onChange={(e) => setNewReward(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create Game
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
