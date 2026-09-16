"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { recordGameLeaderboard } from "@/lib/leaderboardApi";
import { sounds } from "@/components/crush/render/sound";
import { coinsForPotatoRun, scorePotatoRun } from "@/lib/pb/scoring";
import type { RunFacts } from "./engine/run";
import { RunBoard, type BoardTab } from "./ui/RunBoard";
import { RunHowTo } from "./ui/RunHowTo";
import { RunPlay, type RunReward } from "./ui/RunPlay";
import { RunStart } from "./ui/RunStart";

const STORAGE_KEY = "pbZoneRun.v1";

type Saved = { best: number; seenHowTo: boolean };
const EMPTY: Saved = { best: 0, seenHowTo: false };
let cache: { raw: string | null; value: Saved } = { raw: null, value: EMPTY };

function loadSaved(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cache.raw) return cache.value;
    const parsed = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
    cache = { raw, value: { best: typeof parsed.best === "number" ? parsed.best : 0, seenHowTo: !!parsed.seenHowTo } };
    return cache.value;
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function save(patch: Partial<Saved>) {
  const next = { ...loadSaved(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn());
}

type Phase = "start" | "howto" | "board" | "play";

export function PotatoRunApp() {
  const router = useRouter();
  const { addCoins, coins } = usePbCoins();
  const { awardPoints } = usePbPoints();
  const session = useUserSession();
  const [phase, setPhase] = useState<Phase>("start");
  const [boardTab, setBoardTab] = useState<BoardTab>("leaderboard");
  const [seed, setSeed] = useState(0);
  const saved = useSyncExternalStore(subscribe, loadSaved, () => EMPTY);
  const best = saved.best;

  const startRun = () => {
    sounds.unlock();
    sounds.play("ui");
    save({ seenHowTo: true });
    setSeed(Date.now());
    setPhase("play");
  };

  const onPlayNow = () => {
    if (!saved.seenHowTo) {
      sounds.unlock();
      sounds.play("ui");
      setPhase("howto");
      return;
    }
    startRun();
  };

  const openBoard = (tab: BoardTab) => {
    sounds.play("ui");
    setBoardTab(tab);
    setPhase("board");
  };

  const finish = useCallback(
    (facts: RunFacts): RunReward => {
      const newBest = facts.distance > best;
      const scoreFacts = { ...facts, newBest: newBest && best > 0 };
      const score = scorePotatoRun(scoreFacts);
      const coins = coinsForPotatoRun(scoreFacts);
      if (coins > 0) addCoins(coins);
      const receipt = awardPoints({
        eventId: `run:${seed}`,
        gameId: "spud-run",
        points: score.points,
        lines: score.lines,
        perfect: score.perfect,
        label: "Potato Run",
      });
      recordGameLeaderboard(session, {
        gameKey: "spud-run",
        sessionId: `run-${seed}`,
        coins,
        metrics: [
          { key: "distance", value: Math.min(facts.distance, 1500), max: 1500 },
          { key: "clean", value: facts.hits === 0 ? 1 : 0, max: 1 },
          { key: "finish", value: facts.finished ? 1 : 0, max: 1 },
        ],
      });
      const nextBest = Math.max(best, facts.distance);
      if (newBest) save({ best: nextBest });
      return { coins, newBest: newBest && best > 0, pb: receipt, best: nextBest };
    },
    [addCoins, awardPoints, best, seed, session],
  );

  if (phase === "play") {
    return <RunPlay key={seed} seed={seed} best={best} onFinish={finish} onRestart={startRun} onMenu={() => setPhase("start")} onHome={() => router.push("/home")} />;
  }
  if (phase === "howto") {
    return <RunHowTo onGo={startRun} onClose={() => setPhase("start")} />;
  }
  if (phase === "board") {
    return <RunBoard tab={boardTab} onClose={() => setPhase("start")} />;
  }
  return <RunStart best={best} coins={coins} onPlay={onPlayNow} onHowTo={() => setPhase("howto")} onRewards={() => openBoard("rewards")} onLeaderboard={() => openBoard("leaderboard")} onBack={() => router.push("/games")} />;
}
