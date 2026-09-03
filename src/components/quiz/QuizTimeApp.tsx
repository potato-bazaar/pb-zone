"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { QuizHowToPlay } from "@/components/quiz/QuizHowToPlay";
import { QuizPlayScreen } from "@/components/quiz/QuizPlayScreen";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import {
  QuizApiError,
  startQuizSession,
  type QuizSessionStartData,
} from "@/lib/quizApi";

type Phase = "howto" | "play";

export function QuizTimeApp() {
  const router = useRouter();
  const session = useUserSession();
  const { setCoins } = usePbCoins();
  const [phase, setPhase] = useState<Phase>("howto");
  const [runId, setRunId] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSessionStartData | null>(
    null,
  );

  const auth = useMemo(
    () => ({
      token: session.token,
      userId: session.userId,
      userName: session.userName,
    }),
    [session.token, session.userId, session.userName],
  );

  async function beginQuiz() {
    if (starting) return;
    setStarting(true);
    setStartError(null);

    try {
      const data = await startQuizSession(auth);
      setCoins(data.user.points);
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
        onStart={() => void beginQuiz()}
        starting={starting}
        error={startError}
      />
    );
  }

  if (!quizSession) {
    return (
      <QuizHowToPlay
        onBack={() => router.push("/games")}
        onStart={() => void beginQuiz()}
        starting={starting}
        error={startError ?? "Session missing. Tap Start Quiz again."}
      />
    );
  }

  return (
    <QuizPlayScreen
      key={runId}
      auth={auth}
      initialSession={quizSession}
      onExit={() => router.push("/games")}
      onHome={() => router.push("/home")}
      onPlayAgain={() => void beginQuiz()}
    />
  );
}
