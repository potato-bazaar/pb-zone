"use client";

import { useEffect, useRef, useState } from "react";
import { sounds } from "@/components/crush/render/sound";
import type { PbReceipt } from "@/components/providers/PbPointsProvider";
import { scorePotatoRun } from "@/lib/pb/scoring";
import { FINISH_M, MISSIONS, POWERS, RunGame, type MissionId, type PowerKind, type RunEvent, type RunFacts } from "../engine/run";
import type { RunRenderer } from "../render/RunRenderer";

const ART = "/games/run";

export type RunReward = { coins: number; newBest: boolean; pb: PbReceipt | null; best: number };

type Props = {
  seed: number;
  best: number;
  onFinish: (facts: RunFacts) => RunReward;
  onRestart: () => void;
  onMenu: () => void;
  onHome: () => void;
};

type Hud = {
  distance: number;
  potatoes: number;
  stars: number;
  boxes: number;
  pb: number;
  mission: MissionId;
  missionValue: number;
  speed: number;
  power: PowerKind | null;
  powerPct: number;
  combo: number;
};
type Banner = { id: number; title: string; sub?: string; tone: "gold" | "green" | "red" | "blue" };

const IDLE_HUD: Hud = { distance: 0, potatoes: 0, stars: 0, boxes: 0, pb: 0, mission: "potatoes", missionValue: 0, speed: 0, power: null, powerPct: 0, combo: 0 };

