"use client";

import { useEffect, useRef, useState } from "react";
import { sounds } from "@/components/crush/render/sound";
import type { NinjaRenderer } from "../render/NinjaRenderer";
import { NinjaGame, SKINS, coinsFor, type Boosts, type Challenge, type NinjaEvent, type NinjaMode, type RunStats } from "../engine/ninja";
import { NinjaButton, WoodPanel } from "./ninjaUi";
import { NinjaGameOver } from "./NinjaGameOver";
import type { PbReceipt } from "@/components/providers/PbPointsProvider";

type Props = {
  mode: NinjaMode;
  boosts: Boosts;
  skinId: string;
  best: number;
  challenge: Challenge | null;
  coins: number;
  onFinish: (stats: RunStats, completedChallenge: boolean) => { coins: number; newBest: boolean; pb: PbReceipt | null };
  onRestart: () => void;
  onMenu: () => void;
};

type Hud = { score: number; lives: number; timeLeft: number; freeze: number; multi: number; shield: number };

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function NinjaPlay({ mode, boosts, skinId, best, challenge, coins, onFinish, onRestart, onMenu }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<NinjaGame | null>(null);
  const rendererRef = useRef<NinjaRenderer | null>(null);
  const [hud, setHud] = useState<Hud>({ score: 0, lives: mode === "classic" ? 3 + (boosts.life ? 1 : 0) : 0, timeLeft: mode === "classic" ? Infinity : 60, freeze: 0, multi: 0, shield: 0 });
  const [countdown, setCountdown] = useState<number | null>(3);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<{ stats: RunStats; reason: "lives" | "time"; coins: number; newBest: boolean; challengeDone: boolean; pb: PbReceipt | null } | null>(null);
  const [lifeFlash, setLifeFlash] = useState(0);
  const finishedRef = useRef(false);
  const skin = SKINS.find((s) => s.id === skinId) ?? SKINS[0];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let renderer: NinjaRenderer | null = null;
    const game = new NinjaGame(mode, boosts);
    game.paused = true;
    gameRef.current = game;

    (async () => {
      const mod = await import("../render/NinjaRenderer");
      if (cancelled) return;
      const fontVar = getComputedStyle(document.documentElement).getPropertyValue("--font-fredoka").trim();
      renderer = new mod.NinjaRenderer(host, {
        skinSheetUrl: "/games/ninja-skins.png",
        skinCell: skin.cell,
        trailColor: skin.trail,
        backgroundUrl: "/games/ninja-barn.jpg",
        fontFamily: fontVar ? `${fontVar}, Fredoka, sans-serif` : undefined,
        onFrame: (g) => setHud({ score: g.score, lives: g.lives, timeLeft: g.timeLeft, freeze: g.freezeLeft, multi: g.multiLeft, shield: g.shieldLeft }),
        onEvents: (events: NinjaEvent[]) => {
          for (const ev of events) {
            if (ev.type === "life") setLifeFlash((n) => n + 1);
            if (ev.type === "end" && !finishedRef.current) {
              finishedRef.current = true;
              const stats = game.stats;
              const challengeDone = !!challenge && challenge.mode === mode && challenge.check(stats);
              const reward = onFinish(stats, challengeDone);
              sounds.play(ev.reason === "lives" ? "lose" : "win");
              window.setTimeout(() => setResult({ stats, reason: ev.reason, coins: reward.coins, newBest: reward.newBest, challengeDone, pb: reward.pb }), 900);
            }
          }
        },
      });
      rendererRef.current = renderer;
      await renderer.init();
      if (cancelled) return;
      renderer.setGame(game);
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __ninja?: unknown }).__ninja = { game, renderer };
      }
    })();

    return () => {
      cancelled = true;
      renderer?.destroy();
      rendererRef.current = null;
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3-2-1 countdown, then unpause
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const t = window.setTimeout(() => {
        setCountdown(null);
        if (gameRef.current) gameRef.current.paused = false;
      }, 500);
      return () => window.clearTimeout(t);
    }
    sounds.play("ui");
    const t = window.setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 800);
    return () => window.clearTimeout(t);
  }, [countdown]);

  const pause = () => {
    if (!gameRef.current || gameRef.current.over || countdown !== null) return;
    gameRef.current.paused = true;
    setPaused(true);
    sounds.play("ui");
  };
  const resume = () => {
    setPaused(false);
    setCountdown(3);
  };

  const hearts = mode === "classic" ? Math.max(hud.lives, 0) : 0;
  const lowTime = hud.timeLeft !== Infinity && hud.timeLeft <= 10;

  return (
    <div className="nj-play relative mx-auto flex h-dvh w-full max-w-screen-sm select-none flex-col overflow-hidden bg-[#1a0f08]">
      <div ref={hostRef} className="absolute inset-0 overflow-hidden" />

      {/* HUD */}
      <div className="pointer-events-none relative z-10 flex items-start justify-between px-3" style={{ paddingTop: "max(2.75rem, calc(var(--header-top) - 0.25rem))" }}>
        <button type="button" onClick={pause} aria-label="Pause" className="nj-wood pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white active:scale-95">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1.2" />
            <rect x="14" y="5" width="4" height="14" rx="1.2" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <span key={hud.score} className="nj-score quiz-pop font-display text-[44px] font-extrabold leading-none tabular-nums">
            {hud.score}
          </span>
          <span className="nj-best font-display text-[12px] font-bold uppercase tracking-[0.18em]">Best: {Math.max(best, hud.score)}</span>
          {hud.multi > 0 || hud.freeze > 0 || hud.shield > 0 ? (
            <div className="mt-1 flex gap-1">
              {hud.multi > 0 ? <span className="nj-effect bg-[#3FB05C]">2× {Math.ceil(hud.multi)}s</span> : null}
              {hud.freeze > 0 ? <span className="nj-effect bg-[#2E9BE8]">❄ {Math.ceil(hud.freeze)}s</span> : null}
              {hud.shield > 0 ? <span className="nj-effect bg-[#3B6DE0]">🛡 {Math.ceil(hud.shield)}s</span> : null}
            </div>
          ) : null}
        </div>
        <div className="flex h-12 items-center">
          {mode === "classic" ? (
            <div key={lifeFlash} className={`flex gap-1 ${lifeFlash ? "nj-shake" : ""}`}>
              {Array.from({ length: Math.max(3, hearts) }, (_, i) => (
                <span key={i} className={`nj-heart ${i < hearts ? "" : "nj-heart-off"}`} aria-hidden>
                  ♥
                </span>
              ))}
            </div>
          ) : (
            <span className={`nj-timer font-display text-[24px] font-extrabold tabular-nums ${lowTime ? "nj-timer-low" : ""}`}>{fmtTime(hud.timeLeft)}</span>
          )}
        </div>
      </div>

      {countdown !== null && !paused ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span key={countdown} className="nj-countdown font-display text-[120px] font-extrabold text-white">
            {countdown === 0 ? "GO!" : countdown}
          </span>
        </div>
      ) : null}

      {paused ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/55 px-8 backdrop-blur-[2px]">
          <WoodPanel title="Paused" />
          <div className="mt-5 flex w-full max-w-xs flex-col gap-3">
            <NinjaButton variant="green" onClick={resume} icon="play">
              Resume
            </NinjaButton>
            <NinjaButton onClick={onRestart} icon="restart">
              Restart
            </NinjaButton>
            <NinjaButton onClick={onMenu} icon="home">
              Main Menu
            </NinjaButton>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="absolute inset-0 z-30">
          <NinjaGameOver
            mode={mode}
            reason={result.reason}
            stats={result.stats}
            best={best}
            newBest={result.newBest}
            coinsEarned={result.coins}
            coins={coins}
            pb={result.pb}
            challenge={challenge}
            challengeDone={result.challengeDone}
            onPlayAgain={onRestart}
            onMenu={onMenu}
          />
        </div>
      ) : null}
    </div>
  );
}

export { coinsFor };
