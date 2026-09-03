import { REWARD_TIERS, type RewardTier } from "@/data/rewards";

export type RewardAddress = {
  fullName: string;
  phone: string;
  pincode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
};

export type OrderStatus = "placed" | "contacted" | "delivered";

export type RewardOrder = {
  id: string;
  tierId: string;
  tierPoints: number;
  tierLabel: string;
  tierImage: string;
  address: RewardAddress;
  status: OrderStatus;
  createdAt: string;
};

const ADDRESS_KEY = "pbZoneRewardAddress";
const CLAIMED_KEY = "pbZoneClaimedRewards";
const ORDERS_KEY = "pbZoneRewardOrders";

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
] as const;

export const EMPTY_ADDRESS: RewardAddress = {
  fullName: "",
  phone: "",
  pincode: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
};

export function getRewardTierById(tierId: string): RewardTier | null {
  return REWARD_TIERS.find((tier) => tier.id === tierId) ?? null;
}

export function saveRewardAddress(address: RewardAddress) {
  sessionStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
}

export function loadRewardAddress(): RewardAddress | null {
  try {
    const raw = sessionStorage.getItem(ADDRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RewardAddress;
  } catch {
    return null;
  }
}

export function loadClaimedRewardIds(): string[] {
  try {
    const raw = sessionStorage.getItem(CLAIMED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function markRewardClaimed(tierId: string) {
  const next = new Set(loadClaimedRewardIds());
  next.add(tierId);
  sessionStorage.setItem(CLAIMED_KEY, JSON.stringify([...next]));
}

export function loadRewardOrders(): RewardOrder[] {
  try {
    const raw = sessionStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RewardOrder[]) : [];
  } catch {
    return [];
  }
}

export function getRewardOrderById(orderId: string): RewardOrder | null {
  return loadRewardOrders().find((order) => order.id === orderId) ?? null;
}

export function placeRewardOrder(tier: RewardTier, address: RewardAddress): RewardOrder {
  const order: RewardOrder = {
    id: `ORD-${Date.now()}`,
    tierId: tier.id,
    tierPoints: tier.points,
    tierLabel: tier.label,
    tierImage: tier.image,
    address,
    status: "placed",
    createdAt: new Date().toISOString(),
  };

  const orders = [order, ...loadRewardOrders()];
  sessionStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  markRewardClaimed(tier.id);
  return order;
}

export function formatAddressBlock(address: RewardAddress) {
  const line2 = address.addressLine2.trim();
  const cityStatePin = [address.city, address.state]
    .filter(Boolean)
    .join(", ");
  const withPin = address.pincode
    ? `${cityStatePin} - ${address.pincode}`
    : cityStatePin;

  return {
    name: address.fullName,
    lines: [address.addressLine1, line2 || null, withPin].filter(Boolean) as string[],
    phone: address.phone,
  };
}
