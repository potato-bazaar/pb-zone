"use client";

import { useEffect, useRef, useState } from "react";
import { haptic, sounds } from "@/components/crush/render/sound";
import {
  ART,
  cn,
  OutlinedText,
  TaterCta,
  TaterFooter,
  TaterGhost,
  TaterScreen,
  TaterScroll,
  TM_CONFETTI,
  useCountUp,
} from "@/components/match/TaterUi";
import { SparkleIcon, SproutIcon } from "@/components/quiz/QuizCompleteIcons";
import { ChevronRightIcon, StarShape } from "@/components/quiz/QuizHowToIcons";
import { PointsLandFx, WinBurst } from "@/components/quiz/QuizWinEffects";
import { TATER_SCORING } from "@/data/taterMatch";

type Props = {
  modeTitle: string;
  correct: number;
  total: number;
  pointsEarned: number;
  coinsEarned: number;
  seconds: number;
  streak: number;
  learned: string[];
  onAgain: () => void;
  onHome: () => void;
};

// Static, drifting confetti over the header band (positions in % of the band), Tater green/gold set.
const CONFETTI = [
  { left: 4, top: 4, w: 7, h: 13, color: "#3FBF5C", rot: -24 },
  { left: 13, top: 28, w: 6, h: 10, color: "#FFD23F", rot: 30 },
  { left: 24, top: 2, w: 7, h: 12, color: "#8FE05A", rot: -12 },
  { left: 31, top: 48, w: 6, h: 10, color: "#FF9A1F", rot: 40 },
  { left: 40, top: 0, w: 7, h: 13, color: "#3FBF5C", rot: -35 },
  { left: 50, top: 6, w: 6, h: 10, color: "#FFD23F", rot: 18 },
  { left: 60, top: 2, w: 7, h: 12, color: "#3FBF5C", rot: 55 },
  { left: 68, top: 30, w: 6, h: 10, color: "#FF9A1F", rot: -40 },
  { left: 76, top: 0, w: 7, h: 12, color: "#8FE05A", rot: 25 },
  { left: 86, top: 14, w: 6, h: 10, color: "#FFD23F", rot: -20 },
  { left: 94, top: 36, w: 7, h: 13, color: "#FF9A1F", rot: 35 },
  { left: 8, top: 62, w: 6, h: 10, color: "#FFD23F", rot: 15 },
  { left: 56, top: 58, w: 5, h: 9, color: "#3FBF5C", rot: -30 },
  { left: 90, top: 66, w: 6, h: 10, color: "#8FE05A", rot: 28 },
];

// White twinkles around the trophy, sign and mascot (% of the header band).
const SPARKLES = [
  { left: 2, top: 10, size: 10 },
  { left: 24, top: 40, size: 8 },
  { left: 70, top: 6, size: 9 },
  { left: 94, top: 30, size: 8 },
  { left: 63, top: 62, size: 7 },
];

// Confetti bits and leaves around the points headline (% of the headline box).
const HEADLINE_BITS = [
  { left: 4, top: 18, w: 6, h: 12, color: "#8FE05A", rot: 28 },
  { left: 12, top: 72, w: 5, h: 10, color: "#FFD23F", rot: -30 },
  { left: 86, top: 10, w: 6, h: 12, color: "#FFD23F", rot: -22 },
  { left: 93, top: 60, w: 5, h: 10, color: "#3FBF5C", rot: 35 },
  { left: 72, top: 84, w: 5, h: 9, color: "#FF9A1F", rot: 12 },
];

/** Rows shown in the "What you learned" panel; the rest are counted in the "+n more" line. */
const LEARNED_SHOWN = 3;

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Round Complete — storybook farm celebration: barn-and-field backdrop, wooden "Round Complete!"
 * sign between the gold trophy and the cheering mascot, a parchment card with the points headline,
 * reward pills, three stat tiles and the "What you learned" list, then Play Again on the wooden
 * board. Scoring, praise thresholds and the learned-tip rule are unchanged; the arrival animation
 * (sign drop, pops, confetti, count-up) is presentation only.
 */
