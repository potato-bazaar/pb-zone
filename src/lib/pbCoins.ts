export const INITIAL_PB_COINS = 1000;
export const INITIAL_EARNED_COINS = 0;

const STORAGE_KEY = "pbZoneWallet";

export type PbWallet = {
  coins: number;
  earnedCoins: number;
};

export function loadPbWallet(): PbWallet {
  if (typeof window === "undefined") {
    return { coins: INITIAL_PB_COINS, earnedCoins: INITIAL_EARNED_COINS };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      return { coins: INITIAL_PB_COINS, earnedCoins: INITIAL_EARNED_COINS };
    }
    const parsed = JSON.parse(raw) as Partial<PbWallet> | number;
    if (typeof parsed === "number") {
      const coins = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : INITIAL_PB_COINS;
      return { coins, earnedCoins: 0 };
    }
    const coins = Number(parsed.coins);
    const earnedCoins = Number(parsed.earnedCoins);
    return {
      coins: Number.isFinite(coins) && coins >= 0 ? Math.floor(coins) : INITIAL_PB_COINS,
      earnedCoins:
        Number.isFinite(earnedCoins) && earnedCoins >= 0 ? Math.floor(earnedCoins) : 0,
    };
  } catch {
    return { coins: INITIAL_PB_COINS, earnedCoins: INITIAL_EARNED_COINS };
  }
}

export function savePbWallet(wallet: PbWallet) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        coins: Math.max(0, Math.floor(wallet.coins)),
        earnedCoins: Math.max(0, Math.floor(wallet.earnedCoins)),
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/** @deprecated use loadPbWallet */
export function loadPbCoins(): number {
  return loadPbWallet().coins;
}

/** @deprecated use savePbWallet */
export function savePbCoins(coins: number) {
  const current = loadPbWallet();
  savePbWallet({ ...current, coins: Math.max(0, Math.floor(coins)) });
}
