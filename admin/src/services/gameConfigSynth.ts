import { Game } from '../types/quiz';
import {
  CONFIG_LABELS,
  ConfigDifficulty,
  ConfigItem,
  ConfigKind,
  CrushBlocker,
  CrushBlockerType,
  CrushBoosterType,
  CrushContent,
  CrushGenOptions,
  CrushLevel,
  CrushObjective,
  CrushObjectiveType,
  CrushSettings,
  DifficultyCurve,
  GameConfig,
  GameConfigContent,
  GameConfigGenOptions,
  GameConfigSettings,
  PrizeMix,
  RushContent,
  RushGenOptions,
  RushObstacle,
  RushObstacleType,
  RushPowerUp,
  RushPowerUpType,
  RushRun,
  RushSettings,
  SpinContent,
  SpinGenOptions,
  SpinPrizeType,
  SpinSettings,
  WheelSegment,
} from '../types/gameConfig';
import {
  CRUSH_BLOCKERS,
  CRUSH_BOOSTERS,
  CRUSH_OBJECTIVES,
  CRUSH_TILE_CATALOG,
  DEFAULT_CRUSH_SETTINGS,
  DEFAULT_RUSH_SETTINGS,
  DEFAULT_SPIN_SETTINGS,
  RUSH_OBSTACLES,
  RUSH_POWERUPS,
  RUSH_THEMES,
  SPIN_PALETTE,
  SPIN_PRIZES,
} from '../data/gameConfigCatalog';

/* ------------------------------------------------------------------ */
/*  Deterministic helpers                                              */
/* ------------------------------------------------------------------ */

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function clampNum(value: unknown, fallback: number, min: number, max: number, decimals = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return fallback;
  const c = Math.min(max, Math.max(min, n));
  const f = Math.pow(10, decimals);
  return Math.round(c * f) / f;
}

export function asString(value: unknown, fallback: string, maxLen = 200): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLen) : fallback;
}

export function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value as string) ? (value as T) : fallback;
}

export function asHexColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim().toUpperCase()
    : fallback;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function curveValue(index: number, count: number, curve: DifficultyCurve): number {
  const t = count <= 1 ? 1 : index / (count - 1);
  const exp = curve === 'gentle' ? 0.6 : curve === 'steep' ? 1.6 : 1;
  return Math.pow(t, exp);
}

export function difficultyFor(d: number): ConfigDifficulty {
  return d < 0.34 ? 'easy' : d < 0.67 ? 'medium' : 'hard';
}

export function defaultSettingsFor(kind: ConfigKind): GameConfigSettings {
  switch (kind) {
    case 'crush':
      return { ...DEFAULT_CRUSH_SETTINGS, tileSet: [...DEFAULT_CRUSH_SETTINGS.tileSet] };
    case 'spin':
      return { ...DEFAULT_SPIN_SETTINGS };
    case 'rush':
      return { ...DEFAULT_RUSH_SETTINGS };
  }
}

/* ------------------------------------------------------------------ */
/*  Potato Crush                                                       */
/* ------------------------------------------------------------------ */

const CRUSH_ADJ = [
  'Crispy',
  'Golden',
  'Buttery',
  'Smoky',
  'Salted',
  'Loaded',
  'Twice-Baked',
  'Hash Brown',
  'Curly',
  'Waffle',
  'Peppery',
  'Cheesy',
];
const CRUSH_NOUN = [
  'Harvest',
  'Fry-Up',
  'Meltdown',
  'Scramble',
  'Bake',
  'Sizzle',
  'Crunch',
  'Mash',
  'Roast',
  'Chip Run',
  'Skillet',
  'Gratin',
];

