"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Board } from "../engine/board";
import { BOOSTER_INFO } from "../engine/levels";
import type { BoosterType, LevelDef, ObjectiveProgress, Pos, Step } from "../engine/types";
import type { CrushRenderer } from "../render/CrushRenderer";
import { sounds } from "../render/sound";
import { CoinIcon, CrushButton, HeartIcon, Star, TileIcon, formatNumber, objectiveIconId } from "./crushUi";
import { CrushEnvironment } from "./CrushEnvironment";
import { nextTheme, themeForLevel, type CrushTheme } from "./themes";
import { PbBreakdownCard, RewardPills } from "@/components/pb/PbUi";
import type { PbReceipt } from "@/components/providers/PbPointsProvider";
import { EMPTY_TATER_STATS, type TaterMatchStats } from "@/lib/pb/scoring";

export interface WinSummary {
  score: number;
  stars: number;
  movesLeft: number;
  /** Match / combo facts for Tater Match PB scoring (FRD §7). */
  stats: TaterMatchStats;
}

export interface WinReward {
  coins: number;
  firstClear: boolean;
  hasNext: boolean;
  pb: PbReceipt | null;
}

/** Bucket one clear step's matched tiles into match-3 / 4 / 5+ groups by colour. */
function tallyMatches(step: Extract<Step, { type: "clear" }>, into: TaterMatchStats) {
  const byKind = new Map<number, number>();
  for (const r of step.removed) {
    if (r.cause !== "match") continue;
    byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
  }
  for (let k of byKind.values()) {
    while (k >= 3) {
      if (k >= 8) {
        into.match5 += 1;
        k -= 5;
      } else if (k >= 5) {
        into.match5 += 1;
        k = 0;
      } else if (k === 4) {
        into.match4 += 1;
        k = 0;
      } else {
        into.match3 += 1;
        k = 0;
      }
    }
  }
  if (step.cascade >= 1) into.combos += 1;
  into.specials += step.created.length;
}

type Props = {
  level: LevelDef;
  seed: number;
  boosters: Record<BoosterType, number>;
  soundOn: boolean;
  lives: number;
  coins: number;
  onUseBooster: (type: BoosterType) => void;
  onBuyBooster: (type: BoosterType) => boolean;
  onWin: (summary: WinSummary) => WinReward;
  onLose: (score: number) => void;
  /** Leave from a result screen (no life cost). */
  onQuit: () => void;
  /** Leave from the pause menu (costs a life). */
  onQuitMidLevel: () => void;
  /** Retry from the lose screen (life already deducted). */
  onRestart: () => void;
  /** Restart from the pause menu (costs a life). */
  onRestartMidLevel: () => void;
  onNext: () => void;
  onToggleSound: () => void;
};

type Phase = "loading" | "intro" | "play" | "party" | "won" | "lost";

const COMBO_WORDS = ["Tasty!", "Delicious!", "Divine!", "Spud-tacular!", "Legendary!"];
const HINT_DELAY = 5000;

