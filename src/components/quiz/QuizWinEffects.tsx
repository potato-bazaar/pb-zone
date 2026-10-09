"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Piece = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  rot: number;
  w: number;
  h: number;
  round: boolean;
  color: string;
  delay: number;
  dur: number;
  flip: number;
};

const COLORS = ["#7E29F9", "#FFD200", "#FF5208", "#96EB3D", "#F472B6", "#38BDF8", "#A78BFA"];

/** Small seeded LCG so the confetti is identical on every render (no Math.random in render). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * A fan of confetti: each piece flies out along an angle (degrees; 0 = right, -90 = up),
 * slows, then falls with gravity while spinning and fading.
 */
function makeBurst(
  count: number,
  seed: number,
  angle: [number, number],
  speed: [number, number],
  delayMs: number,
  colors: string[] = COLORS,
): Piece[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => {
    const a = ((angle[0] + (angle[1] - angle[0]) * r()) * Math.PI) / 180;
    const v = speed[0] + (speed[1] - speed[0]) * r();
    const x1 = Math.cos(a) * v;
    const y1 = Math.sin(a) * v;
    const round = r() < 0.22;
    return {
      x1: Math.round(x1),
      y1: Math.round(y1),
      x2: Math.round(x1 * 1.3 + (r() - 0.5) * 70),
      y2: Math.round(y1 + 180 + r() * 150),
      rot: Math.round((r() < 0.5 ? -1 : 1) * (360 + r() * 540)),
      w: round ? 7 : 6 + Math.round(r() * 4),
      h: round ? 7 : 10 + Math.round(r() * 7),
      round,
      color: colors[Math.floor(r() * colors.length)],
      delay: Math.round(delayMs + r() * 180),
      dur: Math.round(2000 + r() * 900),
      flip: Math.round(260 + r() * 340),
    };
  });
}

function Pieces({ pieces }: { pieces: Piece[] }) {
  return pieces.map((p, i) => (
    <span
      key={i}
      className="qd-burst-piece"
      style={
        {
          "--x1": `${p.x1}px`,
          "--y1": `${p.y1}px`,
          "--x2": `${p.x2}px`,
          "--y2": `${p.y2}px`,
          "--rot": `${p.rot}deg`,
          animationDuration: `${p.dur}ms`,
          animationDelay: `${p.delay}ms`,
        } as CSSProperties
      }
    >
      <i
        className="qd-burst-flip"
        style={{
          width: p.w,
          height: p.h,
          background: p.color,
          borderRadius: p.round ? "50%" : 2,
          animationDuration: `${p.flip}ms`,
        }}
      />
    </span>
  ));
}

/**
 * One-shot "you finished!" celebration: a flash and a confetti fan from behind the title, plus
 * two party poppers firing in from the sides. Purely decorative; hidden under reduced motion and
 * unmounted once the pieces have landed. `colors` swaps the palette (default: the quiz set); the
 * piece sets are built per instance with the same seeds, so the output stays deterministic.
 */
export function WinBurst({ colors = COLORS }: { colors?: string[] }) {
  const [active, setActive] = useState(true);
  const [center, leftPopper, rightPopper] = useMemo(
    () => [
      makeBurst(40, 7, [-168, -12], [90, 200], 180, colors),
      makeBurst(18, 21, [-82, -48], [170, 250], 430, colors),
      makeBurst(18, 33, [-132, -98], [170, 250], 430, colors),
    ],
    [colors],
  );
  useEffect(() => {
    const t = window.setTimeout(() => setActive(false), 3800);
    return () => window.clearTimeout(t);
  }, []);
  if (!active) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden motion-reduce:hidden">
      <div className="qd-burst-origin absolute left-1/2">
        <span className="qd-flash" />
        <Pieces pieces={center} />
      </div>
      <div className="qd-burst-origin absolute left-[6%] translate-y-[130px]">
        <Pieces pieces={leftPopper} />
      </div>
      <div className="qd-burst-origin absolute right-[6%] translate-y-[130px]">
        <Pieces pieces={rightPopper} />
      </div>
    </div>
  );
}

const SPARKS = [
  { sx: -54, sy: -26 },
  { sx: -36, sy: 30 },
  { sx: 0, sy: -40 },
  { sx: 40, sy: 30 },
  { sx: 60, sy: -22 },
  { sx: 14, sy: 40 },
];

/** Ring pulse and sparkles that fire once when the points count-up lands (parent adds qd-landed). */
export function PointsLandFx() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span className="qd-points-ring" />
      {SPARKS.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="qd-points-spark absolute left-1/2 top-1/2 h-3.5 w-3.5 text-[#FFD200]"
          style={{ "--sx": `${s.sx}px`, "--sy": `${s.sy}px`, animationDelay: `${i * 40}ms` } as CSSProperties}
          fill="currentColor"
        >
          <path d="M12 1.5c.7 5.4 2.7 8.1 9 10.5-6.3 2.4-8.3 5.1-9 10.5-.7-5.4-2.7-8.1-9-10.5 6.3-2.4 8.3-5.1 9-10.5Z" />
        </svg>
      ))}
    </span>
  );
}
