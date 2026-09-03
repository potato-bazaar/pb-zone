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
  loadPbCoins,
  savePbCoins,
} from "@/lib/pbCoins";

type PbCoinsContextValue = {
  coins: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  setCoins: (amount: number) => void;
};

const PbCoinsContext = createContext<PbCoinsContextValue>({
  coins: INITIAL_PB_COINS,
  addCoins: () => {},
  spendCoins: () => false,
  setCoins: () => {},
});

export function PbCoinsProvider({ children }: { children: ReactNode }) {
  const [coins, setCoinsState] = useState(INITIAL_PB_COINS);
  const coinsRef = useRef(coins);

  useEffect(() => {
    const loaded = loadPbCoins();
    coinsRef.current = loaded;
    setCoinsState(loaded);
  }, []);

  const commit = useCallback((next: number) => {
    const clamped = Math.max(0, Math.floor(next));
    coinsRef.current = clamped;
    savePbCoins(clamped);
    setCoinsState(clamped);
    return clamped;
  }, []);

  const addCoins = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      commit(coinsRef.current + amount);
    },
    [commit],
  );

  const spendCoins = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) return true;
      if (coinsRef.current < amount) return false;
      commit(coinsRef.current - amount);
      return true;
    },
    [commit],
  );

  const setCoins = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount)) return;
      commit(amount);
    },
    [commit],
  );

  return (
    <PbCoinsContext.Provider value={{ coins, addCoins, spendCoins, setCoins }}>
      {children}
    </PbCoinsContext.Provider>
  );
}

export function usePbCoins() {
  return useContext(PbCoinsContext);
}
