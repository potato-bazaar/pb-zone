"use client";

import type { ReactNode } from "react";

export function NinjaButton({
  children,
  onClick,
  variant = "wood",
  icon,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "wood" | "green" | "gold";
  icon?: "play" | "restart" | "home" | "timer" | "star" | "trophy" | "back";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`nj-btn nj-btn-${variant} flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 font-display text-[19px] font-extrabold text-white disabled:opacity-50 ${className}`}
    >
      {icon ? <NinjaIcon name={icon} /> : null}
      <span>{children}</span>
    </button>
  );
}

export function NinjaIcon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  switch (name) {
    case "play":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M7 5v14l11-7L7 5z" />
        </svg>
      );
    case "restart":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12a8 8 0 1 0 2.6-5.9" />
          <path d="M4 4v5h5" />
        </svg>
      );
    case "home":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M12 3 3 10.5V20a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1v-9.5L12 3z" />
        </svg>
      );
    case "timer":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="13.5" r="7.5" />
          <path d="M12 9.5v4l2.6 1.6M9.5 2.5h5" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8L12 2.6z" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v3H8v-3h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3zm-1 4v1a2 2 0 0 0 2 2V7H6zm12 0h-2v3a2 2 0 0 0 2-2V7z" />
        </svg>
      );
    case "back":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
    default:
      return null;
  }
}

/** One cell of the 3×3 skin sheet. */
export function SkinFace({ cell, size = 64, className = "" }: { cell: number; size?: number; className?: string }) {
  const col = cell % 3;
  const row = Math.floor(cell / 3);
  return (
    <span
      className={`nj-skin inline-block ${className}`}
      style={{ width: size, height: size, backgroundPosition: `${col * 50}% ${row * 50}%` }}
      aria-hidden
    />
  );
}

export function WoodPanel({ title }: { title: string }) {
  return (
    <div className="nj-sign relative px-8 py-3">
      <span className="nj-sign-nail left-2 top-2" />
      <span className="nj-sign-nail right-2 top-2" />
      <span className="nj-sign-nail bottom-2 left-2" />
      <span className="nj-sign-nail bottom-2 right-2" />
      <h2 className="nj-title-text font-display text-[36px] font-extrabold leading-none">{title}</h2>
    </div>
  );
}

export function NinjaHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="relative z-10 flex items-center justify-between gap-2 px-4 pb-3" style={{ paddingTop: "var(--header-top)" }}>
      <button type="button" onClick={onBack} aria-label="Back" className="nj-wood flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white active:scale-95">
        <NinjaIcon name="back" className="h-5 w-5" />
      </button>
      <h1 className="nj-title-text font-display text-[24px] font-extrabold">{title}</h1>
      <div className="flex min-w-11 justify-end">{right}</div>
    </header>
  );
}

export function CoinPill({ coins, onPlus }: { coins: number; onPlus?: () => void }) {
  return (
    <div className="nj-coinpill flex h-10 items-center gap-1.5 rounded-full pl-2 pr-1.5" role="status" aria-label={`${coins} coins`}>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFC107] text-[10px] font-extrabold text-[#6b4a00] ring-2 ring-[#ffe082]">PB</span>
      <span className="text-[14px] font-extrabold tabular-nums text-white">{coins.toLocaleString("en-IN")}</span>
      {onPlus ? (
        <button type="button" onClick={onPlus} aria-label="Get coins" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6A5AE0] text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
            <path d="M12 6v12M6 12h12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
