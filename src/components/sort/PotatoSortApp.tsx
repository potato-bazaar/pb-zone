"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PbBreakdownCard, PbStarIcon, RewardPills } from "@/components/pb/PbUi";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { usePbPoints, type PbReceipt } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { recordGameLeaderboard } from "@/lib/leaderboardApi";
import { haptic, sounds } from "@/components/crush/render/sound";
import { coinsForPotatoSort, scorePotatoSort } from "@/lib/pb/scoring";
import {
  BINS,
  FAST_SECONDS,
  ROUND_POTATOES,
  ROUND_SECONDS,
  SPAWN_SECONDS,
  TRAVEL_SECONDS,
  applyMiss,
  applySort,
  comboMeter,
  emptyStats,
  mulberry32,
  spawnPotato,
  type Potato,
  type PotatoKind,
  type RoundStats,
} from "./engine";
import { BinIcon, PotatoArt, SORT_ART } from "./PotatoArt";

type Phase = "intro" | "play" | "result";

type RoundResult = {
  stats: RoundStats;
  roundComplete: boolean;
  coins: number;
  pb: PbReceipt;
};

/* ------------------------------------------------------------------ */
/*  Backdrop geometry                                                  */
/* ------------------------------------------------------------------ */

/**
 * The warehouse backdrop is a fixed 752x1344 render with an empty conveyor.
 * These are the belt's corners in image pixels; potatoes are placed along
 * that trapezoid so they ride the painted belt on any screen size.
 */
const BG = {
  w: 752,
  h: 1344,
  far: { y: 495, cx: 376, half: 30 },
  near: { y: 860, cx: 377, half: 268 },
};

type Metrics = { w: number; h: number; scale: number; offX: number; offY: number };

/** Scale the backdrop so it covers the screen and the belt's near end lands just above the bins. */
function computeMetrics(w: number, h: number, binsTop: number): Metrics {
  const target = Math.max(160, binsTop - 4);
  const scale = Math.max(w / BG.w, h / BG.h, target / BG.near.y);
  return { w, h, scale, offX: (w - BG.w * scale) / 2, offY: Math.min(0, target - BG.near.y * scale) };
}

function beltPoint(m: Metrics, lane: number, progress: number) {
  const half = BG.far.half + (BG.near.half - BG.far.half) * progress;
  const cx = BG.far.cx + (BG.near.cx - BG.far.cx) * progress;
  const ix = cx + (lane - 0.5) * 2 * half * 0.86;
  const iy = BG.far.y + (BG.near.y - BG.far.y) * progress;
  return { x: m.offX + ix * m.scale, y: m.offY + iy * m.scale };
}

function Backdrop({ m, dim = 0 }: { m: Metrics | null; dim?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#1c2438]" aria-hidden>
      {m ? (
        <img src={`${SORT_ART}/warehouse.jpg`} alt="" draggable={false} className="absolute max-w-none" style={{ left: m.offX, top: m.offY, width: BG.w * m.scale, height: BG.h * m.scale }} />
      ) : (
        <img src={`${SORT_ART}/warehouse.jpg`} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover object-top" />
      )}
      {dim > 0 ? <div className="absolute inset-0" style={{ background: `rgba(10, 16, 34, ${dim})` }} /> : null}
    </div>
  );
}

/** Measures the root element (and where the bins row starts) so the backdrop and belt can be mapped exactly. */
function useStageMetrics(rootRef: React.RefObject<HTMLDivElement | null>, binsRef: React.RefObject<HTMLDivElement | null>) {
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const binsTop = binsRef.current ? binsRef.current.offsetTop : h * 0.78;
      setM(computeMetrics(w, h, binsTop));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    if (binsRef.current) ro.observe(binsRef.current);
    return () => ro.disconnect();
  }, [rootRef, binsRef]);
  return m;
}

/* ------------------------------------------------------------------ */
/*  Shared pieces                                                      */
/* ------------------------------------------------------------------ */

function Mascot({ height = 120, className = "" }: { height?: number; className?: string }) {
  return <img src={`${SORT_ART}/mascot.webp`} alt="" draggable={false} className={`pointer-events-none select-none object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,0.45)] ${className}`} style={{ height, width: "auto" }} />;
}

