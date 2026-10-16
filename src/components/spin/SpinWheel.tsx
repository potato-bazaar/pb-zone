"use client";

import { memo, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { SpinIcon, SpinSegment } from "@/lib/spinApi";

/* ------------------------------------------------------------------ */
/*  Landing maths                                                      */
/* ------------------------------------------------------------------ */
/*
 * Wedge i spans [i·slice, (i+1)·slice) clockwise from 12 o'clock. CSS rotate(θ) turns the wheel
 * clockwise, so the wheel angle under the top pointer is −θ (mod 360): wedge i's centre (± jitter)
 * is under the pointer when θ ≡ 360 − (i·slice + slice/2 + jitter). Wedge boundaries pass the
 * pointer whenever θ is a multiple of the slice.
 */

export const mod360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Wheel angle of wedge `index`'s centre, clockwise from 12 o'clock. */
export function segmentCentre(index: number, count: number) {
  const slice = 360 / count;
  return index * slice + slice / 2;
}

/** Rotation (mod 360) that rests wedge `index`, `jitter`° off its centre, under the pointer. */
export function restAngle(index: number, count: number, jitter = 0) {
  return mod360(360 - (segmentCentre(index, count) + jitter));
}

/** Forward distance from `rotation` to the next rest on `index`, plus `turns` full turns. Never negative. */
export function landingDistance(rotation: number, index: number, count: number, jitter = 0, turns = 0) {
  return mod360(restAngle(index, count, jitter) - mod360(rotation)) + 360 * turns;
}

/** Wedge under the pointer at `rotation`. */
export function segmentAtPointer(rotation: number, count: number) {
  return Math.floor(mod360(-rotation) / (360 / count)) % count;
}

/** True when the pointer is clearly inside wedge `index`, not on or next to one of its edges. */
export function restsOn(rotation: number, index: number, count: number) {
  const slice = 360 / count;
  const into = mod360(mod360(-rotation) - index * slice);
  return into > 0.12 * slice && into < 0.88 * slice;
}

/** Where inside the wedge the pointer stops (±30% of the slice). Purely visual: the prize is the server's. */
export function landingJitter(count: number) {
  return (Math.random() - 0.5) * 0.6 * (360 / count);
}

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of progress (Newton, then bisection). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const curveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const curveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = curveX(t) - x;
      if (Math.abs(err) < 1e-7) return t;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t = Math.min(1, Math.max(0, t - err / d));
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 40 && hi - lo > 1e-7; i++) {
      if (curveX(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : curveY(solve(p)));
}

const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

/* ------------------------------------------------------------------ */
/*  Motion                                                             */
/* ------------------------------------------------------------------ */

/** The landing: 4.5s on the admin preview's curve, 5–6 full turns. */
export const LAND_MS = 4500;
export const LAND_TURNS = 5;
const LAND_EASE = cubicBezier(0.15, 0.85, 0.25, 1);
/**
 * Free-spin speed (deg/ms) while the server answers. LAND_EASE starts at slope 0.85/0.15, so a landing
 * of ~5.5 turns starts at exactly this speed and the hand-over from free spin to landing has no kick.
 */
export const CRUISE_SPEED = ((0.85 / 0.15) * (LAND_TURNS + 0.5) * 360) / LAND_MS;
const RAMP_MS = 480;
const STOP_MS = 1400;
/** Ticks closer together than this are merged (keeps the fast part from buzzing). */
const TICK_GAP_MS = 90;

type Clock = {
  now: () => number;
  frame: (cb: (t: number) => void) => number;
  cancelFrame: (id: number) => void;
  timer: (cb: () => void, ms: number) => number;
  cancelTimer: (id: number) => void;
};

const BROWSER_CLOCK: Clock = {
  now: () => performance.now(),
  frame: (cb) => window.requestAnimationFrame(cb),
  cancelFrame: (id) => window.cancelAnimationFrame(id),
  timer: (cb, ms) => window.setTimeout(cb, ms),
  cancelTimer: (id) => window.clearTimeout(id),
};

type Glide = {
  from: number;
  dist: number;
  ms: number;
  ease: (p: number) => number;
  start: number | null;
  quiet: boolean;
  done: () => void;
};

type Ask = { kind: "land"; index: number; jitter: number; done: () => void } | { kind: "stop"; done: () => void };

/**
 * Turns the wheel outside React: one transform write per frame on a composited layer.
 * `start` ramps up to a free spin that keeps going while the server answers; `land` then eases 5–6
 * turns onto the server's wedge, and `stop` (no answer) eases onto a wedge boundary so the wheel never
 * points at a prize the server hasn't confirmed. Progress is time-based (dropped frames can't change
 * where it lands) and the rotation only ever grows, so the wheel never snaps back.
 */
export class WheelMotion {
  private deg: number;
  private count: number;
  private readonly clock: Clock;
  private phase: "idle" | "ramp" | "cruise" | "glide" = "idle";
  private phaseStart: number | null = null;
  private phaseFrom = 0;
  private glide: Glide | null = null;
  private ask: Ask | null = null;
  private frameId = 0;
  private safetyId = 0;
  private tickStep = 0;
  private lastTick = -Infinity;
  private rotor: HTMLElement | null = null;
  private pointer: HTMLElement | null = null;
  private tickHandler: ((gapMs: number) => void) | null = null;
  private hasMoved = false;
  private restDeg: number;
  private readonly restListeners = new Set<() => void>();

  constructor(deg: number, count: number, clock: Clock = BROWSER_CLOCK) {
    this.deg = deg;
    this.restDeg = deg;
    this.count = Math.max(1, count);
    this.clock = clock;
  }

  /** Cumulative rotation in degrees. */
  get angle() {
    return this.deg;
  }

  /** Where the wheel last came to rest. It doesn't change while the wheel turns. */
  get restingAngle() {
    return this.restDeg;
  }

  /** Listens for the wheel coming to rest somewhere new (shaped for useSyncExternalStore). */
  readonly subscribeRest = (listener: () => void) => {
    this.restListeners.add(listener);
    return () => {
      this.restListeners.delete(listener);
    };
  };

  get busy() {
    return this.phase !== "idle";
  }

  /** True once the wheel has been spun on this screen (it then glides instead of jumping). */
  get moved() {
    return this.hasMoved;
  }

  /** Binds the rotor and pointer layers (SpinWheel does this in an effect). */
  attach(rotor: HTMLElement | null, pointer: HTMLElement | null) {
    this.rotor = rotor;
    this.pointer = pointer;
    this.paint();
    if (this.glide) this.armSafety(this.glide);
    if (this.phase !== "idle") this.schedule();
  }

  detach() {
    this.clock.cancelFrame(this.frameId);
    this.clock.cancelTimer(this.safetyId);
    this.frameId = 0;
    this.safetyId = 0;
    this.rotor = null;
    this.pointer = null;
  }

  /** Called when a wedge boundary passes the pointer (rate-limited), with the gap since the last tick. */
  onTick(handler: ((gapMs: number) => void) | null) {
    this.tickHandler = handler;
  }

  /** Number of wedges. Ignored mid-spin: the wheel never changes under a spin. */
  setCount(count: number) {
    if (this.phase === "idle") this.count = Math.max(1, count);
  }

  /** Jumps forward (no animation) to rest on `index`, unless it already clearly points there. */
  snapTo(index: number) {
    if (this.phase !== "idle" || restsOn(this.deg, index, this.count)) return;
    this.deg += landingDistance(this.deg, index, this.count);
    this.paint();
    this.settle();
  }

  /** Short forward glide onto `index` (the used-up wheel coming to rest on today's prize). */
  glideTo(index: number, ms = 900): Promise<void> {
    return new Promise((done) => {
      if (this.phase !== "idle" || restsOn(this.deg, index, this.count)) {
        done();
        return;
      }
      this.beginGlide(this.deg, landingDistance(this.deg, index, this.count), ms, easeInOutCubic, true, done, null);
    });
  }

  /** The tap: ramp up to the free spin and keep turning until `land` or `stop`. */
  start() {
    if (this.phase !== "idle") return;
    this.phase = "ramp";
    this.phaseStart = null;
    this.phaseFrom = this.deg;
    this.hasMoved = true;
    this.tickStep = Math.floor(this.deg / (360 / this.count));
    this.schedule();
  }

  /** The server's wedge: once at full speed, ease 5–6 turns onto it. Starts the free spin if needed. */
  land(index: number, jitter: number): Promise<void> {
    return new Promise((done) => {
      if (this.phase === "glide") {
        done();
        return;
      }
      this.start();
      this.ask = { kind: "land", index, jitter, done };
      this.schedule();
    });
  }

  /** Reduced motion: the wheel doesn't turn at all, it jumps onto the wedge (the spotlight then marks it). */
  landQuick(index: number): Promise<void> {
    if (this.phase === "idle") {
      this.hasMoved = true;
      this.deg += landingDistance(this.deg, index, this.count);
      this.paint();
      this.settle();
    }
    return Promise.resolve();
  }

  /** No answer: ease out from the current speed onto the next wedge boundary. */
  stop(): Promise<void> {
    return new Promise((done) => {
      if (this.phase === "ramp" || this.phase === "cruise") {
        this.ask = { kind: "stop", done };
        this.schedule();
      } else {
        done();
      }
    });
  }

  private readonly step = (t: number) => {
    this.frameId = 0;
    let deg = this.deg;
    if (this.phase === "ramp") {
      const start = this.phaseStart ?? t;
      this.phaseStart = start;
      const p = Math.max(0, (t - start) / RAMP_MS);
      if (p < 1) {
        // Smoothstep speed: 0 → CRUISE_SPEED; the angle is its integral.
        deg = this.phaseFrom + CRUISE_SPEED * RAMP_MS * (p ** 3 - p ** 4 / 2);
        // A failed spin stops from the speed it has; a landing waits for full speed so it can't kick.
        if (this.ask?.kind === "stop") this.takeAsk(deg, CRUISE_SPEED * (3 * p * p - 2 * p ** 3), t);
      } else {
        this.phaseFrom += (CRUISE_SPEED * RAMP_MS) / 2;
        this.phaseStart = start + RAMP_MS;
        this.phase = "cruise";
      }
    }
    if (this.phase === "cruise") {
      deg = this.phaseFrom + CRUISE_SPEED * Math.max(0, t - (this.phaseStart ?? t));
      if (this.ask) this.takeAsk(deg, CRUISE_SPEED, t);
    }
    if (this.phase === "glide" && this.glide) {
      const g = this.glide;
      if (g.start === null) g.start = t;
      const p = Math.min(1, Math.max(0, (t - g.start) / g.ms));
      if (p >= 1) {
        this.finishGlide(t);
        return;
      }
      deg = g.from + g.dist * g.ease(p);
    }
    this.moveTo(deg, t, this.glide?.quiet ?? false);
    if (this.phase !== "idle") this.schedule();
  };

  private takeAsk(deg: number, speed: number, t: number) {
    const ask = this.ask;
    if (!ask) return;
    this.ask = null;
    if (ask.kind === "land") {
      const dist = landingDistance(deg, ask.index, this.count, ask.jitter, LAND_TURNS);
      this.beginGlide(deg, dist, LAND_MS, LAND_EASE, false, ask.done, t);
      return;
    }
    // easeOutCubic starts at slope 3, so covering speed·STOP_MS/3 keeps the speed continuous; then round
    // up to the next boundary. Barely moving (tap then instant failure): a gentle nudge to the boundary.
    const slice = 360 / this.count;
    const ideal = (speed * STOP_MS) / 3;
    const dist = Math.ceil((deg + ideal) / slice - 1e-9) * slice - deg;
    const slow = ideal < slice;
    this.beginGlide(deg, Math.max(0, dist), slow ? 700 : STOP_MS, slow ? easeInOutCubic : easeOutCubic, false, ask.done, t);
  }

  private beginGlide(
    from: number,
    dist: number,
    ms: number,
    ease: (p: number) => number,
    quiet: boolean,
    done: () => void,
    start: number | null,
  ) {
    this.phase = "glide";
    this.glide = { from, dist, ms, ease, start, quiet, done };
    this.tickStep = Math.floor(from / (360 / this.count));
    this.armSafety(this.glide);
    this.schedule();
  }

  /** If frames stop coming (hidden tab, throttled webview) the glide still ends, on time. */
  private armSafety(glide: Glide) {
    this.clock.cancelTimer(this.safetyId);
    this.safetyId = this.clock.timer(() => {
      this.safetyId = 0;
      if (this.glide === glide) this.finishGlide(this.clock.now());
    }, glide.ms + 800);
  }

  private finishGlide(t: number) {
    const g = this.glide;
    if (!g) return;
    this.glide = null;
    this.phase = "idle";
    this.clock.cancelTimer(this.safetyId);
    this.clock.cancelFrame(this.frameId);
    this.safetyId = 0;
    this.frameId = 0;
    this.moveTo(g.from + g.dist, t, g.quiet);
    this.settle();
    g.done();
  }

  private settle() {
    if (this.restDeg === this.deg) return;
    this.restDeg = this.deg;
    this.restListeners.forEach((listener) => listener());
  }

  private moveTo(deg: number, t: number, quiet: boolean) {
    const step = Math.floor(deg / (360 / this.count) + 1e-9);
    if (step > this.tickStep) {
      this.tickStep = step;
      if (!quiet && t - this.lastTick >= TICK_GAP_MS) {
        const gap = t - this.lastTick;
        this.lastTick = t;
        this.tickHandler?.(gap);
        this.kick();
      }
    }
    this.deg = deg;
    this.paint();
  }

  /** The pointer flicks as a wedge edge passes under it (its own layer, so only a composite). */
  private kick() {
    const el = this.pointer;
    if (!el || typeof el.animate !== "function") return;
    el.animate([{ transform: "rotate(-16deg)" }, { transform: "rotate(0deg)" }], {
      duration: 160,
      easing: "cubic-bezier(0.3, 0.9, 0.4, 1)",
    });
  }

  private paint() {
    if (this.rotor) this.rotor.style.transform = `rotate(${this.deg.toFixed(3)}deg)`;
  }

  private schedule() {
    if (!this.frameId && this.rotor) this.frameId = this.clock.frame(this.step);
  }
}

/* ------------------------------------------------------------------ */
/*  Artwork                                                            */
/* ------------------------------------------------------------------ */
/*
 * One 400×452 artboard: the wheel centre is (200, 212), the rim runs from r164 to r184, the pointer pin
 * sits on top and the green stand below. Layers, back to front: stand + shadow (static SVG), the rotor
 * (its own composited layer, the only thing that turns), the winner spotlight, rim + lights + lighting +
 * cap (static SVG), and the pointer (its own layer so its flick is a composite too).
 */

const CX = 200;
const CY = 212;
const DISC_R = 168;
const ICON_R = 76;
const LABEL_R = 126;
const LIGHT_COUNT = 18;
const INK = "#0B3B22";

/** Artboard size and the point the coin burst starts from (the winning wedge's icon, under the pointer). */
export const WHEEL_ART = { width: 400, height: 452, burstX: CX, burstY: CY - ICON_R } as const;

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(4)}%`;

const ROTOR_BOX: CSSProperties = {
  left: pct(CX - DISC_R, 400),
  top: pct(CY - DISC_R, 452),
  width: pct(DISC_R * 2, 400),
  height: pct(DISC_R * 2, 452),
};
const ROTOR_VIEWBOX = `${CX - DISC_R} ${CY - DISC_R} ${DISC_R * 2} ${DISC_R * 2}`;

const POINTER_BOX: CSSProperties = { left: pct(174, 400), top: pct(8, 452), width: pct(52, 400), height: pct(64, 452) };
const PIN = "M200 66C195 57 181 47 181 31A19 19 0 1 1 219 31C219 47 205 57 200 66Z";

const LIGHT_POINTS = Array.from({ length: LIGHT_COUNT }, (_, i) => {
  // Offset half a step so no bulb hides under the pointer's head.
  const a = ((i + 0.5) * 2 * Math.PI) / LIGHT_COUNT;
  return [+(CX + 174 * Math.sin(a)).toFixed(2), +(CY - 174 * Math.cos(a)).toFixed(2)] as const;
});

function point(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return `${(CX + r * Math.sin(a)).toFixed(2)} ${(CY - r * Math.cos(a)).toFixed(2)}`;
}

/** Wedge from `a0` to `a1` (degrees clockwise from 12 o'clock). */
function wedgePath(a0: number, a1: number, r: number) {
  return `M${CX} ${CY}L${point(a0, r)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${point(a1, r)}Z`;
}

/** WCAG relative luminance of #RGB / #RRGGBB, or null for anything else. */
function luminance(colour: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colour.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

type Ink = { main: string; accent: string; detail: string };

/** Icon colours from the hub tile art, each picked for its wedge in the v1 table. */
const ICON_INK: Record<SpinIcon, Ink> = {
  leaf: { main: "#2E9B4E", accent: "#1E7A3E", detail: "#A6E39A" },
  book: { main: "#FFFFFF", accent: "#DDF2E3", detail: "#86C79B" },
  bulb: { main: "#FFF8E1", accent: "#FFE066", detail: "#D9CFB6" },
  star: { main: "#FFD84A", accent: "#FFF2AE", detail: "#E7A900" },
  potato: { main: "#C8863A", accent: "#7A4A1E", detail: "#EBC07E" },
  gift: { main: "#FFF6E0", accent: "#E2531C", detail: "#F3DDAE" },
};

/** The art palette, unless the server put the icon on a wedge it would vanish into: then white or ink. */
function iconInk(icon: SpinIcon, colour: string): Ink {
  const ink = ICON_INK[icon] ?? ICON_INK.star;
  const bg = luminance(colour);
  const fg = luminance(ink.main);
  if (bg === null || fg === null || contrast(bg, fg) >= 1.9) return ink;
  return bg < 0.35
    ? { main: "#FFFFFF", accent: "#FFE066", detail: "rgba(255, 255, 255, 0.6)" }
    : { main: INK, accent: "#2F9E4F", detail: "rgba(11, 59, 34, 0.45)" };
}

const WHITE_L = 1;
const INK_L = luminance(INK) ?? 0;

/**
 * Label: white or dark green, whichever contrasts more with the wedge. White gets a dark green outline so it
 * still holds its edge under the rim's sheen.
 */
function labelInk(colour: string) {
  const l = luminance(colour) ?? 0.5;
  return contrast(l, WHITE_L) > contrast(l, INK_L) ? { fill: "#FFFFFF", stroke: "rgba(11, 59, 34, 0.8)" } : { fill: INK, stroke: "none" };
}

/** "1" for each label sitting in the lower half at `rest` (it reads upside down unless turned), else "0". */
function labelFlips(rest: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const onScreen = mod360(segmentCentre(i, count) + rest);
    return onScreen > 90 && onScreen < 270 ? "1" : "0";
  }).join("");
}

const STAR = Array.from({ length: 10 }, (_, k) => {
  const r = k % 2 ? 8.4 : 19;
  const a = (k * Math.PI) / 5;
  return `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a) + 1).toFixed(2)}`;
}).join("L");

/** Simple icons in a 48×48 box centred on the origin; "up" points at the rim. */
function WedgeIcon({ icon, ink }: { icon: SpinIcon; ink: Ink }) {
  switch (icon) {
    case "leaf":
      return (
        <g>
          <path d="M-1 21C-1 12 0 2 2-10" fill="none" stroke={ink.accent} strokeWidth={3.2} strokeLinecap="round" />
          <path d="M-1 7C-3.6-3.9-10.2-7.9-21-5-18.5 5.9-11.8 9.9-1 7Z" fill={ink.main} />
          <path d="M1 0C12 2.4 18.7-2 21-13 10-15.4 3.3-11 1 0Z" fill={ink.main} />
          <path d="M2-10C6.9-16.4 5.9-21.8-1-26-5.9-19.6-4.9-14.2 2-10Z" fill={ink.main} />
          <path d="M-2 6C-7 2-11 0-15-2M2-1C7-3 11-5 15-8M1.5-11C1.5-15 1-18 0-20" fill="none" stroke={ink.detail} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case "book":
      return (
        <g>
          <path d="M0-9C-7-14-15-14-22-11V15C-15 12-7 12 0 17Z" fill={ink.main} />
          <path d="M0-9C7-14 15-14 22-11V15C15 12 7 12 0 17Z" fill={ink.accent} />
          <path d="M0-9V17" stroke={ink.detail} strokeWidth={1.6} />
          <path
            d="M-17-5C-13-7-8-7-4-5M-17 1C-13-1-8-1-4 1M-17 7C-13 5-8 5-4 7M4-5C8-7 13-7 17-5M4 1C8-1 13-1 17 1M4 7C8 5 13 5 17 7"
            fill="none"
            stroke={ink.detail}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </g>
      );
    case "bulb":
      return (
        <g>
          <path d="M0-26V-22M-15-20-12.5-17M15-20 12.5-17M-21-7H-17M21-7H17" stroke={ink.accent} strokeWidth={2.6} strokeLinecap="round" />
          <path
            d="M0-18C7.5-18 12-12.5 12-6.5 12-1.5 8.5 1.5 6.5 5L6 8H-6L-6.5 5C-8.5 1.5-12-1.5-12-6.5-12-12.5-7.5-18 0-18Z"
            fill={ink.main}
          />
          <path d="M-3.5 5V-1L-1.5-4 1.5-1 3.5-4V5" fill="none" stroke={ink.accent} strokeWidth={1.5} strokeLinejoin="round" />
          <rect x={-6.5} y={9} width={13} height={4} rx={1.6} fill={ink.detail} />
          <rect x={-5.5} y={14} width={11} height={4} rx={1.6} fill={ink.detail} />
          <path d="M-2.5 20H2.5" stroke={ink.detail} strokeWidth={2.2} strokeLinecap="round" />
        </g>
      );
    case "star":
      return (
        <g>
          <path d={`M${STAR}Z`} fill={ink.main} stroke={ink.main} strokeWidth={3.4} strokeLinejoin="round" />
          <path d={`M${STAR}Z`} fill="none" stroke={ink.detail} strokeWidth={1} strokeLinejoin="round" opacity={0.7} />
          <path d="M-5-3-1.5-9.5" stroke={ink.accent} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case "potato":
      return (
        <g>
          <path
            d="M-15 3C-17-9-8-17 3-16.5 13.5-16 18.5-8.5 17 2.5 15.5 12 8.5 17.5-1 17.5-10.5 17.5-14 11-15 3Z"
            fill={ink.main}
            stroke={ink.accent}
            strokeWidth={1.6}
          />
          <ellipse cx={-4} cy={-8} rx={6} ry={3} fill={ink.detail} transform="rotate(-24 -4 -8)" />
          <circle cx={-7} cy={4} r={1.7} fill={ink.accent} />
          <circle cx={6} cy={-5} r={1.5} fill={ink.accent} />
          <circle cx={9} cy={7} r={1.7} fill={ink.accent} />
          <circle cx={-1} cy={11} r={1.4} fill={ink.accent} />
        </g>
      );
    case "gift":
      return (
        <g>
          <rect x={-15} y={-3} width={30} height={20} rx={2.5} fill={ink.main} />
          <rect x={-17.5} y={-10} width={35} height={8} rx={2} fill={ink.detail} />
          <rect x={-3.2} y={-10} width={6.4} height={27} fill={ink.accent} />
          <path d="M0-10C-4-18-13-21-14.5-15-15-10-6-9.5 0-10Z" fill={ink.accent} />
          <path d="M0-10C4-18 13-21 14.5-15 15-10 6-9.5 0-10Z" fill={ink.accent} />
          <circle cx={0} cy={-10} r={2.8} fill={ink.accent} />
        </g>
      );
    default:
      return null;
  }
}

/** Font size that keeps a label inside its wedge (Fredoka bold runs ~0.6em per glyph). */
function labelSize(label: string, count: number) {
  const base = count <= 6 ? 26 : count <= 8 ? 22 : 18;
  const chord = count > 1 ? 2 * LABEL_R * Math.sin(Math.PI / count) : 2 * LABEL_R;
  return Math.max(11, Math.min(base, (chord * 0.78) / (Math.max(1, label.length) * 0.6)));
}

/**
 * The turning face: wedges, edges, icons and labels. Redrawn only when the segments change or the wheel comes to
 * rest with labels in a different half. Each label is drawn twice, radial and turned 180° about its own centre;
 * `flips` picks which one shows, so the switch can crossfade.
 */
const WheelFace = memo(function WheelFace({ segments, flips }: { segments: SpinSegment[]; flips: string }) {
  const count = Math.max(1, segments.length);
  const slice = 360 / count;
  const iconScale = count > 1 ? Math.min(1.1, (2 * ICON_R * Math.sin(Math.PI / count)) / 50) : 1.1;
  return (
    <svg viewBox={ROTOR_VIEWBOX} className="block h-full w-full" aria-hidden>
      {count === 1 ? (
        <circle cx={CX} cy={CY} r={DISC_R} fill={segments[0]?.colour ?? "#F6C744"} />
      ) : (
        segments.map((seg, i) => <path key={`${seg.id}-${i}`} d={wedgePath(i * slice, (i + 1) * slice, DISC_R)} fill={seg.colour} />)
      )}
      {count > 1
        ? segments.map((seg, i) => (
            <path key={`edge-${seg.id}-${i}`} d={`M${CX} ${CY}L${point(i * slice, DISC_R)}`} stroke="rgba(255, 249, 230, 0.9)" strokeWidth={2.2} />
          ))
        : null}
      {segments.map((seg, i) => {
        const ink = labelInk(seg.colour);
        const flipped = flips[i] === "1";
        return (
          <g key={`art-${seg.id}-${i}`} transform={`rotate(${(i * slice + slice / 2).toFixed(3)} ${CX} ${CY})`}>
            <g transform={`translate(${CX} ${CY - ICON_R}) scale(${iconScale.toFixed(3)})`}>
              <WedgeIcon icon={seg.icon} ink={iconInk(seg.icon, seg.colour)} />
            </g>
            {[false, true].map((turned) => (
              <text
                key={turned ? "turned" : "radial"}
                x={CX}
                y={CY - LABEL_R}
                transform={turned ? `rotate(180 ${CX} ${CY - LABEL_R})` : undefined}
                textAnchor="middle"
                dominantBaseline="central"
                className="spin-label font-display"
                fontWeight={700}
                fontSize={labelSize(seg.label, count).toFixed(1)}
                fill={ink.fill}
                stroke={ink.stroke}
                strokeWidth={ink.stroke === "none" ? undefined : 3.5}
                strokeLinejoin="round"
                style={{ paintOrder: "stroke", opacity: turned === flipped ? 1 : 0 }}
              >
                {seg.label}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
});

/** Stand and drop shadow, behind everything. */
const WheelBack = memo(function WheelBack({ uid }: { uid: string }) {
  return (
    <svg viewBox="0 0 400 452" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`${uid}-shadow`}>
          <stop offset="0.86" stopColor="#8A5A00" stopOpacity="0.26" />
          <stop offset="1" stopColor="#8A5A00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-stand`} x1="0" x2="1">
          <stop offset="0" stopColor="#38A95A" />
          <stop offset="0.5" stopColor="#1E7A3E" />
          <stop offset="1" stopColor="#145C32" />
        </linearGradient>
      </defs>
      <ellipse cx={CX} cy={445} rx={122} ry={6.5} fill="rgba(122, 82, 0, 0.22)" />
      <circle cx={CX} cy={CY + 9} r={196} fill={`url(#${uid}-shadow)`} />
      <path d="M180 330H220L246 430H154Z" fill={`url(#${uid}-stand)`} />
      <rect x={112} y={424} width={176} height={19} rx={8} fill="#1E7A3E" />
      <rect x={118} y={425.5} width={164} height={4} rx={2} fill="#4CC072" opacity={0.65} />
    </svg>
  );
});

