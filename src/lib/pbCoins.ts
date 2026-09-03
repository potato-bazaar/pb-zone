/** Demo starting balance — replace with API later */
export const INITIAL_PB_COINS = 4000;

const STORAGE_KEY = "pbZoneCoins";

export function loadPbCoins(): number {
  if (typeof window === "undefined") return INITIAL_PB_COINS;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw == null) return INITIAL_PB_COINS;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : INITIAL_PB_COINS;
  } catch {
    return INITIAL_PB_COINS;
  }
}

export function savePbCoins(coins: number) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      String(Math.max(0, Math.floor(coins))),
    );
  } catch {
    /* ignore quota / private mode */
  }
}