function Logo({ className = "" }: { className?: string }) {
  return <img src={`${SORT_ART}/logo.webp`} alt="Potato Sort" draggable={false} className={`pointer-events-none select-none object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)] ${className}`} />;
}

function HudPill({ icon, value, label, className = "" }: { icon: React.ReactNode; value: React.ReactNode; label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl bg-[#111A2F]/90 px-3 py-1.5 shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-1 ring-white/15 backdrop-blur-[2px] ${className}`}>
      <span className="shrink-0">{icon}</span>
      <span className="flex flex-col items-center leading-none">
        <span className="font-display text-[18px] font-extrabold text-white tabular-nums">{value}</span>
        <span className="mt-0.5 text-[9.5px] font-bold text-white/80">{label}</span>
      </span>
    </div>
  );
}

function StopwatchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9v4l2.5 1.5M9.5 3h5M12 3v2.5M18 6.5l1.5-1.5" />
    </svg>
  );
}

function RoundButton({ onClick, label, className = "", children }: { onClick: () => void; label: string; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111A2F]/90 text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-1 ring-white/20 ${className}`}>
      {children}
    </button>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

const PRIMARY_BTN = "flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#3FBF5A] to-[#2E7D32] py-3.5 font-display text-[18px] font-extrabold text-white shadow-[0_8px_0_#1F5A23,0_14px_28px_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_4px_0_#1F5A23]";

/* ------------------------------------------------------------------ */
/*  Intro                                                              */
/* ------------------------------------------------------------------ */

function IntroScreen({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden text-white">
      <Backdrop m={null} dim={0.42} />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 [-webkit-overflow-scrolling:touch]" style={{ paddingTop: "var(--header-top)" }}>
        <div className="flex items-start justify-between">
          <RoundButton onClick={onBack} label="Back to games">
            <BackIcon />
          </RoundButton>
          <img src={`${SORT_ART}/sign.webp`} alt="" draggable={false} className="pointer-events-none -mr-1 -mt-2 h-24 w-auto object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]" />
        </div>
        <div className="-mt-10 flex justify-center">
          <Logo className="w-[66%] max-w-[260px]" />
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#111A2F]/75 p-3 ring-1 ring-white/15">
          <Mascot height={76} className="sort-mascot" />
          <p className="text-[13px] font-semibold leading-snug text-white/90">
            Potatoes roll down the belt. <span className="font-extrabold text-[#FFC53D]">Drag each one into the right bin</span> before it falls off the end. Sort fast and keep your combo going!
          </p>
        </div>

        <h2 className="mt-4 font-display text-[15px] font-extrabold uppercase tracking-wider text-white/85 drop-shadow">Know your bins</h2>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {BINS.map((bin) => (
            <li key={bin.id} className="flex items-center gap-2 rounded-2xl bg-[#111A2F]/75 p-2 ring-1 ring-white/15">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center">
                <img src={`${SORT_ART}/${bin.art}`} alt="" draggable={false} className="h-full w-full object-contain drop-shadow" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[14px] font-extrabold uppercase text-white drop-shadow">{bin.label}</span>
                <span className="block text-[10.5px] font-semibold leading-tight text-white/85">
                  {bin.lines[0]}
                  <br />
                  {bin.lines[1]}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-2xl bg-[#111A2F]/75 p-3 ring-1 ring-white/15">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[15px] font-extrabold uppercase tracking-wider text-white/85">Scoring</h2>
            <span className="text-[11px] font-bold text-white/60">
              {ROUND_SECONDS}s · {ROUND_POTATOES} potatoes
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-[12.5px]">
            {[
              ["Correct item", "+2 PB · +1 Coin"],
              [`Fast correct (under ${FAST_SECONDS}s)`, "+4 PB · +2 Coins"],
              ["5 in a row", "+8 PB · +4 Coins"],
              ["10 in a row", "+15 PB · +8 Coins"],
              ["Sort all 30", "+10 PB · +10 Coins"],
              ["Perfect round", "+25 PB · +15 Coins"],
              ["Wrong bin / missed", "0 · combo resets"],
            ].map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white/85">{k}</span>
                <span className="font-extrabold text-[#FFC53D]">{v}</span>
              </li>
            ))}
          </ul>
        </div>

        <button type="button" onClick={onStart} className={`mt-5 ${PRIMARY_BTN}`}>
          Start Sorting
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Round                                                              */
/* ------------------------------------------------------------------ */

type Drag = { id: number; x: number; y: number };
type View = { potatoes: Potato[]; stats: RoundStats; elapsed: number };
type Float = { id: number; x: number; y: number; text: string; tone: "good" | "bad" | "gold" };
type Flyer = { id: number; kind: PotatoKind; seed: number; x: number; y: number; dx: number; dy: number; size: number };
type Faller = { id: number; kind: PotatoKind; seed: number; lane: number };

function SortRound({ seed, onFinish, onQuit }: { seed: number; onFinish: (stats: RoundStats, roundComplete: boolean) => void; onQuit: () => void }) {
  const potatoesRef = useRef<Potato[]>([]);
  const statsRef = useRef<RoundStats>(emptyStats());
  const rngRef = useRef(mulberry32(seed));
  const spawnedRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const pausedRef = useRef(false);
  const binRefs = useRef<(HTMLDivElement | null)[]>([]);
  const uidRef = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const binsRowRef = useRef<HTMLDivElement | null>(null);

  const metrics = useStageMetrics(rootRef, binsRowRef);

  const [view, setView] = useState<View>(() => ({ potatoes: [], stats: emptyStats(), elapsed: 0 }));
  const [paused, setPaused] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hotBin, setHotBin] = useState<number | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [fallers, setFallers] = useState<Faller[]>([]);
  const [banner, setBanner] = useState<{ id: number; text: string; tone: "gold" | "green" } | null>(null);
  const [shakeBin, setShakeBin] = useState<number | null>(null);
  const [bounceBin, setBounceBin] = useState<number | null>(null);
  const [hint, setHint] = useState("Drag the potato to the correct bin!");

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const stats = statsRef.current;
    const roundComplete = stats.handled >= ROUND_POTATOES && elapsedRef.current < ROUND_SECONDS * 1000;
    onFinish(stats, roundComplete);
  }, [onFinish]);

  const snapshot = useCallback(
    (): View => ({ potatoes: potatoesRef.current.map((p) => ({ ...p })), stats: { ...statsRef.current, perBin: { ...statsRef.current.perBin } }, elapsed: elapsedRef.current }),
    [],
  );

  // Game loop
  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      if (doneRef.current) return;
      if (lastRef.current == null) lastRef.current = t;
      const dt = Math.min(64, t - lastRef.current);
      lastRef.current = t;
      if (!pausedRef.current) {
        elapsedRef.current += dt;
        const now = elapsedRef.current;
        if (spawnedRef.current < ROUND_POTATOES && now >= spawnedRef.current * SPAWN_SECONDS * 1000 + 400) {
          spawnedRef.current += 1;
          potatoesRef.current.push(spawnPotato(spawnedRef.current, rngRef.current, now));
        }
        const keep: Potato[] = [];
        for (const p of potatoesRef.current) {
          if (!p.held) p.progress += dt / (TRAVEL_SECONDS * 1000);
          if (p.progress >= 1 && !p.held) {
            applyMiss(statsRef.current);
            sounds.play("invalid");
            setHint("Missed one! Keep an eye on the belt.");
            const fid = ++uidRef.current;
            setFallers((fs) => [...fs, { id: fid, kind: p.kind, seed: p.seed, lane: p.lane }]);
            window.setTimeout(() => setFallers((fs) => fs.filter((f) => f.id !== fid)), 600);
            continue;
          }
          keep.push(p);
        }
        potatoesRef.current = keep;
        if (now >= ROUND_SECONDS * 1000 || (spawnedRef.current >= ROUND_POTATOES && keep.length === 0)) {
          setView(snapshot());
          finish();
          return;
        }
      }
      setView(snapshot());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finish, snapshot]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 950);
    return () => window.clearTimeout(t);
  }, [banner]);
  useEffect(() => {
    if (shakeBin === null) return;
    const t = window.setTimeout(() => setShakeBin(null), 400);
    return () => window.clearTimeout(t);
  }, [shakeBin]);
  useEffect(() => {
    if (bounceBin === null) return;
    const t = window.setTimeout(() => setBounceBin(null), 450);
    return () => window.clearTimeout(t);
  }, [bounceBin]);

  const binAt = useCallback((x: number, y: number): number | null => {
    for (let i = 0; i < BINS.length; i++) {
      const el = binRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 44 && y <= r.bottom + 12) return i;
    }
    return null;
  }, []);

  const addFloat = useCallback((x: number, y: number, text: string, tone: Float["tone"]) => {
    const id = ++uidRef.current;
    setFloats((fs) => [...fs, { id, x, y, text, tone }]);
    window.setTimeout(() => setFloats((fs) => fs.filter((f) => f.id !== id)), 900);
  }, []);

  const baseSize = metrics ? Math.max(56, Math.min(88, metrics.w * 0.18)) : 70;

  // Drag listeners
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      setHotBin(binAt(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      const p = potatoesRef.current.find((q) => q.id === drag.id);
      const idx = binAt(e.clientX, e.clientY);
      if (p && idx !== null) {
        const bin = BINS[idx];
        const outcome = applySort(statsRef.current, p, bin.id, elapsedRef.current);
        potatoesRef.current = potatoesRef.current.filter((q) => q.id !== p.id);
        const r = binRefs.current[idx]?.getBoundingClientRect();
        if (r) {
          const fid = ++uidRef.current;
          setFlyers((fs) => [...fs, { id: fid, kind: p.kind, seed: p.seed, x: e.clientX, y: e.clientY, dx: r.left + r.width / 2 - e.clientX, dy: r.top + r.height * 0.28 - e.clientY, size: baseSize }]);
          window.setTimeout(() => setFlyers((fs) => fs.filter((f) => f.id !== fid)), 460);
          window.setTimeout(() => setBounceBin(idx), 380);
        }
        if (outcome.correct) {
          sounds.play(outcome.comboHit ? "special" : "coin");
          haptic(outcome.comboHit ? [15, 30, 25] : 12);
          addFloat(e.clientX, e.clientY, `+${outcome.points} PB`, outcome.comboHit ? "gold" : "good");
          if (outcome.comboHit) setBanner({ id: Date.now(), text: outcome.comboHit === 5 ? "Combo x5! +8 PB" : "Combo x10! +15 PB", tone: "gold" });
          else if (outcome.fast) setBanner({ id: Date.now(), text: "Fast sort!", tone: "green" });
          setHint(outcome.fast ? "Lightning fast! Keep it up." : "Nice sort! Faster drops earn more PB.");
        } else {
          sounds.play("invalid");
          haptic([40, 40, 40]);
          addFloat(e.clientX, e.clientY, "Wrong bin", "bad");
          setShakeBin(idx);
          const right = BINS.find((b) => b.id === p.kind)!;
          setHint(`That one was ${right.label.toLowerCase()}: ${right.blurb}`);
        }
      } else if (p) {
        p.held = false;
      }
      setDrag(null);
      setHotBin(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, binAt, addFloat, baseSize]);

  const pickUp = (id: number) => (e: React.PointerEvent) => {
    if (pausedRef.current || drag) return;
    const live = potatoesRef.current.find((q) => q.id === id);
    if (!live) return;
    e.preventDefault();
    sounds.unlock();
    sounds.play("pop");
    haptic(8);
    live.held = true;
    setDrag({ id, x: e.clientX, y: e.clientY });
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    sounds.play("ui");
  };

  const { stats, elapsed } = view;
  const timeLeft = Math.max(0, Math.ceil(ROUND_SECONDS - elapsed / 1000));
  const meter = comboMeter(stats.combo);
  const dragged = drag ? view.potatoes.find((p) => p.id === drag.id) : null;

  // Belt trapezoid in screen px, used for the moving-stripe overlay.
  const beltClip = metrics
    ? (() => {
        const a = beltPoint(metrics, 0, 0);
        const b = beltPoint(metrics, 1, 0);
        const c = beltPoint(metrics, 1, 1);
        const d = beltPoint(metrics, 0, 1);
        const stretch = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: q.x + (q.x - p.x) * 0.08, y: q.y });
        const a2 = stretch(b, a);
        const b2 = stretch(a, b);
        const c2 = stretch(d, c);
        const d2 = stretch(c, d);
        return `polygon(${a2.x}px ${a2.y}px, ${b2.x}px ${b2.y}px, ${c2.x}px ${c2.y + 6}px, ${d2.x}px ${d2.y + 6}px)`;
      })()
    : undefined;

  return (
    <div ref={rootRef} className="relative mx-auto flex h-dvh w-full max-w-screen-sm select-none flex-col overflow-hidden bg-[#1c2438] text-white">
      <Backdrop m={metrics} />
      {beltClip ? <div className="sort-belt-motion pointer-events-none absolute inset-0 z-[5]" style={{ clipPath: beltClip }} aria-hidden /> : null}

      {/* Potatoes on the belt (screen-space, mapped onto the painted conveyor) */}
      {metrics
        ? view.potatoes.map((p) => {
            if (drag?.id === p.id) return null;
            const depth = 0.5 + p.progress * 0.7;
            const { x, y } = beltPoint(metrics, p.lane, p.progress);
            const fresh = elapsed - p.spawnedAt <= FAST_SECONDS * 1000;
            return (
              <button
                key={p.id}
                type="button"
                aria-label={`Potato ${p.id}`}
                data-kind={p.kind}
                onPointerDown={pickUp(p.id)}
                className="sort-potato absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab p-2"
                style={{ left: x, top: y, zIndex: 10 + Math.round(p.progress * 20) }}
              >
                <span className="sort-spawn block">
                  <span className="sort-wobble relative block" style={{ animationDelay: `${(p.seed % 7) * -0.2}s` }}>
                    {fresh ? <span className="sort-ring pointer-events-none absolute inset-[-8px] rounded-full ring-4 ring-[#7CFF9A]/85 shadow-[0_0_18px_6px_rgba(124,255,154,0.5)]" aria-hidden /> : null}
                    <PotatoArt kind={p.kind} seed={p.seed} size={baseSize * depth} className="drop-shadow-[0_10px_8px_rgba(0,0,0,0.55)]" />
                  </span>
                </span>
              </button>
            );
          })
        : null}

      {metrics
        ? fallers.map((f) => {
            const { x, y } = beltPoint(metrics, f.lane, 1);
            return (
              <span key={f.id} className="sort-fall pointer-events-none absolute z-10" style={{ left: x, top: y }}>
                <PotatoArt kind={f.kind} seed={f.seed} size={baseSize * 1.2} />
              </span>
            );
          })
        : null}

      {/* HUD: back + logo (left), timer / score / pause (right) */}
      <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: "var(--header-top)" }}>
        <Logo className="absolute left-2 top-1 w-[38%] max-w-[172px]" />
        <RoundButton onClick={onQuit} label="Back to games" className="pointer-events-auto absolute left-2 top-0 h-10 w-10">
          <BackIcon />
        </RoundButton>
        <div className="pointer-events-auto absolute right-2 top-0 flex items-start gap-1.5">
          <HudPill icon={<StopwatchIcon />} value={<span className={timeLeft <= 5 ? "text-[#FF6B6B]" : ""}>00:{String(timeLeft).padStart(2, "0")}</span>} label="Time Left" />
          <HudPill icon={<PbStarIcon className="h-6 w-6" />} value={`${stats.points} PB`} label="Score" />
          <RoundButton onClick={togglePause} label={paused ? "Resume" : "Pause"} className="mt-0.5">
            {paused ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M7 5v14l11-7L7 5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            )}
          </RoundButton>
        </div>
      </div>

      {/* Mascot + speech bubble (left), sign + sorted counter (right) */}
      <div className="pointer-events-none absolute left-0 top-[23%] z-20 flex items-start">
        <Mascot height={Math.round((metrics?.h ?? 900) * 0.16)} className="sort-mascot -ml-1" />
        <span className="relative -ml-3 mt-1 rounded-2xl bg-white px-3 py-2 font-script text-[13px] leading-tight text-[#241A5E] shadow-[0_6px_14px_rgba(0,0,0,0.35)]">
          Sort
          <br />
          the potatoes!
          <span className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 bg-white" />
        </span>
      </div>
      <div className="pointer-events-none absolute right-2 top-[12%] z-20 flex flex-col items-end">
        <img src={`${SORT_ART}/sign.webp`} alt="" draggable={false} className="mr-2 w-[24%] min-w-[92px] max-w-[120px] object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]" />
        <div className="relative z-10 -mt-[38%] rounded-xl p-1.5" style={{ background: "linear-gradient(180deg, #c9d0dc, #7d8697)", boxShadow: "0 8px 16px rgba(0,0,0,0.45)" }}>
          <div className="w-[7rem] rounded-lg bg-[#0f1424] px-2 py-1.5 text-center ring-1 ring-white/10">
            <p className="font-display text-[20px] font-extrabold leading-none tabular-nums">
              {stats.handled} <span className="text-[13px] text-white/70">/ {ROUND_POTATOES}</span>
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-white/80">Sorted</p>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-[#5be27a] to-[#2fb14a] transition-[width]" style={{ width: `${(stats.handled / ROUND_POTATOES) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {banner ? (
        <div
          key={banner.id}
          className={`sort-pop pointer-events-none absolute left-1/2 top-[46%] z-30 -translate-x-1/2 rounded-full px-4 py-1.5 font-display text-[17px] font-extrabold shadow-[0_6px_16px_rgba(0,0,0,0.35)] ${banner.tone === "gold" ? "bg-[#FFC53D] text-[#4A3300]" : "bg-[#5be27a] text-[#0f3d1a]"}`}
        >
          {banner.text}
        </div>
      ) : null}

      <div className="min-h-0 flex-1" />

      {/* Bins */}
      <div ref={binsRowRef} className="relative z-20 grid grid-cols-4 gap-1.5 px-2">
        {BINS.map((bin, i) => {
          const hot = hotBin === i;
          const count = stats.perBin[bin.id];
          return (
            <div
              key={bin.id}
              ref={(el) => {
                binRefs.current[i] = el;
              }}
              data-bin={bin.id}
              className={`relative aspect-[10/11] transition ${hot ? "sort-bin-hot" : ""} ${shakeBin === i ? "sort-shake" : ""} ${bounceBin === i ? "sort-bin-bounce" : ""}`}
            >
              <img src={`${SORT_ART}/${bin.art}`} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-fill drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]" />
              <div className="absolute inset-x-[8%] bottom-[6%] top-[44%] flex flex-col items-center justify-center text-center">
                <BinIcon icon={bin.icon} className="h-[26px] w-[26px]" />
                <span className="mt-1 font-display text-[12.5px] font-extrabold uppercase leading-none tracking-wide text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">{bin.label}</span>
                <span className="mt-1 text-[8.5px] font-bold leading-[1.15] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                  {bin.lines[0]}
                  <br />
                  {bin.lines[1]}
                </span>
              </div>
              <span className="absolute -top-2 right-0 z-10 rounded-full bg-[#111A2F] px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-white ring-1 ring-white/30">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="relative z-20 mx-2 mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#241A5E] shadow-[0_-4px_18px_rgba(0,0,0,0.3)]" style={{ marginBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}>
        <Mascot height={46} className="sort-mascot" />
        <p className="min-w-0 flex-1 text-[13px] font-extrabold leading-tight">{hint}</p>
        <div className="w-[6.4rem] shrink-0 border-l border-[#E6E0F8] pl-2">
          <p className="text-right text-[12px] font-extrabold">
            Combo <span className="text-[#241A5E]">x{stats.combo}</span>
          </p>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#E6E0F8]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#5be27a] to-[#2E7D32] transition-[width]" style={{ width: `${meter.pct}%` }} />
          </div>
          <p className="text-right text-[9px] font-bold text-[#8B84A8]">next bonus at x{meter.next}</p>
        </div>
      </div>

      {drag && dragged ? (
        <div className="sort-potato-drag pointer-events-none fixed z-50" style={{ left: drag.x, top: drag.y, transform: "translate(-50%, -62%)" }}>
          <span className="absolute inset-[-10px] rounded-full ring-4 ring-[#7CFF9A] shadow-[0_0_22px_8px_rgba(124,255,154,0.55)]" aria-hidden />
          <PotatoArt kind={dragged.kind} seed={dragged.seed} size={baseSize * 1.25} />
        </div>
      ) : null}

      {flyers.map((f) => (
        <span key={f.id} className="sort-fly pointer-events-none fixed z-40" style={{ left: f.x, top: f.y, ["--dx" as string]: `${f.dx}px`, ["--dy" as string]: `${f.dy}px` }}>
          <PotatoArt kind={f.kind} seed={f.seed} size={f.size} />
        </span>
      ))}

      {floats.map((f) => (
        <span
          key={f.id}
          className={`sort-float pointer-events-none fixed z-50 rounded-full px-2.5 py-1 font-display text-[15px] font-extrabold shadow ${
            f.tone === "good" ? "bg-[#DDF5E4] text-[#1E8A3E]" : f.tone === "gold" ? "bg-[#FFC53D] text-[#4A3300]" : "bg-[#FDECEC] text-[#C62828]"
          }`}
          style={{ left: f.x, top: f.y - 36 }}
        >
          {f.text}
        </span>
      ))}

      {paused ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0B1020]/70 px-8 backdrop-blur-[2px]">
          <div className="w-full max-w-[18rem] rounded-[1.5rem] bg-white p-5 text-center text-[#241A5E] shadow-2xl">
            <h2 className="font-display text-[24px] font-extrabold">Paused</h2>
            <p className="mt-1 text-[12px] font-semibold text-[#6B6488]">The belt is stopped. Take a breath.</p>
            <button type="button" onClick={togglePause} className="mt-4 w-full rounded-full bg-[#2E7D32] py-3 font-display text-[16px] font-extrabold text-white shadow-[0_6px_0_#1F5A23] active:translate-y-0.5">
              Resume
            </button>
            <button type="button" onClick={onQuit} className="mt-2 w-full rounded-full bg-[#F5F3FF] py-3 font-display text-[15px] font-extrabold text-[#6A5AE0]">
              Quit to games
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Result                                                             */
/* ------------------------------------------------------------------ */

function ResultScreen({ result, onPlayAgain, onBack }: { result: RoundResult; onPlayAgain: () => void; onBack: () => void }) {
  const { stats, roundComplete, coins, pb } = result;
  const correct = stats.correct + stats.fast;
  const accuracy = stats.handled > 0 ? Math.round((correct / stats.handled) * 100) : 0;
  const perfect = pb.lines.some((l) => l.label === "Perfect round");
  const title = perfect ? "Perfect Sort!" : roundComplete ? "Belt Cleared!" : "Time's Up!";

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden text-white">
      <Backdrop m={null} dim={0.42} />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 [-webkit-overflow-scrolling:touch]" style={{ paddingTop: "max(2.5rem, calc(var(--header-top) - 0.5rem))" }}>
        <div className="flex justify-center">
          <Logo className="w-[56%] max-w-[230px]" />
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Mascot height={78} className="sort-mascot" />
          <div>
            <h1 className="font-display text-[32px] font-extrabold leading-none text-[#FFC53D]" style={{ WebkitTextStroke: "1.5px #5A2E0F" }}>
              {title}
            </h1>
            <p className="mt-1 text-[12.5px] font-semibold text-white/90">
              {perfect ? "Every potato in the right bin. Farm legend!" : roundComplete ? "You handled all 30 potatoes before the clock ran out." : `You handled ${stats.handled} of ${ROUND_POTATOES} potatoes.`}
            </p>
          </div>
        </div>

        <section className="mt-4 rounded-[1.5rem] bg-white p-4 text-[#241A5E] shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-4 gap-1 text-center">
            {[
              ["Sorted", `${correct}/${ROUND_POTATOES}`],
              ["Accuracy", `${accuracy}%`],
              ["Best combo", `x${stats.maxCombo}`],
              ["Fast sorts", String(stats.fast)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[#F5F3FF] px-1 py-2">
                <p className="font-display text-[17px] font-extrabold leading-none">{v}</p>
                <p className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-[#8B84A8]">{k}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {BINS.map((bin) => (
              <div key={bin.id} className="flex flex-col items-center rounded-xl py-1.5 text-white" style={{ background: `linear-gradient(180deg, ${bin.color}, ${bin.dark})` }}>
                <span className="font-display text-[15px] font-extrabold leading-none">{stats.perBin[bin.id]}</span>
                <span className="text-[9px] font-bold uppercase">{bin.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <RewardPills points={pb.applied} coins={coins} size="sm" />
          </div>
          <div className="mt-3">
            <PbBreakdownCard receipt={pb} compact />
          </div>
          {stats.wrong + stats.missed > 0 ? (
            <p className="mt-3 rounded-xl bg-[#FFF3C4] px-3 py-2 text-[11.5px] font-bold text-[#8A5A00]">
              {stats.wrong} wrong bin{stats.wrong === 1 ? "" : "s"} · {stats.missed} missed. Wrong sorts never cost PB, they only reset your combo.
            </p>
          ) : null}
        </section>

        <div className="mt-4 space-y-2.5">
          <button type="button" onClick={onPlayAgain} className={PRIMARY_BTN}>
            Play Again
          </button>
          <button type="button" onClick={onBack} className="flex w-full items-center justify-center rounded-full bg-[#111A2F]/75 py-3.5 font-display text-[16px] font-extrabold text-white ring-1 ring-white/25">
            Back to Games
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export function PotatoSortApp() {
  const router = useRouter();
  const { addCoins } = usePbCoins();
  const { awardPoints } = usePbPoints();
  const session = useUserSession();
  const [phase, setPhase] = useState<Phase>("intro");
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);

  const start = () => {
    sounds.unlock();
    sounds.play("ui");
    setSeed(Date.now());
    setResult(null);
    setPhase("play");
  };

  const finish = useCallback(
    (stats: RoundStats, roundComplete: boolean) => {
      const facts = {
        correct: stats.correct,
        fast: stats.fast,
        wrong: stats.wrong,
        missed: stats.missed,
        combo5: stats.combo5,
        combo10: stats.combo10,
        roundComplete,
        total: ROUND_POTATOES,
      };
      const score = scorePotatoSort(facts);
      const coins = coinsForPotatoSort(facts);
      if (coins > 0) addCoins(coins);
      const pb = awardPoints({
        eventId: `sort:${seed}`,
        gameId: "potato-sort",
        points: score.points,
        lines: score.lines,
        perfect: score.perfect,
        label: "Potato Sort",
      });
      const handled = facts.correct + facts.fast;
      recordGameLeaderboard(session, {
        gameKey: "potato-sort",
        sessionId: `sort-${seed}`,
        coins,
        metrics: [
          { key: "accuracy", value: handled, max: Math.max(facts.total, 1) },
          { key: "speed", value: facts.fast, max: Math.max(handled, 1) },
          { key: "complete", value: facts.roundComplete ? 1 : 0, max: 1 },
        ],
      });
      sounds.play(score.perfect ? "special" : "win");
      setResult({ stats, roundComplete, coins, pb });
      setPhase("result");
    },
    [addCoins, awardPoints, seed, session],
  );

  if (phase === "play") {
    return <SortRound key={seed} seed={seed} onFinish={finish} onQuit={() => router.push("/games")} />;
  }
  if (phase === "result" && result) {
    return <ResultScreen result={result} onPlayAgain={start} onBack={() => router.push("/games")} />;
  }
  return <IntroScreen onStart={start} onBack={() => router.push("/games")} />;
}
