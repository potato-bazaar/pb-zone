"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { haptic, sounds } from "@/components/crush/render/sound";
import {
  ART,
  FastChip,
  FastChipHint,
  LearnSheet,
  OptionCard,
  TM_TONES,
  TaterCta,
  TaterFooter,
  TaterScreen,
  TaterScroll,
  TaterTile,
  TaterTrail,
  WalletPills,
  type OptionState,
} from "@/components/match/TaterUi";
import { ChevronLeftIcon } from "@/components/quiz/QuizHowToIcons";
import { TATER_SCORING, modeMeta, type TaterQuestion } from "@/data/taterMatch";

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

const LETTERS = ["A", "B", "C", "D"] as const;
const TIMER_RADIUS = 18;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

/** 25-second ring beside the prompt. Colour shifts when 5 seconds or less remain. */
function AnswerTimer({ timeLeft, total, paused }: { timeLeft: number; total: number; paused: boolean }) {
  const fraction = Math.max(0, Math.min(1, timeLeft / Math.max(total, 1)));
  const urgent = !paused && timeLeft <= 5;
  return (
    <div
      role="timer"
      aria-label={paused ? `${timeLeft} seconds left, stopped` : `${timeLeft} seconds left`}
      className={`relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center ${urgent ? "text-[#9B1C1C]" : "text-[#173B26]"}`}
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={TIMER_RADIUS} fill="none" stroke="#E6E0D2" strokeWidth="3.5" />
        <circle
          cx="22"
          cy="22"
          r={TIMER_RADIUS}
          fill="none"
          stroke={paused ? "#8A8571" : urgent ? "#D9342B" : "#1F8A47"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={TIMER_CIRCUMFERENCE}
          strokeDashoffset={TIMER_CIRCUMFERENCE * (1 - fraction)}
        />
      </svg>
      <span className="font-display text-[15px] font-extrabold tabular-nums leading-none">{timeLeft}</span>
    </div>
  );
}

/**
 * Play — the heart of Tater Match. Header · mode banner · potato trail · question card in the
 * scroll region · pinned footer with the Learn sheet docked above the CTA. One tap on a photo
 * answers: the verdict shows at once and the same CTA turns into Next Question (no Check step).
 * Scoring and the onComplete payload are unchanged; the fast-bonus clock stops at that tap.
 * Each question has its own countdown (`TATER_SCORING.answerSeconds`). At 0 the match is missed.
 */
export function TaterMatchPlay({ questions, coins, points, onExit, onComplete }: Props) {
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
  const [timeLeft, setTimeLeft] = useState<number>(TATER_SCORING.answerSeconds);
  const [timedOut, setTimedOut] = useState(false);

  // Presentation-only state (SPEC §4.3).
  const [results, setResults] = useState<("ok" | "miss")[]>([]);
  const [lastFast, setLastFast] = useState(false);
  const [tipExpanded, setTipExpanded] = useState(false);

  const promptId = useId();
  const statusId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  // Guards against a double tap (or two tiles hit in one go) answering twice before React re-renders.
  const answeredRef = useRef(false);

  const question = questions[index]!;
  const meta = modeMeta(question.mode);
  const tone = TM_TONES[question.mode];
  const last = index + 1 >= total;

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

  const correctIndex = question.options.findIndex((o) => o.id === question.correctOptionId);
  const correctLabel =
    question.options[correctIndex]?.label ?? `Option ${LETTERS[correctIndex] ?? "A"}`;

  // New question: start at the top of the region and move focus to the prompt.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    promptRef.current?.focus({ preventScroll: true });
  }, [index]);

  // Reveal: land keyboard users on the Next CTA without scrolling a tile row out of view.
  useLayoutEffect(() => {
    if (!revealed) return;
    ctaRef.current?.focus({ preventScroll: true });
  }, [revealed]);

  /** One tap answers: shows right/wrong at once and arms the Next Question CTA. An empty id is a timeout. */
  function answer(id: string) {
    if (revealed || answeredRef.current) return;
    answeredRef.current = true;
    const ok = id !== "" && id === question.correctOptionId;
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
    setSelected(id === "" ? null : id);
    setTimedOut(id === "");
    setRevealed(true);

    // Presentation: derived from the local ok/elapsed above, never from state.
    const fast = ok && elapsed <= TATER_SCORING.fastSeconds;
    setResults((r) => [...r, ok ? "ok" : "miss"]);
    setLastFast(fast);
    if (ok) {
      sounds.play("coin");
      if (fast) window.setTimeout(() => sounds.play("special"), 40);
      haptic([14, 30, 18]);
    } else {
      sounds.play("invalid");
      haptic(24);
    }
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
    // Per-question reset lives here (not in an effect) so the next question starts clean.
    answeredRef.current = false;
    setSelected(null);
    setRevealed(false);
    setTimedOut(false);
    setTimeLeft(TATER_SCORING.answerSeconds);
    setTipExpanded(false);
    setQStartedAt(Date.now());
    setIndex((i) => i + 1);
  }

  // One countdown per question. Hitting 0 misses the match the same way a wrong tap does.
  useEffect(() => {
    if (revealed) return;
    if (timeLeft <= 0) {
      answer("");
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // `answer` is the handler from this render; the tick is driven by timeLeft, revealed, and index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, revealed, index]);

  function optionState(id: string): OptionState {
    if (!revealed) return "idle";
    if (id === question.correctOptionId) return "correct";
    if (id === selected) return "wrong";
    return "dim";
  }

  const isCorrect = revealed && selected === question.correctOptionId;
  // A label on every option is the choice itself. A label on only some options is a name plate
  // on those tiles alone, so those stay hidden and every answer uses the same photo card.
  const showLabels = question.options.every((opt) => Boolean(opt.label));

  return (
    <TaterScreen className="tm-play">
      {/* Painted scenery: sunny farmland behind the header, soil and seedlings behind the footer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ART}/play-sky.webp`}
        alt=""
        draggable={false}
        width={1290}
        height={729}
        className="pointer-events-none absolute inset-x-0 top-0 h-[220px] w-full select-none object-cover object-top md:h-[300px]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ART}/play-soil.webp`}
        alt=""
        draggable={false}
        width={1290}
        height={553}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[170px] w-full select-none object-cover object-bottom"
      />

      <header className="relative z-20 shrink-0 px-3" style={{ paddingTop: "max(0.5rem, calc(var(--header-top) - 0.25rem))" }}>
        <div className="tm-play-head relative flex items-start justify-between">
          <button
            type="button"
            onClick={onExit}
            aria-label="Leave round"
            className="tm-back-cream hit-slop mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#173B26] active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1F8A47] focus-visible:ring-offset-2"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="tm-logo pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ART}/logo.webp`}
              alt="Tater Match"
              width={540}
              height={335}
              draggable={false}
              className="h-full w-auto max-w-none select-none"
            />
          </h1>
          <div className="flex flex-col items-end gap-1.5 pt-1">
            <WalletPills coins={coins} points={points} variant="dark" />
          </div>
        </div>
      </header>

      {/* Mode banner — remounts (fade-in) only when the mode changes between questions. */}
      <div className="relative z-10 mx-3 mt-1">
        <div key={question.mode} className="tm-banner tm-cta-swap relative flex h-[68px] items-center gap-3 overflow-hidden rounded-[20px] pl-2 pr-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/banner-farm.webp`}
            alt=""
            draggable={false}
            width={600}
            height={403}
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-[46%] select-none object-cover object-[65%_58%]"
          />
          <TaterTile tone={question.mode} size="xl" src={`${ART}/mode-${question.mode}.webp`} className="relative" />
          <div className="relative min-w-0 max-w-[60%] flex-1">
            <p className="line-clamp-2 font-display text-[16px] font-bold leading-[1.12] text-[#173B26]">{meta.bannerTitle}</p>
            <p className="mt-0.5 truncate text-[12.5px] font-extrabold leading-tight" style={{ color: tone.ink }}>
              {meta.hindi}
            </p>
            <span className="sr-only">
              {meta.title}. {meta.bannerSub}
            </span>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ART}/foliage.webp`}
          alt=""
          draggable={false}
          width={177}
          height={220}
          className="pointer-events-none absolute -bottom-3 -right-4 h-auto w-[42px] rotate-[18deg] select-none"
        />
      </div>

      {/* Trail row: counter · potato trail · fast-bonus chip. */}
      <div className="relative z-20 mx-3 mt-2.5 flex h-6 items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ART}/foliage.webp`}
          alt=""
          draggable={false}
          width={177}
          height={220}
          className="pointer-events-none absolute -left-6 top-4 h-auto w-[28px] -rotate-[30deg] select-none"
        />
        <span key={index} aria-hidden className="tm-counter font-display text-[15px] font-bold text-[#173B26]">
          {index + 1}/{total}
        </span>
        <TaterTrail total={total} index={index} revealed={revealed} results={results} />
        <span className="flex-1" />
        <FastChip key={qStartedAt} startedAt={qStartedAt} seconds={revealed ? 0 : TATER_SCORING.fastSeconds} />
        <FastChipHint seconds={TATER_SCORING.fastSeconds} />
      </div>

      <TaterScroll gutter={3} pad={1} scrollRef={scrollRef} className="mt-2 flex flex-col" style={{ scrollPaddingBottom: 4 }}>
        <section className="tm-qcard relative flex min-h-0 flex-1 flex-col rounded-[22px] p-2 pb-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/leaf-sprig.webp`}
            alt=""
            draggable={false}
            width={150}
            height={137}
            className="pointer-events-none absolute left-2.5 top-3 h-auto w-[15px] -rotate-[20deg] select-none"
          />
          <div className="flex items-start gap-2 px-3 pt-1">
            <div className="min-w-0 flex-1">
              <h2
                ref={promptRef}
                id={promptId}
                tabIndex={-1}
                className="tm-prompt font-display text-[20px] font-bold leading-[1.2] text-pretty text-[#173B26] outline-none"
              >
                {question.prompt}
              </h2>
              <p className="mt-1 text-[12.5px] font-semibold leading-[1.3] text-[#4A5A4C]">{question.hint}</p>
            </div>
            <AnswerTimer timeLeft={timeLeft} total={TATER_SCORING.answerSeconds} paused={revealed} />
          </div>

          {/* Width-capped on wide columns so both rows, their letter tabs and the verdict stamps stay
              inside the revealed region (VQA-1); phone widths are unchanged. */}
          <ul
            ref={gridRef}
            role="list"
            aria-labelledby={promptId}
            className="mt-2.5 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5 sm:mx-auto sm:w-full sm:max-w-[400px]"
          >
            {question.options.map((opt, i) => (
              <OptionCard
                // Option ids repeat ("a"–"d") across questions; scope the key so tiles remount per
                // question instead of repainting the previous photo under the new label (RX-1).
                key={`${question.id}:${opt.id}`}
                letter={LETTERS[i] ?? "A"}
                option={opt}
                state={optionState(opt.id)}
                revealed={revealed}
                showLabel={showLabels}
                onSelect={answer}
              />
            ))}
          </ul>

          {photoCredit ? (
            <p className="mt-2 truncate text-center text-[10.5px] font-semibold leading-[1.3] text-[#5F6A5D]">
              Photos: {photoCredit}
            </p>
          ) : null}
        </section>
      </TaterScroll>

      <TaterFooter top={2} bottom={1}>
        <LearnSheet
          revealed={revealed}
          ok={isCorrect}
          label={correctLabel}
          tip={question.learn}
          points={TATER_SCORING.pointsCorrect}
          coins={TATER_SCORING.coinsCorrect}
          fast={lastFast}
          timedOut={timedOut}
          expanded={tipExpanded}
          onToggle={() => setTipExpanded((e) => !e)}
          statusId={statusId}
        />
        {/* One button throughout: until a photo is tapped it reads "Pick a photo to answer" with its
            arrow pointing up at the photos and does nothing; then it wakes up as Next Question /
            See Results. A single element keeps the layout steady and takes focus after the reveal,
            so keyboard players answer with Enter and move on with Enter. */}
        <TaterCta
          ref={ctaRef}
          tone="green"
          size="lg"
          leaf
          label={!revealed ? "Pick a photo to answer" : last ? "See Results" : "Next Question"}
          icon={revealed && last ? "star" : "arrow"}
          bursts={revealed && last}
          ariaDisabled={!revealed}
          className={revealed ? "tm-cta-ready" : undefined}
          onClick={() => {
            sounds.play("ui");
            next();
          }}
        />
      </TaterFooter>
    </TaterScreen>
  );
}
