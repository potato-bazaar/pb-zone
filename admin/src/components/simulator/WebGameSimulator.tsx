import React, { useState, useEffect } from 'react';
import { Quiz, QuizQuestion, WinnerRecord } from '../../types/quiz';
import { storageService } from '../../services/storageService';
import confetti from 'canvas-confetti';
import { 
  Clock, 
  Check, 
  X, 
  ArrowRight, 
  ArrowLeft,
  Trophy, 
  Gift, 
  Home, 
  Gamepad2, 
  Receipt, 
  User, 
  Sparkles, 
  Delete, 
  Shuffle,
  ChevronRight,
  Award
} from 'lucide-react';

interface WebGameSimulatorProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  onGameCompleted?: () => void;
}

export const WebGameSimulator: React.FC<WebGameSimulatorProps> = ({
  quiz,
  isOpen,
  onClose,
  onGameCompleted,
}) => {
  // Mobile App screen state ('home' matches the user's screenshot, 'game' is playable puzzle)
  const [simScreen, setSimScreen] = useState<'home' | 'game' | 'leaderboard' | 'rewards'>('home');
  const [coins, setCoins] = useState(4000);
  const [dailyClaimed, setDailyClaimed] = useState(false);

  // Gameplay state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimitSeconds || 25);
  const [isGameOver, setIsGameOver] = useState(false);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [recordedWinner, setRecordedWinner] = useState(false);

  // Word Scramble state
  const [placedLetters, setPlacedLetters] = useState<{ id: number; char: string }[]>([]);
  const [availableTiles, setAvailableTiles] = useState<{ id: number; char: string; used: boolean }[]>([]);
  const [scrambleError, setScrambleError] = useState(false);

  const currentQ = quiz.questions[currentIndex];
  const isWordScramble = Boolean(currentQ?.targetWord && currentQ?.scrambledLetters);
  const isWinner = score >= quiz.passScore;

  // Initialize round
  const initRound = (q: QuizQuestion) => {
    setSelectedOptionId(null);
    setHasAnswered(false);
    setTimeLeft(q.timeLimitSeconds || 25);
    setScrambleError(false);

    if (q.targetWord && q.scrambledLetters) {
      setPlacedLetters([]);
      setAvailableTiles(
        q.scrambledLetters.map((char, idx) => ({
          id: idx,
          char,
          used: false,
        }))
      );
    }
  };

  // Reset state on modal open
  useEffect(() => {
    if (isOpen && quiz.questions.length > 0) {
      setSimScreen('home');
      setCurrentIndex(0);
      setScore(0);
      setIsGameOver(false);
      setTotalTimeSpent(0);
      setRecordedWinner(false);
      initRound(quiz.questions[0]);
    }
  }, [isOpen, quiz]);

  // Timer countdown during game
  useEffect(() => {
    if (!isOpen || simScreen !== 'game' || isGameOver || hasAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
      setTotalTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, simScreen, isGameOver, hasAnswered, currentIndex]);

  const handleTimeOut = () => {
    setHasAnswered(true);
    if (!isWordScramble) {
      setSelectedOptionId('TIMEOUT');
    }
  };

  const handleClaimDailyBonus = () => {
    if (dailyClaimed) return;
    setDailyClaimed(true);
    setCoins((prev) => prev + 100);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleStartGame = () => {
    setSimScreen('game');
    setCurrentIndex(0);
    setScore(0);
    setIsGameOver(false);
    setTotalTimeSpent(0);
    setRecordedWinner(false);
    if (quiz.questions.length > 0) {
      initRound(quiz.questions[0]);
    }
  };

  // Handle Trivia Option click
  const handleSelectOption = (optionId: string) => {
    if (hasAnswered || isWordScramble) return;
    setSelectedOptionId(optionId);
    setHasAnswered(true);

    const isCorrect = currentQ?.options.find((o) => o.id === optionId)?.isCorrect;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  // Handle Word Scramble Tile click
  const handleTileClick = (tile: { id: number; char: string; used: boolean }) => {
    if (hasAnswered || tile.used) return;

    const nextPlaced = [...placedLetters, { id: tile.id, char: tile.char }];
    setPlacedLetters(nextPlaced);
    setAvailableTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, used: true } : t)));
    setScrambleError(false);

    // If all letters placed, check word
    if (currentQ?.targetWord && nextPlaced.length === currentQ.targetWord.length) {
      const spelled = nextPlaced.map((p) => p.char).join('');
      if (spelled.toUpperCase() === currentQ.targetWord.toUpperCase()) {
        // Correct!
        setScore((prev) => prev + 1);
        setHasAnswered(true);
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      } else {
        // Incorrect
        setScrambleError(true);
      }
    }
  };

  // Remove letter from placed slots
  const handleRemovePlacedLetter = (item: { id: number; char: string }, index: number) => {
    if (hasAnswered) return;
    setPlacedLetters((prev) => prev.filter((_, idx) => idx !== index));
    setAvailableTiles((prev) => prev.map((t) => (t.id === item.id ? { ...t, used: false } : t)));
    setScrambleError(false);
  };

  // Shuffle available tiles
  const handleShuffleTiles = () => {
    if (hasAnswered) return;
    setAvailableTiles((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  // Clear placed tiles
  const handleClearTiles = () => {
    if (hasAnswered) return;
    setPlacedLetters([]);
    setAvailableTiles((prev) => prev.map((t) => ({ ...t, used: false })));
    setScrambleError(false);
  };

  // Next question
  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      initRound(quiz.questions[nextIdx]);
    } else {
      setIsGameOver(true);
      if (score >= quiz.passScore) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleRecordSimulatedWinner = () => {
    const finalScore = score;
    const percentage = Math.round((finalScore / quiz.questions.length) * 100);
    const tier: 'Grand Spud Master' | 'Golden Crispy' | 'Tater Prodigy' =
      percentage === 100
        ? 'Grand Spud Master'
        : percentage >= 85
        ? 'Golden Crispy'
        : 'Tater Prodigy';

    const simulatedWinner: WinnerRecord = {
      id: `win-sim-${Date.now()}`,
      quizId: quiz.id,
      quizTitle: quiz.title,
      playerName: 'Potato Player (Mobile App)',
      avatar: '🥔',
      score: finalScore,
      totalQuestions: quiz.questions.length,
      percentage,
      timeSpentSeconds: totalTimeSpent,
      completedAt: new Date().toISOString(),
      prizeClaimed: false,
      prizeTier: tier,
      rewardVoucherCode: `PB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    };

    storageService.addWinner(simulatedWinner);
    setRecordedWinner(true);
    if (onGameCompleted) onGameCompleted();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Mobile Device Frame Container */}
      <div className="relative w-full max-w-[390px] bg-[#F8F9FA] rounded-[42px] border-[10px] border-black shadow-2xl overflow-hidden my-4 flex flex-col font-sans select-none">
        
        {/* Mobile Status Bar Notch & Close */}
        <div className="bg-black text-white px-6 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-mono shrink-0">
          <span>9:41</span>
          <div className="h-4 w-24 bg-[#1A1A1A] rounded-full mx-auto" />
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 font-bold text-xs"
            title="Close Simulator"
          >
            ✕
          </button>
        </div>

        {/* Mobile App Top Header (Matches User Screenshot) */}
        <div className="px-4 py-2.5 flex items-center justify-between bg-white border-b border-[#F0F0F0] shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Cute 3D Potato Avatar */}
            <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-purple-200 bg-amber-50 shadow-sm flex items-center justify-center">
              <img
                src="/games/word-scramble.jpg"
                alt="Potato Player"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-xl">🥔</span>
            </div>
            <div>
              <div className="font-extrabold text-[13px] text-black leading-tight">
                Hi, Potato Player!
              </div>
              <span className="inline-block bg-[#EDE9FE] text-[#6D28D9] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                PB Rookie
              </span>
            </div>
          </div>

          {/* Coin balance pill with gold coin */}
          <div className="flex items-center gap-1.5 bg-white border border-[#F3F4F6] shadow-sm px-3 py-1 rounded-full text-xs font-black text-black font-mono">
            <span className="flex h-4 w-4 rounded-full bg-amber-400 items-center justify-center text-[10px] text-amber-900 shadow-inner font-bold">
              🪙
            </span>
            <span>{coins.toLocaleString()}</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: HOME SCREEN (FAITHFUL TO USER SCREENSHOT)              */}
        {/* ============================================================== */}
        {simScreen === 'home' && (
          <div className="flex-1 p-4 space-y-4 max-h-[580px] overflow-y-auto bg-[#F8F9FA]">
            
            {/* Banner 1: Become the PB Champion */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E2761] via-[#1B357A] to-[#16215B] p-5 text-white shadow-lg">
              {/* Confetti sprinkles */}
              <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#F59E0B_1px,transparent_1px),radial-gradient(#EC4899_1px,transparent_1px)] bg-[size:16px_16px] bg-[position:0_0,8px_8px]" />
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-1 max-w-[190px]">
                  <div className="text-xs font-semibold text-white/90 leading-tight">
                    Become the
                  </div>
                  <div className="text-xl font-black text-[#FBBF24] tracking-tight drop-shadow-sm">
                    PB Champion
                  </div>
                  <p className="text-[10px] text-white/80 leading-snug pt-0.5">
                    Play games, collect points, climb ranks & win rewards!
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={() => setSimScreen('leaderboard')}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-full text-[11px] font-black shadow-md transition-all active:scale-95"
                    >
                      <span>View Leaderboard</span>
                      <ChevronRight className="h-3 w-3 stroke-[3]" />
                    </button>
                  </div>
                </div>

                {/* 3D Golden Trophy */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="h-24 w-24 rounded-2xl flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
                    <span className="text-6xl drop-shadow-lg filter">🏆</span>
                    <span className="absolute bottom-2 bg-amber-400 text-amber-950 font-black text-[9px] px-1.5 py-0.2 rounded font-mono shadow-sm">
                      PB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner 2: Daily Bonus Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#E5E7EB] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl shadow-sm shrink-0">
                  🎁
                </div>
                <div>
                  <div className="font-extrabold text-xs text-black">
                    Daily Bonus
                  </div>
                  <div className="text-[10px] text-[#6B6B6B] leading-tight">
                    Play any game to claim your daily bonus!
                  </div>
                </div>
              </div>

              <button
                onClick={handleClaimDailyBonus}
                disabled={dailyClaimed}
                className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                  dailyClaimed
                    ? 'bg-[#E5E7EB] text-[#6B6B6B] cursor-default'
                    : 'bg-white border border-[#D1D5DB] text-black hover:border-black active:scale-95'
                }`}
              >
                {!dailyClaimed && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
                <span>{dailyClaimed ? 'Claimed' : 'Claim'}</span>
              </button>
            </div>

            {/* Explore Games Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="font-black text-sm text-black">Explore Games</h2>
                <button
                  onClick={() => setSimScreen('leaderboard')}
                  className="text-xs font-semibold text-[#6B6B6B] hover:text-black"
                >
                  See All
                </button>
              </div>

              {/* Featured Game Card: WORD SCRAMBLE (Exact Match from User's Screenshot) */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#C8E6C9] via-[#E8F5E9] to-[#C8E6C9] border border-[#A5D6A7] p-4 text-black shadow-md">
                
                {/* Featured Game Pill Badge */}
                <div className="inline-block bg-[#86EFAC] text-[#14532D] text-[10px] font-black px-2.5 py-0.5 rounded-full mb-1 shadow-sm">
                  Featured Game
                </div>

                <div className="flex items-start justify-between">
                  <div className="space-y-1 max-w-[170px] z-10">
                    <h3 className="text-xl font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] leading-tight">
                      Word Scramble
                    </h3>
                    <p className="text-[11px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                      Unscramble the words!
                    </p>

                    {/* Wooden Scrabble Letter Tiles P A T O */}
                    <div className="pt-2 pb-1">
                      <div className="flex items-center gap-1.5">
                        {['P', 'A', 'T', 'O'].map((letter, lIdx) => (
                          <div
                            key={lIdx}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DEB887] border-2 border-[#8B4513] text-[#5C2E0B] font-mono font-black text-sm shadow-md"
                          >
                            {letter}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleStartGame}
                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-full text-xs font-black shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                      >
                        <span>Play Now</span>
                      </button>
                    </div>
                  </div>

                  {/* Cute 3D Mascot Potato standing next to tiles */}
                  <div className="relative shrink-0 -mr-2 -mt-1">
                    <div className="h-32 w-32 rounded-2xl overflow-hidden flex items-center justify-center">
                      <img
                        src="/games/word-scramble.jpg"
                        alt="Word Scramble Mascot"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Carousel indicator dots (4 dots with 2nd dot active) */}
              <div className="flex justify-center items-center gap-1.5 pt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[#D1D5DB]" />
                <div className="h-1.5 w-4 rounded-full bg-[#6D28D9]" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#D1D5DB]" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#D1D5DB]" />
              </div>
            </div>

            {/* Quick Play Shortcut Card for Admin Testing */}
            <div className="p-3 bg-white rounded-2xl border border-[#E5E7EB] text-center space-y-1">
              <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">
                PB Zone Active Deck
              </span>
              <p className="text-xs font-bold text-black truncate">
                {quiz.title} ({quiz.questions.length} Rounds)
              </p>
              <button
                onClick={handleStartGame}
                className="w-full py-1.5 text-[11px] font-bold text-[#6D28D9] bg-[#EDE9FE] rounded-lg hover:bg-[#DDD6FE]"
              >
                Launch Simulator In-Game Test →
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: PLAYABLE WORD SCRAMBLE / TRIVIA GAMEPLAY               */}
        {/* ============================================================== */}
        {simScreen === 'game' && (
          <div className="flex-1 p-4 space-y-3.5 max-h-[580px] overflow-y-auto bg-[#F8F9FA]">
            
            {/* In-Game Navigation Header */}
            <div className="flex items-center justify-between pb-1 border-b border-[#E5E7EB]">
              <button
                onClick={() => setSimScreen('home')}
                className="flex items-center gap-1 text-xs font-bold text-[#6B6B6B] hover:text-black"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Home</span>
              </button>
              
              <div className="text-xs font-mono font-black text-black">
                Round {currentIndex + 1} / {quiz.questions.length}
              </div>

              <div className="flex items-center gap-1 font-mono text-xs font-bold text-black">
                <Clock className="h-3.5 w-3.5" /> {timeLeft}s
              </div>
            </div>

            {!isGameOver && currentQ ? (
              <div className="space-y-3.5">
                {/* Timer bar */}
                <div className="h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6D28D9] transition-all duration-1000"
                    style={{ width: `${(timeLeft / (currentQ.timeLimitSeconds || 25)) * 100}%` }}
                  />
                </div>

                {/* Game Clue Card */}
                <div className="p-3.5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#6D28D9] bg-[#EDE9FE] px-2 py-0.5 rounded-full">
                      {isWordScramble ? 'Word Scramble' : currentQ.topicTag}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#6B6B6B]">
                      {currentQ.difficulty}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-black leading-snug">
                    {currentQ.question}
                  </h3>
                </div>

                {/* WORD SCRAMBLE INTERACTIVE MODE (Matches User Screenshot) */}
                {isWordScramble && currentQ.targetWord && (
                  <div className="space-y-3 text-center">
                    
                    {/* Potato Mascot Animation Image */}
                    <div className="flex justify-center">
                      <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-[#E5E7EB] shadow-sm bg-white">
                        <img
                          src="/games/word-scramble.jpg"
                          alt="Potato Mascot"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Target Word Answer Slots */}
                    <div>
                      <div className="text-[10px] uppercase font-extrabold tracking-wider text-[#6B6B6B] mb-1.5">
                        Your Answer ({placedLetters.length}/{currentQ.targetWord.length} letters):
                      </div>
                      <div className="flex justify-center flex-wrap gap-1.5 min-h-[44px]">
                        {currentQ.targetWord.split('').map((_, idx) => {
                          const placed = placedLetters[idx];
                          return (
                            <button
                              key={idx}
                              onClick={() => placed && handleRemovePlacedLetter(placed, idx)}
                              disabled={hasAnswered}
                              className={`flex h-11 w-11 items-center justify-center rounded-xl font-mono font-black text-lg transition-all ${
                                placed
                                  ? hasAnswered
                                    ? 'bg-[#0E8345] text-white shadow-sm'
                                    : scrambleError
                                    ? 'bg-[#C62828] text-white animate-bounce'
                                    : 'bg-black text-white shadow-sm'
                                  : 'bg-white border-2 border-dashed border-[#D1D5DB] text-transparent'
                              }`}
                            >
                              {placed ? placed.char : '_'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Error / Feedback indicator */}
                    {scrambleError && (
                      <div className="text-xs font-bold text-[#C62828] animate-fade-in">
                        Not quite! Tap a letter to remove or clear.
                      </div>
                    )}

                    {/* Available Scrambled Letter Wooden Tiles */}
                    {!hasAnswered && (
                      <div className="space-y-2 pt-1">
                        <div className="text-[10px] uppercase font-bold text-[#6B6B6B]">
                          Tap wooden tiles to unscramble:
                        </div>
                        <div className="flex justify-center flex-wrap gap-2">
                          {availableTiles.map((tile) => (
                            <button
                              key={tile.id}
                              onClick={() => handleTileClick(tile)}
                              disabled={tile.used}
                              className={`flex h-11 w-11 items-center justify-center rounded-xl font-mono font-black text-base transition-all shadow-sm ${
                                tile.used
                                  ? 'opacity-20 pointer-events-none bg-[#E5E7EB] border border-[#D1D5DB] text-transparent'
                                  : 'bg-[#FEF3C7] border-2 border-[#D97706] text-[#78350F] hover:bg-[#FDE68A] active:scale-95'
                              }`}
                            >
                              {tile.char}
                            </button>
                          ))}
                        </div>

                        {/* Controls: Clear & Shuffle */}
                        <div className="flex justify-center gap-2 pt-2">
                          <button
                            onClick={handleClearTiles}
                            className="flex items-center gap-1 text-[11px] font-bold text-[#6B6B6B] hover:text-black px-2.5 py-1 bg-white border border-[#E5E7EB] rounded-lg"
                          >
                            <Delete className="h-3 w-3" /> Clear
                          </button>
                          <button
                            onClick={handleShuffleTiles}
                            className="flex items-center gap-1 text-[11px] font-bold text-[#6B6B6B] hover:text-black px-2.5 py-1 bg-white border border-[#E5E7EB] rounded-lg"
                          >
                            <Shuffle className="h-3 w-3" /> Shuffle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TRIVIA MULTIPLE CHOICE / PICTURE GUESSING MODE */}
                {!isWordScramble && (
                  <div className="space-y-3">
                    {/* Picture Clue for "Guess the Potato" */}
                    {currentQ.pictureUrl && (
                      <div className="relative h-40 w-full rounded-2xl overflow-hidden border border-[#E5E7EB] bg-black shadow-sm">
                        <img
                          src={currentQ.pictureUrl}
                          alt="Picture Clue"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black/80 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase backdrop-blur-sm flex items-center gap-1">
                          <span>🔍</span>
                          <span>Picture Clue</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                    {currentQ.options.map((opt) => {
                      const isSelected = selectedOptionId === opt.id;
                      let style = 'bg-white border-[#E5E7EB] text-black hover:border-black';

                      if (hasAnswered) {
                        if (opt.isCorrect) {
                          style = 'bg-black text-white border-black font-bold';
                        } else if (isSelected && !opt.isCorrect) {
                          style = 'bg-[#FCEBEB] border-[#C62828] text-[#C62828]';
                        } else {
                          style = 'bg-[#F9FAFB] border-[#E5E7EB] text-[#9CA3AF]';
                        }
                      }

                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          disabled={hasAnswered}
                          className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${style}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                                hasAnswered && opt.isCorrect
                                  ? 'bg-white text-black'
                                  : 'bg-[#F3F4F6] text-[#4B5563]'
                              }`}
                            >
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {hasAnswered && opt.isCorrect && (
                            <Check className="h-4 w-4 stroke-[3]" />
                          )}
                        </button>
                      );
                    })}
                    </div>
                  </div>
                )}

                {/* Solved Explanation Box */}
                {hasAnswered && (
                  <div className="p-3 bg-white rounded-xl border border-[#E5E7EB] text-xs space-y-1 animate-fade-in shadow-sm">
                    <div className="font-black text-[#0E8345] flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Solved: {currentQ.targetWord || 'Correct Answer'}</span>
                    </div>
                    <p className="text-[#4B5563] text-[11px] leading-relaxed">
                      {currentQ.explanation}
                    </p>
                    {currentQ.funFact && (
                      <p className="text-[#6D28D9] text-[11px] pt-1 border-t border-[#F3F4F6] font-medium">
                        💡 {currentQ.funFact}
                      </p>
                    )}
                  </div>
                )}

                {/* Next Question Control */}
                {hasAnswered && (
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-2xl text-xs font-black shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>
                      {currentIndex === quiz.questions.length - 1 ? 'Finish Challenge' : 'Next Word'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              /* Game Over Screen */
              <div className="text-center py-6 space-y-4 animate-scale-in">
                <div className="inline-block p-4 bg-[#EDE9FE] rounded-full text-4xl">
                  {isWinner ? '🏆' : '🥔'}
                </div>

                <div>
                  <h3 className="text-lg font-black text-black">
                    {isWinner ? 'PB Champion Victory!' : 'Challenge Complete!'}
                  </h3>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    You scored {score} of {quiz.questions.length} rounds.
                  </p>
                </div>

                {isWinner && !recordedWinner && (
                  <button
                    onClick={handleRecordSimulatedWinner}
                    className="px-4 py-2 bg-[#6D28D9] text-white text-xs font-bold rounded-xl shadow-md"
                  >
                    Claim Reward & Log Run
                  </button>
                )}

                {recordedWinner && (
                  <p className="text-xs text-[#0E8345] font-bold">
                    ✓ Telemetry logged to PB Zone winners ledger.
                  </p>
                )}

                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setCurrentIndex(0);
                      setScore(0);
                      setIsGameOver(false);
                      setTotalTimeSpent(0);
                      initRound(quiz.questions[0]);
                    }}
                    className="px-4 py-2 border border-[#D1D5DB] rounded-xl text-xs font-bold text-black bg-white"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => setSimScreen('home')}
                    className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: LEADERBOARD SCREEN                                     */}
        {/* ============================================================== */}
        {simScreen === 'leaderboard' && (
          <div className="flex-1 p-4 space-y-3 max-h-[580px] overflow-y-auto bg-[#F8F9FA]">
            <div className="flex items-center justify-between pb-1 border-b border-[#E5E7EB]">
              <button
                onClick={() => setSimScreen('home')}
                className="flex items-center gap-1 text-xs font-bold text-[#6B6B6B] hover:text-black"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Home</span>
              </button>
              <h3 className="text-xs font-black text-black">PB Leaderboard</h3>
              <div className="w-10" />
            </div>

            <div className="bg-white rounded-2xl p-3 border border-[#E5E7EB] space-y-2">
              <div className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">
                Top Spud Masters
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-[#FFFBEB] border border-amber-200 rounded-xl font-bold">
                  <div className="flex items-center gap-2">
                    <span>🥇</span>
                    <span>Chef Antoine Dubois</span>
                  </div>
                  <span className="font-mono text-amber-700">14,200 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl font-semibold">
                  <div className="flex items-center gap-2">
                    <span>🥈</span>
                    <span>Crispy Fry Queen</span>
                  </div>
                  <span className="font-mono text-slate-700">12,850 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded-xl font-semibold">
                  <div className="flex items-center gap-2">
                    <span>🥉</span>
                    <span>Tater Master Jay</span>
                  </div>
                  <span className="font-mono text-amber-800">9,400 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded-xl font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6D28D9]">#4</span>
                    <span>You (Potato Player)</span>
                  </div>
                  <span className="font-mono text-[#6D28D9]">{coins} pts</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (Matches User Screenshot) */}
        <div className="bg-white border-t border-[#F0F0F0] px-4 py-2 flex items-center justify-between text-[10px] text-[#6B6B6B] shrink-0">
          <button
            onClick={() => setSimScreen('home')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              simScreen === 'home' ? 'text-[#6D28D9] font-bold' : 'hover:text-black'
            }`}
          >
            <div
              className={`h-7 w-7 rounded-xl flex items-center justify-center transition-all ${
                simScreen === 'home' ? 'bg-[#6D28D9] text-white' : 'text-[#6B6B6B]'
              }`}
            >
              <Home className="h-4 w-4" />
            </div>
            <span>Home</span>
          </button>

          <button
            onClick={() => setSimScreen('game')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              simScreen === 'game' ? 'text-[#6D28D9] font-bold' : 'hover:text-black'
            }`}
          >
            <div className="h-7 w-7 flex items-center justify-center">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <span>Games</span>
          </button>

          <button
            onClick={() => setSimScreen('leaderboard')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              simScreen === 'leaderboard' ? 'text-[#6D28D9] font-bold' : 'hover:text-black'
            }`}
          >
            <div className="h-7 w-7 flex items-center justify-center">
              <Gift className="h-5 w-5" />
            </div>
            <span>Rewards</span>
          </button>

          <div className="flex flex-col items-center gap-0.5 hover:text-black cursor-pointer">
            <div className="h-7 w-7 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <span>Your Order</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 hover:text-black cursor-pointer">
            <div className="h-7 w-7 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <span>Profile</span>
          </div>
        </div>
      </div>
    </div>
  );
};
