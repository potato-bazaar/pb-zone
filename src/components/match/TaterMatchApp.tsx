"use client";

import { useEffect, useRef, useState } from "react";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { useBackTo } from "@/hooks/useBackTo";
import { recordGameLeaderboard } from "@/lib/leaderboardApi";
import { stepBack } from "@/lib/navStack";
import { withBackendPhotos } from "@/lib/taterMatchApi";
import {
  DAILY_QUESTIONS,
  TATER_SCORING,
  applyRoundToProgress,
  buildMixedRound,
  buildRound,
  INITIAL_TATER_PROGRESS,
  loadTaterProgress,
  modeMeta,
  saveTaterProgress,
  todayKey,
  type TaterModeId,
  type TaterProgress,
  type TaterQuestion,
} from "@/data/taterMatch";
import { TaterMatchHome } from "@/components/match/TaterMatchHome";
import { TaterMatchHowTo } from "@/components/match/TaterMatchHowTo";
import { TaterMatchPlay } from "@/components/match/TaterMatchPlay";
import { TaterMatchProgress } from "@/components/match/TaterMatchProgress";
import { TaterMatchResult } from "@/components/match/TaterMatchResult";
import { TaterLoader } from "@/components/match/TaterUi";

type Phase = "home" | "howto" | "progress" | "play" | "result";
type RoundMode = TaterModeId | "mixed";

type RoundResult = {
  correct: number;
  total: number;
  pointsEarned: number;
  coinsEarned: number;
  seconds: number;
  learned: string[];
  mode: RoundMode;
  daily: boolean;
};

function roundTitle(mode: RoundMode, daily: boolean) {
  if (daily) return "Daily Challenge";
  if (mode === "mixed") return "Mixed Match";
  return modeMeta(mode).title;
}

