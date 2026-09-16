"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { fetchCrushProgress, putCrushProgress } from "@/lib/crushApi";
import { recordGameLeaderboard } from "@/lib/leaderboardApi";
import { scoreTaterMatch } from "@/lib/pb/scoring";
import { BOOSTER_INFO, LEVELS, MAX_LIVES } from "./engine/levels";
import {
  commitProgress,
  getProgressSnapshot,
  getProgressUpdatedAt,
  getServerProgressSnapshot,
  loseLife,
  mergeRemoteProgress,
  msToNextLife,
  recordWin,
  refillLives,
  subscribeProgress,
  toCrushPutBody,
  touchProgressUpdatedAt,
  type CrushProgress,
} from "./engine/progress";
import { randomSeed } from "./engine/rng";
import type { BoosterType, LevelDef } from "./engine/types";
import { sounds } from "./render/sound";
import { CrushLevelMap } from "./ui/CrushLevelMap";
import { HowToSheet, LevelSheet, LivesSheet, ShopSheet } from "./ui/CrushModals";
import { CrushPlayScreen, type WinReward, type WinSummary } from "./ui/CrushPlayScreen";
import { useCountdown } from "./ui/crushUi";

const LIFE_REFILL_PRICE = 300;

export function PotatoCrushApp() {
  const router = useRouter();
  const { coins, addCoins, spendCoins } = usePbCoins();
  const { awardPoints } = usePbPoints();
  const session = useUserSession();

  const progress = useSyncExternalStore(subscribeProgress, getProgressSnapshot, getServerProgressSnapshot);
  const [screen, setScreen] = useState<"map" | "play">("map");
  const [sheetLevel, setSheetLevel] = useState<LevelDef | null>(null);
  const [activeLevel, setActiveLevel] = useState<LevelDef | null>(null);
  const [seed, setSeed] = useState(1);
  const [livesOpen, setLivesOpen] = useState(false);
  const [shopType, setShopType] = useState<BoosterType | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedFor = useRef<string | null>(null);

  const auth = {
    token: session.token,
    userId: session.userId,
    userName: session.userName,
  };

  // Same as quiz/leaderboard: always sync — crushApi headers fall back to DEV_USER_ID.
  const pushProgress = useCallback(
    (p: CrushProgress) => {
      const clientUpdatedAt = getProgressUpdatedAt() || touchProgressUpdatedAt();
      void putCrushProgress(auth, toCrushPutBody(p, clientUpdatedAt)).catch((err) => {
        console.warn("[crush] progress not saved", err);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.token, session.userId, session.userName],
  );

  const schedulePush = useCallback(
    (p: CrushProgress) => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => pushProgress(p), 400);
    },
    [pushProgress],
  );

  // Hydrate from BE on mount / user change
  useEffect(() => {
    const key = `${session.userId ?? "dev"}:${session.token ?? "none"}`;
    if (hydratedFor.current === key) return;
    hydratedFor.current = key;
    let cancelled = false;
    void fetchCrushProgress(auth)
      .then((remote) => {
        if (cancelled) return;
        const local = getProgressSnapshot();
        const merged = mergeRemoteProgress(local, remote);
        commitProgress(merged, { touch: false });
        // Bump client clock so PUT accepts the merged snapshot.
        touchProgressUpdatedAt();
        pushProgress(merged);
      })
      .catch((err) => {
        console.warn("[crush] progress not loaded", err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, session.userId, session.userName, pushProgress]);

  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  useEffect(() => {
    if (progress) sounds.enabled = progress.sound;
  }, [progress]);

  // Life refill ticker (only while not full)
  const livesFull = !progress || progress.lives >= MAX_LIVES;
  useEffect(() => {
    if (livesFull) return;
    const t = setInterval(() => {
      setNow(Date.now());
      const p = getProgressSnapshot();
      const next = refillLives(p);
      if (next.lives !== p.lives) {
        commitProgress(next);
        schedulePush(next);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [livesFull, schedulePush]);

  const update = useCallback(
    (fn: (p: CrushProgress) => CrushProgress) => {
      const next = fn(getProgressSnapshot());
      commitProgress(next);
      schedulePush(next);
    },
    [schedulePush],
  );

  const countdown = useCountdown(progress ? msToNextLife(progress, now) : 0);

  /* ------------------------------ actions ---------------------------- */

  const startLevel = (level: LevelDef) => {
    if (!progress || progress.lives <= 0) return;
    sounds.unlock();
    sounds.play("ui");
    setSheetLevel(null);
    setActiveLevel(level);
    setSeed(randomSeed());
    setScreen("play");
  };

  const goMap = () => {
    setScreen("map");
    setActiveLevel(null);
  };

  const handleWin = (summary: WinSummary): WinReward => {
    if (!activeLevel || !progress) return { coins: 0, firstClear: false, hasNext: false, pb: null };
    const previousStars = progress.stars[activeLevel.order] ?? 0;
    const firstClear = !(previousStars > 0);
    const reward = 40 * summary.stars + (firstClear ? 100 : 0);
    addCoins(reward);

    // PB Points are independent of Coins (FRD §1). One credit per attempt (level + seed).
    const score = scoreTaterMatch({
      stats: summary.stats,
      stars: summary.stars,
      perfect: summary.stars >= 3,
      firstClear,
      previousStars,
    });
    const pb = awardPoints({
      eventId: `crush:${activeLevel.id}:${seed}`,
      gameId: "potato-crush",
      points: score.points,
      lines: score.lines,
      perfect: score.perfect,
      label: `Potato Crush · Level ${activeLevel.order}`,
    });
    const matches = summary.stats.match3 + summary.stats.match4 + summary.stats.match5;
    const matchQuality =
      matches === 0
        ? 0
        : (summary.stats.match3 + summary.stats.match4 * 2 + summary.stats.match5 * 3) / (matches * 3);
    recordGameLeaderboard(session, {
      gameKey: "potato-crush",
      sessionId: `crush-${activeLevel.order}-${seed}`,
      coins: reward,
      metrics: [
        { key: "stars", value: summary.stars, max: 3 },
        { key: "matches", value: matchQuality, max: 1 },
        { key: "complete", value: 1, max: 1 },
      ],
    });

    update((p) => recordWin(p, activeLevel.order, summary.stars, summary.score, reward, LEVELS.length));
    return { coins: reward, firstClear, hasNext: activeLevel.order < LEVELS.length, pb };
  };

  const handleLose = () => {
    update((p) => loseLife(p));
  };

  const handleQuit = () => {
    goMap();
  };

  const handleQuitMidLevel = () => {
    update((p) => loseLife(p));
    goMap();
  };

  /** Retry from the lose screen: the life was already deducted on loss. */
  const handleRestart = () => {
    if (!progress || !activeLevel) return;
    if (progress.lives <= 0) {
      goMap();
      setLivesOpen(true);
      return;
    }
    setSeed(randomSeed());
  };

  /** Restart from the pause menu costs a life. */
  const handleRestartMidLevel = () => {
    if (!progress || !activeLevel) return;
    const after = loseLife(progress);
    update(() => after);
    if (after.lives <= 0) {
      goMap();
      setLivesOpen(true);
      return;
    }
    setSeed(randomSeed());
  };

  const handleNext = () => {
    if (!activeLevel) return;
    const next = LEVELS.find((l) => l.order === activeLevel.order + 1);
    if (!next) return goMap();
    setActiveLevel(next);
    setSeed(randomSeed());
  };

  const buyBooster = (type: BoosterType): boolean => {
    if (!spendCoins(BOOSTER_INFO[type].price)) return false;
    update((p) => ({ ...p, boosters: { ...p.boosters, [type]: (p.boosters[type] ?? 0) + 1 } }));
    return true;
  };

  const useBooster = (type: BoosterType) => {
    update((p) => ({
      ...p,
      boosters: { ...p.boosters, [type]: Math.max(0, (p.boosters[type] ?? 0) - 1) },
    }));
  };

  const refillLivesWithCoins = () => {
    if (!spendCoins(LIFE_REFILL_PRICE)) return;
    sounds.play("coin");
    update((p) => ({ ...p, lives: MAX_LIVES, livesAt: Date.now() }));
    setLivesOpen(false);
  };

  const toggleSound = () => {
    update((p) => {
      sounds.enabled = !p.sound;
      if (!p.sound) sounds.play("ui");
      return { ...p, sound: !p.sound };
    });
  };

  /* ------------------------------ render ----------------------------- */

  if (!progress) {
    return (
      <div className="crush-map relative mx-auto flex h-dvh w-full max-w-screen-sm items-center justify-center">
        <div className="crush-sky absolute inset-0" aria-hidden />
        <p className="relative font-display text-lg font-bold text-white">Loading Potato Crush…</p>
      </div>
    );
  }

  if (screen === "play" && activeLevel) {
    return (
      <CrushPlayScreen
        key={`${activeLevel.id}-${seed}`}
        level={activeLevel}
        seed={seed}
        boosters={progress.boosters}
        soundOn={progress.sound}
        lives={progress.lives}
        coins={coins}
        onUseBooster={useBooster}
        onBuyBooster={buyBooster}
        onWin={handleWin}
        onLose={handleLose}
        onQuit={handleQuit}
        onQuitMidLevel={handleQuitMidLevel}
        onRestart={handleRestart}
        onRestartMidLevel={handleRestartMidLevel}
        onNext={handleNext}
        onToggleSound={toggleSound}
      />
    );
  }

  return (
    <>
      <CrushLevelMap
        progress={progress}
        coins={coins}
        lifeCountdown={countdown}
        onBack={() => router.push("/games")}
        onSelectLevel={(lvl) => {
          sounds.unlock();
          sounds.play("ui");
          setSheetLevel(lvl);
        }}
        onOpenLives={() => setLivesOpen(true)}
        onOpenShop={(type) => setShopType(type)}
        onToggleSound={toggleSound}
        onHowTo={() => setHowToOpen(true)}
      />
      {sheetLevel ? (
        <LevelSheet
          level={sheetLevel}
          stars={progress.stars[sheetLevel.order] ?? 0}
          bestScore={progress.bestScores[sheetLevel.order] ?? 0}
          lives={progress.lives}
          onPlay={() => startLevel(sheetLevel)}
          onClose={() => setSheetLevel(null)}
        />
      ) : null}
      {livesOpen ? (
        <LivesSheet
          lives={progress.lives}
          countdown={countdown}
          coins={coins}
          refillPrice={LIFE_REFILL_PRICE}
          onRefill={refillLivesWithCoins}
          onClose={() => setLivesOpen(false)}
        />
      ) : null}
      {shopType ? (
        <ShopSheet
          type={shopType}
          owned={progress.boosters[shopType] ?? 0}
          coins={coins}
          onBuy={() => {
            if (buyBooster(shopType)) sounds.play("coin");
          }}
          onClose={() => setShopType(null)}
        />
      ) : null}
      {howToOpen ? <HowToSheet onClose={() => setHowToOpen(false)} /> : null}
    </>
  );
}

// end