"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CoinIcon } from "./crushUi";
import { BOOSTER_INFO, LEVELS, MAX_LIVES } from "../engine/levels";
import type { CrushProgress } from "../engine/progress";
import type { BoosterType, LevelDef } from "../engine/types";
import { HeartIcon, Star, StarRow, TileIcon, formatNumber } from "./crushUi";

type Props = {
  progress: CrushProgress;
  coins: number;
  lifeCountdown: string | null;
  onBack: () => void;
  onSelectLevel: (level: LevelDef) => void;
  onOpenLives: () => void;
  onOpenShop: (type: BoosterType) => void;
  onToggleSound: () => void;
  onHowTo: () => void;
};

const NODE_GAP = 108;
const MAP_PAD_TOP = 70;
const MAP_PAD_BOTTOM = 130;

/** Winding path: x position (0..1) per level index. */
function nodeX(i: number) {
  const t = i * 0.9;
  return 0.46 + Math.sin(t) * 0.2;
}

export function CrushLevelMap({
  progress,
  coins,
  lifeCountdown,
  onBack,
  onSelectLevel,
  onOpenLives,
  onOpenShop,
  onToggleSound,
  onHowTo,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [scrollMax, setScrollMax] = useState(1);
  const total = LEVELS.length;
  const mapHeight = MAP_PAD_TOP + (total - 1) * NODE_GAP + MAP_PAD_BOTTOM;
  const totalStars = useMemo(
    () => Object.values(progress.stars).reduce((a, b) => a + b, 0),
    [progress.stars],
  );

  // Start scrolled to the current level and drive the parallax world behind the path.
  useEffect(() => {
    const el = currentRef.current;
    const sc = scrollRef.current;
    if (!el || !sc) return;
    const elTop = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
    sc.scrollTo({ top: Math.max(0, elTop - sc.clientHeight * 0.6), behavior: "instant" as ScrollBehavior });
    setScrollMax(Math.max(1, sc.scrollHeight - sc.clientHeight));
    const onScroll = () => {
      const world = worldRef.current;
      if (!world) return;
      const max = Math.max(1, sc.scrollHeight - sc.clientHeight);
      const t = sc.scrollTop / max; // 0 = top (last levels), 1 = bottom (level 1)
      world.style.transform = `translate3d(0, ${(-(1 - t) * 22).toFixed(2)}%, 0)`;
    };
    onScroll();
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => sc.removeEventListener("scroll", onScroll);
  }, []);

  // Levels are laid out bottom-to-top (level 1 at the bottom, like a climb).
  const nodes = LEVELS.map((lvl, i) => ({
    lvl,
    x: nodeX(i),
    y: mapHeight - MAP_PAD_BOTTOM - i * NODE_GAP,
  }));

  const pathD = nodes
    .map((n, i) => {
      const x = n.x * 100;
      if (i === 0) return `M ${x} ${n.y}`;
      const prev = nodes[i - 1];
      const px = prev.x * 100;
      const midY = (prev.y + n.y) / 2;
      return `C ${px} ${midY}, ${x} ${midY}, ${x} ${n.y}`;
    })
    .join(" ");

  // The part of the road already travelled (level 1 → current) gets a warmer tint.
  const doneCount = Math.max(0, Math.min(total, progress.unlocked) - 1);
  const donePathD = nodes
    .slice(0, doneCount + 1)
    .map((n, i, arr) => {
      const x = n.x * 100;
      if (i === 0) return `M ${x} ${n.y}`;
      const prev = arr[i - 1];
      const px = prev.x * 100;
      const midY = (prev.y + n.y) / 2;
      return `C ${px} ${midY}, ${x} ${midY}, ${x} ${n.y}`;
    })
    .join(" ");

  void scrollMax;

  return (
    <div className="crush-map relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      {/* World backdrop (parallax) */}
      <div className="crush-world-wrap absolute inset-0" aria-hidden>
        <div ref={worldRef} className="crush-world" />
        <div className="crush-world-haze" />
        <div className="crush-world-particles">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53 + 11) % 100}%`,
                animationDelay: `${-(i * 1.3) % 12}s`,
                animationDuration: `${12 + (i % 4) * 3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header + branding banner */}
      <div className="relative z-20 px-4" style={{ paddingTop: "var(--header-top)" }}>
        <header className="relative z-10 mb-1 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to games"
            className="crush-hud-pill flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#3D2E7A]"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenLives}
              className="crush-hud-pill inline-flex h-8 items-center gap-1 rounded-full pl-1.5 pr-2.5"
              aria-label={`${progress.lives} of ${MAX_LIVES} lives`}
            >
              <HeartIcon size={16} dim={progress.lives === 0} />
              <span className="text-[12px] font-extrabold tabular-nums text-[#1a1a2e]">
                {progress.lives}
                <span className="text-[10px] font-bold text-[#8B84A8]">/{MAX_LIVES}</span>
              </span>
              {lifeCountdown ? (
                <span className="ml-0.5 rounded-full bg-[#F0ECFF] px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-[#6A5AE0]">
                  {lifeCountdown}
                </span>
              ) : null}
            </button>
            <div className="crush-hud-pill inline-flex h-8 items-center gap-1 rounded-full pl-1.5 pr-2.5" role="status" aria-label={`${formatNumber(coins)} coins`}>
              <CoinIcon size={16} />
              <span className="text-[12px] font-extrabold tabular-nums text-[#1a1a2e]">{formatNumber(coins)}</span>
            </div>
          </div>
        </header>

        <div className="crush-brand relative mt-2 overflow-hidden rounded-[1.5rem] pb-3.5 pl-3.5 pr-[46%] pt-6">
          <div className="crush-brand-shine" aria-hidden />
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.26em] text-white/85">PB Zone presents</p>
          <h1 className="crush-logo mt-0.5 font-display text-[30px] font-extrabold leading-[0.95]">
            <span className="crush-logo-a">Potato</span>
            <br />
            <span className="crush-logo-b">Crush</span>
          </h1>
          <p className="mt-1.5 text-[12px] font-semibold leading-snug text-white/90">Match &amp; pop the tastiest spuds!</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/22 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/35">
              <Star filled size={14} /> {totalStars}/{total * 3}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/22 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/35">
              Level {Math.min(progress.unlocked, total)} of {total}
            </span>
          </div>

          {/* Mascot artwork (right half, blended into the banner gradient) */}
          <div className="crush-mascot-art pointer-events-none absolute inset-y-0 right-0 w-[58%]" aria-hidden />

          {/* Floating food bits */}
          <span className="crush-float crush-float-a" aria-hidden><TileIcon id="fries#none" size={30} /></span>
          <span className="crush-float crush-float-b" aria-hidden><TileIcon id="vitelotte#none" size={24} /></span>
          <span className="crush-float crush-float-c" aria-hidden><TileIcon id="chip#none" size={22} /></span>
        </div>
      </div>

      {/* Scrolling saga map */}
      <div
        ref={scrollRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
      >
        <div className="relative mx-auto w-full" style={{ height: mapHeight }}>
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox={`0 0 100 ${mapHeight}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            {/* Ground shadow under the road */}
            <path d={pathD} fill="none" stroke="rgba(60,35,10,0.28)" strokeWidth="40" strokeLinecap="round" vectorEffect="non-scaling-stroke" transform="translate(0 8)" />
            {/* Dark road edge */}
            <path d={pathD} fill="none" stroke="#B37A3F" strokeWidth="36" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {/* Road body */}
            <path d={pathD} fill="none" stroke="#F3D9A4" strokeWidth="29" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {/* Highlight ridge */}
            <path d={pathD} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="26" strokeLinecap="round" vectorEffect="non-scaling-stroke" transform="translate(0 -3)" strokeDasharray="0" opacity="0.5" />
            {/* Travelled section tint */}
            {doneCount > 0 ? (
              <path d={donePathD} fill="none" stroke="#FFC65C" strokeWidth="29" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.85" />
            ) : null}
            {/* Stitching */}
            <path d={pathD} fill="none" stroke="#A46A2E" strokeWidth="2.5" strokeDasharray="7 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {nodes.map(({ lvl, x, y }) => {
            const stars = progress.stars[lvl.order] ?? 0;
            const unlocked = lvl.order <= progress.unlocked;
            const isCurrent = lvl.order === progress.unlocked;
            const done = stars > 0;
            return (
              <div
                key={lvl.id}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${x * 100}%`, top: y, zIndex: isCurrent ? 5 : 2 }}
              >
                {isCurrent ? (
                  <>
                    <span className="crush-node-glow" aria-hidden />
                    <div className="crush-play-tag" aria-hidden>
                      PLAY
                    </div>
                  </>
                ) : null}
                <button
                  ref={isCurrent ? currentRef : undefined}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectLevel(lvl)}
                  aria-label={`Level ${lvl.order}${unlocked ? "" : " (locked)"}`}
                  className={`crush-node relative flex items-center justify-center rounded-full font-display font-extrabold transition active:scale-95 ${
                    !unlocked
                      ? "crush-node-locked h-[48px] w-[48px] text-[16px]"
                      : done
                        ? "crush-node-done h-[54px] w-[54px] text-[20px]"
                        : "crush-node-current h-[60px] w-[60px] text-[24px]"
                  }`}
                >
                  {unlocked ? (
                    lvl.order
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                      <path d="M17 9V7a5 5 0 0 0-10 0v2H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1h-1zm-8-2a3 3 0 0 1 6 0v2H9V7z" />
                    </svg>
                  )}
                  {done ? (
                    <span className="crush-node-check" aria-hidden>
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    </span>
                  ) : null}
                  {isCurrent ? <span className="crush-node-ring" aria-hidden /> : null}
                </button>
                <div className={`crush-stars-pill mt-1 ${done ? "crush-stars-pill-done" : ""}`}>
                  <StarRow stars={stars} size={done ? 13 : 11} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom dock: boosters + help — lifted for gesture safe-area */}
      <div
        className="relative z-20 px-4 pt-1"
        style={{ paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))" }}
      >
        <div className="crush-map-dock flex items-center gap-2 rounded-[1.35rem] p-2">
          {(Object.keys(BOOSTER_INFO) as BoosterType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onOpenShop(type)}
              className="relative flex flex-1 flex-col items-center rounded-xl bg-[#F5F3FF] py-1.5 active:scale-95"
              aria-label={`${BOOSTER_INFO[type].label} booster`}
            >
              <span className="text-[20px] leading-none">{BOOSTER_INFO[type].emoji}</span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6B6488]">
                {BOOSTER_INFO[type].label}
              </span>
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6A5AE0] px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
                {progress.boosters[type]}
              </span>
            </button>
          ))}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={progress.sound ? "Mute sound" : "Unmute sound"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F3FF] text-[15px]"
            >
              {progress.sound ? "🔊" : "🔇"}
            </button>
            <button
              type="button"
              onClick={onHowTo}
              aria-label="How to play"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F3FF] font-display text-[15px] font-extrabold text-[#6A5AE0]"
            >
              ?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Level sheet helpers                                                */
/* ------------------------------------------------------------------ */

export function LevelObjectiveList({ level }: { level: LevelDef }) {
  return (
    <ul className="flex flex-col gap-2">
      {level.objectives.map((o, i) => (
        <ObjectiveRow key={i} level={level} index={i} />
      ))}
    </ul>
  );
}

function ObjectiveRow({ level, index }: { level: LevelDef; index: number }) {
  const o = level.objectives[index];
  const icon = objectiveIcon(level, index);
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-[#F5F3FF] px-3 py-2.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        {icon ? <TileIcon id={icon} size={36} /> : <span className="text-[22px]">🏆</span>}
      </span>
      <div className="min-w-0">
        <p className="font-display text-[15px] font-bold text-[#3D2E7A]">{objectiveTitle(level, index)}</p>
        <p className="text-[12px] text-[#6B6488]">{objectiveHint(o.type)}</p>
      </div>
    </li>
  );
}

function objectiveIcon(level: LevelDef, index: number) {
  const o = level.objectives[index];
  if (o.type === "collect" && o.tileId) return `${o.tileId}#none`;
  if (o.type === "clear-blockers") {
    const layout = level.layout?.join("") ?? "";
    if (/[iI]/.test(layout)) return "blocker:ice";
    if (/[cC]/.test(layout)) return "blocker:crate";
    if (/b/.test(layout)) return "blocker:butter";
    return "blocker:soil";
  }
  return null;
}

function objectiveTitle(level: LevelDef, index: number) {
  const o = level.objectives[index];
  if (o.type === "collect") {
    const name = o.tileId ? o.tileId.charAt(0).toUpperCase() + o.tileId.slice(1) : "tiles";
    return `Collect ${o.target} ${name}`;
  }
  if (o.type === "score") return `Score ${o.target.toLocaleString("en-IN")}`;
  return "Clear every blocker";
}

function objectiveHint(type: LevelDef["objectives"][number]["type"]) {
  switch (type) {
    case "collect":
      return "Match them anywhere on the board.";
    case "score":
      return "Cascades and specials multiply points.";
    default:
      return "Match next to or on top of them.";
  }
}

export function livesLabel(lives: number) {
  return `${lives}/${MAX_LIVES}`;
}