export function synthCrushLevel(
  index: number,
  count: number,
  opts: { curve: DifficultyCurve; theme: string },
  settings: CrushSettings,
  rng: () => number
): CrushLevel {
  const d = curveValue(index, count, opts.curve);
  const difficulty = difficultyFor(d);
  const tileSet = settings.tileSet.length >= 3 ? settings.tileSet : CRUSH_TILE_CATALOG;
  const tileCount = Math.min(tileSet.length, Math.max(3, 4 + Math.floor(d * 2.2)));
  const tileIds = tileSet.slice(0, tileCount).map((t) => t.id);
  const gridRows = clampNum(settings.defaultGridRows + (d > 0.7 ? 1 : 0), 8, 5, 10);
  const gridCols = clampNum(settings.defaultGridCols + (d > 0.85 ? 1 : 0), 8, 5, 10);
  const moves = clampNum(32 - 16 * d + (rng() * 4 - 2), 25, 10, 40);

  const objectives: CrushObjective[] = [
    { type: 'collect', tileId: pick(rng, tileIds), target: Math.round(18 + 42 * d) },
  ];
  const blockers: CrushBlocker[] = [];
  if (d > 0.3) blockers.push({ type: 'crate', count: Math.round(4 + 10 * d) });
  if (d > 0.6) blockers.push({ type: 'ice', count: Math.round(2 + 6 * d) });
  if (d > 0.85) blockers.push({ type: 'butter', count: 3 });
  if (d > 0.45) {
    objectives.push({
      type: 'score',
      target: Math.round((moves * settings.scorePerTile * (2 + 3 * d)) / 100) * 100,
    });
  }
  if (blockers.length && d > 0.75) {
    objectives.push({
      type: 'clear-blockers',
      target: blockers.reduce((s, b) => s + b.count, 0),
    });
  }

  const boostersAllowed: CrushBoosterType[] =
    difficulty === 'easy'
      ? ['shuffle']
      : difficulty === 'medium'
      ? ['shuffle', 'masher']
      : ['shuffle', 'masher', 'fryer-line', 'oil-splash'];

  const base = Math.max(500, Math.round((moves * settings.scorePerTile * 2.5) / 100) * 100);
  const starScores: [number, number, number] = [
    base,
    Math.round((base * 1.5) / 100) * 100,
    Math.round((base * 2.2) / 100) * 100,
  ];
  const interval = Math.max(1, settings.rewardLevelInterval);
  const rewardOnClear = (index + 1) % interval === 0 ? settings.rewardText : undefined;

  return {
    id: newId('lvl'),
    order: index + 1,
    name: `${pick(rng, CRUSH_ADJ)} ${pick(rng, CRUSH_NOUN)}`,
    difficulty,
    gridRows,
    gridCols,
    moves,
    tileIds,
    objectives,
    blockers,
    boostersAllowed,
    starScores,
    rewardOnClear,
    designerNote: `${opts.theme} · ${difficulty} tier with ${moves} moves, ${tileIds.length} tile types${
      blockers.length ? ` and ${blockers.length} blocker type${blockers.length === 1 ? '' : 's'}` : ''
    }.`,
  };
}