const POWER_STYLE: Record<PowerKind, { bg: string; ring: string; bar: string }> = {
  magnet: { bg: "linear-gradient(180deg, #9B6BFF 0%, #6A3BD9 100%)", ring: "ring-[#D9C6FF]/70", bar: "#E7DBFF" },
  shield: { bg: "linear-gradient(180deg, #4FB8FF 0%, #2A6FD6 100%)", ring: "ring-[#BFE6FF]/70", bar: "#DDF3FF" },
  boost: { bg: "linear-gradient(180deg, #7BE05A 0%, #2E9E44 100%)", ring: "ring-[#D6FFC2]/70", bar: "#E8FFDD" },
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

export function RunPlay({ seed, best, onFinish, onRestart, onMenu, onHome }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<RunGame | null>(null);
  const rendererRef = useRef<RunRenderer | null>(null);
  const finishedRef = useRef(false);
  const hudRef = useRef<Hud>(IDLE_HUD);
  const [hud, setHud] = useState<Hud>(IDLE_HUD);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [paused, setPaused] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [hint, setHint] = useState<string | null>("Swipe up to jump, down to slide");
  const [result, setResult] = useState<{ facts: RunFacts; reward: RunReward } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let renderer: RunRenderer | null = null;
    const game = new RunGame(seed, best);
    game.paused = true;
    gameRef.current = game;

    (async () => {
      const mod = await import("../render/RunRenderer");
      if (cancelled) return;
      const fontVar = getComputedStyle(document.documentElement).getPropertyValue("--font-fredoka").trim();
      renderer = new mod.RunRenderer(host, {
        fontFamily: fontVar ? `${fontVar}, Fredoka, sans-serif` : undefined,
        onFrame: (g) => {
          const mission = g.currentMission;
          const power = g.activePower;
          const next: Hud = {
            distance: Math.floor(g.distance),
            potatoes: g.potatoes,
            stars: g.stars,
            boxes: g.boxes,
            pb: scorePotatoRun(g.facts).points,
            mission: mission.id,
            missionValue: Math.min(mission.target, g.missionProgress(mission.id)),
            speed: Math.round(g.speed * 10),
            power: power?.kind ?? null,
            powerPct: power ? Math.round((power.left / power.total) * 20) * 5 : 0,
            combo: g.combo,
          };
          const prev = hudRef.current;
          if (
            prev.distance !== next.distance ||
            prev.potatoes !== next.potatoes ||
            prev.stars !== next.stars ||
            prev.boxes !== next.boxes ||
            prev.pb !== next.pb ||
            prev.mission !== next.mission ||
            prev.speed !== next.speed ||
            prev.power !== next.power ||
            prev.powerPct !== next.powerPct ||
            prev.combo !== next.combo
          ) {
            hudRef.current = next;
            setHud(next);
          }
        },
        onEvents: (events: RunEvent[]) => {
          for (const ev of events) {
            if (ev.type === "milestone" && ev.metres < FINISH_M) setBanner({ id: Date.now(), title: `${ev.metres.toLocaleString("en-IN")} m!`, sub: "Keep running", tone: "gold" });
            else if (ev.type === "section" && ev.perfect) setBanner({ id: Date.now(), title: "Perfect section!", sub: "+10 PB", tone: "green" });
            else if (ev.type === "mission") {
              const m = MISSIONS.find((x) => x.id === ev.id)!;
              setBanner({ id: Date.now(), title: "Mission complete!", sub: m.label, tone: "green" });
            } else if (ev.type === "phase" && ev.phase === "storage") {
              setBanner({ id: Date.now(), title: "Cold Storage ahead!", sub: "Final stretch. Deliver the load!", tone: "blue" });
            } else if (ev.type === "power") {
              setHint(ev.kind === "magnet" ? "Magnet: potatoes fly to you" : ev.kind === "shield" ? "Shield: your next hit is free" : "Speed Boost: smash through everything!");
            } else if (ev.type === "stumble") {
              setHint(ev.kind === "gate" ? "Swipe down to slide under gates" : ev.kind === "tractor" ? "Tractors can't be jumped. Change lane!" : ev.kind === "puddle" ? "Hop over puddles or go around" : "Swipe up to jump over that");
              setBanner({ id: Date.now(), title: "Stumbled!", sub: "One more hit and it's over", tone: "red" });
            } else if (ev.type === "end" && !finishedRef.current) {
              finishedRef.current = true;
              const facts = game.facts;
              const reward = onFinish(facts);
              window.setTimeout(() => setResult({ facts, reward }), facts.finished ? 500 : 700);
            }
          }
        },
      });
      rendererRef.current = renderer;
      await renderer.init();
      if (cancelled) return;
      renderer.setGame(game);
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __run?: unknown }).__run = { game, renderer };
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

  // 3-2-1 countdown, then release the runner
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const t = window.setTimeout(() => {
        setCountdown(null);
        if (gameRef.current) gameRef.current.paused = false;
      }, 450);
      return () => window.clearTimeout(t);
    }
    sounds.play("ui");
    const t = window.setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 750);
    return () => window.clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 1600);
    return () => window.clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(null), 3200);
    return () => window.clearTimeout(t);
  }, [hint]);

  // input: swipes on the scene, keys on desktop
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let start: { x: number; y: number; t: number } | null = null;
    let handled = false;
    const act = (dir: "left" | "right" | "up" | "down") => {
      const g = gameRef.current;
      if (!g || g.paused || g.over) return;
      sounds.unlock();
      if (dir === "left") g.moveLeft();
      else if (dir === "right") g.moveRight();
      else if (dir === "up") g.jump();
      else g.slide();
    };
    const down = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY, t: performance.now() };
      handled = false;
    };
    const move = (e: PointerEvent) => {
      if (!start || handled) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
      handled = true;
      if (Math.abs(dx) > Math.abs(dy)) act(dx < 0 ? "left" : "right");
      else act(dy < 0 ? "up" : "down");
    };
    const up = (e: PointerEvent) => {
      if (start && !handled && performance.now() - start.t < 260) {
        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        if (dx < 10 && dy < 10) act("up");
      }
      start = null;
      handled = false;
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") act("left");
      else if (e.key === "ArrowRight" || e.key === "d") act("right");
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") act("up");
      else if (e.key === "ArrowDown" || e.key === "s") act("down");
      else return;
      e.preventDefault();
    };
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key);
    return () => {
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key);
    };
  }, []);

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
  const jump = () => {
    sounds.unlock();
    gameRef.current?.jump();
  };
  const slide = () => {
    sounds.unlock();
    gameRef.current?.slide();
  };

  const mission = MISSIONS.find((m) => m.id === hud.mission) ?? MISSIONS[0];
  const missionPct = Math.min(100, Math.round((hud.missionValue / mission.target) * 100));
  const power = hud.power ? POWERS[hud.power] : null;

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm select-none overflow-hidden bg-[#8fd0ff] text-white">
      <div ref={hostRef} className="absolute inset-0 touch-none" />

      {/* ---- HUD — one aligned row ---- */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3"
        style={{ paddingTop: "var(--header-top)" }}
      >
        <div className="flex h-10 items-center gap-2">
          <button
            type="button"
            onClick={pause}
            aria-label="Pause"
            className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111A2F]/80 shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-1 ring-white/25"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          </button>

          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#111A2F]/80 px-2.5 shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-1 ring-white/20 backdrop-blur-[2px]">
            <img src={`${ART}/crate.webp`} alt="" draggable={false} className="h-6 w-6 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[11px] font-extrabold leading-none">{mission.label}</p>
                <span className="shrink-0 text-[10px] font-extrabold tabular-nums text-white/90">
                  {hud.missionValue}/{mission.target}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-gradient-to-r from-[#7CFF9A] to-[#2fb14a] transition-[width]" style={{ width: `${missionPct}%` }} />
              </div>
            </div>
          </div>

          <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#111A2F]/80 px-2.5 shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-1 ring-white/20">
            <StarIcon className="h-3.5 w-3.5" />
            <span className="font-display text-[13px] font-extrabold tabular-nums leading-none">{hud.pb.toLocaleString("en-IN")} PB</span>
            <span className="text-white/35" aria-hidden>|</span>
            <span className="font-display text-[12px] font-extrabold tabular-nums leading-none text-white/90">{hud.distance.toLocaleString("en-IN")} m</span>
          </div>
        </div>
      </div>

      {/* Power — single centered strip under HUD (keyed once per power pickup) */}
      {power && hud.power ? (
        <div
          key={hud.power}
          className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4"
          style={{ top: "calc(var(--header-top) + 3rem)" }}
        >
          <div
            className={`run-power flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full px-3 py-1.5 text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] ring-2 ${POWER_STYLE[hud.power].ring}`}
            style={{ background: POWER_STYLE[hud.power].bg }}
          >
            <img src={`${ART}/${hud.power}.webp`} alt="" draggable={false} className="h-7 w-7 shrink-0 object-contain drop-shadow" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="font-display text-[12px] font-extrabold uppercase leading-none tracking-wide">{power.label}</p>
                <p className="text-[9px] font-bold text-white/85">{power.blurb}</p>
              </div>
              {hud.power !== "shield" ? (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/25">
                  <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${hud.powerPct}%`, background: POWER_STYLE[hud.power].bar }} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* side stats — vertical center-left, clear of HUD / controls */}
      <div className="pointer-events-none absolute left-3 top-1/2 z-20 -translate-y-1/2">
        <div className="flex flex-col gap-2 rounded-2xl bg-[#111A2F]/80 px-2.5 py-2.5 ring-1 ring-white/20 backdrop-blur-[2px]">
          <Stat icon={`${ART}/potato.webp`} value={hud.potatoes} target={50} />
          <Stat icon={`${ART}/star.webp`} value={hud.stars} target={15} />
          <Stat icon={`${ART}/box.webp`} value={hud.boxes} target={3} />
        </div>
      </div>

      {/* combo — mirror side, mid-right */}
      {hud.combo >= 5 ? (
        <div
          key={hud.combo}
          className="run-combo pointer-events-none absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-2xl bg-[#FFC53D] px-3 py-1.5 font-display text-[16px] font-extrabold text-[#4A3300] shadow-[0_6px_14px_rgba(0,0,0,0.35)]"
        >
          Combo x{hud.combo}
        </div>
      ) : null}

      {/* bottom controls — lifted for gesture safe-area */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-3"
        style={{ paddingBottom: "max(2.75rem, calc(env(safe-area-inset-bottom, 0px) + 1.75rem))" }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <div className="run-swipe flex h-[3.5rem] w-[3.5rem] flex-col items-center justify-center rounded-full bg-black/25 ring-2 ring-white/40 backdrop-blur-[2px]">
            <svg viewBox="0 0 24 24" className="-mb-2 h-5 w-5 text-white/85" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 14 6-6 6 6" />
            </svg>
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 14 6-6 6 6" />
            </svg>
          </div>
          <span className="text-[10px] font-extrabold drop-shadow">Swipe to Move</span>
        </div>
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
          <button type="button" onPointerDown={(e) => { e.preventDefault(); jump(); }} aria-label="Jump" className="flex h-[3.4rem] w-[3.4rem] flex-col items-center justify-center rounded-full bg-black/35 ring-2 ring-white/45 backdrop-blur-[2px] active:scale-95 active:bg-black/55">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 16l3-6 3 2 3-1 2 2h4a3 3 0 0 1 3 3v1H3z" />
              <path d="M3 17h18" />
            </svg>
            <span className="text-[9px] font-extrabold">Jump</span>
          </button>
          <button type="button" onPointerDown={(e) => { e.preventDefault(); slide(); }} aria-label="Slide" className="flex h-[3.4rem] w-[3.4rem] flex-col items-center justify-center rounded-full bg-black/35 ring-2 ring-white/45 backdrop-blur-[2px] active:scale-95 active:bg-black/55">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="17" cy="6" r="2" />
              <path d="M4 18h16M6 17l4-5 4 1 2-3M10 12l-2 5" />
            </svg>
            <span className="text-[9px] font-extrabold">Slide</span>
          </button>
        </div>
      </div>

      {hint ? (
        <div className="run-hint pointer-events-none absolute inset-x-0 top-[57%] z-20 flex justify-center px-6">
          <span className="rounded-full bg-white/90 px-3.5 py-1.5 text-[12px] font-extrabold text-[#241A5E] shadow-[0_6px_16px_rgba(0,0,0,0.3)]">{hint}</span>
        </div>
      ) : null}

      {banner ? (
        <div key={banner.id} className="run-banner pointer-events-none absolute inset-x-0 top-[40%] z-30 flex flex-col items-center">
          <span className={`rounded-full px-5 py-2 font-display text-[24px] font-extrabold shadow-[0_8px_20px_rgba(0,0,0,0.35)] ${banner.tone === "gold" ? "bg-[#FFC53D] text-[#4A3300]" : banner.tone === "green" ? "bg-[#5be27a] text-[#0f3d1a]" : banner.tone === "blue" ? "bg-[#8FE3FF] text-[#0B3A5E]" : "bg-[#FF6B6B] text-white"}`}>{banner.title}</span>
          {banner.sub ? <span className="mt-1 rounded-full bg-[#111A2F]/80 px-3 py-1 text-[12px] font-extrabold">{banner.sub}</span> : null}
        </div>
      ) : null}

      {countdown !== null && !result ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <span key={countdown} className="run-count font-display text-[96px] font-extrabold text-[#FFC53D] drop-shadow-[0_8px_0_#5A2E0F]" style={{ WebkitTextStroke: "3px #5A2E0F" }}>
            {countdown === 0 ? "GO!" : countdown}
          </span>
        </div>
      ) : null}

      {paused ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0B1020]/70 px-8 backdrop-blur-[2px]">
          <div className="w-full max-w-[18rem] rounded-[1.5rem] bg-white p-5 text-center text-[#241A5E] shadow-2xl">
            <h2 className="font-display text-[24px] font-extrabold">Paused</h2>
            <p className="mt-1 text-[12px] font-semibold text-[#6B6488]">Catch your breath, the road will wait.</p>
            <button type="button" onClick={resume} className="mt-4 w-full rounded-full bg-gradient-to-b from-[#3FBF5A] to-[#2E7D32] py-3 font-display text-[16px] font-extrabold text-white shadow-[0_6px_0_#1F5A23] active:translate-y-0.5">
              Resume
            </button>
            <button type="button" onClick={onMenu} className="mt-2 w-full rounded-full bg-[#F5F3FF] py-3 font-display text-[15px] font-extrabold text-[#6A5AE0]">
              Quit run
            </button>
          </div>
        </div>
      ) : null}

      {result ? <ResultOverlay facts={result.facts} reward={result.reward} onRestart={onRestart} onHome={onHome} /> : null}
    </div>
  );
}

function Stat({ icon, value, target }: { icon: string; value: number; target: number }) {
  return (
    <div className="grid w-full grid-cols-[1.75rem_1fr] items-center gap-x-2">
      <img src={icon} alt="" draggable={false} className="h-7 w-7 justify-self-center object-contain" />
      <span className="text-right font-display text-[14px] font-extrabold tabular-nums leading-none">
        {value}
        <span className="text-white/55"> / {target}</span>
      </span>
    </div>
  );
}

function StarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#FFD23F" stroke="#B8860B" strokeWidth="1.2" strokeLinejoin="round" aria-hidden>
      <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8L12 2.6z" />
    </svg>
  );
}

const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i * 0.13) % 1.6,
  dur: 2.6 + ((i * 0.37) % 1.4),
  color: ["#FFD23F", "#C58BFF", "#7CFF9A", "#4FD6FF", "#FF8A80", "#FFFFFF"][i % 6],
  size: 6 + (i % 4) * 2,
  spin: (i % 2 === 0 ? 1 : -1) * (360 + (i * 47) % 360),
}));

/** "Shipment complete" (finish) or "Run over" (crash) — single screen, no scroll. */
function ResultOverlay({ facts, reward, onRestart, onHome }: { facts: RunFacts; reward: RunReward; onRestart: () => void; onHome: () => void }) {
  const finished = facts.finished;
  const pbApplied = reward.pb?.applied ?? 0;
  const receipt = reward.pb;
  const moved =
    receipt &&
    receipt.applied > 0 &&
    (receipt.rankAfter !== receipt.rankBefore || receipt.gameRankAfter !== receipt.gameRankBefore);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#0B1020]/82 px-3 backdrop-blur-[3px]"
      style={{
        paddingTop: "var(--header-top)",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))",
      }}
    >
      {finished ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {CONFETTI.map((c, i) => (
            <i
              key={i}
              className="run-confetti absolute top-[-4%] block rounded-[2px]"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size * 1.6,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.dur}s`,
                ["--spin" as string]: `${c.spin}deg`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative mx-auto flex h-full w-full max-w-[22rem] -translate-y-4 flex-col justify-center gap-2.5">
        <div className="shrink-0 text-center">
          <h1
            className={`run-shipment font-display text-[26px] font-extrabold uppercase leading-none ${finished ? "text-white" : "text-[#FFC53D]"}`}
            style={{ WebkitTextStroke: finished ? "0px" : "1.2px #5A2E0F" }}
          >
            {finished ? (
              <>
                Shipment <span className="text-[#FFD23F]">Complete!</span>
              </>
            ) : reward.newBest ? (
              "New Best!"
            ) : (
              "Run Over"
            )}
          </h1>
          <img
            src={`${ART}/${finished ? "cheer" : "hero"}.webp`}
            alt=""
            draggable={false}
            className={`mx-auto mt-1 h-[136px] w-auto object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.45)] ${finished ? "run-cheer" : ""}`}
          />
        </div>

        <div className="rounded-2xl bg-white/95 px-3 py-2 text-center text-[#241A5E] shadow-[0_10px_28px_rgba(0,0,0,0.3)]">
          <p className="text-[12px] font-bold text-[#6B6488]">
            <span className="font-display text-[17px] font-extrabold text-[#241A5E]">{facts.potatoes}</span> potatoes
            <span className="mx-1.5 text-[#C8C0E8]">·</span>
            <span className="font-display text-[17px] font-extrabold text-[#6A5AE0]">+{pbApplied}</span> PB
            {reward.coins > 0 ? (
              <>
                <span className="mx-1.5 text-[#C8C0E8]">·</span>
                <span className="font-display text-[17px] font-extrabold text-[#8A5A00]">+{reward.coins}</span> coins
              </>
            ) : null}
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-[#141A30]/90 py-2 text-center ring-1 ring-white/12">
          {[
            ["Distance", `${facts.distance.toLocaleString("en-IN")} m`, "text-white"],
            ["Combo", `x${facts.maxCombo}`, "text-[#FFD23F]"],
            ["Time", fmtTime(facts.time), "text-white"],
          ].map(([k, v, cls]) => (
            <div key={k} className="px-1">
              <p className="text-[9px] font-bold uppercase tracking-wide text-white/65">{k}</p>
              <p className={`mt-0.5 font-display text-[15px] font-extrabold tabular-nums leading-none ${cls}`}>{v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            ["Stars", facts.stars, `${ART}/star.webp`],
            ["Parcels", facts.boxes, `${ART}/box.webp`],
            ["Dodged", facts.avoided, null],
            ["Powers", facts.powerups, `${ART}/boost.webp`],
          ].map(([k, v, icon]) => (
            <div key={String(k)} className="rounded-xl bg-[#141A30]/85 px-1 py-1.5 text-center ring-1 ring-white/12">
              {icon ? (
                <img src={String(icon)} alt="" draggable={false} className="mx-auto h-5 w-5 object-contain" />
              ) : (
                <span className="mx-auto block h-5 text-[14px] leading-5">🏃</span>
              )}
              <p className="mt-0.5 font-display text-[14px] font-extrabold leading-none tabular-nums">{String(v)}</p>
              <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-white/55">{String(k)}</p>
            </div>
          ))}
        </div>

        {moved && receipt ? (
          <div className="rounded-xl bg-[#EDE7FF] px-3 py-1.5 text-center text-[11px] font-extrabold text-[#3D2E7A]">
            Rank #{receipt.rankBefore} → #{receipt.rankAfter}
            <span className="mx-1 text-[#C8C0E8]">·</span>
            Run #{receipt.gameRankBefore} → #{receipt.gameRankAfter}
          </div>
        ) : null}

        {!finished && facts.hits > 0 ? (
          <p className="rounded-xl bg-[#FFF3C4]/95 px-2.5 py-1.5 text-center text-[10px] font-bold leading-snug text-[#8A5A00]">
            {facts.hits} hit{facts.hits === 1 ? "" : "s"} · reach 1,500 m for +30 PB
          </p>
        ) : null}

        <div className="mt-1 grid shrink-0 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-[#8B6CFF] to-[#5A3ED6] py-3 font-display text-[15px] font-extrabold text-white shadow-[0_5px_0_#3B2490] active:translate-y-0.5 active:shadow-[0_2px_0_#3B2490]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
            </svg>
            Play Again
          </button>
          <button
            type="button"
            onClick={onHome}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[#141A30]/90 py-3 font-display text-[15px] font-extrabold text-white ring-1 ring-white/25 active:translate-y-0.5"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />
            </svg>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
