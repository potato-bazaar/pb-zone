export type RewardTier = {
  id: string;
  points: number;
  label: string;
  product: "cap" | "pen" | "bottle" | "backpack";
  image: string;
};

export type EarnMethod = {
  id: string;
  label: string;
  icon: "games" | "bonus" | "challenges" | "streak";
};

export const REWARD_MILESTONES = [
  { points: 0, label: "Started" },
  { points: 500, label: "Basic Gift" },
  { points: 1000, label: "Special Gift" },
  { points: 2000, label: "Mega Prize Entry" },
] as const;

export const REWARD_TIERS: RewardTier[] = [
  {
    id: "basic",
    points: 500,
    label: "Basic Gift",
    product: "cap",
    image: "/images/rewards/reward-cap.png",
  },
  {
    id: "special-1k",
    points: 1000,
    label: "Special Gift",
    product: "pen",
    image: "/images/rewards/reward-pen.png",
  },
  {
    id: "special-15k",
    points: 1500,
    label: "Special Gift",
    product: "bottle",
    image: "/images/rewards/reward-bottle.png",
  },
  {
    id: "mega",
    points: 2000,
    label: "Mega Prize Entry",
    product: "backpack",
    image: "/images/rewards/reward-backpack.png",
  },
];

export const EARN_METHODS: EarnMethod[] = [
  { id: "games", label: "Playing Games", icon: "games" },
  { id: "bonus", label: "Daily Bonus", icon: "bonus" },
  { id: "challenges", label: "Challenges", icon: "challenges" },
  { id: "streak", label: "Streak Bonus", icon: "streak" },
];

export function getNextMilestone(points: number) {
  return REWARD_MILESTONES.find((m) => m.points > points) ?? null;
}

export function pointsToUnlockTier(points: number, tierPoints: number) {
  return Math.max(0, tierPoints - points);
}

export function isTierUnlocked(points: number, tierPoints: number) {
  return points >= tierPoints;
}
