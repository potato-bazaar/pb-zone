type PointsBadgeProps = {
  amount: number;
  className?: string;
};

/** Placeholder until the final PB Points asset is provided. */
function PointsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pbPointsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B7CFF" />
          <stop offset="55%" stopColor="#5B4EE8" />
          <stop offset="100%" stopColor="#2940B3" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#pbPointsGrad)" />
      <circle
        cx="12"
        cy="12"
        r="7.4"
        fill="none"
        stroke="#D9D4FF"
        strokeWidth="1.1"
        opacity="0.85"
      />
      <path
        d="M12 6.2 13.35 9.7l3.75.3-2.85 2.4.9 3.65L12 14.4l-3.15 1.65.9-3.65-2.85-2.4 3.75-.3Z"
        fill="#FFF8E1"
        stroke="#F5C518"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PointsBadge({ amount, className = "" }: PointsBadgeProps) {
  const display = Number.isFinite(amount)
    ? Math.max(0, Math.floor(amount)).toLocaleString("en-IN")
    : "0";

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E8E4F5] bg-white py-1.5 pl-1.5 pr-3 shadow-[0_2px_8px_rgba(43,31,122,0.08)] ${className}`}
      role="status"
      aria-label={`${display} PB points`}
    >
      <PointsIcon className="h-5 w-5 shrink-0" />
      <span className="min-w-[1.5rem] text-sm font-bold tabular-nums text-[#1a1a2e]">
        {display}
      </span>
    </div>
  );
}