export function TaterMatchApp() {
  // The game home is the root screen: its back leaves for the PB Zone hub (popping history when the hub is behind us).
  const backToHub = useBackTo("/home");
  const session = useUserSession();
  const { coins, pbPoints, addCoins } = usePbCoins();
  const { awardPoints, state: pbState } = usePbPoints();
  const [phase, setPhase] = useState<Phase>("home");
  // Saved progress lives in localStorage. Start from the empty record so the first
  // server and client render match, then read the saved record after mount.
  const [progress, setProgress] = useState<TaterProgress>(INITIAL_TATER_PROGRESS);
  const [mode, setMode] = useState<RoundMode>("mixed");
  const [daily, setDaily] = useState(false);
  const [questions, setQuestions] = useState<TaterQuestion[]>([]);
  const [roundKey, setRoundKey] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [startingRound, setStartingRound] = useState(false);
  const ignorePopRef = useRef(false);
  // False once the player has left (on-screen or phone back) so a round still loading can't start
  // afterwards. Set inside the effect so React's StrictMode remount leaves it true.
  const mountedRef = useRef(false);

  const displayPoints = Math.max(pbPoints, pbState.seasonPoints);
  const dailyAvailable = progress.dailyDoneDate !== todayKey();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // localStorage is unavailable during the first render; read it once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saved progress is client-only
    setProgress(loadTaterProgress());
  }, []);

  useEffect(() => {
    const routePath = window.location.pathname;
    function onPopState() {
      // Leaving the game (back to the hub) is the router's job; only our own in-page entries are phases.
      if (window.location.pathname !== routePath) return;
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        return;
      }
      if (phase !== "home") {
        setPhase("home");
        setResult(null);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [phase]);

  /**
   * Inner screens share one in-page history entry, so the phone's back returns to the game home.
   * Spreading the current state keeps Next's router data; `pbInPage` lets useBackTo count the entry.
   */
  function pushPhase(next: Phase) {
    if (typeof window !== "undefined") {
      const state = window.history.state ?? {};
      if (state.taterPhase) {
        window.history.replaceState({ ...state, taterPhase: next }, "");
      } else {
        window.history.pushState({ ...state, taterPhase: next, pbInPage: (Number(state.pbInPage) || 0) + 1 }, "");
      }
    }
    setPhase(next);
  }

  function goHome() {
    if (typeof window !== "undefined" && window.history.state?.taterPhase) {
      // stepBack claims the back: a hub back tapped before this pop lands is ignored instead of counting its
      // steps from the stale entry (and leaving PB Zone). False while another back is still landing: let it finish.
      if (!stepBack()) return;
      ignorePopRef.current = true;
    }
    setPhase("home");
    setResult(null);
  }

  async function startRound(nextMode: RoundMode, asDaily = false) {
    if (startingRound) return;
    const count = asDaily ? DAILY_QUESTIONS : TATER_SCORING.questionsPerRound;
    setStartingRound(true);
    const builtIn = nextMode === "mixed" ? buildMixedRound(count) : buildRound(nextMode, count);
    // The photo fetch can take up to 6s; the loader blocks taps but not the phone's back button.
    const round = await withBackendPhotos(builtIn);
    if (!mountedRef.current) return;
    setStartingRound(false);
    setMode(nextMode);
    setDaily(asDaily);
    setQuestions(round);
    setRoundKey((k) => k + 1);
    setResult(null);
    pushPhase("play");
  }

  function finishRound(payload: Omit<RoundResult, "mode" | "daily">) {
    let pointsEarned = payload.pointsEarned;
    let coinsEarned = payload.coinsEarned;
    if (daily) {
      pointsEarned += TATER_SCORING.pointsDaily;
      coinsEarned += TATER_SCORING.coinsDaily;
    }

    if (coinsEarned > 0) addCoins(coinsEarned);

    const eventId = `tater:${daily ? "daily" : mode}:${Date.now()}`;
    awardPoints({
      eventId,
      gameId: "tater-match",
      points: pointsEarned,
      lines: [
        { label: "Correct matches", points: payload.correct * TATER_SCORING.pointsCorrect },
        ...(daily ? [{ label: "Daily challenge", points: TATER_SCORING.pointsDaily }] : []),
      ],
      perfect: payload.correct === payload.total,
      label: `Match & Learn · ${roundTitle(mode, daily)}`,
    });

    recordGameLeaderboard(session, {
      gameKey: "tater-match",
      sessionId: eventId,
      coins: coinsEarned,
      metrics: [
        { key: "accuracy", value: payload.total ? payload.correct / payload.total : 0, max: 1 },
        { key: "complete", value: 1, max: 1 },
      ],
    });

    const nextProgress = applyRoundToProgress(progress, payload.correct, payload.learned, daily);
    const playedDisease = questions.some((q) => q.mode === "disease");
    if (playedDisease && !nextProgress.badges.includes("disease-detective")) {
      nextProgress.badges = [...nextProgress.badges, "disease-detective"];
    }
    setProgress(nextProgress);
    saveTaterProgress(nextProgress);

    setResult({ ...payload, pointsEarned, coinsEarned, mode, daily });
    pushPhase("result");
  }

  const loadingOverlay = startingRound ? <TaterLoader /> : null;

  if (phase === "howto") {
    return (
      <>
        <TaterMatchHowTo onBack={() => goHome()} onPlay={() => void startRound("mixed")} />
        {loadingOverlay}
      </>
    );
  }

  if (phase === "progress") {
    return <TaterMatchProgress progress={progress} onBack={() => goHome()} />;
  }

  if (phase === "play" && questions.length > 0) {
    return (
      <TaterMatchPlay
        key={roundKey}
        questions={questions}
        coins={coins}
        points={displayPoints}
        onExit={() => goHome()}
        onComplete={finishRound}
      />
    );
  }

  if (phase === "result" && result) {
    return (
      <>
      <TaterMatchResult
        modeTitle={roundTitle(result.mode, result.daily)}
        correct={result.correct}
        total={result.total}
        pointsEarned={result.pointsEarned}
        coinsEarned={result.coinsEarned}
        seconds={result.seconds}
        streak={progress.streak}
        learned={result.learned}
        onAgain={() => void startRound(result.daily ? "mixed" : result.mode)}
        onHome={() => goHome()}
      />
      {loadingOverlay}
      </>
    );
  }

  return (
    <>
    <TaterMatchHome
      coins={coins}
      points={displayPoints}
      progress={progress}
      dailyAvailable={dailyAvailable}
      onBack={backToHub}
      onPlay={(m, asDaily) => void startRound(m, Boolean(asDaily))}
      onHowTo={() => pushPhase("howto")}
      onProgress={() => pushPhase("progress")}
    />
    {loadingOverlay}
    </>
  );
}