export function normalizeCrushLevel(
  raw: unknown,
  index: number,
  settings: CrushSettings,
  fallback: CrushLevel
): CrushLevel {
  const r = rec(raw);
  const validTiles = (settings.tileSet.length ? settings.tileSet : CRUSH_TILE_CATALOG).map((t) => t.id);
  const rawTiles = Array.isArray(r.tileIds) ? (r.tileIds as unknown[]) : [];
  const tileIds = Array.from(
    new Set(rawTiles.filter((t): t is string => typeof t === 'string' && validTiles.includes(t)))
  );
  const finalTiles = tileIds.length >= 3 ? tileIds : fallback.tileIds;

  const objectiveTypes = CRUSH_OBJECTIVES.map((o) => o.id);
  const objectives: CrushObjective[] = (Array.isArray(r.objectives) ? (r.objectives as unknown[]) : [])
    .map((o) => {
      const ro = rec(o);
      const type = asEnum<CrushObjectiveType>(ro.type, objectiveTypes, 'collect');
      const target = clampNum(ro.target, 30, 1, type === 'score' ? 5000000 : 500);
      if (type === 'collect') {
        const tileId = typeof ro.tileId === 'string' && finalTiles.includes(ro.tileId) ? ro.tileId : finalTiles[0];
        return { type, tileId, target };
      }
      return { type, target };
    })
    .slice(0, 3);

  const blockerTypes = CRUSH_BLOCKERS.map((b) => b.id);
  const blockers: CrushBlocker[] = (Array.isArray(r.blockers) ? (r.blockers as unknown[]) : [])
    .map((b) => rec(b))
    .filter((b) => (blockerTypes as string[]).includes(b.type as string))
    .map((b) => ({ type: b.type as CrushBlockerType, count: clampNum(b.count, 4, 1, 64) }))
    .slice(0, 4);

  const boosterTypes = CRUSH_BOOSTERS.map((b) => b.id);
  const boostersAllowed = Array.isArray(r.boostersAllowed)
    ? (r.boostersAllowed as unknown[]).filter((b): b is CrushBoosterType =>
        (boosterTypes as string[]).includes(b as string)
      )
    : fallback.boostersAllowed;

  let starScores = fallback.starScores;
  if (Array.isArray(r.starScores) && r.starScores.length === 3) {
    const s = (r.starScores as unknown[])
      .map((v) => clampNum(v, 0, 0, 10000000))
      .sort((a, b) => a - b);
    if (s[0] > 0) starScores = [s[0], s[1], s[2]];
  }

  return {
    id: fallback.id,
    order: index + 1,
    name: asString(r.name, fallback.name, 60),
    difficulty: asEnum<ConfigDifficulty>(r.difficulty, ['easy', 'medium', 'hard'], fallback.difficulty),
    gridRows: clampNum(r.gridRows, fallback.gridRows, 5, 10),
    gridCols: clampNum(r.gridCols, fallback.gridCols, 5, 10),
    moves: clampNum(r.moves, fallback.moves, 8, 60),
    tileIds: finalTiles,
    objectives: objectives.length ? objectives : fallback.objectives,
    blockers,
    boostersAllowed: boostersAllowed.length ? Array.from(new Set(boostersAllowed)) : fallback.boostersAllowed,
    starScores,
    rewardOnClear:
      typeof r.rewardOnClear === 'string' && r.rewardOnClear.trim() ? r.rewardOnClear.trim().slice(0, 80) : undefined,
    designerNote: asString(r.designerNote, fallback.designerNote, 300),
  };
}

export function synthCrushContent(opts: CrushGenOptions, settings: CrushSettings, seedKey: string): CrushContent {
  const rng = mulberry32(hashSeed(seedKey));
  const count = clampNum(opts.levelCount, 10, 1, 60);
  const levels = Array.from({ length: count }, (_, i) => synthCrushLevel(i, count, opts, settings, rng));
  return { kind: 'crush', settings, levels };
}

/* ------------------------------------------------------------------ */
/*  Spin the Potato                                                    */
/* ------------------------------------------------------------------ */

const MIX_PATTERN: Record<PrizeMix, SpinPrizeType[]> = {
  generous: ['coins', 'discount', 'free-spin', 'voucher', 'coins', 'multiplier', 'discount', 'coins'],
  balanced: ['coins', 'nothing', 'discount', 'coins', 'free-spin', 'nothing', 'multiplier', 'coins'],
  tight: ['nothing', 'coins', 'nothing', 'discount', 'coins', 'nothing', 'free-spin', 'nothing'],
};

const WEIGHT_BY_TYPE: Record<SpinPrizeType, number> = {
  nothing: 30,
  coins: 25,
  discount: 15,
  'free-spin': 12,
  multiplier: 8,
  voucher: 4,
};

