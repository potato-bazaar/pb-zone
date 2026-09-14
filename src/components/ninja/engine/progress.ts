import type { NinjaMode, PowerKind } from "./ninja";

const KEY = "pbZoneNinja.v1";

export interface NinjaProgress {
  best: Record<NinjaMode, number>;
  ownedSkins: string[];
  skin: string;
  powerups: Record<PowerKind, number>;
  challengesDone: string[];
  sound: boolean;
  runs: number;
  totalSliced: number;
}

export function defaultNinjaProgress(): NinjaProgress {
  return {
    best: { classic: 0, time: 0, arcade: 0 },
    ownedSkins: ["default"],
    skin: "default",
    powerups: { freeze: 1, life: 1, multi: 0, shield: 0 },
    challengesDone: [],
    sound: true,
    runs: 0,
    totalSliced: 0,
  };
}

let cached: NinjaProgress | null = null;
const listeners = new Set<() => void>();

function load(): NinjaProgress {
  if (typeof window === "undefined") return defaultNinjaProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultNinjaProgress();
    const parsed = JSON.parse(raw) as Partial<NinjaProgress>;
    const d = defaultNinjaProgress();
    return {
      ...d,
      ...parsed,
      best: { ...d.best, ...(parsed.best ?? {}) },
      powerups: { ...d.powerups, ...(parsed.powerups ?? {}) },
    };
  } catch {
    return defaultNinjaProgress();
  }
}

export function subscribeNinja(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNinjaSnapshot(): NinjaProgress {
  if (!cached) cached = load();
  return cached;
}

export function getNinjaServerSnapshot(): NinjaProgress | null {
  return null;
}

export function commitNinja(next: NinjaProgress) {
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

export function updateNinja(fn: (p: NinjaProgress) => NinjaProgress) {
  commitNinja(fn(getNinjaSnapshot()));
}
