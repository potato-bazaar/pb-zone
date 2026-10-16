"use client";

import { useBackTo } from "@/hooks/useBackTo";

const TONES = {
  /** White disc, dark green chevron — yellow hub screens and game art. */
  light: "bg-white/95 text-[#0B3B22] ring-1 ring-black/5 shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
  /** PB screens (lavender) and illustrated heroes. */
  lavender: "bg-white/90 text-[#241A5E] ring-1 ring-white/90 shadow-[0_3px_10px_rgba(0,0,0,0.2)] backdrop-blur-sm",
  /** Over dark purple heroes and photos. */
  dark: "bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm",
  /** Orders and claim screens. */
  neutral: "bg-[#EBEEF2] text-[#2940B3] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]",
} as const;

type BackToHubProps = {
  /** Where back leads: the hub for games and My Rewards; /rewards for Leaderboard, Profile, Orders, Season Prizes. */
  href?: string;
  /** Accessible name. Defaults to "Back to PB Zone" for the hub, otherwise "Back". */
  label?: string;
  tone?: keyof typeof TONES;
  /** Placement only (margins, absolute positioning). Colours come from `tone`. */
  className?: string;
  /** Replaces the default back-to-`href` (e.g. a game stepping back one phase). */
  onClick?: () => void;
};

/** Round top-left back button with a 44px tap target. Pops history when `href` is behind us. */
export function BackToHub({ href = "/home", label, tone = "light", className = "", onClick }: BackToHubProps) {
  const goBack = useBackTo(href);

  return (
    <button
      type="button"
      onClick={onClick ?? goBack}
      aria-label={label ?? (href === "/home" ? "Back to PB Zone" : "Back")}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${TONES[tone]} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  );
}
