import { GameFormat } from './quiz';

/* ------------------------------------------------------------------ */
/*  Game kind helpers                                                  */
/* ------------------------------------------------------------------ */

export type GameKind = 'quiz' | 'crush' | 'spin' | 'rush';
export type ConfigKind = Exclude<GameKind, 'quiz'>;

export function getGameKind(format: GameFormat | string | undefined | null): GameKind {
  switch (format) {
    case 'potato-crush':
      return 'crush';
    case 'spin-wheel':
      return 'spin';
    case 'potato-rush':
      return 'rush';
    default:
      return 'quiz';
  }
}

export function isConfigKind(kind: GameKind): kind is ConfigKind {
  return kind !== 'quiz';
}

export const FORMAT_LABELS: Record<GameFormat, string> = {
  'word-scramble': 'Potato Scramble (Wooden Tiles)',
  'pb-quiz': 'PB Quiz (20 Questions)',
  'trivia-20q': 'Classic 20-Question Trivia',
  'picture-guess': 'Guess the Potato (Picture & Options)',
  'potato-crush': 'Potato Crush (Match-3 Levels)',
  'spin-wheel': 'Spin the Potato (Prize Wheel)',
  'potato-rush': 'Potato Rush (Obstacle Runner)',
};

export const CONFIG_LABELS: Record<
  ConfigKind,
  { pack: string; packs: string; item: string; items: string; emoji: string }
> = {
  crush: { pack: 'Level Pack', packs: 'Level Packs', item: 'Level', items: 'Levels', emoji: '🧩' },
  spin: { pack: 'Prize Wheel', packs: 'Prize Wheels', item: 'Segment', items: 'Segments', emoji: '🎡' },
  rush: { pack: 'Run Pack', packs: 'Run Packs', item: 'Run', items: 'Runs', emoji: '⚡' },
};

export type ConfigDifficulty = 'easy' | 'medium' | 'hard';
export type DifficultyCurve = 'gentle' | 'steady' | 'steep';
export type PrizeMix = 'generous' | 'balanced' | 'tight';

/* ------------------------------------------------------------------ */
/*  Potato Crush (match-3)                                             */
/* ------------------------------------------------------------------ */

export interface CrushTile {
  id: string;
  label: string;
  emoji: string;
  color: string; // hex
}

export type CrushObjectiveType = 'collect' | 'score' | 'clear-blockers';

export interface CrushObjective {
  type: CrushObjectiveType;
  tileId?: string; // only for "collect"
  target: number;
}

export type CrushBlockerType = 'crate' | 'ice' | 'butter' | 'soil';

export interface CrushBlocker {
  type: CrushBlockerType;
  count: number;
}

export type CrushBoosterType = 'masher' | 'fryer-line' | 'oil-splash' | 'shuffle';

export interface CrushLevel {
  id: string;
  order: number;
  name: string;
  difficulty: ConfigDifficulty;
  gridRows: number;
  gridCols: number;
  moves: number;
  tileIds: string[]; // subset of settings.tileSet ids
  objectives: CrushObjective[];
  blockers: CrushBlocker[];
  boostersAllowed: CrushBoosterType[];
  starScores: [number, number, number];
  rewardOnClear?: string;
  designerNote: string;
}

export interface CrushSettings {
  tileSet: CrushTile[];
  livesPerDay: number;
  lifeRefillMinutes: number;
  defaultGridRows: number;
  defaultGridCols: number;
  scorePerTile: number;
  comboMultiplier: number;
  rewardLevelInterval: number;
  rewardText: string;
}

export interface CrushContent {
  kind: 'crush';
  settings: CrushSettings;
  levels: CrushLevel[];
}

/* ------------------------------------------------------------------ */
/*  Spin the Potato (prize wheel)                                      */
/* ------------------------------------------------------------------ */

export type SpinPrizeType = 'voucher' | 'discount' | 'coins' | 'free-spin' | 'multiplier' | 'nothing';

export interface WheelSegment {
  id: string;
  order: number;
  label: string;
  emoji: string;
  color: string; // hex
  prizeType: SpinPrizeType;
  prizeValue: string;
  weight: number; // relative odds
  isJackpot: boolean;
  description: string;
}