/** Gold rim with bulbs, fixed lighting over the disc, and the centre cap. */
const WheelFront = memo(function WheelFront({ uid }: { uid: string }) {
  return (
    <svg viewBox="0 0 400 452" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE68C" />
          <stop offset="0.45" stopColor="#F8C51E" />
          <stop offset="1" stopColor="#E6A100" />
        </linearGradient>
        <radialGradient id={`${uid}-sheen`} cx="0.34" cy="0.24" r="0.72">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-edge`}>
          <stop offset="0.84" stopColor="#5A3500" stopOpacity="0" />
          <stop offset="1" stopColor="#5A3500" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id={`${uid}-cap`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#FFF6BF" />
          <stop offset="0.42" stopColor="#FFD84A" />
          <stop offset="0.85" stopColor="#F0A800" />
          <stop offset="1" stopColor="#C98600" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r={165} fill={`url(#${uid}-edge)`} />
      <circle cx={CX} cy={CY} r={165} fill={`url(#${uid}-sheen)`} />
      <circle cx={CX} cy={CY} r={174} fill="none" stroke={`url(#${uid}-rim)`} strokeWidth={20} />
      <circle cx={CX} cy={CY} r={183.2} fill="none" stroke="#D39400" strokeWidth={1.6} />
      <circle cx={CX} cy={CY} r={165} fill="none" stroke="#FFF1B0" strokeWidth={2} />
      <g>
        {LIGHT_POINTS.map(([x, y], i) => (
          <circle key={i} className={`spin-light ${i % 2 ? "spin-light-b" : "spin-light-a"}`} cx={x} cy={y} r={4.6} />
        ))}
      </g>
      <circle cx={CX} cy={CY + 1.5} r={31} fill="#A86F00" opacity={0.28} />
      <circle cx={CX} cy={CY} r={27} fill={`url(#${uid}-cap)`} stroke="#B87A00" strokeWidth={2} />
      <circle cx={CX} cy={CY} r={19.5} fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth={1.5} />
      <ellipse cx={192} cy={203} rx={8.5} ry={5} fill="#FFFFFF" opacity={0.55} transform="rotate(-32 192 203)" />
    </svg>
  );
});

const Pointer = memo(function Pointer({ uid }: { uid: string }) {
  return (
    <svg viewBox="174 8 52 64" className="block h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-pin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFA05A" />
          <stop offset="0.5" stopColor="#F2862E" />
          <stop offset="1" stopColor="#D9541A" />
        </linearGradient>
      </defs>
      <path d={PIN} fill="rgba(120, 50, 0, 0.3)" transform="translate(1.5 2.5)" />
      <path d={PIN} fill={`url(#${uid}-pin)`} stroke="#B8460C" strokeWidth={1.4} />
      <path d="M187.5 25C190 19 196 15.5 202 15.8" fill="none" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={200} cy={31} r={7.2} fill="#FFF8EC" />
      <circle cx={200} cy={31} r={7.2} fill="none" stroke="rgba(150, 60, 0, 0.25)" strokeWidth={1.2} />
    </svg>
  );
});

/** The landed wedge (wheel at rest): the rest of the disc dims and the winner gets a glowing edge. */
export type WheelSpotlight = { start: number; sweep: number };

function Spotlight({ start, sweep }: WheelSpotlight) {
  return (
    <div className="spin-spot pointer-events-none absolute" style={ROTOR_BOX} aria-hidden>
      <svg viewBox={ROTOR_VIEWBOX} className="block h-full w-full">
        <path d={wedgePath(start + sweep, start + 360, DISC_R)} fill="rgba(70, 40, 0, 0.32)" />
        <path
          className="spin-spot-edge"
          d={wedgePath(start, start + sweep, DISC_R - 3)}
          fill="rgba(255, 255, 255, 0.16)"
          stroke="#FFFFFF"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export type WheelLights = "idle" | "chase" | "win" | "off";

/**
 * The Spin & Win wheel, drawn to match the hub tile: coloured wedges with simple icons and labels, a gold
 * rim with bulbs, a gold cap, an orange map-pin pointer and a green stand. It never decides anything:
 * `motion` (owned by the screen) turns it to wherever the server said.
 */
export function SpinWheel({
  segments,
  motion,
  lights,
  spotlight,
  label,
}: {
  segments: SpinSegment[];
  motion: WheelMotion;
  lights: WheelLights;
  spotlight: WheelSpotlight | null;
  /** Accessible description of the prizes. */
  label: string;
}) {
  const rotorRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const uid = `spin${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // First paint only: after that the motion writes the transform itself, so React must never re-set it.
  const [rotorStyle] = useState<CSSProperties>(() => ({ ...ROTOR_BOX, transform: `rotate(${motion.angle.toFixed(3)}deg)` }));
  // Labels turn upright for where they rest; while the wheel turns they stay as they were.
  const rest = useSyncExternalStore(motion.subscribeRest, () => motion.restingAngle, () => motion.restingAngle);
  const flips = labelFlips(rest, Math.max(1, segments.length));

  useEffect(() => {
    motion.attach(rotorRef.current, pointerRef.current);
    return () => motion.detach();
  }, [motion]);

  return (
    <div role="img" aria-label={label} className="spin-wheel relative aspect-[400/452] w-full select-none" data-lights={lights}>
      <WheelBack uid={uid} />
      <div ref={rotorRef} className="spin-rotor absolute" style={rotorStyle} data-spin-rotor="">
        <WheelFace segments={segments} flips={flips} />
      </div>
      {spotlight ? <Spotlight start={spotlight.start} sweep={spotlight.sweep} /> : null}
      <WheelFront uid={uid} />
      <div ref={pointerRef} className="spin-pointer pointer-events-none absolute" style={POINTER_BOX}>
        <Pointer uid={uid} />
      </div>
    </div>
  );
}
