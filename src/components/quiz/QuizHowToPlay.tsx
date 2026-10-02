"use client";

import { useId, useState } from "react";
import type { QuizLanguage } from "@/lib/quizApi";
import {
  ArrowRightIcon,
  Burst,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GlobeIcon,
  LanguageMark,
  ScoreBadge,
  StarShape,
  type LanguageMarkKind,
  type ScoreBadgeKind,
} from "@/components/quiz/QuizHowToIcons";

const ART = "/games/quiz";

type HowToPlayProps = {
  onStart: (language: QuizLanguage) => void;
  onBack: () => void;
  starting?: boolean;
  error?: string | null;
  scoring?: {
    pointsPerCorrect: number;
    completeQuizBonus: number;
    timerSeconds?: number;
    questionsPerQuiz?: number;
  };
};

type StepTone = {
  tile: string;
  glow: string;
  badge: string;
  digit: string;
  title: string;
  body: string;
  detailBg: string;
  detailText: string;
};

// Sampled from the design; digits and detail text are darkened just enough to reach 4.5:1.
const TONES = {
  violet: {
    tile: "linear-gradient(180deg, #F5EDFE 0%, #F1E9FE 100%)",
    glow: "rgba(109, 60, 245, 0.35)",
    badge: "#DED5FD",
    digit: "#4E1AE5",
    title: "#2B0E8C",
    body: "#5C527D",
    detailBg: "#F1EDFF",
    detailText: "#4A2FC4",
  },
  rose: {
    tile: "linear-gradient(180deg, #FFF0F6 0%, #FDE7F3 100%)",
    glow: "rgba(240, 52, 110, 0.32)",
    badge: "#FFE3EE",
    digit: "#C8174E",
    title: "#650468",
    body: "#7A4A7C",
    detailBg: "#FFEEF3",
    detailText: "#A3123F",
  },
  amber: {
    tile: "linear-gradient(180deg, #FFF7E7 0%, #FEF3DC 100%)",
    glow: "rgba(245, 158, 11, 0.38)",
    badge: "#FEECC6",
    digit: "#A65200",
    title: "#07025C",
    body: "#5C527D",
    detailBg: "#FFF4E0",
    detailText: "#8A4B00",
  },
  green: {
    tile: "linear-gradient(180deg, #E7FDF1 0%, #E1FAEC 100%)",
    glow: "rgba(21, 128, 61, 0.3)",
    badge: "#D0FAE4",
    digit: "#0B7A3E",
    title: "#060258",
    body: "#5C527D",
    detailBg: "#E6F7EC",
    detailText: "#13693A",
  },
} satisfies Record<string, StepTone>;

type Step = {
  key: string;
  title: string;
  body: string;
  /** Revealed when the card is tapped; every line here is checked against the play screen. */
  detail: string;
  icon: string;
  tone: StepTone;
};

const STEPS: Step[] = [
  {
    key: "answer",
    title: "Answer Questions",
    body: "Read the question carefully and choose the correct answer from the options.",
    detail: "One tap locks in your answer, so choose carefully.",
    icon: `${ART}/howto-answer.webp`,
    tone: TONES.violet,
  },
  {
    key: "time",
    title: "Time Limit",
    body: "You have limited time for each question. Answer before the timer runs out!",
    detail: "If the timer hits 0, the question counts as missed and earns no points.",
    icon: `${ART}/howto-timer.webp`,
    tone: TONES.rose,
  },
  {
    key: "score",
    title: "Score Points",
    body: "Earn PB Points for every correct answer. The more correct answers, the more points you earn.",
    detail: "Get 3, 5 or 7+ answers right in a row to earn streak bonuses.",
    icon: `${ART}/howto-trophy.webp`,
    tone: TONES.amber,
  },
  {
    key: "powerups",
    title: "Use Power-ups",
    body: "Stuck on a question? Use power-ups to get hints, extra time or skip the question.",
    detail: "Pick 50:50, Extra Time or Skip Question. Each one costs coins.",
    icon: `${ART}/howto-powerup.webp`,
    tone: TONES.violet,
  },
  {
    key: "complete",
    title: "Complete Quiz",
    body: "Answer all questions to complete the quiz and get bonus points!",
    detail: "Skipped questions don't count, so answer every one to earn the bonus.",
    icon: `${ART}/howto-flag.webp`,
    tone: TONES.green,
  },
];

