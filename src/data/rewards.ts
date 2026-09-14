/**
 * Claimable reward tiers. Derived from the lifetime PB milestone ladder in
 * pbEconomy.ts so the claim / address / order flow and the Rewards screen
 * share one source of truth.
 */

import { LIFETIME_MILESTONES, type LifetimeMilestone } from "@/data/pbEconomy";

export type RewardTier = {
  id: string;
  points: number;
  label: string;
  image: string;
  milestone: LifetimeMilestone;
};

export const REWARD_TIERS: RewardTier[] = LIFETIME_MILESTONES.filter(
  (m): m is LifetimeMilestone & { image: string } => m.claimable && !!m.image,
).map((m) => ({
  id: m.id,
  points: m.points,
  label: m.label,
  image: m.image,
  milestone: m,
}));

export function pointsToUnlockTier(points: number, tierPoints: number) {
  return Math.max(0, tierPoints - points);
}

export function isTierUnlocked(points: number, tierPoints: number) {
  return points >= tierPoints;
}