export function synthWheelSegment(
  index: number,
  count: number,
  opts: { prizeMix: PrizeMix; theme: string },
  settings: SpinSettings,
  rng: () => number,
  jackpotIndex: number
): WheelSegment {
  const isJackpot = index === jackpotIndex;
  const pattern = MIX_PATTERN[opts.prizeMix];
  const prizeType: SpinPrizeType = isJackpot ? 'voucher' : pattern[index % pattern.length];
  const meta = SPIN_PRIZES.find((p) => p.id === prizeType) || SPIN_PRIZES[0];

  let label = '';
  let prizeValue = '';
  let description = '';
  switch (prizeType) {
    case 'coins': {
      const n = pick(rng, [10, 25, 50, 100]);
      label = `${n} Coins`;
      prizeValue = `${n} PB Coins`;
      description = `Adds ${n} coins to the player's PB Zone wallet.`;
      break;
    }
    case 'discount': {
      const n = pick(rng, [5, 10, 15, 20]);
      label = `${n}% Off`;
      prizeValue = `${n}% off next order`;
      description = `A ${n}% discount voucher valid for ${settings.voucherValidityDays} days.`;
      break;
    }
    case 'voucher': {
      label = isJackpot ? 'JACKPOT' : 'Free Fries';
      prizeValue = isJackpot ? 'Free Loaded Fries Meal' : 'Free Regular Fries';
      description = isJackpot
        ? `Grand prize: a free Loaded Fries meal, capped at ${settings.jackpotCapPerDay} winners per day.`
        : 'A free regular fries voucher redeemable in store.';
      break;
    }
    case 'free-spin':
      label = 'Free Spin';
      prizeValue = '+1 Extra Spin';
      description = 'Grants one immediate extra spin.';
      break;
    case 'multiplier': {
      const n = pick(rng, [2, 3]);
      label = `${n}x Points`;
      prizeValue = `${n}x points for 1 hour`;
      description = `Multiplies quiz and game points by ${n} for the next hour.`;
      break;
    }
    default:
      label = 'Try Again';
      prizeValue = 'No prize';
      description = 'Better luck on the next spin.';
  }

  return {
    id: newId('seg'),
    order: index + 1,
    label,
    emoji: meta.emoji,
    color: SPIN_PALETTE[index % SPIN_PALETTE.length],
    prizeType,
    prizeValue,
    weight: isJackpot ? 2 : WEIGHT_BY_TYPE[prizeType],
    isJackpot,
    description,
  };
}

export function normalizeWheelSegment(raw: unknown, index: number, fallback: WheelSegment): WheelSegment {
  const r = rec(raw);
  const prizeTypes = SPIN_PRIZES.map((p) => p.id);
  const prizeType = asEnum<SpinPrizeType>(r.prizeType, prizeTypes, fallback.prizeType);
  const meta = SPIN_PRIZES.find((p) => p.id === prizeType) || SPIN_PRIZES[0];
  const emoji =
    typeof r.emoji === 'string' && r.emoji.trim() && Array.from(r.emoji.trim()).length <= 3
      ? r.emoji.trim()
      : meta.emoji;
  return {
    id: fallback.id,
    order: index + 1,
    label: asString(r.label, fallback.label, 18),
    emoji,
    color: asHexColor(r.color, SPIN_PALETTE[index % SPIN_PALETTE.length]),
    prizeType,
    prizeValue: asString(r.prizeValue, fallback.prizeValue, 60),
    weight: clampNum(r.weight, fallback.weight, 1, 100),
    isJackpot: typeof r.isJackpot === 'boolean' ? r.isJackpot : fallback.isJackpot,
    description: asString(r.description, fallback.description, 200),
  };
}

