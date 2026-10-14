import React, { useState } from 'react';
import { Game, GameFormat } from '../../types/quiz';
import { FORMAT_LABELS } from '../../types/gameConfig';
import { ArrowLeft, Plus } from 'lucide-react';
import { GAME_VISUALS } from '../dashboard/gameVisuals';
import { Button, ModalShell, Pill, inputClass, labelClass, selectClass, textareaClass } from '../ui/pb';
import { cn } from '../../lib/utils';

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

const CREATE_FORM_ID = 'game-selector-create-form';

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
    <ModalShell
      onClose={onClose}
      size="lg"
      title={
        <>
          <span className="block text-xs font-bold uppercase tracking-wide text-[#16A34A]">Multi-Game Platform</span>
          Select Active Game
        </>
      }
      footer={
        !isCreating ? (
          <>
            <span className="mr-auto text-sm text-[#64748B]">Need another game format?</span>
            <Button variant="secondary" size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Game</span>
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" form={CREATE_FORM_ID}>
              Create Game & Enter Admin Flow
            </Button>
          </>
        )
      }
    >
      {!isCreating ? (
        <div className="space-y-4">
          <p className="text-sm text-[#5F6F83]">
            Choose the game you want to manage. Each game has its own AI-generated content, rotation pool and player telemetry.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {games.map((g) => {
              const isSelected = g.id === activeGameId;
              const icon = GAME_VISUALS[g.format]?.icon;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onSelectGame(g.id);
                    onClose();
                  }}
                  className={cn(
                    'flex flex-col justify-between rounded-xl border p-4 text-left transition-colors',
                    isSelected
                      ? 'border-[#16A34A] bg-[#F3FBF5] ring-4 ring-[#16A34A]/10'
                      : 'border-[#E6ECE8] bg-white hover:border-[#86D19A] hover:bg-[#FAFCFB]',
                  )}
                >
                  <div>
                    <div className="flex items-start gap-3">
                      {icon ? (
                        <img src={icon} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-sm" />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF2DD] text-2xl">
                          {g.icon || '🎮'}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 truncate text-sm font-bold text-[#0B1220]">{g.name}</span>
                          {isSelected && (
                            <Pill tone="green" dot>
                              Current
                            </Pill>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-[#334155]">{g.tagline}</p>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#64748B]">{g.description}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EEF2F6] pt-3 text-xs text-[#475569]">
                    <span className="truncate rounded-md bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[11px] font-semibold">{g.format}</span>
                    <span className="shrink-0 tabular-nums">{g.totalPlays} plays</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <form id={CREATE_FORM_ID} onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#0B1220]">Create New Game Experience</h3>
            <Button variant="ghost" size="xs" onClick={() => setIsCreating(false)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to games list
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <label className={labelClass}>Game Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Potato Tower Defense Quiz"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Emoji Icon</label>
              <select value={newIcon} onChange={(e) => setNewIcon(e.target.value)} className={selectClass}>
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
            <label className={labelClass}>Tagline</label>
            <input
              type="text"
              value={newTagline}
              onChange={(e) => setNewTagline(e.target.value)}
              placeholder="e.g. 15-Question Knockout Tournament"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className={labelClass}>Game Format & Rules</label>
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
              <label className={labelClass}>Winner Reward Type</label>
              <input
                type="text"
                value={newReward}
                onChange={(e) => setNewReward(e.target.value)}
                placeholder="e.g. Free Order of Loaded Fries"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe how web users play and win this game..."
              className={textareaClass}
            />
          </div>
        </form>
      )}
    </ModalShell>
  );
};
