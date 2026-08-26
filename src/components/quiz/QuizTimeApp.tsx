"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QuizHowToPlay } from "@/components/quiz/QuizHowToPlay";
import { QuizPlayScreen } from "@/components/quiz/QuizPlayScreen";

type Phase = "howto" | "play";

export function QuizTimeApp() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("howto");
  const [runId, setRunId] = useState(0);

  if (phase === "howto") {
    return (
      <QuizHowToPlay
        onBack={() => router.push("/games")}
        onStart={() => setPhase("play")}
      />
    );
  }

  return (
    <QuizPlayScreen
      key={runId}
      onExit={() => router.push("/games")}
      onHome={() => router.push("/home")}
      onPlayAgain={() => {
        setRunId((n) => n + 1);
        setPhase("play");
      }}
      initialCoins={120}
    />
  );
}
