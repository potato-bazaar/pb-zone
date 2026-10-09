"use client";

import { useId, useState } from "react";
import { haptic, sounds } from "@/components/crush/render/sound";
import {
  ART,
  Chip,
  TM_TONES,
  TaterCard,
  TaterCta,
  TaterFooter,
  TaterHeader,
  TaterPanel,
  TaterScreen,
  TaterScroll,
  TaterTile,
  TaterTitle,
  TaterTitleBar,
  cn,
  type TaterTone,
} from "@/components/match/TaterUi";
import { ChevronRightIcon, ScoreBadge, type ScoreBadgeKind } from "@/components/quiz/QuizHowToIcons";
import { DAILY_QUESTIONS, TATER_SCORING } from "@/data/taterMatch";

const QUIZ_ART = "/games/quiz";

type Step = {
  key: string;
  tone: TaterTone;
  icon: string;
  title: string;
  /** ≤ 65 chars so it stays within two lines of the 239px column (SPEC §4.2). */
  body: string;
  /** Revealed when the card is tapped; every number comes from TATER_SCORING / DAILY_QUESTIONS. */
  detail: string;
};

const S = TATER_SCORING;

const STEPS: Step[] = [
  {
    key: "mode",
    tone: "variety",
    icon: `${ART}/howto-cards.webp`,
    title: "Pick a mode",
    body: "Variety, Disease or Growth — each one teaches a potato skill.",
    detail: `Play Now mixes all three. The Daily Challenge is ${DAILY_QUESTIONS} mixed matches, once a day.`,
  },
  {
    key: "tap",
    tone: "gold",
    icon: `${ART}/howto-tap.webp`,
    title: "Tap the matching photo",
    body: "Read the prompt, then tap the photo that matches. One tap answers!",
    detail: `You have ${S.answerSeconds} seconds. Your tap locks in the answer and shows right or wrong at once. If the timer hits 0, the match is missed. Then tap Next Question.`,
  },
  {
    key: "learn",
    tone: "disease",
    icon: `${ART}/howto-learn.webp`,
    title: "Learn on every try",
    body: "Right or wrong, you get a potato tip so the next match is easier.",
    detail: "Tips are saved under My Progress → Recent learning.",
  },
  {
    key: "earn",
    tone: "gold",
    icon: `${QUIZ_ART}/howto-trophy.webp`,
    title: "Earn PB & coins",
    body: `+${S.pointsCorrect} PB and +${S.coinsCorrect} coins per correct match. Within ${S.fastSeconds} s: +${S.pointsFast} PB.`,
    detail: `A perfect ${S.questionsPerRound}/${S.questionsPerRound} adds +${S.pointsPerfectRound} PB and +${S.coinsPerfectRound} coins.`,
  },
  {
    key: "daily",
    tone: "growth",
    icon: `${ART}/daily-flame.webp`,
    title: "Daily challenge",
    body: `Come back daily: +${S.pointsDaily} PB, +${S.coinsDaily} coins and your streak grows.`,
    detail: "Streaks count calendar days; miss a day and it restarts at 1.",
  },
];

type ScoringRow = {
  key: string;
  kind: ScoreBadgeKind;
  label: string;
  points: number;
  coins?: number;
};

const SCORING_ROWS: ScoringRow[] = [
  { key: "correct", kind: "correct", label: "Correct match", points: S.pointsCorrect, coins: S.coinsCorrect },
  { key: "fast", kind: "complete", label: `Fast answer (≤ ${S.fastSeconds} s)`, points: S.pointsFast },
  { key: "perfect", kind: "complete", label: "Perfect round", points: S.pointsPerfectRound, coins: S.coinsPerfectRound },
  { key: "daily", kind: "complete", label: "Daily challenge", points: S.pointsDaily, coins: S.coinsDaily },
];

type Props = {
  onBack: () => void;
  onPlay: () => void;
};

