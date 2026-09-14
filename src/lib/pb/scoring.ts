/**
 * Per-game PB Point scoring rules (FRD §6–§15).
 *
 * Each function turns raw session facts into a PB total plus a breakdown
 * the "Game Complete" screen can show. Wrong / failed actions give 0,
 * never negative. Coins are handled by the games themselves.
 */

import type { PbBreakdownLine } from "@/lib/pb/pbPoints";

export type PbScore = {
  points: number;
  lines: PbBreakdownLine[];
  perfect: boolean;
};

function compact(lines: PbBreakdownLine[]): PbBreakdownLine[] {
  return lines.filter((l) => l.points > 0);
}

function sum(lines: PbBreakdownLine[]): number {
  return lines.reduce((acc, l) => acc + l.points, 0);
}

/* ------------------------------------------------------------------ */
/*  Quiz (FRD §6)                                                      */
/* ------------------------------------------------------------------ */

export type QuizDifficulty = "easy" | "medium" | "hard" | "expert";

export type QuizAnswerRecord = {
  correct: boolean;
  /** Seconds taken to answer. Timeouts use the full timer. */
  seconds: number;
  difficulty?: QuizDifficulty;
};

const QUIZ_BASE: Record<QuizDifficulty, number> = { easy: 5, medium: 8, hard: 12, expert: 20 };

/** Streak bonus is capped so long streaks cannot grow without limit (FRD §17). */
const QUIZ_STREAK_BONUS_CAP = 60;

export function quizSpeedBonus(seconds: number): number {
  if (seconds <= 2) return 5;
  if (seconds <= 4) return 3;
  if (seconds <= 7) return 2;
  return 1;
}

export function scoreQuiz(answers: QuizAnswerRecord[], totalQuestions: number): PbScore {
  let basePoints = 0;
  let speedPoints = 0;
  let streakPoints = 0;
  let streak = 0;
  let correct = 0;

  for (const a of answers) {
    if (!a.correct) {
      streak = 0;
      continue;
    }
    correct += 1;
    streak += 1;
    basePoints += QUIZ_BASE[a.difficulty ?? "medium"];
    speedPoints += quizSpeedBonus(a.seconds);
    if (streak === 3) streakPoints += 3;
    else if (streak === 5) streakPoints += 8;
    else if (streak >= 7) streakPoints += 12;
  }
  streakPoints = Math.min(streakPoints, QUIZ_STREAK_BONUS_CAP);

  const answeredAll = answers.length >= totalQuestions && totalQuestions >= 10;
  const perfect = answeredAll && correct === totalQuestions;

  const lines = compact([
    { label: "Correct answers", points: basePoints },
    { label: "Speed bonus", points: speedPoints },
    { label: "Streak bonus", points: streakPoints },
    { label: "Completion bonus", points: answeredAll ? 10 : 0 },
    { label: "Perfect quiz", points: perfect ? 25 : 0 },
  ]);

  return { points: sum(lines), lines, perfect };
}

/* ------------------------------------------------------------------ */
/*  Tater Match — Potato Crush (FRD §7)                                */
/* ------------------------------------------------------------------ */

export type TaterMatchStats = {
  match3: number;
  match4: number;
  match5: number;
  /** Cascade / chain clears after the first in a move. */
  combos: number;
  /** Special potatoes created by skill (striped, wrapped, bomb). */
  specials: number;
};

export const EMPTY_TATER_STATS: TaterMatchStats = { match3: 0, match4: 0, match5: 0, combos: 0, specials: 0 };

const TATER_COMBO_CAP = 10;

export function taterStarBonus(stars: number): number {
  if (stars >= 3) return 40;
  if (stars === 2) return 20;
  if (stars === 1) return 10;
  return 0;
}

export function scoreTaterMatch(input: {
  stats: TaterMatchStats;
  stars: number;
  perfect: boolean;
  firstClear: boolean;
  /** Best stars before this run, used to limit replay farming. */
  previousStars: number;
}): PbScore {
  const { stats, stars, perfect, firstClear, previousStars } = input;

  if (!firstClear) {
    // Replaying a cleared level only pays for genuinely better efficiency
    // (FRD §20: repeated replay cannot create unlimited Points).
    const delta = Math.max(0, taterStarBonus(stars) - taterStarBonus(previousStars));
    const lines = compact([{ label: "Improved star rating", points: delta }]);
    return { points: sum(lines), lines, perfect: false };
  }

  const lines = compact([
    { label: "Match 3", points: stats.match3 * 3 },
    { label: "Match 4", points: stats.match4 * 6 },
    { label: "Match 5+", points: stats.match5 * 10 },
    { label: "Combos", points: Math.min(stats.combos, TATER_COMBO_CAP) * 3 },
    { label: "Special potatoes", points: stats.specials * 5 },
    { label: "Level complete", points: 10 },
    { label: `${stars}-star efficiency`, points: taterStarBonus(stars) },
    { label: "Perfect level", points: perfect ? 50 : 0 },
  ]);

  return { points: sum(lines), lines, perfect };
}

/* ------------------------------------------------------------------ */
/*  Potato Ninja — not in the FRD; scored as a timing/reflex game      */
/* ------------------------------------------------------------------ */

