"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { haptic, sounds } from "@/components/crush/render/sound";
import { MovementBadge, PbCoinIcon, PbStarIcon } from "@/components/pb/PbUi";
import type { PbReceipt } from "@/components/providers/PbPointsProvider";
import { DAILY_CAP_MESSAGE, PB_GAME_LABELS } from "@/data/pbEconomy";
import {
  BarChartIcon,
  HomeIcon,
  PlayIcon,
  SparkleIcon,
  SproutIcon,
  TrophyIcon,
} from "@/components/quiz/QuizCompleteIcons";
import { Burst, ChevronRightIcon } from "@/components/quiz/QuizHowToIcons";
import { PointsLandFx, WinBurst } from "@/components/quiz/QuizWinEffects";

const ART = "/games/quiz";

type CompleteProps = {
  correctCount: number;
  totalQuestions: number;
  completionBonus: number;
  /** Coins earned this session (server-settled). */
  totalEarned: number;
  /** PB Points receipt for this session. */
  pb: PbReceipt | null;
  onPlayAgain: () => void;
  onHome: () => void;
};

function useCountUp(target: number, duration = 1100, delay = 500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    // Reduced motion: land on the final value on the first frame.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 0 : duration;
    let raf = 0;
    let start = 0;
    const timer = window.setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const p = ms === 0 ? 1 : Math.min(1, (t - start) / ms);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, reduce ? 0 : delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return value;
}

// Static, deterministic confetti around the header (positions in % of the header band).
const CONFETTI = [
  { left: 3, top: 8, w: 7, h: 12, color: "#7E29F9", rot: -24 },
  { left: 11, top: 2, w: 6, h: 10, color: "#FFD200", rot: 30 },
  { left: 22, top: 6, w: 7, h: 11, color: "#96EB3D", rot: -12 },
  { left: 29, top: 26, w: 6, h: 10, color: "#FF5208", rot: 40 },
  { left: 36, top: 1, w: 7, h: 12, color: "#7E29F9", rot: -35 },
  { left: 47, top: 0, w: 6, h: 10, color: "#FFD200", rot: 18 },
  { left: 58, top: 4, w: 7, h: 12, color: "#7E29F9", rot: 55 },
  { left: 66, top: 22, w: 6, h: 10, color: "#FF5208", rot: -40 },
  { left: 73, top: 2, w: 7, h: 11, color: "#96EB3D", rot: 25 },
  { left: 84, top: 10, w: 6, h: 10, color: "#FFD200", rot: -20 },
  { left: 93, top: 4, w: 7, h: 12, color: "#FF5208", rot: 35 },
  { left: 6, top: 52, w: 6, h: 10, color: "#FFD200", rot: 15 },
  { left: 33, top: 60, w: 5, h: 9, color: "#7E29F9", rot: -30 },
  { left: 90, top: 58, w: 6, h: 10, color: "#96EB3D", rot: 28 },
];

// White twinkles around the mascot and the trophy (% of the header band).
const SPARKLES = [
  { right: 21, top: 4, size: 9 },
  { right: 1, top: 6, size: 8 },
  { right: 23, top: 56, size: 7 },
  { right: 3, top: 50, size: 9 },
  { right: 95, top: 12, size: 10 },
  { right: 66, top: 3, size: 8 },
  { right: 72, top: 44, size: 7 },
];

type Lettering = "title" | "gold" | "headline";

const LETTERING_LAYERS: Record<Lettering, { layers: string[]; fill: string }> = {
  // "Game": white outline and lavender glow around a violet fill.
  title: { layers: ["qd-layer-white"], fill: "qd-fill-title" },
  // "Complete!": white outside a purple outline around a gold fill.
  gold: { layers: ["qd-layer-white-thick", "qd-layer-purple"], fill: "qd-fill-gold" },
  // "+18 PB Points": white outline with a lavender drop under it.
  headline: { layers: ["qd-layer-headline"], fill: "qd-fill-headline" },
};

/**
 * Game lettering built from stacked copies of the same text (strokes behind, gradient fill in
 * front). Every copy is decorative; callers provide the accessible text.
 */
function OutlinedText({
  children,
  variant,
  className = "",
}: {
  children: string;
  variant: Lettering;
  className?: string;
}) {
  const { layers, fill } = LETTERING_LAYERS[variant];
  return (
    <span aria-hidden className={`relative inline-block ${className}`}>
      {layers.map((layer) => (
        <span key={layer} className={`${layer} absolute inset-0`}>
          {children}
        </span>
      ))}
      <span className={`qd-text-fill relative ${fill}`}>{children}</span>
    </span>
  );
}

