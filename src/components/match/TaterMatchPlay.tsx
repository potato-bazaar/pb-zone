"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TATER_SCORING,
  modeMeta,
  type TaterQuestion,
} from "@/data/taterMatch";
import { TaterOptionArt } from "@/components/match/TaterOptionArt";

type Props = {
  questions: TaterQuestion[];
  coins: number;
  points: number;
  onExit: () => void;
  onComplete: (result: {
    correct: number;
    total: number;
    pointsEarned: number;
    coinsEarned: number;
    seconds: number;
    learned: string[];
  }) => void;
};

export function TaterMatchPlay({
  questions,
  coins,
  points,
  onExit,
  onComplete,
}: Props) {
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [learned, setLearned] = useState<string[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [qStartedAt, setQStartedAt] = useState(() => Date.now());

  const question = questions[index]!;
  const meta = modeMeta(question.mode);
  const progressPct = ((index + (revealed ? 1 : 0)) / total) * 100;

  const letters = useMemo(() => ["A", "B", "C", "D"] as const, []);
  // Short attribution for the photos on screen, e.g. "Wikimedia Commons, Kaggle".
  const photoCredit = useMemo(() => {
    const names = new Set<string>();
    for (const opt of question.options) {
      const credit = opt.imageCredit;
      if (!opt.imageUrl || !credit) continue;
      const source =
        credit.source === "kaggle"
          ? "Kaggle datasets"
          : credit.source === "claude" || credit.source === "wikimedia"
            ? "Wikimedia Commons & web"
            : credit.source;
      names.add(credit.author && credit.source !== "kaggle" ? `${credit.author} (${source})` : source);
    }
    return [...names].slice(0, 3).join(", ");
  }, [question]);

  useEffect(() => {
    setSelected(null);
    setRevealed(false);
    setQStartedAt(Date.now());
  }, [index]);

  function submit() {
    if (!selected || revealed) return;
    const ok = selected === question.correctOptionId;
    const elapsed = (Date.now() - qStartedAt) / 1000;
    let addPts = 0;
    let addCoins = 0;
    if (ok) {
      addPts = TATER_SCORING.pointsCorrect;
      addCoins = TATER_SCORING.coinsCorrect;
      if (elapsed <= TATER_SCORING.fastSeconds) addPts += TATER_SCORING.pointsFast;
      setCorrectCount((n) => n + 1);
      setLearned((prev) => [...prev, question.learn]);
    }
    setPointsEarned((n) => n + addPts);
    setCoinsEarned((n) => n + addCoins);
    setRevealed(true);
  }

  function next() {
    if (index + 1 >= total) {
      const finalCorrect = correctCount;
      const bonusPts = finalCorrect === total ? TATER_SCORING.pointsPerfectRound : 0;
      const bonusCoins = finalCorrect === total ? TATER_SCORING.coinsPerfectRound : 0;
      onComplete({
        correct: finalCorrect,
        total,
        pointsEarned: pointsEarned + bonusPts,
        coinsEarned: coinsEarned + bonusCoins,
        seconds: Math.round((Date.now() - startedAt) / 1000),
        learned,
      });
      return;
    }
    setIndex((i) => i + 1);
  }

  const isCorrect = revealed && selected === question.correctOptionId;
  const lastAnswerOk = revealed && selected === question.correctOptionId;

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#F4F7FC]">
      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col"
        style={{
          paddingTop: "var(--header-top)",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header className="flex shrink-0 items-center gap-2 px-3">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1E3A8A] shadow-sm ring-1 ring-[#E8EEF8]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/quiz-potato-mascot.png" alt="" className="h-8 w-8 object-contain" draggable={false} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-extrabold leading-none text-[#1E3A8A]">Tater Match</p>
            <p className="mt-0.5 text-[9px] font-bold tracking-[0.1em] text-[#5B7AB0]">Learn · Play · Grow</p>
          </div>
          <HeaderPill>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/home/coin-transparent.png" alt="" className="h-4 w-4" draggable={false} />
            {coins.toLocaleString("en-IN")}
          </HeaderPill>
          <HeaderPill>
            <span aria-hidden>🏆</span>
            {points.toLocaleString("en-IN")}
          </HeaderPill>
        </header>

        {/* Theme banner */}
        <div
          className="relative mx-3 mt-3 overflow-hidden rounded-[1.15rem] px-3 py-2.5"
          style={{ background: meta.bannerBg }}
        >
          <div className="pr-[38%]">
            <p className="font-display text-[14px] font-extrabold leading-snug text-[#14352A]">
              {meta.bannerTitle}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-[#3D6B4A]">{meta.bannerSub}</p>
            <p className="mt-1.5 inline-block rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-extrabold text-[#1F8A47]">
              {meta.hindi}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.mode === "disease" ? "/games/quiz-farm.jpg" : "/games/cards/tater-match.webp"}
            alt=""
            className="pointer-events-none absolute -right-1 bottom-0 top-0 w-[42%] object-cover object-[70%_30%]"
            draggable={false}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-3 [-webkit-overflow-scrolling:touch]">
          <section className="rounded-[1.25rem] bg-white p-3 shadow-[0_8px_24px_rgba(30,58,138,0.1)] ring-1 ring-[#E8EEF8]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-extrabold text-[#1E3A8A]">
                Question {index + 1} / {total}
              </p>
              <div className="flex items-center gap-1.5">
                <RewardChip>+{TATER_SCORING.pointsCorrect} PB</RewardChip>
                <RewardChip coin>+{TATER_SCORING.coinsCorrect}</RewardChip>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EEF8]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(8, progressPct)}%`, background: meta.accent }}
              />
            </div>

            <h2 className="mt-3 font-display text-[17px] font-extrabold leading-snug text-[#152238]">
              {question.prompt}
            </h2>
            <p className="mt-1 text-[12px] font-semibold text-[#6B7C9C]">{question.hint}</p>

            <ul className="mt-3 grid grid-cols-2 gap-2.5">
              {question.options.map((opt, i) => {
                const letter = letters[i] ?? "A";
                const isSel = selected === opt.id;
                const isAns = revealed && opt.id === question.correctOptionId;
                const isWrong = revealed && isSel && !isAns;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      disabled={revealed}
                      onClick={() => setSelected(opt.id)}
                      className={`relative w-full overflow-hidden rounded-[1rem] bg-[#F7FAFF] text-left transition ring-2 ${
                        isAns
                          ? "ring-[#2A9B5C] bg-[#EAF8EF]"
                          : isWrong
                            ? "ring-[#EF4444] bg-[#FEF2F2]"
                            : isSel
                              ? "ring-[#2B6DEF] bg-[#EEF4FF]"
                              : "ring-transparent hover:ring-[#D7E3F8]"
                      }`}
                    >
                      <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#1E3A8A] shadow-sm">
                        {letter}
                      </span>
                      {(isAns || isWrong) && (
                        <span
                          className={`absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-white ${
                            isAns ? "bg-[#2A9B5C]" : "bg-[#EF4444]"
                          }`}
                        >
                          {isAns ? "✓" : "✕"}
                        </span>
                      )}
                      {opt.imageUrl ? (
                        <div className="aspect-square w-full overflow-hidden bg-[#E9EEF5]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={opt.imageUrl}
                            alt=""
                            draggable={false}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-[92px] items-center justify-center px-1 pt-2">
                          <TaterOptionArt art={opt.art} className="h-[86px] w-full" />
                        </div>
                      )}
                      {opt.label ? (
                        <p className="truncate px-2 pb-2 text-center text-[11px] font-extrabold text-[#1E3A8A]">
                          {opt.label}
                        </p>
                      ) : (
                        <div className="h-2" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {photoCredit && (
              <p className="mt-1.5 truncate text-center text-[9.5px] font-semibold text-[#8A9BB8]">
                Photos: {photoCredit}
              </p>
            )}

            <div className="mt-3 flex gap-2 rounded-[0.9rem] bg-[#EEF4FF] px-3 py-2.5">
              <span className="text-[16px]" aria-hidden>
                💡
              </span>
              <p className="text-[11.5px] font-semibold leading-snug text-[#2A4570]">
                {revealed ? (
                  <>
                    <span className="font-extrabold">Learn: </span>
                    {question.learn}
                  </>
                ) : (
                  <>
                    <span className="font-extrabold">Tip: </span>
                    Pick the best match, then submit. Wrong answers still teach you.
                  </>
                )}
              </p>
            </div>

            {revealed ? (
              <div
                className={`mt-3 flex items-center justify-between gap-2 rounded-[0.9rem] px-3 py-2.5 ${
                  isCorrect ? "bg-[#EAF8EF] text-[#145C32]" : "bg-[#FFF1F0] text-[#9B1C1C]"
                }`}
              >
                <p className="text-[13px] font-extrabold">
                  {isCorrect
                    ? `Correct! ${question.options.find((o) => o.id === question.correctOptionId)?.label ?? "Nice match."}`
                    : `Not quite — correct is ${question.options.find((o) => o.id === question.correctOptionId)?.label ?? "highlighted"}.`}
                </p>
                {lastAnswerOk ? (
                  <span className="shrink-0 text-[11px] font-extrabold text-[#1F8A47]">
                    +{TATER_SCORING.pointsCorrect} · +{TATER_SCORING.coinsCorrect}
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <div className="shrink-0 px-3 pt-1">
          {!revealed ? (
            <button
              type="button"
              disabled={!selected}
              onClick={submit}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#4C8DFF] to-[#2B6DEF] py-3.5 font-display text-[15px] font-extrabold text-white shadow-[0_4px_0_#1E4BB8] disabled:opacity-45"
            >
              Check Answer
              <span aria-hidden>→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#4CCB68] to-[#1F8A47] py-3.5 font-display text-[15px] font-extrabold text-white shadow-[0_4px_0_#145C32]"
            >
              {index + 1 >= total ? "See Results" : "Next Question"}
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-2 text-[11px] font-extrabold tabular-nums text-[#1E3A8A] shadow-sm ring-1 ring-[#E8EEF8]">
      {children}
    </div>
  );
}

function RewardChip({ children, coin }: { children: React.ReactNode; coin?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
        coin ? "bg-[#FFF3C4] text-[#7A4A00]" : "bg-[#EEF4FF] text-[#2B6DEF]"
      }`}
    >
      {coin ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/images/home/coin-transparent.png" alt="" className="h-3 w-3" draggable={false} />
      ) : null}
      {children}
    </span>
  );
}