export function TaterMatchHowTo({ onBack, onPlay }: Props) {
  const [openStep, setOpenStep] = useState<string | null>(null);
  const uid = useId();

  return (
    <TaterScreen>
      <TaterHeader
        onBack={onBack}
        backLabel="Back"
        art={{
          src: `${ART}/mode-disease.webp`,
          width: 216,
          height: 216,
          className: "w-[clamp(52px,16vw,72px)] opacity-90",
          // mode-disease.webp is trimmed to its alpha bbox (handle runs to the corner), so the
          // default -right-2 overhang clips it; keep the art fully inside the header.
          inset: true,
        }}
      >
        <TaterTitle first="How to" accent="Play" />
      </TaterHeader>
      <TaterTitleBar />

      <TaterScroll fade>
        <ol role="list" className="mt-2 flex flex-col gap-1.5">
          {STEPS.map((step, i) => {
            const open = openStep === step.key;
            const tone = TM_TONES[step.tone];
            const detailId = `${uid}-step-${step.key}`;
            return (
              <TaterCard
                key={step.key}
                as="li"
                delay={60 + i * 70}
                className="relative flex items-center gap-2 py-1.5 pl-2 pr-1 transition-transform has-[button:active]:scale-[0.985]"
              >
                <TaterTile tone={step.tone} src={step.icon} size="md" />
                <div className="flex min-w-0 flex-1 items-start gap-1.5">
                  <span
                    aria-hidden
                    className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold tabular-nums"
                    style={{ background: tone.badge, color: tone.digit }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[14px] font-extrabold leading-tight" style={{ color: tone.title }}>
                      {/* The ::after overlay makes the whole card the hit area; z-[1] keeps it above the rotated chevron and fading detail. */}
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={detailId}
                        onClick={() => setOpenStep(open ? null : step.key)}
                        className="cursor-pointer text-left focus-visible:outline-hidden after:absolute after:inset-0 after:z-[1] after:rounded-[20px] after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-[#145C32]"
                      >
                        {step.title}
                      </button>
                    </h2>
                    <p className="mt-0.5 text-[12px] font-semibold leading-[1.3] text-pretty text-[#3F5A48]">
                      {step.body}
                    </p>
                    <div
                      id={detailId}
                      inert={!open}
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <p
                          className="mt-2 rounded-xl px-2.5 py-1.5 text-[12.5px] font-bold leading-snug"
                          style={{ background: tone.detailBg, color: tone.detailText }}
                        >
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <ChevronRightIcon
                  className={cn(
                    "pointer-events-none h-[18px] w-[18px] shrink-0 text-[#4F8F66] transition-transform duration-300 motion-reduce:transition-none",
                    open && "rotate-90",
                  )}
                />
              </TaterCard>
            );
          })}
        </ol>

        <TaterPanel
          title="Scoring System"
          delay={420}
          className="mt-2"
          icon={
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${QUIZ_ART}/howto-crown.webp`}
              alt=""
              draggable={false}
              width={112}
              height={112}
              className="h-6 w-6 object-contain"
            />
          }
        >
          <ul role="list">
            {SCORING_ROWS.map((row) => (
              <li
                key={row.key}
                className="flex items-center gap-2 border-b border-[#D9EBDC] py-1.5 last:border-b-0"
              >
                <ScoreBadge kind={row.kind} className="h-7 w-7" />
                <span className="min-w-0 flex-1 text-[13px] font-semibold text-[#0F3D22]">{row.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <Chip tone="green">+{row.points} PB</Chip>
                  {row.coins != null ? <Chip tone="coin">+{row.coins}</Chip> : null}
                </span>
              </li>
            ))}
          </ul>
        </TaterPanel>
      </TaterScroll>

      <TaterFooter>
        <TaterCta
          tone="gold"
          label="Start Matching"
          icon="arrow"
          bursts
          onClick={() => {
            sounds.unlock();
            sounds.play("ui");
            haptic(10);
            onPlay();
          }}
        />
      </TaterFooter>
    </TaterScreen>
  );
}
