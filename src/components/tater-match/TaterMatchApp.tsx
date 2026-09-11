"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaterMatchIntro } from "@/components/tater-match/TaterMatchIntro";
import { TaterMatchPlay } from "@/components/tater-match/TaterMatchPlay";
import { TaterMatchComplete } from "@/components/tater-match/TaterMatchComplete";
import type {
  LevelResult,
  Phase,
} from "@/components/tater-match/taterMatchTypes";

export function TaterMatchApp() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState(12);
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<LevelResult | null>(null);

  if (phase === "intro") {
    return (
      <TaterMatchIntro
        onBack={() => router.push("/games")}
        onPlay={() => {
          setResult(null);
          setRunId((n) => n + 1);
          setPhase("play");
        }}
      />
    );
  }

  if (phase === "complete" && result) {
    return (
      <TaterMatchComplete
        result={result}
        onNext={() => {
          setLevel((n) => n + 1);
          setResult(null);
          setRunId((n) => n + 1);
          setPhase("play");
        }}
        onBackToGames={() => router.push("/games")}
      />
    );
  }

  return (
    <TaterMatchPlay
      key={runId}
      level={level}
      onBack={() => setPhase("intro")}
      onComplete={(next) => {
        setResult(next);
        setPhase("complete");
      }}
    />
  );
}
