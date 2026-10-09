"use client";

import { haptic, sounds } from "@/components/crush/render/sound";
import {
  ART,
  TM_TONES,
  TaterCta,
  TaterFooter,
  TaterGhost,
  TaterScreen,
  TaterScroll,
  WalletPills,
} from "@/components/match/TaterUi";
import { SparkleIcon } from "@/components/quiz/QuizCompleteIcons";
import { ArrowRightIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/quiz/QuizHowToIcons";
import type { TaterModeId, TaterModeMeta, TaterProgress } from "@/data/taterMatch";
import { DAILY_QUESTIONS, TATER_MODES, TATER_SCORING } from "@/data/taterMatch";

type Props = {
  coins: number;
  points: number;
  progress: TaterProgress;
  dailyAvailable: boolean;
  onBack: () => void;
  onPlay: (mode: TaterModeId | "mixed", daily?: boolean) => void;
  onHowTo: () => void;
  onProgress: () => void;
};

/** Entrance stagger of the mode cards. */
const MODE_DELAYS = [180, 250, 320] as const;

/** UI feedback for every press on this screen; the first press also unlocks iOS audio. */
function press() {
  sounds.unlock();
  sounds.play("ui");
  haptic(10);
}

/**
 * Home — the storybook-farm lobby (same scenery as Play): illustrated hero with the detective
 * potato, stats strip, gold daily challenge, mode cards with themed scenery, and the wooden board
 * holding Play Now over the soil. Mode cards and the daily card start a round directly; Play Now
 * starts a mixed round.
 */
export function TaterMatchHome({
  coins,
  points,
  progress,
  dailyAvailable,
  onBack,
  onPlay,
  onHowTo,
  onProgress,
}: Props) {
  const streakText = `Streak ${progress.streak} ${progress.streak === 1 ? "day" : "days"}`;
  const bestText = `Best ${progress.bestCorrect} of ${TATER_SCORING.questionsPerRound}`;
  const roundsText = `${progress.roundsPlayed} ${progress.roundsPlayed === 1 ? "round" : "rounds"} played`;

  return (
    <TaterScreen className="tm-home">
      {/* Painted garden canvas: leafy bokeh with daisies, soil along the very bottom. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ART}/home-canvas.webp`}
        alt=""
        draggable={false}
        width={1152}
        height={2048}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-bottom"
      />

      <header
        className="relative z-20 flex shrink-0 items-center justify-between px-4"
        style={{ paddingTop: "max(0.5rem, calc(var(--header-top) - 0.25rem))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to games"
          className="tm-back-cream hit-slop flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#173B26] active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1F8A47] focus-visible:ring-offset-2"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <WalletPills coins={coins} points={points} variant="cream" />
        </div>
      </header>

      <TaterScroll gutter={4} pad={3} className="mt-2">
        {/* Hero card: painted garden, the detective potato peeking in from the right, 3D lettering and a wooden tagline plank. */}
        <section className="tm-hero-card qh-rise relative h-[138px] overflow-hidden rounded-[22px] md:h-[176px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/hero-bg.webp`}
            alt=""
            draggable={false}
            width={1024}
            height={576}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[55%_40%]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/hero-mascot.webp`}
            alt=""
            draggable={false}
            width={420}
            height={420}
            className="tm-hero-mascot pointer-events-none absolute -bottom-2 right-0 h-[118%] w-auto select-none"
          />
          <SparkleIcon className="qh-twinkle pointer-events-none absolute right-[36%] top-[14%] h-3 w-3 text-white" />
          <SparkleIcon
            className="qh-twinkle pointer-events-none absolute right-[6%] top-[24%] h-[9px] w-[9px] text-white"
            style={{ animationDelay: "0.9s" }}
          />
          <SparkleIcon
            className="qh-twinkle pointer-events-none absolute right-[4%] bottom-[20%] h-[11px] w-[11px] text-[#FFE88E]"
            style={{ animationDelay: "1.5s" }}
          />
          <div className="absolute inset-y-0 left-3.5 flex w-[64%] flex-col justify-between py-2">
            <p className="tm-hero-eyebrow text-[10px] font-extrabold uppercase leading-[12px] tracking-[0.22em]">
              Game Zone · Learn
            </p>
            <h1 className="tm-hero-title mt-0.5 h-[78px] shrink-0 md:h-[100px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ART}/hero-title.webp`}
                alt="Tater Match"
                draggable={false}
                width={600}
                height={360}
                className="h-full w-auto max-w-none select-none"
              />
            </h1>
            <p className="relative mt-0.5 inline-flex h-[26px] shrink-0 items-center self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ART}/wood-plank.webp`}
                alt=""
                draggable={false}
                width={600}
                height={140}
                className="pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <span className="tm-plank-text relative px-3 text-[11px] font-extrabold leading-none text-white">
                Spot it · Match it · Grow smarter!
              </span>
            </p>
          </div>
        </section>

        {/* Stats strip. */}
        <div className="tm-stats qh-rise mt-2.5 grid h-[48px] grid-cols-3 rounded-[16px]" style={{ animationDelay: "60ms" }}>
          <Stat icon={`${ART}/daily-flame.webp`} value={String(progress.streak)} label="Streak" text={streakText} />
          <Stat
            icon="/games/quiz/howto-trophy.webp"
            value={`${progress.bestCorrect}/${TATER_SCORING.questionsPerRound}`}
            label="Best"
            text={bestText}
          />
          <Stat icon={`${ART}/howto-cards.webp`} value={String(progress.roundsPlayed)} label="Rounds" text={roundsText} />
        </div>

        {/* Daily challenge: gold card with the sunburst flame badge. The rise runs on a wrapper so the press transform still applies. */}
        <div className="qh-rise mt-2.5" style={{ animationDelay: "120ms" }}>
          <button
            type="button"
            disabled={!dailyAvailable}
            aria-label={
              dailyAvailable
                ? `Daily challenge: ${DAILY_QUESTIONS} matches, +${TATER_SCORING.pointsDaily} PB, +${TATER_SCORING.coinsDaily} coins`
                : "Daily challenge done for today"
            }
            onClick={() => {
              press();
              onPlay("mixed", true);
            }}
            className="tm-daily relative flex h-[68px] w-full items-center gap-2 overflow-hidden rounded-[20px] pl-2 pr-2 text-left"
          >
            {dailyAvailable ? <span aria-hidden className="qh-sheen pointer-events-none absolute inset-0" /> : null}
            <CrownMark className="pointer-events-none absolute right-[22%] top-1.5 h-10 w-10 text-[#E2A818] opacity-70" />
            <SparkleIcon className="qh-twinkle pointer-events-none absolute right-[32%] top-2 h-3 w-3 text-[#FFF6C8]" />
            <SparkleIcon
              className="qh-twinkle pointer-events-none absolute right-[18%] bottom-2 h-2.5 w-2.5 text-[#FFF6C8]"
              style={{ animationDelay: "1.1s" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ART}/daily-badge.webp`}
              alt=""
              draggable={false}
              width={168}
              height={168}
              className={`relative h-[54px] w-[54px] shrink-0 select-none object-contain ${dailyAvailable ? "" : "opacity-60 grayscale-[0.4]"}`}
            />
            <span className="relative min-w-0 flex-1">
              <span className="block text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-[#5A3A00]">
                Daily Challenge
              </span>
              <span className="mt-1 block truncate font-display text-[17px] font-bold leading-[1.1] tracking-[-0.02em] text-[#3A1F02]">
                {dailyAvailable
                  ? `${DAILY_QUESTIONS} matches · +${TATER_SCORING.pointsDaily} PB · +${TATER_SCORING.coinsDaily} coins`
                  : "Done for today — back tomorrow"}
              </span>
            </span>
            <span
              aria-hidden
              className={`tm-daily-go relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${dailyAvailable ? "bg-[#3A2A00] text-[#FFD23F]" : "bg-[#FFE9A8] text-[#7A4A00]"}`}
            >
              {dailyAvailable ? <ArrowRightIcon className="h-5 w-5" /> : <CheckIcon className="h-5 w-5" />}
            </span>
          </button>
        </div>

        {/* Mode list. */}
        <p className="mt-3 flex h-4 items-center gap-1.5 text-[11px] font-extrabold uppercase leading-none tracking-[0.18em] text-[#2F4A30]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/leaf-sprig.webp`}
            alt=""
            draggable={false}
            width={150}
            height={137}
            className="h-4 w-auto select-none"
          />
          Pick a mode
          <span aria-hidden className="ml-1 h-px flex-1 bg-[#B4CDA1]/70" />
        </p>
        <ul role="list" className="mt-2 flex flex-col gap-2.5">
          {TATER_MODES.map((mode, i) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              delay={MODE_DELAYS[i] ?? 320}
              onPlay={() => {
                press();
                onPlay(mode.id);
              }}
            />
          ))}
        </ul>
      </TaterScroll>

      {/* Footer: Play Now on a wooden board, then the two cream buttons, all over the soil. */}
      <TaterFooter top={1} bottom={1}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/wood-board.webp`}
            alt=""
            draggable={false}
            width={1100}
            height={286}
            className="pointer-events-none block h-auto w-full select-none"
          />
          <div className="absolute inset-x-6 bottom-[30%] top-[6%] flex items-center">
            <TaterCta
              tone="gold"
              size="xl"
              label="Play Now"
              icon="play"
              bursts
              className="w-full"
              onClick={() => {
                press();
                onPlay("mixed");
              }}
            />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <TaterGhost
            size="sm"
            icon="help"
            className="tm-ghost-leaf"
            label="How to Play"
            onClick={() => {
              press();
              onHowTo();
            }}
          />
          <TaterGhost
            size="sm"
            icon="chart"
            className="tm-ghost-leaf"
            label="My Progress"
            onClick={() => {
              press();
              onProgress();
            }}
          />
        </div>
      </TaterFooter>
    </TaterScreen>
  );
}

/** One segment of the stats strip: 3D icon beside a stacked value and label, with one sr-only sentence as its name. */
function Stat({ icon, value, label, text }: { icon: string; value: string; label: string; text: string }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={icon}
        alt=""
        draggable={false}
        width={192}
        height={192}
        className="h-8 w-8 shrink-0 select-none object-contain drop-shadow-[0_2px_2px_rgba(60,40,10,0.25)]"
      />
      <span className="flex min-w-0 flex-col">
        <span aria-hidden className="font-display text-[17px] font-bold leading-none text-[#173B26]">
          {value}
        </span>
        <span aria-hidden className="mt-0.5 text-[11px] font-bold leading-none text-[#5F6A5D]">
          {label}
        </span>
      </span>
      <span className="sr-only">{text}</span>
    </div>
  );
}

function ModeCard({ mode, delay, onPlay }: { mode: TaterModeMeta; delay: number; onPlay: () => void }) {
  const tone = TM_TONES[mode.id];
  return (
    // The rise runs on the li so `.tm-mode:active`'s press transform is not pinned by the animation fill.
    <li className="qh-rise" style={{ animationDelay: `${delay}ms` }}>
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Play ${mode.title} — ${mode.subtitle}`}
        className="tm-mode-card tm-mode relative flex h-[62px] w-full items-center gap-3 overflow-hidden rounded-[20px] pl-2 pr-2.5 text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ART}/scene-${mode.id}.webp`}
          alt=""
          draggable={false}
          width={600}
          height={338}
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-[60%] select-none object-cover object-right"
        />
        <span
          aria-hidden
          className="tm-mode-tile relative flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px]"
          style={{ background: tone.tile }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/mode-${mode.id}.webp`}
            alt=""
            draggable={false}
            width={192}
            height={192}
            className="h-[42px] w-[42px] select-none object-contain"
            style={{ filter: `drop-shadow(0 4px 5px ${tone.glow})` }}
          />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block truncate font-display text-[18px] font-bold leading-[1.1]" style={{ color: tone.title }}>
            {mode.title}
          </span>
          <span className="mt-0.5 block truncate text-[12px] font-semibold leading-tight text-[#4A5A4C]">{mode.subtitle}</span>
        </span>
        <span
          aria-hidden
          className="tm-mode-go relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: `linear-gradient(180deg, ${tone.accent} 0%, ${tone.ink} 100%)` }}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </span>
      </button>
    </li>
  );
}

/** Faint crown watermark on the daily card. */
function CrownMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M3 8.5 7.6 12.4 12 5.5l4.4 6.9L21 8.5l-2 10.2H5L3 8.5Z" />
      <rect x="5" y="19.5" width="14" height="1.8" rx="0.9" />
    </svg>
  );
}