export function ensureSingleJackpot(segments: WheelSegment[]): WheelSegment[] {
  const jackpots = segments.filter((s) => s.isJackpot);
  if (jackpots.length === 1) return segments;
  if (jackpots.length > 1) {
    const keep = jackpots.reduce((a, b) => (a.weight <= b.weight ? a : b));
    return segments.map((s) => ({ ...s, isJackpot: s.id === keep.id }));
  }
  const vouchers = segments.filter((s) => s.prizeType === 'voucher');
  if (!vouchers.length) return segments;
  const best = vouchers.reduce((a, b) => (a.weight <= b.weight ? a : b));
  return segments.map((s) => ({ ...s, isJackpot: s.id === best.id }));
}

export function synthSpinContent(opts: SpinGenOptions, settings: SpinSettings, seedKey: string): SpinContent {
  const rng = mulberry32(hashSeed(seedKey));
  const count = clampNum(opts.segmentCount, 8, 2, 16);
  const jackpotIndex = Math.floor(rng() * count);
  const segments = Array.from({ length: count }, (_, i) =>
    synthWheelSegment(i, count, opts, settings, rng, jackpotIndex)
  );
  return { kind: 'spin', settings, segments };
}

/* ------------------------------------------------------------------ */
/*  Potato Rush                                                        */
/* ------------------------------------------------------------------ */

const RUSH_STAGE = [
  'Warm-Up Dash',
  'Coin Sprint',
  'Fryer Gauntlet',
  'Peeler Alley',
  'Masher Marathon',
  'Midnight Rush',
  'Hot Oil Highway',
  'Final Sizzle',
];

export function synthRushRun(
  index: number,
  count: number,
  opts: { curve: DifficultyCurve; theme: string },
  settings: RushSettings,
  rng: () => number
): RushRun {
  const d = curveValue(index, count, opts.curve);
  const difficulty = difficultyFor(d);
  const lanes = Math.max(2, Math.min(5, settings.lanes || 3));
  const distanceMeters = Math.round((600 + 1000 * d) / 50) * 50;
  const baseSpeed = Math.round((1 + 0.9 * d) * 10) / 10;
  const speedRampPercent = Math.round(5 + 25 * d);
  const coinsTotal = Math.round(distanceMeters / 8);
  const allowedDanger = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const pool = RUSH_OBSTACLES.filter((o) => o.danger <= allowedDanger);
  const gap = Math.round(130 - 80 * d);

  const obstacles: RushObstacle[] = [];
  for (let m = 80; m < distanceMeters - 40; m += gap + Math.round(rng() * 30)) {
    const o = pick(rng, pool);
    obstacles.push({
      id: `obs-${index + 1}-${obstacles.length + 1}`,
      type: o.id,
      lane: Math.floor(rng() * lanes),
      atMeters: m,
    });
  }

  const powerUpCount = 1 + Math.floor(d * 2);
  const powerUps: RushPowerUp[] = Array.from({ length: powerUpCount }, (_, k) => ({
    type: pick(rng, RUSH_POWERUPS).id,
    atMeters: Math.round((distanceMeters * (k + 1)) / (powerUpCount + 1)),
  }));

  const theme = opts.theme || pick(rng, RUSH_THEMES);
  return {
    id: newId('run'),
    order: index + 1,
    name: `${theme}: ${RUSH_STAGE[index % RUSH_STAGE.length]}`,
    theme,
    difficulty,
    distanceMeters,
    baseSpeed,
    speedRampPercent,
    coinsTotal,
    obstacles,
    powerUps,
    rewardOnFinish: distanceMeters >= settings.rewardDistanceMeters ? settings.rewardText : undefined,
    designerNote: `${difficulty} tier · ${distanceMeters} m at ${baseSpeed}x speed ramping ${speedRampPercent}% with ${obstacles.length} obstacles.`,
  };
}

