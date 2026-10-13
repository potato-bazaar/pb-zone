import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Disc3,
  Gamepad2,
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
import { GAME_VISUALS } from '../dashboard/gameVisuals';
import {
  Button,
  EmptyState,
  ModalShell,
  PageHeader,
  Panel,
  Pill,
  buttonClass,
  inputClass,
  labelClass,
  panelClass,
  selectClass,
  tabClass,
  textareaClass,
  type Tone,
} from '../ui/pb';
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

const CREATE_FORM_ID = 'game-hub-create-form';
const menuClass = 'absolute z-30 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5';
const menuItemClass = 'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors';

type StatusFilter = 'all' | 'active' | 'draft' | 'paused';
type SortMode = 'latest' | 'oldest' | 'plays' | 'name';

function statusOf(game: Game): Exclude<StatusFilter, 'all'> {
  if (game.status === 'active') return 'active';
  if (game.status === 'maintenance') return 'paused';
  return 'draft';
}

function statusStyle(status: Exclude<StatusFilter, 'all'>): { label: string; tone: Tone } {
  if (status === 'active') return { label: 'Active', tone: 'green' };
  if (status === 'paused') return { label: 'Paused', tone: 'amber' };
  return { label: 'Draft', tone: 'gray' };
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
    { id: 'active', label: 'Active', dot: 'bg-[#16A34A]' },
    { id: 'draft', label: 'Draft', dot: 'bg-[#94A3B8]' },
    { id: 'paused', label: 'Paused', dot: 'bg-[#F59E0B]' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Games"
        description="Manage and control all your PB Zone games. Create new games, edit existing ones and track performance."
        actions={
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4" />
            Create New Game
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          role="tablist"
          aria-label="Filter games by status"
          className="grid grid-cols-2 gap-1 rounded-xl bg-[#E9F0EB] p-1 sm:inline-flex sm:max-w-full sm:flex-wrap sm:self-start md:self-auto"
        >
          {filters.map((item) => {
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(item.id)}
                className={cn(tabClass(selected), 'justify-center')}
              >
                {item.dot && <span className={cn('h-1.5 w-1.5 rounded-full', item.dot)} />}
                {item.label}
                <span
                  className={cn(
                    'min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums',
                    selected ? 'bg-[#E3F7E7] text-[#14532D]' : 'bg-white/70 text-[#64748B]',
                  )}
                >
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSortOpen((open) => !open)}
            aria-expanded={sortOpen}
            className={buttonClass('outline', 'md')}
          >
            <span>
              <span className="font-medium text-[#64748B]">Sort by:</span>{' '}
              {sort === 'latest' ? 'Latest' : sort === 'oldest' ? 'Oldest' : sort === 'plays' ? 'Plays' : 'Name'}
            </span>
            <ChevronDown className="h-4 w-4 text-[#64748B]" />
          </button>
          {sortOpen && (
            <div className={cn(menuClass, 'left-0 mt-2 w-44 md:left-auto md:right-0')}>
              {(['latest', 'oldest', 'plays', 'name'] as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    menuItemClass,
                    'capitalize',
                    sort === mode ? 'bg-[#F0FAF2] font-semibold text-[#14532D]' : 'text-[#334155] hover:bg-[#F6F9F7]',
                  )}
                  onClick={() => {
                    setSort(mode);
                    setSortOpen(false);
                  }}
                >
                  {mode === 'plays' ? 'Most plays' : mode}
                  {sort === mode && <Check className="h-4 w-4 text-[#16A34A]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {visibleGames.length === 0 ? (
        <Panel>
          <EmptyState icon={Gamepad2} title="No games found" />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-5">
          {visibleGames.map((game) => {
            const type = TYPE_META[game.format];
            const TypeIcon = type.icon;
            const status = statusOf(game);
            const look = statusStyle(status);
            const stats = statsFor(game);
            const cover = COVER_BY_FORMAT[game.format] || game.imageUrl;
            const visual = GAME_VISUALS[game.format];

            return (
              <article key={game.id} className={cn(panelClass, 'flex flex-col')}>
                <div className="aspect-[5/2] overflow-hidden rounded-t-2xl bg-[#E9F0EB]">
                  <img
                    src={cover}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (game.imageUrl && cover !== game.imageUrl && !img.dataset.fallback) {
                        img.dataset.fallback = '1';
                        img.src = game.imageUrl;
                        return;
                      }
                      img.style.display = 'none';
                    }}
                  />
                </div>

                <div className="flex flex-1 flex-col px-4 pb-4 sm:px-5 sm:pb-5">
                  <div className="-mt-7 flex items-end justify-between gap-2">
                    {visual?.icon ? (
                      <img
                        src={visual.icon}
                        alt=""
                        className="relative h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm ring-4 ring-white"
                      />
                    ) : (
                      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFF2DD] text-2xl ring-4 ring-white">
                        {game.icon || '🎮'}
                      </span>
                    )}
                    <Pill tone={look.tone} dot>
                      {look.label}
                    </Pill>
                  </div>

                  <div className="mt-3 min-w-0">
                    <h2 className="truncate text-base font-bold leading-snug text-[#0B1220] sm:text-[17px]">{game.name}</h2>
                    <span
                      className={cn(
                        'mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        visual?.chip ?? 'bg-[#F1F5F9] text-[#334155]',
                      )}
                    >
                      <TypeIcon className="h-3.5 w-3.5" />
                      {type.label}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-[2.75rem] text-sm leading-[1.375rem] text-[#5F6F83]">{game.description}</p>

                  <div className="mt-4 grid grid-cols-[auto_auto_auto] divide-x divide-[#E2E8E4] rounded-xl bg-[#F6F9F7] py-2.5">
                    {[
                      { label: 'Plays', value: stats.plays },
                      { label: 'Unique Players', value: stats.uniquePlayers },
                      { label: 'Rewards Claimed', value: stats.rewardsClaimed },
                    ].map((stat) => (
                      <div key={stat.label} className="min-w-0 px-2 first:pl-3 last:pr-3">
                        <p className="truncate text-base font-bold tabular-nums text-[#0B1220]">{formatNumber(stat.value)}</p>
                        <p className="text-xs leading-tight text-[#64748B]">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Button variant="secondary" size="sm" onClick={() => onSelectGame(game.id)} className="flex-1">
                      Manage
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuId((id) => (id === game.id ? null : game.id))}
                        className={buttonClass('ghost', 'icon-sm')}
                        aria-label={`More actions for ${game.name}`}
                        aria-expanded={menuId === game.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuId === game.id && (
                        <div className={cn(menuClass, 'right-0 mt-1 w-40')}>
                          <button
                            type="button"
                            className={cn(menuItemClass, 'text-[#334155] hover:bg-[#F0FAF2]')}
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
              </article>
            );
          })}
        </div>
      )}

      {isCreating && (
        <ModalShell
          onClose={() => setIsCreating(false)}
          title="Create New Game"
          description="Add a game to the PB Zone catalog."
          icon={Gamepad2}
          footer={
            <>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" form={CREATE_FORM_ID}>
                Create Game
              </Button>
            </>
          }
        >
          <form id={CREATE_FORM_ID} onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Game Name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} required />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
              <div className="min-w-0">
                <label className={labelClass}>Format</label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value as GameFormat)}
                  className={selectClass}
                >
                  {FORMAT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {FORMAT_LABELS[f]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Icon</label>
                <select value={newIcon} onChange={(e) => setNewIcon(e.target.value)} className={selectClass}>
                  <option value="🥔">🥔</option>
                  <option value="🏆">🏆</option>
                  <option value="🧩">🧩</option>
                  <option value="🎡">🎡</option>
                  <option value="⚡">⚡</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Tagline</label>
              <input value={newTagline} onChange={(e) => setNewTagline(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Artwork</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {GAME_IMAGE_LIBRARY.map((img) => {
                  const selected = newImageUrl === img.url;
                  return (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setNewImageUrl(img.url)}
                      aria-pressed={selected}
                      title={img.label}
                      className={cn(
                        'relative aspect-video overflow-hidden rounded-lg transition-shadow',
                        selected ? 'ring-2 ring-[#16A34A] ring-offset-2' : 'ring-1 ring-[#E2E8E4] hover:ring-2 hover:ring-[#86D19A]',
                      )}
                    >
                      <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                      {selected && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-sm">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className={cn(textareaClass, 'min-h-[80px]')}
              />
            </div>
            <div>
              <label className={labelClass}>Reward</label>
              <input value={newReward} onChange={(e) => setNewReward(e.target.value)} className={inputClass} />
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};
