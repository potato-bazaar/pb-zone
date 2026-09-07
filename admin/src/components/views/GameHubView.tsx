import React, { useState } from 'react';
import { Game, GameFormat } from '../../types/quiz';
import { CONFIG_LABELS, FORMAT_LABELS, getGameKind, isConfigKind } from '../../types/gameConfig';
import { GAME_IMAGE_LIBRARY } from '../../data/gameConfigCatalog';
import { Plus, ArrowRight } from 'lucide-react';

interface GameHubViewProps {
  games: Game[];
  activeGameId: string;
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

export const GameHubView: React.FC<GameHubViewProps> = ({
  games,
  activeGameId,
  onSelectGame,
  onCreateGame,
  getQuizCountForGame,
  getRotationCountForGame,
  getConfigCountForGame,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFormat, setNewFormat] = useState<GameFormat>('pb-quiz');
  const [newIcon, setNewIcon] = useState('🥔');
  const [newImageUrl, setNewImageUrl] = useState('/games/spud-trivia.jpg');
  const [newReward, setNewReward] = useState('Exclusive Discount Voucher');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const gameId = `game-${Date.now()}`;
    const slug = newName.toLowerCase().replace(/\s+/g, '-');
    const newGame: Game = {
      id: gameId,
      name: newName,
      slug,
      tagline: newTagline || 'Custom Game Mode',
      description: newDescription || 'Interactive AI game experience.',
      format: newFormat,
      icon: newIcon || '🎮',
      imageUrl: newImageUrl || '/games/spud-trivia.jpg',
      status: 'active',
      isConfigured: true,
      activeQuizId: '',
      totalPlays: 0,
      totalWinners: 0,
      rewardType: newReward,
      createdAt: new Date().toISOString(),
    };

    onCreateGame(newGame);
    setIsCreating(false);
  };

