/**
 * PB Points economy configuration.
 * Source: docs/pb-zone-economy-frd.md (Game Economy & Scoring Logic FRD).
 *
 * Coins and Points are independent. Nothing in this file may convert one
 * into the other.
 */

/* ------------------------------------------------------------------ */
/*  Season                                                             */
/* ------------------------------------------------------------------ */

export const PB_SEASON = {
  id: "2026-09",
  label: "September Season",
  startsAt: "2026-09-01T00:00:00+05:30",
  endsAt: "2026-09-30T23:59:59+05:30",
} as const;

export function seasonDaysRemaining(now: Date = new Date()): number {
  const end = new Date(PB_SEASON.endsAt).getTime();
  const ms = end - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/* ------------------------------------------------------------------ */
/*  Caps (FRD §4)                                                      */
/* ------------------------------------------------------------------ */

export const GLOBAL_DAILY_POINT_CAP = 1000;

export type PbGameId =
  | "quiz-time"
  | "potato-crush"
  | "spud-run"
  | "word-scramble"
  | "guess-disease"
  | "fix-puzzle"
  | "connect-potatoes"
  | "potato-stack"
  | "basket-blitz"
  | "mash-master"
  | "potato-ninja"
  | "potato-sort"
  | "daily-challenge";

export const PB_GAME_LABELS: Record<PbGameId, string> = {
  "quiz-time": "Quiz Time",
  "potato-crush": "Potato Crush",
  "spud-run": "Potato Run",
  "word-scramble": "Word Scramble",
  "guess-disease": "Guess Potato Disease",
  "fix-puzzle": "Fix the Puzzle",
  "connect-potatoes": "Connect Potatoes",
  "potato-stack": "Potato Stack",
  "basket-blitz": "Basket Blitz",
  "mash-master": "Mash Master",
  "potato-ninja": "Potato Ninja",
  "potato-sort": "Potato Sort",
  "daily-challenge": "Daily Challenge",
};

/** Per-game daily PB Point caps. Potato Ninja is not in the FRD; 200 is an assumption. */
export const GAME_DAILY_POINT_CAPS: Record<PbGameId, number> = {
  "quiz-time": 300,
  "potato-crush": 300,
  "spud-run": 250,
  "word-scramble": 250,
  "guess-disease": 300,
  "fix-puzzle": 250,
  "connect-potatoes": 250,
  "potato-stack": 200,
  "basket-blitz": 200,
  "mash-master": 200,
  "potato-ninja": 200,
  /** Potato Sort is the FRD's Basket Blitz (speed + sorting). */
  "potato-sort": 200,
  "daily-challenge": 75,
};

export const DAILY_CAP_MESSAGE =
  "Daily Points complete — keep playing to earn Coins.";

/* ------------------------------------------------------------------ */
/*  Streaks (FRD §17) and Daily Challenge (FRD §16)                    */
/* ------------------------------------------------------------------ */

export const STREAK_BONUS = [
  { streak: 3, points: 3, coins: 3 },
  { streak: 5, points: 8, coins: 5 },
  { streak: 7, points: 12, coins: 8 },
  { streak: 10, points: 15, coins: 10 },
] as const;

export const DAILY_CHALLENGE_REWARD = { coins: 50, points: 75 } as const;

/* ------------------------------------------------------------------ */
/*  Lifetime milestones (FRD §18)                                      */
/* ------------------------------------------------------------------ */

export type MilestoneType = "digital" | "basic-gift" | "physical-gift" | "campaign";

export type LifetimeMilestone = {
  id: string;
  points: number;
  label: string;
  type: MilestoneType;
  typeLabel: string;
  /** Product image for physical rewards. */
  image?: string;
  /** Emoji fallback for digital rewards. */
  emoji: string;
  /** Physical rewards go through the address / claim flow. */
  claimable: boolean;
};

export const LIFETIME_MILESTONES: LifetimeMilestone[] = [
  { id: "rookie-badge", points: 100, label: "PB Rookie Badge", type: "digital", typeLabel: "Digital badge", emoji: "🥔", claimable: false },
  { id: "sticker-pack", points: 250, label: "PB Sticker Pack", type: "digital", typeLabel: "Digital stickers", emoji: "🎴", claimable: false },
  { id: "bottle", points: 500, label: "PB Bottle", type: "basic-gift", typeLabel: "Basic gift", image: "/images/rewards/reward-bottle.png", emoji: "🍶", claimable: true },
  { id: "cap-pen", points: 1000, label: "PB Cap / Pen", type: "basic-gift", typeLabel: "Basic gift", image: "/images/rewards/reward-cap.png", emoji: "🧢", claimable: true },
  { id: "bag", points: 2500, label: "PB Bag", type: "physical-gift", typeLabel: "Physical gift", image: "/images/rewards/reward-backpack.png", emoji: "🎒", claimable: true },
  { id: "champion-badge", points: 5000, label: "PB Champion Badge", type: "digital", typeLabel: "Digital status", emoji: "🏅", claimable: false },
  { id: "premium-gift", points: 10000, label: "Premium PB Gift", type: "campaign", typeLabel: "Campaign gift", image: "/images/rewards/reward-gift-confetti.png", emoji: "🎁", claimable: true },
];

export type MilestoneProgress = {
  /** Highest milestone already unlocked, or null below 100 PB. */
  current: LifetimeMilestone | null;
  /** Next milestone to unlock, or null when everything is unlocked. */
  next: LifetimeMilestone | null;
  /** Points still needed for `next`. */
  remaining: number;
  /** 0–100 progress from `current` to `next`. */
  pct: number;
  unlocked: LifetimeMilestone[];
};

export function milestoneProgress(lifetimePoints: number): MilestoneProgress {
  const unlocked = LIFETIME_MILESTONES.filter((m) => lifetimePoints >= m.points);
  const current = unlocked[unlocked.length - 1] ?? null;
  const next = LIFETIME_MILESTONES.find((m) => lifetimePoints < m.points) ?? null;
  const floor = current?.points ?? 0;
  const span = next ? next.points - floor : 1;
  const pct = next ? Math.min(100, Math.max(0, Math.round(((lifetimePoints - floor) / span) * 100))) : 100;
  return {
    current,
    next,
    remaining: next ? Math.max(0, next.points - lifetimePoints) : 0,
    pct,
    unlocked,
  };
}

export function newlyUnlockedMilestones(before: number, after: number): LifetimeMilestone[] {
  return LIFETIME_MILESTONES.filter((m) => before < m.points && after >= m.points);
}

/** Player title shown on profile / home, derived from lifetime PB. */
export function pbTitleFor(lifetimePoints: number): string {
  if (lifetimePoints >= 5000) return "PB Champion";
  if (lifetimePoints >= 2500) return "PB Star";
  if (lifetimePoints >= 1000) return "PB Pro";
  return "PB Rookie";
}

/* ------------------------------------------------------------------ */
/*  Season prizes (FRD §19)                                            */
/* ------------------------------------------------------------------ */

export type SeasonPrize = {
  rank: 1 | 2 | 3;
  title: string;
  image?: string;
  emoji: string;
};

export const SEASON_PRIZES: SeasonPrize[] = [
  { rank: 1, title: "Mobile Phone", image: "/images/rewards/mega-prize-phone.png", emoji: "📱" },
  { rank: 2, title: "Headphones", image: "/images/rewards/mega-prize-headphones.png", emoji: "🎧" },
  { rank: 3, title: "Earbuds", emoji: "🎶" },
];

export const TIE_BREAKERS = [
  "More perfect performances",
  "Higher validated accuracy",
  "Earlier time reaching final score",
] as const;

export const HOW_PB_WORKS = [
  "Earn PB Points by playing games well: accuracy, speed, difficulty and streaks.",
  "Season PB Points set your leaderboard rank. The season resets every month.",
  "Top 3 players win this season's mega prizes.",
  "Lifetime PB Points unlock milestone rewards that never reset.",
] as const;
