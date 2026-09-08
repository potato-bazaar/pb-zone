"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  INITIAL_PB_COINS,
  INITIAL_PB_POINTS,
  loadPbWallet,
  savePbWallet,
  type PbWallet,
} from "@/lib/pbCoins";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { fetchQuizPoints } from "@/lib/quizApi";

type PbCoinsContextValue = {
  coins: number;
  earnedCoins: number;
  bonusCoins: number;
  pbPoints: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  spendEarnedCoins: (amount: number) => boolean;
  setCoins: (amount: number) => void;
  setWallet: (wallet: {
    coins: number;
    earnedCoins?: number;
    pbPoints?: number;
  }) => void;
};

const PbCoinsContext = createContext<PbCoinsContextValue>({
  coins: INITIAL_PB_COINS,
  earnedCoins: 0,
  bonusCoins: INITIAL_PB_COINS,
  pbPoints: INITIAL_PB_POINTS,
  addCoins: () => {},
  spendCoins: () => false,
  spendEarnedCoins: () => false,
  setCoins: () => {},
  setWallet: () => {},
});

export function PbCoinsProvider({ children }: { children: ReactNode }) {
  const session = useUserSession();
  const [wallet, setWalletState] = useState<PbWallet>({
    coins: INITIAL_PB_COINS,
    earnedCoins: 0,
    pbPoints: INITIAL_PB_POINTS,
  });
  const walletRef = useRef(wallet);

  useEffect(() => {
    const loaded = loadPbWallet();
    walletRef.current = loaded;
    setWalletState(loaded);
  }, []);

  const commit = useCallback((next: PbWallet) => {
    const coins = Math.max(0, Math.floor(next.coins));
    const earnedCoins = Math.max(0, Math.min(coins, Math.floor(next.earnedCoins)));
    const pbPoints = Math.max(0, Math.floor(next.pbPoints));
    const clamped = { coins, earnedCoins, pbPoints };
    walletRef.current = clamped;
    savePbWallet(clamped);
    setWalletState(clamped);
    return clamped;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchQuizPoints({
      token: session.token,
      userId: session.userId,
      userName: session.userName,
    })
      .then((data) => {
        if (cancelled) return;
        commit({
          coins: data.points,
          earnedCoins: data.earnedPoints,
          pbPoints: data.leaderboardPoints,
        });
      })
      .catch(() => {
        /* keep local starter wallet until quiz API is reachable */
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, session.userId, session.userName, commit]);

  const addCoins = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const current = walletRef.current;
      commit({
        coins: current.coins + amount,
        earnedCoins: current.earnedCoins + amount,
        pbPoints: current.pbPoints,
      });
    },
    [commit],
  );

  const spendCoins = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) return true;
      const current = walletRef.current;
      if (current.coins < amount) return false;
      const bonus = Math.max(0, current.coins - current.earnedCoins);
      const fromEarned = Math.max(0, amount - bonus);
      commit({
        coins: current.coins - amount,
        earnedCoins: Math.max(0, current.earnedCoins - fromEarned),
        pbPoints: current.pbPoints,
      });
      return true;
    },
    [commit],
  );

  const spendEarnedCoins = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) return true;
      const current = walletRef.current;
      if (current.earnedCoins < amount) return false;
      commit({
        coins: Math.max(0, current.coins - amount),
        earnedCoins: current.earnedCoins - amount,
        pbPoints: current.pbPoints,
      });
      return true;
    },
    [commit],
  );

  const setCoins = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount)) return;
      const coins = Math.max(0, Math.floor(amount));
      commit({
        coins,
        earnedCoins: Math.min(walletRef.current.earnedCoins, coins),
        pbPoints: walletRef.current.pbPoints,
      });
    },
    [commit],
  );

  const setWallet = useCallback(
    (next: { coins: number; earnedCoins?: number; pbPoints?: number }) => {
      if (!Number.isFinite(next.coins)) return;
      commit({
        coins: next.coins,
        earnedCoins:
          typeof next.earnedCoins === "number"
            ? next.earnedCoins
            : walletRef.current.earnedCoins,
        pbPoints:
          typeof next.pbPoints === "number"
            ? next.pbPoints
            : walletRef.current.pbPoints,
      });
    },
    [commit],
  );

  const bonusCoins = Math.max(0, wallet.coins - wallet.earnedCoins);

  return (
    <PbCoinsContext.Provider
      value={{
        coins: wallet.coins,
        earnedCoins: wallet.earnedCoins,
        bonusCoins,
        pbPoints: wallet.pbPoints,
        addCoins,
        spendCoins,
        spendEarnedCoins,
        setCoins,
        setWallet,
      }}
    >
      {children}
    </PbCoinsContext.Provider>
  );
}

export function usePbCoins() {
  return useContext(PbCoinsContext);
}
