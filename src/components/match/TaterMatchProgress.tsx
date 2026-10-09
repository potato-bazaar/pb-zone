"use client";

import { type ReactNode } from "react";
import {
  ART,
  cn,
  Medallion,
  TaterHeader,
  TaterScreen,
  TaterScroll,
  TaterTile,
  TaterTitle,
  TaterTitleBar,
} from "@/components/match/TaterUi";
import { SproutIcon } from "@/components/quiz/QuizCompleteIcons";
import { Burst, ScoreBadge } from "@/components/quiz/QuizHowToIcons";
import { TATER_BADGES, TATER_SCORING, type TaterProgress } from "@/data/taterMatch";

type Props = {
  progress: TaterProgress;
  onBack: () => void;
};

/** Medal art per badge id (SPEC §4.4 / §5), in `TATER_BADGES` order. */
const BADGE_ART: Record<string, string> = {
  "potato-starter": "badge-starter",
  "crop-learner": "badge-learner",
  "sharp-matcher": "badge-sharp",
  "potato-streaker": "badge-streaker",
  "disease-detective": "badge-detective",
};

/** Max learned tips shown (unchanged from the previous screen). */
const MAX_LEARNED = 6;

/**
 * My Progress — the badge shelf (SPEC §4.4). Quiet screen: no footer, no sounds; Back is the only
 * exit. Header 56 → the scroll region holds the 2×2 stats, the medallion shelf and recent learning.
 */
export function TaterMatchProgress({ progress, onBack }: Props) {
  const unlocked = TATER_BADGES.filter((badge) => progress.badges.includes(badge.id)).length;
  const learned = progress.learned.slice(0, MAX_LEARNED);

  return (
    <TaterScreen>
      <TaterHeader
        onBack={onBack}
        backLabel="Back"
        art={{ src: `${ART}/badge-detective.webp`, width: 168, height: 168, className: "w-14", inset: true }}
      >
        <TaterTitle first="My" accent="Progress" />
      </TaterHeader>
      <TaterTitleBar />

      <TaterScroll pad={6}>
        {/* Stats 2×2 */}
        <dl className="mt-2.5 grid grid-cols-2 gap-2">
          <StatCell
            delay={60}
            icon={<TaterTile tone="gold" size="sm" src={`${ART}/daily-flame.webp`} />}
            label="Day streak"
            value={progress.streak}
          />
          <StatCell
            delay={130}
            icon={<TaterTile tone="gold" size="sm" src="/games/quiz/howto-trophy.webp" />}
            label="Best score"
            value={progress.bestCorrect}
            suffix={`/${TATER_SCORING.questionsPerRound}`}
          />
          <StatCell
            delay={200}
            icon={<TaterTile tone="variety" size="sm" src={`${ART}/howto-cards.webp`} />}
            label="Rounds played"
            value={progress.roundsPlayed}
          />
          <StatCell
            delay={270}
            icon={<ScoreBadge kind="correct" className="h-9 w-9" />}
            label="Total correct"
            value={progress.totalCorrect}
          />
        </dl>

        {/* Badges */}
        <div className="mt-3.5 flex items-center justify-between">
          <Eyebrow icon={<Burst rays={3} side="left" className="h-3.5 w-3.5 text-[#FFD23F]" />}>Badges</Eyebrow>
          <span
            className="text-[11px] font-extrabold tabular-nums text-[#17703A]"
            aria-label={`${unlocked} of ${TATER_BADGES.length} badges unlocked`}
          >
            {unlocked}/{TATER_BADGES.length}
          </span>
        </div>
        <ul role="list" className="mt-2 grid grid-cols-6 gap-2">
          {TATER_BADGES.map((badge, i) => (
            <Medallion
              key={badge.id}
              src={`${ART}/${BADGE_ART[badge.id] ?? "badge-starter"}.webp`}
              label={badge.label}
              hint={badge.hint}
              unlocked={progress.badges.includes(badge.id)}
              delay={300 + 70 * i}
              className={i === 3 ? "col-start-2" : undefined}
            />
          ))}
        </ul>

        {/* Recent learning */}
        <Eyebrow className="mt-3.5" icon={<SproutIcon className="h-3.5 w-3.5" />}>
          Recent learning
        </Eyebrow>
        {learned.length > 0 ? (
          <ul role="list" className="mt-2 flex flex-col gap-1.5">
            {learned.map((item, i) => (
              <li
                key={item}
                className="tm-card qh-rise flex h-10 items-center gap-2 rounded-2xl px-3"
                style={{ animationDelay: `${640 + 50 * i}ms` }}
              >
                <TaterTile tone="disease" size="sm" src={`${ART}/howto-learn.webp`} burst={false} />
                <span className="line-clamp-1 min-w-0 text-[12px] font-semibold text-[#145C32]">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="qh-rise mt-2 flex h-[72px] items-center gap-3 rounded-2xl border-2 border-dashed border-[#BFE5C6] bg-white/60 px-3"
            style={{ animationDelay: "640ms" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ART}/mascot-look.webp`}
              alt=""
              draggable={false}
              width={288}
              height={288}
              className="h-10 w-10 shrink-0 select-none object-contain"
            />
            <p className="text-[12px] font-bold text-[#3F5A48] text-pretty">Play a round to collect potato tips here.</p>
          </div>
        )}
      </TaterScroll>
    </TaterScreen>
  );
}

/** One 64px stat cell of the `dl` grid: tile · uppercase label (`dt`) over a Fredoka value (`dd`). */
function StatCell({
  icon,
  label,
  value,
  suffix,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  /** e.g. "/10" rendered at 13px after the value (never a literal). */
  suffix?: string;
  delay: number;
}) {
  return (
    <div
      className="tm-card qh-rise flex h-16 items-center gap-2.5 rounded-[18px] px-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      {icon}
      <div className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#4F6B58]">{label}</dt>
        <dd className="font-display text-[20px] font-bold leading-none tabular-nums text-[#0F3D22]">
          {value}
          {suffix ? <span className="text-[13px] text-[#3F5A48]">{suffix}</span> : null}
        </dd>
      </div>
    </div>
  );
}

/** Section eyebrow: 10px Nunito 800 uppercase, with a small glyph on the left. */
function Eyebrow({ icon, children, className }: { icon: ReactNode; children: string; className?: string }) {
  return (
    <h2
      className={cn(
        "flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#4F6B58]",
        className,
      )}
    >
      {icon}
      {children}
    </h2>
  );
}
