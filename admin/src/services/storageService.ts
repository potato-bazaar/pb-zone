import { Quiz, QuizAnalytics, WinnerRecord, Game } from '../types/quiz';
import { GameConfig } from '../types/gameConfig';
import { INITIAL_QUIZZES, INITIAL_WINNERS, INITIAL_ANALYTICS, INITIAL_GAMES } from '../data/potatoPresets';
import { INITIAL_GAME_CONFIGS } from '../data/gameConfigPresets';

const STORAGE_KEYS = {
  GAMES: 'pb_zone_games_v5',
  GAMES_LEGACY: 'pb_zone_games_v4',
  ACTIVE_GAME_ID: 'pb_zone_active_game_id_v4',
  QUIZZES: 'pb_zone_quizzes_v4',
  ACTIVE_QUIZ_ID: 'pb_zone_active_quiz_id_v4',
  GAME_CONFIGS: 'pb_zone_game_configs_v1',
  ACTIVE_CONFIG_IDS: 'pb_zone_active_config_ids_v1',
  WINNERS: 'pb_zone_winners_v2',
  ANALYTICS: 'pb_zone_analytics_v2',
  GROQ_API_KEY: 'pb_zone_groq_api_key_v1',
  GROQ_MODEL: 'pb_zone_groq_model_v1',
};

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export const storageService = {
  /* ---------------- Games ---------------- */

  getGames(): Game[] {
    const stored = readJson<Game[]>(STORAGE_KEYS.GAMES);
    if (stored && Array.isArray(stored)) {
      const missing = INITIAL_GAMES.filter((seed) => !stored.some((g) => g.id === seed.id));
      if (!missing.length) return stored;
      const merged = [...stored, ...missing];
      this.saveGames(merged);
      return merged;
    }
    // First run on this storage version: keep custom games from the previous version, refresh the seeded ones.
    const legacy = readJson<Game[]>(STORAGE_KEYS.GAMES_LEGACY) || [];
    const custom = Array.isArray(legacy) ? legacy.filter((g) => !INITIAL_GAMES.some((seed) => seed.id === g.id)) : [];
    const merged = [...INITIAL_GAMES, ...custom];
    this.saveGames(merged);
    return merged;
  },

  saveGames(games: Game[]): void {
    localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
  },

  saveGame(game: Game): void {
    const games = this.getGames();
    const index = games.findIndex((g) => g.id === game.id);
    if (index >= 0) {
      games[index] = game;
    } else {
      games.push(game);
    }
    this.saveGames(games);
  },

  getActiveGameId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID) || 'game-word-scramble';
  },

  setActiveGameId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME_ID, id);
  },

  /* ---------------- Quizzes (quiz-style games) ---------------- */

  getQuizzes(): Quiz[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUIZZES);
      if (!data) {
        this.saveQuizzes(INITIAL_QUIZZES);
        return INITIAL_QUIZZES;
      }
      const parsed: Quiz[] = JSON.parse(data);
      if (!parsed.some((q) => q.id === 'quiz-word-scramble-01')) {
        const merged = [INITIAL_QUIZZES[0], ...parsed];
        this.saveQuizzes(merged);
        return merged;
      }
      return parsed;
    } catch {
      return INITIAL_QUIZZES;
    }
  },

  saveQuizzes(quizzes: Quiz[]): void {
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
  },

  getQuizById(id: string): Quiz | undefined {
    return this.getQuizzes().find((q) => q.id === id);
  },

  saveQuiz(quiz: Quiz): void {
    const quizzes = this.getQuizzes();
    const index = quizzes.findIndex((q) => q.id === quiz.id);
    if (index >= 0) {
      quizzes[index] = { ...quiz, updatedAt: new Date().toISOString() };
    } else {
      quizzes.unshift(quiz);
    }
    this.saveQuizzes(quizzes);
  },

  deleteQuiz(id: string): void {
    this.saveQuizzes(this.getQuizzes().filter((q) => q.id !== id));
  },

  getActiveQuizId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_QUIZ_ID) || 'quiz-word-scramble-01';
  },

  setActiveQuizId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ_ID, id);
  },

  /* ---------------- Game configurations (Crush / Spin / Rush) ---------------- */

  getGameConfigs(): GameConfig[] {
    const stored = readJson<GameConfig[]>(STORAGE_KEYS.GAME_CONFIGS);
    if (stored && Array.isArray(stored)) return stored;
    this.saveGameConfigs(INITIAL_GAME_CONFIGS);
    return INITIAL_GAME_CONFIGS;
  },

  saveGameConfigs(configs: GameConfig[]): void {
    localStorage.setItem(STORAGE_KEYS.GAME_CONFIGS, JSON.stringify(configs));
  },

  saveGameConfig(config: GameConfig): void {
    const configs = this.getGameConfigs();
    const index = configs.findIndex((c) => c.id === config.id);
    if (index >= 0) {
      configs[index] = config;
    } else {
      configs.unshift(config);
    }
    this.saveGameConfigs(configs);
  },

  deleteGameConfig(id: string): void {
    this.saveGameConfigs(this.getGameConfigs().filter((c) => c.id !== id));
  },

  getActiveConfigIds(): Record<string, string> {
    const stored = readJson<Record<string, string>>(STORAGE_KEYS.ACTIVE_CONFIG_IDS);
    return stored && typeof stored === 'object' ? stored : {};
  },

  setActiveConfigId(gameId: string, configId: string): void {
    const next = { ...this.getActiveConfigIds(), [gameId]: configId };
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CONFIG_IDS, JSON.stringify(next));
  },

  /* ---------------- Winners & analytics ---------------- */

  getWinners(): WinnerRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WINNERS);
      if (!data) {
        this.saveWinners(INITIAL_WINNERS);
        return INITIAL_WINNERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_WINNERS;
    }
  },

  saveWinners(winners: WinnerRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.WINNERS, JSON.stringify(winners));
  },

  addWinner(record: WinnerRecord): void {
    const winners = this.getWinners();
    winners.unshift(record);
    this.saveWinners(winners);

    const quiz = this.getQuizById(record.quizId);
    if (quiz) {
      quiz.winnersCount = (quiz.winnersCount || 0) + 1;
      quiz.playsCount = (quiz.playsCount || 0) + 1;
      this.saveQuiz(quiz);
    }
  },

  getAnalytics(): QuizAnalytics {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
      if (!data) {
        this.saveAnalytics(INITIAL_ANALYTICS);
        return INITIAL_ANALYTICS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_ANALYTICS;
    }
  },

  saveAnalytics(analytics: QuizAnalytics): void {
    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics));
  },

  /* ---------------- AI engine (Groq) ---------------- */

  getGroqApiKey(): string {
    return localStorage.getItem(STORAGE_KEYS.GROQ_API_KEY) || '';
  },

  setGroqApiKey(key: string): void {
    localStorage.setItem(STORAGE_KEYS.GROQ_API_KEY, key.trim());
  },

  getGroqModel(): string {
    return localStorage.getItem(STORAGE_KEYS.GROQ_MODEL) || '';
  },

  setGroqModel(model: string): void {
    localStorage.setItem(STORAGE_KEYS.GROQ_MODEL, model.trim());
  },

  /* ---------------- Reset ---------------- */

  resetDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.QUIZZES);
    localStorage.removeItem(STORAGE_KEYS.WINNERS);
    localStorage.removeItem(STORAGE_KEYS.ANALYTICS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUIZ_ID);
    localStorage.removeItem(STORAGE_KEYS.GAME_CONFIGS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONFIG_IDS);
    localStorage.removeItem(STORAGE_KEYS.GAMES);
    localStorage.removeItem(STORAGE_KEYS.GAMES_LEGACY);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_ID);
  },
};