function Panel({
  tone,
  icon,
  title,
  className = "",
  children,
}: {
  tone: "violet" | "gold";
  icon: ReactNode;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const gold = tone === "gold";
  return (
    <section className={`${gold ? "qd-panel-gold" : "qd-panel-violet"} rounded-2xl p-2 ${className}`}>
      <h2
        className={`flex items-center gap-2 px-1.5 pt-0.5 font-display text-[16px] font-bold ${
          gold ? "text-[#754405]" : "text-[#1F0F6E]"
        }`}
      >
        {icon}
        {title}
      </h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function Rows({
  tone,
  rows,
  total,
}: {
  tone: "violet" | "gold";
  rows: { label: string; value: string }[];
  total: string;
}) {
  const gold = tone === "gold";
  return (
    <ul role="list" className={`${gold ? "qd-inner-gold" : "qd-inner-violet"} rounded-xl px-[3px] pb-[3px] pt-0.5`}>
      {rows.map((row) => (
        <li
          key={row.label}
          className={`mx-2.5 flex items-center justify-between border-b py-1.5 ${
            gold ? "border-[#FDE7AF]" : "border-[#E5E0FD]"
          }`}
        >
          <span className={`text-[14px] font-medium ${gold ? "text-[#8A4F0B]" : "text-[#1F1480]"}`}>{row.label}</span>
          <span className={`font-display text-[15px] font-semibold tabular-nums ${gold ? "text-[#744207]" : "text-[#1A0D7B]"}`}>
            {row.value}
          </span>
        </li>
      ))}
      <li
        className={`mt-1 flex items-center justify-between rounded-[9px] px-2.5 py-1.5 font-display font-bold ${
          gold ? "bg-[#FEE8A3]" : "bg-[#EAE5FE]"
        }`}
      >
        <span className={`text-[15px] ${gold ? "text-[#7D4704]" : "text-[#5534CB]"}`}>Total</span>
        <span className={`text-[17.5px] tabular-nums ${gold ? "text-[#814B05]" : "text-[#5532E8]"}`}>{total}</span>
      </li>
    </ul>
  );
}

function BoardRow({
  medal,
  label,
  href,
  rankBefore,
  rankAfter,
  detail,
}: {
  medal: "purple" | "silver";
  label: string;
  href: string;
  rankBefore: number;
  rankAfter: number;
  detail: string;
}) {
  const moved = rankAfter !== rankBefore;
  return (
    <li className="qd-board-row flex items-center gap-2.5 rounded-xl py-2 pl-2.5 pr-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ART}/done-medal-${medal}.webp`}
        alt=""
        draggable={false}
        width={144}
        height={144}
        className="h-9 w-9 shrink-0 object-contain"
      />
      {/* One line ("Rank #13 · 1,425 PB in this game") when the row is wide enough, two clean lines otherwise. */}
      <div className="@container min-w-0 flex-1">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[#5E3AF8]">{label}</p>
        <p className="mt-0.5 text-[13px] font-medium leading-snug text-[#241781]">
          <span className="inline-flex items-center gap-1.5">
            <span>
              Rank <span className="font-display text-[15px] font-bold text-[#211178]">#{rankAfter}</span>
            </span>
            {moved ? <MovementBadge delta={rankBefore - rankAfter} /> : null}
          </span>
          <span aria-hidden className="hidden @min-[13.5rem]:inline">
            {" · "}
          </span>
          <span className="block text-[12px] text-[#1F147E] @min-[13.5rem]:inline">{detail}</span>
        </p>
      </div>
      <Link
        href={href}
        aria-label={`View ${label}`}
        className="qd-view flex h-9 shrink-0 items-center justify-center gap-1 rounded-full pl-3 pr-2 font-display text-[13px] font-bold text-[#542CE4] max-[359px]:w-9 max-[359px]:px-0"
      >
        {/* Below 360px the pill collapses to a round chevron; the aria-label still names the board. */}
        <span className="max-[359px]:hidden">View</span>
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </li>
  );
}

export function QuizCompleteScreen({
  correctCount,
  totalQuestions,
  completionBonus,
  totalEarned,
  pb,
  onPlayAgain,
  onHome,
}: CompleteProps) {
  const answerCoins = Math.max(0, totalEarned - completionBonus);
  const displayCoins = answerCoins + completionBonus;
  const pbApplied = pb?.applied ?? 0;
  const shownPb = useCountUp(pbApplied);
  const ratio = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const praise = ratio >= 0.9 ? "Potato genius!" : ratio >= 0.6 ? "Well done!" : ratio >= 0.3 ? "Nice effort!" : "Keep growing!";

  const landed = pbApplied > 0 && shownPb === pbApplied;

  // Celebrate once on arrival (the ref survives React's dev double-invoke), and chime when the points land.
  const cheered = useRef(false);
  useEffect(() => {
    if (cheered.current) return;
    cheered.current = true;
    sounds.play("party");
    haptic([18, 40, 26]);
  }, []);
  useEffect(() => {
    if (landed) sounds.play("coin");
  }, [landed]);

  const capped = pb ? pb.cappedBy !== null && pb.applied < pb.requested : false;
  const zeroDay = pb ? pb.cappedBy === "daily" && pb.applied === 0 : false;

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      <div className="quiz-farm absolute inset-0" aria-hidden />
      <div className="qd-haze absolute inset-0" aria-hidden />
      <WinBurst />

      <div
        className="qh-scroll-fade relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 [-webkit-overflow-scrolling:touch]"
        style={{ paddingTop: "max(2.25rem, calc(var(--header-top) - 0.75rem))" }}
      >
        <header className="relative h-[clamp(150px,44vw,172px)]">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <span className="qd-sun absolute -left-14 -top-16 h-[240px] w-[240px]" />
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className="qd-confetti"
                style={{
                  left: `${c.left}%`,
                  top: `${c.top}%`,
                  width: c.w,
                  height: c.h,
                  backgroundColor: c.color,
                  transform: `rotate(${c.rot}deg)`,
                  animationDelay: `${(i % 5) * 0.45}s`,
                }}
              />
            ))}
            {SPARKLES.map((s, i) => (
              <SparkleIcon
                key={i}
                className="qh-twinkle absolute text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]"
                style={{ right: `${s.right}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${i * 0.6}s` }}
              />
            ))}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/done-trophy.webp`}
            alt=""
            draggable={false}
            width={360}
            height={332}
            className="qd-trophy absolute -left-4 -top-1 w-[clamp(98px,33vw,132px)] rotate-[5deg] select-none object-contain"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/done-mascot.webp`}
            alt=""
            draggable={false}
            width={330}
            height={406}
            className="qd-mascot absolute -right-2 top-2 w-[clamp(66px,21.5vw,86px)] select-none object-contain"
          />
          {/* Nudged right so the title sits centred between the (wider) trophy and the mascot, as in the design. */}
          <div className="relative z-10 flex translate-x-2 flex-col items-center pt-1 text-center">
            <h1 className="qd-title flex flex-col items-center font-display font-bold leading-[0.98]">
              <span className="sr-only">Game Complete!</span>
              <OutlinedText variant="title" className="-rotate-[1.5deg] text-[clamp(36px,11.5vw,46px)] tracking-[-0.01em]">
                Game
              </OutlinedText>
              <OutlinedText variant="gold" className="-mt-0.5 text-[clamp(30px,9.6vw,39px)] tracking-[-0.02em]">
                Complete!
              </OutlinedText>
            </h1>
            <p className="qd-subtitle mt-1 max-w-[10.75rem] text-balance font-display text-[12.5px] font-semibold leading-snug text-[#4628A6]">
              Great job! Keep harvesting knowledge!
            </p>
            <span aria-hidden className="mt-0.5 flex items-center gap-1">
              <span className="h-[2.5px] w-3 rounded-full bg-[linear-gradient(90deg,#FFD828,#FECD21)]" />
              <SproutIcon className="h-[18px] w-[18px]" />
            </span>
          </div>
        </header>

        <section className="qd-card qh-rise relative rounded-[22px] px-2.5 pb-2.5 pt-3" style={{ animationDelay: "0.2s" }}>
          <p className="text-center text-[14px] font-extrabold text-[#301D91]">
            {correctCount} / {totalQuestions} correct · {praise}
          </p>

          <div className={`relative mt-1 flex items-center justify-center ${landed ? "qd-landed" : ""}`}>
            <PointsLandFx />
            <Burst rays={3} side="left" className="absolute left-0.5 top-1/2 h-9 w-9 -translate-y-1/2 text-[#FED22F]" />
            <p aria-hidden className="qd-points-pop flex flex-wrap items-baseline justify-center gap-x-2 px-9 font-display font-bold leading-none">
              <OutlinedText variant="headline" className="text-[clamp(44px,14vw,54px)] tabular-nums">
                {`+${shownPb}`}
              </OutlinedText>
              <OutlinedText variant="headline" className="text-[clamp(24px,7.4vw,29px)]">
                PB Points
              </OutlinedText>
            </p>
            <p className="sr-only">+{pbApplied.toLocaleString("en-IN")} PB Points</p>
            <Burst rays={3} className="absolute right-0.5 top-1/2 h-9 w-9 -translate-y-1/2 text-[#FED22F]" />
          </div>

          {/* Rewards: Points and Coins shown separately (FRD §23) */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <span className="qd-pill-violet inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3.5 font-display text-[15px] font-bold text-[#4B2AAE]">
              <PbStarIcon className="h-[22px] w-[22px]" />+{pbApplied.toLocaleString("en-IN")} PB Points
            </span>
            <span className="qd-pill-gold inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3.5 font-display text-[15px] font-bold text-[#6E3A04]">
              <PbCoinIcon className="h-[22px] w-[22px]" />+{displayCoins.toLocaleString("en-IN")} Coins
            </span>
          </div>

          {pb ? (
            <Panel tone="violet" className="mt-3" icon={<BarChartIcon className="h-[18px] w-[18px] text-[#7B57F2]" />} title="PB Breakdown">
              {pb.duplicate ? (
                <p className="qd-inner-violet rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-[#4A4170]">
                  This run was already credited.
                </p>
              ) : pb.lines.length === 0 ? (
                <p className="qd-inner-violet rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-[#4A4170]">
                  No PB this time. Points reward correct answers, streaks and finishing the quiz.
                </p>
              ) : (
                <Rows
                  tone="violet"
                  rows={pb.lines.map((line) => ({ label: line.label, value: `+${line.points}` }))}
                  total={`+${pb.applied.toLocaleString("en-IN")} PB`}
                />
              )}
              {capped ? (
                <p className="mt-2 rounded-xl bg-[#FFF3C4] px-3 py-2 text-[12px] font-bold text-[#7A4A00]">
                  {zeroDay
                    ? DAILY_CAP_MESSAGE
                    : pb.cappedBy === "daily"
                      ? `Daily PB limit reached: ${pb.applied} of ${pb.requested} PB counted. ${DAILY_CAP_MESSAGE}`
                      : `Daily limit for this game reached: ${pb.applied} of ${pb.requested} PB counted. Coins keep flowing.`}
                </p>
              ) : null}
            </Panel>
          ) : null}

          {pb && pb.applied > 0 ? (
            <Panel
              tone="violet"
              className="mt-2.5"
              icon={<TrophyIcon className="h-[18px] w-[18px] text-[#5F35D8]" />}
              title="Leaderboard Movement"
            >
              <ul role="list" className="space-y-1">
                <BoardRow
                  medal="purple"
                  label={`${PB_GAME_LABELS[pb.gameId]} board`}
                  href={`/pb?game=${pb.gameId}`}
                  rankBefore={pb.gameRankBefore}
                  rankAfter={pb.gameRankAfter}
                  detail={`${pb.gamePointsAfter.toLocaleString("en-IN")} PB in this game`}
                />
                <BoardRow
                  medal="silver"
                  label="Overall season board"
                  href="/pb"
                  rankBefore={pb.rankBefore}
                  rankAfter={pb.rankAfter}
                  detail={`${pb.seasonPointsAfter.toLocaleString("en-IN")} season PB`}
                />
              </ul>
            </Panel>
          ) : null}

          {pb?.unlocked.map((m) => (
            <div key={m.id} className="mt-2.5 flex items-center gap-3 rounded-2xl bg-[#E6F7EC] px-4 py-3 ring-1 ring-[#A9E9B2]">
              <span className="text-[24px] leading-none" aria-hidden>
                {m.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#13693A]">Milestone unlocked</p>
                <p className="truncate text-[14px] font-extrabold text-[#1E1452]">
                  {m.points.toLocaleString("en-IN")} PB · {m.label}
                </p>
              </div>
            </div>
          ))}

          <Panel tone="gold" className="mt-2.5" icon={<PbCoinIcon className="h-[22px] w-[22px]" />} title="PB Coins">
            <Rows
              tone="gold"
              rows={[
                { label: "Answer coins", value: `+${answerCoins}` },
                { label: "Completion bonus", value: `+${completionBonus}` },
              ]}
              total={`+${displayCoins.toLocaleString("en-IN")} Coins`}
            />
          </Panel>
        </section>
      </div>

      <div
        className="relative z-20 shrink-0 px-4 pt-1"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={onPlayAgain}
          className="qd-play relative flex h-[56px] w-full cursor-pointer items-center justify-center gap-3 rounded-full font-display text-[20px] font-bold text-white [text-shadow:0_1px_2px_rgba(47,9,188,0.45)] forced-colors:border-2"
        >
          <span aria-hidden className="qd-play-disc flex h-9 w-9 items-center justify-center rounded-full text-[#5B35F2]">
            <PlayIcon className="ml-0.5 h-[17px] w-[17px]" />
          </span>
          Play Again
        </button>
        <button
          type="button"
          onClick={onHome}
          className="qd-home mx-auto mt-3.5 flex h-[50px] w-[94%] cursor-pointer items-center justify-center gap-2 rounded-full font-display text-[17px] font-bold text-[#6644F7] forced-colors:border-2"
        >
          <HomeIcon className="h-5 w-5 text-[#7754F6]" />
          Back to Home
        </button>
      </div>
    </div>
  );
}