  const contentNoun = (game: Game, count: number) => {
    const kind = getGameKind(game.format);
    if (!isConfigKind(kind)) return `${count} Deck${count === 1 ? '' : 's'} Configured`;
    const labels = CONFIG_LABELS[kind];
    return `${count} ${count === 1 ? labels.pack : labels.packs} Configured`;
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="border-b border-[#E2E2E2] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 font-mono">
              PB Zone Gaming Network
            </span>
            <span className="text-xs text-[#6B6B6B]">Multi-Game Architecture</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black">Game Selection Directory</h1>
          <p className="text-xs text-[#6B6B6B] mt-1 max-w-2xl leading-relaxed">
            Select the game you want to manage. Quiz games run on AI-generated decks; <strong>Potato Crush</strong>,{' '}
            <strong>Spin the Potato</strong> and <strong>Potato Rush</strong> run on AI-designed level packs, prize wheels and run
            packs that you tune by hand.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-5 py-3 bg-black text-white text-xs font-bold hover:bg-[#262626] transition-all self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Game</span>
        </button>
      </div>

      {/* Grid of game cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {games.map((game) => {
          const isCurrentActive = game.id === activeGameId;
          const kind = getGameKind(game.format);
          const contentCount = isConfigKind(kind) ? getConfigCountForGame(game.id) : getQuizCountForGame(game.id);
          const poolCount = getRotationCountForGame(game.id);
          const isConfigured = game.isConfigured !== false && contentCount > 0;

          return (
            <div
              key={game.id}
              className={`group bg-white border transition-all flex flex-col justify-between ${
                isCurrentActive ? 'border-black ring-2 ring-black shadow-lg' : 'border-[#E2E2E2] hover:border-black hover:shadow-md'
              }`}
            >
              <div>
                <div className="relative aspect-video w-full overflow-hidden bg-black border-b border-[#E2E2E2]">
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                    <span className="bg-black/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider backdrop-blur-sm">
                      {FORMAT_LABELS[game.format] || 'Game Engine'}
                    </span>
                    {isCurrentActive && (
                      <span className="bg-[#0E8345] text-white font-mono text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                        ● CURRENT ACTIVE
                      </span>
                    )}
                    {!isConfigured && (
                      <span className="bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-mono text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">
                        NOT CONFIGURED YET
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/90 text-white text-xs px-2.5 py-1 font-mono font-bold backdrop-blur-sm">
                    {isConfigured ? `${poolCount} in Player Pool` : 'Config: Empty'}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{game.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-black group-hover:underline">{game.name}</h3>
                        {!isConfigured && (
                          <span className="bg-[#F3F4F6] text-[#4B5563] text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase">
                            Needs Setup
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#545454]">{game.tagline}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#6B6B6B] leading-relaxed line-clamp-2">{game.description}</p>

                  <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="px-2.5 py-1 bg-[#F6F6F6] border border-[#E2E2E2] text-[#333333] font-medium">
                      🏆 <strong>Reward:</strong> {game.rewardType}
                    </span>
                    {isConfigured ? (
                      <>
                        <span className="px-2.5 py-1 bg-[#F6F6F6] border border-[#E2E2E2] text-[#333333] font-mono">
                          🎮 {game.totalPlays.toLocaleString()} Plays
                        </span>
                        <span className="px-2.5 py-1 bg-[#F6F6F6] border border-[#E2E2E2] text-[#333333] font-mono">
                          {isConfigKind(kind) ? CONFIG_LABELS[kind].emoji : '📚'} {contentNoun(game, contentCount)}
                        </span>
                      </>
                    ) : (
                      <span className="px-2.5 py-1 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] font-bold">
                        ⚡ Generate the first {isConfigKind(kind) ? CONFIG_LABELS[kind].pack.toLowerCase() : 'deck'} with AI
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  onClick={() => onSelectGame(game.id)}
                  className={`w-full py-3 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isCurrentActive
                      ? 'bg-black text-white hover:bg-[#262626]'
                      : 'bg-white border border-black text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <span>
                    {isConfigured
                      ? isCurrentActive
                        ? 'Manage Game Flow & Content'
                        : 'Select & Manage Game'
                      : isCurrentActive
                      ? 'Open Setup'
                      : 'Select & Configure'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create New Game Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-black p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E2E2]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">Game Architect</span>
                <h2 className="text-xl font-bold text-black">Create New Game Experience</h2>
              </div>
              <button onClick={() => setIsCreating(false)} className="text-xs text-[#6B6B6B] hover:text-black font-semibold">
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Game Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Sweet Potato Botanical Quest"
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Emoji Icon</label>
                  <select
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="🥔">🥔 Potato</option>
                    <option value="🍟">🍟 Fries</option>
                    <option value="🔥">🔥 Streak</option>
                    <option value="👨‍🍳">👨‍🍳 Chef</option>
                    <option value="🏆">🏆 Trophy</option>
                    <option value="⚡">⚡ Blitz</option>
                    <option value="🧩">🧩 Puzzle</option>
                    <option value="🎡">🎡 Wheel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Tagline / Hook</label>
                <input
                  type="text"
                  value={newTagline}
                  onChange={(e) => setNewTagline(e.target.value)}
                  placeholder="e.g. 20 Botanical Questions with Nightshade Facts"
                  className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Select Game Artwork Banner</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {GAME_IMAGE_LIBRARY.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => setNewImageUrl(img.url)}
                      className={`relative aspect-video border overflow-hidden p-0.5 ${
                        newImageUrl === img.url ? 'border-black ring-2 ring-black' : 'border-[#E2E2E2]'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[9px] px-1 font-mono">{img.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Game Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as GameFormat)}
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    {FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {FORMAT_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#6B6B6B] mt-1">
                    The format decides which AI configuration engine the game uses.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Prize / Reward Voucher</label>
                  <input
                    type="text"
                    value={newReward}
                    onChange={(e) => setNewReward(e.target.value)}
                    placeholder="e.g. Free Loaded Fries Voucher"
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Game Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explain the rules and how players qualify for rewards..."
                  className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E2E2]">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-black">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-black text-white text-xs font-bold hover:bg-[#262626]">
                  Create Game & Launch Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
