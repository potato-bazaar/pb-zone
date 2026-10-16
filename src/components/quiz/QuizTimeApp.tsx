"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QuizHowToPlay } from "@/components/quiz/QuizHowToPlay";
import { QuizPlayScreen } from "@/components/quiz/QuizPlayScreen";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { useBackTo } from "@/hooks/useBackTo";
import { useQuizScoring } from "@/hooks/useQuizScoring";
import {
  QuizApiError,
  startQuizSession,
  type QuizLanguage,
  type QuizSessionStartData,
} from "@/lib/quizApi";
import { stepBack } from "@/lib/navStack";
import { startLiveMirror } from "@/lib/quizLiveMirror";
import { identityFromJwt, isPlaceholderDisplayName } from "@/lib/playerIdentity";
import { fetchUserProfile } from "@/lib/pbZoneAuth";

type Phase = "howto" | "play";

export function QuizTimeApp() {
  // How-to is the root screen and the result's "Back to PB Zone" leaves too: both go to the PB Zone hub,
  // popping history (past the quiz's own in-page entry) when the hub is behind us.
  const backToHub = useBackTo("/home");
  const session = useUserSession();
  const { setWallet } = usePbCoins();
  const [phase, setPhase] = useState<Phase>("howto");
  const [runId, setRunId] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [language, setLanguage] = useState<QuizLanguage>("en");
  const [quizSession, setQuizSession] = useState<QuizSessionStartData | null>(
    null,
  );
  const scoring = useQuizScoring(phase !== "play");
  const ignorePopRef = useRef(false);
  // False once the player has left, so a start still in flight can't open a session, start the live
  // mirror or push history onto another screen. Set inside the effect so StrictMode's remount leaves it true.
  const mountedRef = useRef(false);

  const auth = useMemo(
    () => ({
      token: session.token,
      userId: session.userId,
      userName: session.userName,
    }),
    [session.token, session.userId, session.userName],
  );
  const [playAuth, setPlayAuth] = useState(auth);

  function exitToStart(fromPopState = false) {
    if (
      !fromPopState &&
      typeof window !== "undefined" &&
      window.history.state?.quizPhase === "play"
    ) {
      // stepBack claims the back: a hub back tapped before this pop lands is ignored instead of counting its
      // steps from the stale entry (and leaving PB Zone). False while another back is still landing: let it finish.
      if (!stepBack()) return;
      ignorePopRef.current = true;
    }
    setPhase("howto");
    setQuizSession(null);
    setStartError(null);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const routePath = window.location.pathname;
    function onPopState() {
      // Leaving the quiz (back to the hub) is the router's job: don't flash How-to or refetch scoring on the way out.
      if (window.location.pathname !== routePath) return;
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        return;
      }
      exitToStart(true);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  async function beginQuiz(selectedLang: QuizLanguage = language) {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    setLanguage(selectedLang);

    try {
      let userName =
        identityFromJwt(session.token).userName || session.userName;
      if (session.token) {
        const profile = await fetchUserProfile(session.token);
        if (!mountedRef.current) return;
        if (profile?.userName && !isPlaceholderDisplayName(profile.userName)) {
          userName = profile.userName;
        }
      }

      const authWithName = {
        ...auth,
        userName,
        userId: session.userId || identityFromJwt(session.token).userId || auth.userId,
      };
      setPlayAuth(authWithName);

      const data = await startQuizSession(authWithName, { language: selectedLang });
      if (!mountedRef.current) return;
      startLiveMirror({
        userId: authWithName.userId || "dev-user-1",
        sessionId: data.sessionId,
        question: data.question,
      });
      setWallet({
        coins: data.user.points,
        earnedCoins: data.user.earnedPoints,
        pbPoints: data.user.leaderboardPoints,
      });
      setQuizSession(data);
      setRunId((n) => n + 1);
      // Play and result share one in-page entry: Play Again reuses it, so the phone's back still needs
      // only one tap to reach How-to. Spreading keeps Next's router data; `pbInPage` lets useBackTo count it.
      const state = window.history.state ?? {};
      if (state.quizPhase !== "play") {
        window.history.pushState({ ...state, quizPhase: "play", pbInPage: (Number(state.pbInPage) || 0) + 1 }, "");
      }
      setPhase("play");
    } catch (error) {
      if (!mountedRef.current) return;
      const message =
        error instanceof QuizApiError
          ? error.message
          : "Could not start quiz. Check quiz API / login.";
      setStartError(message);
      console.error("[quiz] start session failed", error);
    } finally {
      setStarting(false);
    }
  }

  if (phase === "howto") {
    return (
      <QuizHowToPlay
        onBack={backToHub}
        onStart={(lang) => void beginQuiz(lang)}
        starting={starting}
        error={startError}
        scoring={scoring}
      />
    );
  }

  if (!quizSession) {
    return (
      <QuizHowToPlay
        onBack={backToHub}
        onStart={(lang) => void beginQuiz(lang)}
        starting={starting}
        error={startError ?? "Session missing. Tap Start Quiz again."}
        scoring={scoring}
      />
    );
  }

  return (
    <QuizPlayScreen
      key={runId}
      auth={playAuth}
      initialSession={quizSession}
      onExit={() => exitToStart()}
      onHome={backToHub}
      onPlayAgain={() => void beginQuiz(language)}
    />
  );
}
