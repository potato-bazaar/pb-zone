import { NextResponse } from "next/server";
import { quizAdminFetch } from "@/lib/quizAdminClient";
import { overlayPlayerNames } from "@/lib/playerNameStore";
import { displayNameFromRecord, isPlaceholderDisplayName } from "@/lib/playerIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelemetryPlayer = {
  rank: number;
  userId: string;
  sessionId: string;
  playerName: string;
  status: string;
  correctCount: number;
  skippedCount: number;
  wrongCount: number;
  unansweredCount: number;
  answeredCount: number;
  totalQuestions: number;
  sessionScore: number;
  userPoints: number;
  percentage: number;
  durationSeconds: number;
  startedAt: string | Date;
  completedAt: string | Date | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizePlayer(row: Record<string, unknown>, index: number): TelemetryPlayer {
  const nested = asRecord(row.user);
  const userId = String(row.userId ?? nested?.userId ?? row.id ?? "");
  const fromRow = displayNameFromRecord(row);
  return {
    rank: Number(row.rank ?? index + 1),
    userId,
    sessionId: String(row.sessionId ?? row.id ?? ""),
    playerName: fromRow && !isPlaceholderDisplayName(fromRow) ? fromRow : fromRow || "Player",
    status: String(row.status ?? ""),
    correctCount: Number(row.correctCount ?? 0),
    skippedCount: Number(row.skippedCount ?? 0),
    wrongCount: Number(row.wrongCount ?? 0),
    unansweredCount: Number(row.unansweredCount ?? 0),
    answeredCount: Number(row.answeredCount ?? 0),
    totalQuestions: Number(row.totalQuestions ?? 12),
    sessionScore: Number(row.sessionScore ?? 0),
    userPoints: Number(row.userPoints ?? 0),
    percentage: Number(row.percentage ?? 0),
    durationSeconds: Number(row.durationSeconds ?? 0),
    startedAt: (row.startedAt as string | Date) ?? "",
    completedAt: (row.completedAt as string | Date | null) ?? null,
  };
}

export async function GET() {
  try {
    const payload = await quizAdminFetch<Record<string, unknown>>("/quiz-telemetry");
    const data = asRecord(payload.data) ?? {};
    const rawPlayers = Array.isArray(data.players)
      ? (data.players as Record<string, unknown>[])
      : [];
    const players = overlayPlayerNames(
      rawPlayers.map((row, index) => normalizePlayer(row, index)),
    );
    const topFromPlayers = players.find(
      (row) => !isPlaceholderDisplayName(row.playerName),
    )?.playerName;

    return NextResponse.json({
      success: true,
      data: {
        questionsPerQuiz: Number(data.questionsPerQuiz ?? 12),
        playerCount: Number(data.playerCount ?? 0),
        sessionCount: Number(data.sessionCount ?? 0),
        completedSessions: Number(data.completedSessions ?? 0),
        winnersCount: Number(data.winnersCount ?? 0),
        winRatePercentage: Number(data.winRatePercentage ?? 0),
        completionRatePercentage: Number(data.completionRatePercentage ?? 0),
        averageScore: Number(data.averageScore ?? 0),
        averageTimeMinutes: Number(data.averageTimeMinutes ?? 0),
        topWinnerName:
          (typeof data.topWinnerName === "string" &&
          !isPlaceholderDisplayName(data.topWinnerName)
            ? data.topWinnerName
            : topFromPlayers) ?? data.topWinnerName ?? null,
        topWinnerPoints: Number(data.topWinnerPoints ?? 0),
        questionStats: Array.isArray(data.questionStats) ? data.questionStats : [],
        players,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load quiz telemetry";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