export interface SpinSettings {
  wheelName: string;
  spinsPerDay: number;
  cooldownMinutes: number;
  spinDurationSeconds: number;
  requireLogin: boolean;
  jackpotCapPerDay: number;
  voucherValidityDays: number;
}

export interface SpinContent {
  kind: 'spin';
  settings: SpinSettings;
  segments: WheelSegment[];
}

/* ------------------------------------------------------------------ */
/*  Potato Rush (obstacle runner)                                      */
/* ------------------------------------------------------------------ */

export type RushObstacleType =
  | 'fryer'
  | 'peeler'
  | 'masher'
  | 'pothole'
  | 'hot-oil'
  | 'rolling-pin'
  | 'fork-gate';

export interface RushObstacle {
  id: string;
  type: RushObstacleType;
  lane: number; // 0-based, < settings.lanes
  atMeters: number;
}

export type RushPowerUpType = 'butter-shield' | 'sour-cream-magnet' | 'chili-boost' | 'double-coins';

export interface RushPowerUp {
  type: RushPowerUpType;
  atMeters: number;
}

export interface RushRun {
  id: string;
  order: number;
  name: string;
  theme: string;
  difficulty: ConfigDifficulty;
  distanceMeters: number;
  baseSpeed: number; // multiplier, 1.0 = base
  speedRampPercent: number; // speed increase over the run
  coinsTotal: number;
  obstacles: RushObstacle[];
  powerUps: RushPowerUp[];
  rewardOnFinish?: string;
  designerNote: string;
}

export interface RushSettings {
  lanes: number;
  livesPerRun: number;
  coinValue: number;
  jumpDurationMs: number;
  slideDurationMs: number;
  scorePerMeter: number;
  rewardText: string;
  rewardDistanceMeters: number;
}

export interface RushContent {
  kind: 'rush';
  settings: RushSettings;
  runs: RushRun[];
}

/* ------------------------------------------------------------------ */
/*  Config envelope                                                    */
/* ------------------------------------------------------------------ */

export type GameConfigContent = CrushContent | SpinContent | RushContent;
export type GameConfigSettings = CrushSettings | SpinSettings | RushSettings;
export type ConfigItem = CrushLevel | WheelSegment | RushRun;

export interface GameConfig {
  id: string;
  gameId: string;
  kind: ConfigKind;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  inRotation: boolean;
  poolGroup?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  playsCount: number;
  winnersCount: number;
  tags: string[];
  generatedBy: 'groq' | 'offline';
  content: GameConfigContent;
}

export interface CrushGenOptions {
  kind: 'crush';
  levelCount: number;
  curve: DifficultyCurve;
  theme: string;
  customPrompt?: string;
}

export interface SpinGenOptions {
  kind: 'spin';
  segmentCount: number;
  prizeMix: PrizeMix;
  theme: string;
  customPrompt?: string;
}

export interface RushGenOptions {
  kind: 'rush';
  runCount: number;
  curve: DifficultyCurve;
  theme: string;
  customPrompt?: string;
}

export type GameConfigGenOptions = CrushGenOptions | SpinGenOptions | RushGenOptions;

export function getConfigItems(config: GameConfig): ConfigItem[] {
  switch (config.content.kind) {
    case 'crush':
      return config.content.levels;
    case 'spin':
      return config.content.segments;
    case 'rush':
      return config.content.runs;
  }
}

export function getItemCount(config: GameConfig): number {
  return getConfigItems(config).length;
}

export function withConfigItems(content: GameConfigContent, items: ConfigItem[]): GameConfigContent {
  const renumbered = items.map((it, idx) => ({ ...it, order: idx + 1 }));
  switch (content.kind) {
    case 'crush':
      return { ...content, levels: renumbered as CrushLevel[] };
    case 'spin':
      return { ...content, segments: renumbered as WheelSegment[] };
    case 'rush':
      return { ...content, runs: renumbered as RushRun[] };
  }
}

export function withConfigSettings(content: GameConfigContent, settings: GameConfigSettings): GameConfigContent {
  switch (content.kind) {
    case 'crush':
      return { ...content, settings: settings as CrushSettings };
    case 'spin':
      return { ...content, settings: settings as SpinSettings };
    case 'rush':
      return { ...content, settings: settings as RushSettings };
  }
}