export function TaterMatchResult({
  modeTitle,
  correct,
  total,
  pointsEarned,
  coinsEarned,
  seconds,
  streak,
  learned,
  onAgain,
  onHome,
}: Props) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const title =
    accuracy >= 90 ? "Potato Expert" : accuracy >= 70 ? "Sharp Matcher" : accuracy >= 50 ? "Growing Farmer" : "Keep Practising";
  const perfect = correct === total;

  const shownPb = useCountUp(pointsEarned);
  const landed = pointsEarned > 0 && shownPb === pointsEarned;
  const [openTip, setOpenTip] = useState<number | null>(null);

  // Move focus to the result heading so screen readers land on the new screen.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  // A quick double tap on "See Results" would land its second tap on these footer buttons, which sit
  // where that CTA was. Footer taps are ignored for a moment after the screen appears.
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = performance.now();
  }, []);
  const settled = () => performance.now() - shownAt.current > 450;

  // Celebrate once on arrival (the ref survives React's dev double-invoke), and chime when the points land.
  const cheered = useRef(false);
  useEffect(() => {
    if (cheered.current) return;
    cheered.current = true;
    if (perfect) {
      sounds.play("special");
      window.setTimeout(() => sounds.play("party"), 150);
    } else {
      sounds.play("party");
    }
    haptic([18, 40, 26]);
  }, [perfect]);
  useEffect(() => {
    if (landed) sounds.play("coin");
  }, [landed]);

  const pointsText = pointsEarned.toLocaleString("en-IN");
  const coinsText = coinsEarned.toLocaleString("en-IN");
  const learnedShown = learned.slice(0, LEARNED_SHOWN);
  const learnedMore = learned.length - learnedShown.length;

  return (
    <TaterScreen className="tm-result">
      {/* Painted farm backdrop: sky and barn behind the sign, potato rows and soil behind the buttons. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ART}/result-backdrop.webp`}
        alt=""
        draggable={false}
        width={1080}
        height={1910}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-top"
      />
      <WinBurst colors={TM_CONFETTI} />

      <TaterScroll fade style={{ paddingTop: "max(1.75rem, calc(var(--header-top) - 0.75rem))" }}>
        {/* Header band: trophy · wooden sign · mascot, under drifting confetti and twinkles. */}
        <header className="tm-rhead relative h-[clamp(160px,44vw,184px)] md:h-[196px]">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
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
                style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${i * 0.6}s` }}
              />
            ))}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/result-trophy.webp`}
            alt=""
            draggable={false}
            width={396}
            height={364}
            className="tm-trophy absolute -left-1 top-0 z-10 w-[29%] max-w-[150px] select-none object-contain"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/${accuracy >= 50 ? "mascot-cheer" : "mascot-look"}.webp`}
            alt=""
            draggable={false}
            width={330}
            height={406}
            className="tm-mascot absolute -right-1 top-5 z-10 w-[24%] max-w-[124px] select-none object-contain"
          />
          <div className="tm-sign absolute left-1/2 top-0 z-[15] w-[58%] max-w-[300px] -translate-x-1/2">
            <h1 ref={titleRef} tabIndex={-1} className="relative block outline-none">
              <span className="sr-only">Round complete</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ART}/result-sign.webp`}
                alt=""
                draggable={false}
                width={600}
                height={420}
                className="block h-auto w-full select-none"
              />
              <span className="tm-sign-sub absolute inset-x-[6%] bottom-[8.5%] block truncate text-center font-display text-[clamp(9.5px,2.9vw,12px)] font-bold leading-none text-[#4A2A08]">
                {title} · {modeTitle}
              </span>
            </h1>
          </div>
        </header>

        {/* Parchment card. */}
        <section className="tm-rcard qh-rise relative mt-1 rounded-[26px] px-3 pb-3 pt-2.5" style={{ animationDelay: "200ms" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/foliage.webp`}
            alt=""
            draggable={false}
            width={177}
            height={220}
            className="tm-sway pointer-events-none absolute -left-4 -top-3 h-auto w-[44px] -rotate-[28deg] select-none"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/foliage.webp`}
            alt=""
            draggable={false}
            width={177}
            height={220}
            className="tm-sway pointer-events-none absolute -right-4 -top-2 h-auto w-[40px] rotate-[24deg] select-none"
            style={{ animationDelay: "0.8s" }}
          />

          <p className="tm-rchip mx-auto flex h-7 w-fit items-center rounded-full px-4 font-display text-[14px] font-bold text-[#E8F0CA]">
            {correct} / {total} correct matches
          </p>

          {/* Points headline: rays behind, gold star, the counting number, "PB Points" on a gold ribbon. */}
          <div className={cn("tm-rpoints relative mx-auto mt-1 flex h-[118px] w-full max-w-[300px] flex-col items-center justify-center", landed && "qd-landed")}>
            <span aria-hidden className="qc-rays absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2" />
            <span aria-hidden className="pointer-events-none absolute inset-0">
              {HEADLINE_BITS.map((c, i) => (
                <span
                  key={i}
                  className="qd-confetti"
                  style={{ left: `${c.left}%`, top: `${c.top}%`, width: c.w, height: c.h, backgroundColor: c.color, transform: `rotate(${c.rot}deg)`, animationDelay: `${(i % 4) * 0.5}s` }}
                />
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ART}/leaf-sprig.webp`} alt="" draggable={false} width={150} height={137} className="tm-sway absolute left-[2%] top-[42%] h-auto w-[22px] -rotate-[20deg] select-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ART}/leaf-sprig.webp`} alt="" draggable={false} width={150} height={137} className="tm-sway absolute right-[3%] top-[26%] h-auto w-[20px] rotate-[30deg] select-none" style={{ animationDelay: "0.6s" }} />
            </span>
            <PointsLandFx />
            <div className="relative flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ART}/star-gold.webp`}
                alt=""
                draggable={false}
                width={168}
                height={168}
                className="tm-star-gold h-[56px] w-[56px] select-none object-contain"
              />
              <p aria-hidden className="qd-points-pop font-display font-bold leading-none">
                <OutlinedText variant="headline" className="text-[clamp(50px,15vw,62px)] tracking-[-0.01em]">
                  {`+${shownPb}`}
                </OutlinedText>
              </p>
            </div>
            <p aria-hidden className="tm-ribbon-gold relative -mt-1 flex h-[38px] items-center justify-center px-5 font-display text-[21px] font-bold leading-none text-[#0F4A1A]">
              PB Points
            </p>
          </div>
          <span className="sr-only">+{pointsText} PB Points</span>

          {/* Rewards: Points and Coins shown separately. */}
          <div className="mt-1.5 grid grid-cols-2 gap-2.5">
            <span
              aria-label={`+${pointsText} PB Points`}
              className="tm-rpill tm-rpill-pb qh-rise flex h-12 items-center justify-center gap-1.5 rounded-full px-2 font-display text-[clamp(14px,4.3vw,17px)] font-bold text-[#5B2DBD]"
              style={{ animationDelay: "320ms" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ART}/star-3d.webp`} alt="" draggable={false} width={96} height={96} className="h-8 w-8 select-none object-contain" />
              <span className="truncate">+{pointsText} PB Points</span>
            </span>
            <span
              aria-label={`+${coinsText} Coins`}
              className="tm-rpill tm-rpill-coin qh-rise flex h-12 items-center justify-center gap-1.5 rounded-full px-2 font-display text-[clamp(14px,4.3vw,17px)] font-bold text-[#5A2E08]"
              style={{ animationDelay: "400ms" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ART}/coin-3d.webp`} alt="" draggable={false} width={96} height={96} className="h-8 w-8 select-none object-contain" />
              <span className="truncate">+{coinsText} Coins</span>
            </span>
          </div>

          <dl className="mt-2.5 grid grid-cols-3 gap-2">
            <Stat icon="icon-target" label="Accuracy" value={`${accuracy}%`} delay={480} />
            <Stat icon="icon-stopwatch" label="Time" value={`${pad2(mins)}:${pad2(secs)}`} delay={560} />
            <Stat icon="daily-flame" label="Streak" value={String(streak)} delay={640} />
          </dl>

          {perfect ? (
            <p className="tm-ribbon qh-rise mt-2 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-[12px] font-extrabold text-[#7A4A00]" style={{ animationDelay: "700ms" }}>
              <StarShape className="h-3.5 w-3.5" />
              PERFECT ROUND · +{TATER_SCORING.pointsPerfectRound} PB · +{TATER_SCORING.coinsPerfectRound} coins
              <StarShape className="h-3.5 w-3.5" />
            </p>
          ) : null}

          {learned.length > 0 ? (
            <section aria-labelledby="tm-learned-title" className="tm-learned qh-rise relative mt-2.5 overflow-hidden rounded-[20px]" style={{ animationDelay: "740ms" }}>
              <h2 id="tm-learned-title" className="tm-learned-head relative flex h-9 items-center justify-center gap-1.5 font-display text-[15px] font-bold uppercase tracking-[0.04em] text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ART}/leaf-sprig.webp`} alt="" draggable={false} width={150} height={137} className="pointer-events-none absolute -left-1 -top-2 h-auto w-[30px] -rotate-[25deg] select-none" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ART}/daisy.webp`} alt="" draggable={false} width={120} height={120} className="pointer-events-none absolute -right-0.5 -top-1 h-[26px] w-[26px] select-none object-contain" />
                <SproutIcon className="h-5 w-5" />
                What you learned
              </h2>
              <ul role="list" className="px-2 pb-1 pt-1">
                {learnedShown.map((tip, i) => {
                  const short = tip.split("·")[0]?.trim() || tip.slice(0, 60);
                  const open = openTip === i;
                  // Long tips are clamped to one line; a chevron lets the player open the full text.
                  const expandable = tip.trim() !== short || tip.length > 34;
                  return (
                    <li key={tip} className="tm-learned-row flex items-center gap-2 py-1.5">
                      <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6F5DC]">
                        <SproutIcon className="h-4 w-4" />
                      </span>
                      {expandable ? (
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setOpenTip(open ? null : i)}
                          className="flex min-w-0 flex-1 items-center gap-1 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#145C32] rounded-md"
                        >
                          <span className={cn("min-w-0 flex-1 text-[13px] font-semibold leading-[1.3] text-[#2E4A33]", !open && "truncate")}>
                            {open ? tip : short}
                          </span>
                          <ChevronRightIcon className={cn("h-4 w-4 shrink-0 text-[#9AB0A0] transition-transform duration-300 motion-reduce:transition-none", open && "rotate-90")} />
                        </button>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-[1.3] text-[#2E4A33]">{short}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {learnedMore > 0 ? (
                <p className="pb-2 text-center text-[12px] font-bold text-[#6E8B74]">+{learnedMore} more in My Progress</p>
              ) : null}
            </section>
          ) : null}
        </section>
      </TaterScroll>

      {/* Footer: Play Again on the wooden board, then Tater Home. */}
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
              label="Play Again"
              icon="play"
              bursts
              className="w-full"
              onClick={() => {
                if (!settled()) return;
                sounds.play("ui");
                haptic(10);
                onAgain();
              }}
            />
          </div>
        </div>
        <div className="mx-auto mt-2 w-[92%]">
          <TaterGhost
            icon="home"
            label="Tater Home"
            className="tm-ghost-leaf"
            onClick={() => {
              if (!settled()) return;
              sounds.play("ui");
              haptic(10);
              onHome();
            }}
          />
        </div>
      </TaterFooter>
    </TaterScreen>
  );
}

/** One stat tile: 3D icon on the left, uppercase label over the Fredoka value. */
function Stat({ icon, label, value, delay }: { icon: string; label: string; value: string; delay: number }) {
  return (
    <div className="tm-rstat qh-rise flex h-[70px] items-center gap-1 rounded-[18px] px-1" style={{ animationDelay: `${delay}ms` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ART}/${icon}.webp`} alt="" draggable={false} width={192} height={192} className="h-8 w-8 shrink-0 select-none object-contain" />
      <div className="min-w-0">
        <dt className="truncate text-[9.5px] font-extrabold uppercase tracking-[0.03em] text-[#2F4A30]">{label}</dt>
        <dd className="font-display text-[20px] font-bold leading-none tabular-nums text-[#0D2B15]">{value}</dd>
      </div>
    </div>
  );
}
