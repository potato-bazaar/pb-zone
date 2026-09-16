export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type QuizStatus = 'draft' | 'published' | 'archived';
export type QuizTone = 'fun' | 'educational' | 'competitive';
export type GameFormat = 
  | 'word-scramble' 
  | 'pb-quiz' 
  | 'picture-guess' 
  | 'potato-crush' 
  | 'spin-wheel' 
  | 'potato-rush'
  | 'trivia-20q';

export interface Game {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  format: GameFormat;
  icon: string;
  imageUrl: string;
  status: 'active' | 'maintenance' | 'draft' | 'in-development';
  isConfigured: boolean; // Set false to force the "not configured" badge; otherwise derived from content counts.
  activeQuizId?: string;
  totalPlays: number;
  totalWinners: number;
  rewardType: string;
  createdAt: string;
}

export interface QuestionOption {
  id: string; // 'A' | 'B' | 'C' | 'D'
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  order: number;
  question: string; // Clue / Hint or Question text
  pictureUrl?: string; // For "Guess the Potato" picture guessing game
  imagePrompt?: string; // AI-written brief describing the picture the admin should attach
  targetWord?: string; // For Potato Scramble (e.g. "POTATO")
  scrambledLetters?: string[]; // For Potato Scramble (e.g. ["P", "A", "T", "O"])
  options: QuestionOption[];
  explanation: string;
  funFact?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topicTag: string;
  points: number;
  timeLimitSeconds: number;
  aiConfidence?: number;
  /** Live bank locales from API (`hi` / `gu`). English is top-level text. */
  locales?: {
    hi?: { question?: string; options?: Partial<Record<'A' | 'B' | 'C' | 'D', string>> };
    gu?: { question?: string; options?: Partial<Record<'A' | 'B' | 'C' | 'D', string>> };
  };
}

export interface Quiz {
  id: string;
  gameId: string; // Links this quiz to a specific Game
  title: string;
  description: string;
  topic: string;
  subTheme: string;
  difficulty: Difficulty;
  tone: QuizTone;
  status: QuizStatus;
  inRotation?: boolean; // When true, can be randomly assigned to web players
  poolGroup?: string;
  questionsCount: number;
  passScore: number; // e.g. 15 out of 20
  timeLimitSeconds: number; // total or per question
  createdAt: string;
  updatedAt: string;
  version: number;
  playsCount: number;
  winnersCount: number;
  tags: string[];
  questions: QuizQuestion[];
}

export interface BatchGeneratorConfig {
  count: number; // e.g., 5, 20, 50, 100, up to 200 quizzes
  topicMix: 'all-potato' | 'history-focus' | 'fries-snacks' | 'science-botany' | 'records-culture';
  difficulty: Difficulty;
  tone: QuizTone;
  autoActivateRotation: boolean;
}

export interface WinnerRecord {
  id: string;
  quizId: string;
  quizTitle: string;
  playerName: string;
  avatar: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: string;
  prizeClaimed: boolean;
  prizeTier: 'Grand Spud Master' | 'Golden Crispy' | 'Tater Prodigy';
  rewardVoucherCode?: string;
}

export interface QuestionStat {
  questionNumber: number;
  questionText: string;
  correctPercentage: number;
  wrongPercentage: number;
  dropoffPercentage: number;
  avgResponseTimeSeconds: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizAnalytics {
  quizId: string;
  totalPlays: number;
  completedPlays: number;
  totalWinners: number;
  winRatePercentage: number;
  completionRatePercentage: number;
  averageScore: number;
  averageTimeMinutes: number;
  questionStats: QuestionStat[];
}

export interface GeneratorConfig {
  topic: string;
  subTheme: string;
  difficulty: Difficulty;
  tone: QuizTone;
  targetCount: number;
  customPrompt?: string;
  timeLimitPerQuestion: number;
  passThreshold: number;
}