const LANG_OPTIONS: {
  code: QuizLanguage;
  label: string;
  native: string;
  mark: LanguageMarkKind;
}[] = [
  { code: "en", label: "English", native: "English", mark: "uk" },
  { code: "hi", label: "Hindi", native: "हिंदी", mark: "in" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", mark: "gu" },
];

const DEFAULT_SCORING = {
  pointsPerCorrect: 20,
  completeQuizBonus: 30,
  timerSeconds: 15,
};

export function QuizHowToPlay({
  onStart,
  onBack,
  starting = false,
  error = null,
  scoring,
}: HowToPlayProps) {
  const [language, setLanguage] = useState<QuizLanguage>("en");
  const [openStep, setOpenStep] = useState<string | null>(null);
  const uid = useId();
  const points = {
    pointsPerCorrect: Number(scoring?.pointsPerCorrect ?? DEFAULT_SCORING.pointsPerCorrect),
    completeQuizBonus: Number(
      scoring?.completeQuizBonus ?? DEFAULT_SCORING.completeQuizBonus,
    ),
    timerSeconds: Number(scoring?.timerSeconds ?? DEFAULT_SCORING.timerSeconds),
  };
  const steps = STEPS.map((step) =>
    step.key === "time"
      ? {
          ...step,
          body: `You have ${points.timerSeconds}s for each question. Answer before the timer runs out!`,
        }
      : step,
  );
  const scoringRows: { kind: ScoreBadgeKind; label: string; value: number }[] = [
    { kind: "correct", label: "Correct Answer", value: points.pointsPerCorrect },
    { kind: "complete", label: "Complete Quiz Bonus", value: points.completeQuizBonus },
  ];
  const scoringHeadingId = `${uid}-scoring`;
  const languageHeadingId = `${uid}-language`;

  return (
    <div className="qh-bg relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      <div
        className="qh-scroll-fade relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 [-webkit-overflow-scrolling:touch]"
        style={{
          paddingTop: "max(3.25rem, calc(var(--header-top) + 0.5rem))",
        }}
      >
        <header className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/howto-header.webp`}
            alt=""
            draggable={false}
            width={420}
            height={346}
            className="qh-float pointer-events-none absolute -right-[14px] -top-7 w-[clamp(64px,20vw,84px)] select-none object-contain opacity-85"
          />
          <div className="relative grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#DFD8FA] bg-[linear-gradient(180deg,#FFFFFF,#F4F4FD)] text-[#180A5E] shadow-[0_4px_10px_-4px_rgba(91,63,217,0.25)] transition active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#7C5CFF] focus-visible:ring-offset-2"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="relative justify-self-center whitespace-nowrap font-display text-[clamp(1.4rem,7.4vw,2rem)] font-bold uppercase leading-none tracking-[0.01em] text-[#1B0B63]">
              <Burst
                side="left"
                className="qh-twinkle absolute -left-[0.95em] top-1/2 h-[0.75em] w-[0.75em] -translate-y-1/2 text-[#FDC403]"
              />
              How to <span className="text-[#761FF9]">Play</span>
              <Burst className="qh-twinkle absolute -right-[0.95em] top-1/2 h-[0.75em] w-[0.75em] -translate-y-1/2 text-[#FDC403]" />
            </h1>
            <span aria-hidden />
          </div>
          <span
            aria-hidden
            className="mx-auto -mt-1 block h-[5px] w-11 rounded-full bg-[linear-gradient(90deg,#E4DFFD,#CAC0FB,#E4DFFD)]"
          />
        </header>

        <ol role="list" className="mt-4 flex flex-col gap-2.5">
          {steps.map((step, i) => {
            const open = openStep === step.key;
            const detailId = `${uid}-step-${step.key}`;
            return (
              <li
                key={step.key}
                className="qh-rise"
                style={{ animationDelay: `${60 + i * 70}ms` }}
              >
                <div className="relative flex items-center gap-2.5 rounded-2xl border border-[#ECE8F9] bg-[linear-gradient(180deg,#FFFFFF_60%,#FAFAFD)] py-2.5 pl-2.5 pr-1.5 shadow-[0_6px_16px_-8px_rgba(91,63,217,0.18)] transition-transform has-[button:active]:scale-[0.985]">
                  <span
                    aria-hidden
                    className="qh-tile relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px]"
                    style={{ background: step.tone.tile }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={step.icon}
                      alt=""
                      draggable={false}
                      width={192}
                      height={192}
                      className="h-11 w-11 object-contain"
                      style={{ filter: `drop-shadow(0 5px 6px ${step.tone.glow})` }}
                    />
                    <Burst className="absolute right-0.5 top-[3px] h-4 w-4 text-[#FDC403]" />
                  </span>
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12.5px] font-extrabold tabular-nums"
                      style={{ background: step.tone.badge, color: step.tone.digit }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2
                        className="text-[16px] font-extrabold leading-6"
                        style={{ color: step.tone.title }}
                      >
                        {/* The ::after overlay makes the whole card the hit area; z-[1] keeps it above the rotated chevron and fading detail. */}
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={detailId}
                          onClick={() => setOpenStep(open ? null : step.key)}
                          className="cursor-pointer text-left focus-visible:outline-hidden after:absolute after:inset-0 after:z-[1] after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-[#7C5CFF]"
                        >
                          {step.title}
                        </button>
                      </h2>
                      <p
                        className="mt-0.5 text-[13px] leading-[1.38] text-pretty"
                        style={{ color: step.tone.body }}
                      >
                        {step.body}
                      </p>
                      <div
                        id={detailId}
                        inert={!open}
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <p
                            className="mt-2 rounded-xl px-2.5 py-1.5 text-[12.5px] font-bold leading-snug"
                            style={{ background: step.tone.detailBg, color: step.tone.detailText }}
                          >
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon
                    className={`pointer-events-none h-[18px] w-[18px] shrink-0 text-[#9384E6] transition-transform duration-300 motion-reduce:transition-none ${
                      open ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </li>
            );
          })}
        </ol>

        <section
          aria-labelledby={scoringHeadingId}
          className="qh-rise qh-panel relative mt-5 overflow-hidden rounded-2xl p-2 pt-3"
          style={{ animationDelay: "420ms" }}
        >
          <StarShape className="pointer-events-none absolute left-[5%] top-4 h-3.5 w-3.5 text-[#DCCFFD]" />
          <StarShape className="pointer-events-none absolute right-[5%] top-2.5 h-4 w-4 text-[#DCCFFD]" />
          <StarShape className="pointer-events-none absolute right-[11%] top-8 h-2.5 w-2.5 text-[#DCCFFD]" />
          <h2
            id={scoringHeadingId}
            className="relative flex items-center justify-center gap-2 font-display text-[19px] font-bold uppercase tracking-[0.03em] text-[#6514F0]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ART}/howto-crown.webp`}
              alt=""
              draggable={false}
              width={112}
              height={112}
              className="h-7 w-7 object-contain"
            />
            Scoring System
          </h2>
          <ul
            role="list"
            className="relative mt-2.5 rounded-xl bg-white px-3 shadow-[0_4px_14px_-8px_rgba(91,63,217,0.25),inset_0_0_0_1px_#F3F1FC]"
          >
            {scoringRows.map((row) => (
              <li
                key={row.kind}
                className="flex items-center gap-3 border-b border-[#E7E2F8] py-2.5 last:border-b-0"
              >
                <ScoreBadge kind={row.kind} className="h-8 w-8" />
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-[#07035D]">
                  {row.label}
                </span>
                <span className="shrink-0 rounded-[10px] bg-[#EDE8FD] px-3 py-1 text-[15px] font-extrabold tabular-nums text-[#5012F5]">
                  +{row.value} PB
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Language and Start stay pinned together, so the language choice is always seen before starting. */}
      <div
        className="relative z-20 shrink-0 px-4 pt-1"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <p role="status" className="sr-only">
          {starting ? "Starting quiz…" : ""}
        </p>
        <section aria-labelledby={languageHeadingId}>
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-[#C6BEF9]" />
            <h2
              id={languageHeadingId}
              className="flex items-center gap-1.5 font-display text-[15px] font-bold uppercase tracking-[0.04em] text-[#430FF5]"
            >
              <GlobeIcon className="h-[18px] w-[18px] text-[#552BF7]" />
              Choose Language
            </h2>
            <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C6BEF9]" />
          </div>
          {/* Sized in em off one clamped font-size so all three chips fit on one row from 320px up; they wrap rather than truncate. */}
          <div
            role="radiogroup"
            aria-labelledby={languageHeadingId}
            className="mt-2.5 flex flex-wrap gap-[0.42em] text-[clamp(12px,3.72vw,14.5px)]"
          >
            {LANG_OPTIONS.map((opt) => {
              const selected = language === opt.code;
              return (
                <label
                  key={opt.code}
                  className={`relative flex min-h-[4em] flex-auto cursor-pointer items-center gap-[0.42em] rounded-[1.25em] border py-[0.5em] pl-[0.5em] pr-[0.6em] transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none has-[:focus-visible]:outline-hidden has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#7C5CFF] has-[:focus-visible]:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${
                    selected
                      ? "border-[#4318E5] bg-[linear-gradient(45deg,#452BD1_0%,#6A40F4_50%,#8A4FFB_100%)] text-white shadow-[0_8px_16px_-6px_rgba(105,64,244,0.55),inset_0_1px_0_#9558FD]"
                      : "border-[#E2DAFB] bg-[linear-gradient(180deg,#FEFDFF,#F7F4FE)] text-[#260A87] shadow-[0_4px_12px_-8px_rgba(91,63,217,0.3)]"
                  }`}
                >
                  {/* Covers the whole chip so touch exploration in screen readers lands on the radio. */}
                  <input
                    type="radio"
                    name={`${uid}-language-choice`}
                    value={opt.code}
                    checked={selected}
                    disabled={starting}
                    onChange={() => setLanguage(opt.code)}
                    className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none rounded-[inherit] opacity-0 disabled:cursor-not-allowed"
                  />
                  <LanguageMark kind={opt.mark} selected={selected} className="h-[1.95em] w-[1.95em]" />
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-nowrap text-[1em] font-extrabold leading-tight">
                      {opt.label}
                    </span>
                    <span
                      lang={opt.code}
                      aria-hidden={opt.native === opt.label || undefined}
                      className={`block whitespace-nowrap text-[0.83em] font-medium leading-tight ${
                        selected ? "text-white" : "text-[#5340AE]"
                      }`}
                    >
                      {opt.native}
                    </span>
                  </span>
                  {selected ? (
                    <span
                      aria-hidden
                      className="qh-pop flex h-[1.4em] w-[1.4em] shrink-0 items-center justify-center rounded-full bg-white text-[#4A1FF0] shadow-[0_2px_6px_rgba(30,10,120,0.35)]"
                    >
                      <CheckIcon className="h-[0.9em] w-[0.9em]" />
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </section>
        {error ? (
          <p
            role="alert"
            className="mt-2.5 rounded-2xl bg-[#FEE2E2] px-3 py-2 text-center text-[13px] font-semibold text-[#C62828]"
          >
            {error}
          </p>
        ) : null}
        <div className="relative mt-3 px-2.5">
          <Burst side="left" className="qh-twinkle absolute -left-1 -top-2 h-6 w-6 text-[#FECC5B]" />
          <Burst className="qh-twinkle absolute -right-1 -top-2 h-6 w-6 text-[#FDD58A]" />
          {/* aria-disabled (not disabled) keeps focus on the button while the quiz starts. */}
          <button
            type="button"
            onClick={() => {
              if (!starting) onStart(language);
            }}
            aria-disabled={starting || undefined}
            className="qh-start relative flex h-[60px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-full text-[22px] font-extrabold text-white forced-colors:border-2"
          >
            <span aria-hidden className="qh-sheen pointer-events-none absolute inset-0" />
            <span className="relative">{starting ? "Starting…" : "Start Quiz"}</span>
            <span
              aria-hidden
              className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,#FFFFFF,#F1F0FD)] text-[#4F1FE9] shadow-[0_4px_10px_-2px_rgba(40,20,140,0.45)]"
            >
              {starting ? (
                <span className="quiz-spinner block h-5 w-5 rounded-full border-[2.5px] border-[#4F1FE9]/25 border-t-[#4F1FE9]" />
              ) : (
                <ArrowRightIcon className="h-5 w-5" />
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
