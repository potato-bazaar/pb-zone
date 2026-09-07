type CoinBadgeProps = {
  /** Real balance shown to the user */
  amount: number;
  className?: string;
};

function CoinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="45%" stopColor="#F5C518" />
          <stop offset="100%" stopColor="#D4A017" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#coinGrad)" stroke="#C4920A" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="#FFF3A8" strokeWidth="1" opacity="0.7" />
      {/* mini trophy */}
      <path
        d="M9.2 8.2h5.6v1.1c0 1.55-.95 2.85-2.8 2.85S9.2 10.85 9.2 9.3V8.2z"
        fill="#B8860B"
      />
      <path d="M10.6 12.15h2.8v1.35h-2.8z" fill="#B8860B" />
      <path d="M9.8 13.5h4.4v1.1H9.8z" fill="#B8860B" />
      <path
        d="M9.2 8.5H8c0 1.2.55 1.9 1.2 2.15M14.8 8.5H16c0 1.2-.55 1.9-1.2 2.15"
        fill="none"
        stroke="#B8860B"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CoinBadge({ amount, className = "" }: CoinBadgeProps) {
  const display = Number.isFinite(amount)
    ? Math.max(0, Math.floor(amount)).toLocaleString("en-IN")
    : "0";

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E8E4F5] bg-white py-1.5 pl-1.5 pr-3 shadow-[0_2px_8px_rgba(43,31,122,0.08)] ${className}`}
      role="status"
      aria-label={`${display} coins`}
    >
      <CoinIcon className="h-5 w-5 shrink-0" />
      <span className="min-w-[1.5rem] text-sm font-bold tabular-nums text-[#1a1a2e]">
        {display}
      </span>
    </div>
  );
}
