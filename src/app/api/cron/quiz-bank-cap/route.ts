import { NextRequest, NextResponse } from "next/server";
import { enforceQuestionBankCap } from "@/lib/quizQuestionBankCap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "";
  const adminKey = process.env.QUIZ_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "";
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const headerSecret = request.headers.get("x-cron-secret") || "";
  const headerAdmin = request.headers.get("x-admin-key") || "";

  if (cronSecret && (bearer === cronSecret || headerSecret === cronSecret)) return true;
  if (adminKey && (bearer === adminKey || headerAdmin === adminKey || headerSecret === adminKey)) {
    return true;
  }
  if (process.env.VERCEL && request.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

async function runCapJob() {
  const result = await enforceQuestionBankCap({ force: true });
  return NextResponse.json({ success: true, data: result });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await runCapJob();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cap question bank";
    console.error("[quiz-bank-cap]", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
