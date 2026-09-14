"use client";

import type { PotatoKind } from "./engine";

export const SORT_ART = "/games/sort";

/**
 * Rendered potato sprites (generated 3D renders, background removed, trimmed).
 * `w`/`h` are the trimmed pixel sizes so the aspect ratio is known before load;
 * `scale` sets how big each kind reads next to a Good potato.
 */
export const POTATO_SPRITES: Record<PotatoKind, { src: string; w: number; h: number; scale: number }> = {
  good: { src: `${SORT_ART}/good.webp`, w: 360, h: 390, scale: 1 },
  premium: { src: `${SORT_ART}/premium.webp`, w: 360, h: 490, scale: 0.98 },
  damaged: { src: `${SORT_ART}/damaged.webp`, w: 360, h: 540, scale: 0.9 },
  small: { src: `${SORT_ART}/small.webp`, w: 360, h: 359, scale: 0.6 },
};

/**
 * One potato. `size` is the width of a Good potato in CSS px; other kinds
 * scale from it. Rotation comes from the seed so every potato sits a little
 * differently, and stays integer-based so server and client markup match.
 */
export function PotatoArt({ kind, seed = 1, size = 64, className = "" }: { kind: PotatoKind; seed?: number; size?: number; className?: string }) {
  const sp = POTATO_SPRITES[kind];
  const rot = ((seed % 71) - 35) * 1.4;
  const w = Math.round(size * sp.scale);
  const h = Math.round((w * sp.h) / sp.w);
  return (
    <img
      src={sp.src}
      alt=""
      width={w}
      height={h}
      draggable={false}
      data-kind={kind}
      className={`pointer-events-none select-none ${className}`}
      style={{ width: w, height: h, transform: `rotate(${Math.round(rot)}deg)` }}
    />
  );
}

/** Bin face icon: the mockup shows a potato for Good, a gold star for Premium, a cracked potato for Damaged and a small potato for Small. */
export function BinIcon({ icon, className = "h-7 w-7" }: { icon: "potato" | "star" | "crack" | "small"; className?: string }) {
  if (icon === "star") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="#FFD23F" stroke="#B8860B" strokeWidth="1.1" strokeLinejoin="round" aria-hidden>
        <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8L12 2.6z" />
      </svg>
    );
  }
  if (icon === "crack") {
    return (
      <span className={`relative inline-flex items-center justify-center ${className}`} aria-hidden>
        <img src={`${SORT_ART}/damaged.webp`} alt="" draggable={false} className="h-full w-auto max-w-full object-contain" />
      </span>
    );
  }
  if (icon === "small") {
    return (
      <span className={`relative inline-flex items-center justify-center ${className}`} aria-hidden>
        <img src={`${SORT_ART}/small.webp`} alt="" draggable={false} className="h-[70%] w-auto object-contain" />
      </span>
    );
  }
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`} aria-hidden>
      <img src={`${SORT_ART}/good.webp`} alt="" draggable={false} className="h-full w-auto max-w-full object-contain" />
    </span>
  );
}
