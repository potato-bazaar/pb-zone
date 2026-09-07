import React, { useState } from 'react';
import { GeneratorConfig, Quiz } from '../../types/quiz';
import { POTATO_TOPICS } from '../../data/potatoPresets';
import { aiQuizService } from '../../services/aiQuizService';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  Flame, 
  Clock, 
  Award, 
  Sliders, 
  Wand2, 
  RefreshCw,
  Landmark,
  Utensils,
  Sprout,
  Trophy,
  ChefHat
} from 'lucide-react';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (newQuiz: Quiz) => void;
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({
  isOpen,
  onClose,
  onQuizCreated,
}) => {
  const [selectedTopic, setSelectedTopic] = useState(POTATO_TOPICS[0].name);
  const [customPrompt, setCustomPrompt] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [tone, setTone] = useState<'fun' | 'educational' | 'competitive'>('fun');
  const [timeLimit, setTimeLimit] = useState(20);
  const [passThreshold, setPassThreshold] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    'Initializing AI Quiz Engine...',
    'Synthesizing 20 high-yield Potato questions...',
    'Validating distractors and verifying correct answers...',
    'Generating fun facts & educational rationales...',
    'Packaging 20-question deck for PB Zone...',
  ];

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setProgressStep(0);

    // Simulate progress animation for engaging UX
    const interval = setInterval(() => {
      setProgressStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      const config: GeneratorConfig = {
        topic: selectedTopic,
        subTheme: customPrompt || 'Curated Highlights',
        difficulty,
        tone,
        targetCount: 20,
        customPrompt,
        timeLimitPerQuestion: timeLimit,
        passThreshold,
      };

      const newQuiz = await aiQuizService.generateQuiz(config);
      clearInterval(interval);
      onQuizCreated(newQuiz);
      onClose();
    } catch (e) {
      console.error(e);
      clearInterval(interval);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTopicIcon = (iconName: string) => {
    switch (iconName) {
      case 'Landmark': return <Landmark className="h-4 w-4 text-amber-400" />;
      case 'Utensils': return <Utensils className="h-4 w-4 text-orange-400" />;
      case 'Sprout': return <Sprout className="h-4 w-4 text-emerald-400" />;
      case 'Trophy': return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 'ChefHat': return <ChefHat className="h-4 w-4 text-rose-400" />;
      default: return <Flame className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5 animate-scale-in my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black text-xl">
              🥔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">AI Quiz Generator Studio</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase font-bold">
                  20-Question Generator
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate a ready-to-publish 20-question potato trivia game for PB Zone in seconds.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isGenerating ? (
          /* Animated Generation Progress Screen */
          <div className="py-14 text-center space-y-6">
            <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <Sparkles className="h-8 w-8 text-amber-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">
                {steps[progressStep]}
              </h3>
              <p className="text-xs text-slate-400">
                Crafting verified answers, tricky distractors, and educational explanations...
              </p>
            </div>

            {/* Progress bar */}
            <div className="max-w-md mx-auto h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 rounded-full"
                style={{ width: `${((progressStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          /* Configuration Controls */
          <div className="space-y-5">
            {/* Topic Category Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Select Potato Topic Theme
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {POTATO_TOPICS.map((topic) => {
                  const isSelected = selectedTopic === topic.name;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.name)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getTopicIcon(topic.icon)}
                          <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                            {topic.name}
                          </span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-slate-800 text-slate-400">
                          {topic.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {topic.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Focus / Prompt Directive */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Custom Focus & Directives (Optional)
              </label>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Include questions about Idaho Russets, sweet potato comparisons, and Michelin chef recipes..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Grid of Tuning Knobs: Difficulty, Tone, Time Limit, Pass Threshold */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Difficulty */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none capitalize"
                >
                  <option value="mixed">Mixed (Balanced)</option>
                  <option value="easy">Casual / Easy</option>
                  <option value="medium">Standard / Medium</option>
                  <option value="hard">Expert / Master</option>
                </select>
              </div>

              {/* Tone */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Game Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none capitalize"
                >
                  <option value="fun">Fun & Witty</option>
                  <option value="educational">Educational / Lore</option>
                  <option value="competitive">Fast & Competitive</option>
                </select>
              </div>

              {/* Time per Question */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Time / Question
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value={15}>15 Seconds (Blitz)</option>
                  <option value={20}>20 Seconds (Standard)</option>
                  <option value={30}>30 Seconds (Relaxed)</option>
                </select>
              </div>

              {/* Pass Threshold */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Pass Threshold
                </label>
                <select
                  value={passThreshold}
                  onChange={(e) => setPassThreshold(parseInt(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value={14}>14 / 20 (70%)</option>
                  <option value={15}>15 / 20 (75%)</option>
                  <option value={16}>16 / 20 (80%)</option>
                  <option value={18}>18 / 20 (90%)</option>
                </select>
              </div>
            </div>

            {/* Feature Highlights Note */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Generates <strong className="text-slate-200">20 questions</strong> with verified correct answers, explanations, and distractor choices. After generation, you can preview the deck, selectively re-roll any question (e.g. Question #3), and publish to the live game UI.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartGeneration}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>Generate 20-Question Deck</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
