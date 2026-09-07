import {
  CrushBlockerType,
  CrushBoosterType,
  CrushObjectiveType,
  CrushSettings,
  CrushTile,
  RushObstacleType,
  RushPowerUpType,
  RushSettings,
  SpinPrizeType,
  SpinSettings,
} from '../types/gameConfig';

/* ---------------- Potato Crush ---------------- */

export const CRUSH_TILE_CATALOG: CrushTile[] = [
  { id: 'russet', label: 'Russet Spud', emoji: '🥔', color: '#C8A165' },
  { id: 'fries', label: 'Crinkle Fries', emoji: '🍟', color: '#F5B301' },
  { id: 'sweet', label: 'Sweet Potato', emoji: '🍠', color: '#E0692B' },
  { id: 'vitelotte', label: 'Purple Vitelotte', emoji: '🟣', color: '#7B3FA0' },
  { id: 'chip', label: 'Golden Chip', emoji: '🟡', color: '#E3B93C' },
  { id: 'butter', label: 'Butter Pat', emoji: '🧈', color: '#D9B84A' },
];

export const CRUSH_BLOCKERS: { id: CrushBlockerType; label: string; emoji: string }[] = [
  { id: 'crate', label: 'Wooden Crate', emoji: '📦' },
  { id: 'ice', label: 'Freezer Ice', emoji: '🧊' },
  { id: 'butter', label: 'Butter Slick', emoji: '🧈' },
  { id: 'soil', label: 'Field Soil', emoji: '🟫' },
];

export const CRUSH_BOOSTERS: { id: CrushBoosterType; label: string; emoji: string }[] = [
  { id: 'shuffle', label: 'Board Shuffle', emoji: '🔀' },
  { id: 'masher', label: 'Potato Masher', emoji: '🔨' },
  { id: 'fryer-line', label: 'Fryer Line Clear', emoji: '🍟' },
  { id: 'oil-splash', label: 'Oil Splash Bomb', emoji: '💥' },
];

export const CRUSH_OBJECTIVES: { id: CrushObjectiveType; label: string }[] = [
  { id: 'collect', label: 'Collect tiles' },
  { id: 'score', label: 'Reach score' },
  { id: 'clear-blockers', label: 'Clear blockers' },
];

export const CRUSH_THEMES = [
  'Golden Harvest',
  'Fry Factory',
  'Purple Peru',
  'Loaded Fries Fiesta',
  'Chip Shop Nights',
  'Farm to Fryer',
];

export const DEFAULT_CRUSH_SETTINGS: CrushSettings = {
  tileSet: CRUSH_TILE_CATALOG.slice(0, 5),
  livesPerDay: 5,
  lifeRefillMinutes: 30,
  defaultGridRows: 8,
  defaultGridCols: 8,
  scorePerTile: 60,
  comboMultiplier: 1.5,
  rewardLevelInterval: 5,
  rewardText: 'Free Regular Fries Voucher',
};

/* ---------------- Spin the Potato ---------------- */

export const SPIN_PRIZES: { id: SpinPrizeType; label: string; emoji: string; color: string }[] = [
  { id: 'voucher', label: 'Voucher', emoji: '🎟️', color: '#0E8345' },
  { id: 'discount', label: 'Discount', emoji: '🏷️', color: '#E0692B' },
  { id: 'coins', label: 'Coins', emoji: '🪙', color: '#F5B301' },
  { id: 'free-spin', label: 'Free Spin', emoji: '🔄', color: '#2563EB' },
  { id: 'multiplier', label: 'Multiplier', emoji: '✨', color: '#7B3FA0' },
  { id: 'nothing', label: 'No Prize', emoji: '🥔', color: '#8A8A8A' },
];

export const SPIN_PALETTE = [
  '#F5B301',
  '#E0692B',
  '#0E8345',
  '#2563EB',
  '#7B3FA0',
  '#C62828',
  '#0891B2',
  '#CA8A04',
  '#4B5563',
  '#DB2777',
  '#65A30D',
  '#9333EA',
];

export const SPIN_THEMES = [
  'Daily Fry-Day',
  'Weekend Bonanza',
  'Happy Hour Spin',
  'Loyalty Jackpot',
  'Festival Wheel',
];

export const DEFAULT_SPIN_SETTINGS: SpinSettings = {
  wheelName: 'Daily Spud Spin',
  spinsPerDay: 1,
  cooldownMinutes: 1440,
  spinDurationSeconds: 5,
  requireLogin: true,
  jackpotCapPerDay: 3,
  voucherValidityDays: 7,
};

/* ---------------- Potato Rush ---------------- */

export const RUSH_OBSTACLES: {
  id: RushObstacleType;
  label: string;
  emoji: string;
  danger: 1 | 2 | 3;
  action: 'jump' | 'slide' | 'dodge';
}[] = [
  { id: 'pothole', label: 'Pothole', emoji: '🕳️', danger: 1, action: 'jump' },
  { id: 'rolling-pin', label: 'Rolling Pin', emoji: '🪵', danger: 1, action: 'jump' },
  { id: 'fork-gate', label: 'Fork Gate', emoji: '🍴', danger: 2, action: 'slide' },
  { id: 'peeler', label: 'Spinning Peeler', emoji: '🔪', danger: 2, action: 'dodge' },
  { id: 'hot-oil', label: 'Hot Oil Splash', emoji: '🔥', danger: 2, action: 'jump' },
  { id: 'fryer', label: 'Deep Fryer Basket', emoji: '🍟', danger: 3, action: 'dodge' },
  { id: 'masher', label: 'Giant Masher', emoji: '🔨', danger: 3, action: 'slide' },
];

export const RUSH_POWERUPS: { id: RushPowerUpType; label: string; emoji: string }[] = [
  { id: 'butter-shield', label: 'Butter Shield', emoji: '🧈' },
  { id: 'sour-cream-magnet', label: 'Sour Cream Magnet', emoji: '🧲' },
  { id: 'chili-boost', label: 'Chili Speed Boost', emoji: '🌶️' },
  { id: 'double-coins', label: 'Double Coins', emoji: '🪙' },
];

export const RUSH_THEMES = [
  'Fryer Alley',
  'Idaho Farm Fields',
  'Potato Bazaar Kitchen',
  'Andean Highlands',
  'Chip Factory Conveyor',
  'Poutine Boulevard',
  'Midnight Snack Market',
];

export const DEFAULT_RUSH_SETTINGS: RushSettings = {
  lanes: 3,
  livesPerRun: 3,
  coinValue: 1,
  jumpDurationMs: 600,
  slideDurationMs: 700,
  scorePerMeter: 1,
  rewardText: 'Speed Runner Fries Voucher',
  rewardDistanceMeters: 1200,
};

/* Existing artwork the admin can attach to picture questions */
export const GAME_IMAGE_LIBRARY: { label: string; url: string }[] = [
  { label: 'Guess the Potato', url: '/games/guess-the-potato.jpg' },
  { label: 'Spud Trivia', url: '/games/spud-trivia.jpg' },
  { label: 'Fry Blitz', url: '/games/fry-blitz.jpg' },
  { label: 'Chef Showdown', url: '/games/chef-showdown.jpg' },
  { label: 'Daily Streak', url: '/games/daily-streak.jpg' },
  { label: 'Word Scramble', url: '/games/word-scramble.jpg' },
  { label: 'Potato Crush', url: '/games/potato-crush.jpg' },
  { label: 'Potato Rush', url: '/games/potato-rush.jpg' },
  { label: 'Spin the Potato', url: '/games/spin-the-potato.jpg' },
];
