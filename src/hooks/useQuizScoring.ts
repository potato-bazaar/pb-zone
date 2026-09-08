"use client";

import { useEffect, useState } from "react";
import {
  fetchQuizScoring,
  type QuizScoringConfig,
} from "@/lib/quizApi";

const DEFAULT_SCORING: QuizScoringConfig = {
  pointsPerCorrect: 20,
  fastAnswerBonus: 5,
  completeQuizBonus: 30,
  fastAnswerSeconds: 5,
  questionsPerQuiz: 12,
  timerSeconds: 15,
};

const POLL_MS = 4000;

function scoringKey(row: QuizScoringConfig) {
  return [
    row.pointsPerCorrect,
    row.fastAnswerBonus,
    row.completeQuizBonus,
    row.fastAnswerSeconds ?? "",
    row.questionsPerQuiz ?? "",
    row.timerSeconds ?? "",
  ].join(":");
}

export function useQuizScoring(enabled: boolean) {
  const [scoring, setScoring] = useState<QuizScoringConfig>(DEFAULT_SCORING);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let inFlight = false;

    async function load() {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      inFlight = true;
      try {
        const data = await fetchQuizScoring();
        if (cancelled) return;
        setScoring((prev) => (scoringKey(prev) === scoringKey(data) ? prev : data));
      } catch (error) {
        console.warn("[quiz] scoring fetch failed", error);
      } finally {
        inFlight = false;
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled]);

  return scoring;
}