export type NinjaRunFacts = {
  sliced: number;
  golden: number;
  maxCombo: number;
  bombsHit: number;
  challengeDone: boolean;
  newBest: boolean;
};

const NINJA_SLICE_CAP = 60;

export function scorePotatoNinja(run: NinjaRunFacts): PbScore {
  const cleanRun = run.bombsHit === 0 && run.sliced >= 10;
  const perfect = run.bombsHit === 0 && run.sliced >= 25;

  const lines = compact([
    { label: "Potatoes sliced", points: Math.min(run.sliced, NINJA_SLICE_CAP) },
    { label: "Golden potatoes", points: run.golden * 3 },
    { label: "Combo slicing", points: run.maxCombo >= 4 ? 3 * Math.min(run.maxCombo - 3, 5) : 0 },
    { label: "No bombs hit", points: cleanRun ? 10 : 0 },
    { label: "Challenge complete", points: run.challengeDone ? 15 : 0 },
    { label: "New personal best", points: run.newBest ? 25 : 0 },
  ]);

  return { points: sum(lines), lines, perfect };
}

/* ------------------------------------------------------------------ */
/*  Potato Sort — Basket Blitz rules (FRD §14)                         */
/* ------------------------------------------------------------------ */

export type PotatoSortStats = {
  /** Correct sorts that were not fast. */
  correct: number;
  /** Correct sorts within the fast window. */
  fast: number;
  wrong: number;
  missed: number;
  /** Times the combo reached 5 / 10 during the round. */
  combo5: number;
  combo10: number;
  /** Every potato in the round was handled before time ran out. */
  roundComplete: boolean;
  total: number;
};

export function scorePotatoSort(stats: PotatoSortStats): PbScore {
  const perfect = stats.roundComplete && stats.wrong === 0 && stats.missed === 0 && stats.correct + stats.fast === stats.total;
  const lines = compact([
    { label: "Correct items", points: stats.correct * 2 },
    { label: "Fast correct items", points: stats.fast * 4 },
    { label: "5-correct combos", points: stats.combo5 * 8 },
    { label: "10-correct combos", points: stats.combo10 * 15 },
    { label: "Round complete", points: stats.roundComplete ? 10 : 0 },
    { label: "Perfect round", points: perfect ? 25 : 0 },
  ]);
  return { points: sum(lines), lines, perfect };
}

/** Coins for the same round (FRD §14 coin column). */
export function coinsForPotatoSort(stats: PotatoSortStats): number {
  const perfect = stats.roundComplete && stats.wrong === 0 && stats.missed === 0 && stats.correct + stats.fast === stats.total;
  return stats.correct * 1 + stats.fast * 2 + stats.combo5 * 4 + stats.combo10 * 8 + (stats.roundComplete ? 10 : 0) + (perfect ? 15 : 0);
}

/* ------------------------------------------------------------------ */
/*  Potato Run — Spud Run rules (FRD §8)                               */
/* ------------------------------------------------------------------ */

export type PotatoRunFacts = {
  distance: number;
  /** PB star potatoes collected. */
  stars: number;
  potatoes: number;
  boxes: number;
  /** Obstacles cleared in the player's own lane (jumped, slid or dodged late). */
  avoided: number;
  /** 250 m sections finished without a hit. */
  perfectSections: number;
  hits: number;
  missionsDone: number;
  newBest: boolean;
};

const RUN_MILESTONES: [number, number, number][] = [
  [100, 2, 3],
  [500, 8, 8],
  [1000, 15, 15],
  [1500, 30, 30],
];
const RUN_AVOID_CAP = 60;

export function scorePotatoRun(f: PotatoRunFacts): PbScore {
  const noCollision = f.hits === 0 && f.distance >= 300;
  const lines = compact([
    ...RUN_MILESTONES.map(([m, pts]) => ({ label: m === 1500 ? "1,500 m finish" : `${m.toLocaleString("en-IN")} m reached`, points: f.distance >= m ? pts : 0 })),
    { label: "PB stars collected", points: f.stars },
    { label: "Obstacles avoided", points: Math.min(f.avoided, RUN_AVOID_CAP) },
    { label: "Perfect sections", points: f.perfectSections * 10 },
    { label: "Delivery missions", points: f.missionsDone * 5 },
    { label: "No-collision run", points: noCollision ? 25 : 0 },
    { label: "New personal best", points: f.newBest ? 30 : 0 },
  ]);
  return { points: sum(lines), lines, perfect: noCollision && f.distance >= 1500 };
}

/** Coins for the same run (FRD §8 coin column, plus a little for the potato haul). */
export function coinsForPotatoRun(f: PotatoRunFacts): number {
  const noCollision = f.hits === 0 && f.distance >= 300;
  const milestones = RUN_MILESTONES.reduce((acc, [m, , c]) => acc + (f.distance >= m ? c : 0), 0);
  return milestones + f.stars + Math.min(f.avoided, RUN_AVOID_CAP) + f.perfectSections * 5 + Math.floor(f.potatoes / 5) + f.missionsDone * 3 + (noCollision ? 10 : 0) + (f.newBest ? 15 : 0);
}
