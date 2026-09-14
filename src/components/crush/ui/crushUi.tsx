"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { tileArt } from "../engine/levels";
import type { BlockerKind, LevelDef, Objective } from "../engine/types";
import { MAX_LIVES } from "../engine/levels";

/* ------------------------------------------------------------------ */
/*  Icons rendered from the same procedural art used on the board      */
/* ------------------------------------------------------------------ */

const iconCache = new Map<string, string>();

async function renderIcon(id: string): Promise<string> {
  const cached = iconCache.get(id);
  if (cached) return cached;
  const tex = await import("../render/textures");
  let canvas: HTMLCanvasElement;
  switch (id) {
    case "blocker:ice":
      canvas = tex.drawIce(2, 96);
      break;
    case "blocker:crate":
      canvas = tex.drawCrate(2, 96);
      break;
    case "blocker:butter":
      canvas = tex.drawButter(96);
      break;
    case "blocker:soil":
      canvas = tex.drawSoil(1, 96);
      break;
    case "special:bomb":
      canvas = tex.drawBomb(96);
      break;
    default: {
      const [tileId, special] = id.split("#");
      canvas = tex.drawTile(
        tileArt(tileId),
        (special as "none" | "stripedH" | "stripedV" | "wrapped" | undefined) ?? "none",
        96,
      );
    }
  }
  const url = canvas.toDataURL("image/png");
  iconCache.set(id, url);
  return url;
}

export function useIcon(id: string | null) {
  const [url, setUrl] = useState<string | null>(id ? iconCache.get(id) ?? null : null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void renderIcon(id).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return url;
}

export function TileIcon({
  id,
  size = 28,
  className = "",
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const url = useIcon(id);
  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
      aria-hidden
    />
  );
}

export function blockerKindsIn(level: LevelDef): BlockerKind[] {
  const kinds = new Set<BlockerKind>();
  for (const row of level.layout ?? []) {
    for (const ch of row) {
      if (ch === "s" || ch === "S") kinds.add("soil");
      if (ch === "c" || ch === "C") kinds.add("crate");
      if (ch === "i" || ch === "I") kinds.add("ice");
      if (ch === "b") kinds.add("butter");
    }
  }
  return [...kinds];
}

export function objectiveIconId(objective: Objective, level: LevelDef): string | null {
  if (objective.type === "collect" && objective.tileId) return `${objective.tileId}#none`;
  if (objective.type === "clear-blockers") {
    const kinds = blockerKindsIn(level);
    return kinds.length ? `blocker:${kinds[0]}` : "blocker:crate";
  }
  return null;
}

export function objectiveLabel(objective: Objective, level: LevelDef): string {
  if (objective.type === "collect") return `Collect ${objective.target} ${tileArt(objective.tileId ?? "").label}`;
  if (objective.type === "score") return `Score ${objective.target.toLocaleString("en-IN")} points`;
  const kinds = blockerKindsIn(level);
  const names: Record<BlockerKind, string> = {
    ice: "ice",
    crate: "crates",
    butter: "butter",
    soil: "soil",
  };
  return `Clear all ${kinds.map((k) => names[k]).join(" & ") || "blockers"}`;
}

/* ------------------------------------------------------------------ */
/*  Small widgets                                                      */
/* ------------------------------------------------------------------ */

export function Star({
  filled,
  size = 22,
  className = "",
  onDark = false,
}: {
  filled: boolean;
  size?: number;
  className?: string;
  /** Use a light "empty" style when drawn over dark backgrounds. */
  onDark?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="crushStarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="60%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#F57C00" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8L12 2.6z"
        fill={filled ? "url(#crushStarGrad)" : onDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.18)"}
        stroke={filled ? "#B45309" : onDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.12)"}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarRow({ stars, size = 18 }: { stars: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <Star key={n} filled={stars >= n} size={size} />
      ))}
    </span>
  );
}

export function CoinIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="crushCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="45%" stopColor="#F5C518" />
          <stop offset="100%" stopColor="#D4A017" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#crushCoinGrad)" stroke="#C4920A" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="#FFF3A8" strokeWidth="1" opacity="0.7" />
      <text x="12" y="15.4" textAnchor="middle" fontSize="8" fontWeight="800" fill="#8B6914" fontFamily="system-ui, sans-serif">
        PB
      </text>
    </svg>
  );
}

export function HeartIcon({ size = 18, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2 0 3.5 1.1 4.4 2.5.9-1.4 2.4-2.5 4.4-2.5 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z"
        fill={dim ? "rgba(255,255,255,0.28)" : "#FF4D6D"}
        stroke={dim ? "rgba(255,255,255,0.35)" : "#B3123A"}
        strokeWidth="1.2"
      />
      {!dim ? <ellipse cx="9" cy="8.5" rx="1.6" ry="1" fill="rgba(255,255,255,0.55)" /> : null}
    </svg>
  );
}

export function LivesBadge({
  lives,
  countdown,
  onClick,
}: {
  lives: number;
  countdown: string | null;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/40 bg-white/85 px-3 shadow-[0_2px_8px_rgba(43,31,122,0.12)] backdrop-blur"
      aria-label={`${lives} of ${MAX_LIVES} lives`}
    >
      <HeartIcon size={20} dim={lives === 0} />
      <span className="text-sm font-extrabold tabular-nums text-[#1a1a2e]">
        {lives}
        <span className="text-[11px] font-bold text-[#8B84A8]">/{MAX_LIVES}</span>
      </span>
      {countdown ? (
        <span className="ml-0.5 rounded-full bg-[#F0ECFF] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#6A5AE0]">
          {countdown}
        </span>
      ) : null}
    </button>
  );
}

export function CrushButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "gold";
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "relative inline-flex h-13 min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-full px-6 font-display text-[17px] font-extrabold tracking-wide transition active:translate-y-[2px] disabled:opacity-50 disabled:active:translate-y-0";
  const styles = {
    primary:
      "bg-gradient-to-b from-[#8A7BFF] to-[#5B47DB] text-white shadow-[0_6px_0_#3F2FA8,0_10px_20px_rgba(91,71,219,0.35)] active:shadow-[0_2px_0_#3F2FA8]",
    gold: "bg-gradient-to-b from-[#FFE066] to-[#F5A623] text-[#5A3200] shadow-[0_6px_0_#C67A00,0_10px_20px_rgba(245,166,35,0.35)] active:shadow-[0_2px_0_#C67A00]",
    secondary:
      "bg-white text-[#3D2E7A] shadow-[0_5px_0_#D9D3F3,0_8px_16px_rgba(43,31,122,0.12)] active:shadow-[0_1px_0_#D9D3F3]",
    ghost: "bg-white/15 text-white ring-1 ring-white/30",
  } as const;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function useCountdown(ms: number): string | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (ms <= 0) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [ms]);
  return useMemo(() => {
    if (ms <= 0) return null;
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [ms]);
}

export function formatNumber(n: number) {
  return Math.max(0, Math.floor(n)).toLocaleString("en-IN");
}
