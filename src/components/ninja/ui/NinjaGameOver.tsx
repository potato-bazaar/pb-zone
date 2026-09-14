"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Challenge, NinjaMode, RunStats } from "../engine/ninja";
import { CoinPill, NinjaButton } from "./ninjaUi";
import { PbStarIcon, RankMovement } from "@/components/pb/PbUi";
import type { PbReceipt } from "@/components/providers/PbPointsProvider";
import { DAILY_CAP_MESSAGE } from "@/data/pbEconomy";

type Props = {
  mode: NinjaMode;
  reason: "lives" | "time";
  stats: RunStats;
  best: number;
  newBest: boolean;
  coinsEarned: number;
  coins: number;
  pb: PbReceipt | null;
  challenge: Challenge | null;
  challengeDone: boolean;
  onPlayAgain: () => void;
  onMenu: () => void;
};

function useCountUp(target: number, duration = 900, delay = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const timer = window.setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return value;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function NinjaGameOver({ reason, stats, best, newBest, coinsEarned, coins, pb, challenge, challengeDone, onPlayAgain, onMenu }: Props) {
  const shown = useCountUp(stats.score);
  const lost = reason === "lives";
  const [showPb, setShowPb] = useState(false);

  const rows = [
    { icon: "🥔", label: "Potatoes Sliced", value: String(stats.sliced) },
    { icon: "🔥", label: "Max Combo", value: String(stats.maxCombo) },
    { icon: "⏱️", label: "Time Played", value: fmtTime(stats.timePlayed) },
  ];

  const pbApplied = pb?.applied ?? 0;
  const pbCapped = !!pb && pb.applied < pb.requested;
  const pbMoved = !!pb && pb.applied > 0 && pb.rankAfter !== pb.rankBefore;
  const gameMoved = !!pb && pb.applied > 0 && pb.gameRankAfter !== pb.gameRankBefore;

  return (
    <div className="nj-go relative mx-auto flex h-dvh w-full max-w-screen-sm select-none flex-col overflow-hidden">
      <div className="nj-go-bg absolute inset-0" aria-hidden />
      <div className="nj-go-dim absolute inset-0" aria-hidden />

      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className="nj-go-leaf pointer-events-none absolute"
          style={{ left: `${8 + i * 15}%`, top: `${20 + (i % 3) * 22}%`, animationDelay: `${-i * 1.3}s`, animationDuration: `${6 + (i % 3) * 2}s` }}
          aria-hidden
        />
      ))}

      {/* top bar */}
      <div className="relative z-10 flex items-start justify-between px-4" style={{ paddingTop: "max(2.25rem, calc(var(--header-top) - 0.75rem))" }}>
        <div className="nj-sign nj-go-minilogo px-2.5 py-1 text-center">
          <span className="nj-logo-potato block font-display text-[13px] font-extrabold leading-none">POTATO</span>
          <span className="nj-logo-ninja block font-display text-[11px] font-extrabold leading-none">NINJA</span>
        </div>
        <div className="relative">
          <CoinPill coins={coins} />
          {coinsEarned > 0 ? (
            <span className="quiz-coin-pop absolute -bottom-5 right-1 rounded-full bg-[#FFC107] px-2 py-0.5 font-display text-[11px] font-extrabold text-[#4a2d00] shadow">
              +{coinsEarned} Coins
            </span>
          ) : null}
        </div>
      </div>

      {/* stage: title + subtitle + hero, proportional to the viewport */}
      <div className="relative z-10 flex flex-col items-center px-5" style={{ height: "40dvh" }}>
        <div className="nj-go-title relative mt-1">
          <span className="nj-leaf nj-leaf-l" aria-hidden />
          <span className="nj-leaf nj-leaf-r" aria-hidden />
          <span className="nj-leaf nj-leaf-b" aria-hidden />
          <div className="nj-sign relative px-7 pb-2 pt-3 text-center" style={{ paddingLeft: "2.2rem", paddingRight: "2.2rem" }}>
            <span className="nj-sign-nail left-2 top-2" />
            <span className="nj-sign-nail right-2 top-2" />
            <span className="nj-go-word-a block font-display font-extrabold leading-[0.88]" style={{ fontSize: "clamp(32px, 6.8dvh, 62px)" }}>
              {lost ? "Game" : "Nice"}
            </span>
            <span className="nj-go-word-b block font-display font-extrabold leading-[0.88]" style={{ fontSize: "clamp(32px, 6.8dvh, 62px)" }}>
              {lost ? "Over" : "Slicing!"}
            </span>
          </div>
        </div>
        <p className="nj-go-sub mt-2 -rotate-2 text-center font-script leading-tight text-white" style={{ fontSize: "clamp(15px, 2.6dvh, 22px)" }}>
          {lost ? "Better Potatoes\nNext Time!" : "Sharp work,\nfarmer!"}
        </p>
        <div className="relative mt-auto w-full" style={{ height: "clamp(100px, 20dvh, 220px)" }}>
          <span className="nj-go-dust absolute bottom-2 left-1/2 h-8 w-[70%] -translate-x-1/2 rounded-full" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lost ? "/games/ninja-ko.png" : "/games/ninja-hero.png"}
            alt=""
            className={`absolute bottom-0 left-1/2 max-h-full -translate-x-1/2 object-contain object-bottom ${lost ? "nj-go-ko w-[92%]" : "nj-go-win w-auto"}`}
            draggable={false}
          />
        </div>
      </div>

      {/* score panel */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-6 pt-2" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        <section className="nj-go-panel nj-go-rise w-full max-w-[22rem] rounded-[1.2rem] px-3 pb-2.5 pt-2 text-center" style={{ animationDelay: "0.5s" }}>
          <p className="nj-go-label font-display font-bold" style={{ fontSize: "clamp(12px, 1.9dvh, 16px)" }}>Score</p>
          <p className="nj-go-score font-display font-extrabold leading-none tabular-nums" style={{ fontSize: "clamp(34px, 5.6dvh, 56px)" }}>{shown}</p>
          <p className="nj-go-label mt-0.5 font-display font-bold" style={{ fontSize: "clamp(11px, 1.7dvh, 14px)" }}>Best Score</p>
          <p className="font-display font-extrabold leading-none text-white" style={{ fontSize: "clamp(18px, 3dvh, 26px)" }}>
            {Math.max(best, stats.score)}
            {newBest ? <span className="ml-1.5 align-middle rounded-full bg-[#FFC107] px-1.5 py-0.5 text-[9px] font-extrabold text-[#4a2d00]">NEW!</span> : null}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {rows.map((row, i) => (
              <li key={row.label} className="nj-go-row nj-go-rise flex items-center gap-2.5 rounded-xl px-2.5" style={{ animationDelay: `${0.8 + i * 0.12}s`, height: "clamp(30px, 4.4dvh, 42px)" }}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f3e3c6] text-[15px] leading-none shadow-[0_2px_0_rgba(0,0,0,0.35)]">{row.icon}</span>
                <span className="flex-1 text-left font-display font-bold text-[#F3E3C6]" style={{ fontSize: "clamp(12px, 1.9dvh, 15px)" }}>{row.label}</span>
                <span className="font-display font-extrabold tabular-nums text-white" style={{ fontSize: "clamp(16px, 2.6dvh, 21px)" }}>{row.value}</span>
              </li>
            ))}
          </ul>
          {challenge ? (
            <p className={`mt-2 rounded-lg px-2 py-1 text-[11px] font-bold ${challengeDone ? "bg-[#2A9B5C]/45 text-[#B9F27A]" : "bg-black/30 text-[#E8CFA6]"}`}>
              {challengeDone ? `Challenge complete! +${challenge.reward} Coins` : `Challenge: ${challenge.body}`}
            </p>
          ) : null}

          {/* PB Points — separate from Coins (FRD §23) */}
          {pb ? (
            <div className="mt-2 rounded-xl bg-[#EDE7FF] px-2.5 py-2 text-left text-[#241A5E]">
              <button type="button" onClick={() => setShowPb((v) => !v)} className="flex w-full items-center gap-2">
                <PbStarIcon className="h-5 w-5" />
                <span className="flex-1 font-display text-[14px] font-extrabold">+{pbApplied} PB Points</span>
                {gameMoved ? <span className="rounded-full bg-[#E6F7EC] px-2 py-0.5 text-[10px] font-extrabold text-[#1E8A3E]">Ninja #{pb.gameRankBefore} → #{pb.gameRankAfter}</span> : <span className="text-[11px] font-bold text-[#6A5AE0]">Ninja rank #{pb.gameRankAfter}</span>}
                <span className="text-[10px] font-bold text-[#8B84A8]">{showPb ? "▲" : "▼"}</span>
              </button>
              {showPb ? (
                <div className="mt-1.5 border-t border-[#D4C8FF] pt-1.5">
                  {pb.lines.length === 0 ? (
                    <p className="text-[11px] font-semibold text-[#8B84A8]">No PB this run. Slice more, avoid bombs, beat your best.</p>
                  ) : (
                    <ul className="text-[11.5px]">
                      {pb.lines.map((l) => (
                        <li key={l.label} className="flex justify-between py-0.5">
                          <span className="font-semibold text-[#3D2E7A]">{l.label}</span>
                          <span className="font-extrabold tabular-nums">+{l.points}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pbCapped ? <p className="mt-1 rounded-lg bg-[#FFF3C4] px-2 py-1 text-[10.5px] font-bold text-[#8A5A00]">{pb.cappedBy === "daily" && pb.applied === 0 ? DAILY_CAP_MESSAGE : `Daily limit: ${pb.applied} of ${pb.requested} PB counted.`}</p> : null}
                  <div className="mt-1.5 rounded-lg bg-white/60 px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#6A5AE0]">Potato Ninja board</p>
                      <Link href="/pb?game=potato-ninja" className="text-[10px] font-extrabold text-[#6A5AE0] underline">View</Link>
                    </div>
                    {gameMoved ? <RankMovement from={pb.gameRankBefore} to={pb.gameRankAfter} size="sm" /> : <p className="text-[11px] font-semibold text-[#3D2E7A]">Rank #{pb.gameRankAfter} · {pb.gamePointsAfter} PB in Ninja</p>}
                  </div>
                  <div className="mt-1.5 rounded-lg bg-white/60 px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#6A5AE0]">Overall season board</p>
                      <Link href="/pb" className="text-[10px] font-extrabold text-[#6A5AE0] underline">View</Link>
                    </div>
                    {pbMoved ? <RankMovement from={pb.rankBefore} to={pb.rankAfter} size="sm" /> : <p className="text-[11px] font-semibold text-[#3D2E7A]">Rank #{pb.rankAfter} · {pb.seasonPointsAfter.toLocaleString("en-IN")} season PB</p>}
                  </div>
                  {pb.unlocked.map((m) => (
                    <p key={m.id} className="mt-1 rounded-lg bg-[#E6F7EC] px-2 py-1 text-[10.5px] font-bold text-[#1E8A3E]">
                      {m.emoji} Milestone unlocked: {m.label}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className="nj-go-rise mt-auto flex w-full max-w-[22rem] flex-col gap-2 pt-1.5" style={{ animationDelay: "1.1s" }}>
          <NinjaButton variant="gold" onClick={onPlayAgain} icon="restart" className="nj-go-btn">
            Play Again
          </NinjaButton>
          <NinjaButton onClick={onMenu} icon="home" className="nj-go-btn">
            Main Menu
          </NinjaButton>
        </div>
      </div>
    </div>
  );
}
