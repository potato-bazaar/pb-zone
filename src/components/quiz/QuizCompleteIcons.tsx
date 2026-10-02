import type { CSSProperties } from "react";

type IconProps = { className?: string };

/** Three rising bars, the PB Breakdown heading mark. */
export function BarChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="3.5" y="13" width="4.4" height="8" rx="1.6" opacity="0.55" />
      <rect x="9.8" y="8.5" width="4.4" height="12.5" rx="1.6" opacity="0.8" />
      <rect x="16.1" y="3.5" width="4.4" height="17.5" rx="1.6" />
    </svg>
  );
}

/** Small cup trophy, the Leaderboard Movement heading mark. */
export function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M7 3.5h10v5.2a5 5 0 0 1-10 0V3.5Z" />
      <path
        d="M7 5.2H4.6a.9.9 0 0 0-.9 1c.3 2.9 1.8 4.6 4.4 5.1M17 5.2h2.4a.9.9 0 0 1 .9 1c-.3 2.9-1.8 4.6-4.4 5.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M10.6 13.4h2.8v3.2h-2.8z" />
      <rect x="7.4" y="16.4" width="9.2" height="4.1" rx="1.3" />
      <path d="M10.1 5.6c-.5 1.6-.3 3 .6 4" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

/** Two-leaf seedling under the subtitle. */
export function SproutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 21v-8.5" stroke="#3E9B48" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 13.2C11.6 8.9 8.6 6.3 4.3 6.4c-.2 4.4 2.9 7.2 7.7 6.8Z" fill="#5CC25A" />
      <path d="M12 12.4c.3-4.6 3.5-7.4 8-7.3.2 4.6-3 7.6-8 7.3Z" fill="#7BD66B" />
      <path d="M12 12.4c1.4-2.5 3.3-4.3 5.8-5.4" stroke="#3E9B48" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

/** Four-point twinkle used around the mascot. */
export function SparkleIcon({ className, style }: IconProps & { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M12 1.5c.7 5.4 2.7 8.1 9 10.5-6.3 2.4-8.3 5.1-9 10.5-.7-5.4-2.7-8.1-9-10.5 6.3-2.4 8.3-5.1 9-10.5Z" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.6v12.8a1.2 1.2 0 0 0 1.8 1l10.1-6.4a1.2 1.2 0 0 0 0-2L9.8 4.6A1.2 1.2 0 0 0 8 5.6Z" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M11.1 3.4a1.4 1.4 0 0 1 1.8 0l7.6 6.4c.3.3.5.7.5 1.1v8.6c0 .8-.7 1.5-1.5 1.5h-4.2v-5.6c0-.6-.4-1-1-1h-4.6c-.6 0-1 .4-1 1V21H4.5c-.8 0-1.5-.7-1.5-1.5v-8.6c0-.4.2-.8.5-1.1l7.6-6.4Z" />
    </svg>
  );
}
