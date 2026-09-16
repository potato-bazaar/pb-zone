"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { QuizHowToPlay } from "@/components/quiz/QuizHowToPlay";
import { QuizPlayScreen } from "@/components/quiz/QuizPlayScreen";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { useQuizScoring } from "@/hooks/useQuizScoring";
import {
  QuizApiError,
  startQuizSession,
  type QuizLanguage,
  type QuizSessionStartData,
} from "@/lib/quizApi";
import { startLiveMirror } from "@/lib/quizLiveMirror";
import { identityFromJwt, isPlaceholderDisplayName } from "@/lib/playerIdentity";
import { fetchUserProfile } from "@/lib/pbZoneAuth";

type Phase = "howto" | "play";

export function QuizTimeApp() {
  const router = useRouter();
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

  const auth = useMemo(
    () => ({
      token: session.token,
      userId: session.userId,
      userName: session.userName,
    }),
    [session.token, session.userId, session.userName],
  );
  const [playAuth, setPlayAuth] = useState(auth);

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
      setPhase("play");
    } catch (error) {
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
        onBack={() => router.push("/games")}
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
        onBack={() => router.push("/games")}
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
      onExit={() => router.push("/games")}
      onHome={() => router.push("/home")}
      onPlayAgain={() => void beginQuiz(language)}
    />
  );
}