export function CrushPlayScreen({
  level,
  seed,
  boosters,
  soundOn,
  lives,
  coins,
  onUseBooster,
  onBuyBooster,
  onWin,
  onLose,
  onQuit,
  onQuitMidLevel,
  onRestart,
  onRestartMidLevel,
  onNext,
  onToggleSound,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [board] = useState(() => new Board(level, seed));
  const rendererRef = useRef<CrushRenderer | null>(null);
  const busyRef = useRef(false);
  const phaseRef = useRef<Phase>("loading");
  const movesRef = useRef(level.moves);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerId = useRef(0);

  const [phase, setPhaseState] = useState<Phase>("loading");
  const [moves, setMoves] = useState(level.moves);
  const [score, setScore] = useState(0);
  const [objectives, setObjectives] = useState<ObjectiveProgress[]>(() => board.progress());
  const [paused, setPaused] = useState(false);
  const [targeting, setTargeting] = useState<BoosterType | null>(null);
  const [banner, setBanner] = useState<{ id: number; text: string; big?: boolean } | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [reward, setReward] = useState<WinReward | null>(null);
  const [finalStars, setFinalStars] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [theme, setTheme] = useState<CrushTheme>(() => themeForLevel(level.order));
  const themeRef = useRef(theme);
  const streakRef = useRef(0);
  const taterStatsRef = useRef<TaterMatchStats>({ ...EMPTY_TATER_STATS });
  const [boardRect, setBoardRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const syncHud = useCallback(() => {
    if (!board) return;
    setScore(board.score);
    setObjectives(board.progress());
    setMoves(movesRef.current);
  }, [board]);

  const showBanner = useCallback((text: string, big = false) => {
    bannerId.current += 1;
    setBanner({ id: bannerId.current, text, big });
  }, []);

  const showToast = useCallback((text: string) => {
    bannerId.current += 1;
    setToast({ id: bannerId.current, text });
  }, []);

  /** Rotate to the next environment on a big moment. */
  const switchTheme = useCallback(
    (reason: string) => {
      const next = nextTheme(themeRef.current);
      themeRef.current = next;
      setTheme(next);
      rendererRef.current?.setTheme(next.plate, next.cellAlpha);
      sounds.play("create");
      showToast(`✦ ${reason} — ${next.name}`);
    },
    [showToast],
  );

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), banner.big ? 1600 : 900);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    sounds.enabled = soundOn;
  }, [soundOn]);

  /* ------------------------------ hints ------------------------------ */

  const clearHintTimer = useCallback(() => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = null;
  }, []);

  const scheduleHint = useCallback(() => {
    clearHintTimer();
    hintTimer.current = setTimeout(() => {
        const renderer = rendererRef.current;
      if (!board || !renderer || busyRef.current || phaseRef.current !== "play") return;
      const mv = board.findMove();
      if (mv) renderer.showHint(mv[0], mv[1]);
    }, HINT_DELAY);
  }, [board, clearHintTimer]);

  /* --------------------------- end of level -------------------------- */

  const finishWin = useCallback(async () => {
    const renderer = rendererRef.current;
    if (!board || !renderer) return;
    setPhase("party");
    renderer.inputEnabled = false;
    clearHintTimer();

    if (movesRef.current > 0) {
      showBanner("Potato Party!", true);
      await new Promise((r) => setTimeout(r, 700));
      // Up to 8 leftover moves become striped tiles and fire (one wave).
      const steps = board.endBonus(Math.min(movesRef.current, 8));
      movesRef.current = 0;
      syncHud();
      if (steps.length) await renderer.playSteps(steps, { onClear: syncHud });
      syncHud();
    }

    const stars = Math.max(1, board.starsFor(board.score));
    setFinalStars(stars);
    sounds.play("win");
    renderer.celebrate();
    const r = onWin({ score: board.score, stars, movesLeft: 0, stats: { ...taterStatsRef.current } });
    setReward(r);
    setPhase("won");
    setTimeout(() => setShowResult(true), 700);
  }, [board, clearHintTimer, onWin, setPhase, showBanner, syncHud]);

  const finishLose = useCallback(() => {
    const renderer = rendererRef.current;
    if (!board || !renderer) return;
    renderer.inputEnabled = false;
    clearHintTimer();
    sounds.play("lose");
    setPhase("lost");
    onLose(board.score);
    setTimeout(() => setShowResult(true), 500);
  }, [board, clearHintTimer, onLose, setPhase]);

  /** Runs after any board change: win / lose / deadlock checks. */
  const afterResolve = useCallback(async () => {
    const renderer = rendererRef.current;
    if (!board || !renderer) return;
    if (board.isWon()) {
      await finishWin();
      return;
    }
    if (movesRef.current <= 0) {
      finishLose();
      return;
    }
    if (!board.hasMove()) {
      showToast("No moves left — shuffling!");
      const steps = board.shuffleBoard();
      await renderer.playSteps(steps, { onClear: syncHud });
      syncHud();
      if (board.isWon()) {
        await finishWin();
        return;
      }
    }
    busyRef.current = false;
    renderer.inputEnabled = true;
    scheduleHint();
  }, [board, finishLose, finishWin, scheduleHint, showToast, syncHud]);

  const playSteps = useCallback(
    async (steps: Step[]) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      await renderer.playSteps(steps, {
        onClear: (step) => {
          syncHud();
          tallyMatches(step, taterStatsRef.current);
          const rainbow = step.fired.some((f) => f.shape === "color" || f.shape === "board");
          const mega = step.fired.some((f) => f.shape === "area5" || f.shape === "lines3") || step.fired.length >= 3;
          if (step.cascade >= 1) {
            showBanner(COMBO_WORDS[Math.min(step.cascade - 1, COMBO_WORDS.length - 1)]);
          } else if (rainbow) {
            showBanner("Rainbow Spud!");
          } else if (step.fired.length >= 2) {
            showBanner("Mega Combo!");
          }
          if (rainbow) switchTheme("Rainbow Spud");
          else if (mega) switchTheme("Mega Combo");
          else if (step.cascade >= 3) switchTheme(`${step.cascade + 1}× cascade`);
          if (step.created.length || step.fired.length) {
            streakRef.current += 1;
            if (streakRef.current >= 3) {
              streakRef.current = 0;
              switchTheme("Hot streak");
            }
          }
        },
      });
    },
    [showBanner, switchTheme, syncHud],
  );

  /* ------------------------------ moves ------------------------------ */

  const handleSwap = useCallback(
    async (a: Pos, b: Pos) => {
        const renderer = rendererRef.current;
      if (!board || !renderer || busyRef.current || phaseRef.current !== "play") return;
      if (!board.canSwap(a, b)) return;
      busyRef.current = true;
      renderer.inputEnabled = false;
      clearHintTimer();

      const { valid, steps } = board.applyMove(a, b);
      if (!valid) {
        await renderer.playSteps(steps);
        busyRef.current = false;
        renderer.inputEnabled = true;
        scheduleHint();
        return;
      }
      movesRef.current -= 1;
      syncHud();
      const hadSpecial = steps.some((s) => s.type === "clear" && (s.created.length > 0 || s.fired.length > 0));
      if (!hadSpecial) streakRef.current = 0;
      await playSteps(steps);
      syncHud();
      await afterResolve();
    },
    [afterResolve, board, clearHintTimer, playSteps, scheduleHint, syncHud],
  );

  const applyBoosterAt = useCallback(
    async (type: BoosterType, pos: Pos | null) => {
        const renderer = rendererRef.current;
      if (!board || !renderer || busyRef.current || phaseRef.current !== "play") return;
      busyRef.current = true;
      renderer.inputEnabled = false;
      renderer.targeting = false;
      setTargeting(null);
      clearHintTimer();
      onUseBooster(type);
      sounds.play("special");
      const steps = board.applyBooster(type, pos ?? { r: 0, c: 0 });
      await playSteps(steps);
      syncHud();
      await afterResolve();
    },
    [afterResolve, board, clearHintTimer, onUseBooster, playSteps, syncHud],
  );

  const handleTap = useCallback(
    (pos: Pos) => {
      if (!targeting) return;
        const cell = board.get(pos);
      if (!cell || !cell.active) return;
      void applyBoosterAt(targeting, pos);
    },
    [applyBoosterAt, board, targeting],
  );

  const switchThemeRef = useRef(switchTheme);
  useEffect(() => {
    switchThemeRef.current = switchTheme;
  }, [switchTheme]);
  const handleTapRef = useRef(handleTap);
  const handleSwapRef = useRef(handleSwap);
  useEffect(() => {
    handleTapRef.current = handleTap;
    handleSwapRef.current = handleSwap;
  }, [handleTap, handleSwap]);

  const pressBooster = (type: BoosterType) => {
    if (phase !== "play" || busyRef.current) return;
    sounds.play("ui");
    if (targeting === type) {
      setTargeting(null);
      if (rendererRef.current) rendererRef.current.targeting = false;
      return;
    }
    if ((boosters[type] ?? 0) <= 0) {
      const bought = onBuyBooster(type);
      if (!bought) {
        showToast(`Need ${BOOSTER_INFO[type].price} Coins for ${BOOSTER_INFO[type].label}`);
        return;
      }
      sounds.play("coin");
      showToast(`Bought 1 ${BOOSTER_INFO[type].label}`);
      return;
    }
    if (type === "shuffle") {
      void applyBoosterAt("shuffle", null);
      return;
    }
    setTargeting(type);
    if (rendererRef.current) rendererRef.current.targeting = true;
  };

  /* ------------------------------ setup ------------------------------ */

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    movesRef.current = level.moves;
    busyRef.current = true;

    let renderer: CrushRenderer | null = null;
    (async () => {
      const mod = await import("../render/CrushRenderer");
      if (cancelled) return;
      const fontVar = getComputedStyle(document.documentElement).getPropertyValue("--font-fredoka").trim();
      renderer = new mod.CrushRenderer(
        host,
        level,
        {
          onSwapRequest: (a, b) => void handleSwapRef.current(a, b),
          onTap: (pos) => handleTapRef.current(pos),
          onInteract: () => clearHintTimer(),
        },
        { fontFamily: fontVar ? `${fontVar}, Fredoka, Nunito, sans-serif` : undefined },
      );
      rendererRef.current = renderer;
      renderer.inputEnabled = false;
      await renderer.init();
      if (cancelled) return;
      renderer.setTheme(themeRef.current.plate, themeRef.current.cellAlpha);
      renderer.setBoard(board.snapshot());
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __crush?: unknown }).__crush = {
          board,
          renderer,
          isBusy: () => busyRef.current,
          phase: () => phaseRef.current,
          switchTheme: (reason: string) => switchThemeRef.current(reason),
        };
      }
      setPhase("intro");
      setTimeout(() => {
        if (cancelled || !renderer) return;
        setPhase("play");
        busyRef.current = false;
        renderer.inputEnabled = true;
        scheduleHint();
      }, 1500);
    })();

    return () => {
      cancelled = true;
      clearHintTimer();
      renderer?.destroy();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, seed]);

  // Track where the board sits inside the host so the CSS frame can hug it.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      const cell = Math.min(w / level.cols, h / level.rows);
      const bw = cell * level.cols;
      const bh = cell * level.rows;
      setBoardRect({ left: (w - bw) / 2, top: (h - bh) / 2, width: bw, height: bh });
    };
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, [level.cols, level.rows]);

  /* ------------------------------ pause ------------------------------ */

  const openPause = () => {
    if (phase !== "play" && phase !== "intro") return;
    sounds.play("ui");
    setPaused(true);
    if (rendererRef.current) rendererRef.current.inputEnabled = false;
    clearHintTimer();
  };
  const closePause = () => {
    setPaused(false);
    if (rendererRef.current && phaseRef.current === "play" && !busyRef.current) {
      rendererRef.current.inputEnabled = true;
      scheduleHint();
    }
  };

  /* ------------------------------ derived ---------------------------- */

  const [s1, s2, s3] = level.starScores;
  const scorePct = Math.min(94, (score / s3) * 94);
  const starPct = [s1, s2, s3].map((s) => Math.min(94, (s / s3) * 94));
  const liveStars = score >= s3 ? 3 : score >= s2 ? 2 : score >= s1 ? 1 : 0;
  const lowMoves = moves <= 5 && phase === "play";

  const objectiveChips = useMemo(
    () =>
      objectives.map((p, i) => ({
        key: i,
        icon: objectiveIconId(p.objective, level),
        remaining: Math.max(0, p.target - p.current),
        done: p.done,
        isScore: p.objective.type === "score",
      })),
    [objectives, level],
  );

  return (
    <div
      className="crush-play relative mx-auto flex h-dvh w-full max-w-screen-sm select-none flex-col overflow-hidden text-white"
      style={theme.vars as React.CSSProperties}
      data-theme-id={theme.id}
    >
      <CrushEnvironment />

      {/* HUD */}
      <header className="relative z-10 px-3" style={{ paddingTop: "max(2.75rem, calc(var(--header-top) - 0.25rem))" }}>
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={openPause}
            aria-label="Pause"
            className="crush-glass flex h-14 w-14 shrink-0 items-center justify-center self-center rounded-full active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white drop-shadow" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1.2" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" />
            </svg>
          </button>

          <div className={`crush-glass flex min-w-[5.6rem] flex-col items-center justify-center rounded-2xl px-3 py-1.5 ${lowMoves ? "crush-moves-low" : ""}`}>
            <span className="crush-glass-label font-display text-[11px] font-bold uppercase tracking-[0.2em]">Moves</span>
            <span key={moves} className="crush-pop crush-hud-number font-display text-[30px] font-extrabold leading-none tabular-nums">
              {moves}
            </span>
          </div>

          <div className="crush-glass flex min-w-0 flex-1 flex-col items-center rounded-2xl px-2 py-1.5">
            <span className="crush-glass-label font-display text-[11px] font-bold uppercase tracking-[0.2em]">Target</span>
            <div className="mt-1 flex w-full items-center justify-center gap-1.5">
              {objectiveChips.map((chip) => (
                <div
                  key={chip.key}
                  className={`crush-glass-inner flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 transition ${
                    chip.done ? "crush-chip-done" : ""
                  }`}
                >
                  {chip.icon ? (
                    <TileIcon id={chip.icon} size={30} />
                  ) : (
                    <span className="text-[20px] leading-none">🏆</span>
                  )}
                  <span className="crush-hud-number font-display text-[18px] font-extrabold tabular-nums">
                    {chip.done ? "✓" : chip.isScore ? `${Math.ceil(chip.remaining / 1000)}k` : chip.remaining}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-2.5 flex items-center gap-3">
          <div className="crush-score-track relative h-4 flex-1 rounded-full">
            <div className="crush-score-fill h-full rounded-full" style={{ width: `${scorePct}%` }} />
            {starPct.map((pct, i) => (
              <span
                key={i}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${
                  liveStars > i ? "crush-score-star-on crush-star-pop" : "crush-score-star-off"
                }`}
                style={{ left: `${pct}%` }}
              >
                <Star filled={liveStars > i} size={liveStars > i ? 34 : 28} onDark />
              </span>
            ))}
          </div>
          <div className="flex flex-col items-end leading-none">
            <span className="crush-glass-label font-display text-[11px] font-bold uppercase tracking-[0.2em]">Score</span>
            <span className="crush-hud-number font-display text-[22px] font-extrabold tabular-nums">{formatNumber(score)}</span>
          </div>
        </div>
      </header>

      {/* Board */}
      <div className="relative z-10 min-h-0 flex-1 px-3 py-3">
        <div className="relative h-full w-full">
          {boardRect ? (
            <>
              <div
                className="crush-board-glow"
                style={{
                  left: boardRect.left + boardRect.width / 2,
                  top: boardRect.top + boardRect.height / 2,
                  width: boardRect.width * 1.6,
                  height: boardRect.height * 1.5,
                }}
              />
              <div
                className="crush-board-frame"
                style={{
                  left: boardRect.left - 12,
                  top: boardRect.top - 12,
                  width: boardRect.width + 24,
                  height: boardRect.height + 24,
                }}
              />
            </>
          ) : null}
          <div ref={hostRef} className="relative h-full w-full overflow-hidden" />
        </div>

        {banner ? (
          <div key={banner.id} className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className={`crush-banner font-display font-extrabold ${banner.big ? "text-[44px]" : "text-[36px]"}`}>
              {banner.text}
            </span>
          </div>
        ) : null}

        {phase === "intro" || phase === "loading" ? (
          <div className="crush-fade-in pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#160B3A]/45">
            <p className="font-display text-[13px] font-bold uppercase tracking-[0.25em] text-white/75">Level {level.order}</p>
            <p className="crush-intro-title font-display text-[34px] font-extrabold">{level.name}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 px-6">
              {objectiveChips.map((chip) => (
                <span key={chip.key} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25">
                  {chip.icon ? <TileIcon id={chip.icon} size={26} /> : <span>🏆</span>}
                  <span className="font-display text-[15px] font-extrabold">{chip.isScore ? formatNumber(level.objectives[chip.key].target) : chip.remaining}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-[13px] font-semibold text-white/80">{level.moves} moves</p>
          </div>
        ) : null}

        {toast ? (
          <div key={toast.id} className="crush-toast pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-full bg-[#160B3A]/85 px-4 py-2 text-[13px] font-bold text-white ring-1 ring-white/25">
              {toast.text}
            </span>
          </div>
        ) : null}
      </div>

      {/* Boosters */}
      <div
        className="relative z-10 px-3 pt-1"
        style={{ paddingBottom: "calc(max(0.75rem, 13dvh) + env(safe-area-inset-bottom, 0px))" }}
      >
        <p className="mb-1 h-4 text-center text-[11px] font-bold" style={{ color: "var(--crush-accent)" }}>
          {targeting ? `Tap a tile to use ${BOOSTER_INFO[targeting].label} · tap again to cancel` : ""}
        </p>
        <div className="crush-glass crush-dock flex items-stretch gap-2 rounded-[1.5rem]">
          {(Object.keys(BOOSTER_INFO) as BoosterType[]).map((type) => {
            const count = boosters[type] ?? 0;
            const active = targeting === type;
            const allowed = level.boostersAllowed.includes(type);
            return (
              <button
                key={type}
                type="button"
                disabled={!allowed || phase !== "play"}
                onClick={() => pressBooster(type)}
                aria-label={`${BOOSTER_INFO[type].label} booster, ${count} left`}
                className={`crush-booster relative flex flex-1 flex-col items-center rounded-2xl pb-1.5 pt-2 transition disabled:opacity-40 ${
                  active ? "crush-booster-active" : ""
                }`}
              >
                <span className="crush-booster-icon h-10 w-10" style={{ backgroundImage: `url(/games/boosters/${type}.png)` }} aria-hidden />
                <span className="crush-booster-label mt-1 font-display text-[11px] uppercase tracking-wide">{BOOSTER_INFO[type].label}</span>
                <span className="crush-badge absolute -right-1 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1 font-display text-[12px] font-extrabold">
                  {count > 0 ? count : "+"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pause */}
      {paused ? (
        <Overlay>
          <h2 className="text-center font-display text-[26px] font-extrabold text-[#3D2E7A]">Paused</h2>
          <p className="mt-1 text-center text-[13px] text-[#6B6488]">
            Level {level.order} · {level.name}
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <CrushButton onClick={closePause}>Resume</CrushButton>
            <CrushButton variant="secondary" onClick={onToggleSound}>
              {soundOn ? "🔊 Sound on" : "🔇 Sound off"}
            </CrushButton>
            <CrushButton variant="secondary" onClick={onRestartMidLevel}>
              Restart <HeartIcon size={16} /> <span className="text-[13px]">-1</span>
            </CrushButton>
            <CrushButton variant="secondary" onClick={onQuitMidLevel}>
              Quit to map <HeartIcon size={16} /> <span className="text-[13px]">-1</span>
            </CrushButton>
          </div>
        </Overlay>
      ) : null}

      {/* Win */}
      {phase === "won" && showResult && reward ? (
        <Overlay>
          <p className="text-center font-display text-[12px] font-bold uppercase tracking-[0.25em] text-[#8B84A8]">
            Level {level.order}
          </p>
          <h2 className="crush-result-title text-center font-display text-[30px] font-extrabold">Level Complete!</h2>
          <div className="mt-3 flex items-end justify-center gap-1">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={finalStars >= n ? "crush-star-in" : ""}
                style={{ animationDelay: `${0.25 * n}s` }}
              >
                <Star filled={finalStars >= n} size={n === 2 ? 64 : 50} className={n === 2 ? "-mt-3" : ""} />
              </span>
            ))}
          </div>
          <p className="mt-2 text-center font-display text-[26px] font-extrabold tabular-nums text-[#3D2E7A]">
            {formatNumber(score)}
          </p>
          <p className="-mt-1 text-center text-[11px] font-bold uppercase tracking-wide text-[#8B84A8]">Score</p>

          <div className="mt-4">
            <RewardPills points={reward.pb?.applied ?? 0} coins={reward.coins} size="sm" />
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#A0761B]">
              <CoinIcon size={14} />
              {reward.firstClear ? "First clear bonus included!" : "Coin balance " + formatNumber(coins)}
            </p>
          </div>
          {reward.pb ? (
            <div className="mt-3 text-left">
              <PbBreakdownCard receipt={reward.pb} compact />
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3">
            {reward.hasNext ? <CrushButton variant="gold" onClick={onNext}>Next Level →</CrushButton> : null}
            <CrushButton variant={reward.hasNext ? "secondary" : "gold"} onClick={onQuit}>
              Back to map
            </CrushButton>
          </div>
        </Overlay>
      ) : null}

      {/* Lose */}
      {phase === "lost" && showResult ? (
        <Overlay>
          <h2 className="text-center font-display text-[28px] font-extrabold text-[#3D2E7A]">Out of moves!</h2>
          <p className="mt-1 text-center text-[13px] text-[#6B6488]">So close. The spuds are waiting for a rematch.</p>
          <ul className="mt-4 flex flex-col gap-2">
            {objectives.map((p, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-[#F5F3FF] px-3 py-2">
                {objectiveIconId(p.objective, level) ? (
                  <TileIcon id={objectiveIconId(p.objective, level)!} size={32} />
                ) : (
                  <span className="text-[22px]">🏆</span>
                )}
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-[#DDD6FF]">
                    <div
                      className="h-full rounded-full bg-[#6A5AE0]"
                      style={{ width: `${Math.min(100, (p.current / p.target) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="font-display text-[14px] font-extrabold text-[#3D2E7A]">
                  {p.done ? "✓" : `${formatNumber(p.current)}/${formatNumber(p.target)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-[12px] font-semibold text-[#6B6488]">
            Lives left: <span className="font-extrabold text-[#DC2626]">{lives}</span>
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <CrushButton variant="gold" onClick={onRestart} disabled={lives <= 0}>
              {lives > 0 ? "Try again" : "No lives left"}
            </CrushButton>
            <CrushButton variant="secondary" onClick={onQuit}>
              Back to map
            </CrushButton>
          </div>
        </Overlay>
      ) : null}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-5">
      <div className="crush-fade-in absolute inset-0 bg-[#160B3A]/60 backdrop-blur-[3px]" />
      <div className="crush-card-in relative max-h-[calc(100dvh-5rem)] w-full max-w-[22rem] overflow-y-auto rounded-[1.75rem] bg-white p-5 text-[#1a1a2e] shadow-[0_20px_60px_rgba(0,0,0,0.35)] [-webkit-overflow-scrolling:touch]">
        {children}
      </div>
    </div>
  );
}