export function normalizeRushRun(raw: unknown, index: number, settings: RushSettings, fallback: RushRun): RushRun {
  const r = rec(raw);
  const lanes = Math.max(2, Math.min(5, settings.lanes || 3));
  const distanceMeters = clampNum(r.distanceMeters, fallback.distanceMeters, 200, 5000);
  const obstacleTypes = RUSH_OBSTACLES.map((o) => o.id);
  const powerUpTypes = RUSH_POWERUPS.map((p) => p.id);

  const obstacles: RushObstacle[] = (Array.isArray(r.obstacles) ? (r.obstacles as unknown[]) : [])
    .map((o, i) => {
      const ro = rec(o);
      return {
        id: `obs-${index + 1}-${i + 1}`,
        type: asEnum<RushObstacleType>(ro.type, obstacleTypes, 'pothole'),
        lane: clampNum(ro.lane, 0, 0, lanes - 1),
        atMeters: clampNum(ro.atMeters, 0, 20, Math.max(20, distanceMeters - 20)),
      };
    })
    .filter((o) => o.atMeters > 0)
    .sort((a, b) => a.atMeters - b.atMeters)
    .slice(0, 120);

  const powerUps: RushPowerUp[] = (Array.isArray(r.powerUps) ? (r.powerUps as unknown[]) : [])
    .map((p) => {
      const rp = rec(p);
      return {
        type: asEnum<RushPowerUpType>(rp.type, powerUpTypes, 'butter-shield'),
        atMeters: clampNum(rp.atMeters, 0, 20, Math.max(20, distanceMeters - 20)),
      };
    })
    .filter((p) => p.atMeters > 0)
    .slice(0, 12);

  if (obstacles.length < 3) {
    return {
      ...fallback,
      order: index + 1,
      name: asString(r.name, fallback.name, 60),
      theme: asString(r.theme, fallback.theme, 40),
      designerNote: asString(r.designerNote, fallback.designerNote, 300),
    };
  }

  return {
    id: fallback.id,
    order: index + 1,
    name: asString(r.name, fallback.name, 60),
    theme: asString(r.theme, fallback.theme, 40),
    difficulty: asEnum<ConfigDifficulty>(r.difficulty, ['easy', 'medium', 'hard'], fallback.difficulty),
    distanceMeters,
    baseSpeed: clampNum(r.baseSpeed, fallback.baseSpeed, 0.5, 3, 1),
    speedRampPercent: clampNum(r.speedRampPercent, fallback.speedRampPercent, 0, 100),
    coinsTotal: clampNum(r.coinsTotal, fallback.coinsTotal, 0, 2000),
    obstacles,
    powerUps: powerUps.length ? powerUps : fallback.powerUps.filter((p) => p.atMeters < distanceMeters),
    rewardOnFinish:
      typeof r.rewardOnFinish === 'string' && r.rewardOnFinish.trim() ? r.rewardOnFinish.trim().slice(0, 80) : undefined,
    designerNote: asString(r.designerNote, fallback.designerNote, 300),
  };
}

export function synthRushContent(opts: RushGenOptions, settings: RushSettings, seedKey: string): RushContent {
  const rng = mulberry32(hashSeed(seedKey));
  const count = clampNum(opts.runCount, 5, 1, 40);
  const runs = Array.from({ length: count }, (_, i) => synthRushRun(i, count, opts, settings, rng));
  return { kind: 'rush', settings, runs };
}

/* ------------------------------------------------------------------ */
/*  Dispatchers                                                        */
/* ------------------------------------------------------------------ */

export function synthContent(
  opts: GameConfigGenOptions,
  settings: GameConfigSettings | undefined,
  seedKey: string
): GameConfigContent {
  switch (opts.kind) {
    case 'crush':
      return synthCrushContent(opts, (settings as CrushSettings) || (defaultSettingsFor('crush') as CrushSettings), seedKey);
    case 'spin':
      return synthSpinContent(opts, (settings as SpinSettings) || (defaultSettingsFor('spin') as SpinSettings), seedKey);
    case 'rush':
      return synthRushContent(opts, (settings as RushSettings) || (defaultSettingsFor('rush') as RushSettings), seedKey);
  }
}

