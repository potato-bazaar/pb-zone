import React, { useState } from 'react';
import { Quiz, GeneratorConfig, Game } from '../../types/quiz';
import { POTATO_TOPICS } from '../../data/potatoPresets';
import { aiQuizService } from '../../services/aiQuizService';
import { getGroqModel, hasGroqKey } from '../../services/groqClient';
import { Sparkles, Zap, Settings, ShieldCheck, WifiOff, Image } from 'lucide-react';

interface SetupQuizViewProps {
  activeGame?: Game | null;
  onQuizCreated: (newQuiz: Quiz) => void;
  onBatchCreated: (quizzes: Quiz[]) => void;
  onNavigateToManage: () => void;
  onOpenSettings: () => void;
}

export const SetupQuizView: React.FC<SetupQuizViewProps> = ({
  activeGame,
  onQuizCreated,
  onBatchCreated,
  onNavigateToManage,
  onOpenSettings,
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>('batch');
  const format = activeGame?.format || 'pb-quiz';
  const isWordScramble = format === 'word-scramble';
  const isPicture = format === 'picture-guess';
  const groqOn = hasGroqKey();
  const model = getGroqModel();

  const [selectedTopic, setSelectedTopic] = useState(POTATO_TOPICS[0].name);
  const [customPrompt, setCustomPrompt] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [tone, setTone] = useState<'fun' | 'educational' | 'competitive'>('fun');
  const [timeLimit, setTimeLimit] = useState(20);
  const [passThreshold, setPassThreshold] = useState(15);

  const [batchCount, setBatchCount] = useState(25);
  const [autoActivateRotation, setAutoActivateRotation] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deckNoun = isWordScramble ? 'Word Scramble deck' : isPicture ? 'Picture round deck' : '20-question quiz';

  const buildConfig = (): GeneratorConfig => ({
    topic: selectedTopic,
    subTheme: customPrompt || (isWordScramble ? 'Potato & Food Vocabulary' : isPicture ? 'Visual Spud Identification' : 'Curated Potato Highlights'),
    difficulty,
    tone,
    targetCount: 20,
    customPrompt,
    timeLimitPerQuestion: timeLimit,
    passThreshold,
  });

  const handleGenerateSingle = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setStatusMessage(`Generating ${deckNoun}...`);
    try {
      const quiz = await aiQuizService.generateDeckForGame(activeGame || null, buildConfig());
      onQuizCreated(quiz);
      onNavigateToManage();
    } catch (e) {
      console.error(e);
      setError((e as Error).message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBatch = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setStatusMessage(`Generating pool of ${batchCount} ${deckNoun}s for multi-player rotation...`);
    try {
      const pool = await aiQuizService.generateDeckPool(
        activeGame || null,
        buildConfig(),
        batchCount,
        autoActivateRotation,
        (msg, cur, total) => {
          setStatusMessage(msg);
          if (cur && total) setProgress({ current: cur, total });
        }
      );
      onBatchCreated(pool);
      onNavigateToManage();
    } catch (e) {
      console.error(e);
      setError((e as Error).message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-[#E2E2E2] pb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-black">
            {isWordScramble ? 'Setup Word Scramble Rounds' : isPicture ? 'Setup Picture Rounds' : 'Setup Quiz'}
          </h1>
          {isWordScramble && (
            <span className="bg-[#EDE9FE] text-[#6D28D9] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              Word Scramble (Wooden Tiles) Mode
            </span>
          )}
          {isPicture && (
            <span className="bg-[#EDE9FE] text-[#6D28D9] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              Guess the Potato (Picture) Mode
            </span>
          )}
        </div>
        <p className="text-xs text-[#6B6B6B] mt-1">
          {isWordScramble
            ? 'Configure Word Scramble decks with scrambled wooden letter tiles or generate a pool (up to 200 decks) so different players get different words.'
            : isPicture
            ? 'Configure picture-guessing decks. The AI writes each question, its four options and an image brief; you attach the photo URL in Manage Quiz.'
            : 'Configure individual 20-question challenges or generate a large pool (up to 200 quizzes) to serve diverse variants to different players.'}
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setMode('batch')}
            className={`px-4 py-2 text-xs font-semibold transition-all ${
              mode === 'batch' ? 'bg-black text-white' : 'bg-white text-black border border-[#E2E2E2] hover:border-black'
            }`}
          >
            Multiplayer Pool Generator (Up to 200 Decks)
          </button>
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 text-xs font-semibold transition-all ${
              mode === 'single' ? 'bg-black text-white' : 'bg-white text-black border border-[#E2E2E2] hover:border-black'
            }`}
          >
            Single 20-Round Setup
          </button>
        </div>
      </div>

      {/* Engine status */}
      <div
        className={`p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          groqOn ? 'bg-[#EBF7EE] border-[#0E8345]' : 'bg-[#FFFBEB] border-[#FDE68A]'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {groqOn ? <ShieldCheck className="h-4 w-4 text-[#0E8345] shrink-0 mt-0.5" /> : <WifiOff className="h-4 w-4 text-[#92400E] shrink-0 mt-0.5" />}
          <div className="text-xs">
            <div className={`font-bold ${groqOn ? 'text-[#0E8345]' : 'text-[#92400E]'}`}>
              {groqOn ? `Groq connected · ${model}` : 'Offline engine active'}
            </div>
            <div className={groqOn ? 'text-[#0E8345]/80' : 'text-[#92400E]/80'}>
              {groqOn
                ? 'Each deck is one Groq request. Decks that fail fall back to the offline engine automatically.'
                : 'Decks are assembled from the built-in verified question pools. Add a Groq key in Settings for fresh AI-written content.'}
            </div>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-black bg-white hover:bg-black hover:text-white transition-all self-start sm:self-auto"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>AI Settings</span>
        </button>
      </div>

      {isGenerating ? (
        <div className="bg-white border border-[#E2E2E2] p-12 text-center space-y-4">
          <div className="inline-block h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <h3 className="text-base font-bold text-black">{statusMessage}</h3>
          {progress && (
            <div className="max-w-md mx-auto space-y-1">
              <div className="h-2 bg-[#EEEEEE] overflow-hidden">
                <div className="h-full bg-black transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
              <div className="text-[11px] font-mono text-[#6B6B6B]">
                {progress.current} / {progress.total}
              </div>
            </div>
          )}
          <p className="text-xs text-[#6B6B6B]">
            {groqOn ? 'Waiting for Groq. Large pools take a while, each deck is a separate request.' : 'Assembling decks with verified answers, explanations and distractor sets...'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {mode === 'batch' && (
            <div className="bg-white border border-[#E2E2E2] p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2E2E2] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-black uppercase tracking-wider">Multi-Deck Pool Configuration</h3>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    Generate up to 200 unique decks so every player receives a fresh, non-repetitive game.
                  </p>
                </div>
                <span className="font-mono text-xs bg-[#EEEEEE] text-black font-bold px-2 py-1">Target: {batchCount} Decks</span>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase text-[#333333]">Number of decks to generate (1 to 200)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={200}
                    step={5}
                    value={batchCount}
                    onChange={(e) => setBatchCount(parseInt(e.target.value))}
                    className="w-full accent-black cursor-pointer h-2 bg-[#EEEEEE] rounded-lg"
                  />
                  <span className="font-mono text-lg font-bold text-black min-w-[3rem] text-right">{batchCount}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[10, 20, 50, 100, 150, 200].map((num) => (
                    <button
                      key={num}
                      onClick={() => setBatchCount(num)}
                      className={`px-3 py-1.5 text-xs font-mono font-medium border transition-colors ${
                        batchCount === num
                          ? 'bg-black text-white border-black font-bold'
                          : 'bg-white text-[#545454] border-[#E2E2E2] hover:border-black hover:text-black'
                      }`}
                    >
                      {num} Decks
                    </button>
                  ))}
                </div>
                {groqOn && batchCount > 20 && (
                  <p className="text-[11px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] p-2">
                    {batchCount} decks means {batchCount} Groq requests in sequence. Expect several minutes and possible rate limits; any
                    failed deck falls back to the offline engine.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1.5">Difficulty Distribution</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | 'mixed')}
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="mixed">Mixed (Balanced 20-Q)</option>
                    <option value="easy">Casual / Easy</option>
                    <option value="medium">Standard / Medium</option>
                    <option value="hard">Expert / Master</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1.5">Game Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as 'fun' | 'educational' | 'competitive')}
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="fun">Fun & Witty</option>
                    <option value="educational">Educational & Lore</option>
                    <option value="competitive">Fast Blitz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1.5">Player Rotation</label>
                  <label className="flex items-center gap-2 p-2.5 bg-[#F6F6F6] border border-[#E2E2E2] cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={autoActivateRotation}
                      onChange={(e) => setAutoActivateRotation(e.target.checked)}
                      className="accent-black"
                    />
                    <span className="font-semibold text-black">Auto-add to active player pool</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E2E2] flex items-center justify-between">
                <p className="text-xs text-[#6B6B6B]">
                  Generates <strong>{batchCount * 20} rounds</strong> across {batchCount} distinct deck packages.
                </p>
                <button
                  onClick={handleGenerateBatch}
                  className="px-6 py-3 bg-black text-white text-xs font-bold hover:bg-[#262626] transition-all flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Generate Pool of {batchCount} Decks</span>
                </button>
              </div>
            </div>
          )}

          {/* Topic */}
          <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              {isWordScramble ? 'Select Vocabulary Theme' : isPicture ? 'Select Picture Theme' : 'Select Primary Potato Topic'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {POTATO_TOPICS.map((topic) => {
                const isSelected = selectedTopic === topic.name;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.name)}
                    className={`text-left p-4 border transition-all ${
                      isSelected ? 'bg-black text-white border-black' : 'bg-white text-black border-[#E2E2E2] hover:border-black'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{topic.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 font-mono uppercase ${
                          isSelected ? 'bg-white text-black font-bold' : 'bg-[#EEEEEE] text-[#545454]'
                        }`}
                      >
                        20 Rounds
                      </span>
                    </div>
                    <p className={`text-[11px] line-clamp-2 ${isSelected ? 'text-[#CCCCCC]' : 'text-[#6B6B6B]'}`}>{topic.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold uppercase text-[#333333] mb-1.5">Custom Focus / Tone Notes (Optional)</label>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={
                  isWordScramble
                    ? 'e.g. Only potato dish names, 6 to 9 letters, no plurals...'
                    : isPicture
                    ? 'e.g. Focus on street food close-ups and colourful heirloom varieties...'
                    : 'e.g. Emphasize world records, culinary history, and sweet potato comparisons...'
                }
                className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
              />
            </div>

            {isPicture && (
              <div className="flex items-start gap-2 p-3 bg-[#F6F6F6] border border-[#E2E2E2] text-[11px] text-[#545454]">
                <Image className="h-4 w-4 shrink-0 mt-0.5 text-black" />
                <span>
                  Groq cannot produce photos. Each round arrives with an <strong className="text-black">image brief</strong>; open the
                  question in Manage Quiz, paste a picture URL or pick one from the game artwork library.
                </span>
              </div>
            )}
          </div>

          {mode === 'single' && (
            <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1.5">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | 'mixed')}
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="mixed">Mixed (Balanced)</option>
                    <option value="easy">Casual / Easy</option>
                    <option value="medium">Standard / Medium</option>
                    <option value="hard">Expert / Master</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1.5">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as 'fun' | 'educational' | 'competitive')}
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="fun">Fun & Witty</option>
                    <option value="educational">Educational / Lore</option>
                    <option value="competitive">Fast & Competitive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1.5">Time / Round</label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value={15}>15 Seconds (Blitz)</option>
                    <option value={20}>20 Seconds (Standard)</option>
                    <option value={30}>30 Seconds (Relaxed)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#333333] mb-1.5">Pass Threshold</label>
                  <select
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#E2E2E2] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value={14}>14 / 20 (70%)</option>
                    <option value={15}>15 / 20 (75%)</option>
                    <option value={16}>16 / 20 (80%)</option>
                    <option value={18}>18 / 20 (90%)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-[#E2E2E2]">
                <div className="text-xs text-[#6B6B6B]">
                  Generates a single {deckNoun} on <strong className="text-black">{selectedTopic}</strong>.
                </div>
                <button
                  onClick={handleGenerateSingle}
                  className="px-6 py-3 bg-black text-white text-xs font-bold hover:bg-[#262626] transition-all flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate 20 Rounds</span>
                </button>
              </div>
            </div>
          )}

          {error && <div className="p-3 border border-[#C62828] bg-[#FCEBEB] text-xs text-[#C62828]">{error}</div>}
        </div>
      )}
    </div>
  );
};
