import React, { useState } from 'react';
import { Game, GameFormat } from '../../types/quiz';
import { FORMAT_LABELS } from '../../types/gameConfig';
import { Plus, X } from 'lucide-react';

interface GameSelectorModalProps {
  games: Game[];
  activeGameId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (gameId: string) => void;
  onCreateGame: (newGame: Game) => void;
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

export const GameSelectorModal: React.FC<GameSelectorModalProps> = ({
  games,
  activeGameId,
  isOpen,
  onClose,
  onSelectGame,
  onCreateGame,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFormat, setNewFormat] = useState<GameFormat>('pb-quiz');
  const [newIcon, setNewIcon] = useState('🥔');
  const [newReward, setNewReward] = useState('Special Discount Voucher');

  if (!isOpen) return null;

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
      description: newDescription || 'Multiplayer interactive game experience.',
      format: newFormat,
      icon: newIcon || '🎮',
      imageUrl: '/games/spud-trivia.jpg',
      status: 'active',
      isConfigured: true,
      activeQuizId: '',
      totalPlays: 0,
      totalWinners: 0,
      rewardType: newReward,
      createdAt: new Date().toISOString(),
    };

    onCreateGame(newGame);
    onSelectGame(newGame.id);
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-black p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E2E2]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">Multi-Game Platform</span>
            <h2 className="text-xl font-bold text-black tracking-tight">Select Active Game</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#6B6B6B] hover:text-black transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isCreating ? (
          <div className="space-y-4">
            <p className="text-xs text-[#6B6B6B]">
              Choose the game you want to manage. Each game has its own AI-generated content, rotation pool and player telemetry.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {games.map((g) => {
                const isSelected = g.id === activeGameId;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      onSelectGame(g.id);
                      onClose();
                    }}
                    className={`text-left p-4 border transition-all flex flex-col justify-between ${
                      isSelected ? 'border-black bg-[#F6F6F6] ring-2 ring-black' : 'border-[#E2E2E2] bg-white hover:border-black'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{g.icon}</span>
                          <span className="font-bold text-sm text-black">{g.name}</span>
                        </div>
                        {isSelected && <span className="bg-black text-white text-[9px] font-bold px-1.5 py-0.2 uppercase">CURRENT</span>}
                      </div>
                      <p className="text-xs font-semibold text-[#333333] mb-1">{g.tagline}</p>
                      <p className="text-[11px] text-[#6B6B6B] line-clamp-2">{g.description}</p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-[#E2E2E2] flex items-center justify-between text-[10px] text-[#545454]">
                      <span className="font-mono uppercase font-semibold">{g.format}</span>
                      <span>{g.totalPlays} plays</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-[#E2E2E2]">
              <span className="text-xs text-[#6B6B6B]">Need another game format?</span>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border border-black hover:bg-black hover:text-white transition-all text-black"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add New Game</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">Create New Game Experience</h3>
              <button type="button" onClick={() => setIsCreating(false)} className="text-xs text-[#6B6B6B] hover:text-black underline">
                Back to games list
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Game Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Potato Tower Defense Quiz"
                  className="w-full bg-white border border-[#E2E2E2] p-2 text-xs text-black focus:border-black focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Emoji Icon</label>
                <select
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="w-full bg-white border border-[#E2E2E2] p-2 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option value="🥔">🥔 Potato</option>
                  <option value="🍟">🍟 Fries</option>
                  <option value="🔥">🔥 Streak</option>
                  <option value="👨‍🍳">👨‍🍳 Chef</option>
                  <option value="🏆">🏆 Trophy</option>
                  <option value="⚡">⚡ Blitz</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Tagline</label>
              <input
                type="text"
                value={newTagline}
                onChange={(e) => setNewTagline(e.target.value)}
                placeholder="e.g. 15-Question Knockout Tournament"
                className="w-full bg-white border border-[#E2E2E2] p-2 text-xs text-black focus:border-black focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Game Format & Rules</label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value as GameFormat)}
                  className="w-full bg-white border border-[#E2E2E2] p-2 text-xs text-black focus:border-black focus:outline-none"
                >
                  {FORMAT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {FORMAT_LABELS[f]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Winner Reward Type</label>
                <input
                  type="text"
                  value={newReward}
                  onChange={(e) => setNewReward(e.target.value)}
                  placeholder="e.g. Free Order of Loaded Fries"
                  className="w-full bg-white border border-[#E2E2E2] p-2 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#333333] mb-1">Description</label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe how web users play and win this game..."
                className="w-full bg-white border border-[#E2E2E2] p-2 text-xs text-black focus:border-black focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E2E2]">
              <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-black">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-black text-white text-xs font-bold hover:bg-[#262626]">
                Create Game & Enter Admin Flow
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