export function synthSingleItem(content: GameConfigContent, index: number, theme: string, seedKey?: string): ConfigItem {
  const rng = mulberry32(hashSeed(seedKey || `${content.kind}-${index}-${Date.now()}-${Math.random()}`));
  switch (content.kind) {
    case 'crush':
      return synthCrushLevel(index, Math.max(content.levels.length, index + 1), { curve: 'steady', theme }, content.settings, rng);
    case 'spin':
      return synthWheelSegment(index, Math.max(content.segments.length, index + 1), { prizeMix: 'balanced', theme }, content.settings, rng, -1);
    case 'rush':
      return synthRushRun(index, Math.max(content.runs.length, index + 1), { curve: 'steady', theme }, content.settings, rng);
  }
}

export function contentItemCount(content: GameConfigContent): number {
  switch (content.kind) {
    case 'crush':
      return content.levels.length;
    case 'spin':
      return content.segments.length;
    case 'rush':
      return content.runs.length;
  }
}

export function titleForOptions(opts: GameConfigGenOptions, count: number): string {
  switch (opts.kind) {
    case 'crush':
      return `${opts.theme} Level Pack (${count} Levels)`;
    case 'spin':
      return `${opts.theme} Wheel (${count} Segments)`;
    case 'rush':
      return `${opts.theme} Run Pack (${count} Runs)`;
  }
}

export function descriptionForOptions(opts: GameConfigGenOptions, count: number, gameName: string): string {
  switch (opts.kind) {
    case 'crush':
      return `${count} match-3 levels for ${gameName} with a ${opts.curve} difficulty curve. Theme: ${opts.theme}.`;
    case 'spin':
      return `${count}-segment prize wheel for ${gameName} with a ${opts.prizeMix} prize mix. Theme: ${opts.theme}.`;
    case 'rush':
      return `${count} obstacle runs for ${gameName} with a ${opts.curve} difficulty curve. Theme: ${opts.theme}.`;
  }
}

export function buildGameConfig(params: {
  game: Game;
  opts: GameConfigGenOptions;
  content: GameConfigContent;
  generatedBy: 'groq' | 'offline';
  id?: string;
  createdAt?: string;
  inRotation?: boolean;
  poolGroup?: string;
  title?: string;
}): GameConfig {
  const { game, opts, content, generatedBy } = params;
  const count = contentItemCount(content);
  const labels = CONFIG_LABELS[opts.kind];
  const createdAt = params.createdAt || new Date().toISOString();
  return {
    id: params.id || newId(`cfg-${opts.kind}`),
    gameId: game.id,
    kind: opts.kind,
    title: params.title || titleForOptions(opts, count),
    description: descriptionForOptions(opts, count, game.name),
    status: 'published',
    inRotation: params.inRotation ?? true,
    poolGroup: params.poolGroup,
    version: 1,
    createdAt,
    updatedAt: createdAt,
    playsCount: 0,
    winnersCount: 0,
    tags: [game.name, labels.pack, opts.theme, generatedBy === 'groq' ? 'Groq AI' : 'Offline Designer'],
    generatedBy,
    content,
  };
}

export function synthGameConfig(
  game: Game,
  opts: GameConfigGenOptions,
  settings?: GameConfigSettings,
  extras?: {
    id?: string;
    createdAt?: string;
    seedKey?: string;
    inRotation?: boolean;
    poolGroup?: string;
    title?: string;
  }
): GameConfig {
  const seedKey = extras?.seedKey || `${game.id}|${JSON.stringify(opts)}|${Date.now()}|${Math.random()}`;
  const content = synthContent(opts, settings, seedKey);
  return buildGameConfig({
    game,
    opts,
    content,
    generatedBy: 'offline',
    id: extras?.id,
    createdAt: extras?.createdAt,
    inRotation: extras?.inRotation,
    poolGroup: extras?.poolGroup,
    title: extras?.title,
  });
}
