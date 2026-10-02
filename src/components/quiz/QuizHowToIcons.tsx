import { useId } from "react";

type IconProps = { className?: string };

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="2.75" {...STROKE} aria-hidden>
      <path d="m14.5 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="2.5" {...STROKE} aria-hidden>
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="2.75" {...STROKE} aria-hidden>
      <path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="3.25" {...STROKE} aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="2.25" {...STROKE} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" />
    </svg>
  );
}

const STAR_PATH =
  "M12 2.8l2.75 5.6 6.15.9-4.45 4.35 1.05 6.12L12 16.87l-5.5 2.9 1.05-6.12L3.1 9.3l6.15-.9L12 2.8Z";

/**
 * Short yellow "emphasis" dashes used around titles and icons: two by default, or a symmetric
 * fan of three. Purely decorative, so it never takes taps.
 */
export function Burst({
  className,
  side = "right",
  rays = 2,
}: IconProps & { side?: "left" | "right"; rays?: 2 | 3 }) {
  return (
    <svg viewBox="0 0 24 24" className={`pointer-events-none ${className ?? ""}`} aria-hidden>
      <g
        transform={side === "left" ? "translate(24 0) scale(-1 1)" : undefined}
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      >
        {rays === 3 ? (
          <>
            <path d="M6.8 10 12.2 5.5" />
            <path d="M8 13.2h7" />
            <path d="M6.8 16.4 12.2 20.9" />
          </>
        ) : (
          <>
            <path d="M5.5 9.2 8.4 4.6" />
            <path d="M7.9 13.2h6.4" />
          </>
        )}
      </g>
    </svg>
  );
}

export function StarShape({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={STAR_PATH} />
    </svg>
  );
}

const SCORE_BADGES = {
  correct: {
    background: "linear-gradient(135deg, #50DA84 0%, #2AB262 100%)",
    shadow: "0 4px 8px -3px rgba(22, 163, 74, 0.55)",
  },
  complete: {
    background: "linear-gradient(135deg, #FED845 0%, #FF930B 100%)",
    shadow: "0 4px 8px -3px rgba(245, 158, 11, 0.6)",
  },
} as const;

export type ScoreBadgeKind = keyof typeof SCORE_BADGES;

/** Glossy round badge shown beside each scoring row. */
export function ScoreBadge({ kind, className = "" }: { kind: ScoreBadgeKind; className?: string }) {
  const tone = SCORE_BADGES[kind];
  return (
    <span
      aria-hidden
      className={`relative flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{
        background: tone.background,
        boxShadow: `${tone.shadow}, inset 0 2px 1px rgba(255, 255, 255, 0.35), inset 0 -2px 2px rgba(0, 0, 0, 0.12)`,
      }}
    >
      {kind === "correct" ? (
        <svg viewBox="0 0 24 24" className="h-[58%] w-[58%] text-white" strokeWidth="3.4" {...STROKE}>
          <path d="m5.5 12.5 4.2 4.2 8.8-9" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[60%] w-[60%] text-white" fill="currentColor">
          <path d={STAR_PATH} />
        </svg>
      )}
    </span>
  );
}

const CHAKRA_SPOKES = Array.from({ length: 24 }, (_, i) => {
  const a = (i * Math.PI) / 12;
  return `M15 15L${(15 + 3.9 * Math.cos(a)).toFixed(2)} ${(15 + 3.9 * Math.sin(a)).toFixed(2)}`;
}).join("");

/** Union Jack cropped to a square (for a round badge); crosses slimmed so the blue fields still read at ~28px. */
function UkFlag() {
  const clipId = `uk-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 30 30" className="h-full w-full" aria-hidden>
      <clipPath id={clipId}>
        <path d="M15 15h15v15zv15H0zH0V0zV0h15z" />
      </clipPath>
      <rect width="30" height="30" fill="#012169" />
      <path d="M0 0l30 30M30 0L0 30" stroke="#fff" strokeWidth="4.2" />
      <path d="M0 0l30 30M30 0L0 30" stroke="#C8102E" strokeWidth="2.8" clipPath={`url(#${clipId})`} />
      <path d="M15 0v30M0 15h30" stroke="#fff" strokeWidth="6.6" />
      <path d="M15 0v30M0 15h30" stroke="#C8102E" strokeWidth="4" />
    </svg>
  );
}

function IndiaFlag() {
  return (
    <svg viewBox="0 0 30 30" className="h-full w-full" aria-hidden>
      <rect width="30" height="10" fill="#FF9933" />
      <rect y="10" width="30" height="10" fill="#fff" />
      <rect y="20" width="30" height="10" fill="#138808" />
      <circle cx="15" cy="15" r="4" fill="none" stroke="#000080" strokeWidth="0.9" />
      <path d={CHAKRA_SPOKES} stroke="#000080" strokeWidth="0.4" />
      <circle cx="15" cy="15" r="0.9" fill="#000080" />
    </svg>
  );
}

export type LanguageMarkKind = "uk" | "in" | "gu";

/** Round language marker: a flag, or a script glyph when no flag fits. White rim on the selected (dark) chip, lavender otherwise. */
export function LanguageMark({
  kind,
  selected = false,
  className = "",
}: {
  kind: LanguageMarkKind;
  selected?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_3px_8px_-3px_rgba(40,20,120,0.45)] ${
        selected ? "ring-2 ring-white" : "ring-[1.5px] ring-[#DCD4F7]"
      } ${className}`}
    >
      {kind === "uk" ? <UkFlag /> : null}
      {kind === "in" ? <IndiaFlag /> : null}
      {kind === "gu" ? (
        <span
          lang="gu"
          className="flex h-full w-full items-center justify-center pb-[0.1em] text-[1.15em] font-bold leading-none text-[#2B176F]"
        >
          ગુ
        </span>
      ) : null}
    </span>
  );
}
